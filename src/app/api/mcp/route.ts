import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { sessionFromRequest } from '@/lib/admin/mcp/auth'
import { buildMcpServer } from '@/lib/admin/mcp/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * IKR Admin als MCP-server (Streamable HTTP, stateless).
 * Toe te voegen in claude.ai → Settings → Connectors → Add custom connector → https://iknowright.be/api/mcp
 */
async function handle(req: Request) {
  const session = await sessionFromRequest(req)
  if (session instanceof Response) return session

  const server = buildMcpServer(session)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  const res = await transport.handleRequest(req)
  res.headers.set('X-Robots-Tag', 'noindex')
  return res
}

export { handle as GET, handle as POST, handle as DELETE }
