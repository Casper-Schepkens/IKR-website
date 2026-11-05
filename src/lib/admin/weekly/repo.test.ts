import { beforeEach, describe, expect, it } from 'vitest'
import { memoryWeekly } from './repo'

const g = globalThis as { __ikrWeekly?: unknown }
let repo: ReturnType<typeof memoryWeekly>
let id: string
beforeEach(async () => {
  g.__ikrWeekly = undefined
  repo = memoryWeekly()
  const w = await repo.createWeekly({ starts_at: '2026-11-05T08:30:00Z', mode: 'live', created_by: 'casper@iknowright.be' })
  await repo.createTodo({ owner: 'casper', title: 'Offerte', kind: 'weekly', weekly_id: w.id, created_by: 'casper@iknowright.be' }, null)
  id = (await repo.listTodos())[0].id
})
const get = async () => (await repo.listTodos()).find((t) => t.id === id)!

describe('doorschuiven', () => {
  it('een tweede klik telt niet dubbel', async () => {
    await repo.push(id)
    await repo.push(id)
    expect((await get()).pushed_count).toBe(1)
  })
  it('annuleren zet teller en weekly terug', async () => {
    const before = (await get()).weekly_id
    await repo.push(id)
    expect((await get()).weekly_id).toBeNull()
    await repo.unpush(id)
    expect(await get()).toMatchObject({ pushed_count: 0, weekly_id: before, pushed_at: null })
  })
  it('na het inplannen van de volgende weekly: niet meer annuleren, wel opnieuw doorschuiven (×2)', async () => {
    await repo.push(id)
    const next = await repo.createWeekly({ starts_at: '2026-11-12T08:30:00Z', mode: 'live', created_by: 'c' })
    await repo.assignPending(next.id)
    expect(await get()).toMatchObject({ weekly_id: next.id, pushed_at: null, pushed_count: 1 })
    await expect(repo.unpush(id)).rejects.toThrow(/niet meer teruggezet/)
    await repo.push(id)
    expect((await get()).pushed_count).toBe(2)
  })
  it('verwijderen haalt de to-do weg', async () => {
    await repo.deleteTodo(id)
    expect(await repo.listTodos()).toEqual([])
  })
})
