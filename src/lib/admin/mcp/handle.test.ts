import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./server', () => ({ botSession: vi.fn(), buildMcpServer: vi.fn(() => { throw new Error('mag niet gebouwd worden') }) }))

import { checkKey, handleMcp } from './handle'

const KEY = 'a'.repeat(64)
const req = (headers: Record<string, string> = {}, method = 'POST') => new Request('https://iknowright.be/api/mcp', { method, headers, body: method === 'GET' ? undefined : '{}' })

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.GROKBOT_API_KEY = KEY
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  delete process.env.GROKBOT_API_KEY_NEXT
  delete process.env.GROKBOT_ALLOW_URL_KEY
})

describe('toegang tot de MCP-server', () => {
  it('juiste sleutel in Authorization, x-api-key of de URL', () => {
    expect(checkKey(req({ authorization: `Bearer ${KEY}` }))).toEqual({ ok: true })
    expect(checkKey(req({ 'x-api-key': KEY }))).toEqual({ ok: true })
    expect(checkKey(req(), KEY)).toEqual({ ok: true })
  })
  it('foute, lege of geen sleutel: geweigerd', () => {
    expect(checkKey(req({ authorization: 'Bearer fout' }))).toMatchObject({ ok: false, status: 401 })
    expect(checkKey(req({ authorization: 'Bearer ' }))).toMatchObject({ ok: false, status: 401 })
    expect(checkKey(req())).toMatchObject({ ok: false, status: 401, reason: 'geen sleutel' })
  })
  it('sleutel wisselen: oude en nieuwe werken allebei', () => {
    process.env.GROKBOT_API_KEY_NEXT = 'b'.repeat(64)
    expect(checkKey(req({ authorization: `Bearer ${KEY}` }))).toEqual({ ok: true })
    expect(checkKey(req({ authorization: `Bearer ${'b'.repeat(64)}` }))).toEqual({ ok: true })
  })
  it('sleutel in de URL uit te zetten', () => {
    process.env.GROKBOT_ALLOW_URL_KEY = 'false'
    expect(checkKey(req(), KEY)).toMatchObject({ ok: false, reason: 'sleutel in de URL staat uit' })
    expect(checkKey(req({ authorization: `Bearer ${KEY}` }))).toEqual({ ok: true })
  })
  it('zonder sleutel in Vercel: 503, GET: 405, fout: 401 zonder de server op te bouwen', async () => {
    expect((await handleMcp(req({}, 'GET'))).status).toBe(405)
    expect((await handleMcp(req({ authorization: 'Bearer fout' }))).status).toBe(401)
    delete process.env.GROKBOT_API_KEY
    expect((await handleMcp(req({ authorization: `Bearer ${KEY}` }))).status).toBe(503)
  })
})
