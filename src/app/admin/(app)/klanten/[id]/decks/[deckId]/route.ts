import { requireAdmin } from '@/lib/admin/session'
import { getFile } from '@/lib/admin/storage'
import { slugify } from '@/lib/admin/format'

/** Download van een gegenereerde presentatie (alleen voor ingelogde admins). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; deckId: string }> },
) {
  const { id, deckId } = await params
  const { repo } = await requireAdmin()
  const deck = (await repo.listDecks(id)).find((d) => d.id === deckId)
  if (!deck?.storage_path) return new Response('Niet gevonden', { status: 404 })
  const file = await getFile('decks', deck.storage_path)
  if (!file) return new Response('Bestand niet gevonden', { status: 404 })
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.type,
      'Content-Disposition': `attachment; filename="${slugify(deck.title) || 'presentatie'}.pptx"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
