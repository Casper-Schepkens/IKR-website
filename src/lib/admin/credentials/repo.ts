import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptCredential, encryptCredential } from '../crypto'
import { sortCredentials, type ClientCredential, type CredentialInput, type CredentialPatch } from './types'

/**
 * Inloggegevens van klanten. Versleutelen en ontsleutelen gebeurt hier (server), zodat het wachtwoord nooit in
 * klare tekst in de database staat. list() haalt password_enc niet eens op; enkel reveal() geeft één wachtwoord.
 */
export interface CredentialsRepo {
  list(): Promise<ClientCredential[]>
  create(clientId: string, input: CredentialInput, by: string): Promise<ClientCredential>
  update(id: string, patch: CredentialPatch, by: string): Promise<void>
  remove(id: string): Promise<void>
  /** Het wachtwoord in klare tekst (null = geen bewaard). Enkel voor "toon" en "kopieer". */
  reveal(id: string): Promise<string | null>
}

/** Kolommen voor de lijst: bewust zonder password_enc. */
export const LIST_COLUMNS = 'id, client_id, platform, username, has_password, note, created_by, created_at, updated_by, updated_at'

// Foutmeldingen van de database zonder details (die kunnen de rij met het versleutelde wachtwoord bevatten).
const friendly = (m: string) =>
  m.includes('violates foreign key') ? 'Klant niet gevonden.' : m.includes('row-level security') ? 'Geen toegang tot inloggegevens.' : 'Inloggegevens bewaren lukte niet.'

export function supabaseCredentials(db: SupabaseClient): CredentialsRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(friendly(r.error.message))
    return r.data
  }
  const table = () => db.from('klant_inloggegevens')
  return {
    async list() {
      return sortCredentials((check(await table().select(LIST_COLUMNS)) ?? []) as unknown as ClientCredential[])
    },
    async create(clientId, { password, ...rest }, by) {
      const id = crypto.randomUUID()
      const row = { id, client_id: clientId, ...rest, password_enc: password === null ? null : encryptCredential(password, id), created_by: by, updated_by: by }
      const c = check(await table().insert(row).select(LIST_COLUMNS).single())
      if (!c) throw new Error('Inloggegevens bewaren lukte niet.')
      return c as unknown as ClientCredential
    },
    async update(id, { password, ...rest }, by) {
      const patch = { ...rest, updated_by: by, ...(password !== undefined ? { password_enc: encryptCredential(password, id) } : {}) }
      const rows = check(await table().update(patch).eq('id', id).select('id'))
      if (!rows?.length) throw new Error('Login niet gevonden.')
    },
    async remove(id) {
      check(await table().delete().eq('id', id))
    },
    async reveal(id) {
      const row = check(await table().select('password_enc').eq('id', id).maybeSingle()) as { password_enc: string | null } | null
      if (!row) throw new Error('Login niet gevonden.')
      return row.password_enc ? decryptCredential(row.password_enc, id) : null
    },
  }
}

/** Alleen lokaal zonder Supabase (demomodus en tests). Ook hier versleuteld. */
type MemRow = Omit<ClientCredential, 'has_password'> & { password_enc: string | null }
const g = globalThis as unknown as { __ikrCredentials?: MemRow[] }
export function memoryCredentials(): CredentialsRepo {
  const all = (g.__ikrCredentials ??= [])
  const now = () => new Date().toISOString()
  const view = ({ password_enc, ...r }: MemRow): ClientCredential => ({ ...r, has_password: password_enc !== null })
  const find = (id: string) => {
    const r = all.find((x) => x.id === id)
    if (!r) throw new Error('Login niet gevonden.')
    return r
  }
  return {
    async list() {
      return sortCredentials(all.map(view))
    },
    async create(clientId, { password, ...rest }, by) {
      const id = crypto.randomUUID()
      const r: MemRow = { id, client_id: clientId, ...rest, password_enc: password === null ? null : encryptCredential(password, id), created_by: by, created_at: now(), updated_by: by, updated_at: now() }
      all.push(r)
      return view(r)
    },
    async update(id, { password, ...rest }, by) {
      const r = find(id)
      Object.assign(r, rest, { updated_by: by, updated_at: now() }, password !== undefined ? { password_enc: encryptCredential(password, id) } : {})
    },
    async remove(id) {
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all.splice(i, 1)
    },
    async reveal(id) {
      const r = find(id)
      return r.password_enc ? decryptCredential(r.password_enc, id) : null
    },
  }
}
