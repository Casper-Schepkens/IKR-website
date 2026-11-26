import 'server-only'
import { Resend } from 'resend'
import { getResendNotifyFrom } from '@/lib/resend-mail'

/**
 * Mails rond een boeking, via dezelfde Resend-koppeling als de formulieren (/contact, /pricing).
 * Bevestiging naar de lead: met de naam van het teamlid als afzender en zijn adres als reply-to, zodat
 * een antwoord rechtstreeks bij hem terechtkomt.
 */

export type OutgoingMail = { from: string; to: string; replyTo?: string; subject: string; text: string; html: string }
export type Mailer = (m: OutgoingMail) => Promise<void>

export const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Platte tekst → eenvoudige HTML (alinea's, regeleindes, klikbare https-links). */
export function textToHtml(text: string) {
  const linkify = (s: string) => s.replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`)
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${linkify(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Afzenderadres (zonder naam): IKR_BOOKING_FROM_EMAIL, anders het adres van de formuliermeldingen. */
function fromAddress() {
  const raw = process.env.IKR_BOOKING_FROM_EMAIL ?? getResendNotifyFrom()
  return /<([^>]+)>/.exec(raw)?.[1] ?? raw
}

/** "Cédric van IKnowRight <forms@iknowright.be>" (aanhalingstekens weg, zodat de header geldig blijft). */
export const personalFrom = (name: string) => `${name.replace(/["<>]/g, '')} van IKnowRight <${fromAddress()}>`
export const notifyFrom = () => getResendNotifyFrom()

export const resendMailer: Mailer = async (m) => {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY ontbreekt: mail niet verstuurd.')
  const r = await new Resend(key).emails.send({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, html: m.html })
  if (r.error) throw new Error(`Mail niet verstuurd: ${r.error.message}`)
}
