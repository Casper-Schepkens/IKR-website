import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { batches, brusselsIso, parseExport, textFromZip, toImportRows } from './export'

const IOS = [
  '‎[17/11/2026, 14:05:33] IKR × Chez Albert: ‎Berichten en oproepen zijn end-to-end versleuteld.',
  '[17/11/2026, 14:05:40] Casper: Hoi allemaal! Draaidag dinsdag?',
  '[17/11/2026, 14:06:02] Jan Peeters: Top, past.',
  'Ik breng de koffie mee ☕',
  '‎[17/11/2026, 14:07:10] Jan Peeters: ‎<bijgevoegd: 00000012-PHOTO-2026-11-17-14-07-10.jpg>',
  '[17/11/2026, 14:08:00] Milan: Dit bericht is verwijderd',
  '[17/11/2026, 14:09:00] Milan: Briefing volgt <Dit bericht is bewerkt>',
].join('\n')

const ANDROID = [
  '17-11-2026 14:05 - Berichten en oproepen zijn end-to-end versleuteld. Tik voor meer info.',
  '17-11-2026 14:05 - Casper heeft Jan toegevoegd',
  '17-11-2026 14:06 - Jan: <Media weggelaten>',
  '17-11-2026 21:30 - Cédric: Ok: dan zo',
].join('\n')

describe('WhatsApp-export lezen', () => {
  it('iPhone: meerdere regels, bijlagen, verwijderd en bewerkt; systeemregels overgeslagen', () => {
    const p = parseExport(IOS)
    expect(p.messages.map((m) => [m.time, m.afzender, m.tekst, m.media_type])).toEqual([
      ['14:05:40', 'Casper', 'Hoi allemaal! Draaidag dinsdag?', null],
      ['14:06:02', 'Jan Peeters', 'Top, past.\nIk breng de koffie mee ☕', null],
      ['14:07:10', 'Jan Peeters', null, 'image'],
      ['14:09:00', 'Milan', 'Briefing volgt', null],
    ])
    expect(p.senders).toEqual(['Casper', 'Jan Peeters', 'Milan'])
    expect(p.skipped).toBe(2)
  })
  it('Android: streepje, media weggelaten, dubbelpunt in de tekst', () => {
    const p = parseExport(ANDROID)
    expect(p.messages.map((m) => [m.date, m.time, m.afzender, m.tekst, m.media_type])).toEqual([
      ['2026-11-17', '14:06:00', 'Jan', null, 'other'],
      ['2026-11-17', '21:30:00', 'Cédric', 'Ok: dan zo', null],
    ])
  })
  it('Amerikaanse volgorde (maand eerst, AM/PM) wordt herkend', () => {
    const p = parseExport('11/17/26, 2:05 PM - Jan: Hi\n11/18/26, 12:01 AM - Jan: Late')
    expect(p.messages.map((m) => [m.date, m.time])).toEqual([
      ['2026-11-17', '14:05:00'],
      ['2026-11-18', '00:01:00'],
    ])
  })
  it('Belgische tijd → UTC (winter en zomer)', () => {
    expect(brusselsIso('2026-11-17', '14:05:33')).toBe('2026-11-17T13:05:33.000Z')
    expect(brusselsIso('2026-07-01', '14:05:00')).toBe('2026-07-01T12:05:00.000Z')
  })
  it('rijen: jouw naam = uit; zelfde bericht = zelfde id (geen dubbels bij opnieuw importeren)', () => {
    const rows = toImportRows(parseExport(IOS), 'Casper')
    expect(rows.map((r) => r.richting)).toEqual(['uit', 'in', 'in', 'in'])
    expect(toImportRows(parseExport(IOS), 'Casper').map((r) => r.id)).toEqual(rows.map((r) => r.id))
    // Twee identieke berichten op dezelfde seconde krijgen elk een eigen id.
    const twice = toImportRows(parseExport('[1/1/2026, 10:00:00] Jan: ok\n[1/1/2026, 10:00:00] Jan: ok'), null)
    expect(new Set(twice.map((r) => r.id)).size).toBe(2)
  })
  it('in groepjes onder de limiet', () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({ i }))
    expect(batches(rows).map((b) => b.length)).toEqual([500, 500, 200])
  })
})

/** Minimale zip met één bestand (deflate), zoals WhatsApp op iPhone. */
function zip(name: string, text: string) {
  const data = deflateRawSync(Buffer.from(text, 'utf8'))
  const n = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(Buffer.byteLength(text), 22)
  local.writeUInt16LE(n.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(Buffer.byteLength(text), 24)
  central.writeUInt16LE(n.length, 28)
  central.writeUInt32LE(0, 42)
  const cdOffset = local.length + n.length + data.length
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + n.length, 12)
  end.writeUInt32LE(cdOffset, 16)
  const all = Buffer.concat([local, n, data, central, n, end])
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength) as ArrayBuffer
}

describe('zip van iPhone', () => {
  it('leest _chat.txt uit de zip', async () => {
    expect(await textFromZip(zip('_chat.txt', IOS))).toBe(IOS)
  })
  it('duidelijke fout bij een ander bestand', async () => {
    await expect(textFromZip(new ArrayBuffer(40))).rejects.toThrow(/geen geldig zip/)
  })
})
