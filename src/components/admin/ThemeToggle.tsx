'use client'

import { useState } from 'react'
import { nextTheme, THEME_COOKIE, type AdminTheme } from '@/lib/admin/theme'

const LABEL: Record<AdminTheme, string> = { system: 'Systeem', light: 'Licht', dark: 'Donker' }

function ThemeIcon({ theme }: { theme: AdminTheme }) {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (theme === 'light')
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  if (theme === 'dark')
    return (
      <svg {...p}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    )
  return (
    <svg {...p}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

/** Wisselt Systeem → Licht → Donker. Zet meteen data-theme op .ikr-admin en bewaart de keuze een jaar. */
export function ThemeToggle({ initial }: { initial: AdminTheme }) {
  const [theme, setTheme] = useState<AdminTheme>(initial)

  function cycle() {
    const t = nextTheme(theme)
    setTheme(t)
    const root = document.querySelector<HTMLElement>('.ikr-admin')
    if (root) {
      if (t === 'system') delete root.dataset.theme
      else root.dataset.theme = t
    }
    document.cookie =
      t === 'system'
        ? `${THEME_COOKIE}=; path=/admin; max-age=0; samesite=lax`
        : `${THEME_COOKIE}=${t}; path=/admin; max-age=31536000; samesite=lax`
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Thema: ${LABEL[theme]}. Klik om te wisselen.`}
      title="Wissel tussen systeem, licht en donker"
      className="flex min-h-11 items-center gap-2 self-start rounded-full px-3 text-xs font-semibold text-[#B9B2C9] ring-1 ring-white/15 hover:bg-white/10 hover:text-ikr-cream-light lg:min-h-9"
    >
      <ThemeIcon theme={theme} />
      {LABEL[theme]}
    </button>
  )
}
