import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const after = vi.hoisted(() => vi.fn())
vi.mock('next/server', () => ({ after }))
vi.mock('@/lib/admin/calls/transcripts', () => ({ handleFirefliesEvent: vi.fn() }))
vi.mock('@/lib/admin/supabase/server', () => ({ createServiceSupabase: vi.fn() }))

import { POST } from './route'

const sign = (body: string, secret = 'geheim') => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
const post = (body: string, sig?: string) => POST(new Request('https://x/api/fireflies/webhook', { method: 'POST', body, headers: sig ? { 'x-hub-signature': sig } : {} }))

beforeEach(() => {
  process.env.FIREFLIES_WEBHOOK_SECRET = 'geheim'
  vi.spyOn(console, 'log').mockImplementation(() => {})
  after.mockReset()
})

describe('Fireflies-webhook', () => {
  it('zonder geheim in Vercel: 503', async () => {
    delete process.env.FIREFLIES_WEBHOOK_SECRET
    expect((await post('{}', sign('{}'))).status).toBe(503)
  })
  it('zonder of met verkeerde handtekening: 401, niets verwerkt', async () => {
    const body = JSON.stringify({ meeting_id: 'M1', event: 'meeting.transcribed' })
    expect((await post(body)).status).toBe(401)
    expect((await post(body, sign(body, 'ander'))).status).toBe(401)
    expect(after).not.toHaveBeenCalled()
  })
  it('juiste handtekening: verwerken na het antwoord', async () => {
    const body = JSON.stringify({ meeting_id: 'M1', event: 'meeting.transcribed' })
    const res = await post(body, sign(body))
    expect(res.status).toBe(200)
    expect(after).toHaveBeenCalledTimes(1)
  })
  it('een testevent: 200, niets verwerkt', async () => {
    const body = JSON.stringify({ event: 'test' })
    expect((await post(body, sign(body))).status).toBe(200)
    expect(after).not.toHaveBeenCalled()
  })
})
