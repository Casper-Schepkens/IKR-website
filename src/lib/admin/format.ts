export const TZ = 'Europe/Brussels'

export function euro(cents: number) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function fmtDate(
  iso: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) {
  return new Intl.DateTimeFormat('nl-BE', { timeZone: TZ, ...opts }).format(new Date(iso))
}

export function fmtTime(iso: string | Date) {
  return new Intl.DateTimeFormat('nl-BE', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** 'YYYY-MM-DD' in Brusselse tijd. */
export function isoDay(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function daysBetween(fromIso: string | Date, toIso: string | Date) {
  const a = new Date(fromIso)
  const b = new Date(toIso)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** Zet een lokale Brusselse datum + uur ('2026-11-03', '09:30') om naar een ISO-tijdstip (UTC), zomer- en wintertijd inbegrepen. */
export function brusselsToIso(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, hh, mm)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(new Date(asUtc))
      .map((p) => [p.type, p.value]),
  )
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
  return new Date(asUtc - (shown - asUtc)).toISOString()
}
