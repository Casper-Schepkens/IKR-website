import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { createServiceSupabase } from '../supabase/server'
import { must } from '../supabase/must'
import { IKR_CONTEXT, SALES_MAIL_CONTEXT } from './context'
import { ensureSignature, SIGNATURE_RULE } from '../sales/signature'
import { HANDLERS, type JobType } from './handlers'
import { styleInstructions } from './style-profile'

/**
 * AI-taken via de tabel ai_jobs. Engine 'api' (standaard): de taak loopt meteen via de Claude API.
 * Met IKR_AI_ENGINE=grokbot (of =worker) blijven taken op 'pending' staan; Grokbot (via de
 * MCP-connector) of een worker op een eigen server haalt ze op en zet het resultaat terug.
 */

export type AiJob = {
  id: string
  type: JobType
  ref: string | null
  input: Record<string, unknown>
  status: 'pending' | 'running' | 'done' | 'error' | 'waiting_limit' | 'dismissed'
  output: Record<string, unknown> | null
  error: string | null
  engine: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  cost_usd: number | null
  created_by?: string | null
  created_at: string
  finished_at: string | null
}

export const MODEL = process.env.IKR_AI_MODEL || 'claude-sonnet-5-5'

export { aiEngine, DATA_ONLY_TYPES, dataViaApi } from './engine'
import { aiEngine, DATA_ONLY_TYPES, dataViaApi } from './engine'

export function isAiConfigured() {
  return aiEngine() !== 'api' || Boolean(process.env.ANTHROPIC_API_KEY)
}

/** Velden met een mailtekst per taak: "IKnowRight" onder de naam zetten als het ontbreekt. */
const MAIL_FIELDS: Partial<Record<string, string[]>> = { inbox_reply: ['draft'], call_verwerken: ['bedankmail'], mail_rewrite: ['body'] }

export function signMailOutput<T extends Record<string, unknown>>(type: string, output: T): T {
  const fields = MAIL_FIELDS[type]
  if (!fields || !output || typeof output !== 'object') return output
  const fixed: Record<string, unknown> = { ...output }
  for (const f of fields) if (typeof fixed[f] === 'string') fixed[f] = ensureSignature(fixed[f] as string)
  return fixed as T
}

/** Open taken voor een externe uitvoerder (Grokbot of worker), oudste eerst. */
export async function openJobs(limit = 10): Promise<AiJob[]> {
  let q = db().from('ai_jobs').select('*').eq('status', 'pending')
  // Taken die via de API lopen, krijgt Grokbot niet te zien.
  if (dataViaApi()) q = q.not('type', 'in', `(${DATA_ONLY_TYPES.join(',')})`)
  const { data, error } = await q.order('created_at').limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiJob[]
}

/** Resultaat van een externe uitvoerder bewaren, gecontroleerd tegen de vorm van de taak. */
export async function completeJob(id: string, output: unknown, engine: string) {
  const job = await getJob(id)
  if (!job) throw new Error('Taak niet gevonden.')
  if (job.status === 'done' || job.status === 'dismissed') throw new Error(JOB_ALREADY_HANDLED)
  if (engine !== 'api' && aiEngine() !== 'api' && aiEngine(job.type) === 'api') throw new Error('Deze taak loopt via de Claude API; er is niets voor jou te doen.')
  const handler = HANDLERS[job.type]
  // Ontbrekende velden (bv. geen telefoonnummer) als leeg beschouwen.
  const shape = (handler.schema as unknown as { shape?: Record<string, unknown> }).shape
  const filled =
    shape && output && typeof output === 'object'
      ? { ...Object.fromEntries(Object.keys(shape).map((k) => [k, null])), ...(output as object) }
      : output
  const parsed = handler.schema.safeParse(filled)
  if (!parsed.success) throw new Error(`Resultaat klopt niet met de gevraagde vorm: ${parsed.error.message}`)
  const result = signMailOutput(job.type, parsed.data as Record<string, unknown>)
  // Atomair afronden: enkel wie de taak nog open vindt, voert afterDone uit (geen dubbele notities of kaarten).
  const { data, error } = await db()
    .from('ai_jobs')
    .update({ status: 'done', output: result, engine, model: engine, cost_usd: 0, error: null, finished_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', OPEN_STATUSES)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error(JOB_ALREADY_HANDLED)
  await handler.afterDone?.(job.input, result).catch((e) => console.error('[ai] afterDone', e))
}

export const JOB_ALREADY_HANDLED = 'Deze taak is al afgehandeld.'
/** Statussen waarin een taak nog afgerond mag worden. */
const OPEN_STATUSES = ['pending', 'running', 'error', 'waiting_limit']
/** Een taak die zo lang op 'running' staat, is achtergelaten (functie gestopt) en mag opnieuw opgepikt worden. */
export const STALE_RUNNING_MS = 5 * 60_000

/** USD per miljoen tokens (standaardtarief). Cache schrijven = 1,25× input. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
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

/**
 * Maakt de taak enkel aan als er nog geen is met dit type + ref (de unieke index beslist, ook bij twee
 * runs tegelijk). Geeft de nieuwe taak, of null als ze al bestond.
 */
export async function claimJob(type: JobType, ref: string, input: Record<string, unknown>, by: string): Promise<AiJob | null> {
  const { data, error } = await db().from('ai_jobs').insert({ type, ref, input, created_by: by }).select('*').single()
  if (!error && data) return data as AiJob
  const again = await db().from('ai_jobs').select('id').eq('type', type).eq('ref', ref).maybeSingle()
  if (again.data) return null
  throw new Error(error?.message ?? 'Taak aanmaken mislukt.')
}

/** Opdracht van een taak bijwerken zolang ze nog niet opgepikt is. */
export async function updateJobInput(id: string, input: Record<string, unknown>) {
  const { error } = await db().from('ai_jobs').update({ input }).eq('id', id).eq('status', 'pending')
  if (error) throw new Error(error.message)
}

export async function jobsByRef(type: JobType, refs: string[]): Promise<AiJob[]> {
  if (!refs.length) return []
  const { data, error } = await db().from('ai_jobs').select('*').eq('type', type).in('ref', refs)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiJob[]
}

/** Weggeklikt: niet meer tonen (en niet meer uitvoeren). */
export async function dismissJob(id: string) {
  const { error } = await db().from('ai_jobs').update({ status: 'dismissed' }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Sluit een chat-taak af nadat het antwoord via ai_chat_antwoorden in de chat kwam. */
/** Geeft false als de taak al afgesloten was (dan staat het antwoord er al: niet nog eens plaatsen). */
export async function closeChatJob(id: string, userId: string, by: string) {
  const job = await getJob(id)
  if (!job || job.type !== 'chat') throw new Error('Geen chat-taak met dit id.')
  if ((job.input as { user_id?: string }).user_id !== userId) throw new Error('Deze taak hoort bij een andere gebruiker.')
  if (job.status === 'done' || job.status === 'dismissed') return false
  const { data, error } = await db()
    .from('ai_jobs')
    .update({ status: 'done', engine: by, model: by, cost_usd: 0, error: null, finished_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', OPEN_STATUSES)
    .select('id')
  if (error) throw new Error(error.message)
  return Boolean(data?.length)
}

export async function getJobs(ids: string[]): Promise<AiJob[]> {
  if (!ids.length) return []
  const { data, error } = await db().from('ai_jobs').select('*').in('id', ids)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiJob[]
}

export async function getJob(id: string): Promise<AiJob | null> {
  const { data } = await db().from('ai_jobs').select('*').eq('id', id).maybeSingle()
  return (data as AiJob | null) ?? null
}

/** Vaste IKR-context + (voor mailtaken) het schrijfstijlprofiel + de instructies van de taak. */
export async function instructionsFor(job: Pick<AiJob, 'type' | 'input'>) {
  const h = HANDLERS[job.type] as { instructions: string; style?: (i: Record<string, unknown>) => 'casper' }
  const style = h.style ? await styleInstructions(h.style(job.input)) : ''
  // Mailtaken: de salesregels, het stijlprofiel, en de ondertekening als laatste, zodat ze voorgaat op het profiel.
  const sales = h.style ? SALES_MAIL_CONTEXT : ''
  const sign = h.style ? `Vaste regel voor de ondertekening (gaat voor op het stijlprofiel): ${SIGNATURE_RULE}` : ''
  return [IKR_CONTEXT, sales, style, h.instructions, sign].filter(Boolean).join('\n\n')
}

let client: Anthropic | null = null

/** Voert een taak uit via de Claude API, enkel als dat de engine voor die soort taak is (nooit bij Grokbot of een worker). Faalt nooit hard. */
export async function runJob(id: string) {
  const j = await getJob(id)
  if (!j || aiEngine(j.type) !== 'api') return
  // Enkel een taak die nog wacht oppikken (voorkomt dubbel werk).
  // Ook een taak die al 5 minuten op 'running' hangt (de vorige run viel weg) mag opnieuw.
  const stale = new Date(Date.now() - STALE_RUNNING_MS).toISOString()
  const claimed = await db()
    .from('ai_jobs')
    .update({ status: 'running', started_at: new Date().toISOString(), engine: 'api', error: null })
    .eq('id', id)
    .or(`status.in.(pending,error,waiting_limit),and(status.eq.running,started_at.lt.${stale})`)
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
      // Ruim: het model denkt ook na, en een call-verwerking met bedankmail en analyse is lang.
      max_tokens: 16_000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: await instructionsFor(job), cache_control: { type: 'ephemeral' } }],
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
    const output = signMailOutput(job.type, res.parsed_output as Record<string, unknown>)
    await must(
      db()
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
      .eq('status', 'running'),
      'taak afronden',
    )
    await handler.afterDone?.(job.input, output).catch((e) => console.error('[ai] afterDone', e))
  } catch (e) {
    const limit = e instanceof Anthropic.RateLimitError
    console.error('[ai] taak mislukt', id, e instanceof Error ? e.message : e)
    const { error: saveError } = await db()
      .from('ai_jobs')
      .update({
        status: limit ? 'waiting_limit' : 'error',
        error: limit ? 'Even te veel AI-aanvragen; probeer zo opnieuw.' : e instanceof Error ? e.message : 'Mislukt.',
        finished_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (saveError) console.error('[ai] fout bewaren mislukt (taak blijft op running en wordt na 5 minuten opnieuw opgepikt)', saveError.message)
  }
}
