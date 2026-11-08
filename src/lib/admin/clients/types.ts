import { daysBetween } from '../format'

/** Klant (productie). Bewust klein; groeit later (zie docs/product/klanten.md). */
export type Client = {
  id: string
  name: string
  freelancer: string | null
  /** 'YYYY-MM-DD'; leeg bij onbepaalde duur of als het niet gekend is. */
  contract_end: string | null
  /** Contract van onbepaalde duur (dan nooit verlopen of bijna verlopen). */
  contract_indefinite: boolean
  /** Contract: start ('YYYY-MM-DD') en bedragen per maand, excl. btw (op voorhand vastgelegd). */
  contract_start?: string | null
  monthly_fee?: number | null
  freelancer_cost?: number | null
  boosting_budget?: number | null
  /** Naam op de bank als die afwijkt (bv. Oh!Ma betaalt als "V.S.A. Foods"). */
  bank_name?: string | null
  /** Link naar het contract in de Drive en de laatste "leid af uit het contract"-taak. */
  contract_url?: string | null
  contract_job_id?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type ClientInput = Pick<Client, 'name' | 'freelancer' | 'contract_end' | 'contract_indefinite'> &
  Partial<Pick<Client, 'contract_start' | 'monthly_fee' | 'freelancer_cost' | 'boosting_budget' | 'bank_name' | 'contract_url' | 'contract_job_id'>>

/** Hoeveel dagen het contract nog loopt (negatief = verlopen), of null zonder einddatum of bij onbepaalde duur. */
export const daysLeft = (c: Pick<Client, 'contract_end'> & { contract_indefinite?: boolean }, today: string) =>
  c.contract_indefinite || !c.contract_end ? null : daysBetween(today, c.contract_end)

/** Rood: verlopen of < 30 dagen; oranje: < 60 dagen; anders groen. */
export const contractTone = (days: number | null): 'red' | 'orange' | 'green' | 'none' =>
  days === null ? 'none' : days < 30 ? 'red' : days < 60 ? 'orange' : 'green'

/** Volgorde: eerst aflopend bovenaan, dan onbepaalde duur, dan zonder einddatum (telkens alfabetisch). */
const rank = (c: Pick<Client, 'contract_end' | 'contract_indefinite'>) => (c.contract_indefinite ? 1 : c.contract_end ? 0 : 2)
export const sortClients = (list: Client[]) =>
  [...list].sort(
    (a, b) => rank(a) - rank(b) || (a.contract_end ?? '').localeCompare(b.contract_end ?? '') || a.name.localeCompare(b.name, 'nl'),
  )

/** Woorden die "onbepaalde duur" betekenen (MCP en formulier). */
export const isIndefiniteWord = (v: string | null | undefined) => /^(onbepaald|onbepaalde duur|onbeperkt|indefinite|open)$/i.test(v?.trim() ?? '')

/**
 * contract_end: JJJJ-MM-DD, leeg (niet gekend) of "onbepaald". `indefinite` (true/false) mag ook apart.
 * Onbepaalde duur wist de einddatum; een datum zet onbepaalde duur uit.
 */
export function cleanClientInput(raw: {
  name?: string | null
  freelancer?: string | null
  contract_end?: string | null
  indefinite?: boolean | null
  contract_start?: string | null
  monthly_fee?: string | number | null
  freelancer_cost?: string | number | null
  boosting_budget?: string | number | null
  bank_name?: string | null
}): ClientInput {
  const name = raw.name?.trim()
  if (!name) throw new Error('Geef de klant een naam.')
  const word = isIndefiniteWord(raw.contract_end)
  const end = word ? null : raw.contract_end?.trim() || null
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('Einde contract: gebruik JJJJ-MM-DD, laat leeg, of "onbepaald".')
  if (end && raw.indefinite) throw new Error('Kies een einddatum of onbepaalde duur, niet allebei.')
  const indefinite = word || (raw.indefinite ?? false)
  const start = raw.contract_start?.trim() || null
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('Start contract: gebruik JJJJ-MM-DD.')
  const money = (v: string | number | null | undefined, label: string) => {
    if (v === undefined) return undefined
    if (v === null || String(v).trim() === '') return null
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new Error(`${label}: geef een bedrag in euro (bv. 1200 of 1.200,50).`)
    return Math.round(n * 100) / 100
  }
  const extra: Partial<ClientInput> = {}
  if (raw.contract_start !== undefined) extra.contract_start = start
  const fee = money(raw.monthly_fee, 'Maandbedrag')
  const fl = money(raw.freelancer_cost, 'Freelancerkost')
  const bo = money(raw.boosting_budget, 'Boosting')
  if (fee !== undefined) extra.monthly_fee = fee
  if (fl !== undefined) extra.freelancer_cost = fl
  if (bo !== undefined) extra.boosting_budget = bo
  if (raw.bank_name !== undefined) extra.bank_name = raw.bank_name?.trim().slice(0, 120) || null
  return { name: name.slice(0, 200), freelancer: raw.freelancer?.trim().slice(0, 200) || null, contract_end: indefinite ? null : end, contract_indefinite: indefinite, ...extra }
}
