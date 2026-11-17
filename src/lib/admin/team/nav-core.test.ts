import { describe, expect, it } from 'vitest'
import { arrangeNav, cleanNavPrefs, hiddenPages, SALES_PAGES, showsSales } from './nav-core'

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
    expect(cleanNavPrefs({ order: ['/admin/klanten', 'https://evil', '/admin/klanten', 3], pinned: 'x' })).toEqual({ order: ['/admin/klanten'], pinned: [], hidden: null })
  })
})

describe("pagina's in het menu", () => {
  it('standaard: Casper ziet sales, de anderen niet', () => {
    expect(hiddenPages({ hidden: null }, true)).toEqual([])
    expect(hiddenPages({ hidden: null }, false)).toEqual(SALES_PAGES)
    expect(SALES_PAGES).toEqual(['/admin/sales/cold-mails', '/admin/sales/inbox', '/admin/sales/calls', '/admin/sales'])
    expect(showsSales({ hidden: null }, false)).toBe(false)
  })
  it("eigen keuze gaat voor: iemand kan sales aanzetten, Casper kan pagina's verbergen", () => {
    expect(showsSales({ hidden: [] }, false)).toBe(true)
    expect(showsSales({ hidden: ['/admin/sales/cold-mails', '/admin/sales/calls'] }, false)).toBe(true)
    expect(showsSales({ hidden: SALES_PAGES }, true)).toBe(false)
  })
  it("verborgen: enkel gekende menupagina's; leeg blijft een keuze (alles tonen)", () => {
    expect(cleanNavPrefs({ hidden: ['/admin/sales', '/admin/instellingen', '/admin/bestaat-niet'] }).hidden).toEqual(['/admin/sales'])
    expect(cleanNavPrefs({ hidden: [] }).hidden).toEqual([])
    expect(cleanNavPrefs({}).hidden).toBeNull()
  })
})
