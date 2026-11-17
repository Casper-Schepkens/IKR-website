/**
 * Zijbalk per persoon: eigen volgorde, vastgepinde items en verborgen pagina's. Onbekende/nieuwe items komen
 * achteraan in standaardvolgorde. hidden = null: de standaard (zie defaultHidden).
 */
export type NavPrefs = { order: string[]; pinned: string[]; hidden: string[] | null }
export const EMPTY_NAV: NavPrefs = { order: [], pinned: [], hidden: null }

/** Pagina's die je in je menu kan zetten (Instellingen staat er altijd in). */
export const MENU_PAGES = [
  { href: '/admin/werkplek', label: 'Grok Bot' },
  { href: '/admin/sales/cold-mails', label: 'Cold mails', sales: true },
  { href: '/admin/sales/inbox', label: 'Inbox', sales: true },
  { href: '/admin/sales/calls', label: 'Calls', sales: true },
  { href: '/admin/sales', label: 'Leads', sales: true },
  { href: '/admin/whatsapp', label: 'WhatsApp', sales: true },
  { href: '/admin/klanten', label: 'Klanten' },
  { href: '/admin/financien', label: 'Financiën' },
  { href: '/admin/productie', label: 'Productie' },
  { href: '/admin/weekly', label: 'Weekly' },
  { href: '/admin/kalender', label: 'Kalender' },
  { href: '/admin/sops', label: "SOP's" },
] as const satisfies readonly { href: string; label: string; sales?: boolean }[]

export const SALES_PAGES: string[] = MENU_PAGES.filter((p) => 'sales' in p && p.sales).map((p) => p.href)
const MENU_HREFS = new Set<string>(MENU_PAGES.map((p) => p.href))

/** Standaard: Casper (sales) ziet alles, de anderen alles behalve de sales-pagina's. Openen mag iedereen. */
export const defaultHidden = (salesOwner: boolean): string[] => (salesOwner ? [] : SALES_PAGES)

/** Welke pagina's niet in het menu staan voor deze persoon. */
export const hiddenPages = (prefs: Pick<NavPrefs, 'hidden'>, salesOwner: boolean) => prefs.hidden ?? defaultHidden(salesOwner)

/** Staat er minstens één sales-pagina in het menu? (dan ook de sales-meldingen) */
export const showsSales = (prefs: Pick<NavPrefs, 'hidden'>, salesOwner: boolean) => {
  const hidden = new Set(hiddenPages(prefs, salesOwner))
  return SALES_PAGES.some((h) => !hidden.has(h))
}

export function arrangeNav<T extends { href: string }>(items: T[], prefs: Pick<NavPrefs, 'order' | 'pinned'>) {
  const byHref = new Map(items.map((i) => [i.href, i]))
  const pinned = prefs.pinned.map((h) => byHref.get(h)).filter((x): x is T => Boolean(x))
  const pinnedSet = new Set(pinned.map((p) => p.href))
  const ordered = prefs.order.map((h) => byHref.get(h)).filter((x): x is T => Boolean(x) && !pinnedSet.has(x!.href))
  const seen = new Set([...pinnedSet, ...ordered.map((o) => o.href)])
  const rest = [...ordered, ...items.filter((i) => !seen.has(i.href))]
  return { pinned, rest }
}

/** Veilige opslag: enkel strings die op een dashboardpad lijken, zonder dubbels, max. 50. */
export function cleanNavPrefs(raw: { order?: unknown; pinned?: unknown; hidden?: unknown }): NavPrefs {
  const list = (v: unknown) => [...new Set((Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && /^\/admin(\/[\w-]+)*$/.test(x)))].slice(0, 50)
  return { order: list(raw.order), pinned: list(raw.pinned), hidden: Array.isArray(raw.hidden) ? list(raw.hidden).filter((h) => MENU_HREFS.has(h)) : null }
}
