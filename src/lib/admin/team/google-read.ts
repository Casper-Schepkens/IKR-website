import 'server-only'
import { teamAccessToken, type CalendarInfo } from './connections'

/**
 * Enkel LEZEN uit de mailbox en agenda's van een teamlid. Alleen GET-oproepen: niets versturen,
 * geen concepten, niets verwijderen of aanpassen (de tokens hebben daar ook geen rechten voor).
 */

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me'
const CAL = 'https://www.googleapis.com/calendar/v3'

async function get<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!res.ok) throw new Error(`Google: ${json.error?.message ?? res.status}`)
  return json
}

// ─── Gmail ────────────────────────────────────────────────
type Part = { partId?: string; mimeType?: string; filename?: string; body?: { data?: string; size?: number; attachmentId?: string }; parts?: Part[]; headers?: { name: string; value: string }[] }
type RawMessage = { id: string; threadId: string; internalDate: string; snippet?: string; labelIds?: string[]; payload: Part }

export type MailSummary = { bericht_id: string; thread_id: string; van: string; aan: string; onderwerp: string; datum: string; fragment: string }
export type Attachment = { bijlage_id: string; bestandsnaam: string; type: string; grootte: number }
export type MailFull = MailSummary & { cc: string; tekst: string; bijlagen: Attachment[] }

const decode = (d?: string) => (d ? Buffer.from(d, 'base64url').toString('utf8') : '')
const header = (p: Part, n: string) => p.headers?.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? ''

function bodyText(p: Part): string {
  if (p.mimeType === 'text/plain' && p.body?.data && !p.filename) return decode(p.body.data)
  for (const c of p.parts ?? []) {
    const t = bodyText(c)
    if (t) return t
  }
  if (p.mimeType === 'text/html' && p.body?.data && !p.filename)
    return decode(p.body.data).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  return ''
}

function attachments(p: Part, out: Attachment[] = []): Attachment[] {
  if (p.filename && p.body?.attachmentId)
    out.push({ bijlage_id: p.body.attachmentId, bestandsnaam: p.filename, type: p.mimeType ?? 'application/octet-stream', grootte: p.body.size ?? 0 })
  for (const c of p.parts ?? []) attachments(c, out)
  return out
}

const summary = (m: RawMessage): MailSummary => ({
  bericht_id: m.id,
  thread_id: m.threadId,
  van: header(m.payload, 'From'),
  aan: header(m.payload, 'To'),
  onderwerp: header(m.payload, 'Subject'),
  datum: new Date(Number(m.internalDate)).toISOString(),
  fragment: m.snippet ?? '',
})

const full = (m: RawMessage): MailFull => ({
  ...summary(m),
  cc: header(m.payload, 'Cc'),
  tekst: bodyText(m.payload).trim().slice(0, 20_000),
  bijlagen: attachments(m.payload),
})

/** Gmail-zoekopdracht met optionele periode (YYYY-MM-DD, "tot" inclusief). */
export function gmailQuery(zoekterm: string | undefined, van?: string, tot?: string) {
  const day = (d: string) => d.replace(/-/g, '/')
  const plusOne = (d: string) => new Date(new Date(`${d}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
  return [zoekterm?.trim(), van ? `after:${day(van)}` : '', tot ? `before:${day(plusOne(tot))}` : ''].filter(Boolean).join(' ')
}

export async function searchMail(member: string, q: string, max = 20): Promise<MailSummary[]> {
  const { token } = await teamAccessToken(member, 'mail')
  const list = await get<{ messages?: { id: string }[] }>(token, `${GMAIL}/messages?maxResults=${Math.min(max, 50)}&q=${encodeURIComponent(q)}`)
  return Promise.all(
    (list.messages ?? []).map(async (m) =>
      summary(await get<RawMessage>(token, `${GMAIL}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`)),
    ),
  )
}

export async function readMessage(member: string, id: string): Promise<MailFull> {
  const { token } = await teamAccessToken(member, 'mail')
  return full(await get<RawMessage>(token, `${GMAIL}/messages/${encodeURIComponent(id)}?format=full`))
}

export async function readThread(member: string, id: string): Promise<MailFull[]> {
  const { token } = await teamAccessToken(member, 'mail')
  const t = await get<{ messages: RawMessage[] }>(token, `${GMAIL}/threads/${encodeURIComponent(id)}?format=full`)
  return t.messages.map(full)
}

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

/** Bijlage ophalen (base64). Bestandsnaam en type komen uit het bericht zelf. */
export async function getAttachment(member: string, messageId: string, attachmentId: string) {
  const { token } = await teamAccessToken(member, 'mail')
  const msg = await get<RawMessage>(token, `${GMAIL}/messages/${encodeURIComponent(messageId)}?format=full`)
  const meta = attachments(msg.payload).find((a) => a.bijlage_id === attachmentId)
  if (!meta) throw new Error('Bijlage niet gevonden in dit bericht.')
  if (meta.grootte > MAX_ATTACHMENT_BYTES) throw new Error(`Bijlage te groot (${Math.round(meta.grootte / 1024 / 1024)} MB, max 15 MB).`)
  const a = await get<{ data: string; size: number }>(token, `${GMAIL}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`)
  return { ...meta, base64: Buffer.from(a.data, 'base64url').toString('base64') }
}

// ─── Agenda ───────────────────────────────────────────────
/** Alle agenda's van het gekoppelde account (om er één of meer te kiezen). */
export async function listCalendarsWithToken(token: string): Promise<CalendarInfo[]> {
  const r = await get<{ items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean }[] }>(token, `${CAL}/users/me/calendarList?maxResults=250`)
  return (r.items ?? []).map((c) => ({ id: c.id, naam: c.summaryOverride ?? c.summary ?? c.id, primair: Boolean(c.primary) }))
}

export async function listCalendars(member: string) {
  const { token } = await teamAccessToken(member, 'agenda')
  return listCalendarsWithToken(token)
}

export type CalEvent = {
  agenda: string
  titel: string
  start: string
  eind: string
  hele_dag: boolean
  locatie: string | null
  meet: string | null
  deelnemers: string[]
  beschrijving: string | null
  status: string
}

type RawEvent = {
  status?: string
  summary?: string
  location?: string
  description?: string
  hangoutLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: { email?: string }[]
}

/** Events tussen van en tot (YYYY-MM-DD, tot inclusief) over de gekozen agenda's. */
export async function calendarEvents(member: string, van: string, tot: string): Promise<CalEvent[]> {
  const { token, conn } = await teamAccessToken(member, 'agenda')
  if (!conn.selected_calendars.length) throw new Error('Er zijn nog geen agenda\'s gekozen (Instellingen → Mijn koppelingen).')
  const timeMin = new Date(`${van}T00:00:00Z`).toISOString()
  const timeMax = new Date(new Date(`${tot}T00:00:00Z`).getTime() + 86_400_000).toISOString()
  const names = new Map(conn.calendars.map((c) => [c.id, c.naam]))
  const per = await Promise.all(
    conn.selected_calendars.map(async (id) => {
      const r = await get<{ items?: RawEvent[] }>(
        token,
        `${CAL}/calendars/${encodeURIComponent(id)}/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      )
      return (r.items ?? [])
        .filter((e) => e.status !== 'cancelled')
        .map((e) => ({
          agenda: names.get(id) ?? id,
          titel: e.summary ?? '(geen titel)',
          start: e.start?.dateTime ?? e.start?.date ?? '',
          eind: e.end?.dateTime ?? e.end?.date ?? '',
          hele_dag: Boolean(e.start?.date && !e.start?.dateTime),
          locatie: e.location ?? null,
          meet: e.hangoutLink ?? null,
          deelnemers: (e.attendees ?? []).map((a) => a.email ?? '').filter(Boolean),
          beschrijving: e.description ? e.description.slice(0, 2000) : null,
          status: e.status ?? 'confirmed',
        }))
    }),
  )
  return per.flat().sort((a, b) => a.start.localeCompare(b.start))
}
