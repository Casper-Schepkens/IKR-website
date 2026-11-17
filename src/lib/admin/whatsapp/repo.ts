import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * WhatsApp (read-only): chats die de bridge detecteerde en de berichten van actieve chats.
 * Het dashboard koppelt chats aan een lead of klant en zet ze actief; de bridge bewaart dan hun berichten.
 */
export type WaChat = {
  jid: string
  naam: string | null
  is_groep: boolean
  lead_id: string | null
  klant_id: string | null
  actief: boolean
  laatst_actief: string | null
}
export type WaBericht = {
  jid: string
  id: string
  richting: 'in' | 'uit'
  tekst: string | null
  media_type: string | null
  tijdstip: string
  afzender: string | null
}
export type WaChatPatch = Partial<Pick<WaChat, 'lead_id' | 'klant_id' | 'actief'>>

export interface WhatsappRepo {
  /** Alle gedetecteerde chats, laatst actief eerst. */
  chats(): Promise<WaChat[]>
  chat(jid: string): Promise<WaChat | null>
  updateChat(jid: string, patch: WaChatPatch): Promise<void>
  /** De laatste `limit` berichten van deze chats, nieuwste eerst. */
  messages(jids: string[], limit: number): Promise<WaBericht[]>
}

const CHAT_COLS = 'jid, naam, is_groep, lead_id, klant_id, actief, laatst_actief'

export function supabaseWhatsapp(db: SupabaseClient): WhatsappRepo {
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async chats() {
      const out: WaChat[] = []
      for (let from = 0; ; from += 1000) {
        const rows = (check(await db.from('whatsapp_chats').select(CHAT_COLS).order('laatst_actief', { ascending: false, nullsFirst: false }).range(from, from + 999)) ?? []) as WaChat[]
        out.push(...rows)
        if (rows.length < 1000 || out.length >= 5000) return out
      }
    },
    async chat(jid) {
      return (check(await db.from('whatsapp_chats').select(CHAT_COLS).eq('jid', jid).maybeSingle()) ?? null) as WaChat | null
    },
    async updateChat(jid, patch) {
      check(await db.from('whatsapp_chats').update({ ...patch, updated_at: new Date().toISOString() }).eq('jid', jid))
    },
    async messages(jids, limit) {
      if (!jids.length) return []
      return (check(
        await db.from('whatsapp_berichten').select('jid, id, richting, tekst, media_type, tijdstip, afzender').in('jid', jids).order('tijdstip', { ascending: false }).limit(limit),
      ) ?? []) as WaBericht[]
    },
  }
}

/** In het geheugen (demomodus en tests), met een paar voorbeeldchats. */
type Mem = { chats: WaChat[]; berichten: WaBericht[] }
const g = globalThis as unknown as { __ikrWhatsapp?: Mem }
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()
function demo(): Mem {
  return {
    chats: [
      { jid: '120363000000000001@g.us', naam: 'IKR × Bakkerij Peeters', is_groep: true, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(15) },
      { jid: '32470000001@s.whatsapp.net', naam: 'Jan Peeters', is_groep: false, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(90) },
      { jid: '32470000002@s.whatsapp.net', naam: 'Mama', is_groep: false, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(240) },
    ],
    // Enkel zichtbaar als de chat actief staat (zoals in het echt: de bridge bewaart enkel actieve chats).
    berichten: [
      { jid: '120363000000000001@g.us', id: 'd1', richting: 'in', tekst: 'Past dinsdag 9u voor de draaidag?', media_type: null, tijdstip: ago(60), afzender: 'Jan Peeters' },
      { jid: '120363000000000001@g.us', id: 'd2', richting: 'uit', tekst: 'Top, dinsdag 9u! Briefing volgt morgen.', media_type: null, tijdstip: ago(45), afzender: null },
      { jid: '120363000000000001@g.us', id: 'd3', richting: 'in', tekst: null, media_type: 'image', tijdstip: ago(15), afzender: 'Jan Peeters' },
    ],
  }
}
export function memoryWhatsapp(): WhatsappRepo {
  const m = (g.__ikrWhatsapp ??= demo())
  return {
    async chats() {
      return m.chats.map((c) => ({ ...c })).sort((a, b) => (b.laatst_actief ?? '').localeCompare(a.laatst_actief ?? ''))
    },
    async chat(jid) {
      const c = m.chats.find((x) => x.jid === jid)
      return c ? { ...c } : null
    },
    async updateChat(jid, patch) {
      const c = m.chats.find((x) => x.jid === jid)
      if (c) Object.assign(c, patch)
    },
    async messages(jids, limit) {
      return m.berichten
        .filter((b) => jids.includes(b.jid))
        .sort((a, b) => b.tijdstip.localeCompare(a.tijdstip))
        .slice(0, limit)
        .map((b) => ({ ...b }))
    },
  }
}

/** Zichtbare naam van een chat: de naam, anders het nummer. */
export function chatLabel(c: Pick<WaChat, 'jid' | 'naam'>) {
  if (c.naam) return c.naam
  const m = c.jid.match(/^(\d+)(?::\d+)?@s\.whatsapp\.net$/)
  return m ? `+${m[1]}` : c.jid.split('@')[0]
}
