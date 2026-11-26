import { describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

vi.mock('../supabase/server', () => ({
  createServiceSupabase: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }),
  createServerSupabase: vi.fn(),
}))
vi.mock('../gmail', () => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn(), recentThreads: vi.fn(), threadsWith: vi.fn() }))

import { buildMcpServer } from './server'
import { INSTRUCTIONS } from './instructions'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryClients } from '../clients/repo'
import { memoryFreelancers } from '../freelancers/repo'
import { memorySops } from '../sops/repo'
import { memoryProduction } from '../production/repo'
import { memoryCalls } from '../calls/repo'
import { memoryDrafts } from '../sales/drafts'
import { memoryChat } from '../chat/repo'
import type { AdminSession } from '../session'

const SALES_TOOLS = ['leads_lijst', 'lead_fiche', 'lead_bijwerken', 'cold_mails', 'inbox', 'wachten_op_antwoord_lijst', 'mail_concept_aanmaken', 'mail_concepten_lijst', 'schrijfstijl', 'calls_lijst', 'call_transcript', 'transcripts_ongekoppeld']

describe('Grokbot-sessie', () => {
  it('heeft alle tools, ook sales, voor het hele team', async () => {
    const session: AdminSession = {
      user: { id: 'grokbot', email: 'casper@iknowright.be', name: 'Grokbot' },
      mode: 'demo',
      leads: memoryLeads(),
      weekly: memoryWeekly(),
      clients: memoryClients(),
      freelancers: memoryFreelancers(),
      sops: memorySops(),
      production: memoryProduction(),
      calls: memoryCalls(),
      drafts: memoryDrafts([]),
      chat: memoryChat([]),
    }
    const [a, b] = InMemoryTransport.createLinkedPair()
    await buildMcpServer(session).connect(a)
    const client = new Client({ name: 'test', version: '1.0.0' })
    await client.connect(b)
    const names = (await client.listTools()).tools.map((t) => t.name)
    for (const t of SALES_TOOLS) expect(names).toContain(t)
    expect(names).toHaveLength(116) // + drive_zoeken, drive_map_inhoud (read-only); + 4 freelancer-tools
  })

  it('instructies: sales-vragen van het team altijd beantwoorden', () => {
    expect(INSTRUCTIONS).toMatch(/beantwoord het altijd/)
    expect(INSTRUCTIONS).not.toMatch(/niet beschikbaar|enkel voor casper/i)
  })
})
