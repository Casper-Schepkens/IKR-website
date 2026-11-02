import 'server-only'
import { isDemoMode } from '../env'

/**
 * Cold mails via Apollo (alleen lezen). Docs: docs.apollo.io
 * - POST /api/v1/emailer_campaigns/search: sequences met stats
 * - GET  /api/v1/emailer_messages/search:  ingeplande mails (om te tellen wat er nog moet vertrekken)
 */

const BASE = 'https://api.apollo.io/api/v1'
/** Ververs de cijfers hooguit om de 5 minuten (Apollo-limiet: 600 calls/uur per endpoint). */
const REVALIDATE = 300

export type Sequence = {
  id: string
  name: string
  active: boolean
  url: string
  delivered: number
  replied: number
  unsubscribed: number
  bounced: number
  stepPositions: Record<string, number>
}

export type ColdMailStats = {
  sequences: Sequence[]
  /** Ingeplande mails in actieve sequences (eerste mails + opvolgmails). */
  scheduled: number
  /** Ingeplande eerste mails: adressen die nog geen enkele mail kregen. */
  newAddresses: number
}

export function isApolloConfigured() {
  return Boolean(process.env.APOLLO_API_KEY)
}

async function apollo<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.APOLLO_API_KEY!, ...init?.headers },
    next: { revalidate: REVALIDATE },
  })
  if (res.status === 401) throw new Error('De Apollo API-sleutel is ongeldig.')
  if (res.status === 429) throw new Error('Even te veel aanvragen bij Apollo. Probeer het binnen een paar minuten opnieuw.')
  if (!res.ok) throw new Error(`Apollo antwoordde met ${res.status}.`)
  return res.json() as Promise<T>
}

type RawCampaign = {
  id: string
  name: string
  archived: boolean
  active: boolean
  sequence_url?: string
  unique_delivered?: number | string
  unique_replied?: number | string
  unique_unsubscribed?: number | string
  unique_bounced?: number | string
  emailer_steps?: { id: string; position: number }[]
}

const num = (v: unknown) => (typeof v === 'number' ? v : 0)

export async function coldMailStats(): Promise<ColdMailStats> {
  if (!isApolloConfigured() && isDemoMode()) return DEMO

  const { emailer_campaigns } = await apollo<{ emailer_campaigns: RawCampaign[] }>(
    '/emailer_campaigns/search?per_page=100',
    { method: 'POST' },
  )
  const sequences: Sequence[] = emailer_campaigns
    .filter((c) => !c.archived)
    .map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      url: c.sequence_url ?? `https://app.apollo.io#/sequences/${c.id}`,
      delivered: num(c.unique_delivered),
      replied: num(c.unique_replied),
      unsubscribed: num(c.unique_unsubscribed),
      bounced: num(c.unique_bounced),
      stepPositions: Object.fromEntries((c.emailer_steps ?? []).map((s) => [s.id, s.position])),
    }))

  const active = sequences.filter((s) => s.active)
  const positions = Object.assign({}, ...active.map((s) => s.stepPositions)) as Record<string, number>
  let scheduled = 0
  let newAddresses = 0
  if (active.length) {
    const params = new URLSearchParams({ per_page: '100' })
    params.append('emailer_message_stats[]', 'scheduled')
    active.forEach((s) => params.append('emailer_campaign_ids[]', s.id))
    // Hooguit 10 pagina's (1.000 ingeplande mails): ruim genoeg voor een seintje.
    for (let page = 1; page <= 10; page++) {
      params.set('page', String(page))
      const { emailer_messages } = await apollo<{ emailer_messages: { emailer_step_id?: string }[] }>(
        `/emailer_messages/search?${params}`,
      )
      scheduled += emailer_messages.length
      newAddresses += emailer_messages.filter((m) => m.emailer_step_id && positions[m.emailer_step_id] === 1).length
      if (emailer_messages.length < 100) break
    }
  }
  return { sequences, scheduled, newAddresses }
}

const DEMO: ColdMailStats = {
  sequences: [
    { id: 'demo1', name: 'IKR okt 2026 (demo)', active: true, url: '#', delivered: 86, replied: 9, unsubscribed: 5, bounced: 0, stepPositions: {} },
    { id: 'demo2', name: 'IKR new 1 (demo)', active: false, url: '#', delivered: 739, replied: 119, unsubscribed: 0, bounced: 45, stepPositions: {} },
  ],
  scheduled: 14,
  newAddresses: 6,
}
