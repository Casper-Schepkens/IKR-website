/**
 * Welke onderdelen van /admin geconfigureerd zijn. Alles werkt zonder credentials:
 * ontbreekt Supabase, dan draait /admin in demomodus (alleen lokaal of met IKR_ADMIN_DEMO=true).
 */

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey())
}

export function isServiceRoleConfigured() {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/** Demomodus: geen database, voorbeelddata in het geheugen. Nooit in productie tenzij expliciet aangezet. */
export function isDemoMode() {
  if (isSupabaseConfigured()) return false
  return process.env.NODE_ENV !== 'production' || process.env.IKR_ADMIN_DEMO === 'true'
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

/** Model voor grote taken (ideeën, uitwerkingen, decks) als die via de API lopen. */
export const AI_MODEL = process.env.IKR_AI_MODEL || 'claude-opus-5-5'
/** Model voor kleine taken (briefing, samenvatting, mails, draaiboek, vragen, analyse). */
export const AI_MODEL_SMALL = process.env.IKR_AI_MODEL_SMALL || 'claude-sonnet-5-5'

/**
 * Standaard lopen enkel kleine taken via de API; grote taken openen Claude (connector, abonnement).
 * Met IKR_AI_ALL_API=true lopen ook de grote taken via de API.
 */
export function aiRouting() {
  return {
    api: isAiConfigured(),
    bigViaApi: isAiConfigured() && process.env.IKR_AI_ALL_API === 'true',
    grok: Boolean(process.env.GROK_WEBHOOK_URL && process.env.GROK_WEBHOOK_SECRET),
  }
}

/** Domein dat altijd toegang heeft. */
export const ADMIN_DOMAIN = 'iknowright.be'

/** Extra adressen (komma-gescheiden) die toegang hebben, bv. persoonlijke gmail-adressen. */
export function extraAdminEmails(): string[] {
  return (process.env.IKR_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) return false
  const e = email.toLowerCase()
  return e.endsWith(`@${ADMIN_DOMAIN}`) || extraAdminEmails().includes(e)
}

export function integrationStatus() {
  return [
    {
      key: 'supabase',
      label: 'Supabase (database + login)',
      ok: isSupabaseConfigured() && isServiceRoleConfigured(),
      vars: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
    },
    {
      key: 'anthropic',
      label: 'Claude API (alle AI-knoppen)',
      ok: isAiConfigured(),
      vars: ['ANTHROPIC_API_KEY'],
    },
    {
      key: 'billit',
      label: 'Billit (facturen)',
      ok: Boolean(process.env.BILLIT_API_KEY),
      vars: ['BILLIT_API_KEY', 'BILLIT_PARTY_ID'],
    },
    {
      key: 'google',
      label: 'Google Calendar-sync (volgende fase — nog niet gebouwd)',
      ok: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALENDAR_ID'],
    },
    {
      key: 'tiktok',
      label: 'TikTok (videostatistieken)',
      ok: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
      vars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    },
    {
      key: 'cron',
      label: 'Dagelijkse job (facturen klaarzetten, stats ophalen)',
      ok: Boolean(process.env.CRON_SECRET),
      vars: ['CRON_SECRET'],
    },
  ]
}
