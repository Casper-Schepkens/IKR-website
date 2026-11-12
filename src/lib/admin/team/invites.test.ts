import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('../env', () => ({ isSupabaseConfigured: () => false }))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => ({}) }))
import { inviteAddresses, moveUpcomingInvites, setInviteAddress } from './invites'

beforeEach(() => {
  ;(globalThis as { __ikrInvites?: unknown }).__ikrInvites = undefined
})

describe('uitnodigingsadres per teamlid', () => {
  it('standaard: Casper persoonlijk, Cedric en Milan hun IKR-adres', async () => {
    expect(await inviteAddresses()).toEqual({ casper: 'tandloosispam@gmail.com', cedric: 'cedric@iknowright.be', milan: 'milan@iknowright.be' })
  })
  it('eigen adres instellen en weer leegmaken', async () => {
    expect(await setInviteAddress('cedric', ' Cedric.Prive@Gmail.com ')).toEqual({ before: 'cedric@iknowright.be', after: 'cedric.prive@gmail.com' })
    expect((await inviteAddresses()).cedric).toBe('cedric.prive@gmail.com')
    await setInviteAddress('cedric', '')
    expect((await inviteAddresses()).cedric).toBe('cedric@iknowright.be')
  })
  it('weigert een ongeldig adres; zonder Supabase niets aan agenda-items', async () => {
    await expect(setInviteAddress('milan', 'milan@')).rejects.toThrow(/geen geldig/)
    expect(await moveUpcomingInvites('milan', 'a@x.be', 'b@x.be')).toBe(0)
  })
})
