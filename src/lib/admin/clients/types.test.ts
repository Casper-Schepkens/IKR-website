import { describe, expect, it } from 'vitest'
import { cleanClientInput, contractTone, daysLeft, sortClients, type Client } from './types'

describe('klanten', () => {
  it('dagen en kleur: rood < 30 (of verlopen), oranje < 60, groen daarna', () => {
    expect(daysLeft({ contract_end: '2026-12-05' }, '2026-11-05')).toBe(30)
    expect(daysLeft({ contract_end: null }, '2026-11-05')).toBeNull()
    expect([-3, 0, 29, 30, 59, 60].map(contractTone)).toEqual(['red', 'red', 'red', 'orange', 'orange', 'green'])
    expect(contractTone(null)).toBe('none')
  })
  it('eerst aflopend bovenaan, zonder einddatum onderaan', () => {
    const c = (name: string, contract_end: string | null) => ({ name, contract_end }) as Client
    expect(sortClients([c('B', null), c('A', '2027-01-01'), c('C', '2026-12-01')]).map((x) => x.name)).toEqual(['C', 'A', 'B'])
  })
  it('valideert de invoer', () => {
    expect(cleanClientInput({ name: ' Tempus ', freelancer: ' ', contract_end: '' })).toEqual({ name: 'Tempus', freelancer: null, contract_end: null })
    expect(() => cleanClientInput({ name: '' })).toThrow(/naam/)
    expect(() => cleanClientInput({ name: 'X', contract_end: '5/11/2026' })).toThrow(/JJJJ-MM-DD/)
  })
})
