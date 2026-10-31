import { requireAdmin } from '@/lib/admin/session'
import { getFile } from '@/lib/admin/storage'

/** Geüpload klantlogo uit de privé bucket (alleen voor ingelogde admins). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { repo } = await requireAdmin()
  const client = await repo.getClient(id)
  const path = client?.logo_url
  if (!path || /^https?:\/\//i.test(path)) return new Response('Niet gevonden', { status: 404 })
  const file = await getFile('logos', path)
  if (!file) return new Response('Niet gevonden', { status: 404 })
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.type,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Robots-Tag': 'noindex',
    },
  })
}
