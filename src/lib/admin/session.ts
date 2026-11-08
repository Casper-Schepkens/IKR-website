import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { canSeeSales, isAllowedAdminEmail, isDemoMode, isSupabaseConfigured, SALES_EMAIL } from './env'
import { createServerSupabase } from './supabase/server'
import { memoryLeads, supabaseLeads, type LeadsRepo } from './sales/repo'
import { memoryWeekly, supabaseWeekly, type WeeklyRepo } from './weekly/repo'
import { memoryClients, supabaseClients, type ClientsRepo } from './clients/repo'
import { memoryCalls, supabaseCalls, type CallsRepo } from './calls/repo'
import { demoDrafts, supabaseDrafts, type DraftsRepo } from './sales/drafts'
import { demoChat, supabaseChat, type ChatRepo } from './chat/repo'
import { createServiceSupabase } from './supabase/server'

export type AdminUser = { id: string; email: string; name: string }

/** Vaste gebruiker-id in demomodus. */
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'
export type AdminSession = {
  user: AdminUser
  mode: 'supabase' | 'demo'
  leads: LeadsRepo
  weekly: WeeklyRepo
  /** Klanten (productie): zichtbaar voor het hele team. */
  clients: ClientsRepo
  /** Calls (sales; RLS: enkel Casper). */
  calls: CallsRepo
  drafts: DraftsRepo
  /** Chat met Grok Bot; altijd gefilterd op de eigen user.id. */
  chat: ChatRepo
}
export type AdminMode = 'supabase' | 'demo' | 'unconfigured'

export function adminMode(): AdminMode {
  if (isSupabaseConfigured()) return 'supabase'
  if (isDemoMode()) return 'demo'
  return 'unconfigured'
}

function firstName(email: string, metaName?: string | null) {
  if (metaName) return metaName.split(' ')[0]
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0]
}

/** Ingelogd teamlid. Stuurt naar /admin/login als er geen geldige sessie is. */
export const requireAdmin = cache(async (): Promise<AdminSession> => {
  await connection()
  const mode = adminMode()
  if (mode === 'unconfigured') redirect('/admin/login?error=niet-geconfigureerd')
  if (mode === 'demo')
    return {
      user: { id: DEMO_USER_ID, email: SALES_EMAIL, name: 'Casper' },
      mode,
      leads: memoryLeads(),
      weekly: memoryWeekly(),
      clients: memoryClients(),
      calls: memoryCalls(),
      drafts: demoDrafts(),
      chat: demoChat(),
    }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  if (!isAllowedAdminEmail(user.email)) redirect('/admin/login?error=geen-toegang')
  const meta = user.user_metadata ?? {}
  return {
    user: { id: user.id, email: user.email!, name: firstName(user.email!, (meta.full_name ?? meta.name) as string | undefined) },
    mode,
    leads: supabaseLeads(supabase),
    weekly: supabaseWeekly(supabase),
    clients: supabaseClients(supabase),
    calls: supabaseCalls(supabase),
    drafts: supabaseDrafts(supabase),
    // Server-side met de service role, maar altijd gefilterd op user.id (plus RLS voor directe toegang).
    chat: process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseChat(createServiceSupabase()) : supabaseChat(supabase),
  }
})

/** Sales-onderdelen: enkel voor Casper. Anderen gaan terug naar hun eigen startpagina. */
export async function requireSales() {
  const session = await requireAdmin()
  if (!canSeeSales(session.user.email)) redirect('/admin')
  return session
}
