import 'server-only'
import { SALES_EMAIL } from '../env'
import { getThread, sendMail, sendReply } from '../gmail'
import { hasScopes, listConnections, SCOPES } from '../google'
import type { DraftsRepo, MailDraft } from './drafts'
import { recordFeedback, styleKeyFor } from '../ai/style-profile'

/** Threads waarvoor op deze serverinstantie net een antwoord vertrekt (tegen een dubbele klik). */
const sendingThreads = new Set<string>()

/**
 * Antwoord in dezelfde thread naar de laatste afzender die niet Casper is, vanaf casper@.
 * Weigert als Casper al na de laatste mail van de lead antwoordde (bv. een tweede klik of tabblad).
 */
export async function sendInboxReply(threadId: string, body: string) {
  if (!body.trim()) throw new Error('Het antwoord is leeg.')
  if (sendingThreads.has(threadId)) throw new Error('Dit antwoord wordt al verstuurd.')
  sendingThreads.add(threadId)
  try {
    const thread = await getThread(SALES_EMAIL, threadId)
    let lastIndex = -1
    thread.mails.forEach((m, i) => {
      if (m.fromEmail !== SALES_EMAIL) lastIndex = i
    })
    const last = thread.mails[lastIndex]
    if (!last) throw new Error('Geen mail van de lead gevonden in deze thread.')
    if (thread.mails.slice(lastIndex + 1).some((m) => m.fromEmail === SALES_EMAIL))
      throw new Error('Je antwoordde al op deze mail. Herlaad de inbox.')
    await sendReply(SALES_EMAIL, {
      threadId,
      to: last.fromEmail,
      subject: last.subject,
      inReplyTo: last.messageId,
      references: last.references,
      body,
    })
    return last.fromEmail
  } finally {
    sendingThreads.delete(threadId)
  }
}

/**
 * Verstuurt een mailconcept. ENKEL aangeroepen vanuit een knop in het dashboard (server action,
 * ingelogd als Casper); de MCP-server heeft geen enkele tool die dit aanroept.
 */
export async function sendDraft(drafts: DraftsRepo, id: string, by: string) {
  const current = await drafts.get(id)
  if (!current) throw new Error('Concept niet gevonden.')
  if (current.status !== 'concept') throw new Error('Dit concept is al verstuurd.')
  const conn = (await listConnections()).find((c) => c.email === current.from_email)
  if (!hasScopes(conn, [SCOPES.gmailSend]))
    throw new Error(`${current.from_email} kan nog geen mails versturen: koppel het (opnieuw) in Instellingen.`)

  // Eerst claimen, dan pas versturen: een tweede klik of tabblad krijgt de claim niet.
  const d = await drafts.claimSend(id, by)
  if (!d) throw new Error('Dit concept wordt al verstuurd of is al verstuurd.')
  try {
    await deliver(d)
  } catch (e) {
    // Gmail weigerde: niets vertrokken, dus Casper mag opnieuw proberen.
    await drafts.releaseSend(id).catch((err) => console.error('[versturen] claim loslaten mislukt', err))
    throw e
  }
  // Vanaf hier is de mail vertrokken: een fout hierna mag de claim niet loslaten (anders kan hij opnieuw vertrekken).
  await drafts.markSent(id, by)
  // Leren: wat de bot schreef tegenover wat Casper verstuurde.
  await recordFeedback(styleKeyFor(), d.original_body, d.body)
  return d
}

async function deliver(d: MailDraft) {
  let inReplyTo = d.in_reply_to
  let references: string | null = null
  // Antwoord in een thread van casper@ zonder Message-ID: de laatste mail van de thread opzoeken.
  if (d.thread_id && !inReplyTo && d.from_email === SALES_EMAIL) {
    const thread = await getThread(SALES_EMAIL, d.thread_id)
    const last = thread.mails[thread.mails.length - 1]
    inReplyTo = last?.messageId ?? null
    references = last?.references ?? null
  }
  await sendMail(d.from_email, {
    to: d.to_email,
    cc: d.cc,
    subject: d.subject,
    body: d.body,
    html: d.is_html,
    threadId: d.thread_id,
    inReplyTo,
    references,
  })
}
