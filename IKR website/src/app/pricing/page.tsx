import type { Metadata } from 'next'
import { Navbar } from '@/components/ikr/Navbar'
import { PricingPageContent } from '@/components/ikr/PricingPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export const metadata: Metadata = {
  title: 'Pricing — IKnowRight',
  description: 'Vraag onze tarieven vrijblijvend aan en ontvang onze prijs-PDF in je inbox.',
}

export default function PricingPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <PricingPageContent />
      <SiteFooter />
    </main>
  )
}
