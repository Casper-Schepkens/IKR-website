import 'server-only'
import { after } from 'next/server'
import { SALES_EMAIL } from '../env'
import { getThread } from '../gmail'
import { aiEngine, enqueue, isAiConfigured, runJob } from '../ai/jobs'
import { notifyGrok } from '../ai/notify'
import { fmtDate, isoDay } from '../format'
import { createServiceSupabase } from '../supabase/server'
import type { AfterSendInput } from './after-send-apply'

/** Verstuurd concept: de rest (lead, thread, tekst) wordt na het versturen uit mail_drafts gelezen. */
export type SentDraft = { draftId: string; by: string }

export type SentMail = {
  /** Uniek per verzending (bv. draft:<id> of inbox:<thread>:<tijd>). */
  ref: string
  leadId?: string | null
  leadEmail?: string | null
  threadId?: string | null
  from: string
  to: string
  subject: string
  body: string
  by: string
  /** Velden die het concept zelf vastlegde: de AI past ze niet meer aan. */
  keep?: ('volgende_actie' | 'opvolgen_op')[]
}

/**
 * Na een geslaagde verzending vanuit het dashboard: een "na_verzending"-taak aanmaken die de mail
 * analyseert en de lead bijwerkt. Loopt volledig na het antwoord (after) en binnen try/catch:
 * het versturen wacht hier nooit op en kan er nooit door mislukken.
 */
export function scheduleAfterSend(mail: SentMail | SentDraft) {
  const sentAt = new Date()
  try {
    after(async () => {
      try {
        const m = 'draftId' in mail ? await draftMail(mail) : mail
        if (m) await createAfterSendJob(m, sentAt)
      } catch (e) {
        console.error('[na_verzending] taak aanmaken mislukt (mail is wel verstuurd)', e)
      }
    })
  } catch (e) {
    // after() buiten een request (bv. in een test): niets doen.
    console.error('[na_verzending] niet ingepland', e)
  }
}

async function draftMail({ draftId, by }: SentDraft): Promise<SentMail | null> {
  const { data: d } = await createServiceSupabase()
    .from('mail_drafts')
    .select('id, lead_id, thread_id, from_email, to_email, subject, body, is_html, status, follow_up_action, follow_up_on')
    .eq('id', draftId)
    .maybeSingle()
  if (!d || d.status !== 'verstuurd') return null
  const body = d.is_html ? String(d.body).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') : String(d.body)
  const keep: SentMail['keep'] = []
  if (d.follow_up_action) keep.push('volgende_actie')
  if (d.follow_up_on) keep.push('opvolgen_op')
  return { ref: `draft:${d.id}`, leadId: d.lead_id, threadId: d.thread_id, from: d.from_email, to: d.to_email, subject: d.subject, body, by, keep }
}

const COLUMNS = 'id, name, email, notes, next_action, follow_up_on, stage, phone, company'

export async function createAfterSendJob(mail: SentMail, sentAt = new Date()) {
  if (!isAiConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const db = createServiceSupabase()
  const q = db.from('leads').select(COLUMNS)
  const { data: lead } = mail.leadId
    ? await q.eq('id', mail.leadId).maybeSingle()
    : mail.leadEmail
      ? await q.ilike('email', mail.leadEmail.replace(/[%_\\]/g, '\\$&')).maybeSingle()
      : { data: null }
  if (!lead) return null // geen gekoppelde lead: niets bij te werken

  // Recente thread (zonder de net verstuurde mail, die gaat apart mee). Lukt Gmail niet: zonder thread.
  let thread: AfterSendInput['thread'] = []
  let subject = mail.subject
  if (mail.threadId && mail.from === SALES_EMAIL) {
    try {
      const t = await getThread(SALES_EMAIL, mail.threadId)
      const lastSubject = t.mails.at(-1)?.subject ?? ''
      if (!subject && lastSubject) subject = /^re:/i.test(lastSubject) ? lastSubject : `Re: ${lastSubject}`
      thread = t.mails
        .filter((m) => new Date(m.date) < new Date(sentAt.getTime() - 5000))
        .slice(-6)
        .map((m) => ({ from: m.fromEmail, date: m.date, text: m.text.slice(0, 3000), fromCasper: m.fromEmail === SALES_EMAIL }))
    } catch {
      thread = []
    }
  }

  const input: AfterSendInput = {
    ref: mail.ref,
    lead,
    sent: {
      at: sentAt.toISOString(),
      day: isoDay(sentAt),
      weekday: fmtDate(sentAt, { weekday: 'long' }),
      from: mail.from,
      to: mail.to,
      subject,
      body: mail.body.slice(0, 8000),
    },
    thread,
    ...(mail.keep?.length ? { keep: mail.keep } : {}),
  }
  const job = await enqueue('na_verzending', mail.ref, input as unknown as Record<string, unknown>, mail.by)
  if (aiEngine() === 'grokbot') await notifyGrok([job.id])
  else if (aiEngine() === 'api') await runJob(job.id)
  return job
}
