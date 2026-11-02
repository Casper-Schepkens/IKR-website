export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey())
}

/** Alleen lokaal zonder Supabase (of expliciet met IKR_ADMIN_DEMO=true): data in het geheugen om te testen. */
export function isDemoMode() {
  if (isSupabaseConfigured()) return false
  return process.env.NODE_ENV !== 'production' || process.env.IKR_ADMIN_DEMO === 'true'
}

/** Het IKR-team: iedereen met een @iknowright.be-adres kan inloggen. */
export const ADMIN_DOMAIN = 'iknowright.be'

export function isAllowedAdminEmail(email: string | null | undefined) {
  return Boolean(email && email.toLowerCase().endsWith(`@${ADMIN_DOMAIN}`))
}

/** Elk teamlid krijgt een eigen dashboard. Sales is enkel voor Casper (ook afgedwongen in de database). */
export const SALES_EMAIL = 'casper@iknowright.be'

export function canSeeSales(email: string | null | undefined) {
  return email?.toLowerCase() === SALES_EMAIL
}
