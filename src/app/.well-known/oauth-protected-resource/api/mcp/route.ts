import { protectedResourceMetadata, metadataHeaders } from '@/lib/admin/mcp/metadata'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return new Response(JSON.stringify(protectedResourceMetadata(new URL(req.url).origin)), { headers: metadataHeaders })
}

export function OPTIONS() {
  return new Response(null, { headers: { ...metadataHeaders, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' } })
}
