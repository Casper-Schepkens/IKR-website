import 'server-only'
import { CRON_TOOL_PREFIX } from './cron'
import { createServiceSupabase } from './supabase/server'

/** Wat er op de achtergrond loopt en wanneer het laatst liep (Instellingen). */
export const CRONS = [
  { key: 'weekly_transcripts', label: 'Transcripts en opnames (dagelijks 07:00)', everyHours: 24 },
  { key: 'style_profiles', label: 'Schrijfstijlprofiel (maandag 06:30)', everyHours: 24 * 7 },
] as const

export type CronStatus = { key: string; label: string; lastRun: string | null; ok: boolean | null; error: string | null; late: boolean }
export type SystemStatus = { crons: CronStatus[]; grokFailures: { at: string; error: string | null }[]; failedJobs: number }

/** Stand van de achtergrondtaken. Null als de status niet te lezen is (lokaal zonder service role). */
export async function systemStatus(now = Date.now()): Promise<SystemStatus | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const db = createServiceSupabase()
  const since = new Date(now - 24 * 3600_000).toISOString()
  const [runs, pings, jobs] = await Promise.all([
    db.from('bot_actions').select('tool, ok, error, created_at').eq('bot', 'cron').order('created_at', { ascending: false }).limit(50),
    db.from('bot_actions').select('error, created_at').eq('tool', 'grok_ping').eq('ok', false).gte('created_at', since).order('created_at', { ascending: false }).limit(5),
    db.from('ai_jobs').select('id', { count: 'exact', head: true }).eq('status', 'error').gte('created_at', since),
  ])
  if (runs.error) throw new Error(runs.error.message)
  const crons = CRONS.map((c) => {
    const last = (runs.data ?? []).find((r) => r.tool === `${CRON_TOOL_PREFIX}${c.key}`)
    // Te laat: langer dan de periode plus 2 uur marge niet gelopen.
    const late = !last || now - Date.parse(last.created_at) > (c.everyHours + 2) * 3600_000
    return { key: c.key, label: c.label, lastRun: last?.created_at ?? null, ok: last ? Boolean(last.ok) : null, error: last?.error ?? null, late }
  })
  return { crons, grokFailures: (pings.data ?? []).map((p) => ({ at: p.created_at, error: p.error })), failedJobs: jobs.count ?? 0 }
}

/** Aantal problemen voor het bolletje bij Instellingen. */
export const countProblems = (s: SystemStatus) => s.crons.filter((c) => c.ok === false || c.late).length + (s.grokFailures.length ? 1 : 0) + (s.failedJobs ? 1 : 0)
