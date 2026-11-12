import { describe, expect, it } from 'vitest'
import { cleanSopInput, searchSops, type Sop } from './types'

const sop = (o: Partial<Sop> & { title: string }): Sop => ({
  id: o.title,
  body: '',
  category: 'overig',
  status: 'afgesproken',
  source: null,
  source_url: null,
  quote: null,
  created_by: null,
  created_via: 'dashboard',
  created_at: '2026-11-12T10:00:00Z',
  updated_at: '2026-11-12T10:00:00Z',
  ...o,
})
const all = [
  sop({ title: 'Briefing 2 dagen voor de draaidag', body: 'Naar iedereen die meedraait.', category: 'draaidagen' }),
  sop({ title: 'Feedbackrondes', body: 'Max. 1 revisieronde inbegrepen, extra €50.', category: 'creatief' }),
  sop({ title: 'Geen fysieke meetings', body: 'Tenzij vooraf afgesproken.', category: 'klanten' }),
  sop({ title: 'Oude regel', body: 'revisie', category: 'creatief', status: 'verouderd' }),
  sop({ title: 'Voorstel', body: 'revisie', status: 'voorstel' }),
]

describe('SOP zoeken', () => {
  it('alle woorden, zonder hoofdletters of accenten, standaard enkel afgesproken', () => {
    expect(searchSops(all, 'REVISIE').map((s) => s.title)).toEqual(['Feedbackrondes'])
    expect(searchSops(all, 'draaidag briefing').map((s) => s.title)).toEqual(['Briefing 2 dagen voor de draaidag'])
    expect(searchSops(all, 'revisie', { status: 'alle' })).toHaveLength(3)
  })
  it('filter op categorie; titelmatch eerst', () => {
    expect(searchSops(all, '', { category: 'klanten' }).map((s) => s.title)).toEqual(['Geen fysieke meetings'])
    const r = searchSops([sop({ title: 'X', body: 'draaidag' }), sop({ title: 'Draaidag plannen', category: 'overig' })], 'draaidag')
    expect(r[0].title).toBe('Draaidag plannen')
  })
})

describe('SOP invoer', () => {
  it('controleert titel, categorie, status en link', () => {
    expect(cleanSopInput({ title: ' Test ', body: ' x ', category: '' })).toEqual({ title: 'Test', body: 'x', category: 'overig' })
    expect(() => cleanSopInput({ title: '' })).toThrow(/titel/)
    expect(() => cleanSopInput({ title: 'a', category: 'onzin' })).toThrow(/categorie/)
    expect(() => cleanSopInput({ title: 'a', status: 'klaar' })).toThrow(/Status/)
    expect(() => cleanSopInput({ title: 'a', source_url: 'javascript:alert(1)' })).toThrow(/https/)
  })
})
