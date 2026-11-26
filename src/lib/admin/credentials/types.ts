/**
 * Inloggegevens van een klant (TikTok, Instagram, Meta Business, ...). Het wachtwoord zelf zit hier nooit in:
 * dat staat versleuteld in de database en komt enkel op aanvraag (toon / kopieer) los naar de browser.
 */
export type ClientCredential = {
  id: string
  client_id: string
  platform: string
  username: string | null
  /** Of er een (versleuteld) wachtwoord bewaard is. */
  has_password: boolean
  /** Bv. "2FA via Milans gsm". */
  note: string | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
}

/** Wat het team invult. password: null = geen wachtwoord; bij bewerken betekent undefined "ongewijzigd". */
export type CredentialInput = { platform: string; username: string | null; password: string | null; note: string | null }
export type CredentialPatch = Omit<CredentialInput, 'password'> & { password?: string }

/** Voorstellen in het formulier; vrije tekst blijft mogelijk. */
export const PLATFORMS = ['TikTok', 'Instagram', 'Meta Business', 'Facebook', 'YouTube', 'Google', 'LinkedIn', 'Snapchat', 'Pinterest', 'Website'] as const

export const CREDENTIAL_LIMITS = { platform: 100, username: 320, password: 1000, note: 2000 } as const

const text = (v: string | null | undefined, max: number, label: string) => {
  const t = (v ?? '').trim()
  if (t.length > max) throw new Error(`${label} is te lang (max. ${max} tekens).`)
  return t || null
}

/** Wachtwoord niet trimmen (spaties kunnen erbij horen); leeg = geen. */
const secret = (v: string | null | undefined) => {
  if (!v) return null
  if (v.length > CREDENTIAL_LIMITS.password) throw new Error(`Wachtwoord is te lang (max. ${CREDENTIAL_LIMITS.password} tekens).`)
  return v
}

export function cleanCredentialInput(raw: { platform?: string | null; username?: string | null; password?: string | null; note?: string | null }): CredentialInput {
  const platform = text(raw.platform, CREDENTIAL_LIMITS.platform, 'Platform')
  if (!platform) throw new Error('Vul het platform in (bv. TikTok).')
  return {
    platform,
    username: text(raw.username, CREDENTIAL_LIMITS.username, 'Gebruikersnaam / e-mail'),
    password: secret(raw.password),
    note: text(raw.note, CREDENTIAL_LIMITS.note, 'Notitie'),
  }
}

/** Bewerken: een leeg wachtwoordveld laat het bewaarde wachtwoord staan. */
export function cleanCredentialPatch(raw: Parameters<typeof cleanCredentialInput>[0]): CredentialPatch {
  const { password, ...rest } = cleanCredentialInput(raw)
  return password === null ? rest : { ...rest, password }
}

export function sortCredentials(list: ClientCredential[]) {
  return [...list].sort((a, b) => a.platform.localeCompare(b.platform, 'nl', { sensitivity: 'base' }) || (a.username ?? '').localeCompare(b.username ?? '', 'nl'))
}

const NAMES: Record<string, string> = { 'casper@iknowright.be': 'Casper', 'cedric@iknowright.be': 'Cédric', 'milan@iknowright.be': 'Milan' }
/** "cedric@iknowright.be" → "Cédric". */
export const teamName = (email: string | null | undefined) => (email ? (NAMES[email.toLowerCase()] ?? email) : null)
