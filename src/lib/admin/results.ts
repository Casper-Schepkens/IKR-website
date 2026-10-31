import type { VideoWithStats } from './data/repo'
import { addDays, compactNumber, fmtDate, isoWeekNumber, percent } from './format'
import type { VideoStatsSnapshot } from './types'

function viewsAt(stats: VideoStatsSnapshot[], at: Date) {
  let best: VideoStatsSnapshot | null = null
  for (const s of stats) if (new Date(s.captured_at) <= at) best = s
  return best
}

function latest(stats: VideoStatsSnapshot[]) {
  return stats.length ? stats[stats.length - 1] : null
}

export type ResultsSummary = ReturnType<typeof summarizeResults>

/** Rekent snapshots om naar wat het resultatenscherm toont. Geen verzonnen data: ontbreekt iets, dan 0/leeg. */
export function summarizeResults(videos: VideoWithStats[], periodDays = 30, now = new Date()) {
  const periodStart = addDays(now, -periodDays)
  const prevStart = addDays(now, -periodDays * 2)

  let viewsPeriod = 0
  let viewsPrev = 0
  let engagementNum = 0
  let engagementDen = 0
  let liveInPeriod = 0

  for (const v of videos) {
    const sorted = [...v.stats].sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    const last = latest(sorted)
    if (!last) continue
    const atStart = viewsAt(sorted, periodStart)?.views ?? 0
    const atPrev = viewsAt(sorted, prevStart)?.views ?? 0
    viewsPeriod += last.views - atStart
    viewsPrev += atStart - atPrev
    engagementNum += last.likes + last.comments + last.shares
    engagementDen += last.views
    if (v.published_at && new Date(v.published_at) >= periodStart) liveInPeriod++
  }

  // Views per week (laatste 8 weken), als som van de groei over alle video's
  const weeks: { label: string; views: number }[] = []
  for (let w = 7; w >= 0; w--) {
    const end = addDays(now, -w * 7)
    const start = addDays(end, -7)
    let total = 0
    for (const v of videos) {
      const sorted = [...v.stats].sort((a, b) => a.captured_at.localeCompare(b.captured_at))
      total += (viewsAt(sorted, end)?.views ?? 0) - (viewsAt(sorted, start)?.views ?? 0)
    }
    weeks.push({ label: `wk ${isoWeekNumber(end)}`, views: Math.max(0, total) })
  }

  // Per klant
  const perClient = new Map<
    string,
    {
      client_id: string
      name: string
      videos: number
      views: number
      engagement: number
      eng_den: number
      last7: number
      prev7: number
    }
  >()
  for (const v of videos) {
    const sorted = [...v.stats].sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    const last = latest(sorted)
    const row = perClient.get(v.client_id) ?? {
      client_id: v.client_id,
      name: v.client_name,
      videos: 0,
      views: 0,
      engagement: 0,
      eng_den: 0,
      last7: 0,
      prev7: 0,
    }
    row.videos++
    if (last) {
      row.views += last.views
      row.engagement += last.likes + last.comments + last.shares
      row.eng_den += last.views
      const d7 = viewsAt(sorted, addDays(now, -7))?.views ?? 0
      const d14 = viewsAt(sorted, addDays(now, -14))?.views ?? 0
      row.last7 += last.views - d7
      row.prev7 += d7 - d14
    }
    perClient.set(v.client_id, row)
  }
  const clients = [...perClient.values()]
    .map((r) => ({
      ...r,
      avg: r.videos ? Math.round(r.views / r.videos) : 0,
      engagementRate: r.eng_den ? r.engagement / r.eng_den : 0,
      trend: r.prev7 ? (r.last7 - r.prev7) / r.prev7 : null,
    }))
    .sort((a, b) => b.views - a.views)

  const avgByClient = new Map(clients.map((c) => [c.client_id, c.avg]))
  const top = videos
    .map((v) => {
      const last = latest([...v.stats].sort((a, b) => a.captured_at.localeCompare(b.captured_at)))
      const avg = avgByClient.get(v.client_id) ?? 0
      return { ...v, views: last?.views ?? 0, multiple: avg ? (last?.views ?? 0) / avg : 0 }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  const withViews = videos.filter((v) => v.stats.length)
  return {
    viewsPeriod,
    viewsChange: viewsPrev ? (viewsPeriod - viewsPrev) / viewsPrev : null,
    liveInPeriod,
    videoCount: videos.length,
    clientCount: new Set(videos.map((v) => v.client_id)).size,
    avgPerVideo: withViews.length
      ? Math.round(
          withViews.reduce((s, v) => s + (latest(v.stats)?.views ?? 0), 0) / withViews.length,
        )
      : 0,
    engagementRate: engagementDen ? engagementNum / engagementDen : 0,
    weeks,
    clients,
    top,
  }
}

/** Tekstversie voor de AI-analyse. */
export function resultsToText(r: ResultsSummary, now = new Date()) {
  return [
    `TikTok-resultaten, periode tot ${fmtDate(now, { day: 'numeric', month: 'long', year: 'numeric' })}:`,
    `- Views laatste 30 dagen: ${compactNumber(r.viewsPeriod)}${r.viewsChange != null ? ` (${r.viewsChange >= 0 ? '+' : ''}${percent(r.viewsChange)} t.o.v. de 30 dagen ervoor)` : ''}`,
    `- Gemiddeld per video: ${compactNumber(r.avgPerVideo)} · engagement ${percent(r.engagementRate, 1)}`,
    `- Views per week: ${r.weeks.map((w) => `${w.label}: ${compactNumber(w.views)}`).join(', ')}`,
    '',
    'Per klant:',
    ...r.clients.map(
      (c) =>
        `- ${c.name}: ${c.videos} video's, ${compactNumber(c.views)} views, gem. ${compactNumber(c.avg)}, engagement ${percent(c.engagementRate, 1)}`,
    ),
    '',
    'Top video’s:',
    ...r.top.map(
      (v) =>
        `- ${v.client_name} · “${v.title ?? 'zonder titel'}” · ${compactNumber(v.views)} views (${v.multiple.toFixed(1)}× gemiddelde van die klant)`,
    ),
  ].join('\n')
}
