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
