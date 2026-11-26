/** Thema van /admin: 'system' volgt het toestel, 'light' en 'dark' zijn een vaste keuze (cookie). */
export const THEME_COOKIE = 'ikr-admin-theme'
export const THEMES = ['system', 'light', 'dark'] as const
export type AdminTheme = (typeof THEMES)[number]

export function parseTheme(value: string | undefined | null): AdminTheme {
  return value === 'light' || value === 'dark' ? value : 'system'
}

