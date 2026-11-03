import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Afzenders waarvandaan een concept verstuurd mag worden. */
export const DRAFT_FROM = ['casper@iknowright.be', 'contact@iknowright.be'] as const
export type DraftFrom = (typeof DRAFT_FROM)[number]

export type MailDraft = {
  id: string
  lead_id: string
  from_email: DraftFrom
  to_email: string
  cc: string[]
  subject: string
  body: string
  is_html: boolean
  thread_id: string | null
  in_reply_to: string | null
  /** Uitleg van de bot: wie de lead is, wat er al gebeurde, waarom deze mail. */
  context: string | null
  /** Tekst zoals de bot hem schreef (om te leren van Caspers aanpassingen). */
  original_body: string | null
  status: 'concept' | 'verstuurd'
  created_by: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
  sent_by: string | null
}

export type NewDraft = Pick<MailDraft, 'lead_id' | 'from_email' | 'to_email' | 'cc' | 'subject' | 'body' | 'is_html' | 'thread_id' | 'in_reply_to' | 'context' | 'created_by'> & { original_body?: string | null }
export type DraftPatch = Partial<Pick<MailDraft, 'from_email' | 'to_email' | 'cc' | 'subject' | 'body' | 'is_html' | 'thread_id' | 'in_reply_to' | 'context'>>

export interface DraftsRepo {
  list(opts?: { leadId?: string; status?: MailDraft['status'] }): Promise<MailDraft[]>
  get(id: string): Promise<MailDraft | null>
  create(input: NewDraft): Promise<MailDraft>
  /** Enkel concepten (status 'concept'); geeft false als er niets aangepast werd. */
  update(id: string, patch: DraftPatch): Promise<boolean>
  remove(id: string): Promise<boolean>
  markSent(id: string, by: string): Promise<void>
}

export function supabaseDrafts(db: SupabaseClient): DraftsRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async list(opts = {}) {
      let q = db.from('mail_drafts').select('*').order('created_at', { ascending: false })
      if (opts.leadId) q = q.eq('lead_id', opts.leadId)
      if (opts.status) q = q.eq('status', opts.status)
      return (check(await q) ?? []) as MailDraft[]
    },
    async get(id) {
      return check(await db.from('mail_drafts').select('*').eq('id', id).maybeSingle()) as MailDraft | null
    },
    async create(input) {
      const d = check(await db.from('mail_drafts').insert(input).select('*').single()) as MailDraft | null
      if (!d) throw new Error('Concept bewaren mislukt.')
      return d
    },
    async update(id, patch) {
      const rows = check(
        await db.from('mail_drafts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'concept').select('id'),
      )
      return Boolean(rows?.length)
    },
    async remove(id) {
      const rows = check(await db.from('mail_drafts').delete().eq('id', id).eq('status', 'concept').select('id'))
      return Boolean(rows?.length)
    },
    async markSent(id, by) {
      check(
        await db
          .from('mail_drafts')
          .update({ status: 'verstuurd', sent_at: new Date().toISOString(), sent_by: by })
          .eq('id', id)
          .eq('status', 'concept'),
      )
    },
  }
}

/** In het geheugen: voor lokaal testen en de tests. */
export function memoryDrafts(store: MailDraft[] = []): DraftsRepo {
  const now = () => new Date().toISOString()
  return {
    async list(opts = {}) {
      return store
        .filter((d) => (!opts.leadId || d.lead_id === opts.leadId) && (!opts.status || d.status === opts.status))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
    async get(id) {
      return store.find((d) => d.id === id) ?? null
    },
    async create(input) {
      const d: MailDraft = { original_body: null, ...input, id: crypto.randomUUID(), status: 'concept', created_at: now(), updated_at: now(), sent_at: null, sent_by: null }
      store.push(d)
      return d
    },
    async update(id, patch) {
      const d = store.find((x) => x.id === id && x.status === 'concept')
      if (!d) return false
      Object.assign(d, patch, { updated_at: now() })
      return true
    },
    async remove(id) {
      const i = store.findIndex((x) => x.id === id && x.status === 'concept')
      if (i < 0) return false
      store.splice(i, 1)
      return true
    },
    async markSent(id, by) {
      const d = store.find((x) => x.id === id && x.status === 'concept')
      if (d) Object.assign(d, { status: 'verstuurd', sent_at: now(), sent_by: by })
    },
  }
}

const g = globalThis as unknown as { __ikrDrafts?: MailDraft[] }
export function demoDrafts() {
  g.__ikrDrafts ??= []
  return memoryDrafts(g.__ikrDrafts)
}
