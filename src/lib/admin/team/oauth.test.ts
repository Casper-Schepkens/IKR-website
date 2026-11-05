import { describe, expect, it, vi } from 'vitest'
vi.mock('../supabase/server', () => ({ createServiceSupabase: vi.fn(), createServerSupabase: vi.fn() }))
import { authUrl, TEAM_SCOPES } from '../google'

describe('OAuth-URL voor Mijn koppelingen', () => {
  it('mail: enkel gmail.readonly, eigen adres, geen samengevoegde rechten', () => {
    process.env.GOOGLE_CLIENT_ID = 'cid'
    const u = new URL(authUrl({ redirectUri: 'https://iknowright.be/admin/auth/google/callback', state: 's', scopes: TEAM_SCOPES.mail, loginHint: 'cedric@iknowright.be', includeGranted: false }))
    expect(u.searchParams.get('scope')).toBe('openid email https://www.googleapis.com/auth/gmail.readonly')
    expect(u.searchParams.get('include_granted_scopes')).toBe('false')
    expect(u.searchParams.get('login_hint')).toBe('cedric@iknowright.be')
    expect(u.searchParams.get('access_type')).toBe('offline')
  })
  it('agenda: enkel lezen (lijst + events), ander account kiezen kan', () => {
    const u = new URL(authUrl({ redirectUri: 'x', state: 's', scopes: TEAM_SCOPES.agenda, chooseAccount: true, includeGranted: false }))
    expect(u.searchParams.get('scope')!.split(' ').slice(2)).toEqual([
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ])
    expect(u.searchParams.get('prompt')).toBe('consent select_account')
    expect(u.searchParams.has('login_hint')).toBe(false)
    expect(u.searchParams.get('scope')).not.toMatch(/gmail|calendar\.events(?!\.readonly)|send|compose/)
  })
})
