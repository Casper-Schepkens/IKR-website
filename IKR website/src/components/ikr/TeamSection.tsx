'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const MEMBERS = [
  { name: 'CASPER SCHEPKENS', role: 'Marketing & Sales', photo: '/images/casper.jpg', rotation: -4.4 },
  { name: 'CÉDRIC GALLE', role: 'COO', photo: '/images/cedric.jpg', rotation: 0 },
  { name: 'MILAN MEERT', role: 'Dienstmanager', photo: '/images/milan.jpg', rotation: 4.4 },
]

// clip-path creates 2 triangular peaks at 25% and 75% — matching team.png
const ZIG_H = 72 // px — tooth height

const CLIP = [
  `0 ${ZIG_H}px`,       // bottom-left
  `25% 0`,              // peak left
  `50% ${ZIG_H}px`,    // valley
  `75% 0`,              // peak right
  `100% ${ZIG_H}px`,   // bottom-right
  `100% calc(100% - ${ZIG_H}px)`,
  `75% 100%`,
  `50% calc(100% - ${ZIG_H}px)`,
  `25% 100%`,
  `0 calc(100% - ${ZIG_H}px)`,
].join(', ')

export function TeamSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.team-card', {
        scrollTrigger: { trigger: ref.current, start: 'top 80%' },
        y: 60,
        opacity: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <div
        style={{
          backgroundColor: 'var(--ikr-cyan)',
          clipPath: `polygon(${CLIP})`,
          padding: `${ZIG_H + 32}px clamp(1rem, 5.2vw, 75px) ${ZIG_H + 40}px`,
        }}
      >
        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(8px, 1.8vw, 26px)',
            marginBottom: 'clamp(32px, 4vw, 56px)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-roboto-condensed)',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 6.67vw, 96px)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: 'var(--ikr-navy-text)',
              display: 'inline-block',
              transform: 'rotate(-3.71deg)',
            }}
          >
            THE
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="IKR"
            style={{ height: 'clamp(60px, 10.1vw, 145px)', width: 'auto', objectFit: 'contain' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-roboto-condensed)',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 6.67vw, 96px)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: 'var(--ikr-navy-text)',
              display: 'inline-block',
              transform: 'rotate(3.71deg)',
            }}
          >
            TEAM
          </span>
        </div>

        {/* Cards */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(16px, 3.5vw, 50px)',
            alignItems: 'flex-end',
          }}
        >
          {MEMBERS.map((m) => (
            <div
              key={m.name}
              className="team-card"
              style={{ transform: `rotate(${m.rotation}deg)`, flexShrink: 0 }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 'clamp(12px, 1.7vw, 24px) clamp(12px, 1.7vw, 24px) clamp(16px, 2.2vw, 32px)',
                  width: 'clamp(180px, 26.2vw, 377px)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '338 / 359',
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#e0d8cc',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photo}
                    alt={m.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div style={{ marginTop: 'clamp(10px, 1.4vw, 20px)' }}>
                  <p style={{
                    fontFamily: 'var(--font-roboto-condensed)',
                    fontWeight: 900,
                    fontSize: 'clamp(1rem, 2.22vw, 32px)',
                    lineHeight: 1.2,
                    color: '#252525',
                  }}>
                    {m.name}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 400,
                    fontSize: 'clamp(0.75rem, 1.39vw, 20px)',
                    lineHeight: 1.2,
                    color: '#252525',
                    marginTop: '0.25em',
                  }}>
                    {m.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
