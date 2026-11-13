import 'server-only'
import { createServiceSupabase } from '../supabase/server'
import { planAfterSend, type AfterSendOutput, type LeadFields } from './after-send-core'

export type AfterSendInput = {
  ref: string
  lead: LeadFields & { id: string; name: string; email: string | null; notes: string | null }
  sent: { at: string; day: string; weekday: string; from: string; to: string; subject: string; body: string }
  thread: { from: string; date: string; text: string; fromCasper: boolean }[]
  /** Door het concept zelf vastgelegd: voorstellen van de AI voor deze velden worden genegeerd. */
  keep?: ('volgende_actie' | 'opvolgen_op')[]
}

const COLUMNS = 'next_action, follow_up_on, stage, phone, company'

/**
 * Past het resultaat van een "na_verzending"-taak toe op de lead. Elk veld apart en enkel als het nog
 * de waarde van bij het versturen heeft (ook in de update zelf, tegen gelijktijdige aanpassingen).
 * Elke wijziging (en elk overgeslagen voorstel) komt in bot_actions.
 */
export async function applyAfterSend(input: AfterSendInput, output: AfterSendOutput, engine = 'ai') {
  return applyLeadProposals({
    leadId: input.lead.id,
    snapshot: input.lead,
    day: input.sent.day,
    ref: input.ref,
    tool: 'na_verzending',
    engine,
    meta: { mail: { onderwerp: input.sent.subject, op: input.sent.at } },
    output: withoutKept(output, input.keep),
  })
}

/** Laat AI-voorstellen weg voor velden die het verstuurde concept zelf vastlegde. */
export function withoutKept(output: AfterSendOutput, keep: AfterSendInput['keep'] = []): AfterSendOutput {
  return Object.fromEntries(Object.entries(output).filter(([field]) => !keep.includes(field as 'volgende_actie'))) as AfterSendOutput
}

/**
 * Voorstellen van de AI op een lead toepassen (na een mail of na een call). Elk veld apart en enkel als
 * het nog de waarde van de momentopname heeft; elke wijziging en elk overgeslagen voorstel in bot_actions.
 */
export async function applyLeadProposals(o: {
  leadId: string
  snapshot: LeadFields
  day: string
  ref: string
  tool: 'na_verzending' | 'call_verwerken'
  engine: string
  meta: Record<string, unknown>
  output: AfterSendOutput
}) {
  const db = createServiceSupabase()
  const { data: current, error } = await db.from('leads').select(COLUMNS).eq('id', o.leadId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!current) return [] // lead intussen verwijderd
  const plan = planAfterSend(o.snapshot, current as LeadFields, o.output, o.day)
  for (const c of plan) {
    if (c.status === 'toepassen') {
      const q = db.from('leads').update({ [c.column]: c.to }).eq('id', o.leadId)
      const before = o.snapshot[c.column]
      const { data, error: upErr } = await (before === null ? q.is(c.column, null) : q.eq(c.column, before)).select('id')
      if (upErr || !data?.length) {
        c.status = 'overgeslagen'
        c.waarom = upErr ? `Opslaan mislukt: ${upErr.message}` : 'Je had dit veld intussen zelf al aangepast.'
      }
    }
    await db.from('bot_actions').insert({
      bot: o.engine,
      tool: o.tool,
      ok: c.status === 'toepassen',
      error: c.status === 'overgeslagen' ? c.waarom ?? null : null,
      args: { lead_id: o.leadId, ref: o.ref, veld: c.field, kolom: c.column, van: c.from, naar: c.to, reden: c.reden, status: c.status, ...o.meta },
    })
  }
  return plan
}

export type AfterSendLogEntry = {
  id: string
  created_at: string
  ok: boolean
  error: string | null
  args: { veld: string; kolom: string; van: string | null; naar: string; reden: string; status: string; mail?: { onderwerp: string; op: string }; call?: { soort: string; op: string } }
}

/** Wat de AI na verstuurde mails aan deze lead aanpaste (nieuwste eerst). */
export async function afterSendLog(leadId: string, limit = 10): Promise<AfterSendLogEntry[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const { data } = await createServiceSupabase()
    .from('bot_actions')
    .select('id, created_at, ok, error, args')
    .in('tool', ['na_verzending', 'call_verwerken'])
    .eq('args->>lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as AfterSendLogEntry[]
}
