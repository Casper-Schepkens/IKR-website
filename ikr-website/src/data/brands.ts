/**
 * Brand strip + soft presence for food brands.
 * Logos live in public/images/client_logos/. Text-only entries are OK until a logo lands.
 * Do not invent TikTok handles, URLs, or metrics: only Metricool / user-confirmed facts.
 */

export type BrandStripItem = {
  /** Display name (also used as alt text when a logo is present). */
  name: string
  /** Optional logo under /images/client_logos/. Omit → text chip in the marquee. */
  logo?: string
  /**
   * How to crop the logo in the brand strip.
   * - `rounded` (default): soft corner radius
   * - `circle`: full circle mask (round marks sitting on a square canvas, e.g. Wasbar)
   */
  logoShape?: 'rounded' | 'circle'
}

/**
 * Homepage “WIJ FOCUSSEN OP FOOD BRANDS” marquee.
 * Curated order beats auto-readdir so early clients without assets can still appear.
 */
export const brandStripItems: BrandStripItem[] = [
  { name: 'Tempus', logo: '/images/client_logos/tempus logo.png' },
  { name: 'Maison Slash', logo: '/images/client_logos/MS logo.png' },
  { name: 'Oh!ma', logo: '/images/client_logos/ohma logo.png' },
  { name: 'Wasbar', logo: '/images/client_logos/wasbar.png', logoShape: 'circle' },
  { name: 'Chez Albert', logo: '/images/client_logos/chez-albert.png' },
  { name: 'Lilalou', logo: '/images/client_logos/lilalou.jpg' },
]

/** Soft early-case presence on /cases#nieuw: collaboration started, no fake results. */
export type EarlyClient = {
  id: string
  clientName: string
  /** Honest status copy: no fake views/results. */
  note: string
  logo?: string
  /** Detail page when a real case entry exists. */
  caseSlug?: string
  /** Confirmed TikTok handle including @. Omit if unknown (do not invent). */
  handle?: string
  /** Profile URL only when handle is confirmed. */
  tiktokUrl?: string
}

export const earlyClients: EarlyClient[] = [
  {
    id: 'chez-albert',
    clientName: 'Chez Albert',
    note: 'Food brand. Samenwerking gestart. TikTok i.s.m. IKR; case in opbouw.',
    logo: '/images/client_logos/chez-albert.png',
    caseSlug: 'chez-albert',
    // TikTok handle TBD; do not invent.
  },
  {
    id: 'lilalou',
    clientName: 'Lilalou',
    note: 'Food brand (biscuits). Samenwerking gestart. TikTok i.s.m. IKR; organische hero-content volgt.',
    logo: '/images/client_logos/lilalou.jpg',
    caseSlug: 'lilalou',
    handle: '@lilaloubiscuits',
    tiktokUrl: 'https://www.tiktok.com/@lilaloubiscuits',
    // No Metricool view/top-video flex: current reach is boosted, not organic proof.
  },
]
