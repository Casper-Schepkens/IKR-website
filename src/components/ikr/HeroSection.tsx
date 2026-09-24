'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { TikTokGlyph } from './ClientLogoSticker'

export function HeroSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-line2', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      })
      gsap.from('.hero-sub', {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.2,
      })
      gsap.from('.hero-tiktok-mark--mobile', {
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
    <section
      ref={ref}
      className="hero-section"
      style={{
        position: 'relative',
        backgroundColor: 'var(--ikr-cream)',
        paddingTop: 'calc(88px + env(safe-area-inset-top, 0px))',
        overflow: 'visible',
      }}
    >
      <div
        className="hero-copy"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          paddingLeft: 'clamp(1.25rem, 14.17vw, 204px)',
          paddingRight: 'clamp(1.25rem, 14.17vw, 204px)',
          paddingTop: 'clamp(0px, 2.8vw, 52px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <h1>
          {/* Inline-flex so the mark sits beside the word, not under/behind the carousel. */}
          <span className="hero-title-row">
            <span
              className="hero-line2 font-display font-black uppercase"
              style={{
                display: 'block',
                fontSize: 'clamp(2.6rem, 12vw, 187px)',
                lineHeight: 0.82,
                letterSpacing: '-0.04em',
                color: 'var(--ikr-navy-text)',
              }}
            >
              IKNOWRIGHT
            </span>
            <span className="hero-tiktok-mark hero-tiktok-mark--mobile" aria-hidden="true">
              <TikTokGlyph fillContainer fill="var(--ikr-navy)" />
            </span>
          </span>
          <span
            className="hero-sub"
            style={{
              display: 'block',
              marginTop: 'clamp(10px, 2.6vw, 40px)',
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(1rem, 2.5vw, 40px)',
              lineHeight: 1.3,
              letterSpacing: '-0.03em',
              color: 'var(--ikr-navy-text)',
              textTransform: 'none',
            }}
          >
            dé TikTok agency voor food brands in Vlaanderen
          </span>
        </h1>
      </div>
    </section>
  )
}
