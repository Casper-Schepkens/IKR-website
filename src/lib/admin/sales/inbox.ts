import 'server-only'
import { SALES_EMAIL } from '../env'
import { hasScopes, isGoogleConfigured, listConnections, SCOPES } from '../google'
import { recentThreads, type Mail, type Thread } from '../gmail'
import { enqueue, jobsByRef, type AiJob } from '../ai/jobs'
import type { AdminSession } from '../session'
import type { Lead } from './types'

export type InboxItem = {
  thread: Thread
  last: Mail
  lead: Lead
  job: AiJob | null
  /** nieuw = eerste reactie van de lead; gemaild = er wordt al heen en weer gemaild. */
  tab: 'nieuw' | 'gemaild'
}

export type InboxResult =
  | { status: 'not_connected'; reason: string }
  | { status: 'ok'; items: InboxItem[]; pendingJobIds: string[] }

const isCasper = (m: Mail) => m.fromEmail === SALES_EMAIL
const isInternal = (m: Mail) => m.fromEmail.endsWith('@iknowright.be')

/**
 * Sales-mails die op een antwoord wachten: threads die Casper begon (cold mail via Apollo) of
 * met een bekende lead, waarvan de laatste mail van de lead komt.
 */
export async function loadInbox(session: AdminSession): Promise<InboxResult> {
  if (!isGoogleConfigured()) return { status: 'not_connected', reason: 'Google is nog niet ingesteld.' }
  const conn = (await listConnections()).find((c) => c.email === SALES_EMAIL)
  if (!hasScopes(conn, [SCOPES.gmailRead, SCOPES.gmailSend]))
    return { status: 'not_connected', reason: 'Gmail is nog niet gekoppeld: klik in Instellingen op "Connect Gmail".' }

  const [threads, leads] = await Promise.all([recentThreads(SALES_EMAIL), session.leads.list()])
  const byEmail = new Map(leads.filter((l) => l.email).map((l) => [l.email!.toLowerCase(), l]))

  const waiting = threads.filter((t) => {
    const last = t.mails[t.mails.length - 1]
    if (!last || isInternal(last)) return false
    return isCasper(t.mails[0]) || byEmail.has(last.fromEmail)
  })

  const items: Omit<InboxItem, 'job'>[] = []
  for (const t of waiting) {
    const last = t.mails[t.mails.length - 1]
    let lead = byEmail.get(last.fromEmail)
    if (!lead) {
      // Een lead bestaat vanaf het eerste mailverkeer.
      try {
        lead = await session.leads.create({
          name: last.fromName,
          company: null,
          email: last.fromEmail,
          phone: null,
          source: isCasper(t.mails[0]) ? 'cold_mail' : 'other',
        })
        byEmail.set(last.fromEmail, lead)
      } catch {
        continue
      }
    }
    if (lead.stage === 'lost' || lead.stage === 'won') continue
    const external = t.mails.filter((m) => !isInternal(m)).length
    items.push({ thread: t, last, lead, tab: external > 1 ? 'gemaild' : 'nieuw' })
  }

  const refs = items.map((i) => `gmail:${i.last.id}`)
  const existing = new Map((await jobsByRef('inbox_reply', refs)).map((j) => [j.ref, j]))
  const pendingJobIds: string[] = []
  const withJobs: InboxItem[] = []
  for (const i of items) {
    const ref = `gmail:${i.last.id}`
    let job = existing.get(ref) ?? null
    if (!job) {
      job = await enqueue(
        'inbox_reply',
        ref,
        {
          lead: { id: i.lead.id, name: i.lead.name, company: i.lead.company, notes: i.lead.notes, next_action: i.lead.next_action },
          messages: i.thread.mails.slice(-8).map((m) => ({ from: m.fromName, date: m.date, text: m.text, fromCasper: isCasper(m) })),
        },
        session.user.email,
      )
    }
    if (job.status === 'dismissed') continue
    if (job.status === 'pending') pendingJobIds.push(job.id)
    withJobs.push({ ...i, job })
  }
  withJobs.sort((a, b) => b.last.date.localeCompare(a.last.date))
  return { status: 'ok', items: withJobs, pendingJobIds }
}
