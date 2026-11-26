import { randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { cleanCredentialInput, cleanCredentialPatch, teamName } from './types'
import { LIST_COLUMNS, memoryCredentials } from './repo'

beforeEach(() => {
  vi.stubEnv('IKR_CREDENTIALS_KEY', randomBytes(32).toString('base64'))
  ;(globalThis as { __ikrCredentials?: unknown }).__ikrCredentials = []
})

describe('invoer', () => {
  it('platform verplicht, rest opgekuist; wachtwoord niet getrimd', () => {
    expect(() => cleanCredentialInput({ platform: '  ' })).toThrow(/platform/)
    expect(cleanCredentialInput({ platform: ' TikTok ', username: ' a@b.be ', password: ' pw ', note: '' })).toEqual({ platform: 'TikTok', username: 'a@b.be', password: ' pw ', note: null })
    expect(() => cleanCredentialInput({ platform: 'x', password: 'a'.repeat(1001) })).toThrow(/te lang/)
  })
  it('bewerken met leeg wachtwoord laat het bewaarde staan', () => {
    expect(cleanCredentialPatch({ platform: 'IG', password: '' })).not.toHaveProperty('password')
    expect(cleanCredentialPatch({ platform: 'IG', password: 'nieuw' })).toHaveProperty('password', 'nieuw')
  })
  it('naam van het teamlid', () => {
    expect(teamName('cedric@iknowright.be')).toBe('Cédric')
    expect(teamName(null)).toBeNull()
  })
})

describe('repo', () => {
  it('lijst zonder wachtwoord; enkel reveal geeft het (versleuteld bewaard)', async () => {
    const repo = memoryCredentials()
    const c = await repo.create('klant-1', { platform: 'TikTok', username: 'ikr', password: 'Sup3rGeheim', note: '2FA via Milan' }, 'milan@iknowright.be')
    const list = await repo.list()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ platform: 'TikTok', has_password: true, updated_by: 'milan@iknowright.be' })
    expect(JSON.stringify(list)).not.toContain('Sup3rGeheim')
    expect(list[0]).not.toHaveProperty('password_enc')
    const stored = (globalThis as unknown as { __ikrCredentials: { password_enc: string }[] }).__ikrCredentials[0]
    expect(stored.password_enc).toMatch(/^c1\./)
    expect(stored.password_enc).not.toContain('Sup3rGeheim')
    expect(await repo.reveal(c.id)).toBe('Sup3rGeheim')
  })
  it('bewerken: zonder wachtwoord ongewijzigd, met wachtwoord vervangen; laatst gewijzigd door', async () => {
    const repo = memoryCredentials()
    const c = await repo.create('klant-1', { platform: 'IG', username: null, password: 'oud', note: null }, 'casper@iknowright.be')
    await repo.update(c.id, { platform: 'Instagram', username: 'ikr', note: null }, 'cedric@iknowright.be')
    expect(await repo.reveal(c.id)).toBe('oud')
    expect((await repo.list())[0]).toMatchObject({ platform: 'Instagram', updated_by: 'cedric@iknowright.be', created_by: 'casper@iknowright.be' })
    await repo.update(c.id, { platform: 'Instagram', username: 'ikr', note: null, password: 'nieuw' }, 'cedric@iknowright.be')
    expect(await repo.reveal(c.id)).toBe('nieuw')
    await repo.remove(c.id)
    expect(await repo.list()).toEqual([])
  })
  it('zonder wachtwoord', async () => {
    const repo = memoryCredentials()
    const c = await repo.create('k', { platform: 'Meta Business', username: 'x', password: null, note: null }, 'casper@iknowright.be')
    expect((await repo.list())[0].has_password).toBe(false)
    expect(await repo.reveal(c.id)).toBeNull()
  })
  it('de lijstquery vraagt password_enc nooit op', () => {
    expect(LIST_COLUMNS).not.toMatch(/password_enc/)
  })
})
