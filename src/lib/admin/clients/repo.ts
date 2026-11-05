import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sortClients, type Client, type ClientInput } from './types'

export interface ClientsRepo {
  list(): Promise<Client[]>
  create(input: ClientInput, by: string): Promise<Client>
  update(id: string, input: Partial<ClientInput>): Promise<void>
  remove(id: string): Promise<void>
}

const friendly = (m: string) => (m.includes('clients_name_key') ? 'Er bestaat al een klant met die naam.' : m)

export function supabaseClients(db: SupabaseClient): ClientsRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(friendly(r.error.message))
    return r.data
  }
  return {
    async list() {
      return sortClients((check(await db.from('clients').select('*')) ?? []) as Client[])
    },
    async create(input, by) {
      const c = check(await db.from('clients').insert({ ...input, created_by: by }).select('*').single())
      if (!c) throw new Error('Klant aanmaken mislukt.')
      return c as Client
    },
    async update(id, input) {
      check(await db.from('clients').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id))
    },
    async remove(id) {
      check(await db.from('clients').delete().eq('id', id))
    },
  }
}

/** Alleen lokaal zonder Supabase. */
const g = globalThis as unknown as { __ikrClients?: Client[] }
export function memoryClients(): ClientsRepo {
  const all = (g.__ikrClients ??= [])
  const now = () => new Date().toISOString()
  return {
    async list() {
      return sortClients(all)
    },
    async create(input, by) {
      if (all.some((c) => c.name.toLowerCase() === input.name.toLowerCase())) throw new Error('Er bestaat al een klant met die naam.')
      const c: Client = { ...input, id: crypto.randomUUID(), created_by: by, created_at: now(), updated_at: now() }
      all.push(c)
      return c
    },
    async update(id, input) {
      const c = all.find((x) => x.id === id)
      if (!c) throw new Error('Klant niet gevonden.')
      Object.assign(c, input, { updated_at: now() })
    },
    async remove(id) {
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all.splice(i, 1)
    },
  }
}
