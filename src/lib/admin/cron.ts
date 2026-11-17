import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createServiceSupabase } from './supabase/server'

/** Cron-routes: Vercel stuurt `Authorization: Bearer $CRON_SECRET`. Tijdsveilig vergelijken. */
export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export const CRON_TOOL_PREFIX = 'cron_'

/**
 * Elke run van een cron komt in bot_actions (gelukt of niet), zodat Instellingen kan tonen wanneer
 * hij laatst liep en wat er misliep. Een mislukte run geeft HTTP 500, zodat Vercel hem als fout toont.
 */
export async function finishCron(name: string, result: Record<string, unknown>, problems: string[]) {
  const ok = problems.length === 0
  const text = JSON.stringify(result)
  await createServiceSupabase()
    .from('bot_actions')
    .insert({
      bot: 'cron',
      tool: `${CRON_TOOL_PREFIX}${name}`,
      ok,
      error: ok ? null : problems.join(' · ').slice(0, 1000),
      args: { resultaat: text.length > 4000 ? `${text.slice(0, 4000)}…` : result },
    })
    .then(
      () => undefined,
      (e: unknown) => console.error(`[cron ${name}] loggen mislukt`, e),
    )
  if (!ok) console.error(`[cron ${name}]`, problems.join(' · '))
  return NextResponse.json({ ok, ...result, ...(ok ? {} : { problemen: problems }) }, { status: ok ? 200 : 500 })
}

/** Een tekstresultaat dat met "fout" begint of een Error-melding is, telt als probleem. */
export const isProblem = (v: unknown) => typeof v === 'string' && /^(fout|mislukt)|ontbreekt|error/i.test(v)
