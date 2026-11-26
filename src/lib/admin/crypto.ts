import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Versleuteling van gevoelige tokens (AES-256-GCM). Sleutel: IKR_TOKEN_KEY = 32 willekeurige bytes,
 * base64 (genereer met `openssl rand -base64 32`; zet als Sensitive in Vercel). Formaat: v1.<iv>.<tag>.<data>.
 */
/** 32 bytes als hex (64 tekens, `openssl rand -hex 32`) of als base64 (`openssl rand -base64 32`). */
export function parseTokenKey(raw: string): Buffer {
  const v = raw.trim()
  return /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64')
}

function key() {
  const raw = process.env.IKR_TOKEN_KEY
  if (!raw) throw new Error('IKR_TOKEN_KEY ontbreekt in Vercel: koppelen kan pas als die sleutel er staat.')
  const k = parseTokenKey(raw)
  if (k.length !== 32) throw new Error('IKR_TOKEN_KEY moet 32 bytes zijn: `openssl rand -base64 32` of `openssl rand -hex 32`.')
  return k
}

/** Wat er mis is met IKR_TOKEN_KEY (null = in orde), zonder de waarde zelf te tonen. */
export function tokenKeyProblem(): string | null {
  const raw = process.env.IKR_TOKEN_KEY
  if (!raw) return 'IKR_TOKEN_KEY ontbreekt in deze deploy. Staat hij al in Vercel? Dan opnieuw deployen (variabelen gelden pas vanaf de volgende deploy) en nakijken of hij voor Production aangevinkt is.'
  if (raw.trim() !== raw) return 'IKR_TOKEN_KEY heeft spaties of een enter aan het begin of einde: plak hem opnieuw zonder.'
  const len = parseTokenKey(raw).length
  if (len !== 32) return `IKR_TOKEN_KEY is ${len} bytes in plaats van 32. Maak een nieuwe met \`openssl rand -base64 32\` (of \`openssl rand -hex 32\`) en plak de volledige uitkomst.`
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

/*
 * Inloggegevens van klanten (klant_inloggegevens.password_enc). Aparte sleutel IKR_CREDENTIALS_KEY (zelfde
 * formaat als IKR_TOKEN_KEY), zodat een gelekte tokensleutel de wachtwoorden niet opent en omgekeerd.
 * AES-256-GCM met als extra gegeven (AAD) de rij-id: een versleuteld wachtwoord naar een andere rij kopiëren
 * maakt het onleesbaar. Formaat: c1.<iv>.<tag>.<data> (de database aanvaardt enkel dat formaat).
 */
const CREDENTIALS_KEY = 'IKR_CREDENTIALS_KEY'

/** Wat er mis is met IKR_CREDENTIALS_KEY (null = in orde), zonder de waarde te tonen. */
export function credentialsKeyProblem(): string | null {
  const raw = process.env[CREDENTIALS_KEY]
  if (!raw) return `${CREDENTIALS_KEY} ontbreekt: maak er een met \`openssl rand -base64 32\` en zet hem (Sensitive) in Vercel en in .env.local.`
  if (raw.trim() !== raw) return `${CREDENTIALS_KEY} heeft spaties of een enter aan het begin of einde: plak hem opnieuw zonder.`
  const len = parseTokenKey(raw).length
  if (len !== 32) return `${CREDENTIALS_KEY} is ${len} bytes in plaats van 32. Maak een nieuwe met \`openssl rand -base64 32\`.`
  return null
}

function credentialsKey() {
  const problem = credentialsKeyProblem()
  if (problem) throw new Error(problem)
  return parseTokenKey(process.env[CREDENTIALS_KEY]!)
}

const aad = (rowId: string) => Buffer.from(`klant_inloggegevens:${rowId}`, 'utf8')

export function encryptCredential(plain: string, rowId: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', credentialsKey(), iv)
  c.setAAD(aad(rowId))
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['c1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}

export function decryptCredential(enc: string, rowId: string): string {
  const [v, iv, tag, data] = enc.split('.')
  if (v !== 'c1' || !iv || !tag || data === undefined) throw new Error('Onbekend formaat van het versleutelde wachtwoord.')
  try {
    const d = createDecipheriv('aes-256-gcm', credentialsKey(), Buffer.from(iv, 'base64url'))
    d.setAAD(aad(rowId))
    d.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8')
  } catch {
    // Geen details (en zeker geen inhoud) in de foutmelding.
    throw new Error('Wachtwoord ontsleutelen lukte niet: is IKR_CREDENTIALS_KEY gewijzigd?')
  }
}
