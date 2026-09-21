import { Suspense } from 'react'
import { Navbar } from '@/components/ikr/Navbar'
import { ContactPageContent } from '@/components/ikr/ContactPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Contact',
  'Neem contact op met IKnowRight. Stuur een mail, bel of vul ons formulier in.',
  '/contact',
)

export default function ContactPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <Suspense fallback={null}>
        <ContactPageContent />
      </Suspense>
      <SiteFooter />
    </main>
  )
}
