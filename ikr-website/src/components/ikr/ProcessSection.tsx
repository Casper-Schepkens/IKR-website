'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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

const STEPS = [
  {
    n: '1',
    title: <>ANALYSE</>,
    body: 'We starten bij jouw merk, doelgroep en wat er nu al werkt. Geen content voor we weten waar we naartoe moeten.',
  },
  {
    n: '2',
    title: (
      <>
        CONTENT
        <br />
        CREATIE
      </>
    ),
    body: 'Wij bedenken de content, filmen de video’s, monteren alles en publiceren in jouw naam.',
  },
  {
    n: '3',
    title: <>ITERATIE</>,
    body: 'Elke maand meten we wat werkt en sturen we bij. Geen one-shot campagne — we blijven verbeteren.',
  },
] as const

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
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    const section = sectionRef.current
    if (!path || !section) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    const ctx = gsap.context(() => {
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top center',
          end: '70% top',
          scrub: 1,
        },
      })

      gsap.from('.process-step', {
        scrollTrigger: { trigger: section, start: 'top 75%' },
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

      <div className="flex flex-col lg:hidden" style={{ gap: 40, maxWidth: 560, margin: '0 auto' }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <NumberBadge n={step.n} />
            <div style={{ minWidth: 0, paddingTop: 8 }}>
              <h3 style={{ ...TITLE_FONT, fontSize: 'clamp(1.75rem, 8vw, 48px)' }}>{step.title}</h3>
              <p style={{ ...BODY_FONT, marginTop: 12, fontSize: '1rem' }}>{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="hidden lg:block"
        style={{
          position: 'relative',
          maxWidth: 1387,
          margin: '0 auto',
          minHeight: 'clamp(700px, 89.1vw, 1283px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: px(640, 1387),
            top: px(40, 1283),
            width: px(120, 1387),
            height: px(900, 1283),
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <svg viewBox="0 0 120 900" width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
            <path
              d="M60 12 C60 90, 108 170, 60 340 S12 620, 60 888"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              ref={pathRef}
              d="M60 12 C60 90, 108 170, 60 340 S12 620, 60 888"
              fill="none"
              stroke="var(--ikr-cyan)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[12, 340, 888].map((cy) => (
              <circle key={cy} cx="60" cy={cy} r="9" fill="var(--ikr-cyan)" />
            ))}
          </svg>
        </div>

        <div
          className="process-step"
          style={{
            position: 'absolute',
            left: 0,
            top: px(0, 1283),
            width: px(508, 1387),
            textAlign: 'right',
            zIndex: 2,
          }}
        >
          <h3 style={TITLE_FONT}>{STEPS[0].title}</h3>
          <p style={{ ...BODY_FONT, marginTop: 'clamp(12px, 1.7vw, 24px)' }}>{STEPS[0].body}</p>
        </div>
        <div style={{ position: 'absolute', left: px(530, 1387), top: px(29, 1283), zIndex: 3 }}>
          <NumberBadge n={STEPS[0].n} />
        </div>

        <div style={{ position: 'absolute', left: px(778, 1387), top: px(343, 1283), zIndex: 3 }}>
          <NumberBadge n={STEPS[1].n} />
        </div>
        <div
          className="process-step"
          style={{
            position: 'absolute',
            left: px(930, 1387),
            top: px(354, 1283),
            width: px(417, 1387),
            zIndex: 2,
          }}
        >
          <h3 style={TITLE_FONT}>{STEPS[1].title}</h3>
          <p style={{ ...BODY_FONT, marginTop: 'clamp(12px, 1.7vw, 24px)' }}>{STEPS[1].body}</p>
        </div>

        <div style={{ position: 'absolute', left: px(296, 1387), top: px(799, 1283), zIndex: 3 }}>
          <NumberBadge n={STEPS[2].n} />
        </div>
        <div
          className="process-step"
          style={{
            position: 'absolute',
            left: px(296, 1387),
            top: px(965, 1283),
            width: px(683, 1387),
            zIndex: 2,
          }}
        >
          <h3 style={TITLE_FONT}>{STEPS[2].title}</h3>
          <p style={{ ...BODY_FONT, marginTop: 'clamp(12px, 1.7vw, 24px)' }}>{STEPS[2].body}</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'clamp(28px, 4vw, 56px)' }}>
        <Link
          href="/aanpak"
          className="font-display font-black uppercase inline-flex items-center"
          style={{
            fontSize: 'clamp(0.9rem, 1.8vw, 22px)',
            letterSpacing: '-0.04em',
            backgroundColor: 'var(--ikr-navy)',
            color: '#fff',
            borderRadius: 48,
            padding: '0.55em 1.5em',
            textDecoration: 'none',
          }}
        >
          Ontdek onze aanpak →
        </Link>
      </div>
    </section>
  )
}
