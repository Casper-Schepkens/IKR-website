import type { AiRun } from '../types'

/**
 * Geschatte API-kosten in USD op basis van de gelogde tokens. Anthropic factureert in USD;
 * de echte factuur staat in de Claude Console. Prijzen per miljoen tokens (standaardtarief).
 * Cache-schrijven kost 1,25× de inputprijs (5 minuten cache).
 */
type Price = { input: number; output: number; cacheRead: number }

const PRICES: Record<string, Price> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5 },
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25 },
}

export function priceFor(model: string | null): Price {
  const m = (model ?? '').toLowerCase()
  const exact = Object.keys(PRICES)
    .sort((a, b) => b.length - a.length)
    .find((k) => m.startsWith(k))
  if (exact) return PRICES[exact]
  if (m.includes('sonnet')) return PRICES['claude-sonnet-5-5']
  if (m.includes('haiku')) return PRICES['claude-haiku-5-5']
  return PRICES['claude-opus-5-5']
}

export function runCost(r: Pick<AiRun, 'model' | 'input_tokens' | 'output_tokens' | 'cache_read_tokens' | 'cache_write_tokens'>) {
  const p = priceFor(r.model)
  const usd =
    (r.input_tokens ?? 0) * p.input +
    (r.output_tokens ?? 0) * p.output +
    (r.cache_read_tokens ?? 0) * p.cacheRead +
    (r.cache_write_tokens ?? 0) * p.input * 1.25
  return usd / 1_000_000
}

export const TASK_LABELS: Record<string, string> = {
  generate_ideas: 'Ideeën genereren',
  develop_idea: 'Idee uitwerken',
  summarize_client: 'Klant samenvatten',
  draft_email: 'Mail opstellen',
  daily_briefing: 'Dagbriefing',
  shoot_brief: 'Draaiboek',
  ask: 'Vraag (commandobalk)',
  results_insights: 'Resultaten analyseren',
  generate_deck: 'Presentatie',
}

export function taskLabel(task: string) {
  return TASK_LABELS[task] ?? task
}

export function usd(n: number) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: n > 0 && n < 0.1 ? 3 : 2,
  }).format(n)
}
