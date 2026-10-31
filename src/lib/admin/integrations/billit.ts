import 'server-only'
import type { Client, Contract, Invoice } from '../types'

/**
 * Billit-koppeling: zet een verkoopfactuur klaar als order in Billit (POST /v1/orders).
 * Verzenden (Peppol/mail) gebeurt bewust in Billit zelf, zodat iemand de factuur nog nakijkt.
 *
 * Docs: https://docs.billit.be/docs/create-first-invoice.md
 * Te verifiëren met de sandbox-sleutel: de headernamen (ApiKey / PartyID) en de basis-URL.
 */

const BASE = process.env.BILLIT_API_BASE || 'https://api.billit.be'

export function isBillitConfigured() {
  return Boolean(process.env.BILLIT_API_KEY && process.env.BILLIT_PARTY_ID)
}

type BillitError = { errors?: { Code?: string; Description?: string }[] }

export async function createBillitInvoice(opts: {
  client: Client
  contract: Contract | null
  invoice: Invoice
  contactEmail?: string | null
}): Promise<string> {
  if (!isBillitConfigured())
    throw new Error('Billit is nog niet gekoppeld (BILLIT_API_KEY en BILLIT_PARTY_ID ontbreken).')
  const { client, contract, invoice } = opts

  const orderDate = invoice.send_date
  const expiry = new Date(Date.parse(orderDate) + 30 * 86_400_000).toISOString().slice(0, 10)

  const body = {
    OrderType: 'Invoice',
    OrderDirection: 'Income',
    OrderDate: orderDate,
    ExpiryDate: expiry,
    Reference: `IKR-${invoice.id.slice(0, 8)}`,
    Customer: {
      Name: client.name,
      VATNumber: client.vat_number ?? undefined,
      Email: client.billing_email ?? opts.contactEmail ?? undefined,
      PartyType: 'Customer',
      Nr: client.id.slice(0, 8),
    },
    OrderLines: [
      {
        Quantity: 1,
        UnitPriceExcl: invoice.amount_cents / 100,
        Description: `TikTok-content ${invoice.label ?? ''}`.trim(),
        DescriptionExtended: contract?.package_name ?? undefined,
        VATPercentage: 21,
      },
    ],
  }

  const res = await fetch(`${BASE}/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ApiKey: process.env.BILLIT_API_KEY!,
      PartyID: process.env.BILLIT_PARTY_ID!,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const parsed = JSON.parse(text) as BillitError
      detail = parsed.errors?.map((e) => e.Description ?? e.Code).join('; ') || text
    } catch {}
    throw new Error(`Billit gaf een fout (${res.status}): ${detail.slice(0, 300)}`)
  }
  return text.replace(/"/g, '').trim()
}
