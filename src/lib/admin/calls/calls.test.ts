import { beforeEach, describe, expect, it, vi } from 'vitest'

const google = vi.hoisted(() => ({
  isGoogleConfigured: vi.fn(() => true),
  listConnections: vi.fn(async () => [{ email: 'contact@iknowright.be' }]),
  createEvent: vi.fn(async () => ({ eventId: 'EV1', meetUrl: 'https://meet.google.com/abc-defg-hij' })),
  deleteEvent: vi.fn(async () => undefined),
  listEvents: vi.fn(async () => [] as unknown[]),
}))
vi.mock('../google', () => google)

import { memoryCalls } from './repo'
import { memoryLeads } from '../sales/repo'
import { memoryDrafts, type MailDraft } from '../sales/drafts'
import { cancelCall, finishCall, guessKind, matchLead, registerCall, scheduleCall, syncCallsFromCalendar } from './service'
import { callStats, forwardStage, insertMeetLink, type Call } from './types'
import type { Lead } from '../sales/types'

let deps: { calls: ReturnType<typeof memoryCalls>; leads: ReturnType<typeof memoryLeads> }
let drafts: MailDraft[]
let lead: Lead
beforeEach(async () => {
  for (const k of ['__ikrCalls', '__ikrLeads', '__ikrCallSync']) (globalThis as Record<string, unknown>)[k] = undefined
  vi.clearAllMocks()
  deps = { calls: memoryCalls(), leads: memoryLeads() }
  drafts = []
  lead = await deps.leads.create({ name: 'Jan Peeters', company: 'Bakkerij Peeters', email: 'jan@peeters.be', phone: '0478 12 34 56', source: 'cold_mail' })
})

describe('helpers', () => {
  it('Meet-link boven de groet, of onderaan; nooit dubbel', () => {
    const b = 'Hoi Jan,\n\nDinsdag 14u past perfect!\n\nGroetjes,\nCasper'
    const out = insertMeetLink(b, 'https://meet.google.com/abc-defg-hij', 'dinsdag 10 november om 14:00')
    expect(out).toBe('Hoi Jan,\n\nDinsdag 14u past perfect!\n\nHier is de link voor onze call (dinsdag 10 november om 14:00): https://meet.google.com/abc-defg-hij\n\nGroetjes,\nCasper')
    expect(insertMeetLink(out, 'https://meet.google.com/abc-defg-hij', 'x')).toBe(out)
    expect(insertMeetLink('Top, tot dinsdag', 'https://meet.google.com/x', 'd')).toBe('Top, tot dinsdag\n\nHier is de link voor onze call (d): https://meet.google.com/x')
  })
  it('fase enkel vooruit, nooit uit won/lost', () => {
    expect(forwardStage('lead', 'setter_planned')).toBe('setter_planned')
    expect(forwardStage('sales_planned', 'setter_planned')).toBeNull()
    expect(forwardStage('lost', 'sales_planned')).toBeNull()
  })
  it('cijfers: no-show-% en setter → sales', () => {
    const c = (id: string, lead_id: string, kind: Call['kind'], status: Call['status'], d = '2026-11-05') => ({ id, lead_id, kind, status, starts_at: `${d}T09:00:00Z` }) as Call
    const s = callStats([c('1', 'A', 'setter', 'afgerond'), c('2', 'B', 'setter', 'afgerond'), c('3', 'C', 'setter', 'no_show'), c('4', 'A', 'sales', 'gepland', '2026-11-12'), c('5', 'D', 'sales', 'afgerond', '2026-10-01')], '2026-11-01', '2026-11-30')
    expect(s.setter).toEqual({ gepland: 0, afgerond: 2, no_show: 1, geannuleerd: 0, no_show_pct: 33 })
    expect(s.sales).toMatchObject({ gepland: 1, afgerond: 0 })
    expect(s.setter_naar_sales).toEqual({ setter_afgerond: 2, met_sales_call: 1, pct: 50 })
  })
})

describe('inplannen', () => {
  it('sales call: contact-agenda + Meet + uitnodiging voor Casper; lead enkel als aangevinkt; fase vooruit', async () => {
    const c = await scheduleCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-10', time: '14:00', via: 'inbox', by: 'casper@iknowright.be' })
    expect(google.createEvent).toHaveBeenCalledWith(expect.objectContaining({ calendarOwner: 'contact@iknowright.be', meet: true, minutes: 60, attendees: ['tandloosispam@gmail.com'] }))
    expect(c).toMatchObject({ meet_url: 'https://meet.google.com/abc-defg-hij', calendar_event_id: 'EV1', invited: false, created_via: 'inbox', starts_at: '2026-11-10T13:00:00.000Z' })
    expect((await deps.leads.get(lead.id))!.stage).toBe('sales_planned')
    // zelfde moment opnieuw = geen dubbel
    await scheduleCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-10', time: '14:00', via: 'inbox', by: 'c' })
    expect(google.createEvent).toHaveBeenCalledTimes(1)
  })
  it('setter call zonder Meet; lead uitnodigen als gevraagd', async () => {
    await scheduleCall(deps, { leadId: lead.id, kind: 'setter', date: '2026-11-09', time: '09:30', inviteLead: true, via: 'dashboard', by: 'c' })
    expect(google.createEvent).toHaveBeenCalledWith(expect.objectContaining({ meet: false, minutes: 15, attendees: ['tandloosispam@gmail.com', 'jan@peeters.be'] }))
  })
  it('Grok Bot registreert enkel: geen agenda-item, geen uitnodiging', async () => {
    const c = await registerCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-10', time: '14:00', meetUrl: 'https://meet.google.com/abc-defg-hij', by: 'grokbot' })
    expect(google.createEvent).not.toHaveBeenCalled()
    expect(c).toMatchObject({ created_via: 'grokbot', invited: false, meet_url: 'https://meet.google.com/abc-defg-hij' })
  })
})

describe('afronden en annuleren', () => {
  it('afgerond zet de fase vooruit; no-show maakt één concept om opnieuw te plannen (niets verstuurd)', async () => {
    const d = { ...deps, drafts: memoryDrafts(drafts) }
    const s = await scheduleCall(deps, { leadId: lead.id, kind: 'setter', date: '2026-11-09', time: '09:30', via: 'dashboard', by: 'c' })
    await finishCall(d, s.id, 'afgerond', null, 'c')
    expect((await deps.leads.get(lead.id))!.stage).toBe('setter_done')
    const t = await scheduleCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-12', time: '10:00', via: 'dashboard', by: 'c' })
    const r = await finishCall(d, t.id, 'no_show', null, 'c')
    expect(r.draftId).toBeTruthy()
    expect(drafts[0]).toMatchObject({ status: 'concept', to_email: 'jan@peeters.be', subject: 'Nieuw moment voor onze call?' })
    expect(drafts[0].body).toMatch(/^Hoi Jan,/)
    expect(r.call.status).toBe('no_show')
  })
  it('annuleren via het dashboard haalt het agenda-item weg; via de bot niet', async () => {
    const a = await scheduleCall(deps, { leadId: lead.id, kind: 'sales', date: '2026-11-12', time: '10:00', via: 'dashboard', by: 'c' })
    await cancelCall(deps, a.id, { removeFromCalendar: true })
    expect(google.deleteEvent).toHaveBeenCalledWith('contact@iknowright.be', 'EV1', true)
    const b = await registerCall(deps, { leadId: lead.id, kind: 'setter', date: '2026-11-13', time: '10:00', by: 'grokbot' })
    await cancelCall(deps, b.id, { removeFromCalendar: false })
    expect(google.deleteEvent).toHaveBeenCalledTimes(1)
    expect((await deps.calls.get(b.id))!.status).toBe('geannuleerd')
  })
})

describe('detectie uit de contact-agenda', () => {
  const ev = (o: Partial<{ id: string; summary: string; start: string; end: string; meetUrl: string | null; attendees: string[]; status: string }>) => ({
    id: 'E1', summary: '', start: '2026-11-10T13:00:00.000Z', end: '2026-11-10T14:00:00.000Z', meetUrl: null, attendees: [], status: 'confirmed', ...o,
  })
  it('lead via deelnemer of via naam/bedrijf in de titel; weekly niet; soort uit titel of Meet', async () => {
    const leads = await deps.leads.list()
    expect(matchLead(ev({ attendees: ['jan@peeters.be'] }), leads)?.id).toBe(lead.id)
    expect(matchLead(ev({ summary: 'Call met Bakkerij Peeters' }), leads)?.id).toBe(lead.id)
    expect(matchLead(ev({ summary: 'IKR weekly (online)', attendees: ['jan@peeters.be'] }), leads)).toBeNull()
    expect(matchLead(ev({ summary: 'Tandarts' }), leads)).toBeNull()
    expect(guessKind({ summary: 'Setter Peeters', meetUrl: 'https://meet.google.com/x' })).toBe('setter')
    expect(guessKind({ summary: 'Peeters', meetUrl: 'https://meet.google.com/x' })).toBe('sales')
    expect(guessKind({ summary: 'Peeters', meetUrl: null })).toBe('setter')
  })
  it('maakt calls aan, geen dubbels, en volgt een verschoven afspraak', async () => {
    google.listEvents.mockResolvedValue([ev({ id: 'E1', summary: 'IKR × Bakkerij Peeters', meetUrl: 'https://meet.google.com/abc-defg-hij' }), ev({ id: 'E2', summary: 'Lunch' })])
    expect(await syncCallsFromCalendar(deps, { force: true })).toMatchObject({ nieuw: 1, bijgewerkt: 0 })
    expect(await syncCallsFromCalendar(deps, { force: true })).toMatchObject({ nieuw: 0, bijgewerkt: 0 })
    const [c] = await deps.calls.list()
    expect(c).toMatchObject({ kind: 'sales', created_via: 'agenda', calendar_event_id: 'E1', meet_url: 'https://meet.google.com/abc-defg-hij' })
    expect((await deps.leads.get(lead.id))!.stage).toBe('sales_planned')
    google.listEvents.mockResolvedValue([ev({ id: 'E1', summary: 'IKR × Bakkerij Peeters', start: '2026-11-11T13:00:00.000Z', end: '2026-11-11T14:00:00.000Z', meetUrl: 'https://meet.google.com/abc-defg-hij' })])
    expect(await syncCallsFromCalendar(deps, { force: true })).toMatchObject({ bijgewerkt: 1 })
    expect((await deps.calls.list())[0].starts_at).toBe('2026-11-11T13:00:00.000Z')
    // zonder force: hoogstens om de 5 minuten
    expect(await syncCallsFromCalendar(deps)).toMatchObject({ overgeslagen: true })
  })
})
