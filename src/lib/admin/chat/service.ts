import 'server-only'
import { after } from 'next/server'
import { createServiceSupabase } from '../supabase/server'
import { aiEngine, enqueue, isAiConfigured, runJob } from '../ai/jobs'
import { notifyGrok } from '../ai/notify'
import type { AdminSession } from '../session'
import type { ChatMessage, ChatObject } from './repo'

/** Hoe lang "Grok Bot denkt na…" blijft staan zonder antwoord. */
const THINKING_MAX_MS = 15 * 60_000

/** Een gekoppeld object afleiden uit de route (bv. /admin/sales/leads/<id> → lead). */
export function objectFromPage(page: string | null | undefined): ChatObject | null {
  const lead = page?.match(/^\/admin\/sales\/leads\/([0-9a-f-]{36})/i)
  return lead ? { type: 'lead', id: lead[1] } : null
}

/**
 * Bewaart het bericht en maakt een AI-taak 'chat' (met het bericht, de pagina en de laatste 20
 * berichten van deze gebruiker). Daarna wordt Grok Bot gepingd (of loopt de API).
 */
export async function sendChatMessage(session: AdminSession, opts: { text: string; page: string | null; object?: ChatObject | null }) {
  const text = opts.text.trim()
  if (!text) throw new Error('Typ eerst een bericht.')
  if (text.length > 4000) throw new Error('Bericht is te lang (max 4000 tekens).')
  const object = opts.object ?? objectFromPage(opts.page)
  const msg = await session.chat.add({
    user_id: session.user.id,
    role: 'user',
    text,
    page: opts.page,
    object_type: object?.type ?? null,
    object_id: object?.id ?? null,
  })

  if (session.mode === 'demo') {
    await session.chat.add({ user_id: session.user.id, role: 'bot', text: '(demomodus) Grok Bot is hier niet gekoppeld.', page: opts.page })
    return msg
  }
  if (!isAiConfigured()) throw new Error('Er is geen AI ingesteld (IKR_AI_ENGINE of ANTHROPIC_API_KEY).')

  const history = (await session.chat.list(session.user.id, 21)).filter((m) => m.id !== msg.id).slice(-20)
  const job = await enqueue(
    'chat',
    `chat:${msg.id}`,
    {
      user_id: session.user.id,
      user_email: session.user.email,
      user_name: session.user.name,
      page: opts.page,
      object,
      message: text,
      history: history.map((m) => ({ role: m.role, text: m.text, created_at: m.created_at, object_type: m.object_type, object_id: m.object_id })),
    },
    session.user.email,
  )
  if (aiEngine() === 'grokbot') after(() => notifyGrok([job.id]))
  else if (aiEngine() === 'api') after(() => runJob(job.id))
  return msg
}

/** Wacht er nog een chat-taak van deze gebruiker op een antwoord? */
export async function isThinking(session: AdminSession) {
  if (session.mode === 'demo' || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false
  const since = new Date(Date.now() - THINKING_MAX_MS).toISOString()
  const { count } = await createServiceSupabase()
    .from('ai_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'chat')
    .in('status', ['pending', 'running'])
    .eq('input->>user_id', session.user.id)
    .gte('created_at', since)
  return Boolean(count)
}

export type ChatState = { messages: ChatMessage[]; thinking: boolean }

export async function chatState(session: AdminSession, limit = 60): Promise<ChatState> {
  const [messages, thinking] = await Promise.all([session.chat.list(session.user.id, limit), isThinking(session)])
  return { messages, thinking }
}
