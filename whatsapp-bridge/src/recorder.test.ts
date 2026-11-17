import { describe, expect, it } from 'vitest'
import type { BerichtRij, RawMessage } from './extract.js'
import { Recorder, type BridgeDb, type ChatMeta } from './recorder.js'

const A = '32470000001@s.whatsapp.net'
const B = '32470000002@s.whatsapp.net'
const G = '120363000000000000@g.us'

function fakeDb(active: string[]) {
  const chats = new Map<string, ChatMeta & Record<string, unknown>>()
  const berichten: BerichtRij[] = []
  const db: BridgeDb = {
    activeJids: async () => new Set(active),
    knownChats: async () => new Map([...chats.keys()].map((j) => [j, null])),
    upsertChats: async (rows) => {
      for (const r of rows) chats.set(r.jid, { ...(chats.get(r.jid) ?? {}), ...r })
    },
    insertMessages: async (rows) => void berichten.push(...rows),
    pendingHistory: async () => [],
    markHistoryRequested: async () => {},
  }
  return { db, chats, berichten }
}
const msg = (jid: string, id: string, text: string, ts: number, extra: Record<string, unknown> = {}): RawMessage => ({ key: { remoteJid: jid, id, fromMe: false }, message: { conversation: text }, messageTimestamp: ts, ...extra })

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

describe('namen', () => {
  const L = '78821256634402@lid'
  it('adresboek gaat voor op de WhatsApp-naam; enkel bestaande chats worden bijgewerkt', async () => {
    const f = fakeDb([])
    const r = new Recorder(f.db)
    await r.onMessages([msg(A, '1', 'x', 1763380800, { pushName: 'casper_tiktok' })], 'live')
    expect(f.chats.get(A)!.naam).toBe('casper_tiktok')
    await r.onContacts([{ id: A, name: 'Jan Peeters (Bakkerij)' }, { id: B, name: 'Bert' }])
    expect(f.chats.get(A)!.naam).toBe('Jan Peeters (Bakkerij)')
    // B is nog geen chat: geen rij per adresboekcontact.
    expect(f.chats.has(B)).toBe(false)
    // Een latere WhatsApp-naam overschrijft het adresboek niet.
    await r.onContacts([{ id: A, notify: 'jp' }])
    expect(f.chats.get(A)!.naam).toBe('Jan Peeters (Bakkerij)')
  })
  it('groepsnaam uit de groepslijst', async () => {
    const f = fakeDb([])
    const r = new Recorder(f.db)
    await r.onMessages([msg(G, 'g', 'x', 1763380800, { key: { remoteJid: G, id: 'g', participant: A } })], 'live')
    expect(f.chats.get(G)!.naam).toBeUndefined()
    await r.onChats([{ id: G, subject: 'IKR × Chez Albert' }], [], 'groep')
    expect(f.chats.get(G)).toMatchObject({ naam: 'IKR × Chez Albert', is_groep: true })
  })
  it('anoniem id (@lid): nummer en naam via het bericht of het contact', async () => {
    const f = fakeDb([])
    const r = new Recorder(f.db)
    await r.onMessages([{ key: { remoteJid: L, id: '1', fromMe: false, senderPn: '32475788230@s.whatsapp.net' }, message: { conversation: 'x' }, messageTimestamp: 1763380800 }], 'live')
    expect(f.chats.get(L)!.telefoon).toBe('+32475788230')
    await r.onContacts([{ id: '32475788230@s.whatsapp.net', name: 'Lies (Tempus)' }])
    expect(f.chats.get(L)!.naam).toBe('Lies (Tempus)')
    const g = fakeDb([])
    const r2 = new Recorder(g.db)
    await r2.onMessages([msg(L, '2', 'x', 1763380800)], 'live')
    await r2.onContacts([{ id: L, lid: L, jid: '32470000009@s.whatsapp.net', notify: 'Ann' }])
    expect(g.chats.get(L)).toMatchObject({ naam: 'Ann', telefoon: '+32470000009' })
  })
  it('namen overleven een herstart (opgeslagen op het volume)', async () => {
    const f = fakeDb([])
    const store = { saved: null as unknown, load: async () => ({ names: { [A]: { naam: 'Jan', bron: 'adresboek' as const } }, pn: {} }), save: async (v: unknown) => void (store.saved = v) }
    const r = new Recorder(f.db, () => {}, Date.now, store)
    await r.onMessages([msg(A, '1', 'x', 1763380800)], 'live')
    expect(f.chats.get(A)!.naam).toBe('Jan')
  })
})

describe('groepen met het hele team', () => {
  it('alle teamnummers erin = hele_team (ook bij anonieme id met nummer); 0475 = +32475', async () => {
    const f = fakeDb([])
    const r = new Recorder(f.db)
    const milan = '32470111111@s.whatsapp.net'
    const cedric = '32470222222@s.whatsapp.net'
    const klant = '32470333333@s.whatsapp.net'
    const rows = await r.onGroups(
      [
        { id: '120363000000000010@g.us', subject: 'IKR × Chez Albert', participants: [{ id: '1@lid', jid: milan }, { id: cedric }, { id: klant }] },
        { id: '120363000000000011@g.us', subject: 'Vrienden', participants: [{ id: milan }, { id: klant }] },
      ],
      ['0470 11 11 11', '+32470222222'],
    )
    expect(rows.map((x) => [x.naam, x.hele_team, x.deelnemers])).toEqual([
      ['IKR × Chez Albert', true, 3],
      ['Vrienden', false, 2],
    ])
    expect(f.chats.get('120363000000000010@g.us')).toMatchObject({ hele_team: true, deelnemers: 3 })
    // Zonder TEAM_NUMMERS: niets beweren over hele_team.
    const g = fakeDb([])
    const rows2 = await new Recorder(g.db).onGroups([{ id: '120363000000000012@g.us', subject: 'X', participants: [] }], [])
    expect(rows2[0].hele_team).toBeUndefined()
  })
})
