import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'

/**
 * Port Grokbot via de webhook van de Grok-automation. De automation haalt de taken zelf op via de
 * connector (ai_taken_open); de webhook is enkel het signaal.
 *
 * Authenticatie: altijd `Authorization: Bearer <GROK_WEBHOOK_SECRET>` (zo controleert Grok Bot).
 * Begint het secret met "whsec_", dan komt er ook een Standard Webhooks-handtekening bij
 * (HMAC-SHA256 over "{id}.{timestamp}.{body}", docs.x.ai/grok/automations/webhooks).
 */
export type GrokTarget = 'sales' | 'team'

/** Webhook per automation: de team-automation (zonder sales-tools) heeft eigen variabelen, anders dezelfde. */
function webhookFor(target: GrokTarget) {
  if (target === 'team' && process.env.GROK_TEAM_WEBHOOK_URL && process.env.GROK_TEAM_WEBHOOK_SECRET)
    return { url: process.env.GROK_TEAM_WEBHOOK_URL, secret: process.env.GROK_TEAM_WEBHOOK_SECRET }
  if (process.env.GROK_WEBHOOK_URL && process.env.GROK_WEBHOOK_SECRET) return { url: process.env.GROK_WEBHOOK_URL, secret: process.env.GROK_WEBHOOK_SECRET }
  return null
}

export function isGrokWebhookConfigured() {
  return webhookFor('sales') !== null
}

/** Wachttijden tussen pogingen (ms): na een netwerkfout, 429 of 5xx. */
export const RETRY_DELAYS = [1000, 4000]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function webhookHeaders(secret: string, body: string, now = Date.now()) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${secret}`,
  }
  if (secret.startsWith('whsec_')) {
    const id = `msg_${randomUUID().replace(/-/g, '')}`
    const ts = Math.floor(now / 1000).toString()
    const key = Buffer.from(secret.slice('whsec_'.length), 'base64')
    headers['webhook-id'] = id
    headers['webhook-timestamp'] = ts
    headers['webhook-signature'] = `v1,${createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')}`
  }
  return headers
}

/**
 * Stuurt het signaal; probeert opnieuw bij tijdelijke fouten. Geeft true als Grok het aannam, anders
 * de reden (tekst) waarom niet, of false als er niets te doen was (geen taken of geen webhook ingesteld).
 */
export async function notifyGrok(jobIds: string[], delays = RETRY_DELAYS, target: GrokTarget = 'sales'): Promise<true | false | string> {
  if (!jobIds.length) return false
  const hook = webhookFor(target)
  if (!hook) return 'GROK_WEBHOOK_URL of GROK_WEBHOOK_SECRET ontbreekt'
  const { url, secret } = hook
  const body = JSON.stringify({
    event: 'ai_jobs_pending',
    count: jobIds.length,
    job_ids: jobIds,
    instructie:
      'Er staan nieuwe AI-taken klaar in het IKR-dashboard. Haal ze op met ai_taken_open (connector ikr-dashboard) en zet elk resultaat terug met ai_taak_klaarzetten. Verstuur zelf geen mails.',
  })

  let reason = 'geen antwoord'
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      // Elke poging opnieuw ondertekenen (verse timestamp).
      const res = await fetch(url, { method: 'POST', headers: webhookHeaders(secret, body), body, cache: 'no-store' })
      if (res.ok) return true
      const text = await res.text().catch(() => '')
      const retryable = res.status === 429 || res.status >= 500
      console.error(`[grok] webhook ${res.status} (poging ${attempt + 1})`, text.slice(0, 300))
      reason = `webhook ${res.status}: ${text.slice(0, 200)}`
      if (!retryable) return reason
    } catch (e) {
      console.error(`[grok] webhook netwerkfout (poging ${attempt + 1})`, e)
      reason = `netwerkfout: ${e instanceof Error ? e.message : String(e)}`
    }
    if (attempt < delays.length) await wait(delays[attempt])
  }
  return reason
}
