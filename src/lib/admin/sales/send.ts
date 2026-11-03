import 'server-only'
import { SALES_EMAIL } from '../env'
import { getThread, sendReply } from '../gmail'

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
