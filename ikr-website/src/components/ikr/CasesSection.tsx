'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { caseGridItems } from '@/data/cases'
import { displayFont, ikr } from '@/lib/ikr-styles'
import { ClickHint, ClientLogoSticker } from './ClientLogoSticker'

function CasePreviewCard({
  slug,
  clientName,
  video,
  logo,
}: {
  slug: string
  clientName: string
  video: string
  logo?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/cases/${slug}`}
      aria-label={`Case ${clientName}`}
      onMouseEnter={() => {
        setHovered(true)
        videoRef.current?.play().catch(() => {})
      }}
      onMouseLeave={() => {
        setHovered(false)
        const v = videoRef.current
        if (!v) return
        v.pause()
        v.currentTime = 0
      }}
      style={{
        display: 'block',
        position: 'relative',
        aspectRatio: '9 / 16',
        borderRadius: 'clamp(18px, 2vw, 28px)',
        overflow: 'hidden',
        backgroundColor: '#D0C8BC',
        textDecoration: 'none',
      }}
    >
      <video
        ref={videoRef}
        src={video}
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
          background:
            'linear-gradient(180deg, rgba(32,23,55,0.35) 0%, transparent 28%, transparent 55%, rgba(32,23,55,0.75) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'clamp(10px, 4%, 16px)',
          left: 'clamp(10px, 4%, 16px)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <ClientLogoSticker name={clientName} logo={logo} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 'clamp(10px, 4%, 16px)',
          top: 'clamp(10px, 4%, 16px)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <ClickHint />
      </div>
      <span
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
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          zIndex: 2,
          transition: 'transform 0.25s ease',
        }}
      >
        {clientName}
      </span>
    </Link>
  )
}

export function CasesSection() {
  return (
    <section style={{ backgroundColor: 'var(--ikr-cream-light)' }} className="py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <p
            className="font-display font-black uppercase text-sm tracking-widest"
            style={{ color: 'rgba(32,23,55,0.4)' }}
          >
            Onze cases
          </p>
          <Link
            href="/cases"
            className="font-display font-black uppercase text-sm px-5 h-9 rounded-full flex items-center"
            style={{ backgroundColor: 'var(--ikr-navy)', color: '#fff' }}
          >
            ZIE ALLES →
          </Link>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6"
          style={{ maxWidth: 900, margin: '0 auto' }}
        >
          {caseGridItems.map((item) => (
            <CasePreviewCard
              key={item.id}
              slug={item.slug}
              clientName={item.clientName}
              video={item.video}
              logo={item.logo}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
