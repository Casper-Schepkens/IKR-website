import { LegalPageLayout, LegalParagraph } from '@/components/ikr/LegalPageLayout'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Algemene voorwaarden',
  'Algemene voorwaarden voor diensten van IKnowRight.',
  '/algemene-voorwaarden',
)

export default function TermsPage() {
  return (
    <LegalPageLayout title="Algemene voorwaarden">
      <LegalParagraph>
        Deze voorwaarden gelden voor diensten aangeboden door IKnowRight (TikTok marketing,
        contentcreatie, advertising en gerelateerde diensten), tenzij schriftelijk anders
        overeengekomen in een offerte of overeenkomst.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Offertes en samenwerking:</strong> prijzen en scope staan in onze tarieven-PDF en
        offerte op maat. Een opdracht start na schriftelijke bevestiging (e-mail of ondertekende
        offerte).
      </LegalParagraph>
      <LegalParagraph>
        <strong>Betaling:</strong> facturatie volgens afspraken in de offerte. Bij late betaling kan
        wettelijke interest en invorderingskosten worden aangerekend conform Belgisch recht.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Intellectuele eigendom:</strong> tenzij anders vermeld, blijven concepten en
        werkvoorstellen eigendom van IKnowRight tot volledige betaling. Gebruiksrechten op
        geleverde content worden overgedragen zoals beschreven in de offerte.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Aansprakelijkheid:</strong> IKnowRight levert professionele inspanningen maar
        garandeert geen specifieke virale resultaten of omzet. Onze aansprakelijkheid is beperkt tot
        het bedrag van de betreffende opdracht, behalve bij opzet of grove nalatigheid.
      </LegalParagraph>
      <LegalParagraph>
        <strong>Toepasselijk recht:</strong> op deze voorwaarden is Belgisch recht van toepassing.
        Geschillen worden voorgelegd aan de bevoegde rechtbanken in België.
      </LegalParagraph>
      <LegalParagraph>
        Vragen? Mail naar{' '}
        <a href="mailto:contact@iknowright.be">contact@iknowright.be</a>.
      </LegalParagraph>
    </LegalPageLayout>
  )
}
