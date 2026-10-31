import 'server-only'
import type { AdminRepo } from './data/repo'
import { addDays, isoDay } from './format'
import { invoiceAmountCents, invoiceLabel, sendDatesBetween } from './billing'

/** Zet voor elk actief contract de facturen van de komende `days` dagen klaar (status 'to_send'). Idempotent. */
export async function prepareUpcomingInvoices(repo: AdminRepo, days = 14) {
  const today = isoDay(new Date())
  const until = isoDay(addDays(new Date(), days))
  const contracts = await repo.listContracts()
  let created = 0
  for (const c of contracts) {
    if (c.status !== 'active') continue
    for (const d of sendDatesBetween(c, today, until)) {
      const existing = await repo.listInvoices({ clientId: c.client_id })
      if (existing.some((i) => i.contract_id === c.id && i.send_date === d)) continue
      await repo.createInvoice({
        client_id: c.client_id,
        contract_id: c.id,
        label: invoiceLabel(d),
        send_date: d,
        amount_cents: invoiceAmountCents(c),
        status: 'to_send',
      })
      created++
    }
  }
  return created
}
