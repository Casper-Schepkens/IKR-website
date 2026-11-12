'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { isoDay } from '@/lib/admin/format'
import { makeFilePublic, removeFilePermission, shareWithDomain, startDriveUpload } from '@/lib/admin/google'
import { scheduleWeekly, syncWeeklyCalendar } from '@/lib/admin/weekly/schedule'
import { CONTACT_EMAIL, OWNERS, type Owner } from '@/lib/admin/weekly/types'
import { currentWeekly } from '@/lib/admin/weekly/board'
import type { ActionResult } from './actions'
import { addBotToMeeting, isBotInMeeting, isFirefliesConfigured, uploadAudio } from '@/lib/admin/fireflies'
import { inferKind, safeUrl } from '@/lib/admin/weekly/pins'

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
    const weekly = await scheduleWeekly(session.weekly, session.user.email, { date: str(form, 'date'), time: str(form, 'time'), endTime: str(form, 'end_time'), mode: str(form, 'mode') })
    // To-do's die al klaarstonden, horen bij deze eerste weekly.
    await session.weekly.assignPending(weekly.id)
  })
}

export async function startWeeklyAction(id: string) {
  const session = await requireAdmin()
  const w = await session.weekly.getWeekly(id)
  if (w && w.status === 'planned') {
    await session.weekly.updateWeekly(id, { status: 'started', started_at: new Date().toISOString() })
    // Tijdens de meeting overlopen we alles: niets meer grijs.
    await session.weekly.clearChecked(id)
  }
  redirect(`/admin/weekly/${id}`)
}

/** Agenda-item (en Meet bij online) alsnog aanmaken, bv. als de contact-agenda pas later gekoppeld werd. */
export async function retryWeeklyCalendarAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w) throw new Error('Weekly niet gevonden.')
    if (w.status === 'concluded') throw new Error('Deze weekly is al afgesloten.')
    await syncWeeklyCalendar(session.weekly, w)
    const after = await session.weekly.getWeekly(id)
    if (after?.calendar_error && !after.calendar_event_id) throw new Error(after.calendar_error)
  })
}

/** Sluit de weekly af en plant meteen de volgende in. */
export async function concludeWeeklyAction(id: string, form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w || w.status === 'concluded') throw new Error('Deze weekly is al afgesloten.')
    const next = await scheduleWeekly(session.weekly, session.user.email, { date: str(form, 'date'), time: str(form, 'time'), endTime: str(form, 'end_time'), mode: str(form, 'mode') })
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

// ─── Prikbord ──────────────────────────────────────────────

/** Kaartje op het prikbord (iedereen mag; meestal zet Grok Bot ze klaar). */
export async function createPinAction(form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    // Geüpload bestand (de browser zette het al in de Drive van contact@): delen met het team en linken.
    const fileId = str(form, 'file_id')
    const fileName = str(form, 'file_name')
    if (fileId && !/^[\w-]{10,}$/.test(fileId)) throw new Error('Ongeldig bestand.')
    const title = str(form, 'title') || fileName
    if (!title) throw new Error('Geef het kaartje een titel.')
    const rawUrl = fileId ? await shareWithDomain(CONTACT_EMAIL, fileId, 'iknowright.be') : str(form, 'url')
    const url = safeUrl(rawUrl)
    if (rawUrl && !url) throw new Error('Die link klopt niet (enkel http/https).')
    const forOwner = str(form, 'for') as Owner | null
    await session.weekly.createPin({
      kind: fileId ? 'document' : inferKind(str(form, 'kind'), url),
      title: title.slice(0, 200),
      body: str(form, 'body')?.slice(0, 4000) ?? null,
      url,
      for_owner: forOwner && OWNERS.includes(forOwner) ? forOwner : null,
      created_by: session.user.email,
      created_via: 'dashboard',
    })
  })
}

/** Bestand op het prikbord: upload-URL naar de Drive van contact@ (map "IKR Dashboard – Prikbord"). */
export async function startPinUploadAction(name: string, mimeType: string, origin: string) {
  try {
    await requireAdmin()
    const clean = name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 180)
    if (!clean) throw new Error('Bestand zonder naam.')
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(mimeType) ? mimeType : 'application/octet-stream'
    const url = await startDriveUpload({ owner: CONTACT_EMAIL, folder: 'IKR Dashboard – Prikbord', name: clean, mimeType: mime, origin })
    return { ok: true as const, data: url }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Upload starten mislukt.' }
  }
}

export async function setPinPinnedAction(id: string, pinned: boolean) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.updatePin(id, { pinned })
  })
}

export async function deletePinAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.deletePin(id)
  })
}

/** Tijdens de weekly: prikbord leegmaken (vastgepinde kaartjes blijven). */
export async function clearPinsAction() {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.clearPins()
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
export async function startWeeklyRecordingAction(id: string, mimeType: string, origin: string, fileName?: string) {
  try {
    const session = await requireAdmin()
    const w = await session.weekly.getWeekly(id)
    if (!w) throw new Error('Weekly niet gevonden.')
    // Opnemen in het dashboard (audio) of een opname uploaden (audio of video).
    if (!/^(audio|video)\/[a-z0-9.+-]+(;.*)?$/i.test(mimeType)) throw new Error('Kies een audio- of videobestand.')
    const fromName = fileName?.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase()
    const ext = fromName ?? (mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm')
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
    await session.weekly.updateWeekly(id, { recording_url: url, recording_file_id: fileId })
    // Naar Fireflies: tijdelijk "iedereen met de link", zodat Fireflies de opname kan ophalen. Zodra het
    // transcript binnen is (webhook) wordt de link ingetrokken en verwerkt Grok Bot de weekly.
    if (!isFirefliesConfigured()) throw new Error('Opname staat in de Drive, maar Fireflies is niet ingesteld (FIREFLIES_API_KEY).')
    const w = (await session.weekly.getWeekly(id))!
    let perm: string | null = null
    try {
      perm = await makeFilePublic(CONTACT_EMAIL, fileId)
      await session.weekly.updateWeekly(id, { recording_public_permission: perm })
      await uploadAudio(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`, `IKR weekly ${isoDay(new Date(w.starts_at))}`, `weekly:${id}`)
    } catch (e) {
      if (perm) {
        await removeFilePermission(CONTACT_EMAIL, fileId, perm).catch(() => undefined)
        await session.weekly.updateWeekly(id, { recording_public_permission: null })
      }
      throw new Error(`Opname staat in de Drive, maar niet naar Fireflies: ${e instanceof Error ? e.message : String(e)}`)
    }
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

/** Afgewerkt aanvinken vóór de weekly: de to-do wordt grijs (niet doorstreept). */
export async function setTodoCheckedAction(id: string, checked: boolean) {
  return attempt(async () => {
    const session = await requireAdmin()
    await session.weekly.setChecked(id, checked)
  })
}
