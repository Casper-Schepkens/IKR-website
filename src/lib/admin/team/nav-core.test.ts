import { describe, expect, it } from 'vitest'
import { arrangeNav, cleanNavPrefs } from './nav-core'

const items = ['/admin/werkplek', '/admin/klanten', '/admin/financien', '/admin/weekly'].map((href) => ({ href }))

describe('zijbalk volgorde', () => {
  it('standaard: alles in de standaardvolgorde', () => {
    expect(arrangeNav(items, { order: [], pinned: [] })).toEqual({ pinned: [], rest: items })
  })
  it('vastgepind eerst, dan eigen volgorde, nieuwe items achteraan', () => {
    const r = arrangeNav(items, { order: ['/admin/weekly', '/admin/klanten', '/admin/bestaat-niet'], pinned: ['/admin/financien'] })
    expect(r.pinned.map((i) => i.href)).toEqual(['/admin/financien'])
    expect(r.rest.map((i) => i.href)).toEqual(['/admin/weekly', '/admin/klanten', '/admin/werkplek'])
  })
  it('enkel geldige paden bewaren', () => {
    expect(cleanNavPrefs({ order: ['/admin/klanten', 'https://evil', '/admin/klanten', 3], pinned: 'x' })).toEqual({ order: ['/admin/klanten'], pinned: [] })
  })
})
