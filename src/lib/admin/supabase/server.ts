import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { supabaseAnonKey, supabaseUrl } from '../env'

/** Supabase-client met de sessie van de ingelogde gebruiker (RLS geldt). */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Aangeroepen vanuit een Server Component: de proxy ververst de sessie al.
        }
      },
    },
  })
}

/** Service-role client: omzeilt RLS. Alleen voor cron, formulieren en webhooks — nooit met gebruikersinput als filter zonder check. */
let service: { url: string; key: string; client: SupabaseClient } | null = null

export function createServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl() || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt')
  // Eén client per instantie (zonder sessie, dus zonder gedeelde gebruikersstaat): niet bij elke query opnieuw opbouwen.
  if (service?.url !== supabaseUrl() || service.key !== key)
    service = { url: supabaseUrl(), key, client: createSupabaseClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } }) }
  return service.client
}
