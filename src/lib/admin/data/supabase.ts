import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminRepo, VideoWithStats } from './repo'
import type {
  Activity,
  AiRun,
  CalendarEvent,
  Client,
  ClientProfile,
  Contact,
  ContentIdea,
  Contract,
  Deck,
  Invoice,
  KnowledgeDoc,
  Template,
  VideoStatsSnapshot,
} from '../types'
import { slugify } from '../format'

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}

export function createSupabaseRepo(db: SupabaseClient): AdminRepo {
  return {
    async listClients() {
      return must<Client[]>(await db.from('clients').select('*').order('name'))
    },
    async getClient(id) {
      return must<Client | null>(await db.from('clients').select('*').eq('id', id).maybeSingle())
    },
    async createClient(input) {
      return must<Client>(
        await db
          .from('clients')
          .insert({
            ...input,
            slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`,
          })
          .select('*')
          .single(),
      )
    },
    async updateClient(id, patch) {
      check(await db.from('clients').update(patch).eq('id', id))
    },
    async moveStage(id, stage, by) {
      const current = must<{ stage: string } | null>(
        await db.from('clients').select('stage').eq('id', id).maybeSingle(),
      )
      if (!current || current.stage === stage) return
      check(
        await db
          .from('clients')
          .update({ stage, stage_changed_at: new Date().toISOString() })
          .eq('id', id),
      )
      check(
        await db
          .from('pipeline_events')
          .insert({ client_id: id, from_stage: current.stage, to_stage: stage, changed_by: by }),
      )
    },

    async listContacts(clientId) {
      return must<Contact[]>(
        await db
          .from('contacts')
          .select('*')
          .eq('client_id', clientId)
          .order('is_primary', { ascending: false }),
      )
    },
    async addContact(input) {
      check(await db.from('contacts').insert(input))
    },

    async listActivities({ clientId, limit = 50 }) {
      let q = db
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (clientId) q = q.eq('client_id', clientId)
      return must<Activity[]>(await q)
    },
    async addActivity(input) {
      check(await db.from('activities').insert(input))
    },

    async getProfile(clientId) {
      return must<ClientProfile | null>(
        await db.from('client_profiles').select('*').eq('client_id', clientId).maybeSingle(),
      )
    },
    async upsertProfile(clientId, patch) {
      check(
        await db
          .from('client_profiles')
          .upsert({ client_id: clientId, ...patch, updated_at: new Date().toISOString() }),
      )
    },

    async listContracts(clientId) {
      let q = db.from('contracts').select('*').order('start_date', { ascending: false })
      if (clientId) q = q.eq('client_id', clientId)
      return must<Contract[]>(await q)
    },
    async saveContract(input) {
      check(await db.from('contracts').upsert(input))
    },

    async listInvoices(opts = {}) {
      let q = db.from('invoices').select('*').order('send_date', { ascending: false })
      if (opts.clientId) q = q.eq('client_id', opts.clientId)
      if (opts.statuses?.length) q = q.in('status', opts.statuses)
      return must<Invoice[]>(await q)
    },
    async createInvoice(input) {
      check(
        await db
          .from('invoices')
          .upsert(input, { onConflict: 'contract_id,send_date', ignoreDuplicates: true }),
      )
    },
    async updateInvoice(id, patch) {
      check(await db.from('invoices').update(patch).eq('id', id))
    },

    async listEvents(fromIso, toIso) {
      return must<CalendarEvent[]>(
        await db
          .from('calendar_events')
          .select('*')
          .gte('starts_at', fromIso)
          .lt('starts_at', toIso)
          .order('starts_at'),
      )
    },
    async getEvent(id) {
      return must<CalendarEvent | null>(
        await db.from('calendar_events').select('*').eq('id', id).maybeSingle(),
      )
    },
    async createEvent(input) {
      return must<CalendarEvent>(
        await db.from('calendar_events').insert(input).select('*').single(),
      )
    },
    async updateEvent(id, patch) {
      check(await db.from('calendar_events').update(patch).eq('id', id))
    },
    async deleteEvent(id) {
      check(await db.from('calendar_events').delete().eq('id', id))
    },

    async listIdeas(clientId) {
      return must<ContentIdea[]>(
        await db
          .from('content_ideas')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
      )
    },
    async getIdea(id) {
      return must<ContentIdea | null>(
        await db.from('content_ideas').select('*').eq('id', id).maybeSingle(),
      )
    },
    async insertIdeas(clientId, ideas) {
      if (!ideas.length) return
      check(
        await db.from('content_ideas').insert(ideas.map((i) => ({ ...i, client_id: clientId }))),
      )
    },
    async updateIdea(id, patch) {
      check(await db.from('content_ideas').update(patch).eq('id', id))
    },

    async listTemplates() {
      return must<Template[]>(await db.from('templates').select('*').order('name'))
    },
    async listDecks(clientId) {
      return must<Deck[]>(
        await db
          .from('decks')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
      )
    },
    async createDeck(input) {
      return must<Deck>(await db.from('decks').insert(input).select('*').single())
    },
    async updateDeck(id, patch) {
      check(await db.from('decks').update(patch).eq('id', id))
    },

    async listKnowledge() {
      return must<KnowledgeDoc[]>(await db.from('knowledge_docs').select('*').order('sort_order'))
    },
    async saveKnowledge(doc) {
      const row = { ...doc, updated_at: new Date().toISOString() }
      check(await db.from('knowledge_docs').upsert(row, { onConflict: 'slug' }))
    },

    async listVideosWithStats(opts = {}) {
      let q = db
        .from('videos')
        .select('*, clients(name)')
        .order('published_at', { ascending: false })
        .limit(200)
      if (opts.clientId) q = q.eq('client_id', opts.clientId)
      const videos = must<(VideoWithStats & { clients: { name: string } | null })[]>(await q)
      if (!videos.length) return []
      let sq = db
        .from('video_stats_snapshots')
        .select('*')
        .in(
          'video_id',
          videos.map((v) => v.id),
        )
        .order('captured_at')
      if (opts.sinceIso) sq = sq.gte('captured_at', opts.sinceIso)
      const stats = must<VideoStatsSnapshot[]>(await sq)
      return videos.map((v) => ({
        ...v,
        client_name: v.clients?.name ?? '',
        stats: stats.filter((s) => s.video_id === v.id),
      }))
    },

    async latestAiRun(task, opts = {}) {
      let q = db
        .from('ai_runs')
        .select('*')
        .eq('task', task)
        .eq('status', 'ok')
        .order('created_at', { ascending: false })
        .limit(1)
      if (opts.sinceIso) q = q.gte('created_at', opts.sinceIso)
      if (opts.clientId) q = q.eq('client_id', opts.clientId)
      const rows = must<AiRun[]>(await q)
      return rows[0] ?? null
    },
    async logAiRun(run) {
      check(await db.from('ai_runs').insert(run))
    },
    async listAiRuns(sinceIso) {
      const rows = must<Omit<AiRun, 'output'>[]>(
        await db
          .from('ai_runs')
          .select(
            'id, task, client_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, error, created_by, created_at',
          )
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(5000),
      )
      return rows.map((r) => ({ ...r, output: null }))
    },
  }
}
