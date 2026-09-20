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

/** Simple Icons TikTok path (CC0). Same glyph as carousel captions. */
export const TIKTOK_GLYPH_PATH =
  'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z'

/** Reusable TikTok mark — fill defaults to white for video captions. */
export function TikTokGlyph({
  size = '1.5em',
  fill = '#FFFFFF',
  className,
}: {
  size?: number | string
  fill?: string
  className?: string
}) {
  return (
    <span className={className ?? 'ikr-tt-mark'} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path fill={fill} d={TIKTOK_GLYPH_PATH} />
      </svg>
    </span>
  )
}

/** Clean white TikTok icon at handle-text scale (no play animation). */
function MiniTikTokMark() {
  return <TikTokGlyph size="1.5em" fill="#FFFFFF" className="ikr-tt-mark ikr-tt-mark--caption" />
}

/** Mini TikTok logo + @handle on proof cards (bottom-left). Only render when a real handle exists. */
export function TikTokHandleCaption({ handle }: { handle: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5em',
        /* Room for the mark’s slight translateY so it does not clip or cover the handle. */
        paddingBottom: '0.2em',
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(0.7rem, 1.15vw, 14px)',
        lineHeight: 1.15,
        letterSpacing: '-0.02em',
        color: '#FFFFFF',
        textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 0 12px rgba(0,0,0,0.35)',
        whiteSpace: 'nowrap',
      }}
    >
      <MiniTikTokMark />
      {handle}
    </span>
  )
}
