import { LegalPageLayout, LegalParagraph } from '@/components/ikr/LegalPageLayout'
import { IKR_PHONE } from '@/data/site-contact'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Bedrijfsgegevens',
  'Juridische en contactgegevens van IKnowRight.',
  '/legal',
)

export default function LegalPage() {
  return (
    <LegalPageLayout title="Bedrijfsgegevens">
      <LegalParagraph>
        <strong>IKnowRight</strong>
        <br />
        Vondelstraat 65
        <br />
        9280 Lebbeke
        <br />
        België
      </LegalParagraph>
      <LegalParagraph>
        <strong>BTW:</strong> BE1014.718.978
        <br />
        <strong>IBAN:</strong> BE03 7310 6214 9184
        <br />
        <strong>BIC:</strong> KREDBEBB
      </LegalParagraph>
      <LegalParagraph>
        <strong>Telefoon:</strong> {IKR_PHONE}
        <br />
        <strong>E-mail:</strong>{' '}
        <a href="mailto:contact@iknowright.be">contact@iknowright.be</a>
      </LegalParagraph>
    </LegalPageLayout>
  )
}
