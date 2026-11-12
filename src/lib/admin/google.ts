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

// ─── IKR-Drive (contact@, volledige Drive-rechten) ───────────────────────────
type DriveFile = { id: string; name: string; parents?: string[] }

async function driveGet<T>(at: string, path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}${sep}supportsAllDrives=true`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' })
  const json = (await res.json()) as T & { error?: { message?: string } }
  if (!res.ok) throw new Error(`Drive: ${json.error?.message ?? res.status}`)
  return json
}

async function folderNamed(at: string, name: string, parent?: string): Promise<DriveFile[]> {
  const q = [`name = '${name.replace(/'/g, "\\'")}'`, "mimeType = 'application/vnd.google-apps.folder'", 'trashed = false', parent ? `'${parent}' in parents` : '']
    .filter(Boolean)
    .join(' and ')
  const r = await driveGet<{ files?: DriveFile[] }>(at, `files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&includeItemsFromAllDrives=true&corpora=allDrives&pageSize=50`)
  return r.files ?? []
}

/**
 * Zoekt een mappenpad (bv. Sales / Sales calls / Fireflies) in de Drive van `owner`, ook in gedeelde
 * drives; ontbrekende mappen worden aangemaakt (onder het diepste gevonden deel, anders in Mijn Drive).
 */
export async function ensureDrivePath(owner: string, path: string[]): Promise<string> {
  const at = await accessToken(owner)
  // 1. Bestaat de laatste map al met de juiste ouders?
  for (const leaf of await folderNamed(at, path[path.length - 1])) {
    let ok = true
    let cur: DriveFile = leaf
    for (let i = path.length - 2; i >= 0 && ok; i--) {
      const parentId = cur.parents?.[0]
      if (!parentId) {
        ok = false
        break
      }
      const p = await driveGet<DriveFile>(at, `files/${encodeURIComponent(parentId)}?fields=id,name,parents`).catch(() => null)
      if (!p || p.name !== path[i]) ok = false
      else cur = p
    }
    if (ok) return leaf.id
  }
  // 2. Anders stap voor stap zoeken en aanmaken.
  let parent: string | undefined
  for (const name of path) {
    const found = (await folderNamed(at, name, parent))[0]
    if (found) {
      parent = found.id
      continue
    }
    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true', {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
      cache: 'no-store',
    })
    const json = (await res.json()) as { id?: string; error?: { message?: string } }
    if (!json.id) throw new Error(`Map "${name}" maken mislukt: ${json.error?.message ?? res.status}`)
    parent = json.id
  }
  return parent!
}

/** Tekst als Google Doc in een map (ook in een gedeelde drive); geeft de link terug. */
export async function createDocInFolder(owner: string, folderId: string, name: string, text: string) {
  const at = await accessToken(owner)
  const boundary = `ikr${crypto.randomUUID()}`
  const meta = JSON.stringify({ name, parents: [folderId], mimeType: 'application/vnd.google-apps.document' })
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--`
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
    cache: 'no-store',
  })
  const json = (await res.json()) as { id?: string; webViewLink?: string; error?: { message?: string } }
  if (!json.id) throw new Error(`Transcript in de Drive zetten mislukt: ${json.error?.message ?? res.status}`)
  return json.webViewLink ?? `https://docs.google.com/document/d/${json.id}/edit`
}

/** Tijdelijk "iedereen met de link kan bekijken" (bv. zodat Fireflies een opname kan ophalen). Geeft het permissie-id. */
export async function makeFilePublic(owner: string, fileId: string) {
  const at = await accessToken(owner)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    cache: 'no-store',
  })
  const json = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!json.id) throw new Error(`Opname delen mislukt: ${json.error?.message ?? res.status}`)
  return json.id
}

export async function removeFilePermission(owner: string, fileId: string, permissionId: string) {
  const at = await accessToken(owner)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${at}` },
    cache: 'no-store',
  })
  if (!res.ok && res.status !== 404) throw new Error(`Delen intrekken mislukt (${res.status}).`)
}

// ─── Drive lezen (IKR-Drive, bv. contracten) ────────────────────────────────
export type DriveDoc = { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink: string }

/** Zoekt bestanden in de Drive van `owner` (ook gedeelde drives), nieuwste eerst. `q` = Drive-zoekopdracht. */
export async function driveSearch(owner: string, q: string, limit = 10): Promise<DriveDoc[]> {
  const at = await accessToken(owner)
  const r = await driveGet<{ files?: DriveDoc[] }>(
    at,
    `files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&includeItemsFromAllDrives=true&corpora=allDrives&pageSize=${limit}`,
  )
  return r.files ?? []
}

const DOC = 'application/vnd.google-apps.document'
const CONVERTIBLE = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']

/**
 * Tekst van een Drive-bestand. Google Docs: export als tekst. PDF en Word: tijdelijke Google Docs-kopie
 * (Google leest de tekst, ook gescand), exporteren en de kopie meteen weer verwijderen.
 */
export async function driveText(owner: string, file: Pick<DriveDoc, 'id' | 'mimeType'>, maxChars = 15_000): Promise<string | null> {
  const at = await accessToken(owner)
  const exportText = async (id: string) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/plain`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' })
    if (!res.ok) throw new Error(`Drive export: ${res.status}`)
    return (await res.text()).slice(0, maxChars)
  }
  if (file.mimeType === DOC) return exportText(file.id)
  if (!CONVERTIBLE.includes(file.mimeType)) return null
  const copy = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/copy?fields=id&supportsAllDrives=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: DOC, name: `tmp-ikr-dashboard-${file.id}` }),
    cache: 'no-store',
  }).then((r) => r.json() as Promise<{ id?: string; error?: { message?: string } }>)
  if (!copy.id) throw new Error(`Drive omzetten: ${copy.error?.message ?? 'mislukt'}`)
  try {
    return await exportText(copy.id)
  } finally {
    await fetch(`https://www.googleapis.com/drive/v3/files/${copy.id}?supportsAllDrives=true`, { method: 'DELETE', headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' }).catch(() => undefined)
  }
}

/**
 * Vervangt een genodigde in een bestaand agenda-item (bv. nieuw uitnodigingsadres van een teamlid).
 * Het nieuwe adres krijgt een uitnodiging, het oude een annulering. Bestaat het item niet meer: niets doen.
 */
export async function swapAttendee(calendarOwner: string, eventId: string, from: string, to: string) {
  const at = await accessToken(calendarOwner)
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' })
  if (res.status === 404 || res.status === 410) return false
  const ev = (await res.json()) as { attendees?: { email: string }[]; status?: string; error?: { message?: string } }
  if (!res.ok) throw new Error(`Agenda-item lezen mislukt: ${ev.error?.message ?? res.status}`)
  if (ev.status === 'cancelled') return false
  const lower = (s: string) => s.toLowerCase()
  const kept = (ev.attendees ?? []).filter((a) => lower(a.email) !== lower(from) && lower(a.email) !== lower(to))
  const patch = await fetch(`${url}?sendUpdates=all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendees: [...kept, { email: to }] }),
    cache: 'no-store',
  })
  if (!patch.ok) throw new Error(`Genodigde aanpassen mislukt (${patch.status}).`)
  return true
}

/** Hele-dag-item (bv. een draaidag) in de agenda van `calendarOwner`, met uitnodigingen. */
export async function createAllDayEvent(opts: { calendarOwner: string; summary: string; date: string; attendees: string[]; description?: string }) {
  const at = await accessToken(opts.calendarOwner)
  const next = new Date(Date.parse(`${opts.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary: opts.summary, description: opts.description, start: { date: opts.date }, end: { date: next }, attendees: opts.attendees.map((email) => ({ email })), transparency: 'transparent' }),
    cache: 'no-store',
  })
  const json = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!res.ok || !json.id) throw new Error(`Agenda-item maken mislukt: ${json.error?.message ?? res.status}`)
  return json.id
}
