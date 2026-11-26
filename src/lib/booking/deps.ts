import 'server-only'
import { createHash } from 'node:crypto'
import { isDemoMode } from '@/lib/admin/env'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { memoryCalls, supabaseCalls } from '@/lib/admin/calls/repo'
import { memoryLeads, supabaseLeads } from '@/lib/admin/sales/repo'
import type { BookingDeps } from './service'
import { demoBookingStore, supabaseBookingStore } from './store'

/**
 * Afhankelijkheden voor /boek en /api/boek: altijd de service role (de bezoeker is niet ingelogd en
 * heeft via RLS nergens toegang toe). Lokaal zonder Supabase: alles in het geheugen.
 */
export function serverBookingDeps(): BookingDeps | null {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const db = createServiceSupabase()
    return { store: supabaseBookingStore(db), leads: supabaseLeads(db), calls: supabaseCalls(db) }
  }
  if (isDemoMode()) return { store: demoBookingStore(), leads: memoryLeads(), calls: memoryCalls() }
  return null
}

/** IP enkel gehasht bewaren (rate limiting), nooit leesbaar. */
export function hashIp(ip: string | null | undefined) {
  if (!ip) return null
  return createHash('sha256').update(`ikr-boek:${process.env.IKR_TOKEN_KEY ?? ''}:${ip}`).digest('hex').slice(0, 32)
}

export function clientIp(headers: Headers) {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || null
}

/** Eenvoudige limiet per serverinstantie (bv. voor het opvragen van de slots). */
const g = globalThis as unknown as { __ikrBoekHits?: Map<string, number[]> }
export function softLimit(key: string, max: number, windowMs: number) {
  const hits: Map<string, number[]> = (g.__ikrBoekHits ??= new Map())
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter((t) => t > now - windowMs)
  list.push(now)
  hits.set(key, list)
  if (hits.size > 5000) hits.clear()
  return list.length <= max
}
