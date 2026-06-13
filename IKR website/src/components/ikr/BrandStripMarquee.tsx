'use client'

type Logo = { src: string; alt: string }

function buildTrack(logos: Logo[]) {
  if (logos.length === 0) return []
  const reps = Math.ceil(24 / logos.length)
  const half = Array.from({ length: reps }, () => logos).flat()
  return [...half, ...half]
}

export function BrandStripMarquee({ logos }: { logos: Logo[] }) {
  const track = buildTrack(logos)

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
        {track.map((logo, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              height: 80,
              marginRight: 48,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo.src}
              alt={logo.alt}
              style={{ height: '100%', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
