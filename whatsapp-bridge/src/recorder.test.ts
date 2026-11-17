import { describe, expect, it } from 'vitest'
import type { BerichtRij } from './extract.js'
import { Recorder, type BridgeDb, type ChatMeta } from './recorder.js'

const A = '32470000001@s.whatsapp.net'
const B = '32470000002@s.whatsapp.net'
const G = '120363000000000000@g.us'

function fakeDb(active: string[]) {
  const chats = new Map<string, ChatMeta & Record<string, unknown>>()
  const berichten: BerichtRij[] = []
  const db: BridgeDb = {
    activeJids: async () => new Set(active),
    lastActivity: async () => new Map(),
    upsertChats: async (rows) => {
      for (const r of rows) chats.set(r.jid, { ...(chats.get(r.jid) ?? {}), ...r })
    },
    insertMessages: async (rows) => void berichten.push(...rows),
    pendingHistory: async () => [],
    markHistoryRequested: async () => {},
  }
  return { db, chats, berichten }
}
const msg = (jid: string, id: string, text: string, ts: number, extra: Record<string, unknown> = {}) => ({ key: { remoteJid: jid, id, fromMe: false }, message: { conversation: text }, messageTimestamp: ts, ...extra })

describe('Recorder', () => {
  it('bewaart enkel berichten van actieve chats; detecteert alle chats (zonder inhoud)', async () => {
    const f = fakeDb([A])
    const r = new Recorder(f.db)
    const res = await r.onMessages([msg(A, '1', 'voor A', 1763380800, { pushName: 'Anna' }), msg(B, '2', 'geheim van B', 1763380900, { pushName: 'Bert' })], 'live')
    expect(res).toEqual({ kept: 1, skipped: 1 })
    expect(f.berichten.map((b) => b.tekst)).toEqual(['voor A'])
    expect(f.chats.get(B)).toMatchObject({ jid: B, naam: 'Bert', is_groep: false, laatste_bericht_id: '2' })
    expect(JSON.stringify([...f.chats.values()])).not.toContain('geheim')
  })
  it('historiek-sync: enkel actieve chats; chatnamen uit de sync', async () => {
    const f = fakeDb([G])
    const r = new Recorder(f.db)
    await r.onChats([{ id: G, name: 'IKR x Chez Albert' }, { id: B, name: null }], [{ id: B, notify: 'Bert' }])
    const res = await r.onMessages([msg(G, 'g1', 'draaidag dinsdag?', 1763380800), msg(B, 'b1', 'niet bewaren', 1763380800)], 'historiek')
    expect(res.kept).toBe(1)
    expect(f.chats.get(G)!.naam).toBe('IKR x Chez Albert')
    expect(f.chats.get(B)!.naam).toBe('Bert')
    expect(f.berichten).toHaveLength(1)
  })
  it('oudere historiek zet de laatste activiteit niet terug', async () => {
    const f = fakeDb([])
    const r = new Recorder(f.db)
    await r.onMessages([msg(A, 'new', 'x', 1763380900)], 'live')
    await r.onMessages([msg(A, 'old', 'x', 1700000000)], 'historiek')
    expect(f.chats.get(A)).toMatchObject({ laatste_bericht_id: 'new', laatst_actief: new Date(1763380900_000).toISOString() })
  })
  it('een chat die actief gezet wordt, telt na hooguit 30 s mee', async () => {
    const active: string[] = []
    let now = 0
    const f = fakeDb(active)
    f.db.activeJids = async () => new Set(active)
    const r = new Recorder(f.db, () => {}, () => now)
    await r.onMessages([msg(A, '1', 'te vroeg', 1)], 'live')
    active.push(A)
    now = 31_000
    await r.onMessages([msg(A, '2', 'nu wel', 2)], 'live')
    expect(f.berichten.map((b) => b.id)).toEqual(['2'])
  })
})
