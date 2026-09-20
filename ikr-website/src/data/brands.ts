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
  videos?: string
  views?: string
  topVideo?: string
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
    note: 'Early food brand op TikTok (Metricool sinds aug 2026)',
    handle: '@lilaloubiscuits',
    tiktokUrl: 'https://www.tiktok.com/@lilaloubiscuits',
    // Soft early totals from Metricool — not a full case study.
    stats: {
      videos: '~10',
      views: '~387K',
      topVideo: '~198K',
    },
  },
]
