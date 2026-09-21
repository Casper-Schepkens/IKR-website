'use client'

import type { BrandStripItem } from '@/data/brands'

function buildTrack(items: BrandStripItem[]) {
  if (items.length === 0) return []
  const reps = Math.ceil(24 / items.length)
  const half = Array.from({ length: reps }, () => items).flat()
  return [...half, ...half]
}

function logoFrameStyle(shape: BrandStripItem['logoShape']) {
  if (shape === 'circle') {
    return {
      height: 80,
      width: 80,
      borderRadius: '50%',
      overflow: 'hidden' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    }
  }

  return {
    height: 80,
    borderRadius: 16,
    overflow: 'hidden' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

export function BrandStripMarquee({ items }: { items: BrandStripItem[] }) {
  const track = buildTrack(items)

  return (
    <div style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          animation: track.length > 0 ? 'ikr-marquee 22s linear infinite' : 'none',
          willChange: 'transform',
        }}
      >
        {track.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            style={{
              flexShrink: 0,
              height: 80,
              marginRight: 48,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {item.logo ? (
              <div style={logoFrameStyle(item.logoShape)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.logo}
                  alt={item.name}
                  style={{
                    height: '100%',
                    width: item.logoShape === 'circle' ? '100%' : 'auto',
                    objectFit: item.logoShape === 'circle' ? 'cover' : 'contain',
                    display: 'block',
                    borderRadius: item.logoShape === 'circle' ? 0 : 16,
                    mixBlendMode: item.logoShape === 'circle' ? 'normal' : 'multiply',
                  }}
                />
              </div>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-roboto-condensed)',
                  fontWeight: 900,
                  fontSize: 'clamp(1.25rem, 2.2vw, 28px)',
                  letterSpacing: '-0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--ikr-navy-text)',
                  whiteSpace: 'nowrap',
                  opacity: 0.72,
                }}
              >
                {item.name}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
