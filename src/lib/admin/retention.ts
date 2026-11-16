import 'server-only'
import { createServiceSupabase } from './supabase/server'

/** Hoe lang volledige inhoud (mailteksten, transcripts, toolargumenten) in de logs blijft. */
export const RETENTION_DAYS = 90

/**
 * Na 90 dagen de inhoud uit de logs halen, maar de rijen zelf houden (wat, wanneer, wie, gelukt of niet):
 * ai_jobs.input en .output en bot_actions.args. Draait dagelijks mee met de cron. Niets wordt verwijderd.
 */
export async function purgeOldLogContent(now = Date.now()) {
  const db = createServiceSupabase()
  const before = new Date(now - RETENTION_DAYS * 86_400_000).toISOString()
  const jobs = await db
    .from('ai_jobs')
    .update({ input: {}, output: null })
    .lt('created_at', before)
    .in('status', ['done', 'dismissed', 'error'])
    .neq('input', '{}')
    .select('id')
  if (jobs.error) throw new Error(`ai_jobs: ${jobs.error.message}`)
  const actions = await db.from('bot_actions').update({ args: null }).lt('created_at', before).not('args', 'is', null).select('id')
  if (actions.error) throw new Error(`bot_actions: ${actions.error.message}`)
  return { taken: jobs.data?.length ?? 0, botacties: actions.data?.length ?? 0 }
}
