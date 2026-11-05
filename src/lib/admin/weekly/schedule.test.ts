import { beforeEach, describe, expect, it, vi } from 'vitest'

const google = vi.hoisted(() => ({
  isGoogleConfigured: vi.fn(() => true),
  listConnections: vi.fn(async () => [] as { email: string }[]),
  createEvent: vi.fn(async () => ({ eventId: 'EV1', meetUrl: 'https://meet.google.com/abc-defg-hij' })),
}))
vi.mock('../google', () => google)

import { memoryWeekly } from './repo'
import { retryOpenCalendars, scheduleWeekly } from './schedule'

beforeEach(() => {
  ;(globalThis as { __ikrWeekly?: unknown }).__ikrWeekly = undefined
  vi.clearAllMocks()
})

describe('agenda en Meet alsnog aanmaken', () => {
  it('weekly ingepland vóór het koppelen krijgt na het koppelen alsnog een Meet', async () => {
    const repo = memoryWeekly()
    google.listConnections.mockResolvedValueOnce([])
    const w = await scheduleWeekly(repo, 'casper@iknowright.be', { date: '2026-11-12', time: '10:00', mode: 'online' })
    expect(await repo.getWeekly(w.id)).toMatchObject({ meet_url: null, calendar_error: 'De contact-agenda is nog niet gekoppeld (Instellingen).' })

    google.listConnections.mockResolvedValue([{ email: 'contact@iknowright.be' }])
    expect(await retryOpenCalendars(repo)).toBe(1)
    expect(await repo.getWeekly(w.id)).toMatchObject({ meet_url: 'https://meet.google.com/abc-defg-hij', calendar_event_id: 'EV1', calendar_error: null })

    // Tweede keer: niets dubbel aanmaken.
    expect(await retryOpenCalendars(repo)).toBe(0)
    expect(google.createEvent).toHaveBeenCalledTimes(1)
  })

  it('afgesloten weeklies worden niet opnieuw geprobeerd', async () => {
    const repo = memoryWeekly()
    google.listConnections.mockResolvedValueOnce([])
    const w = await scheduleWeekly(repo, 'c', { date: '2026-11-12', time: '10:00', mode: 'online' })
    await repo.updateWeekly(w.id, { status: 'concluded' })
    google.listConnections.mockResolvedValue([{ email: 'contact@iknowright.be' }])
    expect(await retryOpenCalendars(repo)).toBe(0)
  })
})
