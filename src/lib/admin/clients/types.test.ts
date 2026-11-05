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
    expect(cleanClientInput({ name: ' Tempus ', freelancer: ' ', contract_end: '' })).toEqual({ name: 'Tempus', freelancer: null, contract_end: null, contract_indefinite: false })
    expect(() => cleanClientInput({ name: '' })).toThrow(/naam/)
    expect(() => cleanClientInput({ name: 'X', contract_end: '5/11/2026' })).toThrow(/JJJJ-MM-DD/)
  })
})

describe('onbepaalde duur', () => {
  it('nooit (bijna) verlopen: dagen = null, kleur none', () => {
    expect(daysLeft({ contract_end: null, contract_indefinite: true }, '2026-11-05')).toBeNull()
    expect(contractTone(daysLeft({ contract_end: null, contract_indefinite: true }, '2026-11-05'))).toBe('none')
  })
  it('volgorde: datum (eerst aflopend), dan onbepaald, dan leeg', () => {
    const c = (name: string, contract_end: string | null, contract_indefinite = false) => ({ name, contract_end, contract_indefinite }) as Client
    expect(sortClients([c('Leeg', null), c('Tempus', null, true), c('Later', '2027-06-01'), c('Eerst', '2026-11-30')]).map((x) => x.name)).toEqual([
      'Eerst',
      'Later',
      'Tempus',
      'Leeg',
    ])
  })
  it('invoer: "onbepaald" of indefinite: true wist de datum; een datum zet onbepaald uit; niet allebei', () => {
    expect(cleanClientInput({ name: 'Tempus', contract_end: 'onbepaald' })).toMatchObject({ contract_end: null, contract_indefinite: true })
    expect(cleanClientInput({ name: 'Tempus', contract_end: null, indefinite: true })).toMatchObject({ contract_end: null, contract_indefinite: true })
    expect(cleanClientInput({ name: 'X', contract_end: '2027-01-31' })).toMatchObject({ contract_end: '2027-01-31', contract_indefinite: false })
    expect(() => cleanClientInput({ name: 'X', contract_end: '2027-01-31', indefinite: true })).toThrow(/niet allebei/)
  })
})
