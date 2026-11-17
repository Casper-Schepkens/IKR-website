import 'server-only'
import { isSupabaseConfigured } from '../env'
import { createServiceSupabase } from '../supabase/server'
import { cleanNavPrefs, EMPTY_NAV, type NavPrefs } from './nav-core'

const mem = globalThis as unknown as { __ikrNav?: Record<string, NavPrefs> }

export async function getNavPrefs(email: string): Promise<NavPrefs> {
  if (!isSupabaseConfigured()) return (mem.__ikrNav ??= {})[email] ?? EMPTY_NAV
  const { data } = await createServiceSupabase().from('team_profiles').select('nav_order, nav_pinned, nav_hidden').eq('email', email.toLowerCase()).maybeSingle()
  return cleanNavPrefs({ order: data?.nav_order, pinned: data?.nav_pinned, hidden: data?.nav_hidden })
}

/** Bewaart enkel wat meegegeven is (volgorde en pins uit de zijbalk, verborgen pagina's uit Instellingen). */
export async function saveNavPrefs(email: string, prefs: Partial<NavPrefs>) {
  const clean = cleanNavPrefs(prefs)
  if (!isSupabaseConfigured()) {
    const all = (mem.__ikrNav ??= {})
    const cur = all[email] ?? EMPTY_NAV
    all[email] = { order: prefs.order ? clean.order : cur.order, pinned: prefs.pinned ? clean.pinned : cur.pinned, hidden: 'hidden' in prefs ? clean.hidden : cur.hidden }
    return all[email]
  }
  const row: Record<string, unknown> = { email: email.toLowerCase(), updated_at: new Date().toISOString() }
  if (prefs.order) row.nav_order = clean.order
  if (prefs.pinned) row.nav_pinned = clean.pinned
  if ('hidden' in prefs) row.nav_hidden = clean.hidden
  const { error } = await createServiceSupabase().from('team_profiles').upsert(row, { onConflict: 'email' })
  if (error) throw new Error(error.message)
  return clean
}
