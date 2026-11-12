import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ChatObject = { type: string; id: string }

/** Voor later: een actie die de frontend uitvoert (bv. een pagina openen). Nu nog niet gebruikt. */
export type ChatAction = { actie: string; [key: string]: unknown }

/** Bestand bij een chatbericht (in de Drive van contact@). */
export type ChatAttachment = { file_id: string; name: string; mime: string; url: string; size: number | null }

export type ChatMessage = {
  id: string
  user_id: string
  role: 'user' | 'bot'
  text: string
  page: string | null
  object_type: string | null
  object_id: string | null
  actions: ChatAction[] | null
  attachments?: ChatAttachment[] | null
  created_at: string
}

export type NewChatMessage = Pick<ChatMessage, 'user_id' | 'role' | 'text'> &
  Partial<Pick<ChatMessage, 'page' | 'object_type' | 'object_id' | 'actions' | 'attachments'>>

export interface ChatRepo {
  /** Laatste `limit` berichten van één gebruiker, oudste eerst. */
  list(userId: string, limit: number): Promise<ChatMessage[]>
  add(msg: NewChatMessage): Promise<ChatMessage>
  hasUser(userId: string): Promise<boolean>
}

/** Server-side (service role), altijd gefilterd op user_id. */
export function supabaseChat(db: SupabaseClient): ChatRepo {
  return {
    async list(userId, limit) {
      const { data, error } = await db
        .from('ai_chat')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(error.message)
      return ((data ?? []) as ChatMessage[]).reverse()
    },
    async add(msg) {
      const { data, error } = await db.from('ai_chat').insert(msg).select('*').single()
      if (error || !data) throw new Error(error?.message ?? 'Bericht bewaren mislukt.')
      return data as ChatMessage
    },
    async hasUser(userId) {
      const { count } = await db.from('ai_chat').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      return Boolean(count)
    },
  }
}

export function memoryChat(store: ChatMessage[] = []): ChatRepo {
  return {
    async list(userId, limit) {
      return store
        .filter((m) => m.user_id === userId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(-limit)
    },
    async add(msg) {
      const m: ChatMessage = {
        page: null,
        object_type: null,
        object_id: null,
        actions: null,
        ...msg,
        id: crypto.randomUUID(),
        // Strikt oplopend, ook als twee berichten in dezelfde milliseconde komen.
        created_at: new Date(Date.now() + store.length).toISOString(),
      }
      store.push(m)
      return m
    },
    async hasUser(userId) {
      return store.some((m) => m.user_id === userId)
    },
  }
}

const g = globalThis as unknown as { __ikrChat?: ChatMessage[] }
export function demoChat() {
  g.__ikrChat ??= []
  return memoryChat(g.__ikrChat)
}
