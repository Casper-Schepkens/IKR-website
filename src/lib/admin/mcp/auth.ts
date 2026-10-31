import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { isAllowedAdminEmail, isDemoMode, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '../env'
import { createSupabaseRepo } from '../data/supabase'
import { createDemoRepo } from '../data/demo'
import type { AdminSession } from '../session'

/** Waar Claude de OAuth-metadata van deze MCP-server vindt (RFC 9728). */
export function resourceMetadataUrl(origin: string) {
  return `${origin}/.well-known/oauth-protected-resource/api/mcp`
}

export function unauthorized(origin: string, description = 'Inloggen vereist') {
  return new Response(JSON.stringify({ error: 'unauthorized', error_description: description }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl(origin)}", error="invalid_token", error_description="${description}"`,
    },
  })
}

/**
 * Zet het Bearer-token van Claude (uitgegeven door Supabase OAuth) om naar een admin-sessie.
 * De databasetoegang loopt met datzelfde token, dus RLS blijft gelden.
 */
export async function sessionFromRequest(req: Request): Promise<AdminSession | Response> {
  const origin = new URL(req.url).origin

  // Lokaal zonder Supabase: demomodus, zonder login (nooit in productie).
  if (!isSupabaseConfigured()) {
    if (isDemoMode()) return { user: { email: 'demo@iknowright.be', name: 'Casper' }, repo: createDemoRepo(), mode: 'demo' }
    return new Response('IKR Admin is niet geconfigureerd', { status: 503 })
  }

  const header = req.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!token) return unauthorized(origin)

  const db = createClient(supabaseUrl(), supabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return unauthorized(origin, 'Token ongeldig of verlopen')
  if (!isAllowedAdminEmail(data.user.email)) return unauthorized(origin, 'Geen toegang voor dit account')

  const meta = data.user.user_metadata ?? {}
  const fullName = (meta.full_name as string | undefined) ?? (meta.name as string | undefined)
  return {
    user: { email: data.user.email!, name: fullName?.split(' ')[0] ?? data.user.email!.split('@')[0] },
    repo: createSupabaseRepo(db),
    mode: 'supabase',
  }
}
