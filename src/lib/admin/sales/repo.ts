import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lead, LeadInput, LostReason, Stage } from './types'

export interface LeadsRepo {
  list(): Promise<Lead[]>
  get(id: string): Promise<Lead | null>
  create(input: LeadInput): Promise<Lead>
  update(id: string, input: LeadInput): Promise<void>
  setStage(id: string, stage: Stage): Promise<void>
  markLost(id: string, reason: LostReason, note: string | null): Promise<void>
}

function friendly(message: string) {
  if (message.includes('leads_email_key')) return 'Er bestaat al een lead met dit e-mailadres.'
  return message
}

export function supabaseLeads(db: SupabaseClient): LeadsRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(friendly(r.error.message))
    return r.data
  }
  return {
    async list() {
      return check(await db.from('leads').select('*').order('updated_at', { ascending: false })) ?? []
    },
    async get(id) {
      return check(await db.from('leads').select('*').eq('id', id).maybeSingle())
    },
    async create(input) {
      const lead = check(await db.from('leads').insert(input).select('*').single())
      if (!lead) throw new Error('Aanmaken mislukt.')
      return lead
    },
    async update(id, input) {
      check(await db.from('leads').update(input).eq('id', id))
    },
    async setStage(id, stage) {
      check(await db.from('leads').update({ stage, lost_reason: null, lost_note: null }).eq('id', id))
    },
    async markLost(id, reason, note) {
      check(await db.from('leads').update({ stage: 'lost', lost_reason: reason, lost_note: note }).eq('id', id))
    },
  }
}

/** Alleen lokaal zonder Supabase: leads in het geheugen, zodat het scherm testbaar is. */
const g = globalThis as unknown as { __ikrLeads?: Lead[] }
export function memoryLeads(): LeadsRepo {
  const now = () => new Date().toISOString()
  if (!g.__ikrLeads) g.__ikrLeads = []
  const all = g.__ikrLeads
  const find = (id: string) => {
    const l = all.find((x) => x.id === id)
    if (!l) throw new Error('Lead niet gevonden')
    return l
  }
  return {
    async list() {
      return [...all].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    },
    async get(id) {
      return all.find((x) => x.id === id) ?? null
    },
    async create(input) {
      if (input.email && all.some((x) => x.email?.toLowerCase() === input.email!.toLowerCase()))
        throw new Error('Er bestaat al een lead met dit e-mailadres.')
      const t = now()
      const lead: Lead = {
        next_action: null,
        follow_up_on: null,
        notes: null,
        ...input,
        id: crypto.randomUUID(),
        stage: 'lead',
        lost_reason: null,
        lost_note: null,
        stage_changed_at: t,
        created_at: t,
        updated_at: t,
      }
      all.push(lead)
      return lead
    },
    async update(id, input) {
      Object.assign(find(id), input, { updated_at: now() })
    },
    async setStage(id, stage) {
      const l = find(id)
      Object.assign(l, { stage, lost_reason: null, lost_note: null, updated_at: now(), stage_changed_at: now() })
    },
    async markLost(id, reason, note) {
      const l = find(id)
      Object.assign(l, { stage: 'lost', lost_reason: reason, lost_note: note, updated_at: now(), stage_changed_at: now() })
    },
  }
}
