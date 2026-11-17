import 'server-only'
import { inviteAddresses } from '../team/invites'
import { brusselsToIso } from '../format'
import { createEvent, isGoogleConfigured, listConnections } from '../google'
import { CONTACT_EMAIL, MAX_LIVE_MINUTES, ONLINE_MINUTES, TEAM, type Weekly, type WeeklyMode } from './types'
import { weeklyMinutes } from './board'
import type { WeeklyRepo } from './repo'

/** Legt een weekly vast en zet ze (met Meet bij online) in de contact-agenda, met uitnodigingen. */
export async function scheduleWeekly(
  repo: WeeklyRepo,
  by: string,
  input: { date: string | null; time: string | null; endTime?: string | null; mode: string | null },
) {
  const { date, time } = input
  const mode = input.mode as WeeklyMode | null
  if (!date || !time || (mode !== 'live' && mode !== 'online')) throw new Error('Kies een datum, een uur en live of online.')
  const { startsAt, endsAt } = weeklyTimes(date, time, mode, input.endTime ?? null)
  const weekly = await repo.createWeekly({ starts_at: startsAt, ends_at: endsAt, mode, created_by: by })
  await syncWeeklyCalendar(repo, weekly)
  return weekly
}

/**
 * Een weekly afsluiten en meteen de volgende inplannen (dashboard en Grok Bot gebruiken dit allebei).
 * Eerst de invoer nakijken, dan afsluiten, dan pas de volgende maken: mislukt dat laatste, dan wordt het
 * afsluiten teruggedraaid. Vroeger kon een fout op het einde twee open weeklies achterlaten.
 */
export async function concludeAndSchedule(
  repo: WeeklyRepo,
  by: string,
  weeklyId: string,
  input: { date: string | null; time: string | null; endTime?: string | null; mode: string | null },
) {
  const w = await repo.getWeekly(weeklyId)
  if (!w || w.status === 'concluded') throw new Error('Deze weekly bestaat niet of is al afgesloten.')
  const mode = input.mode as WeeklyMode | null
  if (!input.date || !input.time || (mode !== 'live' && mode !== 'online')) throw new Error('Kies een datum, een uur en live of online.')
  weeklyTimes(input.date, input.time, mode, input.endTime ?? null) // gooit bij een ongeldig uur, vóór er iets verandert
  const before = { status: w.status, concluded_at: w.concluded_at ?? null } // kopie: de repo kan hetzelfde object aanpassen
  await repo.updateWeekly(weeklyId, { status: 'concluded', concluded_at: new Date().toISOString() })
  try {
    const next = await scheduleWeekly(repo, by, input)
    await repo.assignPending(next.id)
    return next
  } catch (e) {
    await repo.updateWeekly(weeklyId, before).catch(() => undefined)
    throw e
  }
}

/**
 * Start en einde. Online: altijd ONLINE_MINUTES (het einduur wordt genegeerd).
 * Live: een einduur is verplicht en moet na het startuur liggen (zelfde dag).
 */
export function weeklyTimes(date: string, time: string, mode: WeeklyMode, endTime: string | null) {
  const startsAt = brusselsToIso(date, time)
  if (mode === 'online') return { startsAt, endsAt: new Date(new Date(startsAt).getTime() + ONLINE_MINUTES * 60_000).toISOString() }
  if (!endTime || !/^\d{2}:\d{2}$/.test(endTime)) throw new Error('Kies voor een live weekly ook een einduur.')
  const endsAt = brusselsToIso(date, endTime)
  const minutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000
  if (minutes <= 0) throw new Error('Het einduur moet na het startuur liggen.')
  if (minutes > MAX_LIVE_MINUTES) throw new Error('Een weekly van meer dan 8 uur? Kijk het einduur even na.')
  return { startsAt, endsAt }
}

/**
 * Zet een weekly in de contact-agenda (met Meet bij online) als dat nog niet gebeurd is.
 * Bewaart een foutmelding bij de weekly als het niet lukt; een latere poging kan het alsnog doen.
 */
export async function syncWeeklyCalendar(repo: WeeklyRepo, weekly: Pick<Weekly, 'id' | 'starts_at' | 'ends_at' | 'mode' | 'calendar_event_id'>) {
  if (weekly.calendar_event_id) return
  const { starts_at: startsAt, mode } = weekly
  try {
    if (!isGoogleConfigured()) throw new Error('Google is nog niet ingesteld, dus er is geen agenda-item gemaakt.')
    const connected = new Set((await listConnections()).map((c) => c.email))
    if (!connected.has(CONTACT_EMAIL)) throw new Error('De contact-agenda is nog niet gekoppeld (Instellingen).')
    // Iedereen krijgt een uitnodiging op zijn eigen uitnodigingsadres (Instellingen → Mijn koppelingen),
    // zodat de weekly vanzelf in zijn (persoonlijke) agenda komt.
    const invites = await inviteAddresses()
    const attendees = [...new Set(TEAM.map((t) => invites[t.key]))]
    const ev = await createEvent({
      calendarOwner: CONTACT_EMAIL,
      summary: `IKR weekly (${mode === 'online' ? 'online' : 'live'})`,
      startsAt,
      minutes: weeklyMinutes(weekly),
      attendees,
      meet: mode === 'online',
    })
    await repo.updateWeekly(weekly.id, { calendar_event_id: ev.eventId, meet_url: ev.meetUrl, calendar_error: null })
  } catch (e) {
    await repo.updateWeekly(weekly.id, { calendar_error: e instanceof Error ? e.message : 'Agenda mislukt.' })
  }
}

/** Alle niet-afgesloten weeklies zonder agenda-item opnieuw proberen (bv. net na het koppelen van contact@). */
export async function retryOpenCalendars(repo: WeeklyRepo) {
  const open = (await repo.listWeeklies()).filter((w) => w.status !== 'concluded' && !w.calendar_event_id)
  for (const w of open) await syncWeeklyCalendar(repo, w)
  return open.length
}
