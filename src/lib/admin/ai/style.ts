import 'server-only'
import { after } from 'next/server'
import { createServiceSupabase } from '../supabase/server'
import { hasScopes, listConnections, SCOPES } from '../google'
import { sentReplies } from '../gmail'
import { aiEngine, enqueue, runJob } from './jobs'
import { notifyGrok } from './notify'
import { getProfiles, STYLE_SOURCES, type StyleKey } from './style-profile'

const db = () => createServiceSupabase()

/** Zet een taak klaar om het profiel opnieuw op te bouwen (Grokbot of de API voert ze uit). */
export async function enqueueStyleRebuild(key: StyleKey, by: string) {
  // Alle bronnen die gekoppeld zijn met leesrechten; samen max. 120 antwoorden, nieuwste eerst.
  const conns = await listConnections()
  const readable = STYLE_SOURCES.filter((m) => hasScopes(conns.find((c) => c.email === m), [SCOPES.gmailRead]))
  if (!readable.length) throw new Error('Nog geen mailbox met leesrechten: koppel casper@ en contact@ (opnieuw) in Instellingen.')
  const mails = (
    await Promise.all(readable.map((m) => sentReplies(m, { days: 180, maxThreads: 150, maxReplies: 120 })))
  )
    .flat()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 120)
  if (mails.length < 5) throw new Error(`Te weinig verzonden antwoorden gevonden (${mails.length}).`)
  const mailbox = readable.join(' + ')
  const [{ data: feedback }, current] = await Promise.all([
    db().from('style_feedback').select('ai_text, sent_text').eq('key', key).order('created_at', { ascending: false }).limit(30),
    getProfiles().then((ps) => ps.find((p) => p.key === key) ?? null),
  ])
  const job = await enqueue(
    'style_profile',
    `style:${key}:${Date.now()}`,
    { key, mailbox, mails, feedback: feedback ?? [], current: current ? { guide: current.guide } : null },
    by,
  )
  if (aiEngine() === 'grokbot') after(() => notifyGrok([job.id]))
  else if (aiEngine() === 'api') after(() => runJob(job.id))
  return { jobId: job.id, mails: mails.length }
}
