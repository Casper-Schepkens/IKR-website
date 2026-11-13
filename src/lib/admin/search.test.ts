import { describe, expect, it } from 'vitest'
import { fold, sameText, textMatches } from './search'

describe('zoeken', () => {
  it('koppeltekens (ook niet-afbrekend), accenten en hoofdletters tellen niet', () => {
    expect(textMatches('Charlier‑Brabo Group', 'Charlier-Brabo')).toBe(true)
    expect(textMatches('Charlier‑Brabo Group', 'charlier brabo')).toBe(true)
    expect(textMatches('Café Éléphant', 'cafe elephant')).toBe(true)
    expect(textMatches('Maison Slash', 'maisonslash')).toBe(true)
    expect(textMatches('Bakkerij Peeters', 'Slagerij')).toBe(false)
  })
  it('e-mailadressen blijven herkenbaar', () => {
    expect(fold('Jan@Peeters.be')).toBe('jan@peeters.be')
    expect(textMatches('jan@peeters.be', 'jan@peeters.be')).toBe(true)
  })
  it('exact gelijk na gelijkmaken', () => {
    expect(sameText('Charlier‑Brabo', 'charlier-brabo')).toBe(true)
    expect(sameText('', '')).toBe(false)
  })
})
