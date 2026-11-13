import 'server-only'
import { SALES_EMAIL } from '../env'
import { getThread, sendMail, sendReply } from '../gmail'
import { hasScopes, listConnections, SCOPES } from '../google'
import type { DraftsRepo } from './drafts'
import { recordFeedback, styleKeyFor } from '../ai/style-profile'

/** Antwoord in dezelfde thread naar de laatste afzender die niet Casper is, vanaf casper@. */
export async function sendInboxReply(threadId: string, body: string) {
  if (!body.trim()) throw new Error('Het antwoord is leeg.')
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
  return last.fromEmail
}

/**
 * Verstuurt een mailconcept. ENKEL aangeroepen vanuit een knop in het dashboard (server action,
 * ingelogd als Casper); de MCP-server heeft geen enkele tool die dit aanroept.
 */
export async function sendDraft(drafts: DraftsRepo, id: string, by: string) {
  const d = await drafts.get(id)
  if (!d) throw new Error('Concept niet gevonden.')
  if (d.status !== 'concept') throw new Error('Dit concept is al verstuurd.')
  const conn = (await listConnections()).find((c) => c.email === d.from_email)
  if (!hasScopes(conn, [SCOPES.gmailSend]))
    throw new Error(`${d.from_email} kan nog geen mails versturen: koppel het (opnieuw) in Instellingen.`)

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
  await drafts.markSent(id, by)
  // Leren: wat de bot schreef tegenover wat Casper verstuurde.
  await recordFeedback(styleKeyFor(), d.original_body, d.body)
  return d
}
