import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/utilities/ui'

/** Gedeelde stijlen voor /admin, afgestemd op de IKR-huisstijl (crème, navy, cyaan). */

export const muted = 'text-[#5E5670]'

export const btn = {
  base: 'ikr-btn inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-[18px] text-sm font-semibold disabled:cursor-not-allowed [&:disabled:not([data-pending=true])]:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC1DE]',
  cyan: 'bg-ikr-cyan text-ikr-navy hover:bg-[#3dd0e8]',
  navy: 'bg-ikr-navy text-ikr-cream-light hover:bg-[#2c2247]',
  soft: 'bg-ikr-cream text-ikr-navy hover:bg-[#e6dfd2]',
  light: 'bg-ikr-cream-light text-ikr-navy hover:bg-white',
  ghostDark:
    'bg-transparent text-ikr-cream-light shadow-[inset_0_0_0_1.5px_#5E5670] hover:bg-white/5',
  small: 'min-h-10 px-4',
}

export function buttonClass(
  variant: keyof Omit<typeof btn, 'base' | 'small'> = 'soft',
  small = false,
  extra?: string,
) {
  return cn(btn.base, btn[variant], small && btn.small, extra)
}

export const input =
  'w-full rounded-xl border-0 bg-ikr-cream px-3.5 py-2.5 text-[15px] text-ikr-navy placeholder:text-[#8A8296] focus:outline focus:outline-2 focus:outline-[#0FC1DE]'

export const label = 'flex flex-col gap-1.5 text-[13px] font-semibold text-[#5E5670]'

export function Card({
  children,
  className,
  dark,
}: {
  children: ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-3xl p-6',
        dark ? 'bg-ikr-navy text-ikr-cream-light' : 'bg-ikr-cream-light',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Title({
  children,
  className,
  as: As = 'h2',
}: {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <As className={cn('font-display font-black uppercase tracking-[-0.03em]', className)}>
      {children}
    </As>
  )
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className={cn('m-0 text-[15px]', muted)}>{eyebrow}</p>}
        <Title as="h1" className="mt-1.5 text-5xl leading-[0.9] md:text-[72px] md:leading-[0.88]">
          {title}
        </Title>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  )
}

const tones = {
  neutral: 'bg-ikr-cream text-[#5E5670]',
  light: 'bg-ikr-cream-light text-[#5E5670]',
  cyan: 'bg-ikr-cyan text-ikr-navy',
  teal: 'bg-[#D3F3F9] text-[#0A5F6E]',
  green: 'bg-[#DDF2DF] text-[#1E5B27]',
  orange: 'bg-[#FCE3D2] text-[#8A3A0C]',
  yellow: 'bg-[#FFF0C2] text-[#6B5300]',
  purple: 'bg-[#E4E0F0] text-[#3B2E63]',
  navy: 'bg-ikr-navy text-ikr-cream-light',
}
export type Tone = keyof typeof tones

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Avatar({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full bg-ikr-cream text-[11px] font-bold text-ikr-navy',
        className,
      )}
    >
      {text}
    </span>
  )
}

export function Stat({
  label: l,
  value,
  note,
  noteTone,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  noteTone?: 'up' | 'down' | 'muted'
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-ikr-cream-light p-5">
      <span className={cn('text-[13px] font-medium', muted)}>{l}</span>
      <span className="font-display text-[44px] leading-none font-black tracking-[-0.03em]">
        {value}
      </span>
      {note && (
        <span
          className={cn(
            'text-[13px]',
            noteTone === 'up' && 'font-semibold text-[#0B7F93]',
            noteTone === 'down' && 'font-semibold text-[#A3470F]',
            (!noteTone || noteTone === 'muted') && muted,
          )}
        >
          {note}
        </span>
      )}
    </div>
  )
}

/** Draaiend icoontje voor knoppen die bezig zijn. */
export function Spinner() {
  return <span className="ikr-spinner" aria-hidden="true" />
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={cn('m-0 rounded-2xl bg-ikr-cream p-4 text-sm', muted)}>{children}</p>
}

// ─── Iconen (stroke, currentColor) ───────────────────────────

type IconProps = SVGProps<SVGSVGElement> & { size?: number }
function Svg({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Icon = {
  sparkle: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </Svg>
  ),
  home: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  ),
  users: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-7 7-7s7 3 7 7M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5.5-4-6.5" />
    </Svg>
  ),
  board: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="12" rx="1" />
      <rect x="17" y="3" width="4" height="8" rx="1" />
    </Svg>
  ),
  calendar: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  ),
  bulb: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
    </Svg>
  ),
  file: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </Svg>
  ),
  chart: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  ),
  book: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" />
    </Svg>
  ),
  settings: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  ),
  plus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  close: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  download: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </Svg>
  ),
  mail: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </Svg>
  ),
}
