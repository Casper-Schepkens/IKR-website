import type { Owner } from './types'

/** Prikbord: kaartjes op de weekly die het hele team ziet (pure helpers, geen DB). */

export const PIN_KINDS = ['link', 'document', 'tekst', 'bespreekpunt'] as const
export type PinKind = (typeof PIN_KINDS)[number]
export const PIN_KIND_LABELS: Record<PinKind, string> = {
  link: 'Link',
  document: 'Document',
  tekst: 'Notitie',
  bespreekpunt: 'Bespreekpunt',
}

export type Pin = {
  id: string
  kind: PinKind
  title: string
  body: string | null
  url: string | null
  for_owner: Owner | null
  pinned: boolean
  created_by: string | null
  created_via: 'dashboard' | 'grokbot'
  created_at: string
  updated_at: string
}

export type NewPin = Pick<Pin, 'kind' | 'title' | 'body' | 'url' | 'for_owner' | 'created_by' | 'created_via'>

/** Enkel http(s)-links (geen javascript: e.d.). Geeft de genormaliseerde URL of null. */
export function safeUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim()
  if (!v) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

/** Herkenbare bron voor een link (label op het kaartje). */
export function linkSource(url: string): { label: string; isDocument: boolean } {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return { label: 'Link', isDocument: false }
  }
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'docs.google.com') {
    if (u.pathname.startsWith('/spreadsheets')) return { label: 'Google Sheet', isDocument: true }
    if (u.pathname.startsWith('/presentation')) return { label: 'Google Slides', isDocument: true }
    if (u.pathname.startsWith('/forms')) return { label: 'Google Form', isDocument: true }
    return { label: 'Google Doc', isDocument: true }
  }
  if (host === 'drive.google.com') return { label: 'Google Drive', isDocument: true }
  if (host === 'meet.google.com') return { label: 'Google Meet', isDocument: false }
  if (host.endsWith('tiktok.com')) return { label: 'TikTok', isDocument: false }
  if (host.endsWith('notion.so') || host.endsWith('notion.site')) return { label: 'Notion', isDocument: true }
  if (host.endsWith('canva.com')) return { label: 'Canva', isDocument: true }
  if (host.endsWith('lucid.app') || host.endsWith('lucidchart.com')) return { label: 'Lucid', isDocument: true }
  if (host.endsWith('instagram.com')) return { label: 'Instagram', isDocument: false }
  if (host.endsWith('youtube.com') || host === 'youtu.be') return { label: 'YouTube', isDocument: false }
  return { label: host, isDocument: false }
}

/** Soort afleiden als die niet gegeven is: met link = link/document, zonder = notitie. */
export function inferKind(kind: string | null | undefined, url: string | null): PinKind {
  if (kind && (PIN_KINDS as readonly string[]).includes(kind)) return kind as PinKind
  if (!url) return 'tekst'
  return linkSource(url).isDocument ? 'document' : 'link'
}

/** Volgorde op het bord: vastgepind eerst, daarna nieuwste eerst. */
export const sortPins = (pins: Pin[]) =>
  [...pins].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
