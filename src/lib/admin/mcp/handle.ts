import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isDemoMode, isSupabaseConfigured, SALES_EMAIL } from '../env'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryClients } from '../clients/repo'
import { demoDrafts } from '../sales/drafts'
import { demoChat } from '../chat/repo'
import { botSession, buildMcpServer } from './server'

function same(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Grokbot via MCP (Streamable HTTP, stateless). Sleutel via `Authorization: Bearer …`, `x-api-key`,
 * of als laatste stuk van de URL (/api/mcp/<sleutel>) voor apps die geen headers kunnen instellen.
 */
export async function handleMcp(req: Request, pathKey?: string) {
  const demo = !isSupabaseConfigured() && isDemoMode()
  const expected = process.env.GROKBOT_API_KEY
  if (!demo) {
    if (!expected) return new Response('GROKBOT_API_KEY ontbreekt', { status: 503 })
    const auth = req.headers.get('authorization') ?? ''
    const given = pathKey ?? req.headers.get('x-api-key') ?? (auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '')
    if (!given || !same(given, expected)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const session = demo
    ? { user: { id: 'grokbot', email: SALES_EMAIL, name: 'Grokbot' }, mode: 'demo' as const, leads: memoryLeads(), weekly: memoryWeekly(), clients: memoryClients(), drafts: demoDrafts(), chat: demoChat() }
    : botSession()
  const server = buildMcpServer(session)
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  const res = await transport.handleRequest(req)
  res.headers.set('X-Robots-Tag', 'noindex')
  res.headers.set('Cache-Control', 'no-store')
  return res
}
