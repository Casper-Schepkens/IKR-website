import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Fireflies-webhook: HMAC-SHA256 over de ruwe body met het geheime webhook-sleutel, in de header
 * x-hub-signature (als "sha256=<hex>" of enkel "<hex>").
 */
export function verifyFirefliesSignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false
  const given = header.trim().replace(/^sha256=/i, '')
  if (!/^[0-9a-f]{64}$/i.test(given)) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  return timingSafeEqual(Buffer.from(given.toLowerCase(), 'hex'), Buffer.from(expected, 'hex'))
}

export type FirefliesWebhook = { meetingId?: string; eventType?: string; clientReferenceId?: string | null }

/** Enkel "Transcription completed" (of zonder eventType, oudere payloads) met een meetingId. */
export function parseFirefliesWebhook(raw: string): { meetingId: string; clientRef: string | null } | null {
  let p: FirefliesWebhook
  try {
    p = JSON.parse(raw) as FirefliesWebhook
  } catch {
    return null
  }
  if (!p.meetingId || typeof p.meetingId !== 'string') return null
  if (p.eventType && !/transcription completed/i.test(p.eventType)) return null
  const ref = typeof p.clientReferenceId === 'string' && /^[0-9a-f-]{36}$/i.test(p.clientReferenceId) ? p.clientReferenceId : null
  return { meetingId: p.meetingId, clientRef: ref }
}
