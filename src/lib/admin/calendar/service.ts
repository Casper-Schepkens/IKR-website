import 'server-only'
import { isGoogleConfigured, listCalendarItems, listConnections } from '../google'
import { isSupabaseConfigured } from '../env'
import { createServiceSupabase } from '../supabase/server'
import { CONTACT_EMAIL } from '../weekly/types'
import { classify, dayIn, type CalItem } from './core'

export type CalendarResult = { status: 'ok'; items: CalItem[]; demo?: boolean } | { status: 'not_connected'; reason: string }

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Items van de contact@-agenda tussen twee dagen (inclusief), met een link naar het dashboard waar we ze herkennen. */
export async function loadCalendar(fromDay: string, toDay: string): Promise<CalendarResult> {
  if (!isSupabaseConfigured()) return { status: 'ok', items: demoItems(fromDay, toDay), demo: true }
  if (!isGoogleConfigured()) return { status: 'not_connected', reason: 'Google is nog niet ingesteld.' }
  if (!(await listConnections()).some((c) => c.email === CONTACT_EMAIL)) return { status: 'not_connected', reason: 'De contact-agenda is nog niet gekoppeld (Instellingen).' }
  // Ruim nemen (tijdzones); daarna op Belgische datum filteren.
  const raw = await listCalendarItems(CONTACT_EMAIL, new Date(`${addDays(fromDay, -1)}T00:00:00Z`), new Date(`${addDays(toDay, 2)}T00:00:00Z`))
  const links = await dashboardLinks()
  const items = raw
    .filter((e) => e.status !== 'cancelled')
    .map((e): CalItem => {
      const allDay = Boolean(e.start.date)
      const day = allDay ? e.start.date! : dayIn(e.start.dateTime!)
      const lastDay = allDay ? addDays(e.end.date ?? e.start.date!, -1) : dayIn(e.end.dateTime ?? e.start.dateTime!)
      const kind = classify(e.summary)
      return { id: e.id, title: e.summary, kind, allDay, day, lastDay: lastDay < day ? day : lastDay, start: e.start.dateTime ?? null, end: e.end.dateTime ?? null, meetUrl: e.hangoutLink ?? null, href: links.get(e.id) ?? (kind === 'draaidag' ? '/admin/productie' : null) }
    })
    .filter((it) => it.lastDay >= fromDay && it.day <= toDay)
  return { status: 'ok', items }
}

/** Agenda-items die het dashboard zelf maakte: weekly → meetingpagina, call → calls, draaidag → productie. */
async function dashboardLinks() {
  const db = createServiceSupabase()
  const map = new Map<string, string>()
  const [w, c, p] = await Promise.all([
    db.from('weeklies').select('id, calendar_event_id').not('calendar_event_id', 'is', null),
    db.from('calls').select('id, calendar_event_id').not('calendar_event_id', 'is', null),
    db.from('production_cycles').select('calendar_event_id').not('calendar_event_id', 'is', null),
  ])
  for (const r of w.data ?? []) map.set(r.calendar_event_id as string, `/admin/weekly/${r.id}`)
  for (const r of c.data ?? []) map.set(r.calendar_event_id as string, '/admin/sales/calls')
  for (const r of p.data ?? []) map.set(r.calendar_event_id as string, '/admin/productie')
  return map
}

/** Demomodus (lokaal zonder Supabase): voorbeelden rond vandaag. */
function demoItems(fromDay: string, toDay: string): CalItem[] {
  const today = new Date().toISOString().slice(0, 10)
  const at = (dayOffset: number, time: string, minutes: number) => {
    const day = addDays(today, dayOffset)
    const start = new Date(`${day}T${time}:00+01:00`).toISOString()
    return { day, lastDay: day, start, end: new Date(Date.parse(start) + minutes * 60_000).toISOString(), allDay: false }
  }
  const all: CalItem[] = [
    { id: 'd1', title: 'IKR weekly (online)', kind: 'weekly', ...at(2, '10:00', 60), meetUrl: 'https://meet.google.com/abc-defg-hij', href: '/admin/weekly' },
    { id: 'd2', title: 'IKR × Bakkerij Peeters · sales call', kind: 'sales', ...at(1, '14:00', 60), meetUrl: 'https://meet.google.com/xyz-abcd-efg', href: '/admin/sales/calls' },
    { id: 'd3', title: 'IKR × Fietsen De Smet · setter call', kind: 'setter', ...at(0, '11:30', 15), meetUrl: null, href: '/admin/sales/calls' },
    { id: 'd4', title: 'Draaidag Tempus (09:30)', kind: 'draaidag', allDay: true, day: addDays(today, 5), lastDay: addDays(today, 5), start: null, end: null, meetUrl: null, href: '/admin/productie' },
    { id: 'd5', title: 'Draaidag Chez Albert', kind: 'draaidag', allDay: true, day: addDays(today, 12), lastDay: addDays(today, 12), start: null, end: null, meetUrl: null, href: '/admin/productie' },
    { id: 'd6', title: 'Boekhouder', kind: 'overig', ...at(-3, '16:00', 60), meetUrl: null, href: null },
    { id: 'd7', title: 'IKR weekly (live)', kind: 'weekly', ...at(-5, '10:00', 120), meetUrl: null, href: '/admin/weekly' },
  ]
  return all.filter((it) => it.lastDay >= fromDay && it.day <= toDay)
}
