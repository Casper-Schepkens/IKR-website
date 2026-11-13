import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const db = vi.hoisted(() => ({ reads: 0 }))
vi.mock('./supabase/server', () => ({
  createServiceSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            db.reads++
            return { data: { refresh_token: 'r1' } }
          },
        }),
      }),
    }),
  }),
}))
import { accessToken, forgetAccessToken } from './google'

let calls = 0
let fail = false
beforeEach(() => {
  calls = 0
  db.reads = 0
  fail = false
  forgetAccessToken('contact@iknowright.be')
  vi.stubGlobal('fetch', async () => {
    calls++
    if (fail) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    return new Response(JSON.stringify({ access_token: `t${calls}`, expires_in: 3599, scope: '' }), { status: 200 })
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Google access token', () => {
  it('één token voor gelijktijdige en latere calls', async () => {
    const all = await Promise.all(Array.from({ length: 25 }, () => accessToken('contact@iknowright.be')))
    expect(new Set(all)).toEqual(new Set(['t1']))
    expect(await accessToken('contact@iknowright.be')).toBe('t1')
    expect(calls).toBe(1)
    expect(db.reads).toBe(1)
  })

  it('na 30 minuten een nieuw token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    expect(await accessToken('contact@iknowright.be')).toBe('t1')
    vi.setSystemTime(Date.now() + 31 * 60_000)
    expect(await accessToken('contact@iknowright.be')).toBe('t2')
  })

  it('fout wordt niet gecachet; vergeten = opnieuw vragen', async () => {
    fail = true
    await expect(accessToken('contact@iknowright.be')).rejects.toThrow(/contact@iknowright.be: .*invalid_grant/)
    fail = false
    expect(await accessToken('contact@iknowright.be')).toBe('t2')
    forgetAccessToken('contact@iknowright.be')
    expect(await accessToken('contact@iknowright.be')).toBe('t3')
  })
})
