import 'server-only'
import { after } from 'next/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createServiceSupabase } from '../supabase/server'
import { sameText, textMatches } from '../search'
import type { AdminSession } from '../session'
import { LOST_REASON_LABELS, SOURCE_LABELS, STAGE_LABELS, type Lead } from '../sales/types'
import { OWNERS } from '../weekly/types'
import { type PeriodKind } from '../finance/core'
import { reclassify } from '../finance/store'

/**
 * Gedeelde bouwstenen van de MCP-server: logging, validators en de tool()-registratie.
 * De tools zelf staan per domein in ./tools.
 */

export const BY = 'grokbot'
export const PERIOD_KEY: Record<PeriodKind, RegExp> = { maand: /^\d{4}-(0[1-9]|1[0-2])$/, kwartaal: /^\d{4}-Q[1-4]$/, jaar: /^\d{4}$/ }


export const text = (value: unknown) => ({
  content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
})
/** Sleutel waarmee een handler eigen MCP-inhoud teruggeeft (bv. een bijlage als embedded resource). */
export const MCP_CONTENT = '__mcp_content'

/** Banktransacties opnieuw aan klanten koppelen na een klantwijziging; nooit blokkerend. */
export function relinkFinance() {
  const run = () => reclassify().catch(() => undefined)
  try {
    after(run)
  } catch {
    void run() // buiten een request (tests)
  }
}

export const fail = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true })

/**
 * Lange teksten (mailteksten, notities, concepten) niet volledig in het log: begin + lengte volstaat om
 * te zien wat er gebeurde, en het log wordt geen tweede kopie van alle mails.
 */
export function compactArgs(v: unknown, depth = 0): unknown {
  if (typeof v === 'string') return v.length > 300 ? `${v.slice(0, 300)}… (${v.length} tekens)` : v
  if (Array.isArray(v)) return depth > 3 ? `[${v.length} items]` : v.slice(0, 20).map((x) => compactArgs(x, depth + 1))
  if (v && typeof v === 'object') return depth > 3 ? '{…}' : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, compactArgs(x, depth + 1)]))
  return v
}

/** Logt in bot_actions; mag nooit een tool laten falen. */
export async function log(tool: string, args: unknown, ok: boolean, error?: string) {
  try {
    const { error: logError } = await createServiceSupabase().from('bot_actions').insert({ bot: BY, tool, args: compactArgs(args ?? null), ok, error: error ?? null })
    if (logError) throw new Error(logError.message)
  } catch (e) {
    // geen service role (lokaal) of tijdelijk probleem: niet blokkeren, wel zichtbaar in de Vercel-logs
    console.error('[mcp] loggen in bot_actions mislukt', tool, e instanceof Error ? e.message : e)
  }
}

export const leadView = (l: Lead) => ({
  id: l.id,
  naam: l.name,
  bedrijf: l.company,
  email: l.email,
  telefoon: l.phone,
  bron: SOURCE_LABELS[l.source],
  fase: STAGE_LABELS[l.stage],
  fase_code: l.stage,
  volgende_actie: l.next_action,
  opvolgen_op: l.follow_up_on,
  lost_reden: l.lost_reason ? LOST_REASON_LABELS[l.lost_reason] : null,
  lost_notitie: l.lost_note,
  notities: l.notes,
  in_fase_sinds: l.stage_changed_at,
  aangemaakt: l.created_at,
})

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const emailSchema = z.email()
export const HTML = /<\/?[a-z][\w-]*(\s[^>]*)?>/i

export function uuid(v: string, field: string) {
  if (!UUID.test(v.trim())) throw new Error(`${field} is geen geldig id.`)
  return v.trim()
}
export function email(v: string, field: string) {
  const e = v.trim().toLowerCase()
  if (!emailSchema.safeParse(e).success) throw new Error(`${field}: "${v}" is geen geldig e-mailadres.`)
  return e
}
export function nonEmpty(v: string, field: string, max: number) {
  const t = v.trim()
  if (!t) throw new Error(`${field} mag niet leeg zijn.`)
  if (t.length > max) throw new Error(`${field} is te lang (max ${max} tekens).`)
  return t
}
export const optional = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null)
/** Message-ID zoals in een mailheader: <iets@domein>. Geen spaties of regeleinden (anders header-injectie). */
export function messageId(v: string | undefined) {
  const t = optional(v)
  if (t && !/^<[^<>\s]+@[^<>\s]+>$/.test(t)) throw new Error('in_reply_to moet een Message-ID zijn, bv. <abc@mail.gmail.com>.')
  return t
}
/** Gmail-thread-id: hexadecimaal. */
export function threadId(v: string | undefined) {
  const t = optional(v)
  if (t && !/^[0-9a-f]{8,32}$/i.test(t)) throw new Error('thread_id is geen geldig Gmail-thread-id.')
  return t
}

export type DraftArgs = {
  lead_id: string
  to: string
  cc?: string[]
  subject: string
  body: string
  formaat?: 'text' | 'html'
  thread_id?: string
  in_reply_to?: string
  context?: string
  volgende_actie?: string | null
  opvolgen_op?: string | null
}

/** Strenge controle van een nieuw concept (fouten worden zo ook gelogd). */
export function validateDraft(a: DraftArgs) {
  const body = nonEmpty(a.body, 'body', 50_000)
  return {
    lead_id: uuid(a.lead_id, 'lead_id'),
    from_email: 'casper@iknowright.be' as const,
    to_email: email(a.to, 'to'),
    cc: (a.cc ?? []).map((c, i) => email(c, `cc[${i}]`)),
    subject: nonEmpty(a.subject, 'subject', 300),
    body,
    is_html: a.formaat ? a.formaat === 'html' : HTML.test(body),
    thread_id: threadId(a.thread_id) ?? null,
    in_reply_to: messageId(a.in_reply_to) ?? null,
    context: a.context === undefined ? null : contextText(a.context),
    follow_up_action: followUpAction(a.volgende_actie) ?? null,
    follow_up_on: followUpOn(a.opvolgen_op) ?? null,
  }
}

/** Eigen volgende actie na versturen; leeg of null = standaard ("antwoord opvolgen"). */
export function followUpAction(v: string | null | undefined) {
  if (v === undefined) return undefined
  const t = (v ?? '').trim()
  if (t.length > 200) throw new Error('volgende_actie is te lang (max 200 tekens).')
  return t || null
}

/** Eigen opvolgdatum na versturen (YYYY-MM-DD); leeg of null = standaard (5 werkdagen later). */
export function followUpOn(v: string | null | undefined) {
  if (v === undefined) return undefined
  const t = (v ?? '').trim()
  if (!t) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) throw new Error('opvolgen_op: gebruik YYYY-MM-DD.')
  return t
}

export function contextText(v: string) {
  const t = v.trim()
  if (t.length > 4000) throw new Error('context is te lang (max 4000 tekens).')
  return t || null
}

export function validateDraftPatch(a: Partial<DraftArgs>) {
  const body = a.body === undefined ? undefined : nonEmpty(a.body, 'body', 50_000)
  const patch = {
    to_email: a.to === undefined ? undefined : email(a.to, 'to'),
    cc: a.cc?.map((c, i) => email(c, `cc[${i}]`)),
    subject: a.subject === undefined ? undefined : nonEmpty(a.subject, 'subject', 300),
    body,
    is_html: a.formaat ? a.formaat === 'html' : body !== undefined ? HTML.test(body) : undefined,
    thread_id: threadId(a.thread_id),
    in_reply_to: messageId(a.in_reply_to),
    context: a.context === undefined ? undefined : contextText(a.context),
    follow_up_action: followUpAction(a.volgende_actie),
    follow_up_on: followUpOn(a.opvolgen_op),
  }
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
  if (!Object.keys(clean).length) throw new Error('Niets om aan te passen.')
  return clean
}

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gebruik YYYY-MM-DD')

export const owner = z.enum(OWNERS as [string, ...string[]])

/** Wat een sessie mag: 'sales' = alles (Casper), 'team' = zonder leads, inbox, concepten, calls en cold mails. */
export type Scope = 'sales' | 'team'

export function makeTool(server: McpServer) {
  /**
   * Registreert een tool. Schrijf-tools en fouten worden altijd gelogd in bot_actions; met
   * `logReads` ook elke leesoproep (bv. de mail of agenda van een teamlid lezen).
   * Een handler mag `{ [MCP_CONTENT]: [...] }` teruggeven voor eigen inhoud (bv. een bijlage als bestand).
   */
  function tool<S extends z.ZodRawShape>(
    name: string,
    description: string,
    shape: S,
    readOnly: boolean,
    fn: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>,
    opts: { logReads?: boolean } = {},
  ) {
    server.registerTool(
      name,
      { description, inputSchema: shape, annotations: { readOnlyHint: readOnly } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: any) => {
        try {
          const out = await fn(args)
          if (!readOnly) await log(name, args, true)
          else if (opts.logReads) await log(name, { ...args, alleen_lezen: true }, true)
          if (out && typeof out === 'object' && MCP_CONTENT in out) return { content: (out as Record<string, unknown>)[MCP_CONTENT] }
          return text(out)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Mislukt.'
          await log(name, args, false, msg)
          return fail(msg)
        }
      }) as never,
    )
  }
  return tool
}
export type ToolFn = ReturnType<typeof makeTool>

/** Leads en klanten opzoeken op naam, e-mail of id (gedeeld door meerdere modules). */
export function makeResolvers(session: AdminSession) {
  const { leads, clients } = session
  async function resolveLead(ref: string): Promise<Lead> {
    const q = ref.trim().toLowerCase()
    const all = await leads.list()
    const hit =
      all.find((l) => l.id === ref.trim()) ??
      all.find((l) => l.email?.toLowerCase() === q) ??
      (all.filter((l) => sameText(l.name, ref)).length === 1 ? all.find((l) => sameText(l.name, ref)) : undefined)
    if (hit) return hit
    const partial = all.filter((l) => textMatches(l.name, ref) || textMatches(l.company, ref))
    if (partial.length === 1) return partial[0]
    if (!partial.length) throw new Error(`Geen lead gevonden voor "${ref}".`)
    throw new Error(`Meerdere leads passen bij "${ref}": ${partial.map((l) => `${l.name} (${l.company ?? l.email ?? l.id})`).join(', ')}.`)
  }
  const resolveClient = async (ref: string) => {
    const all = await clients.list()
    const hit = all.find((c) => c.id === ref.trim()) ?? all.find((c) => sameText(c.name, ref))
    const partial = hit ? [hit] : all.filter((c) => textMatches(c.name, ref))
    if (partial.length === 1) return partial[0]
    throw new Error(partial.length ? `Meerdere klanten passen bij "${ref}": ${partial.map((c) => c.name).join(', ')}.` : `Geen klant gevonden voor "${ref}".`)
  }
  return { resolveLead, resolveClient }
}

export type ToolCtx = { session: AdminSession; tool: ToolFn; scope: Scope } & ReturnType<typeof makeResolvers>
