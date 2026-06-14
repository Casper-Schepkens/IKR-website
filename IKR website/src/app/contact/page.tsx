import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Navbar } from '@/components/ikr/Navbar'
import { ContactPageContent } from '@/components/ikr/ContactPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export const metadata: Metadata = {
  title: 'Contact — IKnowRight',
  description: 'Neem contact op met IKnowRight. Stuur een mail, bel of vul ons formulier in.',
}

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
