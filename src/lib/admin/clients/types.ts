import { daysBetween } from '../format'

/** Klant (productie). Bewust klein; groeit later (zie docs/product/klanten.md). */
export type Client = {
  id: string
  name: string
  freelancer: string | null
  /** 'YYYY-MM-DD' */
  contract_end: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type ClientInput = Pick<Client, 'name' | 'freelancer' | 'contract_end'>

/** Hoeveel dagen het contract nog loopt (negatief = verlopen), of null zonder einddatum. */
export const daysLeft = (c: Pick<Client, 'contract_end'>, today: string) => (c.contract_end ? daysBetween(today, c.contract_end) : null)

/** Rood: verlopen of < 30 dagen; oranje: < 60 dagen; anders groen. */
export const contractTone = (days: number | null): 'red' | 'orange' | 'green' | 'none' =>
  days === null ? 'none' : days < 30 ? 'red' : days < 60 ? 'orange' : 'green'

/** Wie het eerst afloopt staat bovenaan; zonder einddatum onderaan (alfabetisch). */
export const sortClients = (list: Client[]) =>
  [...list].sort((a, b) => (a.contract_end ?? '9999').localeCompare(b.contract_end ?? '9999') || a.name.localeCompare(b.name, 'nl'))

export function cleanClientInput(raw: { name?: string | null; freelancer?: string | null; contract_end?: string | null }): ClientInput {
  const name = raw.name?.trim()
  if (!name) throw new Error('Geef de klant een naam.')
  const end = raw.contract_end?.trim() || null
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('Einde contract: gebruik JJJJ-MM-DD.')
  return { name: name.slice(0, 200), freelancer: raw.freelancer?.trim().slice(0, 200) || null, contract_end: end }
}
