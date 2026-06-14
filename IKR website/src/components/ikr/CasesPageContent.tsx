'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { caseGridItems } from '@/data/cases'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'

const testimonials = [
  { name: 'Sabrina', role: 'Slagerij VDC', avatar: '#C5B094' },
  { name: 'Mathis', role: 'Bremate', avatar: '#8BA4C0' },
  { name: 'Mark', role: 'CEO Facebook', avatar: '#A8C5A0' },
  { name: 'Lisa', role: 'Panos', avatar: '#D4A5A5' },
  { name: 'Tom', role: "O'Tacos", avatar: '#B5A8D4' },
  { name: 'Noah', role: 'Aiki', avatar: '#C0B88B' },
] as const

const QUOTE =
  'Ik ben super tevreden over de groei van mijn sociale media dankzij IKnowRight!'

const testimonialRows = [
  [0, 1, 2, 3, 4, 5],
  [2, 3, 4, 5, 0, 1],
  [4, 5, 0, 1, 2, 3],
] as const

function ArrowIcon({ size = 18, color = '#FFF9F1' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 11.5L11.5 2.5M11.5 2.5H5M11.5 2.5V9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CasePlayButton() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'clamp(52px, 7.5vw, 88px)',
        height: 'clamp(52px, 7.5vw, 88px)',
        borderRadius: '50%',
        backgroundColor: ikr.cyan,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(32,23,55,0.28)',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <ArrowIcon size={28} />
    </div>
  )
}

function CaseClientButton({ name, slug }: { name: string; slug: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/cases/${slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 'clamp(10px, 7%, 18px)',
        left: '50%',
        transform: `translateX(-50%) translateY(${hovered ? -2 : 0}px) scale(${hovered ? 1.06 : 1})`,
        ...displayFont,
        fontSize: 'clamp(0.6rem, 1.15vw, 15px)',
        color: ikr.navy,
        backgroundColor: '#FFF9F1',
        borderRadius: 48,
        padding: '0.45em 1.1em',
        textDecoration: 'none',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        zIndex: 3,
        boxShadow: hovered
          ? '0 10px 24px rgba(32,23,55,0.32), 0 3px 8px rgba(15,193,222,0.2), inset 0 1px 0 rgba(255,255,255,0.9)'
          : '0 4px 14px rgba(32,23,55,0.2), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.85)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {name}
    </Link>
  )
}

function CaseVideoCard({
  src,
  clientName,
  logo,
  slug,
}: {
  src: string
  clientName: string
  logo: string
  slug: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleEnter = () => {
    videoRef.current?.play().catch(() => {})
  }

  const handleLeave = () => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
  }

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        position: 'relative',
        aspectRatio: '9 / 16',
        borderRadius: 'clamp(18px, 2vw, 28px)',
        overflow: 'hidden',
        backgroundColor: '#D0C8BC',
        cursor: 'pointer',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(32,23,55,0.35) 0%, transparent 28%, transparent 55%, rgba(32,23,55,0.75) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'clamp(10px, 4%, 16px)',
          left: 'clamp(10px, 4%, 16px)',
          zIndex: 3,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={`${clientName} logo`}
          style={{
            display: 'block',
            height: 'clamp(28px, 6vw, 44px)',
            width: 'auto',
          }}
        />
      </div>
      <CasePlayButton />
      <CaseClientButton name={clientName} slug={slug} />
    </div>
  )
}

function SpeechBubble({ tail, children }: { tail: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 'clamp(18px, 2.5vw, 36px)',
        flexShrink: 0,
        width: 'clamp(260px, 24vw, 360px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FEFEFE',
          borderRadius: 20,
          padding: 'clamp(12px, 1.4vw, 20px) clamp(16px, 1.9vw, 28px)',
          position: 'relative',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -22,
          ...(tail === 'right' ? { right: '12%' } : { left: '12%' }),
          width: 56,
          height: 24,
          backgroundColor: '#FEFEFE',
          clipPath:
            tail === 'right'
              ? 'polygon(0% 0%, 100% 0%, 100% 100%)'
              : 'polygon(0% 0%, 100% 0%, 0% 100%)',
        }}
      />
    </div>
  )
}

function TestimonialBubble({
  name,
  role,
  avatar,
  tail,
}: {
  name: string
  role: string
  avatar: string
  tail: 'left' | 'right'
}) {
  const [liked, setLiked] = useState(false)

  return (
    <SpeechBubble tail={tail}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 'clamp(36px, 3.5vw, 48px)',
            height: 'clamp(36px, 3.5vw, 48px)',
            borderRadius: '50%',
            backgroundColor: avatar,
            flexShrink: 0,
            border: '2px solid rgba(32,23,55,0.08)',
          }}
        />
        <div style={{ flex: 1, paddingRight: 28 }}>
          <p
            style={{
              ...bodyFont,
              fontWeight: 700,
              fontSize: 'clamp(0.8rem, 1.1vw, 16px)',
              color: ikr.navyText,
              marginBottom: 6,
            }}
          >
            {name} - {role}
          </p>
          <p
            style={{
              ...bodyFont,
              fontSize: 'clamp(0.75rem, 1vw, 14px)',
              color: ikr.navyText,
              lineHeight: '140%',
            }}
          >
            {QUOTE}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setLiked((v) => !v)}
        aria-label={liked ? 'Unlike testimonial' : 'Like testimonial'}
        aria-pressed={liked}
        style={{
          position: 'absolute',
          bottom: 'clamp(10px, 1vw, 14px)',
          right: 'clamp(12px, 1.2vw, 18px)',
          fontSize: 'clamp(14px, 1.2vw, 18px)',
          lineHeight: 1,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          padding: 4,
          transform: liked ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}
      >
        {liked ? '❤️' : '🤍'}
      </button>
    </SpeechBubble>
  )
}

function TestimonialMarqueeRow({
  indices,
  direction,
  duration,
}: {
  indices: readonly number[]
  direction: 'left' | 'right'
  duration: number
}) {
  const [paused, setPaused] = useState(false)
  const loop = [...indices, ...indices]

  return (
    <div
      style={{ overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          display: 'flex',
          gap: 'clamp(16px, 2vw, 28px)',
          width: 'max-content',
          animation: `ikr-marquee ${duration}s linear infinite ${direction === 'right' ? 'reverse' : 'normal'}`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange: 'transform',
        }}
      >
        {loop.map((testimonialIndex, i) => {
          const t = testimonials[testimonialIndex]
          return (
            <TestimonialBubble
              key={`${testimonialIndex}-${i}`}
              name={t.name}
              role={t.role}
              avatar={t.avatar}
              tail={i % 2 === 0 ? 'left' : 'right'}
            />
          )
        })}
      </div>
    </div>
  )
}

function TestimonialsSection() {
  const rowConfig = [
    { direction: 'left' as const, duration: 42 },
    { direction: 'right' as const, duration: 38 },
    { direction: 'left' as const, duration: 44 },
  ]

  return (
    <section
      style={{
        backgroundColor: ikr.navy,
        padding: 'clamp(3rem, 6vw, 80px) 0 clamp(4rem, 8vw, 100px)',
        overflow: 'hidden',
      }}
    >
      <h2
        style={{
          ...displayFont,
          textAlign: 'center',
          color: '#FEFEFE',
          fontSize: 'clamp(1.25rem, 2.78vw, 40px)',
          textTransform: 'uppercase',
          marginBottom: 'clamp(2rem, 4vw, 56px)',
          padding: '0 clamp(1rem, 4vw, 48px)',
        }}
      >
        KIJK WAT ONZE KLANTEN ZEGGEN...
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vw, 16px)' }}>
        {testimonialRows.map((row, rowIndex) => (
          <TestimonialMarqueeRow
            key={rowIndex}
            indices={row}
            direction={rowConfig[rowIndex].direction}
            duration={rowConfig[rowIndex].duration}
          />
        ))}
      </div>
    </section>
  )
}

export function CasesPageContent() {
  return (
    <>
      <section style={{ backgroundColor: ikr.cream, paddingTop: 80 }}>
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            padding: 'clamp(2rem, 5vw, 64px) clamp(1rem, 6.8vw, 98px) clamp(3rem, 8vw, 100px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'clamp(1.5rem, 4vw, 48px)',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                flexShrink: 0,
                gap: 'clamp(12px, 2vw, 24px)',
              }}
            >
              <h1
                style={{
                  ...displayFont,
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  fontSize: 'clamp(4.5rem, 14vw, 200px)',
                  lineHeight: 0.82,
                  color: ikr.navy,
                  margin: 0,
                  transform: 'rotate(180deg)',
                }}
              >
                CASES
              </h1>
              <p
                style={{
                  ...displayFont,
                  fontSize: 'clamp(1rem, 2.5vw, 36px)',
                  color: ikr.cyan,
                  textTransform: 'uppercase',
                  margin: 0,
                  paddingLeft: 'clamp(8px, 1vw, 16px)',
                  maxWidth: 'clamp(180px, 20vw, 280px)',
                  lineHeight: 1.1,
                }}
              >
                WAAR WE TROTS OP ZIJN
              </p>
            </div>

            <div
              style={{
                flex: '1 1 320px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 'clamp(12px, 1.8vw, 24px)',
                minWidth: 0,
              }}
            >
              {caseGridItems.map((item) => (
                <CaseVideoCard
                  key={item.id}
                  src={item.video}
                  clientName={item.clientName}
                  logo={item.logo}
                  slug={item.slug}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />
    </>
  )
}
