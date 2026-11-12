import 'server-only'
import { isSupabaseConfigured } from '../env'
import { createServiceSupabase } from '../supabase/server'
import { cleanNavPrefs, EMPTY_NAV, type NavPrefs } from './nav-core'

const mem = globalThis as unknown as { __ikrNav?: Record<string, NavPrefs> }

export async function getNavPrefs(email: string): Promise<NavPrefs> {
  if (!isSupabaseConfigured()) return (mem.__ikrNav ??= {})[email] ?? EMPTY_NAV
  const { data } = await createServiceSupabase().from('team_profiles').select('nav_order, nav_pinned').eq('email', email.toLowerCase()).maybeSingle()
  return cleanNavPrefs({ order: data?.nav_order, pinned: data?.nav_pinned })
}

export async function saveNavPrefs(email: string, prefs: NavPrefs) {
  const clean = cleanNavPrefs(prefs)
  if (!isSupabaseConfigured()) {
    ;(mem.__ikrNav ??= {})[email] = clean
    return clean
  }
  const { error } = await createServiceSupabase()
    .from('team_profiles')
    .upsert({ email: email.toLowerCase(), nav_order: clean.order, nav_pinned: clean.pinned, updated_at: new Date().toISOString() }, { onConflict: 'email' })
  if (error) throw new Error(error.message)
  return clean
}
