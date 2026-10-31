export const TZ = 'Europe/Brussels'

export function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export function euro(cents: number) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat('nl-BE', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function percent(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits).replace('.', ',')}%`
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

export function fmtLongDate(iso: string | Date) {
  return fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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

/** Maandag 00:00 (lokale tijd van de server, voldoende voor weekweergave) van de week waarin `d` valt. */
export function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isoWeekNumber(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function greeting(d = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat('nl-BE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(d),
  )
  if (h < 12) return 'Goeiemorgen'
  if (h < 18) return 'Goeiemiddag'
  return 'Goeieavond'
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
