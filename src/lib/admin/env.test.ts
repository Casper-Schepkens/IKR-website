import { afterEach, describe, expect, it } from 'vitest'
import { isAllowedAdminEmail, isDemoMode } from './env'

afterEach(() => {
  delete process.env.IKR_EXTRA_ADMIN_EMAILS
  delete process.env.VERCEL
  delete process.env.IKR_ADMIN_DEMO
})

describe('wie mag in /admin', () => {
  it('enkel het team, niet elk @iknowright.be-adres', () => {
    expect(isAllowedAdminEmail('Casper@iknowright.be')).toBe(true)
    expect(isAllowedAdminEmail('cedric@iknowright.be')).toBe(true)
    expect(isAllowedAdminEmail('stagiair@iknowright.be')).toBe(false)
    expect(isAllowedAdminEmail('contact@iknowright.be')).toBe(false)
    expect(isAllowedAdminEmail('casper@iknowright.be.evil.com')).toBe(false)
    expect(isAllowedAdminEmail(null)).toBe(false)
  })
  it('extra adressen via IKR_EXTRA_ADMIN_EMAILS', () => {
    process.env.IKR_EXTRA_ADMIN_EMAILS = 'stagiair@iknowright.be, x@y.be'
    expect(isAllowedAdminEmail('stagiair@iknowright.be')).toBe(true)
  })
  it('demomodus nooit op Vercel', () => {
    process.env.IKR_ADMIN_DEMO = 'true'
    process.env.VERCEL = '1'
    expect(isDemoMode()).toBe(false)
  })
})
