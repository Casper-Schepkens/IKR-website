import { Navbar } from '@/components/ikr/Navbar'
import { CasesPageContent } from '@/components/ikr/CasesPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Cases',
  'Bekijk onze cases: TikTok-content voor food brands waar we trots op zijn.',
  '/cases',
)

export default function CasesPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <CasesPageContent />
      <SiteFooter />
    </main>
  )
}
