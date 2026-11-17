import { describe, expect, it, vi } from 'vitest'
vi.mock('./google', () => ({ accessToken: vi.fn(), forgetAccessToken: vi.fn() }))
import { isAutoReply } from './gmail'

const headers = (h: Record<string, string>) => (n: string) => h[n] ?? ''

describe('isAutoReply', () => {
  it('herkent afwezigheidsmeldingen via headers en onderwerp', () => {
    expect(isAutoReply(headers({ 'Auto-Submitted': 'auto-replied', Subject: 'Re: TikTok' }))).toBe(true)
    expect(isAutoReply(headers({ 'X-Autoreply': 'yes', Subject: 'Re: TikTok' }))).toBe(true)
    expect(isAutoReply(headers({ Subject: 'Automatisch antwoord: Re: TikTok' }))).toBe(true)
    expect(isAutoReply(headers({ Subject: 'Out of Office: TikTok voor jullie zaak' }))).toBe(true)
    expect(isAutoReply(headers({ Subject: 'Afwezig tot 12 november' }))).toBe(true)
  })
  it('laat gewone antwoorden door', () => {
    expect(isAutoReply(headers({ 'Auto-Submitted': 'no', Subject: 'Re: TikTok' }))).toBe(false)
    expect(isAutoReply(headers({ Subject: 'Re: afwezigheid personeel en TikTok' }))).toBe(false)
  })
})

describe('headers van uitgaande mail', () => {
  it('weigert een regeleinde in een header (geen verborgen Bcc)', async () => {
    const { sendMail } = await import('./gmail')
    await expect(sendMail('casper@iknowright.be', { to: 'jan@x.be', subject: 'Hoi', body: 'x', inReplyTo: '<a@b>\r\nBcc: spion@x.be' })).rejects.toThrow(/regeleinde/)
  })
})

describe('Gmail te druk', () => {
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
  const busy = () => new Response(JSON.stringify({ error: { message: 'Too many concurrent requests for user' } }), { status: 429 })
  const thread = (id: string) => ({
    id,
    messages: [
      { id: `${id}a`, threadId: id, internalDate: '1700000000000', payload: { mimeType: 'text/plain', headers: [{ name: 'From', value: 'jan@klant.be' }, { name: 'Subject', value: 'Vraag' }], body: { data: Buffer.from('Hallo, wat kost dat?').toString('base64url') } } },
      { id: `${id}b`, threadId: id, internalDate: '1700000100000', payload: { mimeType: 'text/plain', headers: [{ name: 'From', value: 'Casper <casper@iknowright.be>' }, { name: 'Subject', value: 'Re: Vraag' }], body: { data: Buffer.from('Dag Jan, dat hangt af van het aantal video’s.').toString('base64url') } } },
    ],
  })

  it('wacht en probeert opnieuw tot Gmail antwoordt; één thread die blijft falen, wordt overgeslagen', async () => {
    vi.useFakeTimers()
    const { sentReplies } = await import('./gmail')
    let busyLeft = 2
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/threads?')) return ok({ threads: [{ id: 't1' }, { id: 't2' }, { id: 'kapot' }] })
      if (url.includes('/threads/kapot')) return busy()
      if (busyLeft > 0) {
        busyLeft--
        return busy()
      }
      return ok(thread(url.includes('t1') ? 't1' : 't2'))
    })
    vi.stubGlobal('fetch', fetchMock)
    const p = sentReplies('casper@iknowright.be', { days: 180, maxThreads: 10, maxReplies: 10, gapMs: 0 })
    await vi.runAllTimersAsync()
    const replies = await p
    expect(replies).toHaveLength(2)
    expect(replies[0].text).toMatch(/hangt af/)
    // kapot: 1 + 4 nieuwe pogingen, daarna overgeslagen
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/threads/kapot'))).toHaveLength(5)
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('faalt pas als geen enkele thread te lezen is, met de Gmail-melding', async () => {
    vi.useFakeTimers()
    const { sentReplies } = await import('./gmail')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/threads?') ? ok({ threads: [{ id: 'a' }] }) : busy())))
    const p = sentReplies('casper@iknowright.be', { days: 180, maxThreads: 10, maxReplies: 10, gapMs: 0 })
    const check = expect(p).rejects.toThrow(/te druk/)
    await vi.runAllTimersAsync()
    await check
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
})
