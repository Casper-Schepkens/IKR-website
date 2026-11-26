import 'server-only'
import { accessToken, forgetAccessToken, isGoogleConfigured, listConnections } from '@/lib/admin/google'
import { timeout } from '@/lib/admin/http'
import { forgetTeamToken, teamAccessToken } from '@/lib/admin/team/connections'
import { inviteAddresses } from '@/lib/admin/team/invites'
import { CONTACT_EMAIL, ownerOf } from '@/lib/admin/weekly/types'
import { agendaCalendarFor, notSharedMessage, type BusySource } from './core'
import type { Busy } from './slots'

/**
 * Vrij/bezet uit gekoppelde agenda's. ENKEL lezen, en enkel begin/einde: geen titels of deelnemers gaan
 * verder dan deze module (en zeker niet naar /boek).
 *
 * Elke bron heeft een provider. Een nieuwe soort agenda (bv. een iCal-link of Outlook) = één functie
 * toevoegen aan PROVIDERS; de tabel booking_busy_sources hoeft niet te veranderen.
 */

export type BusyProvider = {
  label: string
  description: string
  read(source: BusySource, from: Date, to: Date): Promise<Busy[]>
}

type RawEvent = {
  status?: string
  transparency?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: { email?: string; self?: boolean; responseStatus?: string }[]
}

/** Google weigerde het access token (bv. ingetrokken na opnieuw koppelen): token vergeten en één keer opnieuw. */
export class AuthExpired extends Error {
  constructor() {
    super('Google weigerde de toegang tot de agenda. Probeer opnieuw; blijft het, koppel de agenda dan opnieuw.')
  }
}

/** Geen toegang tot deze agenda (niet gedeeld met het gekoppelde account). */
export class NoAccess extends Error {}

async function retryOn401<T>(fn: () => Promise<T>, forget: () => void): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (!(e instanceof AuthExpired)) throw e
    forget()
    return fn()
  }
}

/** Events uit één Google-agenda, als bezette blokken. "Vrij" (transparent) en geannuleerd tellen niet. */
export async function readGoogleBusy(token: string, calendarId: string, from: Date, to: Date, keep: (e: RawEvent) => boolean = () => true): Promise<Busy[]> {
  const out: Busy[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 5; page++) {
    const p = new URLSearchParams({ singleEvents: 'true', maxResults: '250', timeMin: from.toISOString(), timeMax: to.toISOString(), fields: 'nextPageToken,items(status,transparency,start,end,attendees(email,self,responseStatus))' })
    if (pageToken) p.set('pageToken', pageToken)
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${p}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: timeout() })
    const json = (await res.json().catch(() => ({}))) as { items?: RawEvent[]; nextPageToken?: string; error?: { message?: string } }
    if (res.status === 401) throw new AuthExpired()
    if (res.status === 404 || res.status === 403) throw new NoAccess(json.error?.message ?? String(res.status))
    if (!res.ok) throw new Error(`Agenda lezen mislukt: ${json.error?.message ?? res.status}`)
    for (const e of json.items ?? []) {
      if (e.status === 'cancelled' || e.transparency === 'transparent' || !keep(e)) continue
      // Zelf afgewezen: niet bezet.
      if (e.attendees?.some((a) => a.self && a.responseStatus === 'declined')) continue
      const s = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00` : null)
      const en = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00` : null)
      if (!s || !en) continue
      // Hele-dag-items (die als "bezet" staan): de hele Brusselse dag, ruim genomen.
      const start = e.start?.dateTime ? Date.parse(s) : Date.parse(`${s}Z`) - 2 * 3_600_000
      const end = e.end?.dateTime ? Date.parse(en) : Date.parse(`${en}Z`)
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) out.push({ start, end })
    }
    pageToken = json.nextPageToken
    if (!pageToken) break
  }
  return out
}

export const PROVIDERS: Record<string, BusyProvider> = {
  /** De contact@-agenda (zelfde koppeling als de weeklies): items waarvoor dit teamlid uitgenodigd is. */
  contact_agenda: {
    label: 'Contact-agenda',
    description: 'Afspraken in de contact@-agenda waarvoor jij uitgenodigd bent (weeklies, calls, draaidagen).',
    async read(source, from, to) {
      if (!isGoogleConfigured()) throw new Error('Google is nog niet ingesteld.')
      if (!(await listConnections()).some((c) => c.email === CONTACT_EMAIL)) throw new Error('De contact-agenda is nog niet gekoppeld (Instellingen).')
      const owner = ownerOf(source.member_email)
      const invites = await inviteAddresses()
      const mine = new Set([source.member_email, owner ? invites[owner] : null].filter((x): x is string => Boolean(x)).map((x) => x.toLowerCase()))
      return retryOn401(
        async () => readGoogleBusy(await accessToken(CONTACT_EMAIL), 'primary', from, to, (e) => (e.attendees ?? []).some((a) => a.email && mine.has(a.email.toLowerCase()))),
        () => forgetAccessToken(CONTACT_EMAIL),
      )
    },
  },
  /** De eigen agenda-koppeling (Mijn koppelingen): mag ook een persoonlijk Google-account zijn. */
  team_agenda: {
    label: 'Mijn agenda',
    description:
      'De agenda van je uitnodigingsadres (waar ook de weeklies en calls naartoe gaan), via je agenda-koppeling in Instellingen → Mijn koppelingen. Mag een persoonlijke Google-agenda zijn. Enkel vrij/bezet wordt gelezen.',
    async read(source, from, to) {
      const owner = ownerOf(source.member_email)
      const target = owner ? (await inviteAddresses())[owner] : source.member_email
      return retryOn401(
        async () => {
          const { token, conn } = await teamAccessToken(source.member_email, 'agenda')
          // Altijd de agenda van het uitnodigingsadres; extra agenda's enkel als ze uitdrukkelijk in de bron staan.
          const main = agendaCalendarFor(conn, target)
          const ids = [...new Set([main, ...source.calendar_ids])]
          try {
            return (await Promise.all(ids.map((id) => readGoogleBusy(token, id, from, to)))).flat()
          } catch (e) {
            if (e instanceof NoAccess) throw new Error(notSharedMessage(target, conn.google_email))
            throw e
          }
        },
        () => forgetTeamToken(source.member_email, 'agenda'),
      )
    },
  },
}

/** Bezet volgens alle actieve bronnen van één teamlid. Gooit als een bron niet leesbaar is. */
export async function readMemberBusy(sources: BusySource[], from: Date, to: Date): Promise<Busy[]> {
  const active = sources.filter((s) => s.active)
  const per = await Promise.all(
    active.map(async (s) => {
      const p = PROVIDERS[s.provider]
      if (!p) throw new Error(`Onbekende agenda-bron "${s.provider}".`)
      try {
        return await p.read(s, from, to)
      } catch (e) {
        throw new Error(`${p.label}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }),
  )
  return per.flat()
}
