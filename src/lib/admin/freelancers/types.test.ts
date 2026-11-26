import { describe, expect, it } from 'vitest'
import { cleanFreelancerInput, cleanFreelancerPatch, cleanUrl, filterFreelancers, parseScore, sortFreelancers, type Freelancer } from './types'

describe('freelancers: invoer', () => {
  it('enkel de naam is verplicht; de rest is leeg (null), niet verzonnen', () => {
    expect(cleanFreelancerInput({ name: '  Voorbeeld Filmer ' })).toEqual({ name: 'Voorbeeld Filmer', email: null, phone: null, score: null, assignments: null, client_ids: [], portfolio_url: null, notes: null })
    expect(() => cleanFreelancerInput({ name: '  ' })).toThrow(/naam/)
    expect(() => cleanFreelancerInput({})).toThrow(/naam/)
  })

  it('patch: undefined blijft, leeg maakt leeg, naam leegmaken mag niet', () => {
    expect(cleanFreelancerPatch({ phone: '0470 12 34 56' })).toEqual({ phone: '0470 12 34 56' })
    expect(cleanFreelancerPatch({ email: '', notes: '   ', score: '' })).toEqual({ email: null, notes: null, score: null })
    expect(() => cleanFreelancerPatch({ name: '' })).toThrow(/naam/)
  })

  it('score = één van de vier fases (hoofdletters maken niet uit)', () => {
    expect(parseScore('Rood')).toBe('rood')
    expect(parseScore('ZEKERHEID')).toBe('zekerheid')
    expect(parseScore('')).toBeNull()
    expect(() => parseScore('8')).toThrow(/Score/)
    expect(() => parseScore('geel')).toThrow(/Score/)
  })

  it('e-mail wordt gecontroleerd en klein geschreven', () => {
    expect(cleanFreelancerPatch({ email: 'Naam@Voorbeeld.BE' })).toEqual({ email: 'naam@voorbeeld.be' })
    expect(() => cleanFreelancerPatch({ email: 'geen-mail' })).toThrow(/E-mail/)
  })

  it('link: enkel http(s), zonder schema wordt het https', () => {
    expect(cleanUrl('behance.net/voorbeeld')).toBe('https://behance.net/voorbeeld')
    expect(cleanUrl('http://voorbeeld.be/portfolio')).toBe('http://voorbeeld.be/portfolio')
    expect(cleanUrl('')).toBeNull()
    expect(() => cleanUrl('javascript:alert(1)')).toThrow(/http/)
    expect(() => cleanUrl('data:text/html,hoi')).toThrow(/http/)
    expect(() => cleanUrl('geen link')).toThrow(/webadres/)
  })

  it('klant-id’s: uniek en geldig', () => {
    const id = '0b6f3a5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
    expect(cleanFreelancerPatch({ client_ids: [id, id] })).toEqual({ client_ids: [id] })
    expect(() => cleanFreelancerPatch({ client_ids: ['tempus'] })).toThrow(/klant/)
  })
})

describe('freelancers: zoeken en filteren', () => {
  const f = (name: string, score: Freelancer['score']) => ({ name, score })
  const list = [f('Élise Voorbeeld', 'groen'), f('Bram Test', null), f('Studio Voorbeeld', 'zekerheid')]
  it('zoekt op naam zonder accenten en filtert op score of "geen"', () => {
    expect(filterFreelancers(list, 'elise').map((x) => x.name)).toEqual(['Élise Voorbeeld'])
    expect(filterFreelancers(list, 'voorbeeld', 'zekerheid').map((x) => x.name)).toEqual(['Studio Voorbeeld'])
    expect(filterFreelancers(list, '', 'geen').map((x) => x.name)).toEqual(['Bram Test'])
    expect(filterFreelancers(list, '').length).toBe(3)
  })
  it('sorteert alfabetisch', () => {
    const full = list.map((x, i) => ({ ...x, id: String(i) }) as Freelancer)
    expect(sortFreelancers(full).map((x) => x.name)).toEqual(['Bram Test', 'Élise Voorbeeld', 'Studio Voorbeeld'])
  })
})
