import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

// bot_actions: vang de logregels op in plaats van naar Supabase te schrijven.
const logs: { tool: string; ok: boolean; error: string | null }[] = []
vi.mock('../supabase/server', () => ({
  createServiceSupabase: () => ({
    from: () => ({ insert: async (row: { tool: string; ok: boolean; error: string | null }) => (logs.push(row), { error: null }) }),
  }),
  createServerSupabase: vi.fn(),
}))
// Gmail: elke verzendpoging zou hier zichtbaar worden. De tests eisen dat dit nooit gebeurt.
const gmail = vi.hoisted(() => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn(), recentThreads: vi.fn() }))
vi.mock('../gmail', () => gmail)

import { buildMcpServer } from './server'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryDrafts, type MailDraft } from '../sales/drafts'
import type { AdminSession } from '../session'

let store: MailDraft[]
let session: AdminSession
let client: Client
let leadId: string

async function call(name: string, args: Record<string, unknown>) {
  const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] }
  const text = res.content[0]?.text ?? ''
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { isError: Boolean(res.isError), text, json: json as Record<string, unknown> | null }
}

beforeEach(async () => {
  logs.length = 0
  vi.clearAllMocks()
  ;(globalThis as { __ikrLeads?: unknown }).__ikrLeads = []
  store = []
  session = { user: { email: 'casper@iknowright.be', name: 'Grokbot' }, mode: 'demo', leads: memoryLeads(), weekly: memoryWeekly(), drafts: memoryDrafts(store) }
  leadId = (await session.leads.create({ name: 'Jan Peeters', company: 'Bakkerij Peeters', email: 'jan@peeters.be', phone: null, source: 'cold_mail' })).id
  const [a, b] = InMemoryTransport.createLinkedPair()
  await buildMcpServer(session).connect(a)
  client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(b)
})

describe('mailconcepten via MCP', () => {
  it('biedt de drie concept-tools aan en geen enkele tool die verstuurt', async () => {
    const names = (await client.listTools()).tools.map((t) => t.name)
    expect(names).toEqual(expect.arrayContaining(['mail_concept_aanmaken', 'mail_concept_bijwerken', 'mail_concept_verwijderen']))
    expect(names.filter((n) => /versturen|verzenden|send/i.test(n))).toEqual([])
  })

  it('mail_concept_aanmaken bewaart een concept, geeft het id terug en verstuurt niets', async () => {
    const r = await call('mail_concept_aanmaken', {
      lead_id: leadId,
      to: 'Jan@Peeters.be',
      cc: ['collega@peeters.be'],
      subject: 'Even kennismaken',
      body: '<p>Hey Jan</p>',
    })
    expect(r.isError).toBe(false)
    expect(r.json?.concept_id).toEqual(store[0].id)
    expect(store).toHaveLength(1)
    expect(store[0]).toMatchObject({
      status: 'concept',
      to_email: 'jan@peeters.be',
      cc: ['collega@peeters.be'],
      from_email: 'casper@iknowright.be',
      is_html: true,
      created_by: 'grokbot',
    })
    expect(gmail.sendMail).not.toHaveBeenCalled()
    expect(gmail.sendReply).not.toHaveBeenCalled()
    expect(logs).toEqual([expect.objectContaining({ tool: 'mail_concept_aanmaken', ok: true })])
  })

  it('bewaart de context die de bot meegeeft en laat die aanpassen', async () => {
    const r = await call('mail_concept_aanmaken', {
      lead_id: leadId,
      to: 'jan@peeters.be',
      subject: 'Opvolging',
      body: 'Hey Jan',
      context: 'Jan had in oktober interesse maar wou wachten tot na de feestdagen.',
    })
    expect(r.isError).toBe(false)
    expect(r.json?.context).toBe('Jan had in oktober interesse maar wou wachten tot na de feestdagen.')
    await call('mail_concept_bijwerken', { concept_id: r.json!.concept_id, context: 'Nieuwe context' })
    expect(store[0].context).toBe('Nieuwe context')
    expect((await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'x', body: 'x', context: 'a'.repeat(4001) })).isError).toBe(true)
  })

  it('kiest contact@ als afzender en tekst als formaat wanneer gevraagd', async () => {
    const r = await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'Hoi', body: 'Gewone tekst', van: 'contact@iknowright.be', thread_id: 't123', in_reply_to: '<abc@mail>' })
    expect(r.isError).toBe(false)
    expect(store[0]).toMatchObject({ from_email: 'contact@iknowright.be', is_html: false, thread_id: 't123', in_reply_to: '<abc@mail>' })
  })

  it('weigert een ongeldig e-mailadres en logt de fout', async () => {
    const r = await call('mail_concept_aanmaken', { lead_id: leadId, to: 'geen-adres', subject: 'Hoi', body: 'Tekst' })
    expect(r.isError).toBe(true)
    expect(r.text).toMatch(/geen geldig e-mailadres/)
    expect(store).toHaveLength(0)
    expect(logs).toEqual([expect.objectContaining({ tool: 'mail_concept_aanmaken', ok: false })])
  })

  it('weigert een ongeldig cc-adres', async () => {
    const r = await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', cc: ['ok@x.be', 'fout'], subject: 'Hoi', body: 'Tekst' })
    expect(r.isError).toBe(true)
    expect(r.text).toMatch(/cc\[1\]/)
  })

  it('weigert een lead die niet bestaat', async () => {
    const r = await call('mail_concept_aanmaken', { lead_id: '00000000-0000-4000-8000-000000000000', to: 'jan@peeters.be', subject: 'Hoi', body: 'Tekst' })
    expect(r.isError).toBe(true)
    expect(r.text).toMatch(/Geen lead/)
    expect(store).toHaveLength(0)
  })

  it('weigert een leeg onderwerp of lege tekst', async () => {
    expect((await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: '  ', body: 'x' })).isError).toBe(true)
    expect((await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'x', body: '' })).isError).toBe(true)
  })

  it('mail_concept_bijwerken past enkel de meegegeven velden aan', async () => {
    const id = (await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'Oud', body: 'Tekst' })).json!.concept_id as string
    const r = await call('mail_concept_bijwerken', { concept_id: id, subject: 'Nieuw' })
    expect(r.isError).toBe(false)
    expect(store[0]).toMatchObject({ subject: 'Nieuw', body: 'Tekst', status: 'concept' })
    expect(gmail.sendMail).not.toHaveBeenCalled()
  })

  it('mail_concept_bijwerken en _verwijderen weigeren een verstuurd concept', async () => {
    const id = (await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'Hoi', body: 'Tekst' })).json!.concept_id as string
    await session.drafts.markSent(id, 'casper@iknowright.be')
    const upd = await call('mail_concept_bijwerken', { concept_id: id, subject: 'Toch anders' })
    const del = await call('mail_concept_verwijderen', { concept_id: id })
    expect(upd.isError).toBe(true)
    expect(del.isError).toBe(true)
    expect(store[0]).toMatchObject({ subject: 'Hoi', status: 'verstuurd' })
    expect(logs.filter((l) => !l.ok).map((l) => l.tool)).toEqual(['mail_concept_bijwerken', 'mail_concept_verwijderen'])
  })

  it('mail_concept_verwijderen verwijdert een concept', async () => {
    const id = (await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'Hoi', body: 'Tekst' })).json!.concept_id as string
    const r = await call('mail_concept_verwijderen', { concept_id: id })
    expect(r.isError).toBe(false)
    expect(store).toHaveLength(0)
  })

  it('weigert een ongeldig concept_id', async () => {
    const r = await call('mail_concept_bijwerken', { concept_id: 'abc', subject: 'x' })
    expect(r.isError).toBe(true)
    expect(r.text).toMatch(/geen geldig id/)
  })
})
