import { beforeEach, describe, expect, it, vi } from 'vitest'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

// ── Nep-Supabase: leads + bot_actions in het geheugen, met voorwaardelijke updates ──
type Row = Record<string, unknown>
const tables: Record<string, Row[]> = { leads: [], bot_actions: [] }
function query(table: string) {
  const conds: ((r: Row) => boolean)[] = []
  let patch: Row | null = null
  const api = {
    select: () => api,
    update: (p: Row) => ((patch = p), api),
    insert: async (row: Row) => (tables[table].push(row), { error: null }),
    eq: (c: string, v: unknown) => (conds.push((r) => r[c] === v), api),
    is: (c: string, v: unknown) => (conds.push((r) => (r[c] ?? null) === v), api),
    ilike: (c: string, v: string) => (conds.push((r) => String(r[c]).toLowerCase() === v.toLowerCase()), api),
    order: () => api,
    limit: () => api,
    maybeSingle: async () => ({ data: tables[table].find((r) => conds.every((f) => f(r))) ?? null, error: null }),
    then: (res: (v: { data: Row[]; error: null }) => void) => {
      const hits = tables[table].filter((r) => conds.every((f) => f(r)))
      if (patch) hits.forEach((r) => Object.assign(r, patch))
      res({ data: hits, error: null })
    },
  }
  return api
}
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => ({ from: query }), createServerSupabase: vi.fn() }))
const jobs = vi.hoisted(() => ({ enqueue: vi.fn(), runJob: vi.fn(), aiEngine: vi.fn(() => 'api'), isAiConfigured: vi.fn(() => true) }))
vi.mock('../ai/jobs', () => jobs)
vi.mock('../ai/notify', () => ({ notifyGrok: vi.fn() }))
vi.mock('../gmail', () => ({ getThread: vi.fn(async () => { throw new Error('Gmail plat') }) }))
const afterFn = vi.hoisted(() => ({ after: vi.fn() }))
vi.mock('next/server', () => afterFn)

import { applyAfterSend, type AfterSendInput } from './after-send-apply'
import { createAfterSendJob, scheduleAfterSend } from './after-send'
import { HANDLERS, NA_VERZENDING } from '../ai/handlers'

const LEAD = { id: 'L1', name: 'Jan Peeters', email: 'jan@peeters.be', notes: null, next_action: null, follow_up_on: null, stage: 'lead', phone: null, company: 'Bakkerij Peeters' }
const input = (): AfterSendInput => ({
  ref: 'draft:1',
  lead: { ...LEAD },
  sent: { at: '2026-11-04T09:00:00.000Z', day: '2026-11-04', weekday: 'woensdag', from: 'casper@iknowright.be', to: 'jan@peeters.be', subject: 'Re: TikTok', body: 'Hoi Jan, ik bel je volgende dinsdag even op. Groetjes, Casper' },
  thread: [],
})

beforeEach(() => {
  tables.leads = [{ ...LEAD }]
  tables.bot_actions = []
  vi.clearAllMocks()
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'
})

describe('na_verzending toepassen', () => {
  it('zet volgende actie + opvolgdatum op de lead en logt elke wijziging', async () => {
    await applyAfterSend(input(), { volgende_actie: { waarde: 'Jan bellen', reden: 'Casper belooft te bellen' }, opvolgen_op: { waarde: '2026-11-10', reden: 'volgende dinsdag' } })
    expect(tables.leads[0]).toMatchObject({ next_action: 'Jan bellen', follow_up_on: '2026-11-10' })
    expect(tables.bot_actions.map((r) => [r.tool, r.ok, (r.args as Row).veld])).toEqual([
      ['na_verzending', true, 'volgende_actie'],
      ['na_verzending', true, 'opvolgen_op'],
    ])
  })

  it('velden die het concept zelf vastlegde past de AI niet aan', async () => {
    await applyAfterSend({ ...input(), keep: ['volgende_actie', 'opvolgen_op'] }, {
      volgende_actie: { waarde: 'Jan bellen', reden: 'x' },
      opvolgen_op: { waarde: '2026-11-10', reden: 'y' },
      telefoon: { waarde: '0470 12 34 56', reden: 'in handtekening' },
    })
    expect(tables.leads[0]).toMatchObject({ next_action: null, follow_up_on: null, phone: '0470 12 34 56' })
  })

  it('leeg resultaat verandert niets', async () => {
    await applyAfterSend(input(), { volgende_actie: null, opvolgen_op: null, fase: null, telefoon: null, bedrijf: null })
    expect(tables.leads[0]).toEqual(LEAD)
    expect(tables.bot_actions).toEqual([])
  })

  it('laat een veld staan dat Casper na het versturen zelf aanpaste (en logt dat)', async () => {
    tables.leads[0].next_action = 'Zelf: offerte sturen'
    await applyAfterSend(input(), { volgende_actie: { waarde: 'Jan bellen', reden: 'x' }, opvolgen_op: { waarde: '2026-11-10', reden: 'y' } })
    expect(tables.leads[0]).toMatchObject({ next_action: 'Zelf: offerte sturen', follow_up_on: '2026-11-10' })
    expect(tables.bot_actions.map((r) => [(r.args as Row).veld, r.ok])).toEqual([
      ['volgende_actie', false],
      ['opvolgen_op', true],
    ])
  })

  it('de handler past het resultaat toe via afterDone (ook als Grokbot het klaarzet)', async () => {
    await HANDLERS.na_verzending.afterDone(input() as never, { opvolgen_op: { waarde: '2026-11-10', reden: 'r' } })
    expect(tables.leads[0].follow_up_on).toBe('2026-11-10')
  })
})

describe('na_verzending aanmaken', () => {
  it('maakt een taak met lead-momentopname en verzenddag, ook als Gmail faalt', async () => {
    jobs.enqueue.mockResolvedValue({ id: 'J1' })
    await createAfterSendJob({ ref: 'inbox:t:1', leadEmail: 'JAN@peeters.be', threadId: 't', from: 'casper@iknowright.be', to: 'jan@peeters.be', subject: '', body: 'Ik bel je volgende dinsdag', by: 'casper@iknowright.be' }, new Date('2026-11-04T09:00:00Z'))
    const [type, ref, inp] = jobs.enqueue.mock.calls[0]
    expect([type, ref]).toEqual(['na_verzending', 'inbox:t:1'])
    expect(inp).toMatchObject({ lead: { id: 'L1', next_action: null }, sent: { day: '2026-11-04', weekday: 'woensdag', body: 'Ik bel je volgende dinsdag' }, thread: [] })
    expect(jobs.runJob).toHaveBeenCalledWith('J1')
  })

  it('geen lead = geen taak', async () => {
    await createAfterSendJob({ ref: 'x', leadEmail: 'onbekend@x.be', from: 'casper@iknowright.be', to: 'onbekend@x.be', subject: 's', body: 'b', by: 'c' })
    expect(jobs.enqueue).not.toHaveBeenCalled()
  })

  it('scheduleAfterSend gooit nooit: ook niet als after() of de taak faalt', async () => {
    afterFn.after.mockImplementationOnce(() => {
      throw new Error('geen request')
    })
    expect(() => scheduleAfterSend({ draftId: 'D1', by: 'c' })).not.toThrow()
    let task: (() => Promise<void>) | undefined
    afterFn.after.mockImplementationOnce((fn: () => Promise<void>) => void (task = fn))
    jobs.enqueue.mockRejectedValueOnce(new Error('DB plat'))
    scheduleAfterSend({ ref: 'r', leadEmail: 'jan@peeters.be', from: 'casper@iknowright.be', to: 'jan@peeters.be', subject: 's', body: 'b', by: 'c' })
    await expect(task!()).resolves.toBeUndefined()
  })
})

describe('resultaatvorm', () => {
  it('werkt voor de Claude API (structured output) en voor Grokbot (JSON-schema in ai_taken_open)', () => {
    expect(() => betaZodOutputFormat(NA_VERZENDING)).not.toThrow()
    expect(z.toJSONSchema(NA_VERZENDING)).toMatchObject({ type: 'object' })
    expect(NA_VERZENDING.parse({ volgende_actie: null, opvolgen_op: null, fase: null, telefoon: null, bedrijf: null })).toBeTruthy()
  })
  it('de opdracht bevat de verzenddag, de huidige velden en de verstuurde mail', () => {
    const prompt = HANDLERS.na_verzending.prompt(input() as never)
    expect(prompt).toContain('woensdag 2026-11-04')
    expect(prompt).toContain('Volgende actie: —')
    expect(prompt).toContain('ik bel je volgende dinsdag')
  })
})
