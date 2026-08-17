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
