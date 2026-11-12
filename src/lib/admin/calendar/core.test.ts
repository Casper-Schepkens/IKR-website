import { describe, expect, it } from 'vitest'
import { byDay, classify, dayIn, monthGrid, shiftMonth, timeIn, type CalItem } from './core'

describe('kalender', () => {
  it('deelt items in op titel', () => {
    expect(classify('IKR weekly (online)')).toBe('weekly')
    expect(classify('IKR × Bakkerij Peeters · sales call')).toBe('sales')
    expect(classify('IKR × Jan · setter call')).toBe('setter')
    expect(classify('Draaidag Tempus (09:30)')).toBe('draaidag')
    expect(classify('Boekhouder')).toBe('overig')
  })
  it('maandrooster van maandag tot zondag', () => {
    const g = monthGrid('2026-11')
    expect(g.days[0]).toBe('2026-10-26')
    expect(g.days.at(-1)).toBe('2026-12-06')
    expect(g.days.length % 7).toBe(0)
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('Belgische tijd en items per dag (hele dag eerst, meerdaagse op elke dag)', () => {
    expect(dayIn('2026-11-12T23:30:00Z')).toBe('2026-11-13')
    expect(timeIn('2026-11-12T09:00:00Z')).toBe('10:00')
    const it = (o: Partial<CalItem>): CalItem => ({ id: 'x', title: '', kind: 'overig', allDay: false, day: '2026-11-12', lastDay: '2026-11-12', start: null, end: null, meetUrl: null, href: null, ...o })
    const m = byDay([it({ id: 'a', start: '2026-11-12T13:00:00Z' }), it({ id: 'b', allDay: true }), it({ id: 'c', start: '2026-11-12T08:00:00Z' }), it({ id: 'd', allDay: true, day: '2026-11-12', lastDay: '2026-11-13' })], ['2026-11-12', '2026-11-13'])
    expect(m.get('2026-11-12')!.map((x) => x.id)).toEqual(['b', 'd', 'c', 'a'])
    expect(m.get('2026-11-13')!.map((x) => x.id)).toEqual(['d'])
  })
})
