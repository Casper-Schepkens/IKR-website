import type { Metadata } from 'next'
import { Navbar } from '@/components/ikr/Navbar'
import { CasesPageContent } from '@/components/ikr/CasesPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export const metadata: Metadata = {
  title: 'Cases — IKnowRight',
  description: 'Bekijk onze cases — TikTok-content voor food brands waar we trots op zijn.',
}

export default function CasesPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <CasesPageContent />
      <SiteFooter />
    </main>
  )
}
