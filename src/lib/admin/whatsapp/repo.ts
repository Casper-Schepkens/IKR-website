import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * WhatsApp (read-only): chats die de bridge detecteerde en de berichten van actieve chats.
 * Het dashboard koppelt chats aan een lead of klant en zet ze actief; de bridge bewaart dan hun berichten.
 */
export type WaChat = {
  jid: string
  naam: string | null
  /** Naam die het team zelf gaf (gaat voor op de naam uit WhatsApp). */
  naam_eigen: string | null
  /** Nummer bij een anoniem id (@lid), als WhatsApp het meegaf. */
  telefoon: string | null
  is_groep: boolean
  /** Groep met Casper, Milan én Cédric (meestal een klantgroep). */
  hele_team: boolean
  deelnemers: number | null
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
export type WaChatPatch = Partial<Pick<WaChat, 'lead_id' | 'klant_id' | 'actief' | 'naam_eigen'>>

export interface WhatsappRepo {
  /** Alle gedetecteerde chats, laatst actief eerst. */
  chats(): Promise<WaChat[]>
  chat(jid: string): Promise<WaChat | null>
  updateChat(jid: string, patch: WaChatPatch): Promise<void>
  /** De laatste `limit` berichten van deze chats, nieuwste eerst. */
  messages(jids: string[], limit: number): Promise<WaBericht[]>
}

const CHAT_COLS = 'jid, naam, naam_eigen, telefoon, is_groep, hele_team, deelnemers, lead_id, klant_id, actief, laatst_actief'

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
      { jid: '120363000000000001@g.us', naam: 'IKR × Bakkerij Peeters', naam_eigen: null, telefoon: null, is_groep: true, hele_team: true, deelnemers: 5, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(15) },
      { jid: '32470000001@s.whatsapp.net', naam: null, naam_eigen: null, telefoon: null, is_groep: false, hele_team: false, deelnemers: null, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(90) },
      { jid: '78821256634402@lid', naam: null, naam_eigen: null, telefoon: null, is_groep: false, hele_team: false, deelnemers: null, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(300) },
      { jid: '32470000002@s.whatsapp.net', naam: 'Mama', naam_eigen: null, telefoon: null, is_groep: false, hele_team: false, deelnemers: null, lead_id: null, klant_id: null, actief: false, laatst_actief: ago(240) },
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

/** Telefoonnummer van een chat (+32…): uit de jid, of het meegegeven nummer bij een anoniem id. */
export function chatPhone(c: Pick<WaChat, 'jid'> & Partial<Pick<WaChat, 'telefoon'>>) {
  const m = c.jid.match(/^(\d+)(?::\d+)?@s\.whatsapp\.net$/)
  return m ? `+${m[1]}` : (c.telefoon ?? null)
}

/** Zichtbare naam: eigen naam, dan de naam uit WhatsApp, dan het nummer. */
export function chatLabel(c: Pick<WaChat, 'jid' | 'naam'> & Partial<Pick<WaChat, 'naam_eigen' | 'telefoon' | 'is_groep'>>) {
  if (c.naam_eigen) return c.naam_eigen
  if (c.naam) return c.naam
  const phone = chatPhone(c)
  if (phone) return phone
  return c.jid.endsWith('@g.us') || c.is_groep ? 'Groep zonder naam' : 'Contact zonder naam of nummer'
}

/** Vergelijkbare vorm van een Belgisch/internationaal nummer (enkel cijfers, 0… → 32…). */
export function phoneKey(v: string | null | undefined) {
  const d = (v ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '')
  if (!d) return null
  return d.startsWith('0') ? `32${d.slice(1)}` : d
}
