import 'server-only'
import { isSupabaseConfigured } from '../env'
import { createServiceSupabase } from '../supabase/server'
import type { Card, CardMessage, CardWithMessages } from './types'

export type NewCard = Pick<Card, 'owner_email' | 'kind' | 'title' | 'body'> & Partial<Pick<Card, 'client_id' | 'link' | 'action_label' | 'action_detail' | 'action_status' | 'created_by' | 'unread' | 'bot_busy_since'>>
export type CardPatch = Partial<Pick<Card, 'title' | 'body' | 'status' | 'kind' | 'link' | 'action_label' | 'action_detail' | 'action_status' | 'bot_busy_since' | 'unread' | 'client_id'>>

export interface WorkspaceRepo {
  list(ownerEmail: string | null): Promise<CardWithMessages[]>
  get(id: string): Promise<CardWithMessages | null>
  create(card: NewCard): Promise<Card>
  update(id: string, patch: CardPatch): Promise<void>
  addMessage(cardId: string, author: string, body: string): Promise<CardMessage>
  remove(id: string): Promise<void>
}

/** Altijd via de service role (de server filtert op eigenaar); lokaal zonder Supabase in het geheugen. */
export function workspaceRepo(): WorkspaceRepo {
  return isSupabaseConfigured() ? supabaseWorkspace() : memoryWorkspace()
}

function supabaseWorkspace(): WorkspaceRepo {
  const db = createServiceSupabase()
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  const withMessages = async (cards: Card[]) => {
    if (!cards.length) return []
    const msgs = (check(await db.from('bot_card_messages').select('*').in('card_id', cards.map((c) => c.id)).order('created_at')) ?? []) as CardMessage[]
    return cards.map((c) => ({ ...c, messages: msgs.filter((m) => m.card_id === c.id) }))
  }
  return {
    async list(ownerEmail) {
      const q = db.from('bot_cards').select('*').order('created_at', { ascending: false }).limit(300)
      return withMessages((check(await (ownerEmail ? q.eq('owner_email', ownerEmail) : q)) ?? []) as Card[])
    },
    async get(id) {
      const c = check(await db.from('bot_cards').select('*').eq('id', id).maybeSingle()) as Card | null
      return c ? (await withMessages([c]))[0] : null
    },
    async create(card) {
      return check(await db.from('bot_cards').insert(card).select('*').single()) as Card
    },
    async update(id, patch) {
      check(await db.from('bot_cards').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id))
    },
    async addMessage(cardId, author, body) {
      const m = check(await db.from('bot_card_messages').insert({ card_id: cardId, author, body }).select('*').single()) as CardMessage
      await db.from('bot_cards').update({ updated_at: new Date().toISOString() }).eq('id', cardId)
      return m
    },
    async remove(id) {
      check(await db.from('bot_cards').delete().eq('id', id))
    },
  }
}

const g = globalThis as unknown as { __ikrWorkspace?: { cards: Card[]; messages: CardMessage[] } }
function memoryWorkspace(): WorkspaceRepo {
  const d = (g.__ikrWorkspace ??= { cards: [], messages: [] })
  const now = () => new Date().toISOString()
  const full = (c: Card): CardWithMessages => ({ ...c, messages: d.messages.filter((m) => m.card_id === c.id) })
  return {
    async list(ownerEmail) {
      return d.cards.filter((c) => !ownerEmail || c.owner_email === ownerEmail).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(full)
    },
    async get(id) {
      const c = d.cards.find((x) => x.id === id)
      return c ? full(c) : null
    },
    async create(card) {
      const c: Card = { status: 'open', client_id: null, link: null, action_label: null, action_detail: null, action_status: null, bot_busy_since: null, unread: true, created_by: 'grokbot', ...card, id: crypto.randomUUID(), created_at: now(), updated_at: now() }
      d.cards.push(c)
      return c
    },
    async update(id, patch) {
      const c = d.cards.find((x) => x.id === id)
      if (!c) throw new Error('Kaart niet gevonden.')
      Object.assign(c, patch, { updated_at: now() })
    },
    async addMessage(cardId, author, body) {
      const m: CardMessage = { id: crypto.randomUUID(), card_id: cardId, author, body, created_at: now() }
      d.messages.push(m)
      return m
    },
    async remove(id) {
      d.cards = d.cards.filter((c) => c.id !== id)
      d.messages = d.messages.filter((m) => m.card_id !== id)
    },
  }
}
