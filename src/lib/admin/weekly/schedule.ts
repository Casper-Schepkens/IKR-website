import 'server-only'
import { brusselsToIso } from '../format'
import { createEvent, isGoogleConfigured, listConnections } from '../google'
import { CONTACT_EMAIL, TEAM, type WeeklyMode } from './types'
import type { WeeklyRepo } from './repo'

/** Legt een weekly vast en zet ze (met Meet bij online) in de contact-agenda, met uitnodigingen. */
export async function scheduleWeekly(repo: WeeklyRepo, by: string, input: { date: string | null; time: string | null; mode: string | null }) {
  const { date, time } = input
  const mode = input.mode as WeeklyMode | null
  if (!date || !time || (mode !== 'live' && mode !== 'online')) throw new Error('Kies een datum, een uur en live of online.')
  const startsAt = brusselsToIso(date, time)
  const weekly = await repo.createWeekly({ starts_at: startsAt, mode, created_by: by })

  try {
    if (!isGoogleConfigured()) throw new Error('Google is nog niet ingesteld, dus er is geen agenda-item gemaakt.')
    const connected = new Set((await listConnections()).map((c) => c.email))
    if (!connected.has(CONTACT_EMAIL)) throw new Error('De contact-agenda is nog niet gekoppeld (Instellingen).')
    // Casper krijgt altijd een uitnodiging (in zijn persoonlijke agenda); Cedric en Milan zodra ze
    // hun agenda gekoppeld hebben.
    const attendees = TEAM.filter((t) => t.key === 'casper' || connected.has(t.email)).map((t) => t.calendar)
    const ev = await createEvent({
      calendarOwner: CONTACT_EMAIL,
      summary: `IKR weekly (${mode === 'online' ? 'online' : 'live'})`,
      startsAt,
      minutes: 60,
      attendees,
      meet: mode === 'online',
    })
    await repo.updateWeekly(weekly.id, { calendar_event_id: ev.eventId, meet_url: ev.meetUrl, calendar_error: null })
  } catch (e) {
    await repo.updateWeekly(weekly.id, { calendar_error: e instanceof Error ? e.message : 'Agenda mislukt.' })
  }
  return weekly
}
