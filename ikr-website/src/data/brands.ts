/**
 * Brand strip + soft presence for food brands.
 * Logos live in public/images/client_logos/. Text-only entries are OK until a logo lands.
 * Do not invent TikTok handles, URLs, or metrics — only Metricool / user-confirmed facts.
 */

export type BrandStripItem = {
  /** Display name (also used as alt text when a logo is present). */
  name: string
  /** Optional logo under /images/client_logos/. Omit → text chip in the marquee. */
  logo?: string
}

/**
 * Homepage “WIJ FOCUSSEN OP FOOD BRANDS” marquee.
 * Curated order beats auto-readdir so early clients without assets can still appear.
 */
export const brandStripItems: BrandStripItem[] = [
  { name: 'Tempus', logo: '/images/client_logos/tempus logo.png' },
  { name: 'Maison Slash', logo: '/images/client_logos/MS logo.png' },
  { name: 'Oh!ma', logo: '/images/client_logos/ohma logo.png' },
  { name: 'Wasbar', logo: '/images/client_logos/wasbar logo2.jpg' },
  // Soft presence — logos TBD
  { name: 'Chez Albert' },
  { name: 'Lilalou' },
]

/** Soft stats only when confirmed (e.g. Metricool). Omit entirely if unknown. */
export type EarlyClientStats = {
  views?: string
  topVideo?: string
  /** Short date label, e.g. "20 aug" — shown as “sinds …”. */
  since?: string
}

/** Early / new clients — name presence; optional handle + soft Metricool stats. */
export type EarlyClient = {
  id: string
  clientName: string
  /** Honest status copy — no fake views/results. */
  note: string
  logo?: string
  /** Confirmed TikTok handle including @. Omit if unknown (do not invent). */
  handle?: string
  /** Profile URL only when handle is confirmed. */
  tiktokUrl?: string
  stats?: EarlyClientStats
}

export const earlyClients: EarlyClient[] = [
  {
    id: 'chez-albert',
    clientName: 'Chez Albert',
    note: 'Nieuwe food brand — samenwerking start binnenkort',
    // No Metricool brand yet; collaboration not started — no handle, no results.
  },
  {
    id: 'lilalou',
    clientName: 'Lilalou',
    note: 'Early food brand op TikTok',
    handle: '@lilaloubiscuits',
    tiktokUrl: 'https://www.tiktok.com/@lilaloubiscuits',
    // Soft Metricool line (brand since 2026-08-20) — not a full case results grid.
    stats: {
      views: '~387K',
      topVideo: '~198K',
      since: '20 aug',
    },
  },
]
