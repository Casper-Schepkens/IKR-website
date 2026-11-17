import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { BerichtRij } from './extract.js'
import type { BridgeDb, ChatMeta, HistoryRequest } from './recorder.js'

const BATCH = 500

/** Supabase (service role): enkel whatsapp_chats en whatsapp_berichten. */
export function supabaseBridgeDb(url: string, serviceKey: string): BridgeDb {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const check = <T>(r: { data: T; error: { message: string } | null }, what: string) => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`)
    return r.data
  }
  return {
    async activeJids() {
      const rows = check(await db.from('whatsapp_chats').select('jid').eq('actief', true), 'actieve chats') ?? []
      return new Set(rows.map((r) => r.jid as string))
    },
    async lastActivity() {
      const out = new Map<string, string>()
      for (let from = 0; ; from += 1000) {
        const rows = check(await db.from('whatsapp_chats').select('jid, laatst_actief').not('laatst_actief', 'is', null).range(from, from + 999), 'laatste activiteit') ?? []
        for (const r of rows) out.set(r.jid as string, new Date(r.laatst_actief as string).toISOString())
        if (rows.length < 1000) return out
      }
    },
    async upsertChats(rows) {
      // Per vorm van rij apart: een upsert zonder "naam" mag een bekende naam niet leegmaken.
      const groups = new Map<string, ChatMeta[]>()
      for (const r of rows) {
        const shape = Object.keys(r).sort().join(',')
        groups.set(shape, [...(groups.get(shape) ?? []), r])
      }
      for (const group of groups.values())
        for (let i = 0; i < group.length; i += BATCH) {
          const batch = group.slice(i, i + BATCH).map((r) => ({ ...r, updated_at: new Date().toISOString() }))
          check(await db.from('whatsapp_chats').upsert(batch, { onConflict: 'jid' }), 'chats bewaren')
        }
    },
    async insertMessages(rows: BerichtRij[]) {
      for (let i = 0; i < rows.length; i += BATCH)
        check(await db.from('whatsapp_berichten').upsert(rows.slice(i, i + BATCH), { onConflict: 'jid,id', ignoreDuplicates: true }), 'berichten bewaren')
    },
    async pendingHistory() {
      const rows =
        check(
          await db
            .from('whatsapp_chats')
            .select('jid, laatste_bericht_id, laatste_bericht_van_mij, laatst_actief')
            .eq('actief', true)
            .is('historiek_opgevraagd_at', null)
            .not('laatste_bericht_id', 'is', null),
          'historiek',
        ) ?? []
      return rows as HistoryRequest[]
    },
    async markHistoryRequested(jid) {
      check(await db.from('whatsapp_chats').update({ historiek_opgevraagd_at: new Date().toISOString() }).eq('jid', jid), 'historiek markeren')
    },
  }
}
