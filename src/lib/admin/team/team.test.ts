import { randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

// bot_actions opvangen (geen echte DB).
const logs: { tool: string; ok: boolean; args: Record<string, unknown> | null }[] = []
vi.mock('../supabase/server', () => ({
  createServiceSupabase: () => ({ from: () => ({ insert: async (row: (typeof logs)[number]) => (logs.push(row), { error: null }) }) }),
  createServerSupabase: vi.fn(),
}))
vi.mock('../gmail', () => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn(), recentThreads: vi.fn(), threadsWith: vi.fn() }))

// ── Nagebootste Google: houdt elke oproep bij ──
type Call = { method: string; url: string }
const calls: Call[] = []
let revoked = false
const b64 = (s: string) => Buffer.from(s).toString('base64url')
const MSG = {
  id: 'M1',
  threadId: 'T1',
  internalDate: String(Date.parse('2026-11-04T09:00:00Z')),
  snippet: 'In bijlage de offerte',
  payload: {
    mimeType: 'multipart/mixed',
    headers: [
      { name: 'From', value: 'Klant <klant@bakkerij.be>' },
      { name: 'To', value: 'cedric@iknowright.be' },
      { name: 'Subject', value: 'Offerte draaidag' },
    ],
    parts: [
      { mimeType: 'text/plain', body: { data: b64('Hoi Cedric, in bijlage de offerte.') } },
      { mimeType: 'application/pdf', filename: 'offerte.pdf', body: { attachmentId: 'A1', size: 9 } },
    ],
  },
}
function fakeFetch(input: string | URL | Request, init?: RequestInit) {
  const url = String(input)
  const method = (init?.method ?? 'GET').toUpperCase()
  calls.push({ method, url })
  const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
  if (url.startsWith('https://oauth2.googleapis.com/token'))
    return revoked ? json(400, { error: 'invalid_grant' }) : json(200, { access_token: 'AT', expires_in: 3600, scope: '' })
  if (url.startsWith('https://oauth2.googleapis.com/revoke')) return json(200, {})
  if (url.includes('/gmail/v1/users/me/messages?')) return json(200, { messages: [{ id: 'M1' }] })
  if (url.includes('/gmail/v1/users/me/messages/M1/attachments/A1')) return json(200, { data: b64('%PDF-1.4!'), size: 9 })
  if (url.includes('/gmail/v1/users/me/messages/M1')) return json(200, MSG)
  if (url.includes('/gmail/v1/users/me/threads/T1')) return json(200, { messages: [MSG] })
  if (url.includes('/calendar/v3/users/me/calendarList'))
    return json(200, { items: [{ id: 'primary@x', summary: 'Cedric', primary: true }, { id: 'draaidagen@x', summary: 'Draaidagen' }] })
  if (url.includes('/calendar/v3/calendars/'))
    return json(200, { items: [{ summary: 'Draaidag Bakkerij', start: { dateTime: '2026-11-06T08:00:00+01:00' }, end: { dateTime: '2026-11-06T16:00:00+01:00' }, location: 'Gent', status: 'confirmed' }] })
  return json(404, { error: { message: 'onbekend in test: ' + url } })
}

import { listOwnConnections, removeTeamConnection, saveTeamConnection, setSelectedCalendars, teamAccessToken } from './connections'
import { decryptSecret, encryptSecret } from '../crypto'
import { buildMcpServer } from '../mcp/server'
import { memoryLeads } from '../sales/repo'
import { memoryWeekly } from '../weekly/repo'
import { memoryDrafts } from '../sales/drafts'
import { memoryChat } from '../chat/repo'
import { memoryClients } from '../clients/repo'
import { TEAM_SCOPES } from '../google'
import type { AdminSession } from '../session'

const CEDRIC = 'cedric@iknowright.be'
const MILAN = 'milan@iknowright.be'
const scopes = (k: 'mail' | 'agenda') => ['openid', 'email', ...TEAM_SCOPES[k]].join(' ')

let client: Client
async function call(name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { type: string; text?: string; resource?: { mimeType: string; blob?: string } }[] }
  const t = res.content[0]?.text ?? ''
  let json: unknown = null
  try {
    json = JSON.parse(t)
  } catch {
    json = null
  }
  return { isError: Boolean(res.isError), text: t, json: json as Record<string, unknown>, content: res.content }
}

beforeEach(async () => {
  process.env.IKR_TOKEN_KEY = randomBytes(32).toString('base64')
  process.env.GOOGLE_CLIENT_ID = 'cid'
  process.env.GOOGLE_CLIENT_SECRET = 'secret'
  ;(globalThis as Record<string, unknown>).__ikrTeamGoogle = undefined
  ;(globalThis as Record<string, unknown>).__ikrTeamTokens = undefined
  logs.length = 0
  calls.length = 0
  revoked = false
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  const session = {
    user: { id: 'grokbot', email: 'casper@iknowright.be', name: 'Grokbot' },
    mode: 'demo',
    leads: memoryLeads(),
    weekly: memoryWeekly(),
    clients: memoryClients(),
    drafts: memoryDrafts([]),
    chat: memoryChat([]),
  } as unknown as AdminSession
  const [a, b] = InMemoryTransport.createLinkedPair()
  await buildMcpServer(session).connect(a)
  client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(b)
})

describe('versleuteling', () => {
  it('tokens worden versleuteld bewaard en zijn niet te vervalsen', () => {
    const enc = encryptSecret('1//refresh-token')
    expect(enc).not.toContain('refresh-token')
    expect(decryptSecret(enc)).toBe('1//refresh-token')
    const [v, iv, tag, data] = enc.split('.')
    expect(() => decryptSecret([v, iv, tag, data.slice(0, -2) + 'AA'].join('.'))).toThrow()
  })
  it('zonder IKR_TOKEN_KEY wordt er niets bewaard', async () => {
    delete process.env.IKR_TOKEN_KEY
    await expect(saveTeamConnection({ member: CEDRIC, kind: 'mail', googleEmail: CEDRIC, refreshToken: 'r', scopes: scopes('mail') })).rejects.toThrow(/IKR_TOKEN_KEY/)
  })
})

describe('koppelen en ontkoppelen', () => {
  it('mail en agenda apart, agenda met een ander account; enkel eigen koppelingen zichtbaar', async () => {
    await saveTeamConnection({ member: CEDRIC, kind: 'mail', googleEmail: CEDRIC, refreshToken: 'r-mail', scopes: scopes('mail') })
    await saveTeamConnection({
      member: CEDRIC,
      kind: 'agenda',
      googleEmail: 'productie@iknowright.be',
      refreshToken: 'r-agenda',
      scopes: scopes('agenda'),
      calendars: [{ id: 'primary@x', naam: 'Productie', primair: true }, { id: 'draaidagen@x', naam: 'Draaidagen', primair: false }],
    })
    await saveTeamConnection({ member: MILAN, kind: 'mail', googleEmail: MILAN, refreshToken: 'r-milan', scopes: scopes('mail') })
    const own = await listOwnConnections(CEDRIC)
    expect(own.map((c) => [c.kind, c.google_email, c.selected_calendars])).toEqual([
      ['mail', CEDRIC, []],
      ['agenda', 'productie@iknowright.be', ['primary@x']],
    ])
    expect(JSON.stringify(own)).not.toContain('r-mail') // geen tokens naar buiten
    expect((await listOwnConnections(MILAN)).map((c) => c.kind)).toEqual(['mail'])

    await setSelectedCalendars(CEDRIC, ['primary@x', 'draaidagen@x', 'bestaat-niet'])
    expect((await listOwnConnections(CEDRIC)).find((c) => c.kind === 'agenda')?.selected_calendars).toEqual(['primary@x', 'draaidagen@x'])

    expect(await removeTeamConnection(CEDRIC, 'mail')).toBe(true)
    const revoke = calls.find((c) => c.url.startsWith('https://oauth2.googleapis.com/revoke'))
    expect(revoke?.method).toBe('POST') // token ingetrokken bij Google
    expect((await listOwnConnections(CEDRIC)).map((c) => c.kind)).toEqual(['agenda'])
  })

  it('weigert een koppeling waarbij niet alle (lees)rechten aangevinkt werden', async () => {
    await expect(saveTeamConnection({ member: CEDRIC, kind: 'agenda', googleEmail: CEDRIC, refreshToken: 'r', scopes: 'openid email' })).rejects.toThrow(/rechten/)
  })

  it('ingetrokken bij Google → status "opnieuw koppelen" en een duidelijke fout', async () => {
    await saveTeamConnection({ member: CEDRIC, kind: 'mail', googleEmail: CEDRIC, refreshToken: 'r', scopes: scopes('mail') })
    revoked = true
    await expect(teamAccessToken(CEDRIC, 'mail')).rejects.toThrow(/opnieuw koppelen/)
    expect((await listOwnConnections(CEDRIC))[0].status).toBe('opnieuw_koppelen')
  })
})

describe('MCP: teamlid_*', () => {
  beforeEach(async () => {
    await saveTeamConnection({ member: CEDRIC, kind: 'mail', googleEmail: CEDRIC, refreshToken: 'r-mail', scopes: scopes('mail') })
    await saveTeamConnection({
      member: CEDRIC,
      kind: 'agenda',
      googleEmail: CEDRIC,
      refreshToken: 'r-agenda',
      scopes: scopes('agenda'),
      calendars: [{ id: 'primary@x', naam: 'Cedric', primair: true }],
    })
    calls.length = 0
    logs.length = 0
  })

  it('koppelingen, mail zoeken (met periode), lezen (met bijlagen), bijlage ophalen en agenda — alles gelogd, enkel GET', async () => {
    const k = (await call('teamlid_koppelingen')).json as unknown as { teamlid: string; mail: unknown; agenda: { agendas: string[] } | null }[]
    expect(k.find((x) => x.teamlid === 'Cedric')).toMatchObject({ mail: { account: CEDRIC, status: 'ok' }, agenda: { agendas: ['Cedric'] } })
    expect(k.find((x) => x.teamlid === 'Milan')).toMatchObject({ mail: null, agenda: null })

    const z = await call('teamlid_mail_zoeken', { teamlid: 'Cedric', zoekterm: 'offerte', van: '2026-11-01', tot: '2026-11-04' })
    expect(z.json).toMatchObject({ teamlid: 'Cedric', berichten: [{ bericht_id: 'M1', onderwerp: 'Offerte draaidag', van: 'Klant <klant@bakkerij.be>' }] })
    const q = decodeURIComponent(calls.find((c) => c.url.includes('/messages?'))!.url.split('q=')[1])
    expect(q).toBe('offerte after:2026/11/01 before:2026/11/05')

    const l = await call('teamlid_mail_lezen', { teamlid: 'cedric', thread_id: 'T1' })
    expect(l.json).toMatchObject({ berichten: [{ tekst: 'Hoi Cedric, in bijlage de offerte.', bijlagen: [{ bijlage_id: 'A1', bestandsnaam: 'offerte.pdf', type: 'application/pdf' }] }] })

    const b = await call('teamlid_bijlage_ophalen', { teamlid: CEDRIC, bericht_id: 'M1', bijlage_id: 'A1' })
    expect(b.isError).toBe(false)
    expect(b.content[1]).toMatchObject({ type: 'resource', resource: { mimeType: 'application/pdf' } })
    expect(Buffer.from(b.content[1].resource!.blob!, 'base64').toString()).toBe('%PDF-1.4!')

    const e = await call('teamlid_agenda_events', { teamlid: 'Cedric', van: '2026-11-06', tot: '2026-11-06' })
    expect(e.json).toMatchObject({ afspraken: [{ titel: 'Draaidag Bakkerij', locatie: 'Gent', agenda: 'Cedric' }] })

    // Elke oproep gelogd, met teamlid en wat er gevraagd werd.
    expect(logs.map((x) => [x.tool, x.ok, x.args?.alleen_lezen])).toEqual([
      ['teamlid_koppelingen', true, true],
      ['teamlid_mail_zoeken', true, true],
      ['teamlid_mail_lezen', true, true],
      ['teamlid_bijlage_ophalen', true, true],
      ['teamlid_agenda_events', true, true],
    ])
    expect(logs[1].args).toMatchObject({ teamlid: 'Cedric', zoekterm: 'offerte', van: '2026-11-01', tot: '2026-11-04' })

    // Naar Gmail en Agenda vertrekken enkel GET-oproepen (niets versturen, aanpassen of verwijderen).
    const google = calls.filter((c) => /gmail\.googleapis\.com|www\.googleapis\.com\/calendar/.test(c.url))
    expect(google.length).toBeGreaterThan(0)
    expect(google.every((c) => c.method === 'GET')).toBe(true)
    expect(google.some((c) => /\/send|\/drafts|\/trash|\/modify|\/delete/.test(c.url))).toBe(false)
  })

  it('geen enkele tool verstuurt mail of maakt concepten in een mailbox', async () => {
    const names = (await client.listTools()).tools.map((t) => t.name)
    expect(names).toEqual(expect.arrayContaining(['teamlid_koppelingen', 'teamlid_mail_zoeken', 'teamlid_mail_lezen', 'teamlid_bijlage_ophalen', 'teamlid_agenda_events']))
    expect(names.filter((n) => /versturen|verzenden|send|teamlid_.*(concept|draft|verwijder)/i.test(n))).toEqual([])
    for (const t of (await client.listTools()).tools.filter((t) => t.name.startsWith('teamlid_'))) expect(t.annotations?.readOnlyHint).toBe(true)
  })

  it('fouten (niet gekoppeld, onbekend teamlid) worden ook gelogd', async () => {
    expect((await call('teamlid_mail_zoeken', { teamlid: 'Milan', zoekterm: 'x' })).text).toMatch(/nog niet gekoppeld/)
    expect((await call('teamlid_agenda_events', { teamlid: 'Jan', van: '2026-11-01', tot: '2026-11-02' })).text).toMatch(/Geen teamlid/)
    expect(logs.map((x) => [x.tool, x.ok])).toEqual([
      ['teamlid_mail_zoeken', false],
      ['teamlid_agenda_events', false],
    ])
  })
})
