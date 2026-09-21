import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getResendNotifyFrom } from '@/lib/resend-mail'
import {
  analyticsConfigReady,
  aggregateVisits,
  countEvents,
  countVisits,
  eventCountsByProp,
} from '@/lib/vercel-web-analytics'
import {
  buildWeeklyHtml,
  buildWeeklySubject,
  type WeeklyAnalyticsDigest,
} from '@/lib/weekly-analytics-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatNlRange(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short' })
  return `${fmt.format(from)}-${fmt.format(to)}`
}

/** Last complete 7 days ending yesterday UTC, plus the 7 days before that. */
function weekWindows(now = new Date()) {
  const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  // until exclusive end-of-yesterday → use yesterday as until date (API inclusive)
  const untilDay = new Date(until)
  untilDay.setUTCDate(untilDay.getUTCDate() - 1)

  const sinceDay = new Date(untilDay)
  sinceDay.setUTCDate(sinceDay.getUTCDate() - 6)

  const prevUntil = new Date(sinceDay)
  prevUntil.setUTCDate(prevUntil.getUTCDate() - 1)
  const prevSince = new Date(prevUntil)
  prevSince.setUTCDate(prevSince.getUTCDate() - 6)

  return {
    since: isoDate(sinceDay),
    until: isoDate(untilDay),
    prevSince: isoDate(prevSince),
    prevUntil: isoDate(prevUntil),
    periodLabel: formatNlRange(sinceDay, untilDay),
    previousPeriodLabel: formatNlRange(prevSince, prevUntil),
  }
}

function mapTopRows(
  rows: { pageviews?: number; visitors?: number; [k: string]: unknown }[],
  labelKey: string,
) {
  return rows
    .filter((r) => r[labelKey] != null && String(r[labelKey]) !== 'Others')
    .map((r) => ({
      label: String(r[labelKey]),
      pageviews: Number(r.pageviews ?? 0),
      visitors: Number(r.visitors ?? 0),
    }))
}

async function buildDigest(): Promise<WeeklyAnalyticsDigest> {
  const windows = weekWindows()
  const notes: string[] = []

  if (!analyticsConfigReady()) {
    return {
      periodLabel: windows.periodLabel,
      previousPeriodLabel: windows.previousPeriodLabel,
      visitors: 0,
      pageviews: 0,
      prevVisitors: null,
      prevPageviews: null,
      topReferrers: [],
      topPaths: [],
      ctaSectionViews: 0,
      planCallClicks: 0,
      requestPricingClicks: 0,
      contactSubmits: 0,
      pricingSubmits: 0,
      notes: [
        'VERCEL_API_TOKEN en/of VERCEL_PROJECT_ID ontbreken. Vul deze in op Vercel Production.',
      ],
    }
  }

  const { since, until, prevSince, prevUntil, periodLabel, previousPeriodLabel } = windows

  let visitors = 0
  let pageviews = 0
  let prevVisitors: number | null = null
  let prevPageviews: number | null = null
  let topReferrers: WeeklyAnalyticsDigest['topReferrers'] = []
  let topPaths: WeeklyAnalyticsDigest['topPaths'] = []
  let ctaSectionViews = 0
  let planCallClicks = 0
  let requestPricingClicks = 0
  let contactSubmits = 0
  let pricingSubmits = 0

  try {
    const totals = await countVisits(since, until)
    visitors = totals.visitors
    pageviews = totals.pageviews
  } catch (err) {
    notes.push(`Traffic query mislukt: ${err instanceof Error ? err.message : 'onbekend'}`)
  }

  try {
    const prev = await countVisits(prevSince, prevUntil)
    prevVisitors = prev.visitors
    prevPageviews = prev.pageviews
  } catch {
    // Previous week optional
  }

  try {
    const refs = await aggregateVisits(since, until, 'referrerHostname', { limit: 5 })
    topReferrers = mapTopRows(refs, 'referrerHostname')
  } catch (err) {
    notes.push(`Referrers query mislukt: ${err instanceof Error ? err.message : 'onbekend'}`)
  }

  try {
    const paths = await aggregateVisits(since, until, 'requestPath', { limit: 5 })
    topPaths = mapTopRows(paths, 'requestPath')
  } catch (err) {
    notes.push(`Paths query mislukt: ${err instanceof Error ? err.message : 'onbekend'}`)
  }

  try {
    const section = await countEvents(
      since,
      until,
      `eventName eq 'cta_section_view' and eventData/placement eq 'home_bottom'`,
    )
    ctaSectionViews = section.count
  } catch (err) {
    notes.push(`cta_section_view query mislukt: ${err instanceof Error ? err.message : 'onbekend'}`)
  }

  try {
    const byCta = await eventCountsByProp(
      since,
      until,
      'cta_click',
      'cta',
      `eventData/placement eq 'home_bottom'`,
    )
    planCallClicks = byCta.plan_call ?? 0
    requestPricingClicks = byCta.request_pricing ?? 0
  } catch (err) {
    notes.push(`cta_click query mislukt: ${err instanceof Error ? err.message : 'onbekend'}`)
  }

  try {
    const byForm = await eventCountsByProp(since, until, 'form_submit_success', 'form')
    contactSubmits = byForm.contact ?? 0
    pricingSubmits = byForm.pricing ?? 0
  } catch (err) {
    notes.push(
      `form_submit_success query mislukt: ${err instanceof Error ? err.message : 'onbekend'}`,
    )
  }

  return {
    periodLabel,
    previousPeriodLabel,
    visitors,
    pageviews,
    prevVisitors,
    prevPageviews,
    topReferrers,
    topPaths,
    ctaSectionViews,
    planCallClicks,
    requestPricingClicks,
    contactSubmits,
    pricingSubmits,
    notes,
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized()
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY ontbreekt' }, { status: 500 })
  }

  const digest = await buildDigest()
  const to = process.env.IKR_ANALYTICS_REPORT_EMAIL ?? 'casper.schepkens@icloud.com'
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

  const subject = buildWeeklySubject(digest)
  const html = buildWeeklyHtml(digest)

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      subject,
      to,
      digest,
    })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: getResendNotifyFrom(),
    to,
    subject,
    html,
  })

  if (result.error) {
    console.error('Weekly analytics Resend error:', result.error)
    return NextResponse.json({ error: 'Mail verzenden mislukt', detail: result.error }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    subject,
    to,
    digest,
    emailId: result.data?.id ?? null,
  })
}
