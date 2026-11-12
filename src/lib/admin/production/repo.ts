import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cycle, Production, StepState } from './core'

export type ProductionData = { productions: Production[]; cycles: Cycle[]; states: StepState[] }
export type StepPatch = { done?: boolean; by?: string; due_on?: string | null; link?: string | null; note?: string | null }

export interface ProductionRepo {
  load(): Promise<ProductionData>
  /** Maakt de productie aan als ze nog niet bestaat. */
  upsert(clientId: string, patch: Partial<Omit<Production, 'client_id'>>): Promise<void>
  addCycle(clientId: string, shoot: { shoot_on?: string | null; shoot_time?: string | null }): Promise<Cycle>
  updateCycle(id: string, patch: Partial<Pick<Cycle, 'shoot_on' | 'shoot_time'>> & { calendar_event_id?: string | null }): Promise<void>
  removeCycle(id: string): Promise<void>
  setStep(clientId: string, cycleId: string | null, step: string, patch: StepPatch): Promise<void>
}


export function supabaseProduction(db: SupabaseClient): ProductionRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async load() {
      const [p, c, s] = await Promise.all([
        db.from('production').select('client_id, signed_on, kickoff_on, strategy_on, active, note'),
        db.from('production_cycles').select('id, client_id, no, shoot_on, shoot_time, calendar_event_id').order('no'),
        db.from('production_steps').select('client_id, cycle_id, step, done_at, done_by, due_on, link, note'),
      ])
      return { productions: (check(p) ?? []) as Production[], cycles: (check(c) ?? []) as Cycle[], states: (check(s) ?? []) as StepState[] }
    },
    async upsert(clientId, patch) {
      check(await db.from('production').upsert({ client_id: clientId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'client_id' }))
    },
    async addCycle(clientId, shoot) {
      const { data: last } = await db.from('production_cycles').select('no').eq('client_id', clientId).order('no', { ascending: false }).limit(1).maybeSingle()
      return check(await db.from('production_cycles').insert({ client_id: clientId, no: (last?.no ?? 0) + 1, shoot_on: shoot.shoot_on ?? null, shoot_time: shoot.shoot_time ?? null }).select('*').single()) as Cycle
    },
    async updateCycle(id, patch) {
      check(await db.from('production_cycles').update(patch).eq('id', id))
    },
    async removeCycle(id) {
      check(await db.from('production_cycles').delete().eq('id', id))
    },
    async setStep(clientId, cycleId, step, patch) {
      const q = db.from('production_steps').select('id').eq('client_id', clientId).eq('step', step)
      const { data: existing } = await (cycleId ? q.eq('cycle_id', cycleId) : q.is('cycle_id', null)).maybeSingle()
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (patch.done !== undefined) Object.assign(row, { done_at: patch.done ? new Date().toISOString() : null, done_by: patch.done ? (patch.by ?? null) : null })
      if (patch.due_on !== undefined) row.due_on = patch.due_on
      if (patch.link !== undefined) row.link = patch.link
      if (patch.note !== undefined) row.note = patch.note
      if (existing) check(await db.from('production_steps').update(row).eq('id', existing.id))
      else check(await db.from('production_steps').insert({ client_id: clientId, cycle_id: cycleId, step, ...row }))
    },
  }
}

/** Alleen lokaal zonder Supabase. */
const g = globalThis as unknown as { __ikrProd?: ProductionData }
export function memoryProduction(): ProductionRepo {
  const d = (g.__ikrProd ??= { productions: [], cycles: [], states: [] })
  return {
    async load() {
      return { productions: d.productions.map((p) => ({ ...p })), cycles: d.cycles.map((c) => ({ ...c })), states: d.states.map((s) => ({ ...s })) }
    },
    async upsert(clientId, patch) {
      let p = d.productions.find((x) => x.client_id === clientId)
      if (!p) d.productions.push((p = { client_id: clientId, signed_on: null, kickoff_on: null, strategy_on: null, active: true, note: null }))
      Object.assign(p, patch)
    },
    async addCycle(clientId, shoot) {
      const no = Math.max(0, ...d.cycles.filter((c) => c.client_id === clientId).map((c) => c.no)) + 1
      const c: Cycle = { id: crypto.randomUUID(), client_id: clientId, no, shoot_on: shoot.shoot_on ?? null, shoot_time: shoot.shoot_time ?? null }
      d.cycles.push(c)
      return c
    },
    async updateCycle(id, patch) {
      const c = d.cycles.find((x) => x.id === id)
      if (!c) throw new Error('Draaidag niet gevonden.')
      Object.assign(c, patch)
    },
    async removeCycle(id) {
      d.cycles = d.cycles.filter((c) => c.id !== id)
      d.states = d.states.filter((s) => s.cycle_id !== id)
    },
    async setStep(clientId, cycleId, step, patch) {
      let s = d.states.find((x) => x.client_id === clientId && x.cycle_id === cycleId && x.step === step)
      if (!s) d.states.push((s = { client_id: clientId, cycle_id: cycleId, step, done_at: null, done_by: null, due_on: null, link: null, note: null }))
      if (patch.done !== undefined) Object.assign(s, { done_at: patch.done ? new Date().toISOString() : null, done_by: patch.done ? (patch.by ?? null) : null })
      if (patch.due_on !== undefined) s.due_on = patch.due_on
      if (patch.link !== undefined) s.link = patch.link
      if (patch.note !== undefined) s.note = patch.note
    },
  }
}
