import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { isAllowedAdminEmail, isDemoMode, isSupabaseConfigured } from './env'
import { createServerSupabase } from './supabase/server'
import { createSupabaseRepo } from './data/supabase'
import { createDemoRepo } from './data/demo'
import type { AdminRepo } from './data/repo'
import type { AdminUser } from './types'

export type AdminSession = {
  user: AdminUser
  repo: AdminRepo
  mode: 'supabase' | 'demo'
}

export type AdminMode = 'supabase' | 'demo' | 'unconfigured'

export function adminMode(): AdminMode {
  if (isSupabaseConfigured()) return 'supabase'
  if (isDemoMode()) return 'demo'
  return 'unconfigured'
}

function nameFromEmail(email: string, metaName?: string | null) {
  if (metaName) return metaName.split(' ')[0]
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0]
}

/**
 * Ingelogde admin + datalaag. Stuurt naar /admin/login als er geen (geldige) sessie is.
 * Gebruik in elke admin-pagina en server action.
 */
export const requireAdmin = cache(async (): Promise<AdminSession> => {
  // Admin-data is altijd per request en per gebruiker: nooit statisch voorrenderen.
  await connection()
  const mode = adminMode()
  if (mode === 'unconfigured') redirect('/admin/login?error=niet-geconfigureerd')

  if (mode === 'demo') {
    return { user: { email: 'demo@iknowright.be', name: 'Casper' }, repo: createDemoRepo(), mode }
  }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  if (!isAllowedAdminEmail(user.email)) redirect('/admin/login?error=geen-toegang')

  const metaName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined)
  return {
    user: { email: user.email!, name: nameFromEmail(user.email!, metaName) },
    repo: createSupabaseRepo(supabase),
    mode,
  }
})
