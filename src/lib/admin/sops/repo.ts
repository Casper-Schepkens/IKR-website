import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Sop, SopInput } from './types'

export interface SopsRepo {
  list(): Promise<Sop[]>
  create(input: SopInput, by: string, via?: Sop['created_via']): Promise<Sop>
  update(id: string, patch: Partial<SopInput>): Promise<void>
  remove(id: string): Promise<void>
}

export function supabaseSops(db: SupabaseClient): SopsRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async list() {
      return (check(await db.from('sops').select('*').order('created_at')) ?? []) as Sop[]
    },
    async create(input, by, via = 'dashboard') {
      return check(await db.from('sops').insert({ ...input, created_by: by, created_via: via }).select('*').single()) as Sop
    },
    async update(id, patch) {
      check(await db.from('sops').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id))
    },
    async remove(id) {
      check(await db.from('sops').delete().eq('id', id))
    },
  }
}

/** Alleen lokaal zonder Supabase. */
const g = globalThis as unknown as { __ikrSops?: Sop[] }
export function memorySops(): SopsRepo {
  const all = (g.__ikrSops ??= [])
  const now = () => new Date().toISOString()
  const get = (id: string) => {
    const s = all.find((x) => x.id === id)
    if (!s) throw new Error('SOP niet gevonden.')
    return s
  }
  return {
    async list() {
      return [...all]
    },
    async create(input, by, via = 'dashboard') {
      const s: Sop = { status: 'afgesproken', source: null, source_url: null, quote: null, ...input, id: crypto.randomUUID(), created_by: by, created_via: via, created_at: now(), updated_at: now() }
      all.push(s)
      return s
    },
    async update(id, patch) {
      Object.assign(get(id), patch, { updated_at: now() })
    },
    async remove(id) {
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all.splice(i, 1)
    },
  }
}
