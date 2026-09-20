/**
 * Brand strip + soft presence for food brands.
 * Logos live in public/images/client_logos/. Text-only entries are OK until a logo lands.
 * Do not invent TikTok handles, URLs, or metrics here.
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
  // Soft presence — logos + TikTok handles TBD (see PR notes)
  { name: 'Chez Albert' },
  { name: 'Lilalou' },
]

/** Early / new clients without case videos or metrics yet. */
export type EarlyClient = {
  id: string
  clientName: string
  /** Honest status copy — no fake views/results. */
  note: string
  logo?: string
}

export const earlyClients: EarlyClient[] = [
  {
    id: 'chez-albert',
    clientName: 'Chez Albert',
    note: 'Nieuwe food brand — samenwerking start binnenkort',
  },
  {
    id: 'lilalou',
    clientName: 'Lilalou',
    note: 'Nieuwe food brand — early collaboration',
  },
]
