import { ownSession, str, voiceRoute } from '@/lib/admin/voice/api'
import { runAction } from '@/lib/admin/voice/actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Bevestigen of annuleren via de knop op de kaart in de chat. */
export const POST = voiceRoute(async (session, body) => {
  await ownSession(session, body.sessie_id, true)
  const decision = body.beslissing === 'bevestig' ? 'bevestig' : 'annuleer'
  return { output: await runAction(session, str(body.id, 40), decision, 'knop') }
})
