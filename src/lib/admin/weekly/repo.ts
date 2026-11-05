import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Owner, Todo, TodoNote, Weekly, WeeklyMode } from './types'

export type NewWeekly = { starts_at: string; mode: WeeklyMode; created_by: string }
export type WeeklyPatch = Partial<
  Pick<Weekly, 'meet_url' | 'calendar_event_id' | 'calendar_error' | 'status' | 'started_at' | 'concluded_at' | 'recording_url'>
>
export type NewTodo = { owner: Owner; title: string; kind: 'weekly' | 'long'; weekly_id: string | null; created_by: string }

export interface WeeklyRepo {
  listWeeklies(): Promise<Weekly[]>
  getWeekly(id: string): Promise<Weekly | null>
  createWeekly(input: NewWeekly): Promise<Weekly>
  updateWeekly(id: string, patch: WeeklyPatch): Promise<void>
  listTodos(): Promise<Todo[]>
  createTodo(input: NewTodo, note: string | null): Promise<void>
  updateTodo(id: string, patch: Partial<Pick<Todo, 'title' | 'owner' | 'kind'>>): Promise<void>
  deleteTodo(id: string): Promise<void>
  setDone(id: string, by: string | null): Promise<void>
  addNote(todoId: string, body: string, author: string): Promise<void>
  /**
   * Notitie-knop: past de eigen (laatste) notitie van `author` bij deze to-do aan, of maakt er een
   * als die nog niet bestaat. Een lege tekst haalt de eigen notitie weg.
   */
  saveOwnNote(todoId: string, body: string, author: string): Promise<void>
  /** Schuift een to-do door naar de volgende weekly (die nog ingepland wordt). */
  push(id: string): Promise<void>
  /** Doorschuiven ongedaan maken (zolang de to-do nog niet aan een nieuwe weekly hangt). */
  unpush(id: string): Promise<void>
  /** Koppelt alle open gewone to-do's zonder weekly aan deze weekly. */
  assignPending(weeklyId: string): Promise<void>
}

export function supabaseWeekly(db: SupabaseClient): WeeklyRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async listWeeklies() {
      return check(await db.from('weeklies').select('*').order('starts_at', { ascending: false })) ?? []
    },
    async getWeekly(id) {
      return check(await db.from('weeklies').select('*').eq('id', id).maybeSingle())
    },
    async createWeekly(input) {
      const w = check(await db.from('weeklies').insert(input).select('*').single())
      if (!w) throw new Error('Inplannen mislukt.')
      return w
    },
    async updateWeekly(id, patch) {
      check(await db.from('weeklies').update(patch).eq('id', id))
    },
    async listTodos() {
      const rows =
        check(
          await db
            .from('weekly_todos')
            .select('*, notes:weekly_todo_notes(*)')
            .order('created_at', { ascending: true }),
        ) ?? []
      return (rows as Todo[]).map((t) => ({
        ...t,
        notes: [...(t.notes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      }))
    },
    async createTodo(input, note) {
      const t = check(await db.from('weekly_todos').insert(input).select('id').single())
      if (note && t) check(await db.from('weekly_todo_notes').insert({ todo_id: t.id, body: note, author: input.created_by }))
    },
    async updateTodo(id, patch) {
      check(await db.from('weekly_todos').update(patch).eq('id', id))
    },
    async deleteTodo(id) {
      check(await db.from('weekly_todos').delete().eq('id', id))
    },
    async setDone(id, by) {
      check(await db.from('weekly_todos').update({ done_at: by ? new Date().toISOString() : null, done_by: by }).eq('id', id))
    },
    async addNote(todoId, body, author) {
      check(await db.from('weekly_todo_notes').insert({ todo_id: todoId, body, author }))
    },
    async saveOwnNote(todoId, body, author) {
      const own = check(
        await db
          .from('weekly_todo_notes')
          .select('id')
          .eq('todo_id', todoId)
          .eq('author', author)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      )
      if (!own) {
        if (body) check(await db.from('weekly_todo_notes').insert({ todo_id: todoId, body, author }))
        return
      }
      if (body) check(await db.from('weekly_todo_notes').update({ body }).eq('id', own.id))
      else check(await db.from('weekly_todo_notes').delete().eq('id', own.id))
    },
    async push(id) {
      const t = check(await db.from('weekly_todos').select('pushed_count, pushed_at, weekly_id').eq('id', id).single())
      if (!t || t.pushed_at) return // al doorgeschoven: een tweede klik telt niet dubbel
      check(
        await db
          .from('weekly_todos')
          .update({ weekly_id: null, pushed_count: (t.pushed_count ?? 0) + 1, pushed_at: new Date().toISOString(), pushed_from: t.weekly_id })
          .eq('id', id)
          .is('pushed_at', null),
      )
    },
    async unpush(id) {
      const t = check(await db.from('weekly_todos').select('pushed_count, pushed_at, pushed_from').eq('id', id).single())
      if (!t?.pushed_at) throw new Error('Deze to-do kan niet meer teruggezet worden (de volgende weekly is al ingepland).')
      check(
        await db
          .from('weekly_todos')
          .update({ weekly_id: t.pushed_from, pushed_count: Math.max(0, (t.pushed_count ?? 1) - 1), pushed_at: null, pushed_from: null })
          .eq('id', id)
          .not('pushed_at', 'is', null),
      )
    },
    async assignPending(weeklyId) {
      check(
        await db
          .from('weekly_todos')
          .update({ weekly_id: weeklyId, pushed_at: null, pushed_from: null })
          .eq('kind', 'weekly')
          .is('weekly_id', null)
          .is('done_at', null),
      )
    },
  }
}

/** Alleen lokaal zonder Supabase: in het geheugen, om de schermen te testen. */
const g = globalThis as unknown as { __ikrWeekly?: { weeklies: Weekly[]; todos: Todo[] } }
export function memoryWeekly(): WeeklyRepo {
  if (!g.__ikrWeekly) g.__ikrWeekly = { weeklies: [], todos: [] }
  const s = g.__ikrWeekly
  const now = () => new Date().toISOString()
  const todo = (id: string) => {
    const t = s.todos.find((x) => x.id === id)
    if (!t) throw new Error('To-do niet gevonden')
    return t
  }
  return {
    async listWeeklies() {
      return [...s.weeklies].sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    },
    async getWeekly(id) {
      return s.weeklies.find((w) => w.id === id) ?? null
    },
    async createWeekly(input) {
      const w: Weekly = {
        ...input,
        id: crypto.randomUUID(),
        meet_url: null,
        calendar_event_id: null,
        calendar_error: null,
        status: 'planned',
        started_at: null,
        concluded_at: null,
        recording_url: null,
        created_at: now(),
      }
      s.weeklies.push(w)
      return w
    },
    async updateWeekly(id, patch) {
      Object.assign(s.weeklies.find((w) => w.id === id) ?? {}, patch)
    },
    async listTodos() {
      return [...s.todos]
    },
    async createTodo(input, note) {
      const id = crypto.randomUUID()
      const notes: TodoNote[] = note ? [{ id: crypto.randomUUID(), todo_id: id, body: note, author: input.created_by, created_at: now() }] : []
      s.todos.push({ ...input, id, pushed_count: 0, done_at: null, done_by: null, created_at: now(), notes })
    },
    async updateTodo(id, patch) {
      Object.assign(todo(id), patch)
    },
    async deleteTodo(id) {
      s.todos = s.todos.filter((t) => t.id !== id)
    },
    async setDone(id, by) {
      Object.assign(todo(id), { done_at: by ? now() : null, done_by: by })
    },
    async addNote(todoId, body, author) {
      todo(todoId).notes.push({ id: crypto.randomUUID(), todo_id: todoId, body, author, created_at: now() })
    },
    async saveOwnNote(todoId, body, author) {
      const t = todo(todoId)
      const own = [...t.notes].reverse().find((n) => n.author === author)
      if (!own) {
        if (body) t.notes.push({ id: crypto.randomUUID(), todo_id: todoId, body, author, created_at: now() })
      } else if (body) own.body = body
      else t.notes = t.notes.filter((n) => n.id !== own.id)
    },
    async push(id) {
      const t = todo(id)
      if (t.pushed_at) return
      Object.assign(t, { weekly_id: null, pushed_count: t.pushed_count + 1, pushed_at: now(), pushed_from: t.weekly_id })
    },
    async unpush(id) {
      const t = todo(id)
      if (!t.pushed_at) throw new Error('Deze to-do kan niet meer teruggezet worden (de volgende weekly is al ingepland).')
      Object.assign(t, { weekly_id: t.pushed_from ?? null, pushed_count: Math.max(0, t.pushed_count - 1), pushed_at: null, pushed_from: null })
    },
    async assignPending(weeklyId) {
      s.todos
        .filter((t) => t.kind === 'weekly' && !t.weekly_id && !t.done_at)
        .forEach((t) => Object.assign(t, { weekly_id: weeklyId, pushed_at: null, pushed_from: null }))
    },
  }
}
