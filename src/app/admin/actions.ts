'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireSales } from '@/lib/admin/session'
import { createServerSupabase } from '@/lib/admin/supabase/server'
import { isSupabaseConfigured, SALES_EMAIL } from '@/lib/admin/env'
import { getThread, sendReply } from '@/lib/admin/gmail'
import { dismissJob, getJob, runJob } from '@/lib/admin/ai/jobs'
import {
  LOST_REASONS,
  SOURCES,
  STAGES,
  type LeadInput,
  type LostReason,
  type Source,
  type Stage,
} from '@/lib/admin/sales/types'

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

function str(form: FormData, key: string) {
  const v = form.get(key)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

function followUpInput(form: FormData) {
  const date = str(form, 'follow_up_on')
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Kies een geldige datum.')
  return { next_action: str(form, 'next_action'), follow_up_on: date, notes: str(form, 'notes') }
}

function leadInput(form: FormData): LeadInput {
  const name = str(form, 'name')
  if (!name) throw new Error('Naam is verplicht.')
  const email = str(form, 'email')?.toLowerCase() ?? null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Dat e-mailadres klopt niet.')
  const source = str(form, 'source') as Source | null
  return {
    name,
    company: str(form, 'company'),
    email,
    phone: str(form, 'phone'),
    source: source && SOURCES.includes(source) ? source : 'other',
  }
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase()
    await supabase.auth.signOut()
  }
  redirect('/admin/login')
}

export async function createLeadAction(form: FormData) {
  const { leads } = await requireSales()
  let id: string
  try {
    id = (await leads.create(leadInput(form))).id
  } catch (e) {
    redirect(`/admin/sales?nieuw=1&fout=${encodeURIComponent(e instanceof Error ? e.message : 'Er ging iets mis.')}`)
  }
  revalidatePath('/admin/sales')
  redirect(`/admin/sales/leads/${id}`)
}

export async function updateLeadAction(id: string, form: FormData) {
  return attempt(async () => {
    const { leads } = await requireSales()
    await leads.update(id, { ...leadInput(form), ...followUpInput(form) })
    revalidatePath('/admin/sales')
  })
}

/** Tijdelijk manueel; wordt automatisch zodra boekingen en calls gekoppeld zijn. */
export async function setStageAction(id: string, form: FormData) {
  return attempt(async () => {
    const { leads } = await requireSales()
    const stage = str(form, 'stage') as Stage | null
    if (!stage || !STAGES.includes(stage) || stage === 'lost') throw new Error('Kies een fase.')
    await leads.setStage(id, stage)
    revalidatePath('/admin/sales')
  })
}

export async function markLostAction(id: string, form: FormData) {
  return attempt(async () => {
    const { leads } = await requireSales()
    const reason = str(form, 'reason') as LostReason | null
    if (!reason || !LOST_REASONS.includes(reason)) throw new Error('Kies een reden.')
    await leads.markLost(id, reason, str(form, 'note'))
    revalidatePath('/admin/sales')
  })
}

/** Verstuurt het (aangepaste) antwoord vanuit Casper's Gmail, in dezelfde thread. */
export async function sendInboxReplyAction(threadId: string, form: FormData) {
  return attempt(async () => {
    await requireSales()
    const body = str(form, 'body')
    if (!body) throw new Error('Het antwoord is leeg.')
    const thread = await getThread(SALES_EMAIL, threadId)
    const last = [...thread.mails].reverse().find((m) => m.fromEmail !== SALES_EMAIL)
    if (!last) throw new Error('Geen mail van de lead gevonden in deze thread.')
    await sendReply(SALES_EMAIL, {
      threadId,
      to: last.fromEmail,
      subject: last.subject,
      inReplyTo: last.messageId,
      references: last.references,
      body,
    })
    revalidatePath('/admin/sales/inbox')
  })
}

export async function retryAiJobAction(jobId: string) {
  return attempt(async () => {
    await requireSales()
    await runJob(jobId)
    revalidatePath('/admin/sales/inbox')
  })
}

/** Status van een AI-taak opvragen (de inbox wacht hierop, zonder Gmail opnieuw te bevragen). */
export async function getAiJobAction(jobId: string) {
  await requireSales()
  const job = await getJob(jobId)
  if (!job) return null
  return { id: job.id, status: job.status, error: job.error, output: job.output }
}

/** Inbox: deze mail heeft geen antwoord nodig. Een nieuwe mail in de thread verschijnt wel opnieuw. */
export async function dismissInboxAction(jobId: string) {
  return attempt(async () => {
    await requireSales()
    await dismissJob(jobId)
  })
}

/** Geen lead (bv. een freelancer): verwijderen zonder lost te zetten; de inbox negeert het adres voortaan. */
export async function removeNotALeadAction(id: string) {
  return attempt(async () => {
    const { leads } = await requireSales()
    await leads.removeNotALead(id)
    revalidatePath('/admin/sales')
  })
}

export async function removeNotALeadAndBackAction(id: string) {
  const { leads } = await requireSales()
  await leads.removeNotALead(id)
  revalidatePath('/admin/sales')
  redirect('/admin/sales')
}
