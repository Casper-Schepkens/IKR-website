import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB (service role) in het geheugen: leads, mail_drafts, calls, call_transcripts, bot_actions ──
type Row = Record<string, unknown>
const tables: Record<string, Row[]> = {}
function q(table: string) {
  tables[table] ??= []
  const conds: ((r: Row) => boolean)[] = []
  let patch: Row | null = null
  const api = {
    select: () => api,
    update: (p: Row) => ((patch = p), api),
    insert: async (row: Row) => (tables[table].push({ ...row }), { error: null }),
    upsert: async (row: Row) => {
      const ex = tables[table].find((r) => r.fireflies_id === row.fireflies_id)
      if (ex) Object.assign(ex, row)
      else tables[table].push({ ...row })
      return { error: null }
    },
    eq: (c: string, v: unknown) => (conds.push((r) => r[c] === v), api),
    is: (c: string, v: unknown) => (conds.push((r) => (r[c] ?? null) === v), api),
    in: (c: string, v: unknown[]) => (conds.push((r) => v.includes(r[c])), api),
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
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => ({ from: q }), createServerSupabase: vi.fn() }))
const google = vi.hoisted(() => ({
  isGoogleConfigured: () => true,
  listConnections: async () => [{ email: 'contact@iknowright.be' }],
  createEvent: vi.fn(async () => ({ eventId: 'EV1', meetUrl: 'https://meet.google.com/abc-defg-hij' })),
  deleteEvent: vi.fn(),
  listEvents: vi.fn(async () => []),
  ensureDrivePath: vi.fn(async () => 'FOLDER'),
  createDocInFolder: vi.fn(async () => 'https://docs.google.com/document/d/DOC/edit'),
  removeFilePermission: vi.fn(async () => undefined),
}))
vi.mock('../google', () => google)
const ff = vi.hoisted(() => ({ getTranscript: vi.fn() }))
vi.mock('../fireflies', async (orig) => ({ ...(await orig<typeof import('../fireflies')>()), getTranscript: ff.getTranscript }))
const jobs = vi.hoisted(() => ({ enqueue: vi.fn(async () => ({ id: 'J1' })), runJob: vi.fn(), aiEngine: () => 'grokbot', isAiConfigured: () => true }))
vi.mock('../ai/jobs', () => jobs)
const notify = vi.hoisted(() => ({ notifyGrok: vi.fn() }))
vi.mock('../ai/notify', () => notify)
vi.mock('../ai/style-profile', () => ({ styleInstructions: async () => '', saveProfile: vi.fn(), styleKeyFor: () => 'casper', recordFeedback: vi.fn() }))

import { memoryCalls } from './repo'
import { memoryLeads } from '../sales/repo'
import { memoryDrafts, type MailDraft } from '../sales/drafts'
import { finishCall, scheduleCall } from './service'
import { handleFirefliesEvent, matchCall } from './transcripts'
import { parseFirefliesWebhook, verifyFirefliesSignature } from './webhook'
import { CALL_VERWERKEN, HANDLERS } from '../ai/handlers'
import { SALES_PPT_URL, type Call } from './types'
import type { Lead } from '../sales/types'

let deps: { calls: ReturnType<typeof memoryCalls>; leads: ReturnType<typeof memoryLeads>; drafts: ReturnType<typeof memoryDrafts> }
let drafts: MailDraft[]
let lead: Lead
const transcript = (o: Partial<{ id: string; title: string; date: string; meetingLink: string | null; participants: string[]; text: string }> = {}) => ({
  id: 'FF1', title: 'IKR sales call', date: '2026-11-10T13:02:00.000Z', duration: 40, meetingLink: 'https://meet.google.com/abc-defg-hij', participants: ['jan@peeters.be'], firefliesUrl: 'https://app.fireflies.ai/view/FF1', text: 'Casper: Hoi Jan...\n\nJan: We willen starten in januari.', ...o,
})
beforeEach(async () => {
  for (const k of ['__ikrCalls', '__ikrLeads', '__ikrCallSync']) (globalThis as Record<string, unknown>)[k] = undefined
  for (const k of Object.keys(tables)) delete tables[k]
  vi.clearAllMocks()
  drafts = []
  deps = { calls: memoryCalls(), leads: memoryLeads(), drafts: memoryDrafts(drafts) }
  lead = await deps.leads.create({ name: 'Jan Peeters', company: 'Bakkerij Peeters', email: 'jan@peeters.be', phone: null, source: 'cold_mail' })
})

describe('deel 2: bedankmail', () => {
  it('sales call afgerond → concept met de ppt-link (één keer); setter call niet', async () => {
    const c = await scheduleCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-10', time: '14:00', via: 'dashboard', by: 'c' })
    const r = await finishCall(deps, c.id, 'afgerond', null, 'c')
    expect(r.draftId).toBeTruthy()
    expect(drafts[0]).toMatchObject({ subject: 'Bedankt voor de call', status: 'concept', to_email: 'jan@peeters.be' })
    expect(drafts[0].body).toContain(SALES_PPT_URL)
    expect((await deps.calls.get(c.id))!.thank_you_draft_id).toBe(drafts[0].id)
    const s = await scheduleCall(deps, { leadId: lead.id, kind: 'setter', date: '2026-11-11', time: '09:00', via: 'dashboard', by: 'c' })
    expect((await finishCall(deps, s.id, 'afgerond', null, 'c')).draftId).toBeNull()
    expect(drafts).toHaveLength(1)
  })
})

describe('deel 3: Fireflies-webhook', () => {
  it('handtekening (HMAC-SHA256) en payload', () => {
    const body = JSON.stringify({ meetingId: 'FF1', eventType: 'Transcription completed', clientReferenceId: null })
    const sig = createHmac('sha256', 'geheim').update(body).digest('hex')
    expect(verifyFirefliesSignature(body, sig, 'geheim')).toBe(true)
    expect(verifyFirefliesSignature(body, `sha256=${sig}`, 'geheim')).toBe(true)
    expect(verifyFirefliesSignature(body, sig, 'ander')).toBe(false)
    expect(verifyFirefliesSignature(body + ' ', sig, 'geheim')).toBe(false)
    expect(verifyFirefliesSignature(body, null, 'geheim')).toBe(false)
    expect(parseFirefliesWebhook(body)).toEqual({ meetingId: 'FF1', clientRef: null })
    expect(parseFirefliesWebhook(JSON.stringify({ meetingId: 'FF1', eventType: 'Meeting started' }))).toBeNull()
  })

  it('koppelen: client-referentie, Meet, deelnemer + tijd, titel + tijd; anders niets', () => {
    const call = (id: string, lead_id: string, starts_at: string, meet_url: string | null = null) => ({ id, lead_id, starts_at, meet_url, status: 'gepland' }) as Call
    const leads = [lead, { ...lead, id: 'L2', name: 'Sara Claes', company: 'Studio Claes', email: 'sara@claes.be' }] as Lead[]
    const calls = [call('C1', lead.id, '2026-11-10T13:00:00.000Z', 'https://meet.google.com/abc-defg-hij'), call('C2', 'L2', '2026-11-10T14:00:00.000Z')]
    expect(matchCall(transcript({ meetingLink: null }), calls, leads, 'C2')?.id).toBe('C2')
    expect(matchCall(transcript(), calls, leads)?.id).toBe('C1')
    expect(matchCall(transcript({ meetingLink: null, participants: ['sara@claes.be'] }), calls, leads)?.id).toBe('C2')
    expect(matchCall(transcript({ meetingLink: null, participants: [], title: 'Call Studio Claes' }), calls, leads)?.id).toBe('C2')
    expect(matchCall(transcript({ meetingLink: null, participants: [], title: 'Iets anders' }), calls, leads)).toBeNull()
    expect(matchCall(transcript({ meetingLink: null, participants: ['sara@claes.be'], date: '2026-11-12T10:00:00.000Z' }), calls, leads)).toBeNull()
  })

  it('transcript binnen → Drive (juiste map), call afgerond + bedankmail, taak voor Grok Bot; idempotent', async () => {
    const c = await scheduleCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-10', time: '14:00', via: 'dashboard', by: 'c' })
    ff.getTranscript.mockResolvedValue(transcript())
    expect(await handleFirefliesEvent('FF1', null, deps)).toEqual({ status: 'gekoppeld', callId: c.id })
    expect(google.ensureDrivePath).toHaveBeenCalledWith('contact@iknowright.be', ['Sales', 'Sales calls', 'Fireflies'])
    expect(google.createDocInFolder).toHaveBeenCalledWith('contact@iknowright.be', 'FOLDER', '2026-11-10 Sales call – Bakkerij Peeters', expect.stringContaining('We willen starten in januari.'))
    const after = (await deps.calls.get(c.id))!
    expect(after).toMatchObject({ status: 'afgerond', fireflies_id: 'FF1', transcript_url: 'https://docs.google.com/document/d/DOC/edit' })
    expect(after.thank_you_draft_id).toBeTruthy() // vergeten af te ronden → toch bedankmail
    const [type, ref, input] = jobs.enqueue.mock.calls[0] as unknown as [string, string, { bedankmail: { body: string } | null; transcript: string }]
    expect([type, ref]).toEqual(['call_verwerken', `call:${c.id}:FF1`])
    expect(input.bedankmail?.body).toContain(SALES_PPT_URL)
    expect(notify.notifyGrok).toHaveBeenCalledWith(['J1'])
    expect(await handleFirefliesEvent('FF1', null, deps)).toEqual({ status: 'gekoppeld' }) // tweede keer niets
    expect(jobs.enqueue).toHaveBeenCalledTimes(1)
  })

  it('niet te koppelen → bewaard als ongekoppeld; weeklies genegeerd', async () => {
    ff.getTranscript.mockResolvedValue(transcript({ id: 'FF9', meetingLink: null, participants: [], title: 'Onbekend gesprek' }))
    expect(await handleFirefliesEvent('FF9', null, deps)).toEqual({ status: 'ongekoppeld' })
    expect(tables.call_transcripts.find((r) => r.fireflies_id === 'FF9')?.status).toBe('ongekoppeld')
    ff.getTranscript.mockResolvedValue(transcript({ id: 'FF8', meetingLink: null, participants: [], title: 'IKR weekly 2026-11-05' }))
    expect(await handleFirefliesEvent('FF8', null, deps)).toEqual({ status: 'genegeerd' })
  })

  it('setter-opname: tijdelijke publieke link wordt ingetrokken zodra het transcript binnen is', async () => {
    const c = await scheduleCall(deps, { leadId: lead.id, kind: 'setter', date: '2026-11-10', time: '14:00', via: 'dashboard', by: 'c' })
    await deps.calls.update(c.id, { recording_file_id: 'FILE1', recording_public_permission: 'PERM1' })
    ff.getTranscript.mockResolvedValue(transcript({ meetingLink: null, participants: [] }))
    await handleFirefliesEvent('FF2', c.id, deps)
    expect(google.removeFilePermission).toHaveBeenCalledWith('contact@iknowright.be', 'FILE1', 'PERM1')
    expect((await deps.calls.get(c.id))!.recording_public_permission).toBeNull()
  })
})

describe('deel 4: call_verwerken (afterDone)', () => {
  it('lead bijwerken (veilig), notitie, bedankmail enkel als onaangeroerd, analyse bewaard', async () => {
    tables.leads = [{ id: 'L1', next_action: null, follow_up_on: null, stage: 'sales_planned', phone: null, company: 'Bakkerij Peeters', notes: 'oud' }]
    tables.mail_drafts = [{ id: 'D1', body: 'Bedankt! ppt', original_body: 'Bedankt! ppt', status: 'concept' }]
    tables.calls = [{ id: 'C1' }]
    tables.call_transcripts = [{ fireflies_id: 'FF1', call_id: 'C1', status: 'gekoppeld' }]
    const input = {
      ref: 'call:C1:FF1',
      call: { id: 'C1', soort: 'sales', start: '2026-11-10T13:00:00.000Z', dag: '2026-11-10', weekdag: 'dinsdag' },
      lead: { id: 'L1', name: 'Jan', email: 'jan@peeters.be', notes: 'oud', next_action: null, follow_up_on: null, stage: 'sales_planned', phone: null, company: 'Bakkerij Peeters' },
      transcript: '...',
      bedankmail: { draft_id: 'D1', body: 'Bedankt! ppt' },
    }
    const output = CALL_VERWERKEN.parse({
      volgende_actie: { waarde: 'Offerte sturen', reden: 'afgesproken' },
      opvolgen_op: { waarde: '2026-11-13', reden: 'vrijdag' },
      fase: { waarde: 'sales_done', reden: 'call gehouden' },
      telefoon: null,
      bedrijf: null,
      notitie: 'Wil starten in januari, 4 video’s per maand.',
      bedankmail: 'Bedankt voor de call! Leuk dat jullie in januari willen starten. ppt',
      analyse: { samenvatting: 'Goed gesprek.', goed: ['Duidelijke volgende stap'], beter: ['Meer vragen naar budget'], score: 7, tips: ['Vat samen op het einde'] },
    })
    await HANDLERS.call_verwerken.afterDone(input as never, output as never)
    expect(tables.leads[0]).toMatchObject({ next_action: 'Offerte sturen', follow_up_on: '2026-11-13', stage: 'sales_done' })
    expect(tables.leads[0].notes).toBe('oud\n\n2026-11-10 (sales call): Wil starten in januari, 4 video’s per maand.')
    expect(tables.mail_drafts[0].body).toBe('Bedankt voor de call! Leuk dat jullie in januari willen starten. ppt')
    expect(tables.calls[0].analysis).toMatchObject({ score: 7, goed: ['Duidelijke volgende stap'] })
    expect(tables.call_transcripts[0].status).toBe('verwerkt')
    expect(tables.bot_actions.filter((r) => r.tool === 'call_verwerken').map((r) => (r.args as Row).veld)).toEqual(['volgende_actie', 'opvolgen_op', 'fase'])
  })

  it('bedankmail die Casper al aanpaste, blijft van Casper', async () => {
    tables.leads = [{ id: 'L1', next_action: null, follow_up_on: null, stage: 'sales_done', phone: null, company: null, notes: null }]
    tables.mail_drafts = [{ id: 'D1', body: 'Mijn eigen versie', original_body: 'Bedankt! ppt', status: 'concept' }]
    tables.calls = [{ id: 'C1' }]
    const output = CALL_VERWERKEN.parse({ volgende_actie: null, opvolgen_op: null, fase: null, telefoon: null, bedrijf: null, notitie: null, bedankmail: 'AI-versie', analyse: { samenvatting: 's', goed: [], beter: [], score: null, tips: [] } })
    await HANDLERS.call_verwerken.afterDone(
      { ref: 'r', call: { id: 'C1', soort: 'sales', start: '2026-11-10T13:00:00Z', dag: '2026-11-10', weekdag: 'dinsdag' }, lead: { id: 'L1', name: 'J', email: null, notes: null, next_action: null, follow_up_on: null, stage: 'sales_done', phone: null, company: null }, transcript: '', bedankmail: { draft_id: 'D1', body: 'Bedankt! ppt' } } as never,
      output as never,
    )
    expect(tables.mail_drafts[0].body).toBe('Mijn eigen versie')
  })
})
