'use server'

import { revalidatePath } from 'next/cache'
import { requireSales } from '@/lib/admin/session'
import { addBotToMeeting, isBotInMeeting, isFirefliesConfigured, uploadAudio } from '@/lib/admin/fireflies'
import { makeFilePublic, removeFilePermission, shareWithDomain, startDriveUpload } from '@/lib/admin/google'
import { fmtDate, fmtTime, isoDay } from '@/lib/admin/format'
import { cancelCall, finishCall, scheduleCall, syncCallsFromCalendar } from '@/lib/admin/calls/service'
import { CALL_KIND_LABELS, cleanPptUrl, insertMeetLink, type CallKind } from '@/lib/admin/calls/types'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'
import { sendInboxReplyAction, type ActionResult } from './actions'

/** Calls (sales, enkel Casper). Niets hier verstuurt mail, behalve "Verstuur en plan" via de bestaande verzendactie. */

async function attempt<T = void>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    revalidatePath('/admin/sales', 'layout')
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
const str = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
const kindOf = (v: string | null): CallKind => (v === 'setter' ? 'setter' : 'sales')
const minutesOf = (v: string | null) => (v ? Number(v) : null)

/** Calls-pagina: call toevoegen (in de contact-agenda; lead enkel uitnodigen als aangevinkt). */
export async function scheduleCallAction(form: FormData) {
  return attempt(async () => {
    const { calls, leads, user } = await requireSales()
    const leadId = str(form, 'lead_id')
    if (!leadId) throw new Error('Kies een lead.')
    const call = await scheduleCall(
      { calls, leads },
      { leadId, kind: kindOf(str(form, 'kind')), date: str(form, 'date'), time: str(form, 'time'), minutes: minutesOf(str(form, 'minutes')), inviteLead: form.get('invite') === 'on', via: 'dashboard', by: user.email },
    )
    if (call.calendar_error) throw new Error(`Call bewaard, maar niet in de agenda gezet: ${call.calendar_error}`)
  })
}

/**
 * Inbox: "Verstuur en plan in agenda". Eerst inplannen (Meet-link), de link in de mail zetten, dan versturen
 * via de bestaande verzendactie. Mislukt het versturen, dan blijft de call staan en komt de tekst met link terug.
 */
export async function sendAndScheduleAction(threadId: string, leadId: string, form: FormData): Promise<{ ok: boolean; error?: string; body?: string }> {
  try {
    const { calls, leads, user } = await requireSales()
    const kind = kindOf(str(form, 'kind'))
    const call = await scheduleCall(
      { calls, leads },
      { leadId, kind, date: str(form, 'date'), time: str(form, 'time'), minutes: minutesOf(str(form, 'minutes')), inviteLead: form.get('invite') === 'on', via: 'inbox', by: user.email },
    )
    if (call.calendar_error) return { ok: false, error: `Niet ingepland (${call.calendar_error}); de mail is niet verstuurd.` }
    let body = str(form, 'body') ?? ''
    if (call.meet_url) body = insertMeetLink(body, call.meet_url, `${fmtDate(call.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} om ${fmtTime(call.starts_at)}`)
    const data = new FormData()
    data.set('body', body)
    const jobId = str(form, 'job_id')
    if (jobId) data.set('job_id', jobId)
    const res = await sendInboxReplyAction(threadId, data)
    revalidatePath('/admin/sales', 'layout')
    if (!res.ok) return { ok: false, error: `${CALL_KIND_LABELS[kind]} is ingepland, maar de mail is niet verstuurd: ${res.error}`, body }
    return { ok: true, body }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

/** "Call starten": Fireflies erbij steken (de Meet opent de browser zelf). */
export async function startCallAction(id: string) {
  return attempt(async () => {
    const { calls } = await requireSales()
    const c = await calls.get(id)
    if (!c?.meet_url) throw new Error('Deze call heeft geen Meet-link.')
    await calls.update(id, { started_at: c.started_at ?? new Date().toISOString() })
    if (!isFirefliesConfigured()) throw new Error('Meet geopend, maar Fireflies is niet ingesteld (FIREFLIES_API_KEY).')
    await addBotToMeeting(c.meet_url, `IKR ${CALL_KIND_LABELS[c.kind].toLowerCase()} ${isoDay(new Date(c.starts_at))}`)
    await calls.update(id, { fireflies_added_at: new Date().toISOString() })
  })
}

export async function firefliesCheckAction(id: string) {
  return attempt(async () => {
    const { calls } = await requireSales()
    const c = await calls.get(id)
    if (!c?.meet_url) throw new Error('Deze call heeft geen Meet-link.')
    if (!isFirefliesConfigured()) throw new Error('Fireflies is niet ingesteld (FIREFLIES_API_KEY).')
    return { inMeeting: await isBotInMeeting(c.meet_url) }
  })
}

export async function addFirefliesAction(id: string) {
  return attempt(async () => {
    const { calls } = await requireSales()
    const c = await calls.get(id)
    if (!c?.meet_url) throw new Error('Deze call heeft geen Meet-link.')
    await addBotToMeeting(c.meet_url, `IKR ${CALL_KIND_LABELS[c.kind].toLowerCase()} ${isoDay(new Date(c.starts_at))}`)
    await calls.update(id, { fireflies_added_at: new Date().toISOString() })
  })
}

export async function finishCallAction(id: string, outcome: 'afgerond' | 'no_show') {
  return attempt(async () => {
    const { calls, leads, drafts, user } = await requireSales()
    if (outcome !== 'afgerond' && outcome !== 'no_show') throw new Error('Onbekende uitkomst.')
    const r = await finishCall({ calls, leads, drafts }, id, outcome, null, user.email)
    return { draftId: r.draftId }
  })
}

/** Eigen sales-ppt voor deze call (https), of leeg = terug naar de standaard. */
export async function setCallSalesPptAction(id: string, url: string) {
  return attempt(async () => {
    const { calls } = await requireSales()
    if (!(await calls.get(id))) throw new Error('Call niet gevonden.')
    await calls.update(id, { sales_ppt_url: cleanPptUrl(url) })
  })
}

export async function cancelCallAction(id: string) {
  return attempt(async () => {
    const { calls, leads } = await requireSales()
    await cancelCall({ calls, leads }, id, { removeFromCalendar: true })
  })
}

/** Calls-pagina: nu in de contact-agenda kijken (anders gebeurt dat hoogstens om de 5 minuten). */
export async function syncCallsAction() {
  return attempt(async () => {
    const { calls, leads } = await requireSales()
    return syncCallsFromCalendar({ calls, leads }, { force: true })
  })
}

/** Setter call opnemen: upload rechtstreeks naar de Drive van contact@. */
export async function startCallRecordingAction(id: string, mimeType: string, origin: string) {
  try {
    const { calls, leads } = await requireSales()
    const c = await calls.get(id)
    if (!c) throw new Error('Call niet gevonden.')
    if (!/^audio\/[a-z0-9.+-]+(;.*)?$/i.test(mimeType)) throw new Error('Onbekend opnameformaat.')
    const lead = await leads.get(c.lead_id)
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const name = `${CALL_KIND_LABELS[c.kind]} ${lead?.company ?? lead?.name ?? ''} ${isoDay(new Date(c.starts_at))}.${ext}`.replace(/\s+/g, ' ')
    const url = await startDriveUpload({ owner: CONTACT_EMAIL, folder: 'IKR Dashboard – Calls', name, mimeType, origin })
    await calls.update(id, { started_at: c.started_at ?? new Date().toISOString() })
    return { ok: true as const, data: url }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Upload starten mislukt.' }
  }
}

export async function finishCallRecordingAction(id: string, fileId: string) {
  return attempt(async () => {
    const { calls } = await requireSales()
    if (!/^[\w-]{10,}$/.test(fileId)) throw new Error('Ongeldig bestand.')
    const url = await shareWithDomain(CONTACT_EMAIL, fileId, 'iknowright.be')
    await calls.update(id, { recording_url: url, recording_file_id: fileId })
    // Naar Fireflies: tijdelijk "iedereen met de link" zodat Fireflies de opname kan ophalen; de link wordt
    // ingetrokken zodra het transcript binnen is (en anders na 24 uur door de dagelijkse cron).
    if (!isFirefliesConfigured()) return { fireflies: 'niet ingesteld' }
    let perm: string | null = null
    try {
      const c = (await calls.get(id))!
      perm = await makeFilePublic(CONTACT_EMAIL, fileId)
      await calls.update(id, { recording_public_permission: perm })
      await uploadAudio(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`, `IKR ${CALL_KIND_LABELS[c.kind].toLowerCase()} ${isoDay(new Date(c.starts_at))}`, id)
      return { fireflies: 'verstuurd' }
    } catch (e) {
      if (perm) {
        await removeFilePermission(CONTACT_EMAIL, fileId, perm).catch(() => undefined)
        await calls.update(id, { recording_public_permission: null })
      }
      await calls.update(id, { note: `Opname niet naar Fireflies: ${e instanceof Error ? e.message : String(e)}` })
      return { fireflies: 'mislukt' }
    }
  })
}
