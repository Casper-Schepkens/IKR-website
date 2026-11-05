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
const gmail = vi.hoisted(() => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn(), recentThreads: vi.fn(), threadsWith: vi.fn() }))
vi.mock('../gmail', () => gmail)

import { buildMcpServer } from './server'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryDrafts, type MailDraft } from '../sales/drafts'
import { memoryChat, type ChatMessage } from '../chat/repo'
import type { AdminSession } from '../session'

let store: MailDraft[]
let chatStore: ChatMessage[]
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
  chatStore = []
  session = {
    user: { id: 'grokbot', email: 'casper@iknowright.be', name: 'Grokbot' },
    mode: 'demo',
    leads: memoryLeads(),
    weekly: memoryWeekly(),
    drafts: memoryDrafts(store),
    chat: memoryChat(chatStore),
  }
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

  it('verstuurt concepten altijd vanaf casper@ (contact@ kan niet meer)', async () => {
    const r = await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'Hoi', body: 'Gewone tekst', van: 'contact@iknowright.be', formaat: 'text', thread_id: 't123', in_reply_to: '<abc@mail>' })
    expect(r.isError).toBe(false)
    expect(store[0]).toMatchObject({ from_email: 'casper@iknowright.be', is_html: false, thread_id: 't123', in_reply_to: '<abc@mail>', original_body: 'Gewone tekst' })
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

const CASPER = '11111111-1111-4111-8111-111111111111'
const CEDRIC = '22222222-2222-4222-8222-222222222222'

describe('chat met Grok Bot via MCP', () => {
  beforeEach(async () => {
    await session.chat.add({ user_id: CASPER, role: 'user', text: 'Welke leads moet ik opvolgen?', page: '/admin/sales' })
    await session.chat.add({ user_id: CEDRIC, role: 'user', text: 'Wat staat er op de weekly?', page: '/admin/weekly' })
  })

  it('ai_chat_geschiedenis geeft enkel de chat van die gebruiker', async () => {
    const r = await call('ai_chat_geschiedenis', { user_id: CASPER })
    expect(r.isError).toBe(false)
    const msgs = r.json as unknown as { tekst: string; pagina: string }[]
    expect(msgs.map((m) => m.tekst)).toEqual(['Welke leads moet ik opvolgen?'])
    expect(msgs[0].pagina).toBe('/admin/sales')
  })

  it('ai_chat_antwoorden zet het antwoord in de chat van die gebruiker en logt het', async () => {
    const r = await call('ai_chat_antwoorden', { user_id: CASPER, tekst: 'Je moet Lotte en Jan opvolgen.' })
    expect(r.isError).toBe(false)
    expect(chatStore.filter((m) => m.user_id === CASPER).map((m) => m.role)).toEqual(['user', 'bot'])
    expect(chatStore.filter((m) => m.user_id === CEDRIC)).toHaveLength(1)
    expect(logs).toEqual([expect.objectContaining({ tool: 'ai_chat_antwoorden', ok: true })])
    expect(gmail.sendMail).not.toHaveBeenCalled()
  })

  it('weigert een onbekende gebruiker of een leeg antwoord', async () => {
    expect((await call('ai_chat_antwoorden', { user_id: '33333333-3333-4333-8333-333333333333', tekst: 'Hoi' })).isError).toBe(true)
    expect((await call('ai_chat_antwoorden', { user_id: CASPER, tekst: '   ' })).isError).toBe(true)
    expect((await call('ai_chat_antwoorden', { user_id: 'geen-id', tekst: 'Hoi' })).isError).toBe(true)
    expect(chatStore.filter((m) => m.role === 'bot')).toHaveLength(0)
  })

  it('mail_concepten_lijst geeft open concepten met lead, thread en tekst', async () => {
    await call('mail_concept_aanmaken', { lead_id: leadId, to: 'jan@peeters.be', subject: 'Hoi', body: 'Tekst', thread_id: 't1' })
    const r = await call('mail_concepten_lijst', {})
    const list = r.json as unknown as { lead: string; thread_id: string; body: string; concept_id: string }[]
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ lead: 'Jan Peeters', thread_id: 't1', body: 'Tekst' })
  })
})

describe('wachten op antwoord via MCP', () => {
  it('geeft lead_id, naam, context, laatste mail en dagen (langst wachtend eerst), alleen lezen', async () => {
    const { seedDemoWaiting } = await import('../sales/waiting')
    await seedDemoWaiting(session)
    const tool = (await client.listTools()).tools.find((t) => t.name === 'wachten_op_antwoord_lijst')
    expect(tool?.annotations?.readOnlyHint).toBe(true)
    const r = await call('wachten_op_antwoord_lijst', {})
    expect(r.isError).toBe(false)
    const leads = (r.json as { leads: { lead_id: string; naam: string; context: string; dagen: number; laatste_mail: { van: string } }[] }).leads
    expect(leads.map((l) => l.naam)).toEqual(['Bakkerij Peeters', 'Fietsen De Smet', 'Studio Claes'])
    expect(leads.map((l) => l.dagen)).toEqual([9, 5, 2])
    expect(leads[0]).toMatchObject({ context: 'Lead · Prijsvoorstel opvolgen', laatste_mail: { van: 'casper@iknowright.be' } })
    expect(leads.every((l) => typeof l.lead_id === 'string')).toBe(true)
    expect(gmail.sendMail).not.toHaveBeenCalled()
    expect(gmail.sendReply).not.toHaveBeenCalled()
    expect(logs).toEqual([]) // leestool: geen bot_actions-rij
  })
})

describe('prikbord via MCP', () => {
  it('Grok Bot zet een kaartje klaar (document herkend, @voor), lijst en verwijderen; verstuurt niets', async () => {
    const r = await call('prikbord_toevoegen', { titel: 'Content-kalender november', link: 'https://docs.google.com/spreadsheets/d/abc', voor: 'cedric' })
    expect(r.isError).toBe(false)
    expect(r.json).toMatchObject({ soort: 'document', voor: 'cedric', door: 'Grok Bot', vastgepind: false })
    const list = (await call('prikbord_lijst', {})).json as unknown as { pin_id: string }[]
    expect(list).toHaveLength(1)
    await call('prikbord_bijwerken', { pin_id: list[0].pin_id, vastgepind: true })
    expect(((await call('prikbord_lijst', {})).json as unknown as { vastgepind: boolean }[])[0].vastgepind).toBe(true)
    await call('prikbord_verwijderen', { pin_id: list[0].pin_id })
    expect((await call('prikbord_lijst', {})).json).toEqual([])
    expect(logs.map((l) => l.tool)).toEqual(['prikbord_toevoegen', 'prikbord_bijwerken', 'prikbord_verwijderen'])
    expect(gmail.sendMail).not.toHaveBeenCalled()
  })
  it('weigert een onveilige link', async () => {
    const r = await call('prikbord_toevoegen', { titel: 'x', link: 'javascript:alert(1)' })
    expect(r.isError).toBe(true)
  })
})
