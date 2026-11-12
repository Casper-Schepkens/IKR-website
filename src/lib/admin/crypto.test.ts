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
