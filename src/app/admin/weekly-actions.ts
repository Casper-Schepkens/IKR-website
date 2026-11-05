'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { isoDay } from '@/lib/admin/format'
import { shareWithDomain, startDriveUpload } from '@/lib/admin/google'
import { scheduleWeekly } from '@/lib/admin/weekly/schedule'
import { CONTACT_EMAIL, OWNERS, type Owner } from '@/lib/admin/weekly/types'
import { currentWeekly } from '@/lib/admin/weekly/board'
import type { ActionResult } from './actions'
import { addBotToMeeting, isBotInMeeting, isFirefliesConfigured } from '@/lib/admin/fireflies'

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

export async function planWeeklyAction(form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    if (currentWeekly(await session.weekly.listWeeklies())) throw new Error('Er staat al een weekly ingepland.')
    const weekly = await scheduleWeekly(session.weekly, session.user.email, { date: str(form, 'date'), time: str(form, 'time'), mode: str(form, 'mode') })
    // To-do's die al klaarstonden, horen bij deze eerste weekly.
    await session.weekly.assignPending(weekly.id)
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
    const next = await scheduleWeekly(session.weekly, session.user.email, { date: str(form, 'date'), time: str(form, 'time'), mode: str(form, 'mode') })
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
    // Verder werken in je eigen notitie bij deze to-do (leeg = je notitie weghalen).
    await session.weekly.saveOwnNote(id, str(form, 'note') ?? '', session.user.email)
  })
}

export async function pushTodoAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.push(id)
  })
}

/** Titel van een to-do aanpassen (potlood naast de titel). */
export async function renameTodoAction(id: string, title: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    const t = title.trim().replace(/\s+/g, ' ')
    if (!t) throw new Error('De titel mag niet leeg zijn.')
    if (t.length > 300) throw new Error('De titel is te lang.')
    await session.weekly.updateTodo(id, { title: t })
  })
}

export async function unpushTodoAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.unpush(id)
  })
}

/** Niet af en geraakt ook niet af: de to-do definitief weghalen. */
export async function deleteTodoAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.deleteTodo(id)
  })
}

/** Start de upload van een opname van een live weekly naar de Drive van contact@. */
export async function startWeeklyRecordingAction(id: string, mimeType: string, origin: string) {
  try {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w) throw new Error('Weekly niet gevonden.')
    if (!/^audio\/[a-z0-9.+-]+(;.*)?$/i.test(mimeType)) throw new Error('Onbekend opnameformaat.')
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const name = `Weekly ${isoDay(new Date(w.starts_at))}.${ext}`
    const url = await startDriveUpload({ owner: CONTACT_EMAIL, folder: 'IKR Dashboard – Weeklies', name, mimeType, origin })
    return { ok: true as const, data: url }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Upload starten mislukt.' }
  }
}

/** Na de upload: delen met het team en de link bij de weekly bewaren. */
export async function finishWeeklyRecordingAction(id: string, fileId: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    if (!/^[\w-]{10,}$/.test(fileId)) throw new Error('Ongeldig bestand.')
    const url = await shareWithDomain(CONTACT_EMAIL, fileId, 'iknowright.be')
    await session.weekly.updateWeekly(id, { recording_url: url })
  })
}

/** Zit de Fireflies-bot in de Meet van deze weekly? */
export async function firefliesStatusAction(id: string) {
  try {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w?.meet_url) throw new Error('Deze weekly heeft geen Meet-link.')
    if (!isFirefliesConfigured()) throw new Error('Fireflies is nog niet gekoppeld (FIREFLIES_API_KEY).')
    return { ok: true as const, data: await isBotInMeeting(w.meet_url) }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Fireflies niet bereikbaar.' }
  }
}

export async function addFirefliesAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w?.meet_url) throw new Error('Deze weekly heeft geen Meet-link.')
    await addBotToMeeting(w.meet_url, `IKR weekly ${isoDay(new Date(w.starts_at))}`)
  })
}
