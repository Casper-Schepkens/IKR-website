/**
 * Pure helpers: welke chats tellen, en wat we van een bericht bewaren (tekst, soort media, richting, tijd).
 * Geen netwerk, geen Baileys-socket: zo zijn ze los te testen.
 */

export type Richting = 'in' | 'uit'
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'poll' | 'other'

export type BerichtRij = {
  id: string
  jid: string
  richting: Richting
  tekst: string | null
  media_type: MediaType | null
  tijdstip: string
  /** Bij groepen: wie het bericht stuurde (naam of nummer). */
  afzender: string | null
}

/** Minimale vorm van een Baileys-bericht (WAMessage) die we gebruiken. */
export type RawMessage = {
  key?: { remoteJid?: string | null; fromMe?: boolean | null; id?: string | null; participant?: string | null; senderPn?: string | null } | null
  message?: Record<string, unknown> | null
  messageTimestamp?: number | { toNumber(): number } | { low: number; high: number } | string | null
  pushName?: string | null
}

/** Status-updates, nieuwsbrieven en broadcastlijsten slaan we over; enkel personen en groepen. */
export function isRelevantJid(jid: string | null | undefined): jid is string {
  if (!jid) return false
  if (jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) return false
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us') || jid.endsWith('@lid')
}

export const isGroup = (jid: string) => jid.endsWith('@g.us')

/** Telefoonnummer uit een persoonlijke jid (voor weergave), anders null. */
export function phoneOf(jid: string): string | null {
  const m = jid.match(/^(\d+)(?::\d+)?@s\.whatsapp\.net$/)
  return m ? `+${m[1]}` : null
}

/** messageTimestamp (seconden; number, Long of string) → ISO-tijdstip. */
export function timestampIso(ts: RawMessage['messageTimestamp']): string | null {
  let s: number | null = null
  if (typeof ts === 'number') s = ts
  else if (typeof ts === 'string' && /^\d+$/.test(ts)) s = Number(ts)
  else if (ts && typeof ts === 'object') {
    if ('toNumber' in ts && typeof ts.toNumber === 'function') s = ts.toNumber()
    else if ('low' in ts) s = (ts.high >>> 0) * 2 ** 32 + (ts.low >>> 0)
  }
  if (!s || !Number.isFinite(s) || s <= 0) return null
  return new Date(s * 1000).toISOString()
}

const WRAPPERS = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage', 'deviceSentMessage']
/** Inhoud zonder omhulsels (verdwijnende berichten, eenmalig bekijken, document met bijschrift …). */
function unwrap(m: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  let cur = m ?? null
  for (let i = 0; cur && i < 5; i++) {
    const key = WRAPPERS.find((k) => cur![k])
    if (!key) break
    cur = ((cur[key] as { message?: Record<string, unknown> }).message ?? null) as Record<string, unknown> | null
  }
  return cur
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)

/**
 * Tekst en soort media van een bericht. null = niets om te bewaren (reacties, protocolberichten,
 * sleutelverdeling, verwijderingen …).
 */
export function messageContent(raw: Record<string, unknown> | null | undefined): { tekst: string | null; media_type: MediaType | null } | null {
  const m = unwrap(raw)
  if (!m) return null
  const get = <T = Record<string, unknown>>(k: string) => (m[k] ?? null) as T | null
  if (str(m.conversation)) return { tekst: m.conversation as string, media_type: null }
  const ext = get<{ text?: string }>('extendedTextMessage')
  if (ext && str(ext.text)) return { tekst: ext.text!, media_type: null }
  const media: [string, MediaType, (v: Record<string, unknown>) => string | null][] = [
    ['imageMessage', 'image', (v) => str(v.caption)],
    ['videoMessage', 'video', (v) => str(v.caption)],
    ['ptvMessage', 'video', () => null],
    ['audioMessage', 'audio', () => null],
    ['documentMessage', 'document', (v) => str(v.caption) ?? str(v.fileName) ?? str(v.title)],
    ['stickerMessage', 'sticker', () => null],
    ['locationMessage', 'location', (v) => str(v.name) ?? str(v.address)],
    ['liveLocationMessage', 'location', (v) => str(v.caption)],
    ['contactMessage', 'contact', (v) => str(v.displayName)],
    ['contactsArrayMessage', 'contact', (v) => str(v.displayName)],
    ['pollCreationMessage', 'poll', (v) => str(v.name)],
    ['pollCreationMessageV2', 'poll', (v) => str(v.name)],
    ['pollCreationMessageV3', 'poll', (v) => str(v.name)],
  ]
  for (const [k, type, text] of media) {
    const v = get(k)
    if (v) return { tekst: text(v), media_type: type }
  }
  // Wel inhoud, maar geen bekend soort (bv. knoppen, betaalverzoek): enkel "other" als er iets leesbaars is.
  const skip = ['protocolMessage', 'reactionMessage', 'senderKeyDistributionMessage', 'messageContextInfo', 'pollUpdateMessage', 'keepInChatMessage', 'pinInChatMessage', 'encReactionMessage']
  const keys = Object.keys(m).filter((k) => m[k] != null && !skip.includes(k))
  return keys.length ? { tekst: null, media_type: 'other' } : null
}

/** Een bericht als rij voor whatsapp_berichten, of null als er niets te bewaren valt. */
export function toRow(msg: RawMessage, names: (jid: string) => string | null = () => null): BerichtRij | null {
  const jid = msg.key?.remoteJid
  const id = msg.key?.id
  if (!isRelevantJid(jid) || !id) return null
  const content = messageContent(msg.message)
  const tijdstip = timestampIso(msg.messageTimestamp)
  if (!content || !tijdstip) return null
  const fromMe = Boolean(msg.key?.fromMe)
  const participant = msg.key?.participant ?? null
  const afzender = isGroup(jid) && !fromMe ? (str(msg.pushName) ?? (participant ? (names(participant) ?? phoneOf(participant) ?? participant) : null)) : null
  return { id, jid, richting: fromMe ? 'uit' : 'in', tekst: content.tekst ? content.tekst.slice(0, 20_000) : null, media_type: content.media_type, tijdstip, afzender }
}

/**
 * Methodes van de socket die iets versturen, als gelezen markeren of je status/profiel aanpassen.
 * lockDown vervangt ze door een functie die meteen een fout geeft: zo kan ook een latere wijziging
 * aan deze code nooit per ongeluk iets versturen.
 */
export const FORBIDDEN_METHODS = [
  'sendMessage',
  'relayMessage',
  'readMessages',
  'sendReceipts',
  'sendPresenceUpdate',
  'presenceSubscribe',
  'chatModify',
  'star',
  'updateBlockStatus',
  'sendMessageAck',
  'rejectCall',
  'updateProfileStatus',
  'updateProfileName',
  'updateProfilePicture',
  'removeProfilePicture',
  'updateLastSeenPrivacy',
  'updateOnlinePrivacy',
  'updateReadReceiptsPrivacy',
  'groupCreate',
  'groupLeave',
  'groupUpdateSubject',
  'groupUpdateDescription',
  'groupParticipantsUpdate',
  'groupSettingUpdate',
  'groupInviteCode',
  'groupRevokeInvite',
  'groupAcceptInvite',
  'groupToggleEphemeral',
  'groupMemberAddMode',
  'groupJoinApprovalMode',
  'newsletterCreate',
  'newsletterFollow',
  'sendPeerDataOperationMessage',
  // Vraagt je eigen telefoon om oudere berichten: enkel toegelaten met HISTORIEK_OPVRAGEN=true.
  'fetchMessageHistory',
  'requestPlaceholderResend',
] as const

export function lockDown<T extends object>(sock: T, allow: readonly string[] = []): T {
  const s = sock as Record<string, unknown>
  for (const name of FORBIDDEN_METHODS) {
    if (allow.includes(name) || typeof s[name] !== 'function') continue
    s[name] = () => {
      throw new Error(`WhatsApp-bridge is read-only: "${name}" is uitgeschakeld.`)
    }
  }
  return sock
}
