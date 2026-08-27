import Link from 'next/link'
import { LegalPageLayout, LegalParagraph } from '@/components/ikr/LegalPageLayout'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Privacybeleid',
  'Hoe IKnowRight omgaat met je persoonsgegevens.',
  '/privacy',
)

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacybeleid">
      <LegalParagraph>
        IKnowRight verwerkt persoonsgegevens die je via onze website invult (contact- en
        pricingformulieren).
      </LegalParagraph>
      <LegalParagraph>
        <strong>Welke gegevens:</strong> naam, e-mailadres, telefoonnummer en eventueel bericht,
        bedrijfsnaam, type contact (bedrijf, creator, sollicitatie) en gekozen onderwerp.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Waarvoor:</strong> om je te antwoorden, tarieven te mailen, sollicitaties of
        creator-aanvragen op te volgen, en onze dienstverlening te verbeteren.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Verwerkers:</strong> e-mailverzending via Resend. Captcha via Cloudflare Turnstile
        (spampreventie). Zie ook ons{' '}
        <Link href="/cookies" style={{ color: 'var(--ikr-navy)', fontWeight: 700 }}>
          cookiebeleid
        </Link>
        .
      </LegalParagraph>
      <LegalParagraph>
        <strong>Bewaartermijn:</strong> zolang nodig voor opvolging, maximaal 2 jaar na laatste
        contact, tenzij wettelijk anders vereist.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Jouw rechten:</strong> inzage, correctie of verwijdering — mail naar{' '}
        <a href="mailto:contact@iknowright.be">contact@iknowright.be</a>. Bedrijfsgegevens:{' '}
        <Link href="/legal" style={{ color: 'var(--ikr-navy)', fontWeight: 700 }}>
          /legal
        </Link>
        .
      </LegalParagraph>
      <LegalParagraph>
        <Link href="/pricing" style={{ color: 'var(--ikr-navy)', fontWeight: 700 }}>
          ← Terug naar prijzen
        </Link>
      </LegalParagraph>
    </LegalPageLayout>
  )
}
