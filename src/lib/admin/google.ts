import 'server-only'
import { isDemoMode, isSupabaseConfigured } from './env'
import { createServiceSupabase } from './supabase/server'

/**
 * Google-koppeling per account (agenda + Meet; Drive voor contact@).
 * Tokens staan in public.google_connections en worden enkel server-side gelezen (service role).
 */

export const SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.events',
  drive: 'https://www.googleapis.com/auth/drive.file',
}

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function authUrl(opts: { redirectUri: string; state: string; scopes: string[]; loginHint: string }) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: ['openid', 'email', ...opts.scopes].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    login_hint: opts.loginHint,
    state: opts.state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

type TokenResponse = { access_token: string; refresh_token?: string; scope: string; id_token?: string; error?: string }

async function token(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
    cache: 'no-store',
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok) throw new Error(`Google weigerde de koppeling (${json.error ?? res.status}).`)
  return json
}

/** Wisselt de code om en geeft het Google-adres + refresh token terug. */
export async function exchangeCode(code: string, redirectUri: string) {
  const t = await token({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  if (!t.refresh_token) throw new Error('Google gaf geen blijvende toegang terug. Probeer opnieuw te koppelen.')
  // Het id_token komt rechtstreeks van Google over TLS; we lezen enkel het e-mailadres.
  const payload = JSON.parse(Buffer.from((t.id_token ?? '').split('.')[1] ?? '', 'base64url').toString() || '{}')
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null
  if (!email || payload.email_verified === false) throw new Error('Kon het Google-adres niet bepalen.')
  return { email, refreshToken: t.refresh_token, scopes: t.scope }
}

export type Connection = { email: string; scopes: string; connected_at: string }

const g = globalThis as unknown as { __ikrGoogle?: Map<string, Connection & { refresh_token: string }> }
const memory = () => (g.__ikrGoogle ??= new Map())
const useMemory = () => !isSupabaseConfigured() && isDemoMode()

export async function saveConnection(email: string, refreshToken: string, scopes: string, by: string) {
  if (useMemory()) {
    memory().set(email, { email, scopes, refresh_token: refreshToken, connected_at: new Date().toISOString() })
    return
  }
  const { error } = await createServiceSupabase()
    .from('google_connections')
    .upsert({ email, refresh_token: refreshToken, scopes, connected_by: by, connected_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** Welke accounts gekoppeld zijn (zonder tokens). */
export async function listConnections(): Promise<Connection[]> {
  if (useMemory()) return [...memory().values()].map(({ email, scopes, connected_at }) => ({ email, scopes, connected_at }))
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const { data, error } = await createServiceSupabase().from('google_connections').select('email, scopes, connected_at')
  if (error) throw new Error(error.message)
  return data ?? []
}

async function accessToken(email: string) {
  const { data } = await createServiceSupabase()
    .from('google_connections')
    .select('refresh_token')
    .eq('email', email)
    .maybeSingle()
  if (!data) throw new Error(`${email} is nog niet gekoppeld (Instellingen).`)
  return (await token({ refresh_token: data.refresh_token, grant_type: 'refresh_token' })).access_token
}

/**
 * Maakt een agenda-item in de agenda van `calendarOwner`, met uitnodigingen voor `attendees`.
 * Bij online wordt er meteen een Google Meet aangemaakt.
 */
export async function createEvent(opts: {
  calendarOwner: string
  summary: string
  startsAt: string
  minutes: number
  attendees: string[]
  meet: boolean
}): Promise<{ eventId: string; meetUrl: string | null }> {
  const at = await accessToken(opts.calendarOwner)
  const end = new Date(new Date(opts.startsAt).getTime() + opts.minutes * 60_000).toISOString()
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: opts.summary,
        start: { dateTime: opts.startsAt, timeZone: 'Europe/Brussels' },
        end: { dateTime: end, timeZone: 'Europe/Brussels' },
        attendees: opts.attendees.map((email) => ({ email })),
        ...(opts.meet
          ? { conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } }
          : {}),
      }),
      cache: 'no-store',
    },
  )
  const json = (await res.json()) as { id?: string; hangoutLink?: string; error?: { message?: string } }
  if (!res.ok || !json.id) throw new Error(`Agenda-item maken mislukt: ${json.error?.message ?? res.status}`)
  return { eventId: json.id, meetUrl: json.hangoutLink ?? null }
}

/** Zoekt (of maakt) een map in de Drive van `owner`. Met drive.file ziet het dashboard enkel zijn eigen mappen. */
async function driveFolder(at: string, name: string) {
  const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const found = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${at}` },
    cache: 'no-store',
  }).then((r) => r.json() as Promise<{ files?: { id: string }[] }>)
  if (found.files?.[0]) return found.files[0].id
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
    cache: 'no-store',
  })
  const json = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!json.id) throw new Error(`Map maken in de Drive mislukt: ${json.error?.message ?? res.status}`)
  return json.id
}

/**
 * Start een upload naar de Drive van `owner`. De browser stuurt het bestand daarna rechtstreeks
 * naar de teruggegeven URL (zo gaat de opname niet door de server, die een limiet van 4,5 MB heeft).
 */
export async function startDriveUpload(opts: { owner: string; folder: string; name: string; mimeType: string; origin: string }) {
  const at = await accessToken(opts.owner)
  const parent = await driveFolder(at, opts.folder)
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${at}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': opts.mimeType,
      // Nodig zodat de browser daarna rechtstreeks naar Google mag uploaden (CORS).
      Origin: opts.origin,
    },
    body: JSON.stringify({ name: opts.name, parents: [parent] }),
    cache: 'no-store',
  })
  const url = res.headers.get('location')
  if (!res.ok || !url) throw new Error(`Upload starten mislukt (${res.status}).`)
  return url
}

/** Deelt een bestand met iedereen van het domein (lezen) en geeft de link terug. */
export async function shareWithDomain(owner: string, fileId: string, domain: string) {
  const at = await accessToken(owner)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=false`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'domain', role: 'reader', domain }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Delen in de Drive mislukt (${res.status}).`)
  return `https://drive.google.com/file/d/${fileId}/view`
}
