import { handleMcp } from '@/lib/admin/mcp/handle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Zelfde als /api/mcp, maar met de sleutel in de URL voor apps die geen headers kunnen instellen. */
async function handle(req: Request, { params }: { params: Promise<{ key: string }> }) {
  return handleMcp(req, (await params).key)
}
export { handle as GET, handle as POST, handle as DELETE }
