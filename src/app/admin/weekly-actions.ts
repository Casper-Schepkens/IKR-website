'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin, type AdminSession } from '@/lib/admin/session'
import { brusselsToIso } from '@/lib/admin/format'
import { createEvent, isGoogleConfigured, listConnections } from '@/lib/admin/google'
import { CONTACT_EMAIL, OWNERS, TEAM, type Owner, type WeeklyMode } from '@/lib/admin/weekly/types'
import { currentWeekly } from '@/lib/admin/weekly/board'
import type { ActionResult } from './actions'

async function attempt(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/weekly', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

function str(form: FormData, key: string) {
  const v = form.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Legt een weekly vast en zet ze (met Meet bij online) in de contact-agenda, met uitnodigingen. */
async function scheduleWeekly(session: AdminSession, form: FormData) {
  const date = str(form, 'date')
  const time = str(form, 'time')
  const mode = str(form, 'mode') as WeeklyMode | null
  if (!date || !time || (mode !== 'live' && mode !== 'online')) throw new Error('Kies een datum, een uur en live of online.')
  const startsAt = brusselsToIso(date, time)
  const weekly = await session.weekly.createWeekly({ starts_at: startsAt, mode, created_by: session.user.email })

  try {
    if (!isGoogleConfigured()) throw new Error('Google is nog niet ingesteld, dus er is geen agenda-item gemaakt.')
    const connected = new Set((await listConnections()).map((c) => c.email))
    if (!connected.has(CONTACT_EMAIL)) throw new Error('De contact-agenda is nog niet gekoppeld (Instellingen).')
    // Casper krijgt altijd een uitnodiging; Cedric en Milan zodra ze hun agenda gekoppeld hebben.
    const attendees = TEAM.filter((t) => t.key === 'casper' || connected.has(t.email)).map((t) => t.email)
    const ev = await createEvent({
      calendarOwner: CONTACT_EMAIL,
      summary: `IKR weekly (${mode === 'online' ? 'online' : 'live'})`,
      startsAt,
      minutes: 60,
      attendees,
      meet: mode === 'online',
    })
    await session.weekly.updateWeekly(weekly.id, { calendar_event_id: ev.eventId, meet_url: ev.meetUrl, calendar_error: null })
  } catch (e) {
    await session.weekly.updateWeekly(weekly.id, { calendar_error: e instanceof Error ? e.message : 'Agenda mislukt.' })
  }
  return weekly
}

export async function planWeeklyAction(form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    if (currentWeekly(await session.weekly.listWeeklies())) throw new Error('Er staat al een weekly ingepland.')
    await scheduleWeekly(session, form)
  })
}

export async function startWeeklyAction(id: string) {
  const session = await requireAdmin()
  const w = await session.weekly.getWeekly(id)
  if (w && w.status === 'planned') await session.weekly.updateWeekly(id, { status: 'started', started_at: new Date().toISOString() })
  redirect(`/admin/weekly/${id}`)
}

/** Sluit de weekly af en plant meteen de volgende in. */
export async function concludeWeeklyAction(id: string, form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w || w.status === 'concluded') throw new Error('Deze weekly is al afgesloten.')
    const next = await scheduleWeekly(session, form)
    await session.weekly.assignPending(next.id)
    await session.weekly.updateWeekly(id, { status: 'concluded', concluded_at: new Date().toISOString() })
  })
}

export async function createTodoAction(form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    const owner = str(form, 'owner') as Owner | null
    const title = str(form, 'title')
    const kind = str(form, 'kind') === 'long' ? 'long' : 'weekly'
    if (!owner || !OWNERS.includes(owner)) throw new Error('Kies voor wie de to-do is.')
    if (!title) throw new Error('Geef de to-do een titel.')
    const current = currentWeekly(await session.weekly.listWeeklies())
    // Tijdens een lopende meeting zijn nieuwe to-do's voor de volgende keer.
    const weeklyId = kind === 'weekly' && current?.status === 'planned' ? current.id : null
    await session.weekly.createTodo(
      { owner, title, kind, weekly_id: weeklyId, created_by: session.user.email },
      str(form, 'note'),
    )
  })
}

export async function setTodoDoneAction(id: string, done: boolean) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.setDone(id, done ? session.user.email : null)
  })
}

export async function addTodoNoteAction(id: string, form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    const body = str(form, 'note')
    if (!body) throw new Error('Schrijf eerst een notitie.')
    await session.weekly.addNote(id, body, session.user.email)
  })
}

export async function pushTodoAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.push(id)
  })
}
