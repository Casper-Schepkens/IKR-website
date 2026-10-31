import 'server-only'
import Anthropic, { toFile } from '@anthropic-ai/sdk'
import { AI_MODEL, isAiConfigured } from '../env'
import type { AdminSession } from '../session'
import type { Client, ContentIdea, Template } from '../types'
import { buildSystem } from './run'
import { clientContext } from './tasks'
import { getFile, putFile } from '../storage'

const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

let client: Anthropic | null = null
function anthropic() {
  if (!client) client = new Anthropic()
  return client
}

/** Upload een template (.pptx) naar opslag én naar de Claude Files API. Geeft het file_id terug. */
export async function uploadTemplateToClaude(name: string, data: Buffer) {
  if (!isAiConfigured()) return null
  const uploaded = await anthropic().files.upload({
    file: await toFile(data, name, { type: PPTX }),
  })
  return uploaded.id
}

/** Zoekt alle bestanden die de code-execution-sandbox heeft aangemaakt. */
function findOutputFileIds(content: unknown): string[] {
  const ids: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>
      if (
        typeof obj.file_id === 'string' &&
        typeof obj.type === 'string' &&
        obj.type.endsWith('_output')
      )
        ids.push(obj.file_id)
      Object.values(obj).forEach(walk)
    }
  }
  walk(content)
  return [...new Set(ids)]
}

function ideaBlock(i: ContentIdea, n: number) {
  return [
    `Idee ${n}: ${i.title}`,
    i.format && `Format: ${i.format}`,
    i.summary && `Omschrijving: ${i.summary}`,
    i.hook && `Hook: ${i.hook}`,
    i.structure.length && `Opbouw:\n${i.structure.map((s, k) => `  ${k + 1}. ${s}`).join('\n')}`,
    i.shots.length && `Shots: ${i.shots.join('; ')}`,
    i.needs.length && `Nodig: ${i.needs.join('; ')}`,
    i.cta && `CTA: ${i.cta}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Maakt een presentatie met de pptx-skill van Claude in de code-execution-sandbox.
 * Met een template: Claude vult het bestaande bestand in en behoudt de lay-out.
 * Duurt typisch 1–4 minuten; draait in de achtergrond (zie createDeckAction).
 */
export async function generateDeck(opts: {
  session: AdminSession
  deckId: string
  client: Client
  ideas: ContentIdea[]
  template: Template | null
}) {
  const { session, deckId, client: c, ideas, template } = opts
  const repo = session.repo
  try {
    if (!isAiConfigured()) throw new Error('ANTHROPIC_API_KEY ontbreekt.')
    await repo.updateDeck(deckId, { status: 'generating' })

    let templateFileId = template?.anthropic_file_id ?? null
    if (template && !templateFileId && template.storage_path) {
      const file = await getFile('templates', template.storage_path)
      if (file) templateFileId = await uploadTemplateToClaude(`${template.name}.pptx`, file.data)
    }

    const knowledge = await repo.listKnowledge()
    const instructions = `Maak een PowerPoint-presentatie (.pptx) voor klant ${c.name} met de content-ideeën hieronder.

${
  templateFileId
    ? `Gebruik het bijgevoegde template-bestand als basis. Behoud de lay-out, lettertypes, kleuren en vaste slides van het template exact.
Vervang plaatshouders zoals {{klant}} en voorbeeldtekst door echte inhoud. Dupliceer de ideeslide voor elk idee.`
    : `Er is geen template: gebruik een strakke stijl in IKR-kleuren (navy #201737, crème #F0EBE0, cyaan #0FC1DE), grote vette titels.`
}

Structuur:
1. Titelslide: "Content-voorstel ${c.name}"
2. Eén slide per idee: titel, format, hook, opbouw, shots en CTA
3. Slotslide met volgende stappen (feedback geven, draaidag plannen)

Schrijf in het Nederlands zoals in Vlaanderen. Verzin geen cijfers. Sla het resultaat op als één .pptx-bestand in de outputs-map.

${ideas.map((i, n) => ideaBlock(i, n + 1)).join('\n\n')}`

    const userContent: Anthropic.Beta.BetaContentBlockParam[] = [
      { type: 'text', text: await clientContext(session, c) },
      { type: 'text', text: instructions },
    ]
    if (templateFileId) userContent.push({ type: 'container_upload', file_id: templateFileId })

    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: userContent }]
    let response: Anthropic.Beta.BetaMessage | null = null
    let containerId: string | undefined
    for (let turn = 0; turn < 6; turn++) {
      response = await anthropic().beta.messages.create({
        model: AI_MODEL,
        max_tokens: 32000,
        system: [
          { type: 'text', text: buildSystem(knowledge), cache_control: { type: 'ephemeral' } },
        ],
        container: {
          ...(containerId ? { id: containerId } : {}),
          skills: [{ type: 'anthropic', skill_id: 'pptx', version: 'latest' }],
        },
        tools: [{ type: 'code_execution_20260521', name: 'code_execution' }],
        betas: ['code-execution-2025-08-25'],
        messages,
      })
      containerId = response.container?.id ?? containerId
      if (response.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: response.content })
    }
    if (!response) throw new Error('Geen antwoord van Claude.')
    if (response.stop_reason === 'refusal')
      throw new Error('Claude weigerde deze presentatie te maken.')

    const fileIds = findOutputFileIds(response.content)
    let saved: string | null = null
    for (const fid of fileIds) {
      const meta = await anthropic().files.retrieveMetadata(fid)
      if (!meta.filename.toLowerCase().endsWith('.pptx')) continue
      const dl = await anthropic().files.download(fid)
      const data = Buffer.from(await dl.arrayBuffer())
      saved = `${c.id}/${deckId}.pptx`
      await putFile('decks', saved, data, PPTX)
      break
    }
    if (!saved) throw new Error('Claude maakte geen .pptx-bestand aan. Probeer opnieuw.')

    await repo.updateDeck(deckId, { status: 'ready', storage_path: saved, error: null })
    await repo.addActivity({
      client_id: c.id,
      kind: 'ai',
      title: `Presentatie klaar (${ideas.length} ideeën)`,
      created_by: 'IKR AI',
    })
    await repo.logAiRun({
      task: 'generate_deck',
      client_id: c.id,
      model: response.model,
      status: 'ok',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_tokens: response.usage.cache_read_input_tokens ?? null,
      cache_write_tokens: response.usage.cache_creation_input_tokens ?? null,
      output: { deckId, storage_path: saved },
      error: null,
      created_by: session.user.email,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[deck] mislukt', err)
    await repo.updateDeck(deckId, { status: 'failed', error: message }).catch(() => {})
    await repo
      .logAiRun({
        task: 'generate_deck',
        client_id: c.id,
        model: AI_MODEL,
        status: 'error',
        output: null,
        error: message,
        created_by: session.user.email,
      })
      .catch(() => {})
  }
}
