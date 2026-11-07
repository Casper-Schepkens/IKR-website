import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sortCalls, type Call, type CallPatch, type NewCall } from './types'

export interface CallsRepo {
  list(opts?: { leadId?: string }): Promise<Call[]>
  get(id: string): Promise<Call | null>
  create(input: NewCall): Promise<Call>
  update(id: string, patch: CallPatch): Promise<void>
}

export function supabaseCalls(db: SupabaseClient): CallsRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async list(opts = {}) {
      let q = db.from('calls').select('*')
      if (opts.leadId) q = q.eq('lead_id', opts.leadId)
      return sortCalls((check(await q) ?? []) as Call[])
    },
    async get(id) {
      return (check(await db.from('calls').select('*').eq('id', id).maybeSingle()) as Call | null) ?? null
    },
    async create(input) {
      const c = check(await db.from('calls').insert(input).select('*').single())
      if (!c) throw new Error('Call aanmaken mislukt.')
      return c as Call
    },
    async update(id, patch) {
      check(await db.from('calls').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id))
    },
  }
}

/** Alleen lokaal zonder Supabase. */
const g = globalThis as unknown as { __ikrCalls?: Call[] }
export function memoryCalls(): CallsRepo {
  const all = (g.__ikrCalls ??= [])
  const now = () => new Date().toISOString()
  return {
    async list(opts = {}) {
      return sortCalls(all.filter((c) => !opts.leadId || c.lead_id === opts.leadId))
    },
    async get(id) {
      return all.find((c) => c.id === id) ?? null
    },
    async create(input) {
      const c: Call = {
        status: 'gepland',
        calendar_event_id: null,
        calendar_error: null,
        invited: false,
        recording_url: null,
        started_at: null,
        fireflies_added_at: null,
        finished_at: null,
        note: null,
        ...input,
        id: crypto.randomUUID(),
        created_at: now(),
        updated_at: now(),
      }
      all.push(c)
      return c
    },
    async update(id, patch) {
      const c = all.find((x) => x.id === id)
      if (!c) throw new Error('Call niet gevonden.')
      Object.assign(c, patch, { updated_at: now() })
    },
  }
}
