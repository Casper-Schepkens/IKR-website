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
  created_by: string | null
  created_at: string
  updated_at: string
}
export type ClientInput = Pick<Client, 'name' | 'freelancer' | 'contract_end' | 'contract_indefinite'>

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
}): ClientInput {
  const name = raw.name?.trim()
  if (!name) throw new Error('Geef de klant een naam.')
  const word = isIndefiniteWord(raw.contract_end)
  const end = word ? null : raw.contract_end?.trim() || null
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('Einde contract: gebruik JJJJ-MM-DD, laat leeg, of "onbepaald".')
  if (end && raw.indefinite) throw new Error('Kies een einddatum of onbepaalde duur, niet allebei.')
  const indefinite = word || (raw.indefinite ?? false)
  return { name: name.slice(0, 200), freelancer: raw.freelancer?.trim().slice(0, 200) || null, contract_end: indefinite ? null : end, contract_indefinite: indefinite }
}
