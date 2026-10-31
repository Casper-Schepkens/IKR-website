import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { AI_MODEL, AI_MODEL_SMALL, isAiConfigured } from '../env'

/** Grote taken krijgen het sterkste model; de rest een sneller, goedkoper model. */
const BIG_TASKS = new Set(['generate_ideas', 'develop_idea'])
export function modelFor(task: string) {
  return BIG_TASKS.has(task) ? AI_MODEL : AI_MODEL_SMALL
}
import type { AdminSession } from '../session'
import type { KnowledgeDoc } from '../types'

let client: Anthropic | null = null
function anthropic() {
  if (!client) client = new Anthropic()
  return client
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      'ANTHROPIC_API_KEY ontbreekt — voeg die toe in Vercel (of .env.local) om de AI-knoppen te gebruiken.',
    )
  }
}

const BASE_INSTRUCTIONS = `Je bent IKR AI, de interne assistent van IKnowRight (IKR), een TikTok-bureau voor food brands in Vlaanderen.
Je helpt het team (Casper en Cedric) met klanten, content-ideeën, draaidagen, mails en resultaten.

Regels:
- Schrijf in vlot, natuurlijk Nederlands zoals het in Vlaanderen gesproken wordt. Kort, concreet, geen marketingtaal.
- Verzin geen cijfers, namen, feiten of resultaten. Ontbreekt iets, zet dan een plaatshouder tussen [vierkante haakjes].
- Content-ideeën zijn specifiek voor TikTok: sterke hook in de eerste 1–2 seconden, mensen in beeld, haalbaar op één draaidag.
- Respecteer wat een klant níét wil (zie klantprofiel) en leer uit afgekeurde ideeën.
- Gebruik geen emoji tenzij erom gevraagd wordt.

Hieronder staat de vaste IKR-kennis. Gebruik ze als achtergrond bij elke taak.`

/** Laag 1: vaste IKR-kennis. Bewust stabiel gehouden zodat prompt caching werkt. */
export function buildSystem(knowledge: KnowledgeDoc[]) {
  const docs = knowledge
    .map((d) => `<ikr_kennis titel="${d.title}">\n${d.body.trim()}\n</ikr_kennis>`)
    .join('\n\n')
  return `${BASE_INSTRUCTIONS}\n\n${docs}`
}

type RunOpts<S extends z.ZodType> = {
  session: AdminSession
  task: string
  schema: S
  /** Laag 2: klant- of situatiecontext (wisselt per call). */
  context?: string
  /** Laag 3: de taak zelf. */
  prompt: string
  clientId?: string | null
  effort?: 'low' | 'medium' | 'high' | 'xhigh'
  maxTokens?: number
}

/**
 * Eén AI-taak met gestructureerde output. Bouwt de context in lagen op, cachet de IKR-kennis
 * en logt elke run in ai_runs.
 */
export async function runStructured<S extends z.ZodType>(opts: RunOpts<S>): Promise<z.infer<S>> {
  if (!isAiConfigured()) throw new AiNotConfiguredError()
  const {
    session,
    task,
    schema,
    context,
    prompt,
    clientId = null,
    effort = 'medium',
    maxTokens = 16000,
  } = opts
  const knowledge = await session.repo.listKnowledge()

  const userContent: Anthropic.Beta.BetaTextBlockParam[] = []
  if (context) userContent.push({ type: 'text', text: context })
  userContent.push({ type: 'text', text: prompt })

  try {
    const res = await anthropic().beta.messages.parse({
      model: modelFor(task),
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: buildSystem(knowledge), cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userContent }],
      output_config: { effort, format: betaZodOutputFormat(schema) },
    })

    if (res.stop_reason === 'refusal')
      throw new Error('Claude weigerde deze vraag. Probeer ze anders te formuleren.')
    if (res.stop_reason === 'max_tokens')
      throw new Error('Het antwoord was te lang en werd afgebroken. Probeer het opnieuw.')
    const parsed = res.parsed_output
    if (parsed == null) throw new Error('Kon het antwoord van Claude niet lezen.')

    await session.repo
      .logAiRun({
        task,
        client_id: clientId,
        model: res.model,
        status: 'ok',
        input_tokens: res.usage.input_tokens,
        output_tokens: res.usage.output_tokens,
        cache_read_tokens: res.usage.cache_read_input_tokens ?? null,
        output: parsed,
        error: null,
        created_by: session.user.email,
      })
      .catch((e) => console.error('[ai] log mislukt', e))

    return parsed as z.infer<S>
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await session.repo
      .logAiRun({
        task,
        client_id: clientId,
        model: modelFor(task),
        status: 'error',
        output: null,
        error: message,
        created_by: session.user.email,
      })
      .catch(() => {})
    if (err instanceof Anthropic.AuthenticationError)
      throw new Error('De Claude API-sleutel is ongeldig.')
    if (err instanceof Anthropic.RateLimitError)
      throw new Error('Even te veel AI-verzoeken tegelijk. Probeer het over een minuutje opnieuw.')
    throw err instanceof Error ? err : new Error(message)
  }
}
