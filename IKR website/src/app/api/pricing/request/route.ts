import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { PricingRequestPayload } from '@/lib/pricing-types'
import { verifyTurnstileToken } from '@/lib/turnstile'

const PDF_FILENAME = 'IKnowRight-tarieven.pdf'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getPdfPath(): string {
  return path.join(process.cwd(), 'public', 'documents', 'ikr-tarieven.pdf')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PricingRequestPayload

    if (body.website) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (body.role !== 'bedrijf') {
      return NextResponse.json({ error: 'Alleen bedrijfsaanvragen kunnen tarieven ontvangen.' }, { status: 400 })
    }

    const firstName = body.firstName?.trim()
    const lastName = body.lastName?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim()

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json({ error: 'Vul alle velden in.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
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

    let pdfBuffer: Buffer
    try {
      pdfBuffer = await readFile(getPdfPath())
    } catch {
      console.error('Pricing PDF not found at public/documents/ikr-tarieven.pdf')
      return NextResponse.json(
        { error: 'Tarieven-PDF niet gevonden. Neem contact op via contact@iknowright.be.' },
        { status: 503 },
      )
    }

    const resend = new Resend(apiKey)
    const fullName = `${firstName} ${lastName}`

    const [userResult, notifyResult] = await Promise.all([
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Jouw IKnowRight tarieven',
        html: `
          <p>Hoi ${firstName},</p>
          <p>Bedankt voor je interesse in IKnowRight. In bijlage vind je onze tarieven.</p>
          <p>Heb je vragen of wil je een call inplannen? Antwoord op deze mail of neem contact op via <a href="mailto:contact@iknowright.be">contact@iknowright.be</a>.</p>
          <p>Groeten,<br/>Het IKnowRight team</p>
        `,
        attachments: [
          {
            filename: PDF_FILENAME,
            content: pdfBuffer,
          },
        ],
      }),
      resend.emails.send({
        from: fromEmail,
        to: notifyEmail,
        subject: `Nieuwe tarieven-aanvraag — ${fullName}`,
        html: `
          <p><strong>Nieuwe tarieven-aanvraag via /pricing</strong></p>
          <ul>
            <li>Naam: ${fullName}</li>
            <li>E-mail: ${email}</li>
            <li>Telefoon: ${phone}</li>
            <li>Type: Bedrijf</li>
          </ul>
        `,
      }),
    ])

    if (userResult.error || notifyResult.error) {
      console.error('Resend error:', userResult.error ?? notifyResult.error)
      return NextResponse.json({ error: 'Verzenden mislukt. Probeer later opnieuw.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Pricing request error:', error)
    return NextResponse.json({ error: 'Er ging iets mis. Probeer later opnieuw.' }, { status: 500 })
  }
}
