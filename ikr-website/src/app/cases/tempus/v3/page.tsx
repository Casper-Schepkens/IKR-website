import type { Metadata } from 'next'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { TempusCaseC } from '@/components/ikr/tempus/TempusCaseC'

export const metadata: Metadata = {
  title: 'Tempus v3 — Case — IKnowRight',
  description: 'Layout-preview C: drie-kolommen case study Tempus.',
}

export default function TempusCaseV3Page() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <TempusCaseC />
      <SiteFooter />
    </main>
  )
}
