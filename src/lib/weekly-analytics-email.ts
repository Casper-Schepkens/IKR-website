export type WeeklyAnalyticsDigest = {
  periodLabel: string
  previousPeriodLabel: string
  visitors: number
  pageviews: number
  prevVisitors: number | null
  prevPageviews: number | null
  topReferrers: { label: string; pageviews: number; visitors: number }[]
  topPaths: { label: string; pageviews: number; visitors: number }[]
  ctaSectionViews: number
  planCallClicks: number
  requestPricingClicks: number
  contactSubmits: number
  pricingSubmits: number
  notes: string[]
}

function deltaPct(current: number, previous: number | null): string {
  if (previous == null || previous === 0) return previous === 0 && current > 0 ? 'nieuw' : 'n.v.t.'
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return '0%'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function listRows(
  rows: { label: string; pageviews: number; visitors: number }[],
  empty: string,
): string {
  if (!rows.length) return `<li>${escapeHtml(empty)}</li>`
  return rows
    .map(
      (r) =>
        `<li><strong>${escapeHtml(r.label)}</strong>: ${r.pageviews} pageviews / ${r.visitors} visitors</li>`,
    )
    .join('')
}

export function buildWeeklySubject(digest: WeeklyAnalyticsDigest): string {
  const total = digest.planCallClicks + digest.requestPricingClicks
  if (total === 0) {
    return `IKR weekrapport | ${digest.periodLabel} · nog geen CTA-clicks`
  }
  const callPct = Math.round((digest.planCallClicks / total) * 100)
  const pricingPct = 100 - callPct
  return `IKR weekrapport | ${digest.periodLabel} · call ${callPct}% / prijzen ${pricingPct}%`
}

export function buildWeeklyHtml(digest: WeeklyAnalyticsDigest): string {
  const totalCta = digest.planCallClicks + digest.requestPricingClicks
  const pricingRatio =
    totalCta === 0 ? null : Math.round((digest.requestPricingClicks / totalCta) * 100)

  const insightParts: string[] = []
  if (pricingRatio != null) {
    if (pricingRatio >= 55) {
      insightParts.push('Meer prijzen-clicks dan calls op de homepage-CTA.')
    } else if (pricingRatio <= 45) {
      insightParts.push('Meer call-clicks dan prijzen-clicks op de homepage-CTA.')
    } else {
      insightParts.push('Dual CTA is ongeveer gelijk verdeeld.')
    }
  }
  if (digest.ctaSectionViews > 0 && totalCta === 0) {
    insightParts.push('CTA-sectie werd gezien, maar er waren geen clicks.')
  }
  if (digest.contactSubmits + digest.pricingSubmits === 0 && totalCta > 0) {
    insightParts.push('CTA-clicks zonder form-submits deze week.')
  }
  if (digest.notes.length) {
    insightParts.push(...digest.notes)
  }
  if (!insightParts.length) {
    insightParts.push('Geen opvallende afwijking in de ruwe totals.')
  }

  return `
    <p><strong>IKR weekrapport</strong> · ${escapeHtml(digest.periodLabel)}</p>
    <p>Vergelijking vs ${escapeHtml(digest.previousPeriodLabel)} waar beschikbaar.</p>

    <h3>Traffic</h3>
    <ul>
      <li>Visitors: <strong>${digest.visitors}</strong> (${deltaPct(digest.visitors, digest.prevVisitors)} vs vorige week)</li>
      <li>Pageviews: <strong>${digest.pageviews}</strong> (${deltaPct(digest.pageviews, digest.prevPageviews)} vs vorige week)</li>
    </ul>

    <h3>Bronnen (top 5)</h3>
    <ul>${listRows(digest.topReferrers, 'Geen referrer-data')}</ul>

    <h3>Pagina’s (top 5)</h3>
    <ul>${listRows(digest.topPaths, 'Geen pad-data')}</ul>

    <h3>Homepage funnel</h3>
    <ul>
      <li>CTA sectie-views (home_bottom): <strong>${digest.ctaSectionViews}</strong></li>
      <li>CTA clicks totaal: <strong>${totalCta}</strong></li>
    </ul>

    <h3>Dual CTA (home_bottom)</h3>
    <ul>
      <li>Plan een call: <strong>${digest.planCallClicks}</strong></li>
      <li>Vraag prijzen: <strong>${digest.requestPricingClicks}</strong></li>
      <li>Ratio prijzen / totaal: <strong>${pricingRatio == null ? 'n.v.t.' : `${pricingRatio}%`}</strong></li>
    </ul>

    <h3>Leads</h3>
    <ul>
      <li>Contact submits: <strong>${digest.contactSubmits}</strong></li>
      <li>Pricing PDF-aanvragen: <strong>${digest.pricingSubmits}</strong></li>
    </ul>

    <h3>Actie</h3>
    <ul>${insightParts.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>

    <p style="color:#666;font-size:12px">Anonieme Vercel Web Analytics · geen PII · OpenAI Ads pixel blijft apart.</p>
  `
}
