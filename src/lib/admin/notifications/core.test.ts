import { describe, expect, it } from 'vitest'
import { badge, countCallsToFinish, countExpiring, countFollowUps, countOverdueTodos, countSopProposals, countWorkspace, titleWithCount, total } from './core'

describe('meldingen: tellers', () => {
  it('werkplek: enkel eigen open kaarten die nieuw zijn of op Doe maar wachten', () => {
    const cards = [
      { owner_email: 'cedric@iknowright.be', status: 'open', unread: true, action_status: null },
      { owner_email: 'cedric@iknowright.be', status: 'open', unread: false, action_status: 'voorgesteld' },
      { owner_email: 'cedric@iknowright.be', status: 'open', unread: false, action_status: 'uitgevoerd' },
      { owner_email: 'cedric@iknowright.be', status: 'besproken', unread: true, action_status: null },
      { owner_email: 'milan@iknowright.be', status: 'open', unread: true, action_status: null },
    ] as const
    expect(countWorkspace([...cards], 'Cedric@iknowright.be')).toBe(2)
    expect(countWorkspace([...cards], 'casper@iknowright.be')).toBe(0)
  })
  it('SOP-voorstellen', () => {
    expect(countSopProposals([{ status: 'voorstel' }, { status: 'afgesproken' }, { status: 'voorstel' }])).toBe(2)
  })
  it('to-do’s te laat: enkel eigen, gewone, niet af, van een afgesloten weekly', () => {
    const weeklies = [{ id: 'W1', status: 'concluded' }, { id: 'W2', status: 'planned' }]
    const todos = [
      { owner: 'milan', kind: 'weekly', done_at: null, weekly_id: 'W1' },
      { owner: 'milan', kind: 'weekly', done_at: '2026-11-01', weekly_id: 'W1' },
      { owner: 'milan', kind: 'weekly', done_at: null, weekly_id: 'W2' },
      { owner: 'milan', kind: 'long', done_at: null, weekly_id: null },
      { owner: 'cedric', kind: 'weekly', done_at: null, weekly_id: 'W1' },
    ]
    expect(countOverdueTodos(todos, weeklies, 'milan')).toBe(1)
  })
  it('calls af te ronden, opvolgingen, aflopende contracten', () => {
    const now = Date.parse('2026-11-12T12:00:00Z')
    expect(countCallsToFinish([{ status: 'gepland', ends_at: '2026-11-12T10:00:00Z' }, { status: 'gepland', ends_at: '2026-11-12T15:00:00Z' }, { status: 'afgerond', ends_at: '2026-11-11T10:00:00Z' }], now)).toBe(1)
    expect(countFollowUps([{ stage: 'contacted', follow_up_on: '2026-11-12' }, { stage: 'contacted', follow_up_on: '2026-11-20' }, { stage: 'lost', follow_up_on: '2026-11-01' }], '2026-11-12')).toBe(1)
    expect(countExpiring([{ contract_end: '2026-11-30' }, { contract_end: '2027-06-01' }, { contract_end: null, contract_indefinite: true }], '2026-11-12')).toBe(1)
  })
  it('badge, totaal en tabtitel', () => {
    expect([badge(0), badge(3), badge(10)]).toEqual([null, '3', '9+'])
    expect(total({ werkplek: 3, sops: 2 })).toBe(5)
    expect(titleWithCount('Klanten | IKR', 5)).toBe('(5) Klanten | IKR')
    expect(titleWithCount('(5) Klanten | IKR', 2)).toBe('(2) Klanten | IKR')
    expect(titleWithCount('(5) Klanten | IKR', 0)).toBe('Klanten | IKR')
  })
})
