'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export function HeroSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-line1', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.from('.hero-line2', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.1,
      })
      gsap.from('.hero-sub', {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.35,
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} style={{ backgroundColor: 'var(--ikr-cream)', paddingTop: 190, paddingBottom: 120 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', paddingLeft: 204, paddingRight: 204, textAlign: 'center' }}>

        {/* Regel 1 — 69px, vult 1033px breedte */}
        <div
          className="hero-line1 font-display font-black uppercase"
          style={{
            fontSize: 'clamp(1.5rem, 4.79vw, 69px)',
            lineHeight: 0.79,
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy-text)',
          }}
        >
          GEEF JE CONTENT UIT HANDEN WANT
        </div>

        {/* Regel 2 — IKNOWRIGHT, ~187px, vult dezelfde 1033px breedte */}
        <div
          className="hero-line2 font-display font-black uppercase"
          style={{
            fontSize: 'clamp(3rem, 13vw, 187px)',
            lineHeight: 0.79,
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy-text)',
          }}
        >
          IKNOWRIGHT
        </div>

        {/* Subtitel */}
        <p
          className="hero-sub"
          style={{
            marginTop: 48,
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 400,
            fontSize: 'clamp(1rem, 2.78vw, 40px)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy-text)',
          }}
        >
          Met content waar je klanten honger van krijgen
        </p>

      </div>
    </section>
  )
}
