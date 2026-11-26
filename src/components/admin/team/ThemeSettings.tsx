'use client'

import { useState } from 'react'
import { cn } from '@/utilities/ui'
import { THEME_COOKIE, THEMES, type AdminTheme } from '@/lib/admin/theme'
import { Card, muted, Title } from '../ui'

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

/** Zet data-theme op .ikr-admin (meteen zichtbaar) en bewaart de keuze in de cookie (server leest die bij laden). */
function applyTheme(t: AdminTheme) {
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

/** Weergave van /admin: keuze geldt meteen en blijft een jaar bewaard (enkel op dit toestel). */
export function ThemeSettings({ initial }: { initial: AdminTheme }) {
  const [theme, setTheme] = useState<AdminTheme>(initial)

  function choose(t: AdminTheme) {
    setTheme(t)
    applyTheme(t)
  }

  return (
    <Card className="flex flex-col gap-3">
      <Title>Weergave</Title>
      <p className={cn('m-0 text-sm', muted)}>
        Licht of donker dashboard. Met Systeem volgt het de instelling van je toestel. Wordt bewaard op dit toestel.
      </p>
      <div role="radiogroup" aria-label="Thema" className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={theme === t}
            onClick={() => choose(t)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full px-[18px] text-sm font-semibold',
              theme === t ? 'bg-ikr-cyan text-ikr-navy' : 'bg-adm-soft text-adm-fg hover:bg-adm-soft-hover',
            )}
          >
            <ThemeIcon theme={t} />
            {LABEL[t]}
          </button>
        ))}
      </div>
    </Card>
  )
}
