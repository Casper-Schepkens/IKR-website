export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey())
}

/**
 * Alleen lokaal zonder Supabase (of expliciet met IKR_ADMIN_DEMO=true): data in het geheugen om te testen.
 * Nooit op Vercel: demomodus heeft geen login, en een preview zonder Supabase-variabelen zou dan open staan.
 */
export function isDemoMode() {
  if (isSupabaseConfigured()) return false
  if (process.env.VERCEL) return false
  return process.env.NODE_ENV !== 'production' || process.env.IKR_ADMIN_DEMO === 'true'
}

export const ADMIN_DOMAIN = 'iknowright.be'

/** Wie in /admin mag: het team. Extra adressen (bv. een stagiair) via IKR_EXTRA_ADMIN_EMAILS, komma-gescheiden. */
export const TEAM_EMAILS = ['casper@iknowright.be', 'cedric@iknowright.be', 'milan@iknowright.be'] as const

export function isAllowedAdminEmail(email: string | null | undefined) {
  const e = email?.trim().toLowerCase()
  if (!e) return false
  const extra = (process.env.IKR_EXTRA_ADMIN_EMAILS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  return (TEAM_EMAILS as readonly string[]).includes(e) || extra.includes(e)
}

/** Elk teamlid krijgt een eigen dashboard. Sales is enkel voor Casper (ook afgedwongen in de database). */
export const SALES_EMAIL = 'casper@iknowright.be'

export function canSeeSales(email: string | null | undefined) {
  return email?.toLowerCase() === SALES_EMAIL
}
