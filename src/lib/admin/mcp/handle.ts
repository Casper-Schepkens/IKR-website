import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isDemoMode, isSupabaseConfigured, SALES_EMAIL } from '../env'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryClients } from '../clients/repo'
import { memorySops } from '../sops/repo'
import { memoryProduction } from '../production/repo'
import { memoryCalls } from '../calls/repo'
import { demoDrafts } from '../sales/drafts'
import { demoChat } from '../chat/repo'
import { botSession, buildMcpServer, type Scope } from './server'

function same(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Geldige sleutels: GROKBOT_API_KEY en, tijdens het wisselen van sleutel, GROKBOT_API_KEY_NEXT.
 * Zo kan je een nieuwe sleutel in Grok zetten voor je de oude weghaalt.
 */
export function validKeys() {
  return [process.env.GROKBOT_API_KEY, process.env.GROKBOT_API_KEY_NEXT].filter((k): k is string => Boolean(k))
}

/** De sleutel in de URL (/api/mcp/<sleutel>) komt in logs terecht; uit te zetten met GROKBOT_ALLOW_URL_KEY=false. */
export const urlKeyAllowed = () => process.env.GROKBOT_ALLOW_URL_KEY !== 'false'

/** Zoekt de meegegeven sleutel; null = geweigerd (met de reden voor de logs, nooit de sleutel zelf). */
export function checkKey(req: Request, pathKey?: string): { ok: true; scope: Scope } | { ok: false; status: number; reason: string } {
  const keys = validKeys()
  const teamKey = process.env.GROKBOT_TEAM_API_KEY
  if (!keys.length) return { ok: false, status: 503, reason: 'GROKBOT_API_KEY ontbreekt' }
  if (pathKey !== undefined && !urlKeyAllowed()) return { ok: false, status: 401, reason: 'sleutel in de URL staat uit' }
  const auth = req.headers.get('authorization') ?? ''
  const given = pathKey ?? req.headers.get('x-api-key') ?? (auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '')
  if (!given) return { ok: false, status: 401, reason: 'geen sleutel' }
  if (keys.some((k) => same(given, k))) return { ok: true, scope: 'sales' }
  // Team-sleutel: een sessie zonder sales-tools (voor de chats en werkplekken van Cédric en Milan).
  if (teamKey && same(given, teamKey)) return { ok: true, scope: 'team' }
  return { ok: false, status: 401, reason: 'verkeerde sleutel' }
}

/**
 * Grokbot via MCP (Streamable HTTP, stateless). Sleutel via `Authorization: Bearer …`, `x-api-key`,
 * of als laatste stuk van de URL (/api/mcp/<sleutel>) voor apps die geen headers kunnen instellen.
 */
export async function handleMcp(req: Request, pathKey?: string) {
  // Stateless: geen aparte SSE-stroom. Zonder dit houdt een client (bv. Cursor) een GET open tot de time-out (2 min).
  if (req.method === 'GET') return new Response(null, { status: 405, headers: { Allow: 'POST, DELETE' } })
  const demo = !isSupabaseConfigured() && isDemoMode()
  let scope: Scope = 'sales'
  if (!demo) {
    const check = checkKey(req, pathKey)
    if (!check.ok) {
      // Mislukte pogingen zichtbaar in de Vercel-logs (zonder de sleutel).
      console.warn(`[mcp] geweigerd: ${check.reason} (${pathKey !== undefined ? 'URL' : 'header'})`)
      if (check.status === 503) return new Response('GROKBOT_API_KEY ontbreekt', { status: 503 })
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    scope = check.scope
  }

  const session = demo
    ? { user: { id: 'grokbot', email: SALES_EMAIL, name: 'Grokbot' }, mode: 'demo' as const, leads: memoryLeads(), weekly: memoryWeekly(), clients: memoryClients(), sops: memorySops(), production: memoryProduction(), calls: memoryCalls(), drafts: demoDrafts(), chat: demoChat() }
    : botSession()
  const server = buildMcpServer(session, scope)
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  const res = await transport.handleRequest(req)
  res.headers.set('X-Robots-Tag', 'noindex')
  res.headers.set('Cache-Control', 'no-store')
  return res
}
