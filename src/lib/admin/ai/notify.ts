import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'

/**
 * Port Grokbot via een Grok Automation met webhook-trigger (docs.x.ai/grok/automations/webhooks).
 * Ondertekend volgens Standard Webhooks: HMAC-SHA256 over "{id}.{timestamp}.{body}" met het secret
 * (zonder "whsec_", base64-gedecodeerd). De automation haalt de taken zelf op via de connector.
 */
export function isGrokWebhookConfigured() {
  return Boolean(process.env.GROK_WEBHOOK_URL && process.env.GROK_WEBHOOK_SECRET)
}

export async function notifyGrok(jobIds: string[]) {
  if (!jobIds.length || !isGrokWebhookConfigured()) return
  const body = JSON.stringify({
    event: 'ai_jobs_pending',
    count: jobIds.length,
    job_ids: jobIds,
    instructie:
      'Er staan nieuwe AI-taken klaar in het IKR-dashboard. Haal ze op met ai_taken_open (connector ikr-dashboard) en zet elk resultaat terug met ai_taak_klaarzetten. Verstuur zelf geen mails.',
  })
  const id = `msg_${randomUUID().replace(/-/g, '')}`
  const ts = Math.floor(Date.now() / 1000).toString()
  const key = Buffer.from(process.env.GROK_WEBHOOK_SECRET!.replace(/^whsec_/, ''), 'base64')
  const sig = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')
  try {
    const res = await fetch(process.env.GROK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sig}` },
      body,
      cache: 'no-store',
    })
    if (!res.ok && res.status !== 202) console.error('[grok] webhook', res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.error('[grok] webhook mislukt', e)
  }
}
