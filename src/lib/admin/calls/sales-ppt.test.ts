import { describe, expect, it } from 'vitest'
import { cleanPptUrl, nextBotContext, SALES_PPT_URL, salesPptUrl, thankYouMail } from './types'

describe('sales-ppt per call', () => {
  it('valt terug op de standaardlink', () => {
    expect(salesPptUrl({ sales_ppt_url: null })).toBe(SALES_PPT_URL)
    expect(salesPptUrl({})).toBe(SALES_PPT_URL)
    expect(salesPptUrl({ sales_ppt_url: 'https://docs.google.com/x' })).toBe('https://docs.google.com/x')
  })
  it('bedankmail gebruikt de ppt van de call (standaard als er geen is)', () => {
    expect(thankYouMail('Jan', 'vandaag').body).toContain(SALES_PPT_URL)
    expect(thankYouMail('Jan', 'vandaag', 'https://docs.google.com/eigen').body).toContain('https://docs.google.com/eigen')
  })
  it('enkel https; leeg = standaard', () => {
    expect(cleanPptUrl('  ')).toBeNull()
    expect(cleanPptUrl(' https://docs.google.com/p ')).toBe('https://docs.google.com/p')
    expect(() => cleanPptUrl('http://x')).toThrow(/https/)
    expect(() => cleanPptUrl('javascript:alert(1)')).toThrow(/https/)
  })
})

describe('context van Grok Bot', () => {
  it('vervangen of toevoegen; leeg = leeg', () => {
    expect(nextBotContext('oud', ' nieuw ', 'vervangen')).toBe('nieuw')
    expect(nextBotContext('oud', 'erbij', 'toevoegen')).toBe('oud\n\nerbij')
    expect(nextBotContext(null, 'eerste', 'toevoegen')).toBe('eerste')
    expect(nextBotContext('oud', '  ', 'vervangen')).toBeNull()
    expect(() => nextBotContext(null, 'x'.repeat(20001), 'vervangen')).toThrow(/te lang/)
  })
})
