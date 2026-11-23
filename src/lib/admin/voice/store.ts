import 'server-only'
import { createServiceSupabase } from '../supabase/server'
import { todayBrussels } from '../dates'
import type { Counted, CostParts } from './pricing'

/** Stemmen van OpenAI Realtime, met een korte omschrijving voor Instellingen. */
export const VOICES = [
  { id: 'marin', label: 'Marin', note: 'helder en natuurlijk (aanrader)' },
  { id: 'cedar', label: 'Cedar', note: 'warm en rustig (aanrader)' },
  { id: 'alloy', label: 'Alloy', note: 'neutraal' },
  { id: 'ash', label: 'Ash', note: 'zakelijk' },
  { id: 'ballad', label: 'Ballad', note: 'zacht' },
  { id: 'coral', label: 'Coral', note: 'vriendelijk' },
  { id: 'echo', label: 'Echo', note: 'diep' },
  { id: 'sage', label: 'Sage', note: 'kalm' },
  { id: 'shimmer', label: 'Shimmer', note: 'licht' },
  { id: 'verse', label: 'Verse', note: 'expressief' },
] as const
export type VoiceId = (typeof VOICES)[number]['id']
export const isVoice = (v: string): v is VoiceId => VOICES.some((x) => x.id === v)

export type VoiceSettings = { daily_limit_eur: number; voice: VoiceId; usd_to_eur: number; updated_by: string | null; updated_at: string | null }
export const DEFAULT_SETTINGS: VoiceSettings = { daily_limit_eur: 2, voice: 'marin', usd_to_eur: 0.86, updated_by: null, updated_at: null }

/** Model: het beste realtime-model; aan te passen met OPENAI_REALTIME_MODEL (bv. een nieuwere versie). */
export const realtimeModel = () => process.env.OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime'
export const isVoiceConfigured = () => Boolean(process.env.OPENAI_API_KEY) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const db = () => createServiceSupabase()

export async function getVoiceSettings(): Promise<VoiceSettings> {
  const { data } = await db().from('voice_settings').select('*').eq('id', 1).maybeSingle()
  if (!data) return DEFAULT_SETTINGS
  return {
    daily_limit_eur: Number(data.daily_limit_eur),
    voice: isVoice(String(data.voice)) ? (data.voice as VoiceId) : 'marin',
    usd_to_eur: Number(data.usd_to_eur) || DEFAULT_SETTINGS.usd_to_eur,
    updated_by: data.updated_by ?? null,
    updated_at: data.updated_at ?? null,
  }
}

export async function saveVoiceSettings(patch: Partial<Pick<VoiceSettings, 'daily_limit_eur' | 'voice' | 'usd_to_eur'>>, by: string) {
  const { error } = await db().from('voice_settings').upsert({ id: 1, ...patch, updated_by: by, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** Middernacht in Brussel (als tijdstip), voor "vandaag". */
export function brusselsDayStart(now = new Date(), day = todayBrussels(now)) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Brussels' })).getTime()
  const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  return new Date(Date.parse(`${day}T00:00:00Z`) - (local - utc)).toISOString()
}

/** Wat het hele team vandaag al verbruikte, in euro. */
export async function spentTodayEur(settings?: VoiceSettings) {
  const s = settings ?? (await getVoiceSettings())
  const { data, error } = await db().from('voice_usage').select('cost_usd').gte('created_at', brusselsDayStart())
  if (error) throw new Error(error.message)
  const usd = (data ?? []).reduce((a, r) => a + Number(r.cost_usd), 0)
  return { eur: usd * s.usd_to_eur, limit: s.daily_limit_eur, over: usd * s.usd_to_eur >= s.daily_limit_eur }
}

export async function startSession(row: { user_email: string; user_name: string; model: string; voice: string; page: string | null }) {
  const { data, error } = await db().from('voice_sessions').insert(row).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Gesprek starten mislukt.')
  return data.id as string
}

export async function endSession(id: string, email: string) {
  await db().from('voice_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id).eq('user_email', email).is('ended_at', null)
}

export async function sessionOf(id: string, email: string) {
  const { data } = await db().from('voice_sessions').select('id, model, ended_at').eq('id', id).eq('user_email', email).maybeSingle()
  return data as { id: string; model: string; ended_at: string | null } | null
}

export async function recordUsage(row: { session_id: string; user_email: string; kind: 'antwoord' | 'transcriptie'; response_id: string | null; model: string } & Counted) {
  const { error } = await db().from('voice_usage').insert(row)
  // Dubbel gemeld (zelfde response_id): niet opnieuw tellen.
  if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
}

export type ToolCallRow = { id: string; session_id: string; user_email: string; tool: string; args: Record<string, unknown>; read_only: boolean; status: string; result: string | null; created_at: string }

export async function logToolCall(row: { session_id: string; user_email: string; tool: string; args: Record<string, unknown>; read_only: boolean; status: string; result?: string | null; duur_ms?: number }) {
  const { data, error } = await db()
    .from('voice_tool_calls')
    .insert({ ...row, result: row.result?.slice(0, 2000) ?? null })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Loggen mislukt.')
  return data.id as string
}

/** Hoe lang een wijziging op bevestiging mag wachten. */
export const CONFIRM_TTL_MS = 15 * 60_000

/**
 * Neemt een wachtende actie over (status wacht → bezig), zodat hij maar één keer uitgevoerd wordt,
 * ook als stem en knop tegelijk bevestigen. Null = niet (meer) te bevestigen.
 */
export async function claimPending(id: string, email: string, to: 'bezig' | 'geannuleerd', via: 'stem' | 'knop') {
  const since = new Date(Date.now() - CONFIRM_TTL_MS).toISOString()
  const { data } = await db()
    .from('voice_tool_calls')
    .update({ status: to, decided_via: via, decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_email', email)
    .eq('status', 'wacht')
    .gte('created_at', since)
    .select('*')
    .maybeSingle()
  return (data as ToolCallRow | null) ?? null
}

export async function finishToolCall(id: string, status: 'uitgevoerd' | 'mislukt', result: string, duur_ms: number) {
  await db().from('voice_tool_calls').update({ status, result: result.slice(0, 2000), duur_ms }).eq('id', id)
}

// ─── Overzicht voor Instellingen ─────────────────────────────

export type VoiceStats = {
  settings: VoiceSettings
  todayEur: number
  monthEur: number
  days: { day: string; eur: number }[]
  people: { email: string; name: string; sessions: number; minutes: number; answers: number; eur: number }[]
  tools: { tool: string; count: number; writes: number; confirmed: number; cancelled: number; failed: number }[]
  parts: { key: keyof CostParts; eur: number }[]
  recent: { id: string; name: string; started_at: string; minutes: number; answers: number; tools: number; eur: number }[]
  grokbot: number
}

const PART_KEYS: (keyof CostParts)[] = ['spraak_in', 'spraak_uit', 'tekst_in', 'tekst_uit', 'cache', 'transcriptie']

export async function voiceStats(now = new Date()): Promise<VoiceStats> {
  const settings = await getVoiceSettings()
  const day = todayBrussels(now)
  const monthStart = brusselsDayStart(now, `${day.slice(0, 7)}-01`)
  const todayStart = brusselsDayStart(now)
  const [usageRes, sessionsRes, toolsRes] = await Promise.all([
    db().from('voice_usage').select('session_id, user_email, kind, cost, cost_usd, created_at').gte('created_at', monthStart).limit(20_000),
    db().from('voice_sessions').select('id, user_email, user_name, started_at, ended_at').gte('started_at', monthStart).order('started_at', { ascending: false }).limit(2_000),
    db().from('voice_tool_calls').select('session_id, tool, read_only, status').gte('created_at', monthStart).limit(20_000),
  ])
  for (const r of [usageRes, sessionsRes, toolsRes]) if (r.error) throw new Error(r.error.message)
  const fx = settings.usd_to_eur
  const usage = (usageRes.data ?? []) as { session_id: string | null; user_email: string; kind: string; cost: Partial<CostParts>; cost_usd: number; created_at: string }[]
  const sessions = (sessionsRes.data ?? []) as { id: string; user_email: string; user_name: string | null; started_at: string; ended_at: string | null }[]
  const calls = (toolsRes.data ?? []) as { session_id: string | null; tool: string; read_only: boolean; status: string }[]

  const eur = (usd: number) => Number(usd) * fx
  const byDay = new Map<string, number>()
  const bySession = new Map<string, { eur: number; answers: number; last: string }>()
  const parts = Object.fromEntries(PART_KEYS.map((k) => [k, 0])) as Record<keyof CostParts, number>
  let todayEur = 0
  let monthEur = 0
  for (const u of usage) {
    const e = eur(u.cost_usd)
    monthEur += e
    if (u.created_at >= todayStart) todayEur += e
    const d = todayBrussels(new Date(u.created_at))
    byDay.set(d, (byDay.get(d) ?? 0) + e)
    for (const k of PART_KEYS) parts[k] += eur(Number(u.cost?.[k] ?? 0))
    if (u.session_id) {
      const s = bySession.get(u.session_id) ?? { eur: 0, answers: 0, last: u.created_at }
      s.eur += e
      if (u.kind === 'antwoord') s.answers++
      if (u.created_at > s.last) s.last = u.created_at
      bySession.set(u.session_id, s)
    }
  }
  const toolsPerSession = new Map<string, number>()
  const toolMap = new Map<string, VoiceStats['tools'][number]>()
  for (const c of calls) {
    if (c.session_id) toolsPerSession.set(c.session_id, (toolsPerSession.get(c.session_id) ?? 0) + 1)
    const t = toolMap.get(c.tool) ?? { tool: c.tool, count: 0, writes: 0, confirmed: 0, cancelled: 0, failed: 0 }
    t.count++
    if (!c.read_only) t.writes++
    if (!c.read_only && c.status === 'uitgevoerd') t.confirmed++
    if (c.status === 'geannuleerd') t.cancelled++
    if (c.status === 'mislukt') t.failed++
    toolMap.set(c.tool, t)
  }
  const minutes = (s: (typeof sessions)[number]) => {
    const end = s.ended_at ?? bySession.get(s.id)?.last ?? s.started_at
    return Math.max(0, (Date.parse(end) - Date.parse(s.started_at)) / 60_000)
  }
  const nameOf = (email: string, name?: string | null) => name || email.split('@')[0].replace(/^./, (x) => x.toUpperCase())
  const people = new Map<string, VoiceStats['people'][number]>()
  for (const s of sessions) {
    const p = people.get(s.user_email) ?? { email: s.user_email, name: nameOf(s.user_email, s.user_name), sessions: 0, minutes: 0, answers: 0, eur: 0 }
    p.sessions++
    p.minutes += minutes(s)
    p.answers += bySession.get(s.id)?.answers ?? 0
    people.set(s.user_email, p)
  }
  for (const u of usage) {
    const p = people.get(u.user_email) ?? { email: u.user_email, name: nameOf(u.user_email), sessions: 0, minutes: 0, answers: 0, eur: 0 }
    p.eur += eur(u.cost_usd)
    people.set(u.user_email, p)
  }
  const days: VoiceStats['days'] = []
  for (let d = `${day.slice(0, 7)}-01`; d <= day; d = new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) days.push({ day: d, eur: byDay.get(d) ?? 0 })

  return {
    settings,
    todayEur,
    monthEur,
    days,
    people: [...people.values()].sort((a, b) => b.eur - a.eur),
    tools: [...toolMap.values()].sort((a, b) => b.count - a.count),
    parts: PART_KEYS.map((key) => ({ key, eur: parts[key] })).filter((p) => p.eur > 0).sort((a, b) => b.eur - a.eur),
    recent: sessions.slice(0, 10).map((s) => ({
      id: s.id,
      name: nameOf(s.user_email, s.user_name),
      started_at: s.started_at,
      minutes: minutes(s),
      answers: bySession.get(s.id)?.answers ?? 0,
      tools: toolsPerSession.get(s.id) ?? 0,
      eur: bySession.get(s.id)?.eur ?? 0,
    })),
    grokbot: toolMap.get('grokbot_vragen')?.count ?? 0,
  }
}
