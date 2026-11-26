import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabase/server', () => ({
  createServiceSupabase: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }),
  createServerSupabase: vi.fn(),
}))
vi.mock('../gmail', () => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn(), recentThreads: vi.fn(), threadsWith: vi.fn() }))

import { clipResult, describeAction, HIDDEN_TOOLS, MAX_RESULT_CHARS, OWN_TOOLS, toolCatalog, toRealtimeTool } from './tools'

describe('tools van de spraakbot', () => {
  it('zet een MCP-schema om naar een OpenAI-functie (zonder $schema)', () => {
    const t = toRealtimeTool({ name: 'x', description: 'Doe x', inputSchema: { type: 'object', $schema: 'http://json-schema.org/draft-07/schema#', properties: { a: { type: 'string' } } } as never })
    expect(t).toEqual({ type: 'function', name: 'x', description: 'Doe x', parameters: { type: 'object', properties: { a: { type: 'string' } } } })
  })

  it('krijgt alle tools van Grok Bot behalve zijn interne, met lezen/wijzigen per tool', async () => {
    const { tools, readOnly } = await toolCatalog()
    const names = tools.map((t) => t.name)
    expect(names.length).toBe(116 - HIDDEN_TOOLS.size)
    for (const h of HIDDEN_TOOLS) expect(names).not.toContain(h)
    expect(names).toContain('drive_zoeken')
    expect(readOnly.get('leads_lijst')).toBe(true)
    expect(readOnly.get('lead_bijwerken')).toBe(false)
    // Samen met de eigen tools binnen de limiet van OpenAI (128).
    expect(names.length + OWN_TOOLS.length).toBeLessThanOrEqual(128)
    for (const own of OWN_TOOLS) expect(names).not.toContain(own.name)
  })

  it('kort lange resultaten in en vat een actie samen', () => {
    expect(clipResult('a'.repeat(MAX_RESULT_CHARS + 50)).length).toBeLessThan(MAX_RESULT_CHARS + 100)
    expect(describeAction('lead_bijwerken', { lead: 'Janssens', fase: 'offerte', leeg: '' })).toBe('lead bijwerken — lead: Janssens · fase: offerte')
  })
})
