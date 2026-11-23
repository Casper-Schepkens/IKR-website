import { describe, expect, it, vi } from 'vitest'
vi.mock('../supabase/server', () => ({ createServiceSupabase: vi.fn() }))
import { brusselsDayStart } from './store'

describe('vandaag in Brussel', () => {
  it('middernacht in de winter (UTC+1) en zomer (UTC+2)', () => {
    expect(brusselsDayStart(new Date('2026-11-20T10:00:00Z'))).toBe('2026-11-19T23:00:00.000Z')
    expect(brusselsDayStart(new Date('2026-07-01T10:00:00Z'))).toBe('2026-06-30T22:00:00.000Z')
    // 00:30 in Brussel is nog 23:30 UTC de dag ervoor: toch de nieuwe dag.
    expect(brusselsDayStart(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-19T23:00:00.000Z')
  })
})
