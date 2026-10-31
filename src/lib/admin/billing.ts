import type { Contract } from './types'

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m: m - 1, d }
}

/** Volgende datum (YYYY-MM-DD, vandaag inbegrepen) waarop dit contract gefactureerd moet worden, of null. */
export function nextSendDate(contract: Contract, todayIso: string): string | null {
  if (contract.status !== 'active') return null
  const start = parseDay(contract.start_date)
  const end = contract.end_date ?? null

  if (contract.billing_cycle === 'one_off') {
    return contract.start_date >= todayIso ? contract.start_date.slice(0, 10) : null
  }

  const step = contract.billing_cycle === 'quarterly' ? 3 : 1
  let y = start.y
  let m = start.m
  for (let i = 0; i < 240; i++) {
    const candidate = ymd(y, m, contract.billing_day)
    if (candidate >= contract.start_date.slice(0, 10) && candidate >= todayIso) {
      if (end && candidate > end) return null
      return candidate
    }
    m += step
    if (m > 11) {
      y += Math.floor(m / 12)
      m = m % 12
    }
  }
  return null
}

/** Alle factuurdata tussen twee data (inclusief), voor het klaarzetten van facturen. */
export function sendDatesBetween(contract: Contract, fromIso: string, toIso: string): string[] {
  const out: string[] = []
  let cursor = fromIso
  for (let i = 0; i < 24; i++) {
    const next = nextSendDate(contract, cursor)
    if (!next || next > toIso) break
    out.push(next)
    cursor = new Date(Date.parse(next) + 86_400_000).toISOString().slice(0, 10)
  }
  return out
}

export function invoiceAmountCents(contract: Contract) {
  return contract.billing_cycle === 'quarterly'
    ? contract.monthly_amount_cents * 3
    : contract.monthly_amount_cents
}

export function invoiceLabel(sendDateIso: string) {
  const { y, m } = parseDay(sendDateIso)
  const name = new Intl.DateTimeFormat('nl-BE', { month: 'long' }).format(
    new Date(Date.UTC(y, m, 15)),
  )
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`
}

/** Looptijd in hele maanden: [verstreken, totaal]. */
export function contractProgress(
  contract: Contract,
  todayIso: string,
): { elapsed: number; total: number } | null {
  if (!contract.end_date) return null
  const s = parseDay(contract.start_date)
  const e = parseDay(contract.end_date)
  const t = parseDay(todayIso)
  const total = Math.max(1, (e.y - s.y) * 12 + (e.m - s.m) + (e.d >= s.d ? 1 : 0))
  const elapsed = Math.min(
    total,
    Math.max(0, (t.y - s.y) * 12 + (t.m - s.m) + (t.d >= s.d ? 1 : 0)),
  )
  return { elapsed, total }
}

export function daysUntil(iso: string, todayIso: string) {
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(todayIso)) / 86_400_000)
}
