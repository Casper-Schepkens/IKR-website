import 'server-only'
import { fmtDate, isoDay } from '../format'
import { getTranscript, meetCode, type FirefliesTranscript } from '../fireflies'
import { createDocInFolder, ensureDrivePath, removeFilePermission } from '../google'
import { aiEngine, enqueue, isAiConfigured, runJob } from '../ai/jobs'
import { notifyGrok } from '../ai/notify'
import type { CallVerwerkenInput } from '../ai/handlers'
import { createServiceSupabase } from '../supabase/server'
import { supabaseCalls, type CallsRepo } from './repo'
import { supabaseLeads, type LeadsRepo } from '../sales/repo'
import { supabaseDrafts, type DraftsRepo } from '../sales/drafts'
import type { Lead } from '../sales/types'
import { CONTACT_EMAIL } from '../weekly/types'
import { queueWeeklySops } from '../sops/weekly'
import { finishCall } from './service'
import { CALL_KIND_LABELS, type Call } from './types'

/**
 * Fireflies-transcript → juiste call → Drive (Sales / Sales calls / Fireflies) → call afronden (als dat
 * vergeten werd) → AI-taak call_verwerken (lead bijwerken, bedankmail persoonlijker, analyse).
 * Niets hier verstuurt mail.
 */

export const TRANSCRIPT_FOLDER = ['Sales', 'Sales calls', 'Fireflies']
const WINDOW_MS = 3 * 3600_000

export type Deps = { calls: CallsRepo; leads: LeadsRepo; drafts: DraftsRepo }
export const serviceDeps = (): Deps => {
  const db = createServiceSupabase()
  return { calls: supabaseCalls(db), leads: supabaseLeads(db), drafts: supabaseDrafts(db) }
}

/**
 * Welke call hoort bij dit transcript: 1) client_reference_id (setter-opname), 2) dezelfde Meet,
 * 3) een deelnemer is de lead en de call lag binnen 3 uur, 4) naam/bedrijf in de titel binnen 3 uur.
 * Enkel bij precies één kandidaat; anders null (Grok Bot vraagt het dan aan Casper).
 */
export function matchCall(t: Pick<FirefliesTranscript, 'meetingLink' | 'date' | 'participants' | 'title'>, calls: Call[], leads: Lead[], clientRef?: string | null): Call | null {
  const live = calls.filter((c) => c.status !== 'geannuleerd')
  if (clientRef) {
    const c = live.find((x) => x.id === clientRef)
    if (c) return c
  }
  const code = meetCode(t.meetingLink)
  if (code) {
    const byMeet = live.filter((c) => meetCode(c.meet_url) === code)
    if (byMeet.length === 1) return byMeet[0]
    if (byMeet.length > 1 && t.date) return byMeet.sort((a, b) => Math.abs(Date.parse(a.starts_at) - Date.parse(t.date!)) - Math.abs(Date.parse(b.starts_at) - Date.parse(t.date!)))[0]
  }
  if (!t.date) return null
  const near = live.filter((c) => Math.abs(Date.parse(c.starts_at) - Date.parse(t.date!)) <= WINDOW_MS)
  const leadOf = new Map(leads.map((l) => [l.id, l]))
  const byMail = near.filter((c) => {
    const e = leadOf.get(c.lead_id)?.email?.toLowerCase()
    return e && t.participants.includes(e)
  })
  if (byMail.length === 1) return byMail[0]
  const title = t.title.toLowerCase()
  const byTitle = near.filter((c) => {
    const l = leadOf.get(c.lead_id)
    return [l?.company, l?.name].some((v) => v && v.length >= 4 && title.includes(v.toLowerCase()))
  })
  return byTitle.length === 1 ? byTitle[0] : null
}

async function upsertTranscript(row: Record<string, unknown>) {
  await createServiceSupabase()
    .from('call_transcripts')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'fireflies_id' })
}

/** Webhook "Transcription completed". Idempotent: een transcript wordt maar één keer verwerkt. */
export async function handleFirefliesEvent(meetingId: string, clientRef: string | null, deps: Deps = serviceDeps()) {
  const db = createServiceSupabase()
  const { data: seen } = await db.from('call_transcripts').select('status').eq('fireflies_id', meetingId).maybeSingle()
  if (seen && (seen.status === 'gekoppeld' || seen.status === 'verwerkt')) return { status: seen.status as string }
  const t = await getTranscript(meetingId)
  const [calls, leads] = await Promise.all([deps.calls.list(), deps.leads.list()])
  const call = matchCall(t, calls, leads, clientRef)
  if (!call) {
    // Weeklies: het transcript zelf gaat via de dagelijkse cron naar de Drive; hier enkel SOP-voorstellen.
    if (/weekly/i.test(t.title)) {
      const job = await queueWeeklySops({ id: t.id, title: t.title, date: t.date, text: t.text, url: t.firefliesUrl }).catch((e) => {
        console.error('[sops] weekly', e)
        return null
      })
      return { status: job ? 'weekly_sops' : 'genegeerd' }
    }
    await upsertTranscript({ fireflies_id: t.id, title: t.title, meeting_link: t.meetingLink, started_at: t.date, attendees: t.participants, status: 'ongekoppeld' })
    return { status: 'ongekoppeld' }
  }
  await processTranscript(call.id, t, deps)
  return { status: 'gekoppeld', callId: call.id }
}

/** Een (ongekoppeld) transcript manueel aan een call koppelen (Grok Bot, na bevestiging van Casper). */
export async function linkTranscript(firefliesId: string, callId: string, deps: Deps = serviceDeps()) {
  const call = await deps.calls.get(callId)
  if (!call) throw new Error('Call niet gevonden.')
  await processTranscript(call.id, await getTranscript(firefliesId), deps)
}

export async function processTranscript(callId: string, t: FirefliesTranscript, deps: Deps) {
  let call = (await deps.calls.get(callId))!
  const lead = await deps.leads.get(call.lead_id)
  if (!lead) throw new Error('Lead van deze call bestaat niet meer.')
  await upsertTranscript({ fireflies_id: t.id, call_id: call.id, title: t.title, meeting_link: t.meetingLink, started_at: t.date, attendees: t.participants, status: 'gekoppeld' })

  // 1. In de Drive: Sales / Sales calls / Fireflies.
  let driveUrl: string | null = null
  try {
    const folder = await ensureDrivePath(CONTACT_EMAIL, TRANSCRIPT_FOLDER)
    const name = `${isoDay(new Date(call.starts_at))} ${CALL_KIND_LABELS[call.kind]} – ${lead.company ?? lead.name}`
    const header = `${CALL_KIND_LABELS[call.kind]} met ${lead.name}${lead.company ? ` (${lead.company})` : ''}\n${fmtDate(call.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${t.firefliesUrl ? `\nFireflies: ${t.firefliesUrl}` : ''}\n\n`
    driveUrl = await createDocInFolder(CONTACT_EMAIL, folder, name, header + t.text)
  } catch (e) {
    await upsertTranscript({ fireflies_id: t.id, error: `Drive: ${e instanceof Error ? e.message : String(e)}` })
  }
  await deps.calls.update(call.id, { fireflies_id: t.id, transcript_url: driveUrl ?? t.firefliesUrl, transcript_received_at: new Date().toISOString() })
  await upsertTranscript({ fireflies_id: t.id, drive_url: driveUrl })

  // 2. Setter-opname: de tijdelijke publieke link weer intrekken.
  if (call.recording_file_id && call.recording_public_permission) {
    await removeFilePermission(CONTACT_EMAIL, call.recording_file_id, call.recording_public_permission).catch(() => undefined)
    await deps.calls.update(call.id, { recording_public_permission: null })
  }

  // 3. Er is een transcript, dus de call vond plaats: afronden als dat vergeten werd (maakt ook de bedankmail).
  if (call.status === 'gepland') await finishCall(deps, call.id, 'afgerond', null, 'fireflies')
  call = (await deps.calls.get(call.id))!

  // 4. AI-taak: lead bijwerken, bedankmail persoonlijker, analyse.
  if (!t.text.trim() || !isAiConfigured()) return
  const freshLead = (await deps.leads.get(lead.id))!
  let bedankmail: CallVerwerkenInput['bedankmail'] = null
  if (call.kind === 'sales' && call.thank_you_draft_id) {
    const d = await deps.drafts.get(call.thank_you_draft_id)
    if (d && d.status === 'concept' && d.body === d.original_body) bedankmail = { draft_id: d.id, body: d.body }
  }
  const input: CallVerwerkenInput = {
    ref: `call:${call.id}:${t.id}`,
    call: { id: call.id, soort: call.kind, start: call.starts_at, dag: isoDay(new Date(call.starts_at)), weekdag: fmtDate(call.starts_at, { weekday: 'long' }) },
    lead: {
      id: freshLead.id,
      name: freshLead.name,
      email: freshLead.email,
      notes: freshLead.notes,
      next_action: freshLead.next_action,
      follow_up_on: freshLead.follow_up_on,
      stage: freshLead.stage,
      phone: freshLead.phone,
      company: freshLead.company,
    },
    transcript: t.text.slice(0, 80_000),
    bedankmail,
  }
  const job = await enqueue('call_verwerken', input.ref, input as unknown as Record<string, unknown>, 'fireflies')
  if (aiEngine() === 'grokbot') await notifyGrok([job.id])
  else if (aiEngine() === 'api') await runJob(job.id)
}
