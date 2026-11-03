import 'server-only'
import { after } from 'next/server'
import { createServiceSupabase } from '../supabase/server'
import { hasScopes, listConnections, SCOPES } from '../google'
import { sentReplies } from '../gmail'
import { aiEngine, enqueue, runJob } from './jobs'
import { notifyGrok } from './notify'
import { getProfiles, STYLE_MAILBOX, type StyleKey } from './style-profile'

const db = () => createServiceSupabase()

/** Zet een taak klaar om het profiel opnieuw op te bouwen (Grokbot of de API voert ze uit). */
export async function enqueueStyleRebuild(key: StyleKey, by: string) {
  const mailbox = STYLE_MAILBOX[key]
  const conn = (await listConnections()).find((c) => c.email === mailbox)
  if (!hasScopes(conn, [SCOPES.gmailRead]))
    throw new Error(`${mailbox} mag nog geen mails lezen: koppel het (opnieuw) in Instellingen.`)
  const mails = await sentReplies(mailbox, { days: 180, maxThreads: 150, maxReplies: 120 })
  if (mails.length < 5) throw new Error(`Te weinig verzonden antwoorden gevonden voor ${mailbox} (${mails.length}).`)
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
