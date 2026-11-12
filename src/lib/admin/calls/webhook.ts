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

/** V1: { meetingId, eventType: "Transcription completed", clientReferenceId }. V2: { meeting_id, event, client_reference_id }. */
export type FirefliesWebhook = {
  meetingId?: unknown
  meeting_id?: unknown
  eventType?: unknown
  event?: unknown
  clientReferenceId?: unknown
  client_reference_id?: unknown
}

export type ParsedWebhook =
  | { action: 'process'; meetingId: string; clientRef: string | null; event: string }
  | { action: 'ignore'; reason: string; meetingId: string | null; event: string }

/** Events die een klaar transcript betekenen (V2: transcribed of summarized; V1: Transcription completed). */
const PROCESS = new Set(['meeting.transcribed', 'meeting.summarized', 'transcription completed'])
/** Gekend, maar niets te doen (enkel 200 antwoorden). */
const ACK_ONLY = new Set(['test', 'meeting.bot_joined'])
/** Client-referentie: een call-id, of "weekly:<id>" voor een opname van een weekly. */
const REF = /^(weekly:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Leest V1- en V2-payloads; zegt of er verwerkt moet worden en anders waarom niet (voor de logs). */
export function parseFirefliesWebhook(raw: string): ParsedWebhook {
  let p: FirefliesWebhook
  try {
    p = JSON.parse(raw) as FirefliesWebhook
  } catch {
    return { action: 'ignore', reason: 'geen geldige JSON', meetingId: null, event: '?' }
  }
  if (!p || typeof p !== 'object') return { action: 'ignore', reason: 'lege payload', meetingId: null, event: '?' }
  const id = p.meeting_id ?? p.meetingId
  const meetingId = typeof id === 'string' && id.trim() ? id.trim() : null
  const rawEvent = p.event ?? p.eventType
  const event = typeof rawEvent === 'string' && rawEvent.trim() ? rawEvent.trim() : ''
  const key = event.toLowerCase()
  if (ACK_ONLY.has(key)) return { action: 'ignore', reason: `event "${event}" vraagt geen verwerking`, meetingId, event }
  // Oudere V1-payloads zonder eventType: als transcript klaar beschouwen.
  if (event && !PROCESS.has(key)) return { action: 'ignore', reason: `onbekend of niet-verwerkt event "${event}"`, meetingId, event }
  if (!meetingId) return { action: 'ignore', reason: 'geen meeting_id', meetingId: null, event: event || '(geen event)' }
  const ref = p.client_reference_id ?? p.clientReferenceId
  const clientRef = typeof ref === 'string' && REF.test(ref.trim()) ? ref.trim() : null
  return { action: 'process', meetingId, clientRef, event: event || '(geen event, V1)' }
}
