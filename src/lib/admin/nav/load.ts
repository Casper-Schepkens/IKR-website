import 'server-only'
import { canSeeSales } from '../env'
import type { AdminSession } from '../session'
import { PAGES, type NavTarget } from './targets'

/** Alle doelen voor deze gebruiker (sales enkel voor Casper). */
export async function navTargets(session: AdminSession): Promise<NavTarget[]> {
  const sales = canSeeSales(session.user.email)
  const [clients, sops, weeklies, leads] = await Promise.all([
    session.clients.list().catch(() => []),
    session.sops.list().catch(() => []),
    session.weekly.listWeeklies().catch(() => []),
    sales ? session.leads.list().catch(() => []) : Promise.resolve([]),
  ])
  const day = (iso: string) => new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Brussels' })
  return [
    ...PAGES.filter((p) => !p.sales || sales).map(({ sales: _s, ...p }) => p),
    ...clients.flatMap((c): NavTarget[] => [
      { label: c.name, sub: 'Klant', href: `/admin/klanten?klant=${c.id}`, kind: 'klant' },
      { label: c.name, sub: 'Productie', href: `/admin/productie?klant=${c.id}`, kind: 'productie' },
    ]),
    ...leads.map((l): NavTarget => ({ label: l.company ? `${l.name} (${l.company})` : l.name, sub: 'Lead', href: `/admin/sales/leads/${l.id}`, kind: 'lead', keywords: `${l.company ?? ''} ${l.email ?? ''}` })),
    ...weeklies.slice(-12).map((w): NavTarget => ({ label: `Weekly ${day(w.starts_at)}`, sub: w.status === 'concluded' ? 'Weekly (afgesloten)' : 'Weekly', href: `/admin/weekly/${w.id}`, kind: 'weekly' })),
    ...sops.filter((s) => s.status !== 'verouderd').map((s): NavTarget => ({ label: s.title, sub: "SOP", href: `/admin/sops?q=${encodeURIComponent(s.title)}`, kind: 'sop' })),
  ]
}
