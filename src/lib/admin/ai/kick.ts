import 'server-only'
import { after } from 'next/server'
import { createServiceSupabase } from '../supabase/server'
import { aiEngine, getJob, runJob } from './jobs'
import { notifyGrok } from './notify'

/** Taken die zonder tools kunnen: als Grok onbereikbaar is, mogen ze via de Claude API (als er een sleutel is). */
const NEEDS_TOOLS = new Set(['chat', 'werkplek'])

export const GROK_UNREACHABLE = 'Grok Bot is nu niet bereikbaar (de automation reageerde niet). Probeer het straks opnieuw of zeg het aan Casper.'

/**
 * Zet AI-taken aan het werk volgens de engine. Bij Grokbot: pingen, en als dat mislukt niet stil
 * laten liggen: taken zonder tools via de API, chat en werkplek krijgen een duidelijke melding.
 * Faalt nooit hard.
 */
export async function kickJobs(ids: string[]) {
  if (!ids.length) return
  try {
    const engine = aiEngine()
    if (engine === 'api') {
      for (const id of ids) await runJob(id)
      return
    }
    // Taken zonder tools (tekst van buitenaf) via de API; de rest naar Grokbot of de worker.
    const jobs = await Promise.all(ids.map((id) => getJob(id)))
    const viaApi = jobs.filter((j) => j && aiEngine(j.type) === 'api').map((j) => j!.id)
    for (const id of viaApi) await runJob(id)
    const rest = ids.filter((id) => !viaApi.includes(id))
    if (engine === 'worker' || !rest.length) return
    const reason = await notifyGrok(rest)
    if (reason === true) return
    await logPingFailure(rest, typeof reason === 'string' ? reason : 'geen antwoord')
    for (const id of rest) await handleUnreachable(id)
  } catch (e) {
    console.error('[ai] taken starten mislukt', e)
  }
}

/** Zelfde als kickJobs, maar na het antwoord van de request (of meteen buiten een request, bv. in tests). */
export function kickJobsLater(ids: string[]) {
  if (!ids.length) return
  try {
    after(() => kickJobs(ids))
  } catch {
    void kickJobs(ids)
  }
}

async function handleUnreachable(id: string) {
  const job = await getJob(id)
  if (!job || job.status !== 'pending') return
  if (!NEEDS_TOOLS.has(job.type)) {
    // Zonder tools: via de API als die ingesteld is, anders blijft de taak open voor Grok later.
    if (process.env.ANTHROPIC_API_KEY) await runJob(id, { force: true })
    return
  }
  const db = createServiceSupabase()
  const input = job.input as { user_id?: string; page?: string | null; kaart?: { id?: string } }
  await db.from('ai_jobs').update({ status: 'error', error: GROK_UNREACHABLE, finished_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending')
  if (job.type === 'chat' && input.user_id) await db.from('ai_chat').insert({ user_id: input.user_id, role: 'bot', text: GROK_UNREACHABLE, page: input.page ?? null })
  if (job.type === 'werkplek' && input.kaart?.id) {
    await db.from('bot_card_messages').insert({ card_id: input.kaart.id, author: 'grokbot', body: GROK_UNREACHABLE })
    await db.from('bot_cards').update({ bot_busy_since: null, unread: true, updated_at: new Date().toISOString() }).eq('id', input.kaart.id)
  }
}

async function logPingFailure(ids: string[], reason: string) {
  console.error('[grok] ping mislukt', reason)
  await createServiceSupabase()
    .from('bot_actions')
    .insert({ bot: 'dashboard', tool: 'grok_ping', ok: false, error: reason.slice(0, 500), args: { job_ids: ids } })
    .then(
      () => undefined,
      () => undefined,
    )
}
