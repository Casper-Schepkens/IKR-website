import 'server-only'
import type { AdminSession } from '../session'
import { createServerSupabase, createServiceSupabase } from '../supabase/server'
import { chatLabel, memoryWhatsapp, supabaseWhatsapp, type WaBericht, type WaChat, type WhatsappRepo } from './repo'

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
  patch: { lead_id?: string | null; klant_id?: string | null; actief?: boolean },
  exists: { lead: (id: string) => Promise<boolean>; klant: (id: string) => Promise<boolean> },
) {
  const chat = await repo.chat(jid)
  if (!chat) throw new Error('Chat niet gevonden.')
  if (patch.lead_id && !(await exists.lead(patch.lead_id))) throw new Error('Lead niet gevonden.')
  if (patch.klant_id && !(await exists.klant(patch.klant_id))) throw new Error('Klant niet gevonden.')
  const next = { ...chat, ...patch }
  if (next.actief && !next.lead_id && !next.klant_id) throw new Error('Koppel de chat eerst aan een lead of klant; pas dan kan hij actief.')
  await repo.updateChat(jid, patch)
  return next
}

export type Conversation = { chats: WaChat[]; berichten: WaBericht[] }

/** De laatste berichten van alle chats die aan deze lead of klant gekoppeld zijn (oudste eerst). */
export async function conversationFor(repo: WhatsappRepo, ref: { leadId?: string | null; klantId?: string | null }, limit: number): Promise<Conversation> {
  const chats = (await repo.chats()).filter((c) => (ref.leadId && c.lead_id === ref.leadId) || (ref.klantId && c.klant_id === ref.klantId))
  const active = chats.filter((c) => c.actief).map((c) => c.jid)
  const berichten = (await repo.messages(active, limit)).reverse()
  return { chats, berichten }
}

export { chatLabel }
