import 'server-only'
import { decryptSecret, encryptSecret } from '../crypto'
import { isDemoMode, isSupabaseConfigured } from '../env'
import { refreshAccessToken, revokeToken, TEAM_SCOPES } from '../google'
import { createServiceSupabase } from '../supabase/server'
import { TEAM } from '../weekly/types'

/**
 * Koppelingen per teamlid: mail (gmail.readonly) en agenda (calendarlist + events, readonly), elk met
 * een eigen OAuth-flow en eventueel een ander Google-account. Refresh tokens staan versleuteld; enkel
 * de server leest ze. Niets hier kan mail versturen, concepten maken of iets verwijderen in Google.
 */

export type TeamKind = 'mail' | 'agenda'
export type CalendarInfo = { id: string; naam: string; primair: boolean }
export type TeamConnection = {
  member_email: string
  kind: TeamKind
  google_email: string
  scopes: string
  calendars: CalendarInfo[]
  selected_calendars: string[]
  status: 'ok' | 'opnieuw_koppelen'
  last_error: string | null
  connected_at: string
}
type Row = TeamConnection & { refresh_token_enc: string }

const COLS = 'member_email, kind, google_email, scopes, calendars, selected_calendars, status, last_error, connected_at'
const inMemory = () => !isSupabaseConfigured() && isDemoMode()
const g = globalThis as unknown as { __ikrTeamGoogle?: Row[]; __ikrTeamTokens?: Map<string, { token: string; until: number }> }
const mem = () => (g.__ikrTeamGoogle ??= [])
const tokenCache = () => (g.__ikrTeamTokens ??= new Map())
const db = () => createServiceSupabase()
const keyOf = (member: string, kind: TeamKind) => `${member.toLowerCase()}|${kind}`

/** Naam (Cedric), key (cedric) of e-mail → e-mail van het teamlid. Ook teamleden buiten TEAM (via hun koppeling). */
export async function resolveMember(ref: string): Promise<string> {
  const q = ref.trim().toLowerCase().replace(/^@/, '')
  const t = TEAM.find((m) => m.key === q || m.name.toLowerCase() === q || m.email === q)
  if (t) return t.email
  const known = [...new Set((await listAllConnections()).map((c) => c.member_email))]
  const hit = known.filter((e) => e === q || e.split('@')[0] === q)
  if (hit.length === 1) return hit[0]
  throw new Error(`Geen teamlid gevonden voor "${ref}". Teamleden: ${TEAM.map((m) => m.name).join(', ')}.`)
}

export const memberName = (email: string) => TEAM.find((m) => m.email === email)?.name ?? email.split('@')[0]

export async function listAllConnections(): Promise<TeamConnection[]> {
  if (inMemory()) return mem().map(({ refresh_token_enc: _, ...c }) => c)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const { data, error } = await db().from('team_google').select(COLS).order('member_email')
  if (error) throw new Error(error.message)
  return (data ?? []) as TeamConnection[]
}

/** Enkel de eigen koppelingen (dashboard). */
export async function listOwnConnections(member: string) {
  return (await listAllConnections()).filter((c) => c.member_email === member.toLowerCase())
}

export async function saveTeamConnection(input: {
  member: string
  kind: TeamKind
  googleEmail: string
  refreshToken: string
  scopes: string
  calendars?: CalendarInfo[]
}) {
  const granted = input.scopes.split(' ')
  const missing = TEAM_SCOPES[input.kind].filter((s) => !granted.includes(s))
  if (missing.length) throw new Error('Niet alle nodige rechten werden aangevinkt bij Google. Probeer opnieuw en laat alles aangevinkt.')
  const calendars = input.calendars ?? []
  const row: Row = {
    member_email: input.member.toLowerCase(),
    kind: input.kind,
    google_email: input.googleEmail.toLowerCase(),
    refresh_token_enc: encryptSecret(input.refreshToken),
    scopes: input.scopes,
    calendars,
    // Standaard de hoofdagenda; het teamlid kiest daarna zelf.
    selected_calendars: calendars.filter((c) => c.primair).map((c) => c.id).slice(0, 1),
    status: 'ok',
    last_error: null,
    connected_at: new Date().toISOString(),
  }
  // Een vorige koppeling van hetzelfde soort eerst intrekken bij Google.
  await removeTeamConnection(row.member_email, row.kind).catch(() => undefined)
  tokenCache().delete(keyOf(row.member_email, row.kind))
  if (inMemory()) {
    mem().push(row)
    return
  }
  const { error } = await db().from('team_google').upsert({ ...row, updated_at: row.connected_at }, { onConflict: 'member_email,kind' })
  if (error) throw new Error(error.message)
}

async function getRow(member: string, kind: TeamKind): Promise<Row | null> {
  if (inMemory()) return mem().find((r) => r.member_email === member.toLowerCase() && r.kind === kind) ?? null
  const { data, error } = await db().from('team_google').select(`${COLS}, refresh_token_enc`).eq('member_email', member.toLowerCase()).eq('kind', kind).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Row | null) ?? null
}

async function setStatus(member: string, kind: TeamKind, status: Row['status'], lastError: string | null) {
  if (inMemory()) {
    const r = mem().find((x) => x.member_email === member && x.kind === kind)
    if (r) Object.assign(r, { status, last_error: lastError })
    return
  }
  await db().from('team_google').update({ status, last_error: lastError, updated_at: new Date().toISOString() }).eq('member_email', member).eq('kind', kind)
}

/** Ontkoppelen: token intrekken bij Google en de koppeling verwijderen. */
export async function removeTeamConnection(member: string, kind: TeamKind) {
  const r = await getRow(member, kind)
  if (!r) return false
  try {
    await revokeToken(decryptSecret(r.refresh_token_enc))
  } catch {
    // token onleesbaar (bv. andere sleutel): toch verwijderen
  }
  tokenCache().delete(keyOf(member, kind))
  if (inMemory()) g.__ikrTeamGoogle = mem().filter((x) => x !== r)
  else {
    const { error } = await db().from('team_google').delete().eq('member_email', r.member_email).eq('kind', kind)
    if (error) throw new Error(error.message)
  }
  return true
}

export async function setSelectedCalendars(member: string, ids: string[], calendars?: CalendarInfo[]) {
  const r = await getRow(member, 'agenda')
  if (!r) throw new Error('Koppel eerst een agenda.')
  const all = calendars ?? r.calendars
  const valid = ids.filter((id) => all.some((c) => c.id === id))
  if (!valid.length) throw new Error('Kies minstens één agenda.')
  if (inMemory()) Object.assign(r, { selected_calendars: valid, calendars: all })
  else {
    const { error } = await db()
      .from('team_google')
      .update({ selected_calendars: valid, calendars: all, updated_at: new Date().toISOString() })
      .eq('member_email', member.toLowerCase())
      .eq('kind', 'agenda')
    if (error) throw new Error(error.message)
  }
}

/** Een ingetrokken of verlopen koppeling herkennen (Google: invalid_grant / unauthorized_client). */
export const isRevoked = (e: unknown) => /invalid_grant|unauthorized_client|invalid_client|Token has been expired or revoked/i.test(e instanceof Error ? e.message : String(e))

/**
 * Access token voor een koppeling (in het geheugen tot vlak voor het verloopt). Bij een ingetrokken
 * of verlopen koppeling: status "opnieuw_koppelen" en een duidelijke fout.
 */
export async function teamAccessToken(member: string, kind: TeamKind): Promise<{ token: string; conn: TeamConnection }> {
  const r = await getRow(member, kind)
  const who = memberName(member.toLowerCase())
  if (!r) throw new Error(`${who} heeft ${kind === 'mail' ? 'zijn mail' : 'geen agenda'} nog niet gekoppeld (Instellingen → Mijn koppelingen).`)
  if (r.status === 'opnieuw_koppelen') throw new Error(`De ${kind === 'mail' ? 'mail' : 'agenda'}-koppeling van ${who} werkt niet meer: ${who} moet opnieuw koppelen.`)
  const { refresh_token_enc: _, ...conn } = r
  const cached = tokenCache().get(keyOf(member, kind))
  if (cached && cached.until > Date.now()) return { token: cached.token, conn }
  try {
    const t = await refreshAccessToken(decryptSecret(r.refresh_token_enc))
    tokenCache().set(keyOf(member, kind), { token: t.accessToken, until: Date.now() + (t.expiresIn - 120) * 1000 })
    if (r.last_error) await setStatus(r.member_email, kind, 'ok', null)
    return { token: t.accessToken, conn }
  } catch (e) {
    if (isRevoked(e)) {
      await setStatus(r.member_email, kind, 'opnieuw_koppelen', e instanceof Error ? e.message : String(e))
      throw new Error(`De ${kind === 'mail' ? 'mail' : 'agenda'}-koppeling van ${who} is verlopen of ingetrokken: ${who} moet opnieuw koppelen.`)
    }
    throw e
  }
}

/** Dashboard: controleert of een koppeling nog werkt (zet anders "opnieuw koppelen"). */
export async function checkConnection(member: string, kind: TeamKind) {
  try {
    await teamAccessToken(member, kind)
    return 'ok' as const
  } catch {
    return 'opnieuw_koppelen' as const
  }
}
