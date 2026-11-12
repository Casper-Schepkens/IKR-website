/** Zijbalk: eigen volgorde en vastgepinde items per persoon. Onbekende/nieuwe items komen achteraan in standaardvolgorde. */
export type NavPrefs = { order: string[]; pinned: string[] }
export const EMPTY_NAV: NavPrefs = { order: [], pinned: [] }

export function arrangeNav<T extends { href: string }>(items: T[], prefs: NavPrefs) {
  const byHref = new Map(items.map((i) => [i.href, i]))
  const pinned = prefs.pinned.map((h) => byHref.get(h)).filter((x): x is T => Boolean(x))
  const pinnedSet = new Set(pinned.map((p) => p.href))
  const ordered = prefs.order.map((h) => byHref.get(h)).filter((x): x is T => Boolean(x) && !pinnedSet.has(x!.href))
  const seen = new Set([...pinnedSet, ...ordered.map((o) => o.href)])
  const rest = [...ordered, ...items.filter((i) => !seen.has(i.href))]
  return { pinned, rest }
}

/** Veilige opslag: enkel strings die op een dashboardpad lijken, zonder dubbels, max. 50. */
export function cleanNavPrefs(raw: { order?: unknown; pinned?: unknown }): NavPrefs {
  const list = (v: unknown) => [...new Set((Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && /^\/admin(\/[\w-]+)*$/.test(x)))].slice(0, 50)
  return { order: list(raw.order), pinned: list(raw.pinned) }
}
