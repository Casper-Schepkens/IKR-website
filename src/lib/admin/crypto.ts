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

export const isTokenKeyConfigured = () => tokenKeyProblem() === null

/** Wat er mis is met IKR_TOKEN_KEY (null = in orde), zonder de waarde zelf te tonen. */
export function tokenKeyProblem(): string | null {
  const raw = process.env.IKR_TOKEN_KEY
  if (!raw) return 'IKR_TOKEN_KEY ontbreekt in deze deploy. Staat hij al in Vercel? Dan opnieuw deployen (variabelen gelden pas vanaf de volgende deploy) en nakijken of hij voor Production aangevinkt is.'
  const trimmed = raw.trim()
  const len = Buffer.from(trimmed, 'base64').length
  if (trimmed !== raw) return 'IKR_TOKEN_KEY heeft spaties of een enter aan het begin of einde: plak hem opnieuw zonder.'
  if (len !== 32) return `IKR_TOKEN_KEY is ${len} bytes in plaats van 32. Maak een nieuwe met \`openssl rand -base64 32\` en plak de volledige uitkomst.`
  return null
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
