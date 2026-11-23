import { ownSession, str, voiceRoute } from '@/lib/admin/voice/api'
import { recordUsage, spentTodayEur } from '@/lib/admin/voice/store'
import { responseCost, transcriptionCost, type RealtimeUsage } from '@/lib/admin/voice/pricing'

export const dynamic = 'force-dynamic'

/** Verbruik van één antwoord of transcriptie (zoals OpenAI het meldt); geeft terug of de daglimiet bereikt is. */
export const POST = voiceRoute(async (session, body) => {
  const s = await ownSession(session, body.sessie_id, true)
  const kind = body.kind === 'transcriptie' ? 'transcriptie' : 'antwoord'
  const usage = (body.usage && typeof body.usage === 'object' ? body.usage : {}) as RealtimeUsage & { type?: string; seconds?: number }
  const counted = kind === 'antwoord' ? responseCost(s.model, usage) : transcriptionCost(usage)
  await recordUsage({ session_id: s.id, user_email: session.user.email, kind, response_id: str(body.response_id, 100) || null, model: kind === 'antwoord' ? s.model : 'gpt-4o-mini-transcribe', ...counted })
  const spent = await spentTodayEur()
  return { vandaag_eur: spent.eur, limiet_eur: spent.limit, over: spent.over }
})
