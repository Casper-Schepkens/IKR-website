import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Opslag van de productie: een paar kleine tabellen, generiek gelezen en geschreven, zodat elke
 * wijziging (wie, wat, wanneer, rij ervoor en erna) in het wijzigingslog komt en terug te draaien is.
 */
export const TABLES = [
  'production',
  'production_cycles',
  'production_steps',
  'production_client_steps',
  'production_templates',
  'production_template_steps',
  'production_internal_tasks',
  'production_internal_done',
] as const
export type Table = (typeof TABLES)[number]
export type Row = Record<string, unknown>
/** Sleutel van een rij: production per klant, de rest per id. */
export const pkOf = (table: Table) => (table === 'production' ? 'client_id' : 'id')

export type RowChange = { table: Table; pk: string; before: Row | null; after: Row | null }
export type ChangeEntry = {
  id: string
  created_at: string
  by: string
  summary: string
  client_id: string | null
  changes: RowChange[]
  reverted_at: string | null
  reverted_by: string | null
  revert_of: string | null
}

export interface ProductionStore {
  all(table: Table): Promise<Row[]>
  get(table: Table, pk: string): Promise<Row | null>
  insert(table: Table, row: Row): Promise<Row>
  update(table: Table, pk: string, patch: Row): Promise<{ before: Row; after: Row } | null>
  remove(table: Table, pk: string): Promise<Row | null>
  addChange(entry: Omit<ChangeEntry, 'id' | 'created_at' | 'reverted_at' | 'reverted_by'>): Promise<ChangeEntry>
  changes(opts?: { clientId?: string; limit?: number }): Promise<ChangeEntry[]>
  change(id: string): Promise<ChangeEntry | null>
  markReverted(id: string, by: string): Promise<void>
}

export function supabaseProductionStore(db: SupabaseClient): ProductionStore {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async all(table) {
      return (check(await db.from(table).select('*')) ?? []) as Row[]
    },
    async get(table, pk) {
      return (check(await db.from(table).select('*').eq(pkOf(table), pk).maybeSingle()) ?? null) as Row | null
    },
    async insert(table, row) {
      return check(await db.from(table).insert(row).select('*').single()) as Row
    },
    async update(table, pk, patch) {
      const before = (check(await db.from(table).select('*').eq(pkOf(table), pk).maybeSingle()) ?? null) as Row | null
      if (!before) return null
      const after = check(await db.from(table).update(patch).eq(pkOf(table), pk).select('*').single()) as Row
      return { before, after }
    },
    async remove(table, pk) {
      const rows = (check(await db.from(table).delete().eq(pkOf(table), pk).select('*')) ?? []) as Row[]
      return rows[0] ?? null
    },
    async addChange(entry) {
      return check(await db.from('production_changes').insert(entry).select('*').single()) as ChangeEntry
    },
    async changes(opts = {}) {
      let q = db.from('production_changes').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 30)
      if (opts.clientId) q = q.eq('client_id', opts.clientId)
      return (check(await q) ?? []) as ChangeEntry[]
    },
    async change(id) {
      return (check(await db.from('production_changes').select('*').eq('id', id).maybeSingle()) ?? null) as ChangeEntry | null
    },
    async markReverted(id, by) {
      check(await db.from('production_changes').update({ reverted_at: new Date().toISOString(), reverted_by: by }).eq('id', id))
    },
  }
}

/** In het geheugen: lokaal zonder Supabase en in de tests. */
type Mem = { tables: Record<Table, Row[]>; log: ChangeEntry[] }
const g = globalThis as unknown as { __ikrProdStore?: Mem }
const copy = <T>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T))

export function memoryProductionStore(seed?: (insert: (table: Table, row: Row) => void) => void): ProductionStore {
  let m = g.__ikrProdStore
  if (!m) {
    m = g.__ikrProdStore = { tables: Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Record<Table, Row[]>, log: [] }
    seed?.((table, row) => m!.tables[table].push(withDefaults(table, row)))
  }
  const mem = m
  const find = (table: Table, pk: string) => mem.tables[table].find((r) => String(r[pkOf(table)]) === pk)
  return {
    async all(table) {
      return copy(mem.tables[table])
    },
    async get(table, pk) {
      return copy(find(table, pk) ?? null)
    },
    async insert(table, row) {
      const r = withDefaults(table, row)
      if (find(table, String(r[pkOf(table)]))) throw new Error(`Bestaat al (${table}).`)
      mem.tables[table].push(r)
      return copy(r)
    },
    async update(table, pk, patch) {
      const r = find(table, pk)
      if (!r) return null
      const before = copy(r)
      Object.assign(r, copy(patch))
      return { before, after: copy(r) }
    },
    async remove(table, pk) {
      const i = mem.tables[table].findIndex((r) => String(r[pkOf(table)]) === pk)
      if (i < 0) return null
      return copy(mem.tables[table].splice(i, 1)[0])
    },
    async addChange(entry) {
      const e: ChangeEntry = { ...copy(entry), id: crypto.randomUUID(), created_at: new Date().toISOString(), reverted_at: null, reverted_by: null }
      mem.log.unshift(e)
      return copy(e)
    },
    async changes(opts = {}) {
      return copy(mem.log.filter((e) => !opts.clientId || e.client_id === opts.clientId).slice(0, opts.limit ?? 30))
    },
    async change(id) {
      return copy(mem.log.find((e) => e.id === id) ?? null)
    },
    async markReverted(id, by) {
      const e = mem.log.find((x) => x.id === id)
      if (e) Object.assign(e, { reverted_at: new Date().toISOString(), reverted_by: by })
    },
  }
}

const DEFAULTS: Partial<Record<Table, Row>> = {
  production: { signed_on: null, kickoff_on: null, strategy_on: null, active: true, note: null, rhythm: null },
  production_cycles: { shoot_on: null, shoot_time: null, calendar_event_id: null },
  production_steps: { cycle_id: null, done_at: null, done_by: null, due_on: null, link: null, note: null },
  production_client_steps: { link: null, note: null, done_when: null, is_shoot: false, rule: { kind: 'none' } },
  production_template_steps: { link: null, note: null, done_when: null, is_shoot: false, rule: { kind: 'none' } },
  production_internal_tasks: { link: null, note: null, active: true },
  production_internal_done: { done_by: null },
}
function withDefaults(table: Table, row: Row): Row {
  const now = new Date().toISOString()
  return {
    ...(pkOf(table) === 'id' ? { id: crypto.randomUUID() } : {}),
    created_at: now,
    ...(table === 'production' || table === 'production_steps' ? { updated_at: now } : {}),
    ...DEFAULTS[table],
    ...copy(row),
  }
}

// ─── Wijzigingen bundelen per actie ─────────────────────
/** Velden die bij terugdraaien/vergelijken niet meetellen (tijdstempels, agenda-koppeling). */
const VOLATILE = new Set(['updated_at', 'calendar_event_id'])
const stable = (r: Row | null) =>
  r == null
    ? 'null'
    : JSON.stringify(
        Object.keys(r)
          .filter((k) => !VOLATILE.has(k))
          .sort()
          .map((k) => [k, r[k]]),
      )
export const sameRow = (a: Row | null, b: Row | null) => stable(a) === stable(b)

/** Alle rijwijzigingen van één actie (bv. "startpunt gezet") komen samen in één regel van het log. */
export class ChangeSet {
  readonly changes: RowChange[] = []
  constructor(
    readonly store: ProductionStore,
    readonly by: string,
    public summary: string,
    public clientId: string | null = null,
    readonly revertOf: string | null = null,
  ) {}
  async insert(table: Table, row: Row) {
    const after = await this.store.insert(table, row)
    this.changes.push({ table, pk: String(after[pkOf(table)]), before: null, after })
    return after
  }
  async update(table: Table, pk: string, patch: Row) {
    const r = await this.store.update(table, pk, patch)
    if (r && !sameRow(r.before, r.after)) this.changes.push({ table, pk, before: r.before, after: r.after })
    return r?.after ?? null
  }
  async remove(table: Table, pk: string) {
    const before = await this.store.remove(table, pk)
    if (before) this.changes.push({ table, pk, before, after: null })
    return before
  }
  /** Bewaart de wijzigingen als één regel in het log (niets gewijzigd = geen regel). */
  async commit() {
    if (!this.changes.length) return null
    return this.store.addChange({ by: this.by, summary: this.summary.slice(0, 300), client_id: this.clientId, changes: this.changes, revert_of: this.revertOf })
  }
}

/**
 * Draait een wijziging terug: elke rij terug naar hoe ze ervoor was (in omgekeerde volgorde).
 * Weigert als een rij sindsdien opnieuw veranderde (eerst die latere wijziging terugdraaien).
 * Het terugdraaien zelf komt ook in het log (en is dus ook weer terug te draaien).
 */
export async function revertChange(store: ProductionStore, id: string, by: string) {
  const entry = await store.change(id)
  if (!entry) throw new Error('Wijziging niet gevonden.')
  if (entry.reverted_at) throw new Error('Deze wijziging is al teruggedraaid.')
  const rows = [...entry.changes].reverse()
  for (const c of rows) {
    const now = await store.get(c.table, c.pk)
    if (!sameRow(now, c.after))
      throw new Error(`Sinds "${entry.summary}" is er nog iets aan veranderd. Draai eerst de latere wijziging(en) terug.`)
  }
  const cs = new ChangeSet(store, by, `Teruggedraaid: ${entry.summary}`, entry.client_id, entry.id)
  for (const c of rows) {
    if (!c.before) await cs.remove(c.table, c.pk)
    else if (!c.after) await cs.insert(c.table, c.before)
    else {
      const patch = Object.fromEntries(Object.entries(c.before).filter(([k]) => k !== pkOf(c.table) && !VOLATILE.has(k)))
      await cs.update(c.table, c.pk, patch)
    }
  }
  const logged = await cs.commit()
  await store.markReverted(entry.id, by)
  return { entry, revert: logged, rows: entry.changes }
}
