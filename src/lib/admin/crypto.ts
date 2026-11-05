import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Versleuteling van gevoelige tokens (AES-256-GCM). Sleutel: IKR_TOKEN_KEY = 32 willekeurige bytes,
 * base64 (genereer met `openssl rand -base64 32`; zet als Sensitive in Vercel). Formaat: v1.<iv>.<tag>.<data>.
 */
function key() {
  const raw = process.env.IKR_TOKEN_KEY
  if (!raw) throw new Error('IKR_TOKEN_KEY ontbreekt in Vercel: koppelen kan pas als die sleutel er staat.')
  const k = Buffer.from(raw, 'base64')
  if (k.length !== 32) throw new Error('IKR_TOKEN_KEY moet 32 bytes zijn (base64), bv. via `openssl rand -base64 32`.')
  return k
}

export const isTokenKeyConfigured = () => {
  try {
    key()
    return true
  } catch {
    return false
  }
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}

export function decryptSecret(enc: string): string {
  const [v, iv, tag, data] = enc.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Onbekend tokenformaat.')
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8')
}
