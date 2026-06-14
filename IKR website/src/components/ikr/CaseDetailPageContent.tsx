'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import type { CaseDetail } from '@/data/cases'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'

const PAGE_PAD = 'clamp(1rem, 6.8vw, 98px)'

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

function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        ...displayFont,
        fontSize: 'clamp(0.7rem, 1.1vw, 14px)',
        color: ikr.navy,
        backgroundColor: ikr.cyan,
        borderRadius: 48,
        padding: '0.35em 0.9em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        ...displayFont,
        fontSize: 'clamp(1.25rem, 2.78vw, 40px)',
        color: ikr.navy,
        textTransform: 'uppercase',
        marginBottom: 'clamp(12px, 1.5vw, 20px)',
      }}
    >
      {children}
    </h2>
  )
}

function HoverVideo({ src, stat }: { src: string; stat?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div
      onMouseEnter={() => videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const v = videoRef.current
        if (!v) return
        v.pause()
        v.currentTime = 0
      }}
      style={{
        position: 'relative',
        aspectRatio: '9 / 16',
        borderRadius: 'clamp(18px, 2vw, 28px)',
        overflow: 'hidden',
        backgroundColor: '#D0C8BC',
        flexShrink: 0,
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
      {stat && (
        <div
          style={{
            position: 'absolute',
            top: 'clamp(10px, 3%, 14px)',
            left: 'clamp(10px, 3%, 14px)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: ikr.cyan,
            borderRadius: 48,
            padding: '0.3em 0.75em',
          }}
        >
          <span style={{ fontSize: 12 }} aria-hidden>
            ♥
          </span>
          <span
            style={{
              ...displayFont,
              fontSize: 'clamp(0.6rem, 0.9vw, 12px)',
              color: ikr.navy,
            }}
          >
            {stat}
          </span>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(44px, 6vw, 72px)',
          height: 'clamp(44px, 6vw, 72px)',
          borderRadius: '50%',
          backgroundColor: ikr.cyan,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <ArrowIcon size={24} />
      </div>
    </div>
  )
}

function CaseDetailHero({ data }: { data: CaseDetail }) {
  return (
    <section style={{ backgroundColor: ikr.cream, paddingTop: 80 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: `clamp(2rem, 4vw, 48px) ${PAGE_PAD} 0` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: data.outcomeLine ? 'clamp(8px, 1vw, 12px)' : 'clamp(1.5rem, 3vw, 32px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 24px)', flexWrap: 'wrap' }}>
            <h1
              style={{
                ...displayFont,
                fontSize: 'clamp(2rem, 6.67vw, 96px)',
                lineHeight: 0.9,
                color: ikr.navy,
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              {data.bedrijf}
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.logo}
              alt={`${data.bedrijf} logo`}
              style={{ height: 'clamp(36px, 5vw, 56px)', width: 'auto', display: 'block' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {data.tags.map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
          </div>
        </div>

        {data.outcomeLine && (
          <p
            style={{
              ...displayFont,
              fontSize: 'clamp(0.9rem, 1.67vw, 24px)',
              color: ikr.cyan,
              textTransform: 'uppercase',
              marginBottom: 'clamp(1.5rem, 3vw, 32px)',
            }}
          >
            {data.outcomeLine}
          </p>
        )}

        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 7',
            borderRadius: 'clamp(20px, 2.5vw, 32px)',
            overflow: 'hidden',
            marginBottom: 'clamp(2rem, 4vw, 48px)',
          }}
        >
          <Image
            src={data.heroImage}
            alt=""
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 1440px) 100vw, 1440px"
            priority
          />
        </div>
      </div>
    </section>
  )
}

function SummaryBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div
      style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: `0 ${PAGE_PAD} clamp(2rem, 4vw, 48px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(12px, 1.5vw, 20px)',
          maxWidth: 800,
        }}
      >
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              ...bodyFont,
              fontSize: 'clamp(0.875rem, 1.39vw, 20px)',
              color: ikr.navyText,
              margin: 0,
              lineHeight: '150%',
            }}
          >
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}

function ResultsRow({ results }: { results: CaseDetail['results'] }) {
  return (
    <div
      style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: `0 ${PAGE_PAD} clamp(2.5rem, 5vw, 64px)`,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
          gap: 'clamp(12px, 2vw, 20px)',
        }}
      >
        {results.map((r) => (
          <div
            key={r.label}
            style={{
              backgroundColor: ikr.navy,
              borderRadius: 'clamp(16px, 2vw, 24px)',
              padding: 'clamp(16px, 2vw, 28px)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                ...displayFont,
                fontSize: 'clamp(1.5rem, 3.5vw, 48px)',
                color: ikr.cyan,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {r.value}
            </p>
            <p
              style={{
                ...bodyFont,
                fontSize: 'clamp(0.75rem, 1.1vw, 14px)',
                color: '#FEFEFE',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              {r.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoGallery({ videos }: { videos: CaseDetail['videos'] }) {
  return (
    <div
      style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: `0 0 clamp(3rem, 6vw, 72px)`,
      }}
    >
      <div style={{ padding: `0 ${PAGE_PAD} clamp(1rem, 2vw, 24px)` }}>
        <SectionHeading>BEKIJK DE CONTENT</SectionHeading>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'flex',
            gap: 'clamp(12px, 2vw, 24px)',
            padding: `0 ${PAGE_PAD}`,
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {videos.map((v, i) => (
            <div key={i} style={{ width: 'clamp(140px, 18vw, 220px)' }}>
              <HoverVideo src={v.src} stat={v.stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StorySection({ blocks }: { blocks: CaseDetail['story'] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <section
          key={i}
          style={{
            backgroundColor: ikr.cream,
            padding: `clamp(2rem, 5vw, 64px) ${PAGE_PAD}`,
          }}
        >
          <div style={{ maxWidth: 1440, margin: '0 auto' }}>
            <SectionHeading>{block.title}</SectionHeading>
            <p
              style={{
                ...bodyFont,
                fontSize: 'clamp(0.875rem, 1.39vw, 20px)',
                color: ikr.navyText,
                maxWidth: 720,
                marginBottom: block.image ? 'clamp(1.5rem, 3vw, 40px)' : 0,
                lineHeight: '150%',
              }}
            >
              {block.body}
            </p>
            {block.image && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 7',
                  borderRadius: 'clamp(20px, 2.5vw, 32px)',
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={block.image}
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 1440px) 100vw, 1440px"
                />
              </div>
            )}
          </div>
        </section>
      ))}
    </>
  )
}

function SpeechBubble({ tail, children }: { tail: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', maxWidth: 560 }}>
      <div
        style={{
          backgroundColor: '#FEFEFE',
          borderRadius: 20,
          padding: 'clamp(16px, 2vw, 28px) clamp(20px, 2.5vw, 36px)',
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

function ClientQuote({ testimonial }: { testimonial: CaseDetail['testimonial'] }) {
  return (
    <section
      style={{
        backgroundColor: ikr.navy,
        padding: `clamp(3rem, 6vw, 80px) ${PAGE_PAD}`,
      }}
    >
      <div style={{ maxWidth: 1440, margin: '0 auto', textAlign: 'center' }}>
        <h2
          style={{
            ...displayFont,
            fontSize: 'clamp(1rem, 2vw, 28px)',
            color: '#FEFEFE',
            textTransform: 'uppercase',
            marginBottom: 'clamp(1.5rem, 3vw, 32px)',
          }}
        >
          KLANT AAN HET WOORD
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SpeechBubble tail="right">
            <p
              style={{
                ...bodyFont,
                fontSize: 'clamp(0.875rem, 1.39vw, 20px)',
                color: ikr.navyText,
                lineHeight: '150%',
                marginBottom: 12,
                textAlign: 'left',
              }}
            >
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <p
              style={{
                ...bodyFont,
                fontWeight: 700,
                fontSize: 'clamp(0.8rem, 1.1vw, 16px)',
                color: ikr.navyText,
                textAlign: 'left',
                margin: 0,
              }}
            >
              {testimonial.name} — {testimonial.role}
            </p>
          </SpeechBubble>
        </div>
      </div>
    </section>
  )
}

function CaseDetailCTA() {
  return (
    <section
      style={{
        backgroundColor: ikr.cream,
        padding: `clamp(3rem, 6vw, 80px) ${PAGE_PAD} clamp(4rem, 8vw, 100px)`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: ikr.navy,
            borderRadius: 'clamp(20px, 2.5vw, 32px)',
            padding: 'clamp(2rem, 5vw, 64px) clamp(1.5rem, 4vw, 48px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'clamp(1.5rem, 3vw, 32px)',
          }}
        >
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(1.5rem, 4vw, 56px)',
              lineHeight: 1.05,
              color: '#FEFEFE',
              textTransform: 'uppercase',
              maxWidth: '28rem',
              margin: 0,
            }}
          >
            KLAAR OM DIT VOOR JOUW MERK TE DOEN?
          </h2>
          <Link
            href="/contact"
            style={{
              ...displayFont,
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 'clamp(1rem, 1.5vw, 20px)',
              color: ikr.navy,
              backgroundColor: ikr.cyan,
              borderRadius: 48,
              padding: '0.75em 1.5em',
              textDecoration: 'none',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Plan een gesprek →
          </Link>
        </div>
        <Link
          href="/cases"
          style={{
            ...bodyFont,
            display: 'inline-block',
            marginTop: 'clamp(1rem, 2vw, 24px)',
            fontSize: 'clamp(0.875rem, 1.2vw, 16px)',
            color: ikr.navyText,
            textDecoration: 'none',
          }}
        >
          ← Terug naar cases
        </Link>
      </div>
    </section>
  )
}

export function CaseDetailPageContent({ data }: { data: CaseDetail }) {
  return (
    <div style={{ backgroundColor: ikr.cream }}>
      <CaseDetailHero data={data} />
      <SummaryBlock paragraphs={data.summary} />
      <ResultsRow results={data.results} />
      <VideoGallery videos={data.videos} />
      <StorySection blocks={data.story} />
      <ClientQuote testimonial={data.testimonial} />
      <CaseDetailCTA />
    </div>
  )
}
