import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'

export const metadata: Metadata = {
  title: 'Privacybeleid — IKnowRight',
  description: 'Hoe IKnowRight omgaat met je persoonsgegevens.',
}

export default function PrivacyPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <section style={{ paddingTop: 80 }}>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: 'clamp(2.5rem, 8vw, 120px) clamp(1rem, 6.8vw, 98px)',
          }}
        >
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(2rem, 4vw, 56px)',
              textTransform: 'uppercase',
              color: ikr.navy,
              marginBottom: 'clamp(1.5rem, 3vw, 32px)',
            }}
          >
            Privacybeleid
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              IKnowRight verwerkt persoonsgegevens die je via onze website invult (contact- en pricingformulieren).
            </p>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              <strong>Welke gegevens:</strong> naam, e-mailadres, telefoonnummer en eventueel bericht of bedrijfsnaam.
            </p>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              <strong>Waarvoor:</strong> om je te antwoorden, tarieven te mailen, sollicitaties of creator-aanvragen op
              te volgen, en onze dienstverlening te verbeteren.
            </p>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              <strong>Verwerkers:</strong> e-mailverzending via Resend. Captcha via Cloudflare Turnstile (spam
              preventie).
            </p>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              <strong>Bewaartermijn:</strong> zolang nodig voor opvolging, maximaal 2 jaar na laatste contact, tenzij
              wettelijk anders vereist.
            </p>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              <strong>Jouw rechten:</strong> inzage, correctie of verwijdering — mail naar{' '}
              <a href="mailto:contact@iknowright.be" style={{ color: ikr.navy }}>
                contact@iknowright.be
              </a>
              .
            </p>
            <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText }}>
              <Link href="/pricing" style={{ color: ikr.navy, fontWeight: 700 }}>
                ← Terug naar pricing
              </Link>
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
