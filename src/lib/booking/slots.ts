import { isoDay } from '@/lib/admin/format'
import { addDays } from '@/lib/admin/dates'

/**
 * Slotberekening voor /boek. Puur (geen database, geen Google): makkelijk te testen.
 * Alles in Europe/Brussels: weekuren en uitzonderingen zijn lokale tijden; elk lokaal tijdstip wordt
 * apart naar UTC omgezet, zodat zomer- en wintertijd vanzelf kloppen. Opslaan gebeurt in UTC.
 */

/** 1 = maandag … 7 = zondag (ISO). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export const WEEKDAY_LABELS: Record<Weekday, string> = { 1: 'maandag', 2: 'dinsdag', 3: 'woensdag', 4: 'donderdag', 5: 'vrijdag', 6: 'zaterdag', 7: 'zondag' }

export type WeeklyBlock = { weekday: Weekday; start: string; end: string }
/** add = extra blok op die dag; remove = blok schrappen (zonder start/end = de hele dag niet). */
export type DayException = { day: string; kind: 'add' | 'remove'; start?: string | null; end?: string | null }
/** Bezet (UTC, ms). */
export type Busy = { start: number; end: number }

export type MemberAvailability = {
  email: string
  weekly: WeeklyBlock[]
  exceptions: DayException[]
  busy: Busy[]
}

export type Slot = { start: string; end: string; member: string }

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

/** 'HH:MM' (of 'HH:MM:SS' uit Postgres) → minuten sinds middernacht. '24:00' mag als einde. */
export function toMinutes(t: string): number {
  const v = t.slice(0, 5)
  if (v === '24:00') return 1440
  const m = TIME.exec(v)
  if (!m) throw new Error(`Ongeldig uur: "${t}"`)
  return Number(m[1]) * 60 + Number(m[2])
}
export const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** ISO-weekdag van een kalenderdag ('YYYY-MM-DD'). */
export function weekdayOf(day: string): Weekday {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay()
  return (d === 0 ? 7 : d) as Weekday
}

type Range = [number, number]

function merge(ranges: Range[]): Range[] {
  const sorted = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  const out: Range[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}

function subtract(ranges: Range[], cut: Range): Range[] {
  const out: Range[] = []
  for (const [a, b] of ranges) {
    if (cut[1] <= a || cut[0] >= b) out.push([a, b])
    else {
      if (cut[0] > a) out.push([a, cut[0]])
      if (cut[1] < b) out.push([cut[1], b])
    }
  }
  return out
}

/**
 * Beschikbare blokken (lokale minuten) van één teamlid op één dag: vaste weekuren, min de geschrapte
 * blokken, plus de extra blokken. Een "hele dag niet" schrapt ook vaste uren, maar extra blokken voor
 * dezelfde dag blijven gelden (zo kan je "enkel 14:00-15:00 die dag" instellen).
 */
export function dayWindows(day: string, weekly: WeeklyBlock[], exceptions: DayException[]): Range[] {
  const wd = weekdayOf(day)
  const ex = exceptions.filter((e) => e.day === day)
  let ranges: Range[] = ex.some((e) => e.kind === 'remove' && !e.start)
    ? []
    : merge(weekly.filter((b) => b.weekday === wd).map((b) => [toMinutes(b.start), toMinutes(b.end)]))
  for (const e of ex) if (e.kind === 'remove' && e.start && e.end) ranges = subtract(ranges, [toMinutes(e.start), toMinutes(e.end)])
  ranges = merge([...ranges, ...ex.filter((e) => e.kind === 'add' && e.start && e.end).map((e): Range => [toMinutes(e.start!), toMinutes(e.end!)])])
  return ranges
}

const brusselsParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Brussels',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Verschil tussen Brusselse tijd en UTC op een tijdstip (ms): 1 uur in de winter, 2 in de zomer. */
function offsetAt(ms: number) {
  const p = Object.fromEntries(brusselsParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - (ms - (ms % 60_000))
}

/**
 * Lokaal tijdstip (dag + minuten) → UTC ms. 1440 = middernacht van de volgende dag.
 * Twee stappen, zodat ook de uren vlak rond de overgang (bv. 01:00 op de nacht naar zomertijd) kloppen.
 */
export function localToUtc(day: string, minutes: number): number {
  if (minutes >= 1440) return localToUtc(addDays(day, 1), minutes - 1440)
  const [y, m, d] = day.split('-').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60)
  const guess = asUtc - offsetAt(asUtc)
  return asUtc - offsetAt(guess)
}

/** Lokale Brusselse minuten van een UTC-tijdstip (om te controleren of een kwartier echt bestaat). */
function localMinutes(ms: number) {
  const p = Object.fromEntries(brusselsParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return Number(p.hour) * 60 + Number(p.minute)
}

const overlaps = (s: number, e: number, busy: Busy[]) => busy.some((b) => s < b.end && b.start < e)

export type SlotOptions = {
  now: Date
  /** Duur van de call in minuten (45). */
  minutes: number
  /** Starttijden per zoveel minuten, vanaf het hele uur (15 → :00, :15, :30, :45). */
  step: number
  /** Laatste boekbare dag = vandaag + horizonDays (Brusselse kalenderdagen). */
  horizonDays: number
  /** Volgorde bij meerdere vrije teamleden (e-mailadressen); wie er niet in staat komt achteraan. */
  priority: string[]
}

/** Eerste en laatste boekbare dag. */
export function bookableDays(now: Date, horizonDays: number) {
  const first = isoDay(now)
  return { first, last: addDays(first, horizonDays) }
}

/** Vrije startmomenten van één teamlid op één dag (UTC ms), aaneensluitend `minutes` vrij binnen de beschikbaarheid. */
export function memberStartsOnDay(day: string, m: MemberAvailability, o: Pick<SlotOptions, 'minutes' | 'step' | 'now'>): number[] {
  const out: number[] = []
  const nowMs = o.now.getTime()
  for (const [a, b] of dayWindows(day, m.weekly, m.exceptions)) {
    const winStart = localToUtc(day, a)
    const winEnd = localToUtc(day, b)
    for (let t = Math.ceil(a / o.step) * o.step; t < b; t += o.step) {
      const start = localToUtc(day, t)
      // Kwartier dat niet bestaat (bv. 02:30 bij de overgang naar zomertijd): overslaan.
      if (localMinutes(start) !== t % 1440) continue
      const end = start + o.minutes * 60_000
      if (start < winStart || end > winEnd) continue
      if (start <= nowMs) continue
      if (overlaps(start, end, m.busy)) continue
      out.push(start)
    }
  }
  return out
}

/** Wie krijgt een slot: de eerste vrije volgens de volgorde (onbekenden achteraan, alfabetisch). */
export function rankMembers(emails: string[], priority: string[]) {
  const rank = (e: string) => {
    const i = priority.indexOf(e)
    return i === -1 ? priority.length : i
  }
  return [...emails].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

/**
 * Alle vrije slots tussen vandaag en de horizon, elk toegewezen aan het eerste vrije teamlid.
 * Een slot bestaat als minstens één teamlid kan.
 */
export function computeSlots(members: MemberAvailability[], o: SlotOptions): Slot[] {
  const { first, last } = bookableDays(o.now, o.horizonDays)
  const ordered = rankMembers(members.map((m) => m.email), o.priority).map((e) => members.find((m) => m.email === e)!)
  const byStart = new Map<number, string>()
  for (let day = first; day <= last; day = addDays(day, 1)) {
    for (const m of ordered) {
      for (const s of memberStartsOnDay(day, m, o)) if (!byStart.has(s)) byStart.set(s, m.email)
    }
  }
  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([s, member]) => ({ start: new Date(s).toISOString(), end: new Date(s + o.minutes * 60_000).toISOString(), member }))
}

/** Welke teamleden (in volgorde) een bepaald startmoment kunnen. Leeg = niemand. */
export function candidatesFor(startIso: string, members: MemberAvailability[], o: SlotOptions): string[] {
  const start = Date.parse(startIso)
  if (!Number.isFinite(start)) return []
  const day = isoDay(new Date(start))
  const { first, last } = bookableDays(o.now, o.horizonDays)
  if (day < first || day > last) return []
  const free = members.filter((m) => memberStartsOnDay(day, m, o).includes(start)).map((m) => m.email)
  return rankMembers(free, o.priority)
}

/** Slots per Brusselse dag, voor de kalender op /boek (zonder namen). */
export function groupByDay(slots: Pick<Slot, 'start'>[]) {
  const days = new Map<string, string[]>()
  for (const s of slots) {
    const d = isoDay(new Date(s.start))
    days.set(d, [...(days.get(d) ?? []), s.start])
  }
  return [...days.entries()].map(([day, starts]) => ({ day, starts }))
}

/**
 * Agenda-afspraken die in de beschikbaarheid van een teamlid vallen (tussen nu en de horizon). Die
 * momenten verdwijnen vanzelf van /boek als vrij/bezet aan staat; dit lijstje maakt het zichtbaar
 * (bv. "woensdag 13:00-15:00 staat open in je weekuren, maar je agenda zegt bezet").
 * Geeft enkel het overlappende deel terug, samengevoegd.
 */
export function availabilityConflicts(m: Pick<MemberAvailability, 'weekly' | 'exceptions'>, calendarBusy: Busy[], o: Pick<SlotOptions, 'now' | 'horizonDays'>): Busy[] {
  const { first, last } = bookableDays(o.now, o.horizonDays)
  const nowMs = o.now.getTime()
  const out: Range[] = []
  for (let day = first; day <= last; day = addDays(day, 1)) {
    for (const [a, b] of dayWindows(day, m.weekly, m.exceptions)) {
      const ws = Math.max(localToUtc(day, a), nowMs)
      const we = localToUtc(day, b)
      for (const x of calendarBusy) {
        const s = Math.max(ws, x.start)
        const e = Math.min(we, x.end)
        if (e > s) out.push([s, e])
      }
    }
  }
  return merge(out).map(([start, end]) => ({ start, end }))
}
