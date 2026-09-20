/**
 * IKR-brede resultaatcijfers — één bron voor homepage + Aanpak.
 *
 * Bron (20 sep 2026): Metricool TikTok posts (TKPO07 views sum).
 * - Tempus `@tempusverpleging`: full available history ~2025-04-04 → 2026-09-20
 *   (alle video's zijn IKR; collab startte vóór Metricool-join 2025-09-04)
 *   → 107 video's, 1.745.189 views, topvideo 142.371
 * - Maison Slash `@maisonslashbelgie`: Metricool post-lijst vanaf ~2026-04-06
 *   (IKR-window; pre-IKR virals niet meegerekend)
 *   → 40 video's, 366.757 views, topvideo 42.113
 * Combined: 147 video's, 2.111.946 views, topvideo Tempus 142.371.
 * Wasbar / Anneke / Lilalou / food werk: niet in dit aggregate.
 */
export const ikrStats = [
  { num: '2.1M', label: 'Views voor klanten', shortLabel: 'Views' },
  { num: '147', label: "Video's gepost", shortLabel: "Video's" },
  { num: '142K', label: 'Beste video', shortLabel: 'Topvideo' },
] as const

/**
 * TikTok België — publieke, citeerbare cijfers (niet IKR-eigen).
 * DataReportal Digital 2026 Belgium: TikTok ads reach 4,03M 18+ = 42,5% van
 * volwassen Belgen (eind 2025). Dat is ~4 op 10, geen 50%.
 * Leeftijdssplit: TikTok Ads Manager via Affect Group (18+, ~3,8M).
 */
export const tiktokBelgium = {
  adultReachPct: 42.5,
  adultReachLabel: '4 op 10',
  sourceReach: 'DataReportal Digital 2026, TikTok ads, eind 2025',
  ageSlices: [
    { label: '18–24', pct: 25, color: '#0FC1DE' },
    { label: '25–34', pct: 33, color: '#5EE1F5' },
    { label: '35–44', pct: 19, color: '#FFF9F1' },
    { label: '45+', pct: 23, color: 'rgba(255,249,241,0.45)' },
  ],
  over35Pct: 42,
  sourceAge: 'TikTok Ads Manager België (18+), gerapporteerd via Affect Group',
} as const
