import { describe, expect, it } from 'vitest'
import { responseCost, sum, transcriptionCost } from './pricing'

describe('kost van een antwoord', () => {
  it('rekent gecachete tokens apart (goedkoop) en trekt ze af van de gewone invoer', () => {
    const c = responseCost('gpt-realtime', {
      input_token_details: { text_tokens: 17_000, audio_tokens: 200, cached_tokens: 16_000, cached_tokens_details: { text_tokens: 16_000, audio_tokens: 0 } },
      output_token_details: { text_tokens: 50, audio_tokens: 400 },
    })
    expect(c.text_in).toBe(1_000)
    expect(c.text_in_cached).toBe(16_000)
    expect(c.cost.tekst_in).toBeCloseTo(0.004) // 1.000 × $4/1M
    expect(c.cost.cache).toBeCloseTo(0.0064) // 16.000 × $0,40/1M
    expect(c.cost.spraak_in).toBeCloseTo(0.0064) // 200 × $32/1M
    expect(c.cost.spraak_uit).toBeCloseTo(0.0256) // 400 × $64/1M
    expect(c.cost.tekst_uit).toBeCloseTo(0.0008)
    expect(c.cost_usd).toBeCloseTo(sum(c.cost))
  })

  it('mini is goedkoper dan het beste model', () => {
    const usage = { input_token_details: { audio_tokens: 1000 }, output_token_details: { audio_tokens: 1000 } }
    expect(responseCost('gpt-realtime-mini', usage).cost_usd).toBeLessThan(responseCost('gpt-realtime', usage).cost_usd)
  })

  it('kan tegen een leeg of raar usage-object', () => {
    expect(responseCost('gpt-realtime', {}).cost_usd).toBe(0)
    expect(responseCost('gpt-realtime', { input_token_details: { text_tokens: -5 } }).cost_usd).toBe(0)
  })
})

describe('kost van het uittypen', () => {
  it('per seconde of per token', () => {
    expect(transcriptionCost({ type: 'duration', seconds: 60 }).cost_usd).toBeCloseTo(0.003)
    expect(transcriptionCost({ type: 'tokens', input_tokens: 1_000_000, output_tokens: 0 }).cost_usd).toBeCloseTo(3)
    expect(transcriptionCost(null).cost_usd).toBe(0)
  })
})
