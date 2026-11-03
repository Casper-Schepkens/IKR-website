import { handleMcp } from '@/lib/admin/mcp/handle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** IKR-dashboard voor Grokbot (MCP). Sleutel in de header: Authorization: Bearer <GROKBOT_API_KEY>. */
const handle = (req: Request) => handleMcp(req)
export { handle as GET, handle as POST, handle as DELETE }
