import { displayFont } from '@/lib/ikr-styles'

export function ClientLogoSticker({
  name,
  logo,
  rotate = -8,
}: {
  name: string
  logo?: string
  rotate?: number
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF9F1',
        borderRadius: 10,
        minHeight: 'clamp(32px, 4.4vw, 44px)',
        padding: logo ? '0.35em 0.55em' : '0.45em 0.9em',
        boxShadow: '0 6px 16px rgba(32,23,55,0.28), 0 1px 0 rgba(255,255,255,0.9) inset',
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${name} logo`}
          style={{
            display: 'block',
            height: 'clamp(20px, 2.8vw, 30px)',
            width: 'auto',
            maxWidth: 110,
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
      ) : (
        <span
          style={{
            ...displayFont,
            fontSize: 'clamp(0.55rem, 1vw, 13px)',
            color: 'var(--ikr-navy)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {name}
        </span>
      )}
    </div>
  )
}

export function ClickHint() {
  return (
    <div
      aria-hidden
      style={{
        width: 'clamp(22px, 2.4vw, 32px)',
        height: 'clamp(22px, 2.4vw, 32px)',
        borderRadius: '50%',
        backgroundColor: '#FFF9F1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(32,23,55,0.25)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path
          d="M2.5 11.5L11.5 2.5M11.5 2.5H5M11.5 2.5V9"
          stroke="var(--ikr-navy)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/**
 * Minimal musical-note mark — legal-safe stand-in, not an official TikTok brand asset.
 * Paired with @handle on carousel cards (bottom-left).
 */
function MiniTikTokMark({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path d="M14 3v9.2a3.6 3.6 0 1 1-2.4-3.4V3h2.4z" fill="#25F4EE" />
      <path
        d="M16.2 3c.55 1.85 1.9 3.35 3.8 4.05V9.3c-1.55-.35-2.9-1.1-3.8-2.15V3z"
        fill="#FE2C55"
      />
      <path d="M14 3v9.2a3.6 3.6 0 1 1-2.4-3.4V3h2.4z" fill="#FFFFFF" fillOpacity="0.92" />
    </svg>
  )
}

/** TikTok-style mini mark + @handle on proof cards — only render when a real handle exists. */
export function TikTokHandleCaption({ handle }: { handle: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(0.65rem, 1.05vw, 13px)',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        color: '#FFFFFF',
        textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 0 12px rgba(0,0,0,0.35)',
        whiteSpace: 'nowrap',
      }}
    >
      <MiniTikTokMark size={12} />
      {handle}
    </span>
  )
}
