import type { Metadata } from 'next'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { TempusCaseA } from '@/components/ikr/tempus/TempusCaseA'

export const metadata: Metadata = {
  title: 'Tempus — Case — IKnowRight',
  description: 'Case study: hoe IKnowRight Tempus hielp met TikTok-content voor HR-marketing.',
}

export default function TempusCasePage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <TempusCaseA />
      <SiteFooter />
    </main>
  )
}
