import { beforeEach, describe, expect, it, vi } from 'vitest'

const google = vi.hoisted(() => ({
  isGoogleConfigured: vi.fn(() => true),
  listConnections: vi.fn(async () => [{ email: 'contact@iknowright.be' }]),
  createEvent: vi.fn(async () => ({ eventId: 'EV1', meetUrl: 'https://meet.google.com/abc-defg-hij' })),
  deleteEvent: vi.fn(),
  listEvents: vi.fn(async () => []),
  shareWithDomain: vi.fn(),
  startDriveUpload: vi.fn(),
}))
vi.mock('@/lib/admin/google', () => google)
const send = vi.hoisted(() => ({ sendInboxReplyAction: vi.fn() }))
vi.mock('./actions', () => send)
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin/fireflies', () => ({ addBotToMeeting: vi.fn(), isBotInMeeting: vi.fn(), isFirefliesConfigured: () => true }))

import { memoryCalls } from '@/lib/admin/calls/repo'
import { memoryLeads } from '@/lib/admin/sales/repo'
const session = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('@/lib/admin/session', () => ({ requireSales: async () => session.value }))
import { sendAndScheduleAction } from './calls-actions'

let leadId: string
beforeEach(async () => {
  for (const k of ['__ikrCalls', '__ikrLeads']) (globalThis as Record<string, unknown>)[k] = undefined
  vi.clearAllMocks()
  const leads = memoryLeads()
  session.value = { user: { email: 'casper@iknowright.be' }, calls: memoryCalls(), leads }
  leadId = (await leads.create({ name: 'Jan Peeters', company: 'Bakkerij Peeters', email: 'jan@peeters.be', phone: null, source: 'cold_mail' })).id
})
const form = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

describe('Verstuur en plan in agenda', () => {
  it('plant eerst (Meet), zet de link in de mail en verstuurt via de bestaande verzendactie', async () => {
    send.sendInboxReplyAction.mockResolvedValue({ ok: true })
    const r = await sendAndScheduleAction('T1', leadId, form({ kind: 'sales', date: '2026-11-10', time: '14:00', body: 'Hoi Jan,\n\nDinsdag 14u is goed!\n\nGroetjes,\nCasper', job_id: 'J1' }))
    expect(r.ok).toBe(true)
    const [thread, data] = send.sendInboxReplyAction.mock.calls[0] as [string, FormData]
    expect(thread).toBe('T1')
    expect(data.get('body')).toContain('Hier is de link voor onze call (dinsdag 10 november om 14:00): https://meet.google.com/abc-defg-hij\n\nGroetjes,')
    expect(data.get('job_id')).toBe('J1')
    expect(google.createEvent).toHaveBeenCalledWith(expect.objectContaining({ attendees: ['tandloosispam@gmail.com'], meet: true }))
  })
  it('versturen mislukt: call blijft, tekst met link komt terug; opnieuw = geen tweede call', async () => {
    send.sendInboxReplyAction.mockResolvedValueOnce({ ok: false, error: 'Gmail weigert' })
    const f = { kind: 'sales', date: '2026-11-10', time: '14:00', body: 'Top!' }
    const r = await sendAndScheduleAction('T1', leadId, form(f))
    expect(r).toMatchObject({ ok: false, body: expect.stringContaining('https://meet.google.com/abc-defg-hij') })
    expect(r.error).toMatch(/ingepland, maar de mail is niet verstuurd/)
    send.sendInboxReplyAction.mockResolvedValueOnce({ ok: true })
    await sendAndScheduleAction('T1', leadId, form({ ...f, body: r.body! }))
    expect(google.createEvent).toHaveBeenCalledTimes(1)
  })
  it('agenda mislukt: de mail wordt niet verstuurd', async () => {
    google.listConnections.mockResolvedValueOnce([])
    const r = await sendAndScheduleAction('T1', leadId, form({ kind: 'sales', date: '2026-11-10', time: '14:00', body: 'Top!' }))
    expect(r.ok).toBe(false)
    expect(send.sendInboxReplyAction).not.toHaveBeenCalled()
  })
})
