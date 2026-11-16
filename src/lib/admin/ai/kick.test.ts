import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../../../../test/fake-supabase'

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('../../../../test/fake-supabase').fakeSupabase> | null }))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => db.current }))
vi.mock('./style-profile', () => ({ styleInstructions: async () => '', saveProfile: vi.fn(), styleKeyFor: () => 'casper' }))
const notify = vi.hoisted(() => ({ notifyGrok: vi.fn() }))
vi.mock('./notify', () => notify)
vi.mock('next/server', () => ({ after: () => { throw new Error('geen request') } }))

import { GROK_UNREACHABLE, kickJobs } from './kick'

const job = (id: string, type: string, input: Record<string, unknown>) => ({ id, type, ref: id, status: 'pending', input, output: null })

beforeEach(() => {
  process.env.IKR_AI_ENGINE = 'grokbot'
  delete process.env.ANTHROPIC_API_KEY
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('Grok onbereikbaar', () => {
  it('chat: de gebruiker krijgt meteen een melding in plaats van eindeloos "denkt na"', async () => {
    db.current = fakeSupabase({ ai_jobs: [job('J1', 'chat', { user_id: 'U1', page: '/admin' })], ai_chat: [] })
    notify.notifyGrok.mockResolvedValue('webhook 400: Automation is disabled')
    await kickJobs(['J1'])
    expect(db.current.tables.ai_jobs[0]).toMatchObject({ status: 'error', error: GROK_UNREACHABLE })
    expect(db.current.tables.ai_chat).toEqual([expect.objectContaining({ user_id: 'U1', role: 'bot', text: GROK_UNREACHABLE })])
    expect(db.current.tables.bot_actions).toEqual([expect.objectContaining({ tool: 'grok_ping', ok: false, error: 'webhook 400: Automation is disabled' })])
  })

  it('werkplek: bericht op de kaart en de kaart is niet meer bezig', async () => {
    db.current = fakeSupabase({ ai_jobs: [job('J2', 'werkplek', { kaart: { id: 'K1' } })], bot_cards: [{ id: 'K1', bot_busy_since: new Date().toISOString() }] })
    notify.notifyGrok.mockResolvedValue('netwerkfout: timeout')
    await kickJobs(['J2'])
    expect(db.current.tables.bot_card_messages).toEqual([expect.objectContaining({ card_id: 'K1', body: GROK_UNREACHABLE })])
    expect(db.current.tables.bot_cards[0].bot_busy_since).toBeNull()
  })

  it('taak zonder tools en geen API-sleutel: blijft open voor later', async () => {
    db.current = fakeSupabase({ ai_jobs: [job('J3', 'contract_afleiden', {})] })
    notify.notifyGrok.mockResolvedValue('webhook 500')
    await kickJobs(['J3'])
    expect(db.current.tables.ai_jobs[0].status).toBe('pending')
  })

  it('Grok nam het aan: niets anders', async () => {
    db.current = fakeSupabase({ ai_jobs: [job('J4', 'chat', { user_id: 'U1' })] })
    notify.notifyGrok.mockResolvedValue(true)
    await kickJobs(['J4'])
    expect(db.current.tables.ai_jobs[0].status).toBe('pending')
    expect(db.current.tables.bot_actions ?? []).toHaveLength(0)
  })
})
