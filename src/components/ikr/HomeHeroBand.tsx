'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { HeroSection } from './HeroSection'
import { CarouselSection } from './CarouselSection'
import { TikTokGlyph } from './ClientLogoSticker'

/**
 * Shared positioning context for the cream hero + fan carousel.
 * TikTok marks are siblings after the carousel so they sit beside the phones
 * (not under a full-width stacking context) without padding the hero taller.
 */
export function HomeHeroBand() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-tiktok-mark', {
        scale: 0.72,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        delay: 0.35,
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} className="hero-carousel-band">
      <HeroSection />
      <CarouselSection />
      {/* After carousel in DOM so marks are not covered by the section box.
          z-index stays below phone cards (1–10) so cards win on overlap. */}
      <div className="hero-tiktok-mark hero-tiktok-mark--mobile" aria-hidden="true">
        <TikTokGlyph fillContainer fill="var(--ikr-navy)" />
      </div>
      <div className="hero-tiktok-mark hero-tiktok-mark--desktop" aria-hidden="true">
        <TikTokGlyph fillContainer fill="var(--ikr-navy)" />
      </div>
    </div>
  )
}
