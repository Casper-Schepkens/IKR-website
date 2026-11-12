/**
 * Meldingsbadges in de zijbalk: per pagina hoeveel er op de ingelogde gebruiker wacht.
 * Enkel wat iemand zelf moet doen en mag zien (sales-dingen enkel voor Casper). Pure telfuncties.
 */
import { contractTone, daysLeft } from '../clients/types'
import type { Card } from '../workspace/types'

export const NOTIFY_PAGES = {
  werkplek: '/admin/werkplek',
  sops: '/admin/sops',
  weekly: '/admin/weekly',
  productie: '/admin/productie',
  inbox: '/admin/sales/inbox',
  calls: '/admin/sales/calls',
  leads: '/admin/sales',
  klanten: '/admin/klanten',
  financien: '/admin/financien',
} as const
export type NotifyKey = keyof typeof NOTIFY_PAGES
export type Counts = Partial<Record<NotifyKey, number>>

/** Werkplek: eigen open kaarten die nieuw zijn / een nieuw botbericht hebben, of op "Doe maar" wachten. */
export const countWorkspace = (cards: Pick<Card, 'owner_email' | 'status' | 'unread' | 'action_status'>[], email: string) =>
  cards.filter((c) => c.owner_email.toLowerCase() === email.toLowerCase() && c.status === 'open' && (c.unread || c.action_status === 'voorgesteld')).length

export const countSopProposals = (sops: { status: string }[]) => sops.filter((s) => s.status === 'voorstel').length

/** Weekly: eigen gewone to-do's die niet af waren op een afgesloten weekly ("Niet af vorige weekly"). */
export function countOverdueTodos(todos: { owner: string; kind: string; done_at: string | null; weekly_id: string | null }[], weeklies: { id: string; status: string }[], owner: string) {
  const concluded = new Set(weeklies.filter((w) => w.status === 'concluded').map((w) => w.id))
  return todos.filter((t) => t.owner === owner && t.kind === 'weekly' && !t.done_at && t.weekly_id && concluded.has(t.weekly_id)).length
}

/** Calls: voorbij maar nog niet afgerond. */
export const countCallsToFinish = (calls: { status: string; ends_at: string }[], now: number) => calls.filter((c) => c.status === 'gepland' && Date.parse(c.ends_at) < now).length

/** Leads: open leads met een opvolgdatum vandaag of eerder. */
export const countFollowUps = (leads: { stage: string; follow_up_on: string | null }[], today: string) =>
  leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost' && l.follow_up_on && l.follow_up_on <= today).length

/** Klanten: contracten die binnen 30 dagen aflopen of verlopen zijn. */
export const countExpiring = (clients: { contract_end: string | null; contract_indefinite?: boolean }[], today: string) =>
  clients.filter((c) => contractTone(daysLeft(c, today)) === 'red').length

export const total = (c: Counts) => Object.values(c).reduce((a, n) => a + (n ?? 0), 0)
/** Badge: niets bij 0, "9+" boven 9. */
export const badge = (n: number | undefined) => (!n ? null : n > 9 ? '9+' : String(n))
/** Tabtitel met het totaal ervoor, zonder een vorige teller te stapelen. */
export const titleWithCount = (title: string, n: number) => {
  const base = title.replace(/^\(\d+\+?\)\s*/, '')
  return n ? `(${n > 99 ? '99+' : n}) ${base}` : base
}
