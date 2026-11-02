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
