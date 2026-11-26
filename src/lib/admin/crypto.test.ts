import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { decryptSecret, encryptSecret, tokenKeyProblem } from './crypto'

afterEach(() => vi.unstubAllEnvs())

describe('IKR_TOKEN_KEY', () => {
  it('werkt als base64 én als hex (32 bytes)', () => {
    for (const k of [randomBytes(32).toString('base64'), randomBytes(32).toString('hex')]) {
      vi.stubEnv('IKR_TOKEN_KEY', k)
      expect(tokenKeyProblem()).toBeNull()
      expect(decryptSecret(encryptSecret('refresh-token'))).toBe('refresh-token')
    }
  })
  it('zegt wat er mis is', () => {
    vi.stubEnv('IKR_TOKEN_KEY', '')
    expect(tokenKeyProblem()).toMatch(/ontbreekt/)
    vi.stubEnv('IKR_TOKEN_KEY', 'kort')
    expect(tokenKeyProblem()).toMatch(/bytes in plaats van 32/)
    vi.stubEnv('IKR_TOKEN_KEY', `${randomBytes(32).toString('hex')}\n`)
    expect(tokenKeyProblem()).toMatch(/spaties of een enter/)
  })
})

describe('IKR_CREDENTIALS_KEY (inloggegevens klanten)', () => {
  it('versleutelt per rij en ontsleutelt enkel met dezelfde rij-id', async () => {
    const { decryptCredential, encryptCredential, credentialsKeyProblem } = await import('./crypto')
    vi.stubEnv('IKR_CREDENTIALS_KEY', randomBytes(32).toString('base64'))
    expect(credentialsKeyProblem()).toBeNull()
    const enc = encryptCredential('Geheim wachtwoord 123!', 'rij-1')
    expect(enc).toMatch(/^c1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(enc).not.toContain('Geheim')
    // Zelfde wachtwoord, ander resultaat (willekeurige iv).
    expect(encryptCredential('Geheim wachtwoord 123!', 'rij-1')).not.toBe(enc)
    expect(decryptCredential(enc, 'rij-1')).toBe('Geheim wachtwoord 123!')
    // Naar een andere rij gekopieerd: onleesbaar, en de fout verraadt niets.
    expect(() => decryptCredential(enc, 'rij-2')).toThrow(/ontsleutelen lukte niet/)
  })
  it('weigert zonder sleutel en is los van IKR_TOKEN_KEY', async () => {
    const { encryptCredential, decryptCredential, credentialsKeyProblem } = await import('./crypto')
    vi.stubEnv('IKR_TOKEN_KEY', randomBytes(32).toString('base64'))
    vi.stubEnv('IKR_CREDENTIALS_KEY', '')
    expect(credentialsKeyProblem()).toMatch(/ontbreekt/)
    expect(() => encryptCredential('x', 'rij')).toThrow(/IKR_CREDENTIALS_KEY ontbreekt/)
    vi.stubEnv('IKR_CREDENTIALS_KEY', randomBytes(32).toString('hex'))
    const enc = encryptCredential('x', 'rij')
    vi.stubEnv('IKR_CREDENTIALS_KEY', randomBytes(32).toString('hex'))
    expect(() => decryptCredential(enc, 'rij')).toThrow(/ontsleutelen lukte niet/)
  })
})
