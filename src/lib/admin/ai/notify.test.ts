import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { notifyGrok, webhookHeaders } from './notify'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.GROK_WEBHOOK_URL = 'https://grok.example/hook'
  process.env.GROK_WEBHOOK_SECRET = 'geheim-token'
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const res = (status: number) => new Response(status === 202 ? '' : 'x', { status })

describe('webhook naar Grokbot', () => {
  it('stuurt altijd Authorization: Bearer <secret>', async () => {
    fetchMock.mockResolvedValueOnce(res(202))
    expect(await notifyGrok(['j1'], [])).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://grok.example/hook')
    expect(init.headers.authorization).toBe('Bearer geheim-token')
    expect(JSON.parse(init.body)).toMatchObject({ event: 'ai_jobs_pending', job_ids: ['j1'] })
  })

  it('voegt enkel bij een whsec_-secret een geldige Standard Webhooks-handtekening toe', () => {
    expect(webhookHeaders('geheim-token', '{}')['webhook-signature']).toBeUndefined()
    const secret = `whsec_${Buffer.from('sleutel').toString('base64')}`
    const h = webhookHeaders(secret, '{"a":1}', 1_700_000_000_000)
    const expected = createHmac('sha256', Buffer.from('sleutel')).update(`${h['webhook-id']}.1700000000.{"a":1}`).digest('base64')
    expect(h['webhook-signature']).toBe(`v1,${expected}`)
    expect(h.authorization).toBe(`Bearer ${secret}`)
  })

  it('probeert opnieuw bij 503 en netwerkfouten', async () => {
    fetchMock.mockResolvedValueOnce(res(503)).mockRejectedValueOnce(new Error('reset')).mockResolvedValueOnce(res(202))
    expect(await notifyGrok(['j1'], [0, 0])).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('stopt na alle pogingen', async () => {
    fetchMock.mockResolvedValue(res(500))
    expect(await notifyGrok(['j1'], [0, 0])).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('probeert niet opnieuw bij 401 (verkeerde sleutel)', async () => {
    fetchMock.mockResolvedValueOnce(res(401))
    expect(await notifyGrok(['j1'], [0, 0])).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('doet niets zonder taken of zonder instellingen', async () => {
    expect(await notifyGrok([], [])).toBe(false)
    delete process.env.GROK_WEBHOOK_URL
    expect(await notifyGrok(['j1'], [])).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
