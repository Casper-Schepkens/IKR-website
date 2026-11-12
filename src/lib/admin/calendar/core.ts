/** Kalender: de contact@-agenda gespiegeld, ingedeeld per soort (voor filters en kleuren). */

export const KINDS = {
  weekly: 'Weekly',
  sales: 'Sales calls',
  setter: 'Setter calls',
  draaidag: 'Draaidagen',
  overig: 'Overig',
} as const
export type Kind = keyof typeof KINDS
export const KIND_KEYS = Object.keys(KINDS) as Kind[]

export type CalItem = {
  id: string
  title: string
  kind: Kind
  /** Hele dag: enkel `day`; anders ook start en einde (ISO). */
  allDay: boolean
  day: string
  /** Laatste dag (inclusief) bij een item over meerdere dagen. */
  lastDay: string
  start: string | null
  end: string | null
  meetUrl: string | null
  /** Link in het dashboard (weekly, call, productie), als we het item herkennen. */
  href: string | null
}

export function classify(title: string): Kind {
  const t = title.toLowerCase()
  if (/\bweekly\b/.test(t)) return 'weekly'
  if (/sales ?call/.test(t)) return 'sales'
  if (/setter ?call/.test(t)) return 'setter'
  if (/draaidag|opnamedag|shoot/.test(t)) return 'draaidag'
  return 'overig'
}

const BRUSSELS = 'Europe/Brussels'
/** Datum (YYYY-MM-DD) in Belgische tijd. */
export const dayIn = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: BRUSSELS, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
export const timeIn = (iso: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: BRUSSELS, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Maand ('2026-11') → eerste en laatste dag, en de dagen van het rooster (maandag tot zondag, volledige weken). */
export function monthGrid(month: string) {
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const dow = (d: string) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7 // maandag = 0
  const start = addDays(first, -dow(first))
  const end = addDays(last, 6 - dow(last))
  const days: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return { first, last, days }
}

export const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}

/** Items per dag (een item over meerdere dagen staat op elke dag), op tijd gesorteerd; hele dag eerst. */
export function byDay(items: CalItem[], days: string[]) {
  const map = new Map<string, CalItem[]>(days.map((d) => [d, []]))
  for (const it of items) for (let d = it.day; d <= it.lastDay; d = addDays(d, 1)) map.get(d)?.push(it)
  for (const list of map.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.start ?? '').localeCompare(b.start ?? ''))
  return map
}
