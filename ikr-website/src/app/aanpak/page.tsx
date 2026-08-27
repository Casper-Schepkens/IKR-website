import { Navbar } from '@/components/ikr/Navbar'
import { AanpakPageContent } from '@/components/ikr/AanpakPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata(
  'Aanpak',
  'Van analyse tot content op TikTok: zo werkt IKnowRight met food brands — strategie, creatie en iteratie.',
  '/aanpak',
)

export default function AanpakPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <AanpakPageContent />
      <SiteFooter />
    </main>
  )
}
