import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sortFreelancers, type Freelancer, type FreelancerInput, type FreelancerPatch } from './types'

export interface FreelancersRepo {
  list(): Promise<Freelancer[]>
  create(input: FreelancerInput, by: string): Promise<Freelancer>
  update(id: string, patch: FreelancerPatch): Promise<void>
  remove(id: string): Promise<void>
}

export function supabaseFreelancers(db: SupabaseClient): FreelancersRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async list() {
      return sortFreelancers(((check(await db.from('freelancers').select('*')) ?? []) as Freelancer[]).map((f) => ({ ...f, client_ids: f.client_ids ?? [] })))
    },
    async create(input, by) {
      const f = check(await db.from('freelancers').insert({ ...input, created_by: by }).select('*').single())
      if (!f) throw new Error('Freelancer aanmaken mislukt.')
      return f as Freelancer
    },
    async update(id, patch) {
      if (!Object.keys(patch).length) return
      const rows = check(await db.from('freelancers').update(patch).eq('id', id).select('id'))
      if (!rows?.length) throw new Error('Freelancer niet gevonden.')
    },
    async remove(id) {
      check(await db.from('freelancers').delete().eq('id', id))
    },
  }
}

/** Alleen lokaal zonder Supabase. */
const g = globalThis as unknown as { __ikrFreelancers?: Freelancer[] }
export function memoryFreelancers(): FreelancersRepo {
  const all = (g.__ikrFreelancers ??= [])
  const now = () => new Date().toISOString()
  return {
    async list() {
      return sortFreelancers(all.map((f) => ({ ...f, client_ids: [...f.client_ids] })))
    },
    async create(input, by) {
      const f: Freelancer = { ...input, client_ids: [...input.client_ids], id: crypto.randomUUID(), created_by: by, created_at: now(), updated_at: now() }
      all.push(f)
      return { ...f }
    },
    async update(id, patch) {
      const f = all.find((x) => x.id === id)
      if (!f) throw new Error('Freelancer niet gevonden.')
      Object.assign(f, patch, { updated_at: now() })
    },
    async remove(id) {
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all.splice(i, 1)
    },
  }
}
