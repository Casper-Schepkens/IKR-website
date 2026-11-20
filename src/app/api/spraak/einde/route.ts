import { ownSession, voiceRoute } from '@/lib/admin/voice/api'
import { endSession } from '@/lib/admin/voice/store'

export const dynamic = 'force-dynamic'

/** Microfoon uit (of pagina gesloten, via sendBeacon): het gesprek afsluiten. */
export const POST = voiceRoute(async (session, body) => {
  const s = await ownSession(session, body.sessie_id, true)
  await endSession(s.id, session.user.email)
  return { ok: true }
})
