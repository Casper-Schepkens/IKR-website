import { NextResponse } from 'next/server'
import { enqueueStyleRebuild } from '@/lib/admin/ai/style'
import { STYLE_KEYS } from '@/lib/admin/ai/style-profile'
import { isAiConfigured } from '@/lib/admin/ai/jobs'
import { cronAuthorized, finishCron } from '@/lib/admin/cron'

export const maxDuration = 120

/** Elke maandag: de schrijfstijlprofielen opnieuw laten opbouwen (Grokbot of API). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAiConfigured()) return finishCron('style_profiles', {}, ['geen AI ingesteld (IKR_AI_ENGINE of ANTHROPIC_API_KEY)'])
  const results: Record<string, string> = {}
  const problems: string[] = []
  for (const key of STYLE_KEYS) {
    try {
      const r = await enqueueStyleRebuild(key, 'cron')
      results[key] = `taak ${r.jobId} (${r.mails} mails)`
    } catch (e) {
      results[key] = e instanceof Error ? e.message : 'mislukt'
      problems.push(`${key}: ${results[key]}`)
    }
  }
  return finishCron('style_profiles', results, problems)
}
