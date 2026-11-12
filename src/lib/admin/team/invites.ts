import 'server-only'
import { z } from 'zod'
import { isSupabaseConfigured } from '../env'
import { createServiceSupabase } from '../supabase/server'
import { TEAM, type Owner } from '../weekly/types'

/**
 * Uitnodigingsadres per teamlid. Weeklies en calls staan in de contact@-agenda en sturen een uitnodiging
 * naar dit adres, zodat ze automatisch in de (persoonlijke) agenda komen. Geen OAuth nodig.
 * Standaard: het adres uit TEAM (Casper: zijn persoonlijke agenda; anderen: hun IKR-adres).
 */
const mem = globalThis as unknown as { __ikrInvites?: Record<string, string> }
const memory = () => (mem.__ikrInvites ??= {})

export const defaultInvite = (owner: Owner) => TEAM.find((t) => t.key === owner)!.calendar

export async function inviteAddresses(): Promise<Record<Owner, string>> {
  let saved: Record<string, string> = {}
  if (!isSupabaseConfigured()) saved = memory()
  else {
    const { data } = await createServiceSupabase().from('team_profiles').select('email, invite_email')
    saved = Object.fromEntries((data ?? []).filter((r) => r.invite_email).map((r) => [r.email, r.invite_email as string]))
  }
  return Object.fromEntries(TEAM.map((t) => [t.key, saved[t.email] ?? t.calendar])) as Record<Owner, string>
}

export async function inviteAddress(owner: Owner) {
  return (await inviteAddresses())[owner]
}

const emailSchema = z.email()

/** Leeg = terug naar het standaardadres. Geeft het oude en nieuwe adres terug. */
export async function setInviteAddress(owner: Owner, value: string | null) {
  const member = TEAM.find((t) => t.key === owner)!
  const v = value?.trim().toLowerCase() || null
  if (v && !emailSchema.safeParse(v).success) throw new Error(`"${value}" is geen geldig e-mailadres.`)
  const before = await inviteAddress(owner)
  if (!isSupabaseConfigured()) {
    if (v) memory()[member.email] = v
    else delete memory()[member.email]
  } else {
    const { error } = await createServiceSupabase().from('team_profiles').upsert({ email: member.email, invite_email: v, updated_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
  }
  return { before, after: v ?? member.calendar }
}

/**
 * Na een nieuw uitnodigingsadres: komende weeklies (en voor Casper komende calls) die al in de agenda
 * staan, krijgen het nieuwe adres. Geeft het aantal aangepaste items terug; fouten blokkeren niets.
 */
export async function moveUpcomingInvites(owner: Owner, before: string, after: string) {
  if (before.toLowerCase() === after.toLowerCase() || !isSupabaseConfigured()) return 0
  const { swapAttendee } = await import('../google')
  const { CONTACT_EMAIL } = await import('../weekly/types')
  const db = createServiceSupabase()
  const now = new Date().toISOString()
  const ids: string[] = []
  const { data: ws } = await db.from('weeklies').select('calendar_event_id').neq('status', 'concluded').gte('starts_at', now).not('calendar_event_id', 'is', null)
  ids.push(...(ws ?? []).map((w) => w.calendar_event_id as string))
  if (owner === 'casper') {
    const { data: cs } = await db.from('calls').select('calendar_event_id').eq('status', 'gepland').gte('starts_at', now).not('calendar_event_id', 'is', null)
    ids.push(...(cs ?? []).map((c) => c.calendar_event_id as string))
  }
  let n = 0
  for (const id of ids) if (await swapAttendee(CONTACT_EMAIL, id, before, after).catch(() => false)) n++
  return n
}
