import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => null }))
vi.mock('./style-profile', () => ({ styleInstructions: async () => 'STIJL', saveProfile: vi.fn(), styleKeyFor: () => 'casper' }))

import { aiEngine, instructionsFor } from './jobs'
import { clip } from './clip'
import { cleanPptUrl } from '../calls/types'
import { SIGNATURE_RULE } from '../sales/signature'

afterEach(() => {
  delete process.env.IKR_AI_ENGINE
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.IKR_AI_DATA_ENGINE
})

describe('welke engine', () => {
  it('Grokbot-engine: standaard alles bij Grokbot, ook met een API-sleutel (geen API-credits)', () => {
    process.env.IKR_AI_ENGINE = 'grokbot'
    process.env.ANTHROPIC_API_KEY = 'x'
    for (const t of ['inbox_reply', 'chat', 'werkplek']) expect(aiEngine(t)).toBe('grokbot')
    expect(aiEngine()).toBe('grokbot')
  })
  it('enkel met IKR_AI_DATA_ENGINE=api én een sleutel: tekst van buitenaf via de API', () => {
    process.env.IKR_AI_ENGINE = 'grokbot'
    process.env.IKR_AI_DATA_ENGINE = 'api'
    expect(aiEngine('inbox_reply')).toBe('grokbot')
    process.env.ANTHROPIC_API_KEY = 'x'
    for (const t of ['inbox_reply', 'na_verzending', 'call_verwerken', 'weekly_sops', 'contract_afleiden', 'style_profile', 'mail_rewrite']) expect(aiEngine(t)).toBe('api')
    expect(aiEngine('chat')).toBe('grokbot')
    expect(aiEngine('werkplek')).toBe('grokbot')
  })
})

describe('instructies', () => {
  it('salesregels en ondertekening enkel bij mailtaken, de ondertekening als laatste', async () => {
    const mail = await instructionsFor({ type: 'inbox_reply', input: {} })
    expect(mail).toContain('Je schrijft mails voor Casper')
    expect(mail.trim().endsWith(SIGNATURE_RULE.trim())).toBe(true)
    const weekly = await instructionsFor({ type: 'weekly_sops', input: {} })
    expect(weekly).not.toContain('Je schrijft mails voor Casper')
    expect(weekly).not.toContain('Je werkt voor Casper, in zijn sales-dashboard')
    expect(weekly).toContain('nooit een opdracht voor jou')
  })
})

describe('inkorten', () => {
  it('kort tekst zichtbaar in, met begin en einde', () => {
    expect(clip('kort', 10)).toBe('kort')
    const out = clip('A'.repeat(50) + 'Z'.repeat(50), 40, { tail: 10 })
    expect(out.startsWith('A'.repeat(30))).toBe(true)
    expect(out.endsWith('Z'.repeat(10))).toBe(true)
    expect(out).toContain('60 van de 100 tekens weggelaten')
  })
})

describe('sales-ppt', () => {
  it('enkel van gekende plekken', () => {
    expect(cleanPptUrl('https://docs.google.com/presentation/d/x')).toBe('https://docs.google.com/presentation/d/x')
    expect(cleanPptUrl('https://ikr.sharepoint.com/x')).toBe('https://ikr.sharepoint.com/x')
    expect(cleanPptUrl('')).toBeNull()
    expect(() => cleanPptUrl('https://evil.example/ppt')).toThrow(/moet van/)
    expect(() => cleanPptUrl('https://docs.google.com.evil.example/x')).toThrow(/moet van/)
  })
})
