/**
 * Thin client for Vercel Web Analytics query API.
 * @see https://vercel.com/docs/analytics/web-analytics-api
 */

const API_BASE = 'https://api.vercel.com/v1/query/web-analytics'

export type VisitTotals = {
  pageviews: number
  visitors: number
}

export type AggregateRow = {
  count?: number
  visitors?: number
  pageviews?: number
  [key: string]: string | number | undefined
}

type QueryParams = {
  projectId: string
  teamId?: string
  since: string
  until: string
  by?: string | string[]
  filter?: string
  limit?: number
}

function getToken(): string {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) throw new Error('VERCEL_API_TOKEN ontbreekt')
  return token
}

function getProjectId(): string {
  const id = process.env.VERCEL_PROJECT_ID
  if (!id) throw new Error('VERCEL_PROJECT_ID ontbreekt')
  return id
}

function buildUrl(path: string, params: QueryParams): string {
  const url = new URL(`${API_BASE}${path}`)
  url.searchParams.set('projectId', params.projectId)
  url.searchParams.set('since', params.since)
  url.searchParams.set('until', params.until)
  if (params.teamId) url.searchParams.set('teamId', params.teamId)
  if (params.filter) url.searchParams.set('filter', params.filter)
  if (params.limit != null) url.searchParams.set('limit', String(params.limit))
  if (params.by) {
    const by = Array.isArray(params.by) ? params.by : [params.by]
    for (const dim of by) url.searchParams.append('by', dim)
  }
  return url.toString()
}

async function queryJson<T>(path: string, params: QueryParams): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    headers: { Authorization: `Bearer ${getToken()}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Web Analytics API ${path} → ${res.status}: ${body.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

export function analyticsConfigReady(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID)
}

function baseParams(since: string, until: string): QueryParams {
  return {
    projectId: getProjectId(),
    teamId: process.env.VERCEL_TEAM_ID || undefined,
    since,
    until,
  }
}

export async function countVisits(since: string, until: string): Promise<VisitTotals> {
  const json = await queryJson<{ data: VisitTotals }>('/visits/count', {
    ...baseParams(since, until),
  })
  return {
    pageviews: json.data?.pageviews ?? 0,
    visitors: json.data?.visitors ?? 0,
  }
}

export async function aggregateVisits(
  since: string,
  until: string,
  by: string,
  options?: { filter?: string; limit?: number },
): Promise<AggregateRow[]> {
  const json = await queryJson<{ data: AggregateRow[] }>('/visits/aggregate', {
    ...baseParams(since, until),
    by,
    filter: options?.filter,
    limit: options?.limit,
  })
  return Array.isArray(json.data) ? json.data : []
}

export async function countEvents(
  since: string,
  until: string,
  filter?: string,
): Promise<{ count: number; visitors: number }> {
  const json = await queryJson<{ data: { count?: number; visitors?: number } }>(
    '/events/count',
    {
      ...baseParams(since, until),
      filter,
    },
  )
  return {
    count: json.data?.count ?? 0,
    visitors: json.data?.visitors ?? 0,
  }
}

export async function aggregateEvents(
  since: string,
  until: string,
  by: string,
  options?: { filter?: string; limit?: number },
): Promise<AggregateRow[]> {
  const json = await queryJson<{ data: AggregateRow[] }>('/events/aggregate', {
    ...baseParams(since, until),
    by,
    filter: options?.filter,
    limit: options?.limit,
  })
  return Array.isArray(json.data) ? json.data : []
}

/** Sum event counts grouped by eventData/<prop> for a named event. */
export async function eventCountsByProp(
  since: string,
  until: string,
  eventName: string,
  prop: string,
  extraFilter?: string,
): Promise<Record<string, number>> {
  const filter = extraFilter
    ? `eventName eq '${eventName}' and ${extraFilter}`
    : `eventName eq '${eventName}'`
  const rows = await aggregateEvents(since, until, `eventData/${prop}`, { filter, limit: 20 })
  const out: Record<string, number> = {}
  for (const row of rows) {
    const key = String(row.eventData ?? row[prop] ?? 'unknown')
    out[key] = Number(row.count ?? 0)
  }
  return out
}
