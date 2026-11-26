import type { Metadata } from 'next'
import { Navbar } from '@/components/ikr/Navbar'
import { BookingPageContent } from '@/components/ikr/BookingPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = {
  ...pageMetadata('Plan een kennismakingscall', 'Kies zelf een moment voor een kennismakingscall met IKnowRight (online, via Google Meet).', '/boek'),
  // Een link voor leads, geen pagina om in Google te vinden.
  robots: { index: false, follow: false },
}

export default function BoekPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <BookingPageContent />
      <SiteFooter />
    </main>
  )
}
