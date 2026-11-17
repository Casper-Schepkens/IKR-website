import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, type WASocket } from 'baileys'
import pino from 'pino'
import qrTerminal from 'qrcode-terminal'
import { supabaseBridgeDb } from './db.js'
import { lockDown, type RawMessage } from './extract.js'
import { Recorder, type NameStore, type SavedNames } from './recorder.js'
import { startServer, type BridgeStatus } from './server.js'

/**
 * IKR WhatsApp-bridge (read-only). Leest mee als gekoppeld apparaat en bewaart enkel berichten van
 * chats die in het dashboard op actief staan. Verstuurt nooit berichten, markeert niets als gelezen
 * en staat nooit "online".
 */
const env = (k: string, required = true) => {
  const v = process.env[k]?.trim()
  if (required && !v) {
    console.error(`${k} ontbreekt.`)
    process.exit(1)
  }
  return v ?? ''
}
const SUPABASE_URL = env('SUPABASE_URL')
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
const QR_SECRET = env('QR_SECRET', false) || undefined
const AUTH_DIR = env('AUTH_DIR', false) || '/data/auth'
const PORT = Number(env('PORT', false) || 8080)
/** Optioneel: bij het actief zetten van een chat je eigen telefoon om oudere berichten vragen (standaard uit). */
const HISTORY_ON_ACTIVATE = env('HISTORIEK_OPVRAGEN', false) === 'true'
/** Nummers van Milan en Cédric (komma-gescheiden): groepen met het hele team komen bovenaan in het dashboard. */
const TEAM_NUMBERS = env('TEAM_NUMMERS', false).split(/[,;\s]+/).filter(Boolean)
/** Optioneel: bij het koppelen de volledige historiek laten synchroniseren (standaard uit). */
const FULL_HISTORY = env('VOLLEDIGE_HISTORIEK', false) === 'true'

const logger = pino({ level: env('LOG_LEVEL', false) || 'info' })
const log = (msg: string, extra?: Record<string, unknown>) => logger.info(extra ?? {}, msg)
const db = supabaseBridgeDb(SUPABASE_URL, SERVICE_KEY)
/** Namen en nummers op het volume (naast de koppeling): WhatsApp stuurt het adresboek maar één keer. */
const NAMES_FILE = join(dirname(AUTH_DIR), 'namen.json')
const nameStore: NameStore = {
  load: async () => JSON.parse(await readFile(NAMES_FILE, 'utf8')) as SavedNames,
  save: async (v) => {
    await mkdir(dirname(NAMES_FILE), { recursive: true })
    await writeFile(`${NAMES_FILE}.tmp`, JSON.stringify(v))
    await rename(`${NAMES_FILE}.tmp`, NAMES_FILE)
  },
}
const recorder = new Recorder(db, log, Date.now, nameStore)

const status: BridgeStatus = { connection: 'connecting', qr: null, me: null, since: new Date().toISOString() }
startServer(PORT, () => status, QR_SECRET)
if (!QR_SECRET) logger.warn('QR_SECRET ontbreekt: /qr is uit; de QR-code staat enkel in de logs.')

let sock: WASocket | null = null
let retries = 0
let stopping = false

async function connect() {
  await mkdir(AUTH_DIR, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
  const s = makeWASocket({
    auth: state,
    ...(version ? { version } : {}),
    logger: logger.child({ module: 'baileys' }, { level: 'warn' }),
    browser: Browsers.macOS('IKR dashboard'),
    // Read-only: nooit online verschijnen, geen eigen events, geen linkvoorbeelden.
    markOnlineOnConnect: false,
    emitOwnEvents: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: FULL_HISTORY,
    shouldSyncHistoryMessage: () => true,
    getMessage: async () => undefined,
  })
  // Alles wat iets zou versturen of als gelezen markeren: uitgeschakeld (enkel historiek opvragen als dat aan staat).
  lockDown(s, HISTORY_ON_ACTIVATE ? ['fetchMessageHistory'] : [])
  sock = s

  s.ev.on('creds.update', saveCreds)
  s.ev.on('connection.update', async (u) => {
    if (u.qr) {
      status.qr = u.qr
      log('Nieuwe QR-code: scan ze via WhatsApp → Gekoppelde apparaten (of open /qr).')
      qrTerminal.generate(u.qr, { small: true })
    }
    if (u.connection) status.connection = u.connection
    if (u.connection === 'open') {
      retries = 0
      status.qr = null
      status.me = s.user?.id ?? null
      status.since = new Date().toISOString()
      log('Verbonden (read-only).', { me: status.me })
      void syncGroupNames()
    }
    if (u.connection === 'close') {
      const code = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
      status.me = null
      if (code === DisconnectReason.loggedOut) {
        // Ontkoppeld vanaf de telefoon: oude sleutels weg, opnieuw een QR-code tonen.
        logger.warn('Uitgelogd: koppel opnieuw via de QR-code.')
        await rm(AUTH_DIR, { recursive: true, force: true })
      }
      if (stopping) return
      const wait = Math.min(60_000, 2_000 * 2 ** Math.min(retries++, 5))
      logger.warn({ code, wait }, 'Verbinding weg, opnieuw verbinden.')
      setTimeout(() => void connect().catch((e) => logger.error(e, 'Verbinden mislukt')), wait)
    }
  })

  s.ev.on('messaging-history.set', ({ chats, contacts, messages, syncType }) => {
    void (async () => {
      await recorder.onChats(chats as never[], contacts as never[])
      await recorder.onMessages(messages as RawMessage[], 'historiek')
      log('Historiek ontvangen.', { chats: chats.length, berichten: messages.length, soort: syncType })
    })().catch((e) => logger.error(e, 'Historiek verwerken mislukt'))
  })
  s.ev.on('chats.upsert', (chats) => void recorder.onChats(chats as never[]).catch((e) => logger.error(e, 'Chats bewaren mislukt')))
  s.ev.on('contacts.upsert', (contacts) => void recorder.onContacts(contacts as never[]).catch((e) => logger.error(e, 'Contacten verwerken mislukt')))
  s.ev.on('contacts.update', (contacts) => void recorder.onContacts(contacts as never[]).catch((e) => logger.error(e, 'Contacten verwerken mislukt')))
  s.ev.on('chats.phoneNumberShare', ({ lid, jid }) => void recorder.onPhoneNumber(lid, jid).catch((e) => logger.error(e, 'Nummer verwerken mislukt')))
  s.ev.on('groups.upsert', (groups) => void recorder.onChats(groups.map((g) => ({ id: g.id, subject: g.subject }))).catch((e) => logger.error(e, 'Groepen bewaren mislukt')))
  s.ev.on('groups.update', (groups) => void recorder.onChats(groups.filter((g) => g.id && g.subject).map((g) => ({ id: g.id!, subject: g.subject }))).catch((e) => logger.error(e, 'Groepen bewaren mislukt')))
  s.ev.on('messages.upsert', ({ messages }) => void recorder.onMessages(messages as RawMessage[], 'live').catch((e) => logger.error(e, 'Berichten bewaren mislukt')))
}

/** Groepsnamen ophalen (leesvraag aan WhatsApp, verstuurt niets): bij het verbinden en elke 6 uur. */
async function syncGroupNames() {
  if (!sock || status.connection !== 'open') return
  try {
    const groups = await sock.groupFetchAllParticipating()
    const rows = await recorder.onGroups(Object.values(groups), TEAM_NUMBERS)
    log('Groepen bijgewerkt.', { groepen: rows.length, met_hele_team: rows.filter((r) => r.hele_team).length })
  } catch (e) {
    logger.warn(e, 'Groepsnamen ophalen mislukt')
  }
}
setInterval(() => void syncGroupNames(), 6 * 60 * 60_000).unref()

/** Optioneel: voor pas geactiveerde chats je eigen telefoon om de laatste 50 berichten vragen. */
async function requestHistory() {
  if (!HISTORY_ON_ACTIVATE || !sock || status.connection !== 'open') return
  for (const h of await db.pendingHistory()) {
    try {
      await sock.fetchMessageHistory(50, { remoteJid: h.jid, id: h.laatste_bericht_id, fromMe: h.laatste_bericht_van_mij }, new Date(h.laatst_actief).getTime())
      await db.markHistoryRequested(h.jid)
      log('Historiek opgevraagd.', { jid: h.jid })
    } catch (e) {
      logger.warn(e, 'Historiek opvragen mislukt')
    }
  }
}
setInterval(() => void requestHistory().catch((e) => logger.warn(e, 'historiek')), 60_000).unref()

for (const sig of ['SIGTERM', 'SIGINT'] as const)
  process.on(sig, () => {
    stopping = true
    log(`${sig}: afsluiten.`)
    sock?.end(undefined)
    setTimeout(() => process.exit(0), 1_000).unref()
  })

connect().catch((e) => {
  logger.error(e, 'Starten mislukt')
  process.exit(1)
})
