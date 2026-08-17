/**
 * IKR-brede resultaatcijfers — één bron voor homepage + Aanpak.
 *
 * Bron (aug 2026): copy uit Figma / huidige site. Nog niet herberekend.
 * Juiste ophaalmethode: TikTok Business Center (Analytics) van de accounts
 * die IKR beheert → CSV exporteren → views, video's en volgers-groei optellen.
 * Geen scraping. Zonder login kunnen we deze getallen niet live verifiëren.
 */
export const ikrStats = [
  { num: '125M', label: 'Meest bekeken video in 2025', shortLabel: 'Weergaven' },
  { num: '263', label: "Video's gepost in 2025", shortLabel: "Video's" },
  { num: '+400K', label: 'Nieuwe volgers in 2 jaar', shortLabel: 'Nieuwe volgers' },
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
