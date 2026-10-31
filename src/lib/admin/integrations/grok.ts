import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AdminSession } from '../session'
import type { Client, ContentIdea } from '../types'
import { clientContext } from '../ai/tasks'

/**
 * Grok-bot (draait op Cursor) als uitwerker van ideeën.
 * Uit: POST naar GROK_WEBHOOK_URL met de volledige opdracht + een terugkoppel-URL.
 * In:  de bot POST de uitwerking naar /api/integrations/grok?idee=…&token=… (zie route).
 */

export function isGrokConfigured() {
  return Boolean(process.env.GROK_WEBHOOK_URL && process.env.GROK_WEBHOOK_SECRET)
}

/** Token per idee, zodat het terugkoppel-adres alleen voor dát idee werkt. */
export function grokCallbackToken(ideaId: string) {
  return createHmac('sha256', process.env.GROK_WEBHOOK_SECRET!).update(`develop:${ideaId}`).digest('hex')
}

export function verifyGrokToken(ideaId: string, token: string) {
  if (!process.env.GROK_WEBHOOK_SECRET || !token) return false
  const expected = Buffer.from(grokCallbackToken(ideaId))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export const GROK_RESULT_EXAMPLE = {
  titel: 'optioneel: betere titel',
  hook: 'Letterlijke openingszin of beeld voor de eerste 0–2 seconden',
  opbouw: ['Stap 1', 'Stap 2', 'Stap 3'],
  shots: ['Shot 1', 'Shot 2'],
  nodig: ['Props, mensen, locatie'],
  cta: 'Call to action',
}

export async function requestGrokDevelopment(opts: {
  session: AdminSession
  client: Client
  idea: ContentIdea
  origin: string
  instruction?: string
}) {
  if (!isGrokConfigured()) throw new Error('De Grok-bot is nog niet gekoppeld (GROK_WEBHOOK_URL en GROK_WEBHOOK_SECRET ontbreken).')
  const { session, client, idea, origin, instruction } = opts
  const [context, knowledge] = await Promise.all([clientContext(session, client), session.repo.listKnowledge()])
  const callbackUrl = `${origin}/api/integrations/grok?idee=${idea.id}&token=${grokCallbackToken(idea.id)}`

  const instructions = `Werk dit TikTok-idee voor ${client.name} volledig uit zodat IKR het op een draaidag kan filmen.
Schrijf in vlot Nederlands zoals in Vlaanderen. Gebruik de IKR-kennis en het klantprofiel hieronder; respecteer wat de klant níét wil en leer uit afgekeurde ideeën. Verzin geen cijfers.

Idee: ${idea.title}${idea.summary ? `\n${idea.summary}` : ''}${idea.format ? `\nFormat: ${idea.format}` : ''}${instruction ? `\n\nExtra instructie: ${instruction}` : ''}

Stuur het resultaat als JSON met een POST naar:
${callbackUrl}
Velden: titel (optioneel), hook, opbouw (lijst), shots (lijst), nodig (lijst), cta.`

  const payload = {
    task: 'develop_idea',
    instructions,
    idea: { id: idea.id, titel: idea.title, omschrijving: idea.summary, format: idea.format, huidige_hook: idea.hook },
    client: { naam: client.name, context },
    ikr_kennis: knowledge.map((d) => `## ${d.title}\n${d.body}`).join('\n\n'),
    callback: { url: callbackUrl, method: 'POST', content_type: 'application/json', example: GROK_RESULT_EXAMPLE },
  }

  const res = await fetch(process.env.GROK_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROK_WEBHOOK_SECRET}`,
      'X-IKR-Event': 'develop_idea',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`De Grok-bot antwoordde met ${res.status}. Controleer GROK_WEBHOOK_URL.`)

  await session.repo.updateIdea(idea.id, { dev_status: 'requested', dev_provider: 'grok', dev_requested_at: new Date().toISOString() })
  await session.repo.addActivity({ client_id: client.id, kind: 'system', title: `“${idea.title}” naar Grok gestuurd om uit te werken`, created_by: session.user.name })
}

/** Normaliseert het antwoord van de bot (accepteert NL- en EN-veldnamen, en { result: … }). */
export function parseGrokResult(body: unknown) {
  const root = (body && typeof body === 'object' && 'result' in body ? (body as { result: unknown }).result : body) as Record<string, unknown> | null
  if (!root || typeof root !== 'object') return null
  const str = (...keys: string[]) => {
    for (const k of keys) if (typeof root[k] === 'string' && (root[k] as string).trim()) return (root[k] as string).trim()
    return null
  }
  const list = (...keys: string[]) => {
    for (const k of keys) {
      const v = root[k]
      if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 20)
      if (typeof v === 'string' && v.trim()) return v.split('\n').map((x) => x.replace(/^[-•\d.\s]+/, '').trim()).filter(Boolean).slice(0, 20)
    }
    return []
  }
  const hook = str('hook')
  const cta = str('cta', 'call_to_action')
  if (!hook && !cta) return null
  return {
    title: str('titel', 'title'),
    hook,
    cta,
    structure: list('opbouw', 'structure', 'steps'),
    shots: list('shots', 'shotlist'),
    needs: list('nodig', 'needs', 'props'),
  }
}
