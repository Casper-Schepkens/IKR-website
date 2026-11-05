import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/admin/env'
import { fnv, stampFromParts } from '@/lib/admin/live'
import type { AdminSession } from '@/lib/admin/session'
import { createServerSupabase, createServiceSupabase } from '@/lib/admin/supabase/server'

/**
 * Korte vingerafdruk van data die Grok Bot kan wijzigen (leads, concepten, to-do's, AI-taken).
 * Raakt Gmail en Apollo niet. Wordt ook bij de server-render meegegeven, zodat een wijziging
 * tussen render en eerste controle niet gemist wordt.
 */
export async function liveStamp(session: AdminSession): Promise<string> {
  if (session.mode === 'demo') return demoStamp(session)
  if (!isSupabaseConfigured()) return 'leeg'
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceSupabase() : await createServerSupabase()
  const [actions, jobs, leads, drafts, todos, notes, weeklies] = await Promise.all([
    edge(db, 'bot_actions', 'created_at'),
    edge(db, 'ai_jobs', 'finished_at'),
    edge(db, 'leads', 'updated_at'),
    edge(db, 'mail_drafts', 'updated_at'),
    digest(db, 'weekly_todos', ['id', 'title', 'owner', 'kind', 'weekly_id', 'pushed_count', 'pushed_at', 'done_at']),
    digest(db, 'weekly_todo_notes', ['id', 'todo_id', 'body']),
    digest(db, 'weeklies', ['id', 'status', 'starts_at', 'mode', 'meet_url', 'concluded_at', 'recording_url']),
  ])
  return stampFromParts({ actions, jobs, leads, drafts, todos, notes, weeklies })
}

async function demoStamp(session: AdminSession) {
  const [leads, drafts, todos, weeklies] = await Promise.all([
    session.leads.list(),
    session.drafts.list(),
    session.weekly.listTodos(),
    session.weekly.listWeeklies(),
  ])
  return stampFromParts({
    leads: `${leads.length}:${leads.map((l) => l.updated_at).sort().at(-1) ?? ''}`,
    drafts: `${drafts.length}:${fnv(
      drafts
        .map((d) => [d.id, d.updated_at, d.from_email, d.to_email, d.cc.join(','), d.subject, d.body, d.context ?? '', d.status].join('|'))
        .sort()
        .join('\n'),
    )}`,
    todos: fnv(todos.map((t) => [t.id, t.title, t.owner, t.kind, t.weekly_id ?? '', t.pushed_count, t.done_at ?? ''].join('|')).sort().join('\n')),
    notes: fnv(todos.flatMap((t) => t.notes.map((n) => `${n.id}:${n.body}`)).sort().join('\n')),
    weeklies: fnv(weeklies.map((w) => [w.id, w.status, w.starts_at, w.mode, w.meet_url ?? '', w.concluded_at ?? ''].join('|')).sort().join('\n')),
  })
}

async function edge(db: SupabaseClient, table: string, column: string) {
  const { count, data, error } = await db
    .from(table)
    .select(column, { count: 'exact' })
    .order(column, { ascending: false, nullsFirst: false })
    .limit(1)
  if (error) return 'na'
  const row = data?.[0] as unknown
  const top = row && typeof row === 'object' && column in row ? (row as Record<string, unknown>)[column] : ''
  return `${count ?? 0}:${top ?? ''}`
}

async function digest(db: SupabaseClient, table: string, columns: string[]) {
  const { data, error } = await db.from(table).select(columns.join(',')).limit(1000)
  if (error) return 'na'
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const text = rows
    .map((row) => columns.map((c) => String(row[c] ?? '')).join('|'))
    .sort()
    .join('\n')
  return `${data?.length ?? 0}:${fnv(text)}`
}
