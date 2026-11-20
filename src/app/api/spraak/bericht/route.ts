import { ownSession, safePage, str, voiceRoute } from '@/lib/admin/voice/api'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { supabaseChat } from '@/lib/admin/chat/repo'

export const dynamic = 'force-dynamic'

/**
 * Afschrift in de chat: wat de gebruiker zei en wat de spraakbot antwoordde (met 🎙).
 * `at` = wanneer het gezegd werd, zodat de volgorde klopt ook als het uittypen later klaar is.
 */
export const POST = voiceRoute(async (session, body) => {
  await ownSession(session, body.sessie_id, true)
  const text = str(body.text).trim()
  if (!text) return { ok: true }
  const at = typeof body.at === 'number' && Math.abs(Date.now() - body.at) < 30 * 60_000 ? new Date(body.at).toISOString() : new Date().toISOString()
  // De bot-kant schrijft enkel de server (service role), net als bij Grok Bot.
  const msg = await supabaseChat(createServiceSupabase()).add({
    user_id: session.user.id,
    role: body.role === 'bot' ? 'bot' : 'user',
    text,
    page: safePage(body.page),
    via: 'spraak',
    created_at: at,
  })
  return { ok: true, id: msg.id }
})
