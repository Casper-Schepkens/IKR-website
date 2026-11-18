/**
 * Import van een WhatsApp-export ("Chat exporteren" op iPhone of Android): .txt, of .zip met _chat.txt.
 * Puur (ook in de browser): het bestand wordt in de browser gelezen, enkel de berichten gaan naar de server.
 */

export type ExportMessage = {
  /** Lokale tijd in België zoals in de export. */
  date: string
  time: string
  afzender: string
  tekst: string | null
  media_type: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'other' | null
}
export type ParsedExport = { messages: ExportMessage[]; senders: string[]; skipped: number }

// [17/11/2026, 14:05:33] Naam: …   |   17/11/2026, 14:05 - Naam: …   |   11/17/26, 2:05 PM - Name: …
const LINE = /^\[?(\d{1,2})[./-](\d{1,2})[./-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:\s*([AaPp])\.?\s?[Mm]\.?)?\]?\s*(?:-\s)?(.*)$/
const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g

const MEDIA: [RegExp, NonNullable<ExportMessage['media_type']>][] = [
  [/^<?(media weggelaten|media omitted)>?$/i, 'other'],
  [/^(afbeelding|image|foto|photo) (weggelaten|omitted)$/i, 'image'],
  [/^(video) (weggelaten|omitted)$/i, 'video'],
  [/^(audio|spraakbericht) (weggelaten|omitted)$/i, 'audio'],
  [/^(sticker) (weggelaten|omitted)$/i, 'sticker'],
  [/^(gif) (weggelaten|omitted)$/i, 'video'],
  [/^(document|bestand) (weggelaten|omitted)$/i, 'document'],
  [/^.+ • \d+ pagina'?s? (document weggelaten|document omitted)$/i, 'document'],
]
const DELETED = /^(dit bericht is verwijderd|this message was deleted|je hebt dit bericht verwijderd|you deleted this message)\.?$/i
const EDITED = /\s*<(dit bericht is bewerkt|this message was edited)>$/i
/** Systeemmeldingen (op iPhone staan die onder de groepsnaam alsof het een afzender is). */
const SYSTEM = [
  /end-to-end (versleuteld|encrypted|chiffrés)/i,
  /^(heeft|maakte|created|changed|wijzigde|veranderde|added|removed|left|joined|verliet|is nu (een )?beheerder|is no longer an admin|is now an admin)\b/i,
  /\b(heeft|has) (de groep|deze groep|the group|this group) (gemaakt|aangemaakt|created)\b/i,
  /\b(heeft|has) (.+ )?(toegevoegd|verwijderd|added|removed)$/i,
  /\b(groepsnaam|onderwerp|beschrijving|groepsafbeelding|group (name|subject|description|icon))\b.*\b(gewijzigd|veranderd|changed)\b/i,
  /^(berichten verdwijnen|disappearing messages)/i,
  /^(beveiligingscode|your security code)/i,
]

/** "<bijgevoegd: 00000012-PHOTO-2026-11-17-14-05-33.jpg>" → soort media + rest van de tekst. */
function attachment(text: string): { media: ExportMessage['media_type']; rest: string } | null {
  const m = text.match(/^<(?:bijgevoegd|attached|anexo|pièce jointe|angehängt):\s*([^>]+)>\s*([\s\S]*)$/i)
  if (!m) return null
  const f = m[1].toUpperCase()
  const media = /PHOTO|\.JPE?G|\.PNG|\.HEIC/.test(f) ? 'image' : /VIDEO|\.MP4|\.MOV/.test(f) ? 'video' : /AUDIO|\.OPUS|\.M4A|\.MP3/.test(f) ? 'audio' : /STICKER|\.WEBP/.test(f) ? 'sticker' : 'document'
  return { media, rest: m[2].trim() }
}

function content(raw: string): Pick<ExportMessage, 'tekst' | 'media_type'> | null {
  const text = raw.replace(EDITED, '').trim()
  if (!text || DELETED.test(text)) return null
  if (text.length < 300 && SYSTEM.some((re) => re.test(text))) return null
  const att = attachment(text)
  if (att) return { tekst: att.rest || null, media_type: att.media }
  for (const [re, type] of MEDIA) if (re.test(text)) return { tekst: null, media_type: type }
  return { tekst: text.slice(0, 20_000), media_type: null }
}

/** Leest de tekst van een export. Dag of maand eerst wordt uit het bestand afgeleid (standaard dag eerst, zoals in België). */
export function parseExport(input: string): ParsedExport {
  const lines = input.replace(/\r\n?/g, '\n').replace(INVISIBLE, '').replace(/[  ]/g, ' ').split('\n')
  type Raw = { a: number; b: number; y: number; h: number; mi: number; s: number; ampm: string | undefined; rest: string }
  const raws: Raw[] = []
  for (const line of lines) {
    const m = line.match(LINE)
    if (m) {
      raws.push({ a: +m[1], b: +m[2], y: +m[3], h: +m[4], mi: +m[5], s: m[6] ? +m[6] : 0, ampm: m[7]?.toLowerCase(), rest: m[8] })
    } else if (raws.length) {
      // Vervolg van het vorige bericht (meerdere regels).
      raws[raws.length - 1].rest += `\n${line}`
    }
  }
  const monthFirst = raws.some((r) => r.b > 12) && !raws.some((r) => r.a > 12)
  const messages: ExportMessage[] = []
  let skipped = 0
  for (const r of raws) {
    const [d, mo] = monthFirst ? [r.b, r.a] : [r.a, r.b]
    const y = r.y < 100 ? 2000 + r.y : r.y
    let h = r.h
    if (r.ampm === 'p' && h < 12) h += 12
    if (r.ampm === 'a' && h === 12) h = 0
    const sep = r.rest.indexOf(': ')
    // Zonder "Naam: " is het een systeemregel (versleuteling, iemand toegevoegd …): overslaan.
    if (sep <= 0 || mo < 1 || mo > 12 || d < 1 || d > 31) {
      skipped++
      continue
    }
    const afzender = r.rest.slice(0, sep).trim()
    const c = content(r.rest.slice(sep + 2))
    if (!afzender || !c) {
      skipped++
      continue
    }
    const p2 = (n: number) => String(n).padStart(2, '0')
    messages.push({ date: `${y}-${p2(mo)}-${p2(d)}`, time: `${p2(h)}:${p2(r.mi)}:${p2(r.s)}`, afzender, ...c })
  }
  const senders = [...new Set(messages.map((m) => m.afzender))]
  return { messages, senders, skipped }
}

/** Lokale tijd in België → ISO (UTC), ook rond de zomertijd. */
export function brusselsIso(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, ss || 0)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(asUtc))
      .map((p) => [p.type, p.value]),
  )
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return new Date(asUtc - (shown - asUtc)).toISOString()
}

/** Korte, stabiele hash (geen crypto nodig): zelfde bericht = zelfde id, dus opnieuw importeren geeft geen dubbels. */
function hash(s: string) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
  }
  return h1.toString(36) + h2.toString(36)
}

export type ImportRow = { id: string; richting: 'in' | 'uit'; tekst: string | null; media_type: string | null; tijdstip: string; afzender: string | null }

/** Rijen voor whatsapp_berichten. self = jouw naam in de export (dan "uit"). */
export function toImportRows(parsed: ParsedExport, self: string | null): ImportRow[] {
  const seen = new Map<string, number>()
  return parsed.messages.map((m) => {
    const base = `${m.date} ${m.time}|${m.afzender}|${m.media_type ?? ''}|${m.tekst ?? ''}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return {
      id: `imp-${hash(`${base}|${n}`)}`,
      richting: self && m.afzender === self ? 'uit' : 'in',
      tekst: m.tekst,
      media_type: m.media_type,
      tijdstip: brusselsIso(m.date, m.time),
      afzender: m.afzender.slice(0, 300),
    }
  })
}

/** Groepjes voor de server (onder de limiet van een serveractie). */
export function batches<T>(rows: T[], maxBytes = 400_000, maxRows = 500): T[][] {
  const out: T[][] = []
  let cur: T[] = []
  let size = 0
  for (const r of rows) {
    const s = JSON.stringify(r).length
    if (cur.length && (size + s > maxBytes || cur.length >= maxRows)) {
      out.push(cur)
      cur = []
      size = 0
    }
    cur.push(r)
    size += s
  }
  if (cur.length) out.push(cur)
  return out
}

/**
 * Tekst uit een .zip van WhatsApp (iPhone geeft altijd een zip): zoekt _chat.txt of de eerste .txt.
 * Zonder bibliotheek: centrale map lezen, en "deflate" uitpakken met DecompressionStream.
 */
export async function textFromZip(buf: ArrayBuffer): Promise<string> {
  const v = new DataView(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66_000); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  if (eocd < 0) throw new Error('Dit is geen geldig zip-bestand.')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const entries: { name: string; method: number; size: number; offset: number }[] = []
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const method = v.getUint16(p + 10, true)
    const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const extraLen = v.getUint16(p + 30, true)
    const commentLen = v.getUint16(p + 32, true)
    const offset = v.getUint32(p + 42, true)
    entries.push({ name: dec.decode(new Uint8Array(buf, p + 46, nameLen)), method, size, offset })
    p += 46 + nameLen + extraLen + commentLen
  }
  const txt = entries.filter((e) => /\.txt$/i.test(e.name) && !e.name.startsWith('__MACOSX'))
  const e = txt.find((x) => /_chat\.txt$/i.test(x.name)) ?? txt.find((x) => /chat/i.test(x.name)) ?? txt[0]
  if (!e) throw new Error('Geen chattekst (.txt) gevonden in de zip.')
  const start = e.offset + 30 + v.getUint16(e.offset + 26, true) + v.getUint16(e.offset + 28, true)
  const data = new Uint8Array(buf, start, e.size)
  if (e.method === 0) return dec.decode(data)
  if (e.method !== 8) throw new Error('Onbekende compressie in de zip.')
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return await new Response(stream).text()
}
