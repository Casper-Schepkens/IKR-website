import 'server-only'
import { accessToken, isGoogleConfigured, listConnections } from '@/lib/admin/google'
import { timeout } from '@/lib/admin/http'
import { teamAccessToken } from '@/lib/admin/team/connections'
import { inviteAddresses } from '@/lib/admin/team/invites'
import { CONTACT_EMAIL, ownerOf } from '@/lib/admin/weekly/types'
import type { BusySource } from './core'
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

/** Events uit één Google-agenda, als bezette blokken. "Vrij" (transparent) en geannuleerd tellen niet. */
export async function readGoogleBusy(token: string, calendarId: string, from: Date, to: Date, keep: (e: RawEvent) => boolean = () => true): Promise<Busy[]> {
  const out: Busy[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 5; page++) {
    const p = new URLSearchParams({ singleEvents: 'true', maxResults: '250', timeMin: from.toISOString(), timeMax: to.toISOString(), fields: 'nextPageToken,items(status,transparency,start,end,attendees(email,self,responseStatus))' })
    if (pageToken) p.set('pageToken', pageToken)
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${p}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: timeout() })
    const json = (await res.json().catch(() => ({}))) as { items?: RawEvent[]; nextPageToken?: string; error?: { message?: string } }
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
      const token = await accessToken(CONTACT_EMAIL)
      return readGoogleBusy(token, 'primary', from, to, (e) => (e.attendees ?? []).some((a) => a.email && mine.has(a.email.toLowerCase())))
    },
  },
  /** De eigen agenda-koppeling (Mijn koppelingen): mag ook een persoonlijk Google-account zijn. */
  team_agenda: {
    label: 'Mijn agenda-koppeling',
    description: "De agenda('s) die je koppelde in Instellingen → Mijn koppelingen (mag ook een persoonlijke Google-agenda zijn). Enkel vrij/bezet wordt gelezen.",
    async read(source, from, to) {
      const { token, conn } = await teamAccessToken(source.member_email, 'agenda')
      const ids = source.calendar_ids.length ? source.calendar_ids : conn.selected_calendars
      if (!ids.length) throw new Error("Er zijn nog geen agenda's gekozen (Instellingen → Mijn koppelingen).")
      return (await Promise.all(ids.map((id) => readGoogleBusy(token, id, from, to)))).flat()
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
