import 'server-only'
import type { AdminSession } from './session'
import { addDays, daysBetween, euro, fmtDate, isoDay } from './format'
import { daysUntil } from './billing'

export type TodoTag = 'factuur' | 'ideeen' | 'draaidag' | 'contract' | 'lead'

export type Todo = {
  id: string
  title: string
  detail: string
  tag: TodoTag
  href: string
  owner: string | null
  action?:
    | { kind: 'invoice'; invoiceId: string }
    | { kind: 'email'; clientId: string; purpose: 'idea_feedback' | 'renewal' | 'lead_intro' }
    | { kind: 'brief'; eventId: string }
}

/** Actiepunten worden berekend uit de data — geen aparte takenlijst om bij te houden. */
export async function computeTodos(session: AdminSession): Promise<Todo[]> {
  const now = new Date()
  const today = isoDay(now)
  const [clients, invoices, contracts, events] = await Promise.all([
    session.repo.listClients(),
    session.repo.listInvoices({ statuses: ['to_send', 'draft', 'overdue'] }),
    session.repo.listContracts(),
    session.repo.listEvents(now.toISOString(), addDays(now, 8).toISOString()),
  ])
  const byId = new Map(clients.map((c) => [c.id, c]))
  const todos: Todo[] = []

  for (const inv of invoices) {
    const c = byId.get(inv.client_id)
    const d = daysUntil(inv.send_date, today)
    if (d > 7) continue
    todos.push({
      id: `inv-${inv.id}`,
      title:
        inv.status === 'overdue'
          ? 'Factuur te laat betaald'
          : `Factuur ${inv.label?.toLowerCase() ?? ''} versturen`.trim(),
      detail: `${c?.name ?? '—'} · ${euro(inv.amount_cents)} · ${d < 0 ? `${-d} dagen te laat` : d === 0 ? 'vandaag' : `deadline ${fmtDate(inv.send_date, { weekday: 'short', day: 'numeric', month: 'short' })}`}`,
      tag: 'factuur',
      href: `/admin/klanten/${inv.client_id}?tab=contract`,
      owner: c?.owner ?? null,
      action: { kind: 'invoice', invoiceId: inv.id },
    })
  }

  for (const c of clients) {
    const inStage = daysBetween(c.stage_changed_at, now)
    if (c.stage === 'ideas' && inStage >= 3) {
      todos.push({
        id: `ideas-${c.id}`,
        title: 'Feedback opvolgen op content-ideeën',
        detail: `${c.name} · ${inStage} dagen geen beslissing`,
        tag: 'ideeen',
        href: `/admin/klanten/${c.id}?tab=ideeen`,
        owner: c.owner,
        action: { kind: 'email', clientId: c.id, purpose: 'idea_feedback' },
      })
    }
    if (c.stage === 'lead' && inStage >= 2) {
      todos.push({
        id: `lead-${c.id}`,
        title: 'Nieuwe lead opvolgen',
        detail: `${c.name} · ${c.source ? `via ${c.source} · ` : ''}${inStage} dagen geleden`,
        tag: 'lead',
        href: `/admin/klanten/${c.id}`,
        owner: c.owner,
        action: { kind: 'email', clientId: c.id, purpose: 'lead_intro' },
      })
    }
  }

  for (const k of contracts) {
    if (k.status !== 'active' || !k.end_date) continue
    const d = daysUntil(k.end_date, today)
    if (d < 0 || d > Math.max(45, k.renewal_notice_days)) continue
    const c = byId.get(k.client_id)
    todos.push({
      id: `contract-${k.id}`,
      title: `Contract loopt af over ${d} dagen`,
      detail: `${c?.name ?? '—'} · ${k.package_name ?? ''} · verlenging bespreken`,
      tag: 'contract',
      href: `/admin/klanten/${k.client_id}?tab=contract`,
      owner: c?.owner ?? null,
      action: { kind: 'email', clientId: k.client_id, purpose: 'renewal' },
    })
  }

  for (const e of events) {
    if (e.kind !== 'shoot' || e.brief) continue
    const c = e.client_id ? byId.get(e.client_id) : null
    todos.push({
      id: `brief-${e.id}`,
      title: 'Draaiboek maken voor draaidag',
      detail: `${c?.name ?? e.title} · ${fmtDate(e.starts_at, { weekday: 'long', day: 'numeric', month: 'short' })}`,
      tag: 'draaidag',
      href: `/admin/kalender?event=${e.id}`,
      owner: c?.owner ?? null,
      action: { kind: 'brief', eventId: e.id },
    })
  }

  const order: TodoTag[] = ['factuur', 'draaidag', 'ideeen', 'lead', 'contract']
  return todos.sort((a, b) => order.indexOf(a.tag) - order.indexOf(b.tag))
}
