import 'server-only'
import { createServiceSupabase } from '../supabase/server'
import { planAfterSend, type AfterSendOutput, type LeadFields } from './after-send-core'

export type AfterSendInput = {
  ref: string
  lead: LeadFields & { id: string; name: string; email: string | null; notes: string | null }
  sent: { at: string; day: string; weekday: string; from: string; to: string; subject: string; body: string }
  thread: { from: string; date: string; text: string; fromCasper: boolean }[]
}

const COLUMNS = 'next_action, follow_up_on, stage, phone, company'

/**
 * Past het resultaat van een "na_verzending"-taak toe op de lead. Elk veld apart en enkel als het nog
 * de waarde van bij het versturen heeft (ook in de update zelf, tegen gelijktijdige aanpassingen).
 * Elke wijziging (en elk overgeslagen voorstel) komt in bot_actions.
 */
export async function applyAfterSend(input: AfterSendInput, output: AfterSendOutput, engine = 'ai') {
  const db = createServiceSupabase()
  const { data: current, error } = await db.from('leads').select(COLUMNS).eq('id', input.lead.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!current) return [] // lead intussen verwijderd
  const plan = planAfterSend(input.lead, current as LeadFields, output, input.sent.day)
  for (const c of plan) {
    if (c.status === 'toepassen') {
      const q = db.from('leads').update({ [c.column]: c.to }).eq('id', input.lead.id)
      const before = input.lead[c.column]
      const { data, error: upErr } = await (before === null ? q.is(c.column, null) : q.eq(c.column, before)).select('id')
      if (upErr || !data?.length) {
        c.status = 'overgeslagen'
        c.waarom = upErr ? `Opslaan mislukt: ${upErr.message}` : 'Je had dit veld na het versturen zelf al aangepast.'
      }
    }
    await db.from('bot_actions').insert({
      bot: engine,
      tool: 'na_verzending',
      ok: c.status === 'toepassen',
      error: c.status === 'overgeslagen' ? c.waarom ?? null : null,
      args: {
        lead_id: input.lead.id,
        ref: input.ref,
        veld: c.field,
        kolom: c.column,
        van: c.from,
        naar: c.to,
        reden: c.reden,
        status: c.status,
        mail: { onderwerp: input.sent.subject, op: input.sent.at },
      },
    })
  }
  return plan
}

export type AfterSendLogEntry = {
  id: string
  created_at: string
  ok: boolean
  error: string | null
  args: { veld: string; kolom: string; van: string | null; naar: string; reden: string; status: string; mail?: { onderwerp: string; op: string } }
}

/** Wat de AI na verstuurde mails aan deze lead aanpaste (nieuwste eerst). */
export async function afterSendLog(leadId: string, limit = 10): Promise<AfterSendLogEntry[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const { data } = await createServiceSupabase()
    .from('bot_actions')
    .select('id, created_at, ok, error, args')
    .eq('tool', 'na_verzending')
    .eq('args->>lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as AfterSendLogEntry[]
}
