import type { Metadata } from 'next'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { TempusCaseB } from '@/components/ikr/tempus/TempusCaseB'

export const metadata: Metadata = {
  title: 'Tempus v2 — Case — IKnowRight',
  description: 'Layout-preview B: split-screen case study Tempus.',
}

export default function TempusCaseV2Page() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <TempusCaseB />
      <SiteFooter />
    </main>
  )
}
