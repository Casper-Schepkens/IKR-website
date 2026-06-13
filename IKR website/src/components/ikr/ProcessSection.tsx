'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Figma steps-container reference: 1387 × 1283px
const px = (v: number, base: number) => `${((v / base) * 100).toFixed(2)}%`

const TITLE_FONT: React.CSSProperties = {
  fontFamily: 'var(--font-roboto-condensed)',
  fontWeight: 900,
  fontSize: 'clamp(2.5rem, 7.64vw, 110px)',
  lineHeight: '90%',
  letterSpacing: '-0.04em',
  textTransform: 'uppercase',
  color: 'var(--ikr-navy-text)',
}

const BODY_FONT: React.CSSProperties = {
  fontFamily: 'var(--font-inter)',
  fontWeight: 400,
  fontSize: 'clamp(1rem, 2.22vw, 32px)',
  lineHeight: '150%',
  letterSpacing: '-0.04em',
  color: '#000000',
}

const CIRCLE_SIZE = 'clamp(60px, 9.72vw, 140px)'

function NumberBadge({ n }: { n: string }) {
  return (
    <div
      style={{
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: '50%',
        backgroundColor: 'var(--ikr-navy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-roboto-condensed)',
          fontWeight: 900,
          fontSize: 'clamp(2rem, 7.64vw, 110px)',
          lineHeight: '90%',
          letterSpacing: '-0.04em',
          color: '#FEFEFE',
        }}
      >
        {n}
      </span>
    </div>
  )
}

export function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Scroll-driven line fill
      gsap.fromTo(
        fillRef.current,
        { height: '0%' },
        {
          height: '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top center',  // start pas als sectie de helft van scherm in is
            end: '60% top',       // vol als 60% van sectie boven scherm is
            scrub: true,
          },
        }
      )

      // Step cards fade in
      gsap.from('.process-step', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      style={{ backgroundColor: 'var(--ikr-cream)', padding: 'clamp(40px, 6vw, 80px) clamp(1rem, 2.8vw, 40px) clamp(60px, 8vw, 120px)' }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 5.6vw, 80px)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-roboto-condensed)',
            fontWeight: 900,
            fontSize: 'clamp(3rem, 8.89vw, 128px)',
            lineHeight: '79%',
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
            color: 'var(--ikr-navy-text)',
          }}
        >
          HET PROCES
        </h2>
      </div>

      {/* Steps container — 1387×1283 reference */}
      <div
        style={{
          position: 'relative',
          maxWidth: 1387,
          margin: '0 auto',
          minHeight: 'clamp(700px, 89.1vw, 1283px)',
        }}
      >
        {/* ── Center vertical track ── */}
        <div
          style={{
            position: 'absolute',
            left: px(710, 1387),
            top: px(85, 1283),
            width: 'clamp(8px, 0.97vw, 14px)',
            height: px(799, 1283),
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* White background track */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
            }}
          />
          {/* Cyan fill — animated */}
          <div
            ref={fillRef}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'clamp(6px, 0.69vw, 10px)',
              height: '0%',
              backgroundColor: 'var(--ikr-cyan)',
              borderRadius: 12,
              transformOrigin: 'top',
            }}
          />
          {/* Dots */}
          {[0, px(320, 799), '100%'].map((top, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(8px, 1.11vw, 16px)',
                height: 'clamp(8px, 1.11vw, 16px)',
                borderRadius: '50%',
                backgroundColor: 'var(--ikr-cyan)',
                zIndex: 2,
              }}
            />
          ))}
        </div>

        {/* ── Step 1: CONTENT STRATEGIE (left, right-aligned) ── */}
        <div
          className="process-step"
          style={{
            position: 'absolute',
            left: 0,
            top: px(0, 1283),
            width: px(508, 1387),
            textAlign: 'right',
          }}
        >
          <h3 style={TITLE_FONT}>CONTENT<br />STRATEGIE</h3>
          <p style={{ ...BODY_FONT, marginTop: 'clamp(12px, 1.7vw, 24px)' }}>
            Een strategie uitbouwen is het werk van echte professionals, en die zijn vaak duur. Wij gaan aan de slag voor een eerlijke prijs. Win-win!
          </p>
        </div>
        <div
          style={{
            position: 'absolute',
            left: px(530, 1387),
            top: px(29, 1283),
          }}
        >
          <NumberBadge n="1" />
        </div>

        {/* ── Step 2: CONTENT CREATIE (right) ── */}
        <div
          style={{
            position: 'absolute',
            left: px(778, 1387),
            top: px(343, 1283),
          }}
        >
          <NumberBadge n="2" />
        </div>
        <div
          className="process-step"
          style={{
            position: 'absolute',
            left: px(930, 1387),
            top: px(354, 1283),
            width: px(417, 1387),
          }}
        >
          <h3 style={TITLE_FONT}>CONTENT<br />CREATIE</h3>
          <p style={{ ...BODY_FONT, marginTop: 'clamp(12px, 1.7vw, 24px)' }}>
            Wij bedenken de content, filmen de videos, monteren alles en publiceren ze als laatste in jouw naam!
          </p>
        </div>

        {/* ── Step 3: ADVERTENTIES (left, left-aligned) ── */}
        <div
          style={{
            position: 'absolute',
            left: px(296, 1387),
            top: px(799, 1283),
          }}
        >
          <NumberBadge n="3" />
        </div>
        <div
          className="process-step"
          style={{
            position: 'absolute',
            left: px(296, 1387),
            top: px(965, 1283),
            width: px(683, 1387),
          }}
        >
          <h3 style={TITLE_FONT}>ADVERTENTIES</h3>
          <p style={{ ...BODY_FONT, marginTop: 'clamp(12px, 1.7vw, 24px)' }}>
            Minder interesse in je merk op te bouwen, maar eerder gefocust op directe leads of website clicks? Dan stellen wij maandelijks advertising campagnes op voor jouw bedrijf.
          </p>
        </div>
      </div>
    </section>
  )
}
