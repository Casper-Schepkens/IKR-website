import { Navbar } from '@/components/ikr/Navbar'
import { PricingPageContent } from '@/components/ikr/PricingPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Prijzen',
  'Vraag onze tarieven vrijblijvend aan en ontvang onze prijs-PDF in je inbox.',
  '/pricing',
)

export default function PricingPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <PricingPageContent />
      <SiteFooter />
    </main>
  )
}
