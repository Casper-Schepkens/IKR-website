import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  CONTACT_TYPE_LABELS,
  MESSAGE_TOPIC_LABELS,
  type ContactRequestPayload,
  type ContactType,
  type MessageTopic,
} from '@/lib/contact-types'
import { verifyTurnstileToken } from '@/lib/turnstile'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CONTACT_TYPES: ContactType[] = ['bedrijf', 'creator', 'solliciteren']
const MESSAGE_TOPICS: MessageTopic[] = ['offerte', 'gesprek', 'vraag', 'anders']

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactRequestPayload

    if (body.website) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const voornaam = body.voornaam?.trim()
    const achternaam = body.achternaam?.trim()
    const email = body.email?.trim().toLowerCase()
    const telefoon = body.telefoon?.trim()
    const contactType = body.contactType
    const bedrijf = body.bedrijf?.trim()
    const messageTopic = body.messageTopic
    const bericht = body.bericht?.trim()

    if (!voornaam || !achternaam || !email || !telefoon || !contactType || !messageTopic) {
      return NextResponse.json({ error: 'Vul alle velden in.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
    }

    if (!CONTACT_TYPES.includes(contactType)) {
      return NextResponse.json({ error: 'Ongeldig contacttype.' }, { status: 400 })
    }

    if (!MESSAGE_TOPICS.includes(messageTopic)) {
      return NextResponse.json({ error: 'Ongeldig berichttype.' }, { status: 400 })
    }

    if (contactType === 'bedrijf' && !bedrijf) {
      return NextResponse.json({ error: 'Vul je bedrijfsnaam in.' }, { status: 400 })
    }

    if (messageTopic === 'anders' && !bericht) {
      return NextResponse.json({ error: 'Vul je bericht in.' }, { status: 400 })
    }

    if (!body.gdprConsent) {
      return NextResponse.json({ error: 'Je moet akkoord gaan met het privacybeleid.' }, { status: 400 })
    }

    if (!body.turnstileToken) {
      return NextResponse.json({ error: 'Captcha verificatie ontbreekt.' }, { status: 400 })
    }

    const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const isDevBypass =
      process.env.NODE_ENV === 'development' &&
      process.env.SKIP_TURNSTILE === 'true' &&
      body.turnstileToken === 'dev-bypass'
    const captchaOk = isDevBypass || (await verifyTurnstileToken(body.turnstileToken, remoteIp))
    if (!captchaOk) {
      return NextResponse.json({ error: 'Captcha verificatie mislukt. Probeer opnieuw.' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL
    const notifyEmail = process.env.IKR_NOTIFY_EMAIL ?? 'contact@iknowright.be'

    if (!apiKey || !fromEmail) {
      console.error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL')
      return NextResponse.json({ error: 'E-mail is tijdelijk niet beschikbaar.' }, { status: 503 })
    }

    const resend = new Resend(apiKey)
    const fullName = `${voornaam} ${achternaam}`
    const messageLabel = MESSAGE_TOPIC_LABELS[messageTopic]
    const messageDetail =
      messageTopic === 'anders' && bericht
        ? `${messageLabel}: ${bericht}`
        : messageLabel

    const result = await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      replyTo: email,
      subject: `Nieuw contactformulier — ${fullName}`,
      html: `
        <p><strong>Nieuw bericht via /contact</strong></p>
        <ul>
          <li>Naam: ${escapeHtml(fullName)}</li>
          <li>E-mail: ${escapeHtml(email)}</li>
          <li>Telefoon: ${escapeHtml(telefoon)}</li>
          <li>Type: ${escapeHtml(CONTACT_TYPE_LABELS[contactType])}</li>
          ${contactType === 'bedrijf' && bedrijf ? `<li>Bedrijf: ${escapeHtml(bedrijf)}</li>` : ''}
          <li>Bericht: ${escapeHtml(messageDetail)}</li>
        </ul>
      `,
    })

    if (result.error) {
      console.error('Resend error:', result.error)
      return NextResponse.json({ error: 'Verzenden mislukt. Probeer later opnieuw.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact request error:', error)
    return NextResponse.json({ error: 'Er ging iets mis. Probeer later opnieuw.' }, { status: 500 })
  }
}
