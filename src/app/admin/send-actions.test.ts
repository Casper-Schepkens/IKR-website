import { beforeEach, describe, expect, it, vi } from 'vitest'

// Verzending zelf gemockt: we testen enkel dat de analyse erna het resultaat nooit beïnvloedt.
const send = vi.hoisted(() => ({ sendDraft: vi.fn(), sendInboxReply: vi.fn() }))
vi.mock('@/lib/admin/sales/send', () => send)
const leads = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@/lib/admin/session', () => ({ requireSales: async () => ({ user: { email: 'casper@iknowright.be' }, drafts: {}, leads }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
const next = vi.hoisted(() => ({ after: vi.fn() }))
vi.mock('next/server', () => next)
vi.mock('@/lib/admin/supabase/server', () => ({
  createServiceSupabase: () => {
    throw new Error('DB plat')
  },
  createServerSupabase: vi.fn(),
}))
vi.mock('@/lib/admin/ai/style-profile', () => ({ recordFeedback: vi.fn(), saveProfile: vi.fn(), STYLE_KEYS: ['casper'], styleKeyFor: () => 'casper', styleInstructions: async () => '' }))

import { sendDraftAction, sendInboxReplyAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'
  process.env.ANTHROPIC_API_KEY = 'test'
})

describe('versturen + na_verzending', () => {
  it('concept: verstuurd = ok, ook als de analyse daarna crasht', async () => {
    const tasks: (() => Promise<void>)[] = []
    next.after.mockImplementation((fn: () => Promise<void>) => void tasks.push(fn))
    send.sendDraft.mockResolvedValue(undefined)
    expect(await sendDraftAction('D1')).toEqual({ ok: true, data: undefined })
    expect(tasks).toHaveLength(1)
    await expect(tasks[0]()).resolves.toBeUndefined() // DB plat: wordt opgevangen
  })

  it('inbox-antwoord: verstuurd = ok, ook als after() zelf faalt', async () => {
    next.after.mockImplementation(() => {
      throw new Error('after kapot')
    })
    send.sendInboxReply.mockResolvedValue('jan@peeters.be')
    const form = new FormData()
    form.set('body', 'Ik bel je volgende dinsdag')
    expect(await sendInboxReplyAction('T1', form)).toEqual({ ok: true, data: undefined })
  })

  it('mislukte verzending: geen analyse', async () => {
    send.sendDraft.mockRejectedValue(new Error('Gmail weigert'))
    expect(await sendDraftAction('D1')).toEqual({ ok: false, error: 'Gmail weigert' })
    expect(next.after).not.toHaveBeenCalled()
  })
})

describe('versturen + lead bijwerken', () => {
  const draft = { id: 'D1', lead_id: 'L1', subject: 'Voorstel TikTok', follow_up_action: null, follow_up_on: null }

  it('verstuurd concept: volgende actie, opvolgdatum en notitie op de lead', async () => {
    next.after.mockImplementation(() => {})
    send.sendDraft.mockResolvedValue(draft)
    leads.get.mockResolvedValue({ id: 'L1', notes: 'Eerste call goed.' })
    expect(await sendDraftAction('D1')).toEqual({ ok: true, data: undefined })
    expect(leads.patch).toHaveBeenCalledTimes(1)
    const [id, patch] = leads.patch.mock.calls[0]
    expect(id).toBe('L1')
    expect(patch.next_action).toBe('antwoord opvolgen')
    expect(patch.follow_up_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(patch.notes).toMatch(/^Eerste call goed\.\n\n\d{2}\/\d{2}\/\d{4}: mail verstuurd: "Voorstel TikTok"$/)
  })

  it('eigen waarden van het concept krijgen voorrang', async () => {
    next.after.mockImplementation(() => {})
    send.sendDraft.mockResolvedValue({ ...draft, follow_up_action: 'bellen', follow_up_on: '2026-12-01' })
    leads.get.mockResolvedValue({ id: 'L1', notes: null })
    await sendDraftAction('D1')
    expect(leads.patch.mock.calls[0][1]).toMatchObject({ next_action: 'bellen', follow_up_on: '2026-12-01' })
  })

  it('lead bijwerken mislukt: mail blijft verstuurd (ok) en de analyse loopt nog', async () => {
    next.after.mockImplementation(() => {})
    send.sendDraft.mockResolvedValue(draft)
    leads.get.mockResolvedValue({ id: 'L1', notes: null })
    leads.patch.mockRejectedValue(new Error('DB plat'))
    expect(await sendDraftAction('D1')).toEqual({ ok: true, data: undefined })
    expect(next.after).toHaveBeenCalledTimes(1)
  })

  it('mislukte verzending: lead blijft ongemoeid', async () => {
    send.sendDraft.mockRejectedValue(new Error('Gmail weigert'))
    await sendDraftAction('D1')
    expect(leads.get).not.toHaveBeenCalled()
    expect(leads.patch).not.toHaveBeenCalled()
  })
})
