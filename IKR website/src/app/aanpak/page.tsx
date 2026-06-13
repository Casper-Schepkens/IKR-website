import { Navbar } from '@/components/ikr/Navbar'
import { AanpakPageContent } from '@/components/ikr/AanpakPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export default function AanpakPage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <AanpakPageContent />
      <SiteFooter />
    </main>
  )
}
