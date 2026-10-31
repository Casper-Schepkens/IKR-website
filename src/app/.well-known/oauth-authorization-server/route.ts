import { supabaseUrl } from '@/lib/admin/env'
import { metadataHeaders } from '@/lib/admin/mcp/metadata'

export const dynamic = 'force-dynamic'

/**
 * Voor oudere MCP-clients die de autorisatieserver op het domein van de MCP-server zoeken:
 * geeft de metadata van de Supabase OAuth-server door.
 */
export async function GET() {
  if (!supabaseUrl()) return new Response('Not configured', { status: 404 })
  const res = await fetch(`${supabaseUrl()}/.well-known/oauth-authorization-server/auth/v1`, { cache: 'no-store' })
  return new Response(await res.text(), { status: res.status, headers: metadataHeaders })
}
