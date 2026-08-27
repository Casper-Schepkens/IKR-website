import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { TempusCaseA } from '@/components/ikr/tempus/TempusCaseA'
import { caseDetailTempus } from '@/data/cases'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Tempus',
  caseDetailTempus.outcomeLine ??
    'Case study: hoe IKnowRight Tempus hielp met TikTok-content voor HR-marketing.',
  '/cases/tempus',
)

export default function TempusCasePage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <TempusCaseA />
      <SiteFooter />
    </main>
  )
}
