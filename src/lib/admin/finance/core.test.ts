import { describe, expect, it } from 'vitest'
import { classify, monthlySeries, monthsIn, overview, paymentChecks, periodKeyFor, periodOf, shiftPeriod, type ClientLite, type Tx } from './core'

const client = (o: Partial<ClientLite> & { id: string; name: string }): ClientLite => ({
  bank_name: null,
  contract_start: null,
  contract_end: null,
  contract_indefinite: false,
  monthly_fee: null,
  freelancer_cost: null,
  boosting_budget: null,
  ...o,
})
const tx = (o: Partial<Tx> & { odoo_id: number; date: string; amount: number }): Tx => ({ counterparty: '', description: '', category: 'onbekend', client_id: null, manual: false, ...o })

const ohma = client({ id: 'c1', name: 'Oh!Ma', bank_name: 'V.S.A. Foods', monthly_fee: 1150, boosting_budget: 150, freelancer_cost: 400, contract_start: '2026-09-01', contract_end: '2027-02-28' })
const tempus = client({ id: 'c2', name: 'Tempus Thuisverpleging', contract_indefinite: true, boosting_budget: 70 })

describe('classify', () => {
  it('herkent een klant via de banknaam', () => {
    expect(classify({ amount: 1391.5, counterparty: 'V.S.A. Foods Bv', description: 'factuur 12' }, [], [ohma, tempus])).toMatchObject({ category: 'klant', client_id: 'c1' })
    expect(classify({ amount: 1452, counterparty: 'Tempus Thuisverpleging Bv', description: '' }, [], [ohma, tempus])).toMatchObject({ category: 'klant', client_id: 'c2' })
  })
  it('regels gelden enkel in hun richting', () => {
    // "casper" als tegenpartij: inkomst = inbreng vennoot, uitgave = onkosten vennoten
    expect(classify({ amount: 500, counterparty: 'Casper Schepkens', description: '' }, [], []).category).toBe('vennoot_in')
    expect(classify({ amount: -80, counterparty: 'Casper Schepkens', description: '' }, [], []).category).toBe('vennoten')
  })
  it('een naam in de omschrijving van een kaartbetaling is geen vennoot', () => {
    expect(classify({ amount: -12, counterparty: '', description: 'Betaling Bancontact Delhaize kaart casper schepkens' }, [], []).category).toBe('onkosten')
  })
  it('eigen regels gaan voor standaardregels', () => {
    expect(classify({ amount: -30, counterparty: 'Delhaize', description: '' }, [{ id: 'r1', pattern: 'delhaize', category: 'materiaal', priority: 10 }], []).category).toBe('materiaal')
  })
  it('zonder regel: uitgave = onbekend, inkomst = overig_in', () => {
    expect(classify({ amount: -99, counterparty: 'Zomaar Iets', description: '' }, [], []).category).toBe('onbekend')
    expect(classify({ amount: 99, counterparty: 'Zomaar Iets', description: '' }, [], []).category).toBe('overig_in')
  })
  it('btw-betalingen gaan naar btw', () => {
    expect(classify({ amount: -2100, counterparty: 'FOD Financien', description: 'VAT revenue Q3' }, [], []).category).toBe('btw')
  })
})

describe('periodes', () => {
  it('maand, kwartaal en jaar', () => {
    expect(periodOf('maand', '2026-02')).toMatchObject({ from: '2026-02-01', to: '2026-02-28', label: 'februari 2026' })
    expect(periodOf('kwartaal', '2026-Q4')).toMatchObject({ from: '2026-10-01', to: '2026-12-31', label: 'Q4 2026' })
    expect(periodOf('jaar', '2026')).toMatchObject({ from: '2026-01-01', to: '2026-12-31' })
    expect(periodKeyFor('kwartaal', '2026-11-08')).toBe('2026-Q4')
    expect(shiftPeriod(periodOf('maand', '2026-01'), -1).key).toBe('2025-12')
    expect(shiftPeriod(periodOf('kwartaal', '2026-Q1'), -1).key).toBe('2025-Q4')
    expect(monthsIn(periodOf('kwartaal', '2026-Q3'))).toEqual(['2026-07', '2026-08', '2026-09'])
  })
})

describe('overview', () => {
  const txs: Tx[] = [
    tx({ odoo_id: 1, date: '2026-09-23', amount: 1391.5, counterparty: 'V.S.A. Foods Bv', category: 'klant', client_id: 'c1' }),
    tx({ odoo_id: 2, date: '2026-09-25', amount: -400, counterparty: 'Celia', category: 'freelancer' }),
    tx({ odoo_id: 3, date: '2026-09-26', amount: -150, counterparty: 'TikTok Ads', category: 'boosting' }),
    tx({ odoo_id: 4, date: '2026-09-27', amount: -50, counterparty: 'Canva', category: 'tools' }),
    tx({ odoo_id: 5, date: '2026-09-28', amount: -1000, counterparty: 'FOD Financien', category: 'btw' }),
    tx({ odoo_id: 6, date: '2026-09-29', amount: -20, counterparty: 'Raar', category: 'onbekend' }),
    tx({ odoo_id: 7, date: '2026-09-30', amount: 2000, counterparty: 'Milan Meert', category: 'vennoot_in' }),
    tx({ odoo_id: 8, date: '2026-10-02', amount: -999, counterparty: 'Celia', category: 'freelancer' }),
  ]
  const o = overview(txs, [ohma, tempus], periodOf('maand', '2026-09'))
  it('omzet excl. btw, btw apart, inbreng telt niet als winst', () => {
    expect(o.omzet_excl_btw).toBe(1150)
    expect(o.btw).toEqual({ op_omzet: 241.5, betaald: 1000, saldo: -758.5 })
    expect(o.freelancers).toBe(400)
    expect(o.boosting).toBe(150)
    expect(o.na_freelancer_boosting).toBe(600)
    expect(o.overige_kosten).toBe(70)
    expect(o.over).toBe(530)
    expect(o.vennoten_inbreng).toBe(2000)
    expect(o.nog_in_te_delen).toEqual({ aantal: 1, total: 20 })
  })
  it('per klant: ontvangen tegenover contract', () => {
    const row = o.per_klant.find((r) => r.client_id === 'c1')!
    expect(row).toMatchObject({ ontvangen: 1391.5, ontvangen_excl_btw: 1150, contract_omzet: 1150, freelancer: 400, boosting: 150, over: 600, actieve_maanden: 1 })
    // Tempus: geen betaling deze maand, wel boosting volgens contract
    expect(o.per_klant.find((r) => r.client_id === 'c2')).toMatchObject({ ontvangen: 0, boosting: 70 })
  })
  it('koppelt betalingen zonder klant alsnog via de banknaam', () => {
    const late = overview([{ ...txs[0], client_id: null }], [ohma], periodOf('maand', '2026-09'))
    expect(late.per_klant).toHaveLength(1)
    expect(late.per_klant[0]).toMatchObject({ client_id: 'c1', naam: 'Oh!Ma', ontvangen: 1391.5 })
  })
    it('kwartaal telt contractmaanden binnen de looptijd', () => {
    const q = overview(txs, [ohma], periodOf('kwartaal', '2026-Q3'))
    expect(q.per_klant.find((r) => r.client_id === 'c1')).toMatchObject({ actieve_maanden: 1, contract_omzet: 1150 })
  })
  it('maandreeks voor de grafiek (zonder btw)', () => {
    expect(monthlySeries(txs, ['2026-09'])).toEqual([{ maand: '2026-09', omzet: 1150, kosten: 620, over: 530 }])
  })
})

describe('betalingscheck', () => {
  const lila = client({ id: 'l', name: 'Lilalou', monthly_fee: 1200, contract_start: '2026-08-01', contract_end: '2026-11-30' })
  const pay = (id: number, date: string, amount: number, client_id: string | null = 'l') => tx({ odoo_id: id, date, amount, counterparty: 'Lilalou Biscuits', category: 'klant', client_id })
  it('elke maand betaald, oktober nog binnen de termijn', () => {
    const [c] = paymentChecks([pay(1, '2026-08-27', 1452), pay(2, '2026-09-24', 1452)], [lila], '2026-11-08')
    expect(c.maanden.map((m) => [m.maand, m.status])).toEqual([
      ['2026-08', 'betaald'],
      ['2026-09', 'betaald'],
      ['2026-10', 'open'],
      ['2026-11', 'open'],
    ])
    expect(c).toMatchObject({ status: 'wacht', achterstallig: 0, afwijkend: [] })
  })
  it('achterstallig na 21 dagen na het einde van de maand', () => {
    const [c] = paymentChecks([pay(1, '2026-08-27', 1452)], [lila], '2026-11-08')
    expect(c.maanden[1]).toMatchObject({ maand: '2026-09', status: 'achterstallig', vervalt: '2026-10-21' })
    expect(c).toMatchObject({ status: 'achterstallig', achterstallig: 1452 })
  })
  it('een late dubbele betaling vult de oudste maand; afwijkend bedrag wordt gemeld', () => {
    const [c] = paymentChecks([pay(1, '2026-10-02', 2904), pay(2, '2026-10-30', 1000, null)], [lila], '2026-12-25')
    expect(c.maanden.map((m) => m.status)).toEqual(['betaald', 'betaald', 'achterstallig', 'achterstallig'])
    expect(c.maanden[2].ontvangen).toBe(1000)
    expect(c.afwijkend).toEqual([{ datum: '2026-10-30', bedrag: 1000 }])
    expect(c.achterstallig).toBe(452 + 1452)
  })
  it('geen check zonder maandbedrag of start, en niet na het contract', () => {
    expect(paymentChecks([], [client({ id: 'x', name: 'X' })], '2026-11-08')).toEqual([])
    const [c] = paymentChecks([], [lila], '2027-03-01')
    expect(c.maanden.at(-1)?.maand).toBe('2026-11')
  })
})
