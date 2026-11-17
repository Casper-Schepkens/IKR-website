import { isGroup, isRelevantJid, timestampIso, toRow, type BerichtRij, type RawMessage } from './extract.js'

/** Metadata van een chat (nooit inhoud): naam, laatste activiteit, sleutel van het laatste bericht. */
export type ChatMeta = {
  jid: string
  naam?: string
  /** Telefoonnummer (+32…) bij een chat met een anoniem id (@lid), als WhatsApp het meegeeft. */
  telefoon?: string
  is_groep: boolean
  /** Groep met het hele team (Casper + TEAM_NUMMERS): meestal een klantgroep. */
  hele_team?: boolean
  deelnemers?: number
  laatst_actief?: string
  laatste_bericht_id?: string
  laatste_bericht_van_mij?: boolean
}
export type HistoryRequest = { jid: string; laatste_bericht_id: string; laatste_bericht_van_mij: boolean; laatst_actief: string }

export interface BridgeDb {
  /** jid's van chats met actief = true. */
  activeJids(): Promise<Set<string>>
  /** Alle bekende chats met hun laatste activiteit (om oudere historiek niets te laten terugzetten). */
  knownChats(): Promise<Map<string, string | null>>
  upsertChats(rows: ChatMeta[]): Promise<void>
  /** Berichten bewaren (dubbele negeren). */
  insertMessages(rows: BerichtRij[]): Promise<void>
  /** Actieve chats waarvoor de historiek nog niet opgevraagd werd. */
  pendingHistory(): Promise<HistoryRequest[]>
  markHistoryRequested(jid: string): Promise<void>
}

/** Namen en LID→nummer, bewaard op het volume zodat ze een herstart overleven (WhatsApp stuurt ze maar één keer). */
export type SavedNames = { names: Record<string, { naam: string; bron: NameSource }>; pn: Record<string, string> }
export interface NameStore {
  load(): Promise<SavedNames | null>
  save(v: SavedNames): Promise<void>
}

type Chat = { id?: string | null; name?: string | null; subject?: string | null; conversationTimestamp?: RawMessage['messageTimestamp'] }
type Contact = { id?: string | null; lid?: string | null; jid?: string | null; name?: string | null; notify?: string | null; verifiedName?: string | null }

/** Hoe zeker een naam is: je eigen opgeslagen naam of de groepsnaam gaat voor op de WhatsApp-naam van het contact. */
type NameSource = 'adresboek' | 'groep' | 'whatsapp'
const RANK: Record<NameSource, number> = { adresboek: 3, groep: 3, whatsapp: 1 }

const ACTIVE_TTL_MS = 30_000
/** Enkel de cijfers van een nummer, 0… → 32… (Belgisch). */
export const digits = (v: string | null | undefined) => {
  const d = (v ?? '').replace(/\D/g, '').replace(/^00/, '')
  return d.startsWith('0') ? `32${d.slice(1)}` : d
}
const pnToPhone = (jid: string | null | undefined) => {
  const m = jid?.match(/^(\d{6,16})(?::\d+)?@s\.whatsapp\.net$/)
  return m ? `+${m[1]}` : undefined
}

/**
 * Verwerkt de events van de socket: chats worden altijd gedetecteerd (enkel naam, nummer en tijdstip),
 * berichten worden enkel bewaard voor chats met actief = true. Ook de historiek-sync.
 */
export class Recorder {
  private active = new Set<string>()
  private activeAt = 0
  private known = new Map<string, string | null>()
  private names = new Map<string, { naam: string; bron: NameSource }>()
  private pn = new Map<string, string>()
  private loaded = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly db: BridgeDb,
    private readonly log: (msg: string, extra?: Record<string, unknown>) => void = () => {},
    private readonly now: () => number = Date.now,
    private readonly store: NameStore | null = null,
  ) {}

  private async load() {
    if (this.loaded) return
    this.loaded = true
    this.known = await this.db.knownChats()
    const saved = await this.store?.load().catch(() => null)
    if (saved) {
      for (const [jid, n] of Object.entries(saved.names ?? {})) this.names.set(jid, n)
      for (const [lid, pn] of Object.entries(saved.pn ?? {})) this.pn.set(lid, pn)
    }
  }

  /** Actieve chats (hooguit 30 s oud; force = meteen opnieuw lezen). */
  async activeSet(force = false) {
    await this.load()
    if (force || this.now() - this.activeAt > ACTIVE_TTL_MS) {
      this.active = await this.db.activeJids()
      this.activeAt = this.now()
    }
    return this.active
  }

  nameOf = (jid: string) => this.names.get(jid)?.naam ?? null

  /** Naam onthouden als ze minstens even zeker is als wat we al hadden. true = gewijzigd. */
  private setName(jid: string, naam: string | null | undefined, bron: NameSource) {
    const n = naam?.trim()
    if (!n) return false
    const cur = this.names.get(jid)
    if (cur && (cur.naam === n || RANK[cur.bron] > RANK[bron])) return false
    this.names.set(jid, { naam: n.slice(0, 300), bron })
    this.scheduleSave()
    return true
  }

  private setPn(lid: string | null | undefined, pnJid: string | null | undefined) {
    if (!lid?.endsWith('@lid') || !pnToPhone(pnJid) || this.pn.get(lid) === pnJid) return false
    this.pn.set(lid, pnJid!)
    this.scheduleSave()
    return true
  }

  private scheduleSave() {
    if (!this.store || this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.store!.save({ names: Object.fromEntries(this.names), pn: Object.fromEntries(this.pn) }).catch((e) => this.log('Namen bewaren mislukt', { fout: String(e) }))
    }, 5_000)
    this.saveTimer.unref?.()
  }

  /** Naam en nummer voor een chatrij (enkel wat we weten). */
  private meta(jid: string): ChatMeta {
    const pnJid = this.pn.get(jid)
    const naam = this.nameOf(jid) ?? (pnJid ? this.nameOf(pnJid) : null)
    const telefoon = jid.endsWith('@lid') ? pnToPhone(pnJid) : undefined
    return { jid, is_groep: isGroup(jid), ...(naam ? { naam } : {}), ...(telefoon ? { telefoon } : {}) }
  }

  /** Contacten (adresboek of WhatsApp-naam): namen van bekende chats meteen bijwerken. */
  async onContacts(contacts: Contact[]) {
    await this.load()
    const changed = new Set<string>()
    for (const c of contacts) {
      if (!c.id) continue
      const ids = [c.id, c.lid, c.jid].filter((x): x is string => Boolean(x))
      for (const id of ids) {
        if (this.setName(id, c.name, 'adresboek')) changed.add(id)
        if (this.setName(id, c.notify ?? c.verifiedName, 'whatsapp')) changed.add(id)
      }
      const lid = ids.find((x) => x.endsWith('@lid'))
      const pnJid = ids.find((x) => x.endsWith('@s.whatsapp.net'))
      if (this.setPn(lid, pnJid)) changed.add(lid!)
    }
    await this.writeNames([...changed])
  }

  /** LID ↔ nummer (event chats.phoneNumberShare of uit een bericht). */
  async onPhoneNumber(lid: string, pnJid: string) {
    await this.load()
    if (this.setPn(lid, pnJid)) await this.writeNames([lid])
  }

  /** Bijgewerkte namen wegschrijven, enkel voor chats die al bestaan (geen rij per adresboekcontact). */
  private async writeNames(jids: string[]) {
    const rows: ChatMeta[] = []
    for (const jid of new Set(jids)) {
      if (this.known.has(jid)) rows.push(this.meta(jid))
      // Een nummer-chat waarvan de LID-chat bekend is (of omgekeerd): ook die bijwerken.
      for (const [lid, pnJid] of this.pn) if (pnJid === jid && this.known.has(lid)) rows.push(this.meta(lid))
    }
    const useful = rows.filter((r) => r.naam || r.telefoon)
    if (useful.length) await this.db.upsertChats(useful)
  }

  /**
   * Groepen uit de groepslijst: naam, aantal deelnemers en of het hele team erin zit
   * (alle nummers uit TEAM_NUMMERS; Casper zelf zit per definitie in zijn eigen groepen).
   */
  async onGroups(groups: { id: string; subject?: string | null; participants?: { id?: string | null; jid?: string | null }[] }[], teamNumbers: string[]) {
    await this.load()
    const team = teamNumbers.map(digits).filter(Boolean)
    const rows: ChatMeta[] = []
    for (const g of groups) {
      if (!isRelevantJid(g.id) || !isGroup(g.id)) continue
      this.setName(g.id, g.subject, 'groep')
      const members = new Set((g.participants ?? []).flatMap((p) => [p.jid, p.id]).map((j) => digits(pnToPhone(j))).filter(Boolean))
      rows.push({
        ...this.meta(g.id),
        deelnemers: g.participants?.length ?? 0,
        ...(team.length ? { hele_team: team.every((t) => members.has(t)) } : {}),
      })
    }
    if (rows.length) {
      await this.db.upsertChats(rows)
      for (const r of rows) if (!this.known.has(r.jid)) this.known.set(r.jid, null)
    }
    return rows
  }

  /** Chats (historiek-sync, chats.upsert of groepen): enkel metadata. */
  async onChats(chats: Chat[], contacts: Contact[] = [], bron: NameSource = 'whatsapp') {
    if (contacts.length) await this.onContacts(contacts)
    await this.activeSet()
    const rows: ChatMeta[] = []
    for (const c of chats) {
      if (!isRelevantJid(c.id)) continue
      // Een groepsnaam (subject) is zeker; bij personen gaat het adresboek voor.
      this.setName(c.id, c.subject ?? c.name, isGroup(c.id) ? 'groep' : bron)
      const at = timestampIso(c.conversationTimestamp) ?? undefined
      rows.push({ ...this.meta(c.id), ...(at && this.isNewer(c.id, at) ? { laatst_actief: at } : {}) })
    }
    if (rows.length) {
      await this.db.upsertChats(rows)
      for (const r of rows) if (!this.known.has(r.jid) || r.laatst_actief) this.known.set(r.jid, r.laatst_actief ?? this.known.get(r.jid) ?? null)
    }
  }

  /** Berichten (live of uit de historiek): chat detecteren, en enkel bewaren als de chat actief is. */
  async onMessages(messages: RawMessage[], source: 'live' | 'historiek') {
    const active = await this.activeSet()
    const chats = new Map<string, ChatMeta>()
    const keep: BerichtRij[] = []
    let skipped = 0
    for (const m of messages) {
      const jid = m.key?.remoteJid
      if (!isRelevantJid(jid)) continue
      const at = timestampIso(m.messageTimestamp)
      // Naam van een persoon: zijn pushName (nooit die van onszelf). Nummer bij een anoniem id.
      if (!isGroup(jid) && !m.key?.fromMe) this.setName(jid, m.pushName, 'whatsapp')
      if (jid.endsWith('@lid')) this.setPn(jid, m.key?.senderPn)
      const meta = { ...(chats.get(jid) ?? {}), ...this.meta(jid) }
      const prev = chats.get(jid)
      if (prev?.laatst_actief) Object.assign(meta, { laatst_actief: prev.laatst_actief, laatste_bericht_id: prev.laatste_bericht_id, laatste_bericht_van_mij: prev.laatste_bericht_van_mij })
      if (at && m.key?.id && this.isNewer(jid, at) && (!meta.laatst_actief || at > meta.laatst_actief)) {
        meta.laatst_actief = at
        meta.laatste_bericht_id = m.key.id
        meta.laatste_bericht_van_mij = Boolean(m.key.fromMe)
      }
      chats.set(jid, meta)
      if (!active.has(jid)) {
        skipped++
        continue
      }
      const row = toRow(m, this.nameOf)
      if (row) keep.push(row)
    }
    if (chats.size) await this.db.upsertChats([...chats.values()])
    for (const c of chats.values()) this.known.set(c.jid, c.laatst_actief ?? this.known.get(c.jid) ?? null)
    if (keep.length) await this.db.insertMessages(keep)
    if (keep.length || source === 'historiek') this.log(`${source}: ${keep.length} bewaard, ${skipped} genegeerd (niet actief)`)
    return { kept: keep.length, skipped }
  }

  private isNewer(jid: string, at: string) {
    const known = this.known.get(jid)
    return !known || at > known
  }
}
