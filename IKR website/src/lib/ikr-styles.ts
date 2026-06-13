import type { CSSProperties } from 'react'

/** Shared IKR design tokens — values live in globals.css as CSS variables */
export const ikr = {
  cream: 'var(--ikr-cream)',
  creamLight: 'var(--ikr-cream-light)',
  navy: 'var(--ikr-navy)',
  navyText: 'var(--ikr-navy-text)',
  cyan: 'var(--ikr-cyan)',
  white: '#FFFFFF',
} as const

export const displayFont: CSSProperties = {
  fontFamily: 'var(--font-roboto-condensed), "Roboto Condensed", sans-serif',
  fontWeight: 900,
  letterSpacing: '-0.04em',
}

export const bodyFont: CSSProperties = {
  fontFamily: 'var(--font-inter), Inter, sans-serif',
  fontWeight: 400,
  letterSpacing: '-0.04em',
  lineHeight: '150%',
}
