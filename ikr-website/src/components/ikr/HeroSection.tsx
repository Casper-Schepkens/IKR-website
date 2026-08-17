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
    <section
      ref={ref}
      style={{
        backgroundColor: 'var(--ikr-cream)',
      }}
    >
      <div
        className="flex flex-col lg:hidden"
        style={{
          paddingTop: 'calc(88px + env(safe-area-inset-top, 0px))',
          paddingBottom: 20,
          paddingLeft: 20,
          paddingRight: 20,
          textAlign: 'center',
        }}
      >
        <div
          className="hero-line2 font-display font-black uppercase"
          style={{
            fontSize: 'clamp(2.6rem, 14vw, 56px)',
            lineHeight: 0.85,
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy-text)',
          }}
        >
          IKNOWRIGHT
        </div>
        <p
          className="hero-sub"
          style={{
            marginTop: 12,
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.35,
            letterSpacing: '-0.02em',
            color: 'var(--ikr-navy-text)',
          }}
        >
          TikTok-content waar food brands klanten mee winnen.
        </p>
      </div>

      <div
        className="hidden lg:block"
        style={{
          paddingTop: 'clamp(110px, 13.2vw, 190px)',
          paddingBottom: 'clamp(48px, 8.3vw, 120px)',
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            paddingLeft: 'clamp(1.25rem, 14.17vw, 204px)',
            paddingRight: 'clamp(1.25rem, 14.17vw, 204px)',
            textAlign: 'center',
          }}
        >
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
          <div
            className="hero-line2 font-display font-black uppercase"
            style={{
              fontSize: 'clamp(2.75rem, 13vw, 187px)',
              lineHeight: 0.79,
              letterSpacing: '-0.04em',
              color: 'var(--ikr-navy-text)',
            }}
          >
            IKNOWRIGHT
          </div>
          <p
            className="hero-sub"
            style={{
              marginTop: 'clamp(20px, 3.3vw, 48px)',
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(1rem, 2.78vw, 40px)',
              lineHeight: 1.25,
              letterSpacing: '-0.04em',
              color: 'var(--ikr-navy-text)',
            }}
          >
            Met content waar je klanten honger van krijgen
          </p>
        </div>
      </div>
    </section>
  )
}
