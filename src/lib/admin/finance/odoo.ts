import 'server-only'

/**
 * Odoo 19 (JSON-2 API), enkel LEZEN. Sleutel: ODOO_API_KEY (Bearer), adres: ODOO_URL.
 * Er wordt nooit iets in Odoo aangemaakt, aangepast of verwijderd.
 */
export const odooUrl = () => (process.env.ODOO_URL || 'https://iknowright.odoo.com').replace(/\/$/, '')
export const isOdooConfigured = () => Boolean(process.env.ODOO_API_KEY)

async function call<T>(model: string, method: 'search_read' | 'read', body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${odooUrl()}/json/2/${model}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ODOO_API_KEY}`, ...(process.env.ODOO_DB ? { 'X-Odoo-Database': process.env.ODOO_DB } : {}) },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as (T & { message?: string; name?: string }) | null
  if (!res.ok) throw new Error(`Odoo (${res.status}): ${json && 'message' in json ? json.message : 'onbekende fout'}`)
  return json as T
}

export type BankLine = { id: number; date: string; amount: number; counterparty: string; description: string }

/** Alle banktransacties (account.bank.statement.line). */
export async function bankLines(): Promise<BankLine[]> {
  const rows = await call<{ id: number; date: string; amount: number; payment_ref: string | false; partner_id: [number, string] | false; partner_name: string | false }[]>(
    'account.bank.statement.line',
    'search_read',
    { domain: [], fields: ['date', 'amount', 'payment_ref', 'partner_id', 'partner_name'], order: 'date asc' },
  )
  return rows.map((r) => ({ id: r.id, date: r.date, amount: r.amount, counterparty: (r.partner_id && r.partner_id[1]) || r.partner_name || '', description: r.payment_ref || '' }))
}

/** Huidig saldo van de bankrekening(en): som van alle boekingen op de liquide rekeningen. */
export async function bankBalance(): Promise<number> {
  const rows = await call<{ balance: number }[]>('account.move.line', 'search_read', {
    domain: [['account_id.account_type', '=', 'asset_cash'], ['parent_state', '=', 'posted']],
    fields: ['balance'],
  })
  return Math.round(rows.reduce((a, r) => a + r.balance, 0) * 100) / 100
}
