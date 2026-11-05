import { describe, expect, it } from 'vitest'
import { splitByWeek } from './board'
import type { Todo, Weekly } from './types'

const w = (id: string, status: Weekly['status'], starts_at: string) => ({ id, status, starts_at, mode: 'live', concluded_at: status === 'concluded' ? starts_at : null }) as Weekly
const t = (id: string, weekly_id: string | null) => ({ id, weekly_id, kind: 'weekly', owner: 'casper', notes: [], pushed_count: 0, done_at: null }) as unknown as Todo

describe('splitByWeek', () => {
  const weeklies = [w('oud', 'concluded', '2026-10-29T09:00:00Z'), w('nu', 'planned', '2026-11-05T09:00:00Z')]
  it('deze week = tegen de eerstvolgende weekly (+ niet af van vorige); volgende week = zonder weekly', () => {
    const r = splitByWeek([t('a', 'nu'), t('b', null), t('c', 'oud')], weeklies)
    expect(r.current?.id).toBe('nu')
    expect(r.thisWeek.map((x) => x.id)).toEqual(['a', 'c'])
    expect(r.nextWeek.map((x) => x.id)).toEqual(['b'])
  })
  it('zonder ingeplande weekly: één groep, geen lijn', () => {
    const r = splitByWeek([t('a', null), t('c', 'oud')], [weeklies[0]])
    expect(r.current).toBeNull()
    expect(r.thisWeek).toHaveLength(2)
    expect(r.nextWeek).toEqual([])
  })
})
