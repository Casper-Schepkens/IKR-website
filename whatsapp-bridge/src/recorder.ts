import { isGroup, isRelevantJid, timestampIso, toRow, type BerichtRij, type RawMessage } from './extract.js'

/** Metadata van een chat (nooit inhoud): naam, laatste activiteit, sleutel van het laatste bericht. */
export type ChatMeta = {
  jid: string
  naam?: string
  is_groep: boolean
  laatst_actief?: string
  laatste_bericht_id?: string
  laatste_bericht_van_mij?: boolean
}
export type HistoryRequest = { jid: string; laatste_bericht_id: string; laatste_bericht_van_mij: boolean; laatst_actief: string }

export interface BridgeDb {
  /** jid's van chats met actief = true. */
  activeJids(): Promise<Set<string>>
  /** Laatst gekende activiteit per chat (om oudere historiek niets te laten terugzetten). */
  lastActivity(): Promise<Map<string, string>>
  upsertChats(rows: ChatMeta[]): Promise<void>
  /** Berichten bewaren (dubbele negeren). */
  insertMessages(rows: BerichtRij[]): Promise<void>
  /** Actieve chats waarvoor de historiek nog niet opgevraagd werd. */
  pendingHistory(): Promise<HistoryRequest[]>
  markHistoryRequested(jid: string): Promise<void>
}

type Chat = { id?: string | null; name?: string | null; subject?: string | null; conversationTimestamp?: RawMessage['messageTimestamp'] }
type Contact = { id?: string | null; name?: string | null; notify?: string | null; verifiedName?: string | null }

const ACTIVE_TTL_MS = 30_000

/**
 * Verwerkt de events van de socket: chats worden altijd gedetecteerd (enkel naam en tijdstip),
 * berichten worden enkel bewaard voor chats met actief = true. Ook de historiek-sync.
 */
export class Recorder {
  private active = new Set<string>()
  private activeAt = 0
  private last = new Map<string, string>()
  private names = new Map<string, string>()
  private loaded = false

  constructor(
    private readonly db: BridgeDb,
    private readonly log: (msg: string, extra?: Record<string, unknown>) => void = () => {},
    private readonly now: () => number = Date.now,
  ) {}

  /** Actieve chats (hooguit 30 s oud; force = meteen opnieuw lezen). */
  async activeSet(force = false) {
    if (force || this.now() - this.activeAt > ACTIVE_TTL_MS) {
      this.active = await this.db.activeJids()
      this.activeAt = this.now()
    }
    if (!this.loaded) {
      this.last = await this.db.lastActivity()
      this.loaded = true
    }
    return this.active
  }

  nameOf = (jid: string) => this.names.get(jid) ?? null

  rememberContacts(contacts: Contact[]) {
    for (const c of contacts) {
      const n = c.name ?? c.notify ?? c.verifiedName
      if (c.id && n) this.names.set(c.id, n)
    }
  }

  /** Chats en contacten (bv. uit de historiek-sync of chats.upsert): enkel metadata. */
  async onChats(chats: Chat[], contacts: Contact[] = []) {
    this.rememberContacts(contacts)
    await this.activeSet()
    const rows: ChatMeta[] = []
    for (const c of chats) {
      if (!isRelevantJid(c.id)) continue
      const naam = c.name ?? c.subject ?? this.names.get(c.id) ?? undefined
      const at = timestampIso(c.conversationTimestamp) ?? undefined
      rows.push({ jid: c.id, is_groep: isGroup(c.id), ...(naam ? { naam } : {}), ...(at && this.isNewer(c.id, at) ? { laatst_actief: at } : {}) })
    }
    if (rows.length) await this.db.upsertChats(rows)
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
      const meta = chats.get(jid) ?? { jid, is_groep: isGroup(jid) }
      // Naam van een persoon: zijn pushName (nooit die van onszelf).
      if (!isGroup(jid) && !m.key?.fromMe && m.pushName && !this.names.has(jid)) this.names.set(jid, m.pushName)
      const naam = this.names.get(jid)
      if (naam) meta.naam = naam
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
    for (const c of chats.values()) if (c.laatst_actief) this.last.set(c.jid, c.laatst_actief)
    if (keep.length) await this.db.insertMessages(keep)
    if (keep.length || source === 'historiek') this.log(`${source}: ${keep.length} bewaard, ${skipped} genegeerd (niet actief)`)
    return { kept: keep.length, skipped }
  }

  private isNewer(jid: string, at: string) {
    const known = this.last.get(jid)
    return !known || at > known
  }
}
