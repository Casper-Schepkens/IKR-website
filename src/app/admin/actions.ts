'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireSales } from '@/lib/admin/session'
import { createServerSupabase } from '@/lib/admin/supabase/server'
import { isSupabaseConfigured } from '@/lib/admin/env'
import { sendDraft, sendInboxReply } from '@/lib/admin/sales/send'
import { aiEngine, dismissJob, enqueue, getJob, isAiConfigured, runJob } from '@/lib/admin/ai/jobs'
import { notifyGrok } from '@/lib/admin/ai/notify'
import { recordFeedback, saveProfile, STYLE_KEYS, type StyleKey } from '@/lib/admin/ai/style-profile'
import { enqueueStyleRebuild } from '@/lib/admin/ai/style'
import { after } from 'next/server'
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
    const body = str(form, 'body') ?? ''
    await sendInboxReply(threadId, body)
    // Leren: het AI-voorstel tegenover wat Casper echt verstuurde.
    const jobId = str(form, 'job_id')
    if (jobId) {
      const job = await getJob(jobId)
      const draft = (job?.output as { draft?: string } | null)?.draft
      await recordFeedback('casper', draft, body)
    }
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

// ─── Mailconcepten: enkel Casper verstuurt, via deze knop ───────────────

export async function updateDraftAction(id: string, form: FormData) {
  return attempt(async () => {
    const { drafts } = await requireSales()
    const to = str(form, 'to')?.toLowerCase()
    const subject = str(form, 'subject')
    const body = str(form, 'body')
    const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    if (!to || !isEmail(to)) throw new Error('Vul een geldig e-mailadres in bij "Aan".')
    const cc = (str(form, 'cc') ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (cc.some((e) => !isEmail(e))) throw new Error('Een adres bij "Cc" klopt niet.')
    if (!subject || !body) throw new Error('Onderwerp en tekst zijn verplicht.')
    const ok = await drafts.update(id, { to_email: to, cc, subject, body })
    if (!ok) throw new Error('Dit concept kan niet meer aangepast worden.')
    revalidatePath('/admin/sales', 'layout')
  })
}

export async function sendDraftAction(id: string) {
  return attempt(async () => {
    const { drafts, user } = await requireSales()
    await sendDraft(drafts, id, user.email)
    revalidatePath('/admin/sales', 'layout')
  })
}

export async function deleteDraftAction(id: string) {
  return attempt(async () => {
    const { drafts } = await requireSales()
    if (!(await drafts.remove(id))) throw new Error('Dit concept kan niet verwijderd worden.')
    revalidatePath('/admin/sales', 'layout')
  })
}

/**
 * Herschrijven: de mail met Caspers uitleg naar de AI (Grokbot of API). Het resultaat komt in hetzelfde
 * concept of voorstel terecht; er wordt niets verstuurd.
 */
export async function requestRewriteAction(target: 'draft' | 'inbox', targetId: string, leadId: string, form: FormData) {
  try {
    const { leads, user } = await requireSales()
    const instruction = str(form, 'instruction')
    const body = str(form, 'body')
    if (!instruction) throw new Error('Leg kort uit hoe de mail herschreven moet worden.')
    if (!body) throw new Error('De mail is leeg.')
    if (!isAiConfigured()) throw new Error('Er is geen AI ingesteld (IKR_AI_ENGINE of ANTHROPIC_API_KEY).')
    const lead = await leads.get(leadId)
    const job = await enqueue(
      'mail_rewrite',
      `rewrite:${targetId}:${Date.now()}`,
      {
        target,
        targetId,
        instruction,
        subject: str(form, 'subject'),
        body,
        context: str(form, 'context'),
        from: str(form, 'from') ?? 'casper@iknowright.be',
        lead: lead ? { name: lead.name, company: lead.company, notes: lead.notes } : null,
      },
      user.email,
    )
    if (aiEngine() === 'grokbot') after(() => notifyGrok([job.id]))
    else if (aiEngine() === 'api') after(() => runJob(job.id))
    return { ok: true as const, data: job.id }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Herschrijven mislukt.' }
  }
}

// ─── Schrijfstijl (Instellingen) ───────────────────────────────────────

export async function saveStyleAction(key: StyleKey, form: FormData) {
  return attempt(async () => {
    const { user } = await requireSales()
    if (!STYLE_KEYS.includes(key)) throw new Error('Onbekend profiel.')
    const guide = str(form, 'guide')
    if (!guide) throw new Error('De gids mag niet leeg zijn.')
    await saveProfile(key, { guide }, user.email)
    revalidatePath('/admin/instellingen')
  })
}

export async function rebuildStyleAction(key: StyleKey) {
  try {
    const { user } = await requireSales()
    if (!STYLE_KEYS.includes(key)) throw new Error('Onbekend profiel.')
    if (!isAiConfigured()) throw new Error('Er is geen AI ingesteld (IKR_AI_ENGINE of ANTHROPIC_API_KEY).')
    const r = await enqueueStyleRebuild(key, user.email)
    return { ok: true as const, data: r }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Bijwerken mislukt.' }
  }
}
