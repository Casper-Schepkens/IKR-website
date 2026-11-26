import { afterEach, describe, expect, it, vi } from 'vitest'

const tokens = ['oud-token', 'nieuw-token']
const forgetTeamToken = vi.fn(() => tokens.shift())
vi.mock('@/lib/admin/team/connections', () => ({
  teamAccessToken: async () => ({ token: tokens[0], conn: { google_email: 'casper@iknowright.be', calendars: [{ id: 'tandloosispam@gmail.com' }], selected_calendars: [] } }),
  forgetTeamToken: (...a: unknown[]) => forgetTeamToken(...(a as [])),
}))
vi.mock('@/lib/admin/google', () => ({ accessToken: async () => 'x', forgetAccessToken: vi.fn(), isGoogleConfigured: () => true, listConnections: async () => [] }))
vi.mock('@/lib/admin/team/invites', () => ({ inviteAddresses: async () => ({ casper: 'tandloosispam@gmail.com', cedric: 'cedric@iknowright.be', milan: 'milan@iknowright.be' }) }))

import { PROVIDERS } from './busy'

afterEach(() => vi.unstubAllGlobals())

describe('Mijn agenda (team_agenda)', () => {
  it('leest de gedeelde agenda van het uitnodigingsadres en probeert na een 401 één keer opnieuw met een vers token', async () => {
    const calls: { url: string; auth: string }[] = []
    vi.stubGlobal('fetch', async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, auth: init.headers.Authorization })
      if (init.headers.Authorization === 'Bearer oud-token') return new Response(JSON.stringify({ error: { message: 'Request had invalid authentication credentials.' } }), { status: 401 })
      return new Response(JSON.stringify({ items: [{ start: { dateTime: '2026-12-09T12:00:00Z' }, end: { dateTime: '2026-12-09T14:00:00Z' } }] }), { status: 200 })
    })
    const busy = await PROVIDERS.team_agenda.read(
      { id: '1', member_email: 'casper@iknowright.be', provider: 'team_agenda', label: null, account_email: null, calendar_ids: [], active: true },
      new Date('2026-12-01T00:00:00Z'),
      new Date('2026-12-20T00:00:00Z'),
    )
    expect(busy).toEqual([{ start: Date.parse('2026-12-09T12:00:00Z'), end: Date.parse('2026-12-09T14:00:00Z') }])
    expect(forgetTeamToken).toHaveBeenCalledTimes(1)
    expect(calls.map((c) => c.auth)).toEqual(['Bearer oud-token', 'Bearer nieuw-token'])
    expect(calls[1].url).toContain('/calendars/tandloosispam%40gmail.com/events')
  })
})

describe('gedeelde agenda niet leesbaar', () => {
  it('geeft een duidelijke melding als de agenda niet met het gekoppelde account gedeeld is', async () => {
    tokens.splice(0, tokens.length, 'token')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { message: 'Not Found' } }), { status: 404 }))
    await expect(
      PROVIDERS.team_agenda.read(
        { id: '1', member_email: 'casper@iknowright.be', provider: 'team_agenda', label: null, account_email: null, calendar_ids: [], active: true },
        new Date('2026-12-01T00:00:00Z'),
        new Date('2026-12-20T00:00:00Z'),
      ),
    ).rejects.toThrow(/casper@iknowright\.be kan de agenda van tandloosispam@gmail\.com niet lezen/)
  })
})
