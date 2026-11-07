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
  // contact@ (de IKR-Drive): volledige toegang, om bv. transcripts in bestaande mappen te zetten.
  driveFull: 'https://www.googleapis.com/auth/drive',
  // Sales-inbox (enkel Casper): mails lezen en antwoorden versturen. Geen verwijderen.
  gmailRead: 'https://www.googleapis.com/auth/gmail.readonly',
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
}

/** Koppelingen per teamlid (Instellingen → Mijn koppelingen): enkel lezen, zo weinig mogelijk. */
export const TEAM_SCOPES = {
  mail: ['https://www.googleapis.com/auth/gmail.readonly'],
  agenda: ['https://www.googleapis.com/auth/calendar.calendarlist.readonly', 'https://www.googleapis.com/auth/calendar.events.readonly'],
} as const

export function hasScopes(c: { scopes: string } | undefined, needed: string[]) {
  return Boolean(c && needed.every((s) => c.scopes.split(' ').includes(s)))
}

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function authUrl(opts: {
  redirectUri: string
  state: string
  scopes: readonly string[]
  loginHint?: string
  /** false = token met enkel deze scopes (niet samengevoegd met eerder gegeven rechten). */
  includeGranted?: boolean
  /** Laat een ander Google-account kiezen (bv. een andere agenda). */
  chooseAccount?: boolean
}) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: ['openid', 'email', ...opts.scopes].join(' '),
    access_type: 'offline',
    prompt: opts.chooseAccount ? 'consent select_account' : 'consent',
    include_granted_scopes: opts.includeGranted === false ? 'false' : 'true',
    state: opts.state,
  })
  if (opts.loginHint) p.set('login_hint', opts.loginHint)
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

/** Vraagt een access token met een refresh token (gooit bij een ingetrokken/verlopen koppeling). */
export async function refreshAccessToken(refreshToken: string) {
  const t = await token({ refresh_token: refreshToken, grant_type: 'refresh_token' })
  return { accessToken: t.access_token, expiresIn: (t as { expires_in?: number }).expires_in ?? 3600 }
}

/** Trekt een token in bij Google (bij ontkoppelen). Gooit niet: een al ingetrokken token is ook goed. */
export async function revokeToken(tokenValue: string) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: tokenValue }),
      cache: 'no-store',
    })
    return res.ok || res.status === 400 // 400 = al ongeldig
  } catch {
    return false
  }
}

/** Wisselt de code om en geeft het Google-adres + refresh token terug. */
export async function exchangeCode(code: string, redirectUri: string) {
  const t = await token({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  if (!t.refresh_token) throw new Error('Google gaf geen blijvende toegang terug. Probeer opnieuw te koppelen.')
  // Het id_token komt rechtstreeks van Google over TLS; we lezen enkel het e-mailadres.
  const payload = JSON.parse(Buffer.from((t.id_token ?? '').split('.')[1] ?? '', 'base64url').toString() || '{}')
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null
  if (!email || payload.email_verified === false) throw new Error('Kon het Google-adres niet bepalen.')
  return { email, refreshToken: t.refresh_token, scopes: t.scope, accessToken: t.access_token }
}

export type Connection = { email: string; scopes: string; connected_at: string }

const g = globalThis as unknown as { __ikrGoogle?: Map<string, Connection & { refresh_token: string }> }
const memory = () => (g.__ikrGoogle ??= new Map())
const googleInMemory = () => !isSupabaseConfigured() && isDemoMode()

export async function saveConnection(email: string, refreshToken: string, scopes: string, by: string) {
  if (googleInMemory()) {
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
  if (googleInMemory()) return [...memory().values()].map(({ email, scopes, connected_at }) => ({ email, scopes, connected_at }))
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const { data, error } = await createServiceSupabase().from('google_connections').select('email, scopes, connected_at')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function accessToken(email: string) {
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

/** Verwijdert een agenda-item; `notify` = deelnemers een annulering sturen. */
export async function deleteEvent(calendarOwner: string, eventId: string, notify: boolean) {
  const at = await accessToken(calendarOwner)
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=${notify ? 'all' : 'none'}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' },
  )
  if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Agenda-item verwijderen mislukt (${res.status}).`)
}

export type CalendarEvent = {
  id: string
  summary: string
  start: string
  end: string
  meetUrl: string | null
  attendees: string[]
  status: string
}

/** Afspraken (los, niet herhalend) in de agenda van `calendarOwner` tussen twee tijdstippen. Enkel lezen. */
export async function listEvents(calendarOwner: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const at = await accessToken(calendarOwner)
  const p = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '250', timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' })
  const json = (await res.json()) as {
    items?: { id: string; summary?: string; status?: string; hangoutLink?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; attendees?: { email?: string }[] }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(`Agenda lezen mislukt: ${json.error?.message ?? res.status}`)
  return (json.items ?? [])
    .filter((e) => e.start?.dateTime && e.end?.dateTime) // geen hele-dag-items
    .map((e) => ({
      id: e.id,
      summary: e.summary ?? '',
      start: new Date(e.start!.dateTime!).toISOString(),
      end: new Date(e.end!.dateTime!).toISOString(),
      meetUrl: e.hangoutLink ?? null,
      attendees: (e.attendees ?? []).map((a) => (a.email ?? '').toLowerCase()).filter(Boolean),
      status: e.status ?? 'confirmed',
    }))
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
  return `https://drive.google.com/open?id=${fileId}`
}

/** Zet tekst als Google Doc in een map van de Drive van `owner`; geeft het bestands-id terug. */
export async function uploadDoc(opts: { owner: string; folder: string; name: string; text: string }) {
  const at = await accessToken(opts.owner)
  const parent = await driveFolder(at, opts.folder)
  const boundary = `ikr${crypto.randomUUID()}`
  const meta = JSON.stringify({ name: opts.name, parents: [parent], mimeType: 'application/vnd.google-apps.document' })
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${opts.text}\r\n--${boundary}--`
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
    cache: 'no-store',
  })
  const json = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!json.id) throw new Error(`Transcript opslaan in de Drive mislukt: ${json.error?.message ?? res.status}`)
  return json.id
}
