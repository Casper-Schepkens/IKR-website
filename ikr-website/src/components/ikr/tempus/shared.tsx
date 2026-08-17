'use client'

import Link from 'next/link'
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { caseDetailTempus, caseGridItems } from '@/data/cases'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'

export const TEMPUS = caseDetailTempus

export const TEMPUS_VERSIONS = [
  { id: 'a', href: '/cases/tempus', label: 'A — Tijdlijn' },
  { id: 'b', href: '/cases/tempus/v2', label: 'B — Split' },
  { id: 'c', href: '/cases/tempus/v3', label: 'C — Kolommen' },
] as const

const PAGE_PAD = 'clamp(1rem, 6.8vw, 98px)'

export function TempusVersionSwitcher({ active }: { active: 'a' | 'b' | 'c' }) {
  return (
    <div
      style={{
        backgroundColor: ikr.navy,
        padding: `10px ${PAGE_PAD}`,
        paddingTop: 90,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            ...bodyFont,
            fontSize: 12,
            color: 'rgba(254,254,254,0.65)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Layout-preview
        </span>
        {TEMPUS_VERSIONS.map((v) => {
          const isActive = v.id === active
          return (
            <Link
              key={v.id}
              href={v.href}
              style={{
                ...displayFont,
                fontSize: 13,
                textDecoration: 'none',
                textTransform: 'uppercase',
                padding: '0.4em 0.9em',
                borderRadius: 48,
                color: isActive ? ikr.navy : '#FEFEFE',
                backgroundColor: isActive ? ikr.cyan : 'transparent',
                border: isActive ? 'none' : '1px solid rgba(254,254,254,0.25)',
              }}
            >
              {v.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function CyanBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        ...displayFont,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 'clamp(0.9rem, 1.3vw, 18px)',
        color: ikr.navy,
        backgroundColor: ikr.cyan,
        borderRadius: 48,
        padding: '0.75em 1.4em',
        textDecoration: 'none',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  )
}

export function GhostBtn({
  href,
  children,
  dark = false,
}: {
  href: string
  children: ReactNode
  dark?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        ...displayFont,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 'clamp(0.9rem, 1.3vw, 18px)',
        color: dark ? '#FEFEFE' : ikr.navy,
        backgroundColor: 'transparent',
        border: `1.5px solid ${dark ? 'rgba(254,254,254,0.45)' : ikr.navy}`,
        borderRadius: 48,
        padding: '0.7em 1.35em',
        textDecoration: 'none',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  )
}

export function TempusCtaCluster({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <CyanBtn href="/contact">Plan een gesprek →</CyanBtn>
      <GhostBtn href="/pricing" dark={dark}>
        Bekijk prijzen
      </GhostBtn>
      <GhostBtn href="/cases" dark={dark}>
        Andere cases
      </GhostBtn>
    </div>
  )
}

export function RelatedCases() {
  const others = caseGridItems.filter((c) => c.slug !== 'tempus')
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: 16,
      }}
    >
      {others.map((item) => (
        <Link
          key={item.slug}
          href={`/cases/${item.slug}`}
          style={{
            display: 'block',
            backgroundColor: ikr.navy,
            borderRadius: 20,
            padding: 'clamp(16px, 2vw, 24px)',
            textDecoration: 'none',
          }}
        >
          <p
            style={{
              ...displayFont,
              fontSize: 'clamp(1.1rem, 2vw, 24px)',
              color: '#FEFEFE',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {item.clientName}
          </p>
          <p style={{ ...bodyFont, fontSize: 14, color: ikr.cyan, margin: '8px 0 0' }}>
            Bekijk case →
          </p>
        </Link>
      ))}
    </div>
  )
}

function ViewsIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12C4.5 7.5 8 5 12 5s7.5 2.5 9.5 7c-2 4.5-5.5 7-9.5 7s-7.5-2.5-9.5-7Z"
        stroke="#201737"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="#201737" strokeWidth="2" />
    </svg>
  )
}

export function TempusVideoThumb({
  src,
  stat,
  tiktokUrl,
}: {
  src: string
  stat?: string
  tiktokUrl?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const inner = (
    <>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          if (videoRef.current && videoRef.current.currentTime < 0.05) {
            videoRef.current.currentTime = 0.12
          }
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {stat && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            backgroundColor: ikr.cyan,
            borderRadius: 48,
            padding: '0.3em 0.7em',
            ...displayFont,
            fontSize: 11,
            color: ikr.navy,
          }}
        >
          <ViewsIcon />
          {stat} views
        </span>
      )}
    </>
  )

  const shell: CSSProperties = {
    position: 'relative',
    aspectRatio: '9 / 16',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#D0C8BC',
    display: 'block',
    textDecoration: 'none',
  }

  const hover = {
    onMouseEnter: () => videoRef.current?.play().catch(() => {}),
    onMouseLeave: () => {
      const v = videoRef.current
      if (!v) return
      v.pause()
      v.currentTime = 0.12
    },
  }

  if (tiktokUrl) {
    return (
      <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" style={shell} {...hover}>
        {inner}
      </a>
    )
  }

  return (
    <div style={shell} {...hover}>
      {inner}
    </div>
  )
}

export const pad = PAGE_PAD
