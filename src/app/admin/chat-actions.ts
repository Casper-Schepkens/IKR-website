'use server'

import { requireAdmin } from '@/lib/admin/session'
import { chatState, sendChatMessage, type ChatState } from '@/lib/admin/chat/service'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Bericht naar Grok Bot vanuit de chatbalk (op elke admin-pagina). */
export async function sendChatAction(text: string, page: string): Promise<Result<ChatState>> {
  try {
    const session = await requireAdmin()
    const safePage = page.startsWith('/admin') ? page.slice(0, 300) : null
    await sendChatMessage(session, { text, page: safePage })
    return { ok: true, data: await chatState(session) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Versturen mislukt.' }
  }
}

/** Geschiedenis + of Grok Bot nog nadenkt (de chat ververst hiermee). */
export async function getChatAction(): Promise<Result<ChatState>> {
  try {
    const session = await requireAdmin()
    return { ok: true, data: await chatState(session) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Laden mislukt.' }
  }
}
