import 'server-only'
import { driveSearch, driveText, isGoogleConfigured } from '../google'
import { CONTACT_EMAIL } from '../weekly/types'
import type { Client } from './types'

export type ContractDoc = { id: string; naam: string; link: string; gewijzigd: string; tekst: string }

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const KEYWORDS = ['contract', 'overeenkomst', 'addendum', 'offerte', 'freelance']

/** Zoekwoorden voor een klant: de naam (en zonder leestekens, bv. "Oh!Ma" → "Ohma") en de naam op de bank. */
export function searchNames(c: Pick<Client, 'name' | 'bank_name'>) {
  const names = [c.name, c.name.replace(/[^\p{L}\p{N} ]/gu, ''), c.bank_name ?? ''].map((n) => n.trim()).filter((n) => n.length >= 3)
  return [...new Set(names)]
}

/** Drive-zoekopdracht: bestanden met "contract", "overeenkomst" … in de naam die de klant noemen. */
export function contractQuery(names: string[]) {
  const who = names.map((n) => `fullText contains '${esc(n)}' or name contains '${esc(n)}'`).join(' or ')
  const kind = KEYWORDS.map((k) => `name contains '${k}'`).join(' or ')
  return `(${who}) and (${kind}) and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
}

/**
 * Contracten van een klant in de IKR-Drive (contact@): het klantcontract, addenda, de offerte en
 * freelancecontracten die de klant noemen. Max. 8 bestanden, nieuwste eerst, met hun tekst.
 */
export async function findContractDocs(c: Pick<Client, 'name' | 'bank_name'>): Promise<ContractDoc[]> {
  if (!isGoogleConfigured()) throw new Error('Google is nog niet ingesteld.')
  const files = await driveSearch(CONTACT_EMAIL, contractQuery(searchNames(c)), 8)
  const docs: ContractDoc[] = []
  for (const f of files) {
    const tekst = await driveText(CONTACT_EMAIL, f).catch(() => null)
    if (tekst?.trim()) docs.push({ id: f.id, naam: f.name, link: f.webViewLink, gewijzigd: f.modifiedTime.slice(0, 10), tekst: tekst.trim() })
  }
  return docs
}
