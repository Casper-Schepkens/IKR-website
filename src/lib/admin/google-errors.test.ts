import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('./supabase/server', () => ({ createServiceSupabase: () => ({}) }))
import { googleTokenError } from './google'

describe('Google-koppeling geweigerd', () => {
  it('zegt wat je moet doen', () => {
    expect(googleTokenError('invalid_grant', 'refresh')).toMatch(/opnieuw in Instellingen/)
    expect(googleTokenError('invalid_client', 'refresh')).toMatch(/GOOGLE_CLIENT_SECRET/)
    expect(googleTokenError('500', 'refresh')).toBe('Google weigerde de koppeling (500).')
  })
})
