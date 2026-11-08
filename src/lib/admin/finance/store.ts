import 'server-only'
import { createServiceSupabase } from '../supabase/server'
import { isDemoMode, isSupabaseConfigured } from '../env'
import { bankBalance, bankLines, isOdooConfigured } from './odoo'
import { classify, type ClientLite, type Rule, type Tx } from './core'

/** Opslag van de financiën (Supabase, service role) + synchronisatie met Odoo. Demo: in het geheugen. */

const inMemory = () => !isSupabaseConfigured() && isDemoMode()
const g = globalThis as unknown as { __ikrFin?: { txs: Tx[]; rules: (Rule & { id: string })[]; synced_at: string | null; balance: number | null } }
const mem = () => (g.__ikrFin ??= { txs: [], rules: [], synced_at: null, balance: null })
const db = () => createServiceSupabase()
const num = (v: unknown) => (v == null ? null : Number(v))

export async function loadClients(): Promise<ClientLite[]> {
  if (inMemory()) {
    const all = ((globalThis as unknown as { __ikrClients?: Record<string, unknown>[] }).__ikrClients ?? []) as Record<string, unknown>[]
    return all.map(toClient)
  }
  const { data, error } = await db().from('clients').select('id, name, bank_name, contract_start, contract_end, contract_indefinite, monthly_fee, freelancer_cost, boosting_budget')
  if (error) throw new Error(error.message)
  return (data ?? []).map(toClient)
}
const toClient = (c: Record<string, unknown>): ClientLite => ({
  id: String(c.id),
  name: String(c.name),
  bank_name: (c.bank_name as string) ?? null,
  contract_start: (c.contract_start as string) ?? null,
  contract_end: (c.contract_end as string) ?? null,
  contract_indefinite: Boolean(c.contract_indefinite),
  monthly_fee: num(c.monthly_fee),
  freelancer_cost: num(c.freelancer_cost),
  boosting_budget: num(c.boosting_budget),
})

export async function loadTxs(): Promise<Tx[]> {
  if (inMemory()) return mem().txs
  const out: Tx[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from('finance_transactions').select('odoo_id, date, amount, counterparty, description, category, client_id, manual').order('date').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }) as Tx))
    if (!data || data.length < 1000) break
  }
  return out
}

export async function loadRules(): Promise<(Rule & { id: string })[]> {
  if (inMemory()) return mem().rules
  const { data, error } = await db().from('finance_rules').select('id, pattern, category, client_id, priority').order('priority', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as (Rule & { id: string })[]
}

export async function syncState(): Promise<{ synced_at: string | null; bank_balance: number | null; error: string | null }> {
  if (inMemory()) return { synced_at: mem().synced_at, bank_balance: mem().balance, error: null }
  const { data } = await db().from('finance_state').select('synced_at, bank_balance, error').eq('key', 'odoo').maybeSingle()
  return { synced_at: data?.synced_at ?? null, bank_balance: num(data?.bank_balance), error: data?.error ?? null }
}

/**
 * Haalt alle banktransacties uit Odoo, deelt nieuwe en niet-handmatige opnieuw in volgens de regels,
 * en bewaart het banksaldo. Hoogstens om de 30 minuten (tenzij force). Odoo wordt enkel gelezen.
 */
export async function syncFinance(opts: { force?: boolean } = {}) {
  const st = await syncState()
  if (!opts.force && st.synced_at && Date.now() - Date.parse(st.synced_at) < 30 * 60_000) return { overgeslagen: true, nieuw: 0, herindeeld: 0 }
  if (!isOdooConfigured()) throw new Error('ODOO_API_KEY ontbreekt in Vercel.')
  try {
    const [lines, balance, rules, clients, existing] = await Promise.all([bankLines(), bankBalance(), loadRules(), loadClients(), loadTxs()])
    const known = new Map(existing.map((t) => [t.odoo_id, t]))
    let nieuw = 0
    let herindeeld = 0
    const rows: Tx[] = []
    for (const l of lines) {
      const prev = known.get(l.id)
      if (prev?.manual) {
        rows.push({ ...prev, date: l.date, amount: l.amount, counterparty: l.counterparty, description: l.description })
        continue
      }
      const c = classify(l, rules, clients)
      if (!prev) nieuw++
      else if (prev.category !== c.category || prev.client_id !== c.client_id) herindeeld++
      rows.push({ odoo_id: l.id, date: l.date, amount: l.amount, counterparty: l.counterparty, description: l.description, category: c.category, client_id: c.client_id, manual: false })
    }
    const now = new Date().toISOString()
    if (inMemory()) Object.assign(mem(), { txs: rows, synced_at: now, balance })
    else {
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db().from('finance_transactions').upsert(rows.slice(i, i + 500).map((r) => ({ ...r, synced_at: now })), { onConflict: 'odoo_id' })
        if (error) throw new Error(error.message)
      }
      await db().from('finance_state').upsert({ key: 'odoo', synced_at: now, bank_balance: balance, error: null })
    }
    return { overgeslagen: false, nieuw, herindeeld }
  } catch (e) {
    if (!inMemory()) await db().from('finance_state').upsert({ key: 'odoo', synced_at: st.synced_at, bank_balance: st.bank_balance, error: e instanceof Error ? e.message : String(e) })
    throw e
  }
}

/** Eén transactie handmatig indelen; optioneel een regel maken zodat dezelfde tegenpartij voortaan zo ingedeeld wordt. */
export async function setTxCategory(odooId: number, category: string, clientId: string | null, opts: { makeRule?: boolean; by?: string } = {}) {
  const txs = await loadTxs()
  const tx = txs.find((t) => t.odoo_id === odooId)
  if (!tx) throw new Error('Transactie niet gevonden.')
  if (inMemory()) Object.assign(tx, { category, client_id: clientId, manual: true })
  else {
    const { error } = await db().from('finance_transactions').update({ category, client_id: clientId, manual: true }).eq('odoo_id', odooId)
    if (error) throw new Error(error.message)
  }
  if (opts.makeRule) {
    const pattern = (tx.counterparty || tx.description.split(' Betaling')[0]).trim().slice(0, 80)
    if (pattern.length < 3) throw new Error('Geen bruikbare naam om een regel van te maken.')
    await addRule({ pattern, category, client_id: clientId, field: tx.counterparty ? 'tegenpartij' : 'alles' }, opts.by)
  }
}

export async function addRule(rule: Rule, by?: string) {
  const row = { pattern: rule.pattern.trim(), category: rule.category, client_id: rule.client_id ?? null, priority: rule.priority ?? 10 }
  if (inMemory()) mem().rules.push({ ...row, id: crypto.randomUUID() })
  else {
    const { error } = await db().from('finance_rules').insert({ ...row, created_by: by ?? null })
    if (error) throw new Error(error.message)
  }
  await reclassify()
}

/** Na een nieuwe regel: alle niet-handmatige transacties opnieuw indelen (zonder Odoo). */
export async function reclassify() {
  const [txs, rules, clients] = await Promise.all([loadTxs(), loadRules(), loadClients()])
  const changed = txs.filter((t) => !t.manual).map((t) => ({ t, c: classify(t, rules, clients) })).filter(({ t, c }) => t.category !== c.category || t.client_id !== c.client_id)
  if (inMemory()) changed.forEach(({ t, c }) => Object.assign(t, { category: c.category, client_id: c.client_id }))
  else for (const { t, c } of changed) await db().from('finance_transactions').update({ category: c.category, client_id: c.client_id }).eq('odoo_id', t.odoo_id)
  return changed.length
}
