import { NextResponse } from 'next/server'
import { enqueueStyleRebuild } from '@/lib/admin/ai/style'
import { STYLE_KEYS } from '@/lib/admin/ai/style-profile'
import { isAiConfigured } from '@/lib/admin/ai/jobs'

export const maxDuration = 120

/** Elke maandag: de schrijfstijlprofielen opnieuw laten opbouwen (Grokbot of API). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAiConfigured()) return NextResponse.json({ skipped: 'geen AI ingesteld' })
  const results: Record<string, string> = {}
  for (const key of STYLE_KEYS) {
    try {
      const r = await enqueueStyleRebuild(key, 'cron')
      results[key] = `taak ${r.jobId} (${r.mails} mails)`
    } catch (e) {
      results[key] = e instanceof Error ? e.message : 'mislukt'
    }
  }
  return NextResponse.json(results)
}
