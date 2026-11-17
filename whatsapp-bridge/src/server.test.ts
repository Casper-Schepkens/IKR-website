import { afterAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import { isAuthorized, startServer, type BridgeStatus } from './server.js'

const SECRET = 'een-lang-geheim-van-32-tekens!!'
const status: BridgeStatus = { connection: 'connecting', qr: '2@abc,def,ghi', me: null, since: '2026-11-17T00:00:00Z' }
const server = startServer(0, () => status, SECRET)
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`
afterAll(() => void server.close())

describe('http', () => {
  it('/health zonder secret, zonder gegevens', async () => {
    await new Promise((r) => server.once('listening', r).listening && r(null))
    const res = await fetch(`${base()}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, verbinding: 'connecting', gekoppeld: false })
  })
  it('/qr enkel met het secret (header of ?secret=)', async () => {
    expect((await fetch(`${base()}/qr`)).status).toBe(401)
    expect((await fetch(`${base()}/qr?secret=fout`)).status).toBe(401)
    const ok = await fetch(`${base()}/qr`, { headers: { Authorization: `Bearer ${SECRET}` } })
    expect(ok.status).toBe(200)
    expect(await ok.text()).toContain('data:image/png;base64,')
    expect((await fetch(`${base()}/qr?secret=${encodeURIComponent(SECRET)}`)).status).toBe(200)
    expect((await fetch(`${base()}/qr`, { method: 'POST', headers: { 'x-qr-secret': SECRET } })).status).toBe(405)
  })
  it('zonder (of met te kort) secret is /qr uit', () => {
    const req = { headers: {}, url: '/qr?secret=kort' }
    expect(isAuthorized(req, undefined)).toBe(false)
    expect(isAuthorized(req, 'kort')).toBe(false)
  })
})
