import { beforeEach, describe, expect, it, vi } from 'vitest'

// Verzending zelf gemockt: we testen enkel dat de analyse erna het resultaat nooit beïnvloedt.
const send = vi.hoisted(() => ({ sendDraft: vi.fn(), sendInboxReply: vi.fn() }))
vi.mock('@/lib/admin/sales/send', () => send)
vi.mock('@/lib/admin/session', () => ({ requireSales: async () => ({ user: { email: 'casper@iknowright.be' }, drafts: {}, leads: {} }) }))
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
