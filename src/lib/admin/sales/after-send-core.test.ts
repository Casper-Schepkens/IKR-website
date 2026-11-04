import { describe, expect, it } from 'vitest'
import { planAfterSend, type LeadFields } from './after-send-core'

const lead = (x: Partial<LeadFields> = {}): LeadFields => ({ next_action: null, follow_up_on: null, stage: 'lead', phone: null, company: null, ...x })
const p = (waarde: string, reden = 'staat in de mail') => ({ waarde, reden })

describe('planAfterSend', () => {
  it('zet volgende actie en opvolgdatum als de velden sinds het versturen niet veranderden', () => {
    const snap = lead()
    const plan = planAfterSend(snap, snap, { volgende_actie: p('Jan bellen'), opvolgen_op: p('2026-11-10') }, '2026-11-04')
    expect(plan.map((c) => [c.column, c.to, c.status])).toEqual([
      ['next_action', 'Jan bellen', 'toepassen'],
      ['follow_up_on', '2026-11-10', 'toepassen'],
    ])
  })

  it('leeg resultaat = niets veranderen', () => {
    expect(planAfterSend(lead(), lead(), {}, '2026-11-04')).toEqual([])
    expect(planAfterSend(lead(), lead(), { volgende_actie: null, opvolgen_op: null, fase: null, telefoon: null, bedrijf: null }, '2026-11-04')).toEqual([])
  })

  it('overschrijft nooit een veld dat Casper na het versturen aanpaste', () => {
    const snap = lead({ next_action: 'Oud' })
    const now = lead({ next_action: 'Door Casper aangepast' })
    const [c] = planAfterSend(snap, now, { volgende_actie: p('Jan bellen') }, '2026-11-04')
    expect(c).toMatchObject({ status: 'overgeslagen', from: 'Door Casper aangepast' })
  })

  it('weigert ongeldige of gevaarlijke voorstellen', () => {
    const snap = lead({ stage: 'sales_planned', phone: '0470 12 34 56' })
    const plan = planAfterSend(
      snap,
      snap,
      {
        opvolgen_op: p('2026-11-01'), // vóór de verzenddag
        fase: p('setter_planned'), // achteruit
        telefoon: p('bel me'), // geen nummer
        volgende_actie: p('   '), // leegmaken mag niet
        bedrijf: p(''),
      },
      '2026-11-04',
    )
    expect(plan).toEqual([])
    expect(planAfterSend(snap, snap, { fase: p('won') }, '2026-11-04')).toEqual([])
    expect(planAfterSend(snap, snap, { opvolgen_op: p('volgende dinsdag') }, '2026-11-04')).toEqual([])
  })

  it('fase enkel vooruit; ongewijzigde waarde wordt niet voorgesteld', () => {
    const snap = lead({ stage: 'setter_done', company: 'Bakkerij X' })
    const plan = planAfterSend(snap, snap, { fase: p('sales_planned'), bedrijf: p('Bakkerij X') }, '2026-11-04')
    expect(plan.map((c) => [c.column, c.to])).toEqual([['stage', 'sales_planned']])
  })
})
