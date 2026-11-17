import { describe, expect, it } from 'vitest'
import { FORBIDDEN_METHODS, isRelevantJid, lockDown, messageContent, phoneOf, timestampIso, toRow } from './extract.js'

const P = '32470123456@s.whatsapp.net'
const G = '120363000000000000@g.us'

describe('welke chats', () => {
  it('personen en groepen wel; status, nieuwsbrieven en broadcasts niet', () => {
    expect(isRelevantJid(P)).toBe(true)
    expect(isRelevantJid(G)).toBe(true)
    expect(isRelevantJid('123@lid')).toBe(true)
    expect(isRelevantJid('status@broadcast')).toBe(false)
    expect(isRelevantJid('123@newsletter')).toBe(false)
    expect(isRelevantJid('123@broadcast')).toBe(false)
    expect(isRelevantJid(null)).toBe(false)
    expect(phoneOf(P)).toBe('+32470123456')
    expect(phoneOf(G)).toBeNull()
  })
})

describe('inhoud van een bericht', () => {
  it('tekst, bijschriften, documenten, omhulsels', () => {
    expect(messageContent({ conversation: 'Hoi!' })).toEqual({ tekst: 'Hoi!', media_type: null })
    expect(messageContent({ extendedTextMessage: { text: 'https://x.be kijk' } })).toEqual({ tekst: 'https://x.be kijk', media_type: null })
    expect(messageContent({ imageMessage: { caption: 'Shot 1' } })).toEqual({ tekst: 'Shot 1', media_type: 'image' })
    expect(messageContent({ audioMessage: { seconds: 12 } })).toEqual({ tekst: null, media_type: 'audio' })
    expect(messageContent({ documentWithCaptionMessage: { message: { documentMessage: { fileName: 'offerte.pdf' } } } })).toEqual({ tekst: 'offerte.pdf', media_type: 'document' })
    expect(messageContent({ ephemeralMessage: { message: { conversation: 'verdwijnt' } } })).toEqual({ tekst: 'verdwijnt', media_type: null })
    expect(messageContent({ viewOnceMessageV2: { message: { videoMessage: {} } } })).toEqual({ tekst: null, media_type: 'video' })
  })
  it('niets te bewaren: reacties, protocol, sleutels', () => {
    expect(messageContent({ reactionMessage: { text: '👍' } })).toBeNull()
    expect(messageContent({ protocolMessage: { type: 0 } })).toBeNull()
    expect(messageContent({ senderKeyDistributionMessage: {}, messageContextInfo: {} })).toBeNull()
    expect(messageContent(null)).toBeNull()
  })
  it('tijdstip uit seconden, Long of string', () => {
    expect(timestampIso(1763380800)).toBe('2025-11-17T12:00:00.000Z')
    expect(timestampIso({ low: 1763380800, high: 0 })).toBe('2025-11-17T12:00:00.000Z')
    expect(timestampIso({ toNumber: () => 1763380800 })).toBe('2025-11-17T12:00:00.000Z')
    expect(timestampIso('1763380800')).toBe('2025-11-17T12:00:00.000Z')
    expect(timestampIso(0)).toBeNull()
  })
  it('rij: richting, afzender in groepen', () => {
    expect(toRow({ key: { remoteJid: P, id: 'A1', fromMe: false }, message: { conversation: 'Hey' }, messageTimestamp: 1763380800, pushName: 'Jan' })).toEqual({
      id: 'A1', jid: P, richting: 'in', tekst: 'Hey', media_type: null, tijdstip: '2025-11-17T12:00:00.000Z', afzender: null,
    })
    expect(toRow({ key: { remoteJid: P, id: 'A2', fromMe: true }, message: { conversation: 'Top' }, messageTimestamp: 1763380800 })!.richting).toBe('uit')
    expect(toRow({ key: { remoteJid: G, id: 'A3', participant: '32470999999@s.whatsapp.net' }, message: { conversation: 'Ok' }, messageTimestamp: 1763380800 })!.afzender).toBe('+32470999999')
    expect(toRow({ key: { remoteJid: G, id: 'A4', participant: 'x' }, message: { conversation: 'Ok' }, messageTimestamp: 1763380800, pushName: 'Lies' })!.afzender).toBe('Lies')
    expect(toRow({ key: { remoteJid: 'status@broadcast', id: 'S' }, message: { conversation: 'x' }, messageTimestamp: 1 })).toBeNull()
  })
})

describe('read-only slot', () => {
  it('versturen, gelezen markeren en presence gooien een fout; lezen blijft', async () => {
    const sent: string[] = []
    const sock = { sendMessage: () => sent.push('m'), readMessages: () => sent.push('r'), sendPresenceUpdate: () => sent.push('p'), fetchMessageHistory: () => sent.push('h'), groupMetadata: () => 'ok', ev: {} }
    lockDown(sock)
    expect(() => sock.sendMessage()).toThrow(/read-only/)
    expect(() => sock.readMessages()).toThrow(/read-only/)
    expect(() => sock.sendPresenceUpdate()).toThrow(/read-only/)
    expect(() => sock.fetchMessageHistory()).toThrow(/read-only/)
    expect(sock.groupMetadata()).toBe('ok')
    expect(sent).toEqual([])
    const allowed = { fetchMessageHistory: () => 'ok', sendMessage: () => 'x' }
    lockDown(allowed, ['fetchMessageHistory'])
    expect(allowed.fetchMessageHistory()).toBe('ok')
    expect(() => allowed.sendMessage()).toThrow()
    expect(FORBIDDEN_METHODS).toEqual(expect.arrayContaining(['sendMessage', 'readMessages', 'sendReceipts', 'sendPresenceUpdate', 'chatModify', 'relayMessage']))
  })
})
