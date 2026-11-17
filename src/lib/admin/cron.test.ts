import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../../../test/fake-supabase'

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('../../../test/fake-supabase').fakeSupabase> | null }))
vi.mock('./supabase/server', () => ({ createServiceSupabase: () => db.current }))

import { cronAuthorized, finishCron } from './cron'
import { countProblems } from './system-status'

beforeEach(() => {
  db.current = fakeSupabase()
  process.env.CRON_SECRET = 'geheim'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('cron', () => {
  it('enkel met het juiste geheim', () => {
    const req = (h?: string) => new Request('https://x/api/cron', { headers: h ? { authorization: h } : {} })
    expect(cronAuthorized(req('Bearer geheim'))).toBe(true)
    expect(cronAuthorized(req('Bearer fout'))).toBe(false)
    expect(cronAuthorized(req())).toBe(false)
    delete process.env.CRON_SECRET
    expect(cronAuthorized(req('Bearer '))).toBe(false)
  })

  it('gelukt: 200 en een rij in bot_actions', async () => {
    const res = await finishCron('style_profiles', { casper: 'taak J1' }, [])
    expect(res.status).toBe(200)
    expect(db.current!.tables.bot_actions[0]).toMatchObject({ bot: 'cron', tool: 'cron_style_profiles', ok: true })
  })

  it('mislukt: 500 met de reden, ook in bot_actions', async () => {
    const res = await finishCron('style_profiles', {}, ['Te weinig verzonden antwoorden gevonden (2).'])
    expect(res.status).toBe(500)
    expect(db.current!.tables.bot_actions[0]).toMatchObject({ ok: false, error: 'Te weinig verzonden antwoorden gevonden (2).' })
  })

  it('bolletje bij Instellingen: mislukte of te late cron, Grok-problemen en mislukte taken', () => {
    const ok = { key: 'a', label: 'a', lastRun: 'x', ok: true, error: null, late: false }
    expect(countProblems({ crons: [ok], grokFailures: [], failedJobs: 0 })).toBe(0)
    expect(countProblems({ crons: [{ ...ok, ok: false }, { ...ok, late: true }], grokFailures: [{ at: 'x', error: null }], failedJobs: 2 })).toBe(4)
  })
})
