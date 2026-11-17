/**
 * Minimale Supabase-client in het geheugen voor tests: from(), select, insert, update, upsert, delete,
 * filters eq / neq / in / is / lt / gte / or (enkel "status.in.(…)" en "and(status.eq.x,col.lt.y)") en
 * order / limit / single / maybeSingle. Genoeg om atomaire updates (update … where … select) te testen.
 */
type Row = Record<string, unknown>
type Filter = (r: Row) => boolean

export function fakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]))
  const table = (name: string) => (tables[name] ??= [])

  function builder(name: string) {
    const filters: Filter[] = []
    let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
    let payload: Row | Row[] | null = null
    let returning = false
    let single: 'one' | 'maybe' | null = null
    let limitN: number | null = null
    let order: { col: string; asc: boolean } | null = null
    let countHead = false

    const parseValue = (v: string): unknown => (v === 'null' ? null : v)
    const orPart = (part: string): Filter => {
      const and = part.match(/^and\((.*)\)$/)
      if (and) {
        const subs = and[1].split(',').map(orPart)
        return (r) => subs.every((f) => f(r))
      }
      const [col, opName, ...rest] = part.split('.')
      const val = rest.join('.')
      if (opName === 'in') {
        const list = val.replace(/^\(|\)$/g, '').split(',')
        return (r) => list.includes(String(r[col]))
      }
      if (opName === 'eq') return (r) => String(r[col]) === val
      if (opName === 'lt') return (r) => r[col] != null && String(r[col]) < val
      throw new Error(`fakeSupabase: or-filter ${part} niet ondersteund`)
    }

    const api = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (op === 'select') op = 'select'
        else returning = true
        if (opts?.head) countHead = true
        return api
      },
      insert(v: Row | Row[]) {
        op = 'insert'
        payload = v
        return api
      },
      upsert(v: Row | Row[]) {
        op = 'upsert'
        payload = v
        return api
      },
      update(v: Row) {
        op = 'update'
        payload = v
        return api
      },
      delete() {
        op = 'delete'
        return api
      },
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v)
        return api
      },
      neq(col: string, v: unknown) {
        filters.push((r) => r[col] !== v)
        return api
      },
      in(col: string, vs: unknown[]) {
        filters.push((r) => vs.includes(r[col]))
        return api
      },
      is(col: string, v: unknown) {
        filters.push((r) => (r[col] ?? null) === v)
        return api
      },
      lt(col: string, v: unknown) {
        filters.push((r) => r[col] != null && String(r[col]) < String(v))
        return api
      },
      gte(col: string, v: unknown) {
        filters.push((r) => r[col] != null && String(r[col]) >= String(v))
        return api
      },
      or(expr: string) {
        const parts = expr.match(/(and\([^)]*\)|[^,]+\.in\.\([^)]*\)|[^,]+)/g) ?? []
        const fs = parts.map((p) => orPart(p.replace(/^,/, '')))
        filters.push((r) => fs.some((f) => f(r)))
        void parseValue
        return api
      },
      order(col: string, o?: { ascending?: boolean }) {
        order = { col, asc: o?.ascending ?? true }
        return api
      },
      limit(n: number) {
        limitN = n
        return api
      },
      single() {
        single = 'one'
        return api
      },
      maybeSingle() {
        single = 'maybe'
        return api
      },
      then(resolve: (v: { data: unknown; error: { message: string } | null; count?: number }) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(run()).then(resolve, reject)
      },
    }

    function run() {
      const rows = table(name)
      const match = (r: Row) => filters.every((f) => f(r))
      let out: Row[] = []
      if (op === 'insert' || op === 'upsert') {
        const list = (Array.isArray(payload) ? payload : [payload]) as Row[]
        for (const p of list) {
          const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...p }
          const key = op === 'upsert' ? Object.keys(p).find((k) => k === 'id' || k === 'key' || k === 'email') : undefined
          const existing = key ? rows.find((r) => r[key] === p[key]) : undefined
          if (existing) Object.assign(existing, p)
          else rows.push(row)
          out.push(existing ?? row)
        }
      } else if (op === 'update') {
        out = rows.filter(match)
        for (const r of out) Object.assign(r, payload)
      } else if (op === 'delete') {
        out = rows.filter(match)
        tables[name] = rows.filter((r) => !match(r))
      } else out = rows.filter(match)
      if (order) {
        const { col, asc } = order
        out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1))
      }
      if (limitN !== null) out = out.slice(0, limitN)
      const copy = out.map((r) => ({ ...r }))
      if (countHead) return { data: null, error: null, count: copy.length }
      if (op !== 'select' && !returning && single === null) return { data: null, error: null }
      if (single) {
        if (copy.length > 1) return { data: null, error: { message: 'meer dan één rij' } }
        if (!copy.length && single === 'one') return { data: null, error: { message: 'geen rij' } }
        return { data: copy[0] ?? null, error: null }
      }
      return { data: copy, error: null, count: copy.length }
    }
    return api
  }

  return { from: builder, tables }
}
