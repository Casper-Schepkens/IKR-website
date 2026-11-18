import 'server-only'
import type { AdminSession } from '../session'
import { createServerSupabase, createServiceSupabase } from '../supabase/server'
import { chatLabel, chatPhone, memoryWhatsapp, phoneKey, supabaseWhatsapp, type WaBericht, type WaChat, type WaImportRow, type WhatsappRepo } from './repo'

/** Repo voor een ingelogde gebruiker (RLS) of, met service = true, voor Grok Bot (service role). */
export async function whatsappFor(session: Pick<AdminSession, 'mode'>, service = false): Promise<WhatsappRepo> {
  if (session.mode === 'demo') return memoryWhatsapp()
  return supabaseWhatsapp(service ? createServiceSupabase() : await createServerSupabase())
}

/**
 * Chat koppelen aan een lead of klant en/of actief zetten. Actief kan enkel als de chat gekoppeld is:
 * zo komen er geen privégesprekken per ongeluk in de database.
 */
export async function linkChat(
  repo: WhatsappRepo,
  jid: string,
  patch: { lead_id?: string | null; klant_id?: string | null; intern?: boolean; actief?: boolean; naam_eigen?: string | null },
  exists: { lead: (id: string) => Promise<boolean>; klant: (id: string) => Promise<boolean> },
) {
  const chat = await repo.chat(jid)
  if (!chat) throw new Error('Chat niet gevonden.')
  if (patch.lead_id && !(await exists.lead(patch.lead_id))) throw new Error('Lead niet gevonden.')
  if (patch.klant_id && !(await exists.klant(patch.klant_id))) throw new Error('Klant niet gevonden.')
  if (patch.naam_eigen !== undefined) patch = { ...patch, naam_eigen: patch.naam_eigen?.trim().slice(0, 300) || null }
  const next = { ...chat, ...patch }
  if (next.actief && !next.lead_id && !next.klant_id && !next.intern) throw new Error('Koppel de chat eerst aan een lead of klant (of zet hem op intern); pas dan kan hij actief.')
  await repo.updateChat(jid, patch)
  return next
}

export type Conversation = { chats: WaChat[]; berichten: WaBericht[] }

/** De laatste berichten van alle chats die aan deze lead of klant gekoppeld zijn (oudste eerst). */
export async function conversationFor(repo: WhatsappRepo, ref: { leadId?: string | null; klantId?: string | null; intern?: boolean }, limit: number): Promise<Conversation> {
  const chats = (await repo.chats()).filter((c) => (ref.leadId && c.lead_id === ref.leadId) || (ref.klantId && c.klant_id === ref.klantId) || (ref.intern && c.intern))
  const active = chats.filter((c) => c.actief).map((c) => c.jid)
  const berichten = (await repo.messages(active, limit)).reverse()
  return { chats, berichten }
}

const IMPORT_ID = /^imp-[a-z0-9]{2,40}$/
const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'poll', 'other']

/**
 * Historiek uit "Chat exporteren" bewaren voor een gekoppelde chat (lead, klant of intern).
 * Berichten vanaf het eerste bericht dat de bridge zelf bewaarde, worden overgeslagen (anders dubbel).
 */
export async function importHistory(repo: WhatsappRepo, jid: string, rows: unknown[]) {
  const chat = await repo.chat(jid)
  if (!chat) throw new Error('Chat niet gevonden.')
  if (!chat.lead_id && !chat.klant_id && !chat.intern) throw new Error('Koppel de chat eerst aan een lead of klant (of zet hem op intern).')
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('Te veel berichten in één keer (max. 500).')
  const clean: WaImportRow[] = []
  for (const raw of rows) {
    const r = (raw ?? {}) as Record<string, unknown>
    const tijdstip = typeof r.tijdstip === 'string' && !Number.isNaN(Date.parse(r.tijdstip)) ? new Date(r.tijdstip).toISOString() : null
    if (typeof r.id !== 'string' || !IMPORT_ID.test(r.id) || (r.richting !== 'in' && r.richting !== 'uit') || !tijdstip) throw new Error('Ongeldig bericht in de import.')
    const tekst = typeof r.tekst === 'string' && r.tekst.trim() ? r.tekst.slice(0, 20_000) : null
    const media = typeof r.media_type === 'string' && MEDIA_TYPES.includes(r.media_type) ? r.media_type : null
    if (!tekst && !media) continue
    clean.push({ id: r.id, richting: r.richting, tekst, media_type: media, tijdstip, afzender: typeof r.afzender === 'string' ? r.afzender.slice(0, 300) : null })
  }
  const cutoff = await repo.oldestBridgeMessage(jid)
  const keep = cutoff ? clean.filter((r) => r.tijdstip < cutoff) : clean
  const nieuw = await repo.importMessages(jid, keep)
  return { nieuw, overgeslagen: rows.length - nieuw }
}

/** Nieuwe berichten in alle actieve chats sinds een tijdstip, per chat (voor de rondes van Grok Bot). */
export async function recentAll(repo: WhatsappRepo, since: string, limit: number) {
  const active = (await repo.chats()).filter((c) => c.actief)
  const msgs = await repo.messagesSince(active.map((c) => c.jid), since, limit)
  return active
    .map((c) => ({ chat: c, berichten: msgs.filter((m) => m.jid === c.jid) }))
    .filter((x) => x.berichten.length)
}

/** Lead met hetzelfde telefoonnummer als de chat (voorstel om te koppelen), of null. */
export function suggestLead<L extends { id: string; phone: string | null }>(chat: Pick<WaChat, 'jid' | 'telefoon'>, leads: L[]): L | null {
  const key = phoneKey(chatPhone(chat))
  if (!key) return null
  const hits = leads.filter((l) => phoneKey(l.phone) === key)
  return hits.length === 1 ? hits[0] : null
}

export { chatLabel, chatPhone }
