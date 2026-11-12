/** SOP's: afspraken en best practices van het team (zie docs/product/sops.md). */
export const SOP_CATEGORIES = {
  draaidagen: 'Draaidagen & content',
  creatief: 'Creatief & montage',
  klanten: 'Klanten & meetings',
  freelancers: 'Freelancers',
  sales: 'Sales & prijzen',
  contracten: 'Contracten & facturatie',
  intern: 'Intern & tools',
  overig: 'Overig',
} as const
export type SopCategory = keyof typeof SOP_CATEGORIES
export const CATEGORY_KEYS = Object.keys(SOP_CATEGORIES) as SopCategory[]

export const SOP_STATUSES = ['afgesproken', 'voorstel', 'verouderd'] as const
export type SopStatus = (typeof SOP_STATUSES)[number]

export type Sop = {
  id: string
  title: string
  body: string
  category: SopCategory
  status: SopStatus
  /** Waar het vandaan komt, bv. "Weekly 19/11" of "SOP freelancer (Drive)". */
  source: string | null
  source_url: string | null
  /** Bij een voorstel uit een weekly: wat er letterlijk gezegd werd. */
  quote: string | null
  created_by: string | null
  created_via: 'dashboard' | 'grokbot'
  created_at: string
  updated_at: string
}

export type SopInput = Pick<Sop, 'title' | 'body' | 'category'> & Partial<Pick<Sop, 'status' | 'source' | 'source_url' | 'quote'>>

export const isCategory = (c: unknown): c is SopCategory => typeof c === 'string' && c in SOP_CATEGORIES

export function cleanSopInput(raw: { title?: string | null; body?: string | null; category?: string | null; status?: string | null; source?: string | null; source_url?: string | null; quote?: string | null }): SopInput {
  const title = raw.title?.trim() ?? ''
  if (!title) throw new Error('Geef een titel.')
  if (title.length > 200) throw new Error('Titel is te lang (max. 200 tekens).')
  const body = raw.body?.trim() ?? ''
  if (body.length > 20000) throw new Error('Tekst is te lang.')
  const category = raw.category?.trim() || 'overig'
  if (!isCategory(category)) throw new Error(`Onbekende categorie. Kies uit: ${CATEGORY_KEYS.join(', ')}.`)
  const out: SopInput = { title, body, category }
  if (raw.status != null) {
    if (!SOP_STATUSES.includes(raw.status as SopStatus)) throw new Error('Status: afgesproken, voorstel of verouderd.')
    out.status = raw.status as SopStatus
  }
  if (raw.source !== undefined) out.source = raw.source?.trim().slice(0, 300) || null
  if (raw.source_url !== undefined) {
    const u = raw.source_url?.trim() || null
    if (u && !/^https:\/\//.test(u)) throw new Error('Bronlink moet met https:// beginnen.')
    out.source_url = u
  }
  if (raw.quote !== undefined) out.quote = raw.quote?.trim().slice(0, 2000) || null
  return out
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Zoeken: alle woorden moeten voorkomen in titel, tekst of categorie (zonder accenten/hoofdletters).
 * Resultaat: titelmatches eerst, dan op categorie en titel.
 */
export function searchSops(sops: Sop[], q: string, opts: { category?: string | null; status?: SopStatus | 'alle' } = {}) {
  const words = norm(q).split(/\s+/).filter(Boolean)
  const status = opts.status ?? 'afgesproken'
  return sops
    .filter((s) => (status === 'alle' || s.status === status) && (!opts.category || s.category === opts.category))
    .map((s) => {
      const title = norm(s.title)
      const hay = `${title} ${norm(s.body)} ${norm(SOP_CATEGORIES[s.category] ?? '')}`
      const ok = words.every((w) => hay.includes(w))
      const score = words.filter((w) => title.includes(w)).length
      return { s, ok, score }
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.score - a.score || CATEGORY_KEYS.indexOf(a.s.category) - CATEGORY_KEYS.indexOf(b.s.category) || a.s.title.localeCompare(b.s.title))
    .map((x) => x.s)
}
