import { Navbar } from '@/components/ikr/Navbar'
import { HeroSection } from '@/components/ikr/HeroSection'
import { CarouselSection } from '@/components/ikr/CarouselSection'
import { BrandStrip } from '@/components/ikr/BrandStrip'
import { StatsSection } from '@/components/ikr/StatsSection'
import { TeamSection } from '@/components/ikr/TeamSection'
import { ProcessSection } from '@/components/ikr/ProcessSection'
import { CasesSection } from '@/components/ikr/CasesSection'
import { WhyTikTokSection } from '@/components/ikr/WhyTikTokSection'
import { ReviewsSection } from '@/components/ikr/ReviewsSection'
import { CTASection } from '@/components/ikr/CTASection'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export default function HomePage() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <HeroSection />
      <CarouselSection />
      <BrandStrip />
      <div className="flex flex-col">
        <StatsSection />
        <div className="order-1 lg:order-4">
          <CasesSection />
        </div>
        <div className="order-2">
          <ProcessSection />
        </div>
        <div className="order-3">
          <WhyTikTokSection />
        </div>
        <div className="order-4 lg:order-1">
          <TeamSection />
        </div>
      </div>
      <ReviewsSection />
      <CTASection />
      <SiteFooter />
    </main>
  )
}
