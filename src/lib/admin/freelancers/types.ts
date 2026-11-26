import { fold } from '../search'

/**
 * Score = de fase uit Milans kleurensysteem (er is geen aparte fase of cijfer).
 * Volgorde: van nog niets bewezen naar zekerheid.
 */
export const SCORES = ['rood', 'oranje', 'groen', 'zekerheid'] as const
export type Score = (typeof SCORES)[number]

export const SCORE_LABELS: Record<Score, string> = { rood: 'Rood', oranje: 'Oranje', groen: 'Groen', zekerheid: 'Zekerheid' }
export const SCORE_MEANING: Record<Score, string> = {
  rood: 'Goed vermoeden dat ze het kunnen, nog niets bewezen voor IKR',
  oranje: 'Heeft de laboratoriumtest bij IKR gedaan (klein idee bedenken, filmen, monteren)',
  groen: 'Heeft één opdracht voor een klant uitgevoerd, gecheckt door Milan, Cédric of een groene freelancer',
  zekerheid: 'Heeft al veel gedaan, we zijn zeker dat ze het kunnen',
}

/** Eén freelancer (filmen, monteren, contentplanning, schermgezicht). Zie docs/product/freelancers.md. */
export type Freelancer = {
  id: string
  /** Voor- en achternaam, eventueel handelsnaam. */
  name: string
  email: string | null
  phone: string | null
  score: Score | null
  /** Klanten / opdrachten (vrije tekst). */
  assignments: string | null
  /** Gekoppelde klanten in het dashboard (clients.id). */
  client_ids: string[]
  portfolio_url: string | null
  /** Bron en opmerking. */
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FreelancerInput = Pick<Freelancer, 'name' | 'email' | 'phone' | 'score' | 'assignments' | 'client_ids' | 'portfolio_url' | 'notes'>
export type FreelancerPatch = Partial<FreelancerInput>

/** Velden die je rechtstreeks in de tabel aanpast (één cel tegelijk). */
export const INLINE_FIELDS = ['name', 'email', 'phone', 'score', 'assignments', 'portfolio_url', 'notes'] as const
export type InlineField = (typeof INLINE_FIELDS)[number]

export const LIMITS = { name: 200, email: 254, phone: 50, assignments: 2000, portfolio_url: 2000, notes: 4000 } as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/

/** "Rood", "ROOD", "zekerheid" → score; leeg → null; iets anders → fout. */
export function parseScore(v: string | null | undefined): Score | null {
  const t = fold(v)
  if (!t) return null
  const hit = SCORES.find((s) => s === t)
  if (!hit) throw new Error(`Score: kies ${SCORES.map((s) => SCORE_LABELS[s]).join(', ')} of laat leeg.`)
  return hit
}

/** Portfolio-link: enkel http(s). "behance.net/x" wordt "https://behance.net/x". */
export function cleanUrl(v: string | null | undefined): string | null {
  const t = v?.trim()
  if (!t) return null
  const url = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Link: geef een geldig webadres (bv. https://vimeo.com/naam).')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Link: enkel http- of https-adressen.')
  if (!parsed.hostname.includes('.')) throw new Error('Link: geef een geldig webadres (bv. https://vimeo.com/naam).')
  if (url.length > LIMITS.portfolio_url) throw new Error(`Link is te lang (max ${LIMITS.portfolio_url} tekens).`)
  return url
}

function text(v: string | null | undefined, label: string, max: number) {
  const t = v?.trim() ?? ''
  if (t.length > max) throw new Error(`${label} is te lang (max ${max} tekens).`)
  return t || null
}

type Raw = {
  name?: string | null
  email?: string | null
  phone?: string | null
  score?: string | null
  assignments?: string | null
  client_ids?: string[] | null
  portfolio_url?: string | null
  notes?: string | null
}

/**
 * Controle voor dashboard en Grok Bot. Niet meegegeven (undefined) = ongewijzigd; leeg of null = leegmaken.
 * Enkel de naam is verplicht (en mag niet leeggemaakt worden).
 */
export function cleanFreelancerPatch(raw: Raw): FreelancerPatch {
  const out: FreelancerPatch = {}
  if (raw.name !== undefined) {
    const name = text(raw.name, 'Naam', LIMITS.name)
    if (!name) throw new Error('Geef de freelancer een naam.')
    out.name = name
  }
  if (raw.email !== undefined) {
    const email = text(raw.email, 'E-mail', LIMITS.email)?.toLowerCase() ?? null
    if (email && !EMAIL.test(email)) throw new Error(`E-mail: "${raw.email}" is geen geldig e-mailadres.`)
    out.email = email
  }
  if (raw.phone !== undefined) out.phone = text(raw.phone, 'Telefoon', LIMITS.phone)
  if (raw.score !== undefined) out.score = parseScore(raw.score)
  if (raw.assignments !== undefined) out.assignments = text(raw.assignments, 'Klanten / opdrachten', LIMITS.assignments)
  if (raw.client_ids !== undefined) {
    const ids = [...new Set((raw.client_ids ?? []).map((x) => x.trim()).filter(Boolean))]
    if (ids.some((x) => !UUID.test(x))) throw new Error('Onbekende klant gekozen.')
    out.client_ids = ids
  }
  if (raw.portfolio_url !== undefined) out.portfolio_url = cleanUrl(raw.portfolio_url)
  if (raw.notes !== undefined) out.notes = text(raw.notes, 'Bron en opmerking', LIMITS.notes)
  return out
}

/** Nieuwe freelancer: naam verplicht, de rest leeg als het niet ingevuld is. */
export function cleanFreelancerInput(raw: Raw): FreelancerInput {
  if (raw.name === undefined || raw.name === null) throw new Error('Geef de freelancer een naam.')
  const p = cleanFreelancerPatch(raw)
  return {
    name: p.name!,
    email: p.email ?? null,
    phone: p.phone ?? null,
    score: p.score ?? null,
    assignments: p.assignments ?? null,
    client_ids: p.client_ids ?? [],
    portfolio_url: p.portfolio_url ?? null,
    notes: p.notes ?? null,
  }
}

/** Alfabetisch op naam. */
export const sortFreelancers = (list: Freelancer[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' }))

/** Zoeken op naam (ook handelsnaam) en filter op score; "geen" = nog geen score. */
export function filterFreelancers<T extends Pick<Freelancer, 'name' | 'score'>>(list: T[], query: string, score: Score | 'geen' | '' = '') {
  const q = fold(query)
  return list.filter((f) => (!q || fold(f.name).includes(q) || fold(f.name).replace(/ /g, '').includes(q.replace(/ /g, ''))) && (!score || (score === 'geen' ? f.score === null : f.score === score)))
}
