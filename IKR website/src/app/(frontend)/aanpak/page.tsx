import { Navbar } from '@/components/ikr/Navbar'
import { AanpakPageContent } from '@/components/ikr/AanpakPageContent'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export default function AanpakPage() {
  return (
    <main style={{ backgroundColor: '#F0EBE0' }}>
      <Navbar />
      <AanpakPageContent />
      <SiteFooter />
    </main>
  )
}
