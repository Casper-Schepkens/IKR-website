/**
 * IKR-brede resultaatcijfers — één bron voor homepage + Aanpak.
 *
 * Bron (aug 2026): Metricool, accounts die IKR beheert op TikTok
 * (`@tempusverpleging` + `@maisonslashbelgie`), 1 sep 2025 – 17 aug 2026.
 * Som van views/video's op gepubliceerde content in die periode.
 * Anneke zit niet in Metricool — niet meegerekend.
 * Exact: 2.159.042 views, 171 video's, topvideo 169.606 (Maison Slash).
 */
export const ikrStats = [
  { num: '2.2M', label: 'Views voor klanten', shortLabel: 'Views' },
  { num: '171', label: "Video's gepost", shortLabel: "Video's" },
  { num: '170K', label: 'Beste video', shortLabel: 'Topvideo' },
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
  sourceReach: 'DataReportal Digital 2026 — TikTok ads, eind 2025',
  ageSlices: [
    { label: '18–24', pct: 25, color: '#0FC1DE' },
    { label: '25–34', pct: 33, color: '#5EE1F5' },
    { label: '35–44', pct: 19, color: '#FFF9F1' },
    { label: '45+', pct: 23, color: 'rgba(255,249,241,0.45)' },
  ],
  over35Pct: 42,
  sourceAge: 'TikTok Ads Manager België (18+), gerapporteerd via Affect Group',
} as const
