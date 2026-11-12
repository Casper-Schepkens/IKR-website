import { after } from 'next/server'
import { parseFirefliesWebhook, verifyFirefliesSignature } from '@/lib/admin/calls/webhook'
import { handleFirefliesEvent } from '@/lib/admin/calls/transcripts'
import { createServiceSupabase } from '@/lib/admin/supabase/server'

export const maxDuration = 120

/**
 * Fireflies meldt een klaar transcript ("Transcription completed"). We antwoorden meteen en verwerken
 * daarna (koppelen aan de call, Drive, lead bijwerken, analyse). Zonder geldige handtekening: 401.
 */
export async function POST(req: Request) {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET
  if (!secret) return new Response('FIREFLIES_WEBHOOK_SECRET ontbreekt', { status: 503 })
  const raw = await req.text()
  if (!verifyFirefliesSignature(raw, req.headers.get('x-hub-signature'), secret)) {
    console.log('[fireflies] handtekening klopt niet (x-hub-signature): genegeerd')
    return new Response('unauthorized', { status: 401 })
  }
  const ev = parseFirefliesWebhook(raw)
  // Kort loggen (zichtbaar in de Vercel-logs): welk event, welke meeting, en waarom genegeerd.
  if (ev.action === 'ignore') {
    console.log(`[fireflies] event=${ev.event} meeting_id=${ev.meetingId ?? '-'} genegeerd: ${ev.reason}`)
    return Response.json({ ok: true, genegeerd: ev.reason })
  }
  console.log(`[fireflies] event=${ev.event} meeting_id=${ev.meetingId} ref=${ev.clientRef ?? '-'} verwerken`)
  after(async () => {
    try {
      const r = await handleFirefliesEvent(ev.meetingId, ev.clientRef)
      console.log(`[fireflies] meeting_id=${ev.meetingId} resultaat=${r.status}`)
      await createServiceSupabase().from('bot_actions').insert({ bot: 'fireflies', tool: 'fireflies_webhook', ok: true, args: { fireflies_id: ev.meetingId, alleen_lezen: true, ...r } })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[fireflies] webhook', msg)
      await createServiceSupabase()
        .from('call_transcripts')
        .upsert({ fireflies_id: ev.meetingId, status: 'fout', error: msg, updated_at: new Date().toISOString() }, { onConflict: 'fireflies_id' })
      await createServiceSupabase().from('bot_actions').insert({ bot: 'fireflies', tool: 'fireflies_webhook', ok: false, error: msg, args: { fireflies_id: ev.meetingId } })
    }
  })
  return Response.json({ ok: true })
}
