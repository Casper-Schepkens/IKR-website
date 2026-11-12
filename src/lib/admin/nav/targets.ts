/** "Ga naar …": pagina's en items in het dashboard waar je naartoe kan springen (zoals Ctrl+K in Odoo). */

export type NavTarget = { label: string; sub: string; href: string; kind: 'pagina' | 'klant' | 'productie' | 'lead' | 'weekly' | 'sop'; keywords?: string }

export const PAGES: (NavTarget & { sales?: boolean })[] = [
  { label: 'Cold mails', sub: 'Pagina', href: '/admin/sales/cold-mails', kind: 'pagina', keywords: 'apollo sequences', sales: true },
  { label: 'Inbox', sub: 'Pagina', href: '/admin/sales/inbox', kind: 'pagina', keywords: 'mails antwoorden concepten', sales: true },
  { label: 'Calls', sub: 'Pagina', href: '/admin/sales/calls', kind: 'pagina', keywords: 'sales setter call', sales: true },
  { label: 'Leads', sub: 'Pagina', href: '/admin/sales', kind: 'pagina', keywords: 'sales funnel', sales: true },
  { label: 'Wachten op antwoord', sub: 'Pagina', href: '/admin/sales/inbox?tab=wachten', kind: 'pagina', keywords: 'opvolgen', sales: true },
  { label: 'Klanten', sub: 'Pagina', href: '/admin/klanten', kind: 'pagina', keywords: 'contract freelancer' },
  { label: 'Financiën', sub: 'Pagina', href: '/admin/financien', kind: 'pagina', keywords: 'financien odoo omzet kosten geld betalingen' },
  { label: 'Productie', sub: 'Pagina', href: '/admin/productie', kind: 'pagina', keywords: 'proces draaidag briefing volgende stappen' },
  { label: 'Weekly', sub: 'Pagina', href: '/admin/weekly', kind: 'pagina', keywords: 'todo to-do prikbord' },
  { label: 'Kalender', sub: 'Pagina', href: '/admin/kalender', kind: 'pagina', keywords: 'agenda planning' },
  { label: "SOP's", sub: 'Pagina', href: '/admin/sops', kind: 'pagina', keywords: 'sops afspraken best practices' },
  { label: 'Instellingen', sub: 'Pagina', href: '/admin/instellingen', kind: 'pagina', keywords: 'koppelingen agenda mail gmail' },
]

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Woorden die enkel zeggen "breng me ernaartoe" (geen zoekterm). */
const FILLER = new Set(['ga', 'naar', 'open', 'openen', 'opendoen', 'zet', 'eens', 'es', 'ns', 'de', 'het', 'een', 'pagina', 'van', 'toon', 'laat', 'zien', 'mij', 'me', 'even', 'eventjes', 'aub', 'pls', 'please', 'nu', 'fiche', 'scherm', 'tab'])
/** Zinnen die de chatbalk als navigatie herkent (in plaats van een vraag aan Grok Bot). */
const NAV_START = /^(ga (eens |es |nu )?naar|open|toon|zet (de |het )?(pagina|fiche)|naar )|\b(open zetten|eens open|es open|openzetten)\b/

export function isNavCommand(text: string) {
  const t = norm(text)
  return t.length <= 80 && NAV_START.test(t)
}

const KIND_WORDS: Record<string, NavTarget['kind']> = { klant: 'klant', klanten: 'klant', productie: 'productie', lead: 'lead', leads: 'lead', weekly: 'weekly', sop: 'sop', sops: 'sop' }

/** Zoekt doelen; woorden als "klant" of "productie" sturen mee welke soort het moet zijn. */
export function searchTargets(targets: NavTarget[], query: string, limit = 8) {
  const words = norm(query).split(' ').filter((w) => w && !FILLER.has(w))
  const kindHints = new Set(words.map((w) => KIND_WORDS[w]).filter(Boolean))
  const terms = words.filter((w) => !KIND_WORDS[w] || words.length === 1)
  if (!terms.length && !kindHints.size) return []
  const scored = targets
    .map((t) => {
      const label = norm(t.label)
      // Titel: overal in de tekst; soort en zoekwoorden: enkel vooraan een woord (anders vindt "fin" ook "briefing").
      const extra = `${norm(t.sub)} ${norm(t.keywords ?? '')}`.split(' ')
      if (!terms.every((w) => label.includes(w) || extra.some((x) => x.startsWith(w)))) return null
      let score = 0
      for (const w of terms) {
        if (label === w) score += 6
        else if (label.startsWith(w)) score += 4
        else if (label.split(' ').some((x) => x.startsWith(w))) score += 3
        else if (label.includes(w)) score += 2
        else score += 1
      }
      if (kindHints.has(t.kind)) score += 5
      else if (kindHints.size && t.kind !== 'pagina') score -= 2
      if (t.kind === 'pagina' && terms.length === 0 && kindHints.size) score += 1
      return { t, score }
    })
    .filter((x): x is { t: NavTarget; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.t.label.localeCompare(b.t.label))
  return scored.slice(0, limit).map((x) => x.t)
}

/** Eén duidelijk doel (voor de chatbalk): het beste als het duidelijk beter is dan het tweede. */
export function bestTarget(targets: NavTarget[], query: string): NavTarget | null {
  const hits = searchTargets(targets, query, 2)
  if (!hits.length) return null
  if (hits.length === 1) return hits[0]
  const again = searchTargets(targets, query, 50)
  // Herhaal de score-berekening via de volgorde: als het eerste een exacte titelmatch is, nemen we dat.
  const q = norm(query)
    .split(' ')
    .filter((w) => w && !FILLER.has(w) && !KIND_WORDS[w])
    .join(' ')
  const exact = again.filter((t) => norm(t.label) === q)
  if (exact.length) {
    const kinds = new Set(norm(query).split(' ').map((w) => KIND_WORDS[w]).filter(Boolean))
    return exact.find((t) => kinds.has(t.kind)) ?? exact[0]
  }
  return hits[0]
}
