'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Figma container: 1305 × 694px. Convert absolute px to %.
const x = (px: number) => `${((px / 1305) * 100).toFixed(2)}%`
const y = (px: number) => `${((px / 694) * 100).toFixed(2)}%`

const NUM: CSSProperties = {
  fontFamily: 'var(--font-roboto-condensed)',
  fontWeight: 900,
  fontSize: 'clamp(4rem, 17.36vw, 250px)',
  lineHeight: '79%',
  letterSpacing: '-0.04em',
  color: 'var(--ikr-navy-text)',
  display: 'block',
}

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-inter)',
  fontWeight: 400,
  fontSize: 'clamp(1rem, 2.78vw, 40px)',
  lineHeight: '100%',
  letterSpacing: '-0.04em',
  color: 'var(--ikr-navy-text)',
  whiteSpace: 'nowrap',
}

const BADGE_SIZE = 'clamp(50px, 10.42vw, 150px)'
const EMOJI_SIZE = 'clamp(1.5rem, 6.67vw, 96px)'

function Badge({ emoji, style }: { emoji: string; style?: CSSProperties }) {
  return (
    <div
      className="stat-badge"
      style={{
        position: 'absolute',
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: '50%',
        backgroundColor: 'var(--ikr-cyan)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span style={{ fontSize: EMOJI_SIZE, lineHeight: 1 }}>{emoji}</span>
    </div>
  )
}

export function StatsSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.stat-num, .stat-badge', {
        scrollTrigger: { trigger: ref.current, start: 'top 80%' },
        y: 40,
        opacity: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={ref}
      style={{
        backgroundColor: 'var(--ikr-cream)',
        padding: 'clamp(40px, 6vw, 96px) clamp(1rem, 5.76vw, 83px)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 1305,
          margin: '0 auto',
          height: 'clamp(500px, 48.2vw, 694px)',
        }}
      >
        {/* 125M */}
        <div className="stat-num" style={{ position: 'absolute', left: x(16), top: y(0) }}>
          <span style={NUM}>125M</span>
        </div>
        <div style={{ position: 'absolute', left: x(0), top: y(216) }}>
          <p style={LABEL}>Meest bekeken video in 2025</p>
        </div>

        {/* +400K */}
        <div className="stat-num" style={{ position: 'absolute', left: x(620), top: y(216) }}>
          <span style={NUM}>+400K</span>
        </div>
        <div style={{ position: 'absolute', left: x(724), top: y(422) }}>
          <p style={LABEL}>Nieuwe volgers in 2 jaar</p>
        </div>

        {/* 263 */}
        <div className="stat-num" style={{ position: 'absolute', left: x(197), top: y(438) }}>
          <span style={NUM}>263</span>
        </div>
        <div style={{ position: 'absolute', left: x(91), top: y(654) }}>
          <p style={LABEL}>Video&#39;s gepost in 2025</p>
        </div>

        {/* Badges */}
        <Badge emoji="🔥" style={{ left: x(493), top: y(86) }} />
        <Badge emoji="📈" style={{ left: x(1155), top: y(339) }} />
        <Badge emoji="📹" style={{ left: x(87), top: y(524) }} />
      </div>
    </section>
  )
}
