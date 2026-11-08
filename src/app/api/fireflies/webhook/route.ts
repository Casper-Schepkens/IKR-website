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
  if (!verifyFirefliesSignature(raw, req.headers.get('x-hub-signature'), secret)) return new Response('unauthorized', { status: 401 })
  const ev = parseFirefliesWebhook(raw)
  if (!ev) return Response.json({ ok: true, genegeerd: true })
  after(async () => {
    try {
      const r = await handleFirefliesEvent(ev.meetingId, ev.clientRef)
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
