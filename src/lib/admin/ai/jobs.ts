import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { createServiceSupabase } from '../supabase/server'
import { IKR_CONTEXT } from './context'
import { HANDLERS, type JobType } from './handlers'

/**
 * AI-taken via de tabel ai_jobs. Engine 'api' (standaard): de taak loopt meteen via de Claude API.
 * Met IKR_AI_ENGINE=worker blijven taken op 'pending' staan voor een worker op een eigen server
 * (Claude Code), zonder dat het dashboard verandert.
 */

export type AiJob = {
  id: string
  type: JobType
  ref: string | null
  input: Record<string, unknown>
  status: 'pending' | 'running' | 'done' | 'error' | 'waiting_limit'
  output: Record<string, unknown> | null
  error: string | null
  engine: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  cost_usd: number | null
  created_at: string
  finished_at: string | null
}

export const MODEL = process.env.IKR_AI_MODEL || 'claude-sonnet-5-5'

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY) || process.env.IKR_AI_ENGINE === 'worker'
}

/** USD per miljoen tokens (standaardtarief). Cache schrijven = 1,25× input. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
}

export function costUsd(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite: number }) {
  const p = PRICES[Object.keys(PRICES).find((k) => model.startsWith(k)) ?? 'claude-sonnet-5-5']
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.input * 1.25) / 1_000_000
}

const db = () => createServiceSupabase()

/** Zet een taak in de wachtrij; bestaat dezelfde taak (type + ref) al, dan wordt die teruggegeven. */
export async function enqueue(type: JobType, ref: string, input: Record<string, unknown>, by: string): Promise<AiJob> {
  const existing = await db().from('ai_jobs').select('*').eq('type', type).eq('ref', ref).maybeSingle()
  if (existing.data) return existing.data as AiJob
  const { data, error } = await db().from('ai_jobs').insert({ type, ref, input, created_by: by }).select('*').single()
  if (error) {
    // Twee requests tegelijk: de andere was sneller.
    const again = await db().from('ai_jobs').select('*').eq('type', type).eq('ref', ref).single()
    if (again.data) return again.data as AiJob
    throw new Error(error.message)
  }
  return data as AiJob
}

export async function jobsByRef(type: JobType, refs: string[]): Promise<AiJob[]> {
  if (!refs.length) return []
  const { data, error } = await db().from('ai_jobs').select('*').eq('type', type).in('ref', refs)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiJob[]
}

export async function getJob(id: string): Promise<AiJob | null> {
  const { data } = await db().from('ai_jobs').select('*').eq('id', id).maybeSingle()
  return (data as AiJob | null) ?? null
}

export async function listJobs(sinceIso: string): Promise<AiJob[]> {
  const { data, error } = await db()
    .from('ai_jobs')
    .select('id, type, status, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, created_at, finished_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AiJob[]
}

let client: Anthropic | null = null

/** Voert een taak uit via de Claude API (tenzij een worker dat doet). Faalt nooit hard. */
export async function runJob(id: string) {
  if (process.env.IKR_AI_ENGINE === 'worker') return
  // Enkel een taak die nog wacht oppikken (voorkomt dubbel werk).
  const claimed = await db()
    .from('ai_jobs')
    .update({ status: 'running', started_at: new Date().toISOString(), engine: 'api', error: null })
    .eq('id', id)
    .in('status', ['pending', 'error', 'waiting_limit'])
    .select('*')
    .maybeSingle()
  const job = claimed.data as AiJob | null
  if (!job) return

  const handler = HANDLERS[job.type]
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY ontbreekt in Vercel.')
    client ??= new Anthropic()
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: `${IKR_CONTEXT}\n\n${handler.instructions}`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: handler.prompt(job.input) }],
      output_config: { effort: 'medium', format: betaZodOutputFormat(handler.schema as z.ZodType) },
    })
    if (res.stop_reason === 'refusal') throw new Error('Claude weigerde deze taak.')
    if (res.stop_reason === 'max_tokens') throw new Error('Het antwoord werd te lang.')
    if (res.parsed_output == null) throw new Error('Kon het antwoord niet lezen.')
    const u = {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
    }
    const output = res.parsed_output as Record<string, unknown>
    await db()
      .from('ai_jobs')
      .update({
        status: 'done',
        output,
        model: res.model,
        input_tokens: u.input,
        output_tokens: u.output,
        cache_read_tokens: u.cacheRead,
        cache_write_tokens: u.cacheWrite,
        cost_usd: costUsd(res.model, u),
        finished_at: new Date().toISOString(),
      })
      .eq('id', id)
    await handler.afterDone?.(job.input, output).catch((e) => console.error('[ai] afterDone', e))
  } catch (e) {
    const limit = e instanceof Anthropic.RateLimitError
    await db()
      .from('ai_jobs')
      .update({
        status: limit ? 'waiting_limit' : 'error',
        error: limit ? 'Even te veel AI-aanvragen; probeer zo opnieuw.' : e instanceof Error ? e.message : 'Mislukt.',
        finished_at: new Date().toISOString(),
      })
      .eq('id', id)
  }
}
