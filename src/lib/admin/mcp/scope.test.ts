import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

vi.mock('../supabase/server', () => ({
  createServiceSupabase: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }),
  createServerSupabase: vi.fn(),
}))
vi.mock('../gmail', () => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn(), recentThreads: vi.fn(), threadsWith: vi.fn() }))
const teamRead = vi.hoisted(() => ({ searchMail: vi.fn(async () => []) }))
vi.mock('../team/google-read', async (orig) => ({ ...(await orig<typeof import('../team/google-read')>()), searchMail: teamRead.searchMail }))

import { buildMcpServer, type Scope } from './server'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryClients } from '../clients/repo'
import { memorySops } from '../sops/repo'
import { memoryProduction } from '../production/repo'
import { memoryCalls } from '../calls/repo'
import { memoryDrafts } from '../sales/drafts'
import { memoryChat } from '../chat/repo'
import { workspaceRepo } from '../workspace/repo'
import type { AdminSession } from '../session'

const SALES_TOOLS = ['leads_lijst', 'lead_fiche', 'lead_bijwerken', 'cold_mails', 'inbox', 'wachten_op_antwoord_lijst', 'mail_concept_aanmaken', 'mail_concepten_lijst', 'schrijfstijl', 'calls_lijst', 'call_transcript', 'transcripts_ongekoppeld']

async function connect(scope: Scope) {
  const session: AdminSession = {
    user: { id: 'grokbot', email: 'casper@iknowright.be', name: 'Grokbot' },
    mode: 'demo',
    leads: memoryLeads(),
    weekly: memoryWeekly(),
    clients: memoryClients(),
    sops: memorySops(),
    production: memoryProduction(),
    calls: memoryCalls(),
    drafts: memoryDrafts([]),
    chat: memoryChat([]),
  }
  const [a, b] = InMemoryTransport.createLinkedPair()
  await buildMcpServer(session, scope).connect(a)
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(b)
  const call = async (name: string, args: Record<string, unknown>) => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] }
    return { isError: Boolean(res.isError), text: res.content[0]?.text ?? '' }
  }
  return { client, call }
}

beforeEach(() => {
  ;(globalThis as { __ikrWorkspace?: unknown }).__ikrWorkspace = undefined
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})

describe('bereik van een Grokbot-sessie', () => {
  it('sales (Casper): alle tools, ook sales', async () => {
    const { client } = await connect('sales')
    const names = (await client.listTools()).tools.map((t) => t.name)
    for (const t of SALES_TOOLS) expect(names).toContain(t)
    expect(names).toHaveLength(108)
  })

  it('team (Cédric en Milan): geen enkele sales-tool, wel de rest', async () => {
    const { client } = await connect('team')
    const names = (await client.listTools()).tools.map((t) => t.name)
    for (const t of SALES_TOOLS) expect(names).not.toContain(t)
    for (const t of names) expect(t).not.toMatch(/^(lead|leads|inbox|mail_concept|call|calls|transcript|cold_mails|wachten)/)
    expect(names).toEqual(expect.arrayContaining(['weekly_overzicht', 'productie_overzicht', 'sops_zoeken', 'werkplek_lijst', 'ai_chat_antwoorden', 'klanten_lijst']))
  })

  it('team: de werkplek van Casper is niet zichtbaar', async () => {
    const mine = await workspaceRepo().create({ owner_email: 'casper@iknowright.be', kind: 'vraag', title: 'Offerte Peeters', body: 'sales' })
    const theirs = await workspaceRepo().create({ owner_email: 'cedric@iknowright.be', kind: 'vraag', title: 'Strategie', body: 'x' })
    const team = await connect('team')
    const list = await team.call('werkplek_lijst', { status: 'alle' })
    expect(list.text).toContain(theirs.id)
    expect(list.text).not.toContain(mine.id)
    expect((await team.call('werkplek_kaart', { kaart_id: mine.id })).isError).toBe(true)
    expect((await team.call('werkplek_reageren', { kaart_id: mine.id, tekst: 'hoi' })).isError).toBe(true)
    const sales = await connect('sales')
    expect((await sales.call('werkplek_lijst', { status: 'alle' })).text).toContain(mine.id)
  })

  it('team: de mailbox van Casper is niet te lezen', async () => {
    const team = await connect('team')
    const r = await team.call('teamlid_mail_zoeken', { teamlid: 'Casper' })
    expect(r.isError).toBe(true)
    expect(r.text).toMatch(/niet beschikbaar/)
    expect(teamRead.searchMail).not.toHaveBeenCalled()
  })

  it('team: een chat beantwoorden kan enkel met een taak van het team', async () => {
    const team = await connect('team')
    const r = await team.call('ai_chat_antwoorden', { user_id: '00000000-0000-4000-8000-000000000001', tekst: 'Hoi' })
    expect(r.isError).toBe(true)
    expect(r.text).toMatch(/job_id/)
  })
})
