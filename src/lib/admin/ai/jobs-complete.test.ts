import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../../../../test/fake-supabase'

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('../../../../test/fake-supabase').fakeSupabase> | null }))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => db.current }))
vi.mock('./style-profile', () => ({ styleInstructions: async () => '', saveProfile: vi.fn(), styleKeyFor: () => 'casper' }))

import { completeJob, JOB_ALREADY_HANDLED, runJob, STALE_RUNNING_MS } from './jobs'

const chatJob = (status: string, extra: Record<string, unknown> = {}) => ({
  id: 'J1',
  type: 'chat',
  ref: 'chat:1',
  status,
  input: { user_id: 'U1', page: '/admin' },
  output: null,
  ...extra,
})

beforeEach(() => {
  delete process.env.IKR_AI_ENGINE
  delete process.env.ANTHROPIC_API_KEY
})

describe('AI-taak afronden', () => {
  it('twee keer hetzelfde resultaat: afterDone loopt één keer', async () => {
    db.current = fakeSupabase({ ai_jobs: [chatJob('pending')] })
    await completeJob('J1', { antwoord: 'Hallo' }, 'grokbot')
    await expect(completeJob('J1', { antwoord: 'Hallo' }, 'grokbot')).rejects.toThrow(JOB_ALREADY_HANDLED)
    expect(db.current.tables.ai_chat).toHaveLength(1)
  })

  it('weggeklikt tussen lezen en schrijven: niets toegepast', async () => {
    db.current = fakeSupabase({ ai_jobs: [chatJob('pending')] })
    const real = db.current
    // Simuleer: iemand klikt de taak weg net nadat completeJob ze las.
    let reads = 0
    db.current = {
      ...real,
      from: (t: string) => {
        if (t === 'ai_jobs' && reads++ === 1) real.tables.ai_jobs[0].status = 'dismissed'
        return real.from(t)
      },
    }
    await expect(completeJob('J1', { antwoord: 'Hallo' }, 'grokbot')).rejects.toThrow(JOB_ALREADY_HANDLED)
    expect(real.tables.ai_chat ?? []).toHaveLength(0)
  })
})

describe('hangende taak', () => {
  it('een taak die 5 minuten op running staat, wordt opnieuw opgepikt', async () => {
    const old = new Date(Date.now() - STALE_RUNNING_MS - 1000).toISOString()
    db.current = fakeSupabase({ ai_jobs: [chatJob('running', { started_at: old })] })
    await runJob('J1') // zonder API-sleutel: opgepikt en meteen op fout gezet
    expect(db.current.tables.ai_jobs[0]).toMatchObject({ status: 'error', error: 'ANTHROPIC_API_KEY ontbreekt in Vercel.' })
  })

  it('een taak die net begonnen is, wordt niet dubbel opgepikt', async () => {
    db.current = fakeSupabase({ ai_jobs: [chatJob('running', { started_at: new Date().toISOString() })] })
    await runJob('J1')
    expect(db.current.tables.ai_jobs[0].status).toBe('running')
  })
})
