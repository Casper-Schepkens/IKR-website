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
        className="flex flex-col lg:hidden"
        style={{
          backgroundColor: 'var(--ikr-cyan)',
          padding: '28px 0 36px',
        }}
      >
        <p
          className="font-display font-black uppercase"
          style={{
            textAlign: 'center',
            fontSize: 28,
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy-text)',
            marginBottom: 20,
            padding: '0 20px',
          }}
        >
          The IKR team
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: '0 20px',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          {MEMBERS.map((m) => (
            <div
              key={`m-${m.name}`}
              className="team-card"
              style={{
                flexShrink: 0,
                width: 'min(72vw, 260px)',
                scrollSnapAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: '12px 12px 16px',
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
              <p
                style={{
                  fontFamily: 'var(--font-roboto-condensed)',
                  fontWeight: 900,
                  fontSize: 16,
                  lineHeight: 1.2,
                  color: '#252525',
                  marginTop: 12,
                }}
              >
                {m.name}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  color: '#252525',
                  marginTop: 4,
                }}
              >
                {m.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="hidden lg:block pb-[112px]"
        style={{
          backgroundColor: 'var(--ikr-cyan)',
          clipPath: `polygon(${CLIP})`,
          paddingTop: ZIG_H + 32,
          paddingLeft: 'clamp(1rem, 5.2vw, 75px)',
          paddingRight: 'clamp(1rem, 5.2vw, 75px)',
        }}
      >
        <div
          className="flex flex-wrap items-center justify-center"
          style={{
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
            style={{ height: 'clamp(40px, 10.1vw, 145px)', width: 'auto', objectFit: 'contain' }}
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

        <div
          className="flex flex-row items-end justify-center"
          style={{ gap: 'clamp(16px, 3.5vw, 50px)' }}
        >
          {MEMBERS.map((m) => (
            <div
              key={m.name}
              className="team-card shrink-0"
              style={{ transform: `rotate(${m.rotation}deg)` }}
            >
              <div
                style={{
                  width: 'clamp(180px, 26.2vw, 377px)',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 'clamp(12px, 1.7vw, 24px) clamp(12px, 1.7vw, 24px) clamp(16px, 2.2vw, 32px)',
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
