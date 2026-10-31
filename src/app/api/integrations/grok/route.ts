import { NextResponse } from 'next/server'
import { parseGrokResult, verifyGrokToken } from '@/lib/admin/integrations/grok'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { createSupabaseRepo } from '@/lib/admin/data/supabase'
import { createDemoRepo } from '@/lib/admin/data/demo'
import { isDemoMode, isServiceRoleConfigured } from '@/lib/admin/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Terugkoppeling van de Grok-bot: POST /api/integrations/grok?idee=<id>&token=<hmac>
 * Body (JSON): { titel?, hook, opbouw[], shots[], nodig[], cta }
 */
export async function POST(req: Request) {
  const url = new URL(req.url)
  const ideaId = url.searchParams.get('idee') ?? ''
  const token = url.searchParams.get('token') ?? ''
  if (!ideaId || !verifyGrokToken(ideaId, token)) {
    return NextResponse.json({ error: 'Ongeldige of verlopen link' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body moet JSON zijn' }, { status: 400 })
  }
  const result = parseGrokResult(body)
  if (!result) {
    return NextResponse.json(
      { error: 'Geen uitwerking gevonden. Verwacht: { hook, opbouw[], shots[], nodig[], cta }' },
      { status: 422 },
    )
  }

  const repo = isServiceRoleConfigured()
    ? createSupabaseRepo(createServiceSupabase())
    : isDemoMode()
      ? createDemoRepo()
      : null
  if (!repo) return NextResponse.json({ error: 'Niet geconfigureerd' }, { status: 503 })

  const idea = await repo.getIdea(ideaId)
  if (!idea) return NextResponse.json({ error: 'Idee niet gevonden' }, { status: 404 })

  await repo.updateIdea(ideaId, {
    ...(result.title ? { title: result.title } : {}),
    hook: result.hook,
    cta: result.cta,
    structure: result.structure,
    shots: result.shots,
    needs: result.needs,
    status: idea.status === 'approved' ? 'approved' : 'developed',
    dev_status: null,
  })
  await repo.addActivity({
    client_id: idea.client_id,
    kind: 'ai',
    title: `Grok werkte “${result.title ?? idea.title}” uit`,
    created_by: 'Grok',
  })
  return NextResponse.json({ ok: true })
}
