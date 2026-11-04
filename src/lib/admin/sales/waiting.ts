import 'server-only'
import { SALES_EMAIL } from '../env'
import { hasScopes, isGoogleConfigured, listConnections, SCOPES } from '../google'
import { threadsWith, type Thread } from '../gmail'
import { createServiceSupabase } from '../supabase/server'
import type { AdminSession } from '../session'
import type { Lead } from './types'
import { computeWaiting, openLeads, type WaitingRow } from './waiting-core'

export { daysSince, dayTone, leadContext } from './waiting-core'
export type { WaitingMail, WaitingRow } from './waiting-core'

/**
 * "Wachten op antwoord": leads waar wij als laatste mailden en nog geen echt antwoord kregen.
 * De mails komen uit Gmail (casper@ + andere gekoppelde @iknowright.be-mailboxen met leesrechten)
 * en worden als momentopname bewaard in `sales_waiting`. Pagina en MCP lezen die tabel; Gmail
 * wordt pas opnieuw bevraagd als de momentopname ouder is dan STALE_MS (of bij "Nu bijwerken").
 * Deze feature verstuurt nooit iets.
 */

export const STALE_MS = 10 * 60_000

export type WaitingItem = WaitingRow & { lead: Lead }
export type WaitingResult =
  | { status: 'not_connected'; reason: string }
  | { status: 'ok'; items: WaitingItem[]; syncedAt: string | null; warning: string | null }

type SyncState = { synced_at: string | null; error: string | null }

/** Mailboxen die we mogen lezen: Casper eerst, daarna andere @iknowright.be-accounts met Gmail-leesrechten. */
async function mailboxes() {
  const conns = await listConnections()
  const casper = conns.find((c) => c.email === SALES_EMAIL)
  if (!hasScopes(casper, [SCOPES.gmailRead])) return null
  const others = conns.filter(
    (c) =>
      c.email !== SALES_EMAIL &&
      c.email.endsWith('@iknowright.be') &&
      hasScopes(c, [SCOPES.gmailRead]),
  )
  return [SALES_EMAIL, ...others.map((c) => c.email)]
}

/** Haalt de mails opnieuw op uit Gmail en vervangt de momentopname. */
async function sync(leads: Lead[]): Promise<void> {
  const boxes = await mailboxes()
  if (!boxes)
    throw new Error('Gmail is nog niet gekoppeld: klik in Instellingen op "Connect Gmail".')
  const emails = [...new Set(openLeads(leads).map((l) => l.email!.toLowerCase()))]
  const threads: { mailbox: string; thread: Thread }[] = []
  for (const box of boxes) {
    try {
      for (const thread of await threadsWith(box, emails)) threads.push({ mailbox: box, thread })
    } catch (e) {
      // Casper is verplicht; een extra mailbox die faalt slaan we over.
      if (box === SALES_EMAIL) throw e
    }
  }
  const rows = computeWaiting(leads, threads)
  const db = createServiceSupabase()
  const now = new Date().toISOString()
  if (rows.length) {
    const { error } = await db.from('sales_waiting').upsert(
      rows.map((r) => ({
        lead_id: r.lead_id,
        mailbox: r.mailbox,
        thread_id: r.thread_id,
        mail_id: r.mail.id,
        mail_at: r.mail.date,
        from_email: r.mail.from_email,
        from_name: r.mail.from_name,
        subject: r.mail.subject,
        preview: r.mail.preview,
        synced_at: now,
      })),
    )
    if (error) throw new Error(error.message)
  }
  // Leads die niet meer wachten (bv. er kwam een antwoord) gaan uit de lijst.
  const keep = rows.map((r) => r.lead_id)
  const del = db.from('sales_waiting').delete()
  const { error: delError } = keep.length
    ? await del.not('lead_id', 'in', `(${keep.join(',')})`)
    : await del.neq('lead_id', '00000000-0000-0000-0000-000000000000')
  if (delError) throw new Error(delError.message)
  await db.from('sales_sync_state').upsert({ key: 'waiting', synced_at: now, error: null })
}

async function readSnapshot(): Promise<{ rows: WaitingRow[]; state: SyncState }> {
  const db = createServiceSupabase()
  const [{ data, error }, { data: st }] = await Promise.all([
    db.from('sales_waiting').select('*'),
    db.from('sales_sync_state').select('synced_at, error').eq('key', 'waiting').maybeSingle(),
  ])
  if (error) throw new Error(error.message)
  const rows = (data ?? []).map(
    (r): WaitingRow => ({
      lead_id: r.lead_id,
      mailbox: r.mailbox,
      thread_id: r.thread_id,
      mail: {
        id: r.mail_id,
        date: r.mail_at,
        from_email: r.from_email,
        from_name: r.from_name,
        subject: r.subject,
        preview: r.preview,
      },
    }),
  )
  return { rows, state: (st as SyncState | null) ?? { synced_at: null, error: null } }
}

/**
 * De lijst, langst wachtend eerst. `sync`: 'auto' = Gmail enkel als de momentopname verouderd is,
 * 'force' = nu bijwerken, 'never' = enkel de opgeslagen momentopname (bv. voor tellers).
 */
export async function loadWaiting(
  session: AdminSession,
  opts: { sync?: 'auto' | 'force' | 'never' } = {},
): Promise<WaitingResult> {
  const mode = opts.sync ?? 'auto'
  const leads = await session.leads.list()
  if (session.mode === 'demo')
    return {
      status: 'ok',
      items: attach(demoRows(leads), leads),
      syncedAt: new Date().toISOString(),
      warning: null,
    }
  if (!isGoogleConfigured())
    return { status: 'not_connected', reason: 'Google is nog niet ingesteld.' }

  let snap = await readSnapshot()
  let warning: string | null = null
  const age = snap.state.synced_at
    ? Date.now() - new Date(snap.state.synced_at).getTime()
    : Infinity
  if (mode === 'force' || (mode === 'auto' && age > STALE_MS)) {
    try {
      await sync(leads)
      snap = await readSnapshot()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gmail kon niet bevraagd worden.'
      if (!snap.state.synced_at) {
        if (/niet gekoppeld/.test(msg)) return { status: 'not_connected', reason: msg }
        throw e
      }
      warning = `Bijwerken lukte niet (${msg}); je ziet de stand van de vorige keer.`
    }
  }
  return { status: 'ok', items: attach(snap.rows, leads), syncedAt: snap.state.synced_at, warning }
}

/** Koppelt de lead (live uit de tabel) en laat leads vallen die intussen gewonnen/lost/verwijderd zijn. */
function attach(rows: WaitingRow[], leads: Lead[]): WaitingItem[] {
  const open = new Map(openLeads(leads).map((l) => [l.id, l]))
  return rows
    .filter((r) => open.has(r.lead_id))
    .map((r) => ({ ...r, lead: open.get(r.lead_id)! }))
    .sort((a, b) => a.mail.date.localeCompare(b.mail.date))
}

// ─── Demo (lokaal zonder Supabase/Google) ──────────────────────────────────
const DEMO: {
  name: string
  company: string
  email: string
  notes: string
  days: number
  from: string
  subject: string
  body: string
  next?: string
}[] = [
  {
    name: 'Lotte Peeters',
    company: 'Bakkerij Peeters',
    email: 'lotte@bakkerij-peeters.be',
    notes: '28 okt: interesse in 4 video’s per maand, wil eerst prijzen zien.',
    days: 9,
    from: 'casper@iknowright.be',
    subject: 'Re: TikTok voor Bakkerij Peeters',
    body: 'Hoi Lotte, zoals beloofd de prijzen in bijlage. Laat je weten wat je ervan vindt?',
    next: 'Prijsvoorstel opvolgen',
  },
  {
    name: 'Jonas De Smet',
    company: 'Fietsen De Smet',
    email: 'jonas@fietsendesmet.be',
    notes: 'Setter call gehad, twijfelt over timing (na de winter?).',
    days: 5,
    from: 'contact@iknowright.be',
    subject: 'Re: Voorstel sales call',
    body: 'Dag Jonas, past dinsdag 10u of donderdag 14u voor een korte sales call?',
  },
  {
    name: 'Sara Claes',
    company: 'Studio Claes',
    email: 'sara@studioclaes.be',
    notes: '',
    days: 2,
    from: 'cedric@iknowright.be',
    subject: 'Re: Draaidag',
    body: 'Hoi Sara, ik stuur je straks de planning voor de draaidag door. Nog vragen over de shotlist?',
  },
]

function demoRows(leads: Lead[]): WaitingRow[] {
  const byEmail = new Map(leads.map((l) => [l.email?.toLowerCase(), l]))
  const rows: WaitingRow[] = []
  for (const d of DEMO) {
    const lead = byEmail.get(d.email)
    if (!lead) continue
    const date = new Date(Date.now() - d.days * 86_400_000).toISOString()
    rows.push({
      lead_id: lead.id,
      mailbox: d.from === 'contact@iknowright.be' ? d.from : SALES_EMAIL,
      thread_id: `demo-${lead.id}`,
      mail: {
        id: `demo-${lead.id}`,
        date,
        from_email: d.from,
        from_name: d.from.split('@')[0],
        subject: d.subject,
        preview: d.body,
      },
    })
  }
  return rows
}

/** Demomodus: zet de voorbeeldleads klaar (eenmalig). */
export async function seedDemoWaiting(session: AdminSession) {
  if (session.mode !== 'demo') return
  const existing = new Set((await session.leads.list()).map((l) => l.email))
  for (const d of DEMO) {
    if (existing.has(d.email)) continue
    const l = await session.leads.create({
      name: d.name,
      company: d.company,
      email: d.email,
      phone: null,
      source: 'cold_mail',
      notes: d.notes || null,
      next_action: d.next ?? null,
    })
    await session.leads.patch(l.id, { notes: d.notes || null, next_action: d.next ?? null })
  }
}
