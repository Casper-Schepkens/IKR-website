import 'server-only'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { AdminSession } from '../session'
import { botSession, buildMcpServer } from '../mcp/server'

/**
 * De spraakbot gebruikt dezelfde tools als Grok Bot: we draaien de MCP-server in dit proces
 * en roepen hem aan via een client in het geheugen (geen netwerk, geen sleutel).
 */

/** Interne tools van Grok Bot (zijn eigen takenlijst en chatantwoorden): niet voor de spraakbot. */
export const HIDDEN_TOOLS = new Set(['ai_chat_geschiedenis', 'ai_chat_antwoorden', 'ai_taken_open', 'ai_taak_klaarzetten'])

/** Toolresultaten gaan als tekst in het gesprek (en kosten tokens): lange lijsten inkorten. */
export const MAX_RESULT_CHARS = 12_000

export type RealtimeTool = { type: 'function'; name: string; description: string; parameters: Record<string, unknown> }

/** Eigen tools van de spraakbot (geen MCP). */
export const OWN_TOOLS: RealtimeTool[] = [
  {
    type: 'function',
    name: 'grokbot_vragen',
    description:
      'Geef een opdracht door aan Grok Bot (de achtergrond-AI): voor zwaar werk zoals mails of opvolgmails schrijven, lange analyses, documenten of iets wat veel stappen vraagt, of als de gebruiker zegt "zet Grok Bot erop". Schrijf de opdracht volledig uit met alle context (namen, wat er moet gebeuren). Het antwoord komt later in de chat; jij krijgt het te horen zodra het er is.',
    parameters: { type: 'object', properties: { opdracht: { type: 'string', description: 'De volledige opdracht voor Grok Bot.' } }, required: ['opdracht'] },
  },
  {
    type: 'function',
    name: 'open_pagina',
    description: 'Open een pagina in het dashboard voor de gebruiker, bv. "sales", "productie van Tempus", "lead Bakkerij Janssens", "instellingen".',
    parameters: { type: 'object', properties: { wat: { type: 'string', description: 'Wat er geopend moet worden, in gewone woorden.' } }, required: ['wat'] },
  },
  {
    type: 'function',
    name: 'actie_bevestigen',
    description: 'Voer een wijziging uit die op bevestiging wacht. ENKEL nadat de gebruiker in zijn laatste beurt duidelijk ja zei op precies die actie.',
    parameters: { type: 'object', properties: { actie_id: { type: 'string' } }, required: ['actie_id'] },
  },
  {
    type: 'function',
    name: 'actie_annuleren',
    description: 'Annuleer een wijziging die op bevestiging wacht (de gebruiker zei nee of wil iets anders).',
    parameters: { type: 'object', properties: { actie_id: { type: 'string' } }, required: ['actie_id'] },
  },
]
export const OWN_TOOL_NAMES = new Set(OWN_TOOLS.map((t) => t.name))

async function connect(session: AdminSession) {
  const [a, b] = InMemoryTransport.createLinkedPair()
  await buildMcpServer(session).connect(a)
  const client = new Client({ name: 'ikr-spraakbot', version: '1.0.0' })
  await client.connect(b)
  return client
}

/** JSON-schema van MCP → functie-parameters voor OpenAI (zonder $schema, altijd een object). */
export function toRealtimeTool(t: Pick<Tool, 'name' | 'description' | 'inputSchema'>): RealtimeTool {
  const { $schema: _drop, ...schema } = (t.inputSchema ?? {}) as Record<string, unknown>
  void _drop
  return { type: 'function', name: t.name, description: (t.description ?? '').slice(0, 1024), parameters: { type: 'object', properties: {}, ...schema } }
}

type Catalog = { tools: RealtimeTool[]; readOnly: Map<string, boolean> }
let catalog: Promise<Catalog> | null = null

/** Alle MCP-tools (zonder de interne), met per tool of hij enkel leest. Eén keer per serverproces. */
export function toolCatalog(): Promise<Catalog> {
  catalog ??= (async () => {
    const client = await connect(botSession())
    try {
      const { tools } = await client.listTools()
      const visible = tools.filter((t) => !HIDDEN_TOOLS.has(t.name))
      return {
        tools: visible.map(toRealtimeTool),
        readOnly: new Map(visible.map((t) => [t.name, t.annotations?.readOnlyHint === true])),
      }
    } finally {
      await client.close()
    }
  })().catch((e) => {
    catalog = null
    throw e
  })
  return catalog
}

export const clipResult = (s: string) => (s.length > MAX_RESULT_CHARS ? `${s.slice(0, MAX_RESULT_CHARS)}\n… (ingekort: vraag gerichter als je meer nodig hebt)` : s)

/** Voert één MCP-tool uit (als Grok Bot, op de database). Geeft de tekst terug, of een fout. */
export async function runMcpTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  const client = await connect(botSession())
  try {
    const res = await client.callTool({ name, arguments: args })
    const parts = Array.isArray(res.content) ? res.content : []
    const text = parts
      .map((p: { type?: string; text?: string; resource?: { uri?: string } }) => (p.type === 'text' ? p.text : p.type === 'resource' ? `[bestand: ${p.resource?.uri ?? ''}]` : `[${p.type}]`))
      .join('\n')
    return { ok: !res.isError, text: clipResult(text || '(leeg)') }
  } catch (e) {
    return { ok: false, text: e instanceof Error ? e.message : 'Tool mislukt.' }
  } finally {
    await client.close()
  }
}

/** Kort, leesbaar overzicht van een schrijfactie voor de bevestigingskaart. */
export function describeAction(tool: string, args: Record<string, unknown>) {
  const shown = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' · ')
  const label = tool.replace(/_/g, ' ')
  return (shown ? `${label} — ${shown}` : label).slice(0, 600)
}
