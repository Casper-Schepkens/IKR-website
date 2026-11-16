/**
 * Deadlineregels, draaidag-ritme en planning van interne taken: als data (jsonb in de database)
 * en als gewone tekst ("7 dagen voor draaidag", "eerste woensdag", "elke 2e zondag", "laatste maandag").
 * Tekst ↔ regel gaat heen en terug, zodat het dashboard, Grok Bot en het team dezelfde taal spreken.
 */

export type Anchor = 'getekend' | 'kickoff' | 'strategie' | 'draaidag' | 'vorige_draaidag'
export const ANCHORS: Anchor[] = ['getekend', 'kickoff', 'strategie', 'draaidag', 'vorige_draaidag']
export const ANCHOR_LABEL: Record<Anchor, string> = {
  getekend: 'contract getekend',
  kickoff: 'kick-off',
  strategie: 'strategiemeeting',
  draaidag: 'draaidag',
  vorige_draaidag: 'vorige draaidag',
}

/** 1..5 = eerste..vijfde, -1 = laatste. */
export type Nth = 1 | 2 | 3 | 4 | 5 | -1
/** 0 = zondag … 6 = zaterdag (zoals Date.getUTCDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Rule =
  | { kind: 'none' }
  /** X dagen voor (negatief) of na een anker; `fallback` als dat anker (nog) niet geldt. */
  | { kind: 'offset'; anchor: Anchor; days: number; fallback?: { anchor: Anchor; days: number } }
  /** Eerste "n-de weekdag van de maand" op of na het anker (standaard: draaidag, of contract bij de opstart). */
  | { kind: 'monthday'; nth: Nth; weekday: Weekday; anchor?: Anchor }
  | { kind: 'date'; date: string }

export type Rhythm = { kind: 'weeks'; n: number } | { kind: 'monthly'; nth: Nth; weekday: Weekday }
export type Schedule = { kind: 'weekly'; weekday: Weekday } | { kind: 'monthly'; nth: Nth; weekday: Weekday }

const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const WEEKDAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const NTH_WORD: Record<string, Nth> = {
  eerste: 1, '1e': 1, '1ste': 1, tweede: 2, '2e': 2, '2de': 2, derde: 3, '3e': 3, '3de': 3,
  vierde: 4, '4e': 4, '4de': 4, vijfde: 5, '5e': 5, '5de': 5, laatste: -1,
}
const NTH_LABEL: Record<string, string> = { '1': 'eerste', '2': 'tweede', '3': 'derde', '4': 'vierde', '5': 'vijfde', '-1': 'laatste' }
const DATE = /^\d{4}-\d{2}-\d{2}$/

// ─── Datums ────────────────────────────────────────────────
export { addDays } from '../dates'
import { addDays } from '../dates'
const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay() as Weekday
export const isDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !DATE.test(v)) return false
  const t = Date.parse(`${v}T00:00:00Z`)
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v
}

/** De n-de weekdag van een maand (maand 0-11, mag overlopen), of null als die niet bestaat (bv. 5e maandag). */
export function nthWeekdayOfMonth(year: number, month: number, nth: Nth, weekday: Weekday): string | null {
  const first = new Date(Date.UTC(year, month, 1))
  const y = first.getUTCFullYear()
  const m = first.getUTCMonth()
  const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  let day: number
  if (nth === -1) {
    const lastDow = new Date(Date.UTC(y, m, daysIn)).getUTCDay()
    day = daysIn - ((lastDow - weekday + 7) % 7)
  } else {
    day = 1 + ((weekday - first.getUTCDay() + 7) % 7) + (nth - 1) * 7
    if (day > daysIn) return null
  }
  return new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10)
}

/** Eerste "n-de weekdag van de maand" op (of strikt na) een dag. */
export function monthdayFrom(from: string, nth: Nth, weekday: Weekday, strict = false): string {
  const d = new Date(`${from}T00:00:00Z`)
  for (let i = 0; i < 26; i++) {
    const hit = nthWeekdayOfMonth(d.getUTCFullYear(), d.getUTCMonth() + i, nth, weekday)
    if (hit && (strict ? hit > from : hit >= from)) return hit
  }
  throw new Error('Geen datum gevonden voor deze regel.')
}

/** Laatste "n-de weekdag van de maand" op of vóór een dag. */
function monthdayOnOrBefore(day: string, nth: Nth, weekday: Weekday): string | null {
  const d = new Date(`${day}T00:00:00Z`)
  for (let i = 0; i < 26; i++) {
    const hit = nthWeekdayOfMonth(d.getUTCFullYear(), d.getUTCMonth() - i, nth, weekday)
    if (hit && hit <= day) return hit
  }
  return null
}

// ─── Deadlineregel berekenen ─────────────────────────────
export type RuleContext = {
  /** Datum van een anker voor deze stap (null = nog niet gekend). */
  anchor: (a: Anchor) => string | null
  /** Is er een vorige draaidag? (anders geldt de fallback van "vorige draaidag") */
  hasPrevious: boolean
  /** Anker voor "eerste woensdag" zonder anker. */
  defaultAnchor: Anchor
}

/** Welk deel van de regel nu geldt (om gelijktijdige stappen zonder datum samen te tonen). */
export function ruleSlot(rule: Rule, ctx: RuleContext): string {
  if (rule.kind !== 'offset') return JSON.stringify(rule)
  const useFallback = !ctx.anchor(rule.anchor) && rule.fallback && !(rule.anchor === 'vorige_draaidag' && ctx.hasPrevious)
  const r = useFallback ? rule.fallback! : rule
  return `${r.anchor}:${r.days}`
}

export function ruleDue(rule: Rule, ctx: RuleContext): string | null {
  if (rule.kind === 'none') return null
  if (rule.kind === 'date') return rule.date
  if (rule.kind === 'monthday') {
    const base = ctx.anchor(rule.anchor ?? ctx.defaultAnchor)
    return base ? monthdayFrom(base, rule.nth, rule.weekday) : null
  }
  const base = ctx.anchor(rule.anchor)
  if (base) return addDays(base, rule.days)
  // "Vorige draaidag" zonder datum terwijl er wel een vorige is: nog niet gekend (geen fallback).
  if (rule.anchor === 'vorige_draaidag' && ctx.hasPrevious) return null
  if (!rule.fallback) return null
  const fb = ctx.anchor(rule.fallback.anchor)
  return fb ? addDays(fb, rule.fallback.days) : null
}

/** Volgende draaidag volgens het ritme (na de vorige; zonder vorige vanaf vandaag). */
export function nextShootDate(rhythm: Rhythm, previous: string | null, today: string): string {
  if (rhythm.kind === 'weeks') return previous ? addDays(previous, rhythm.n * 7) : today
  return monthdayFrom(previous ?? today, rhythm.nth, rhythm.weekday, Boolean(previous))
}

/** Huidige keer van een terugkerende taak: de laatste op of vóór vandaag als die nog open is, anders de volgende. */
export function currentOccurrence(s: Schedule, startOn: string, done: Set<string>, today: string): string {
  const last = s.kind === 'weekly' ? addDays(today, -((weekdayOf(today) - s.weekday + 7) % 7)) : monthdayOnOrBefore(today, s.nth, s.weekday)
  if (last && last >= startOn && !done.has(last)) return last
  return s.kind === 'weekly' ? addDays(today, ((s.weekday - weekdayOf(today) + 7) % 7) || 7) : monthdayFrom(today, s.nth, s.weekday, true)
}

// ─── Labels ────────────────────────────────────────────────
const dayWord = (n: number) => `${n} ${n === 1 ? 'dag' : 'dagen'}`
const offsetLabel = (anchor: Anchor, days: number) =>
  days === 0 ? `op ${ANCHOR_LABEL[anchor]}` : `${dayWord(Math.abs(days))} ${days < 0 ? 'voor' : 'na'} ${ANCHOR_LABEL[anchor]}`
const nthLabel = (nth: Nth, weekday: Weekday) => `${NTH_LABEL[String(nth)]} ${WEEKDAYS[weekday]}`
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })

export function ruleLabel(r: Rule): string {
  if (r.kind === 'none') return 'geen deadline'
  if (r.kind === 'date') return `vaste datum ${fmtDay(r.date)}`
  if (r.kind === 'monthday') return `${nthLabel(r.nth, r.weekday)} van de maand${r.anchor ? ` vanaf ${ANCHOR_LABEL[r.anchor]}` : ''}`
  return `${offsetLabel(r.anchor, r.days)}${r.fallback ? `, anders ${offsetLabel(r.fallback.anchor, r.fallback.days)}` : ''}`
}
/** Zelfde als ruleLabel, maar in een vorm die parseRule terug inleest. */
export function ruleText(r: Rule): string {
  if (r.kind === 'date') return r.date
  return ruleLabel(r)
}
export function rhythmLabel(r: Rhythm | null | undefined): string {
  if (!r) return 'geen ritme'
  if (r.kind === 'weeks') return r.n === 1 ? 'elke week' : `elke ${r.n} weken`
  return `elke ${nthLabel(r.nth, r.weekday)} van de maand`
}
export function scheduleLabel(s: Schedule): string {
  return s.kind === 'weekly' ? `elke ${WEEKDAYS[s.weekday]}` : `elke ${nthLabel(s.nth, s.weekday)} van de maand`
}

// ─── Tekst inlezen ─────────────────────────────────────────
const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

function weekdayFrom(word: string): Weekday | null {
  const w = word.replace(/[.,]$/, '')
  const i = WEEKDAYS.findIndex((d) => d === w || (w.length >= 2 && d.startsWith(w)))
  if (i >= 0) return i as Weekday
  const j = WEEKDAY_SHORT.indexOf(w)
  return j >= 0 ? (j as Weekday) : null
}

function anchorFrom(text: string): Anchor | null {
  const t = norm(text).replace(/^(de|het)\s+/, '')
  if (/^vorige draaidag/.test(t)) return 'vorige_draaidag'
  if (/^draaidag/.test(t)) return 'draaidag'
  if (/^(contract|getekend|ondertekening|tekenen)/.test(t)) return 'getekend'
  if (/^kick-?off/.test(t)) return 'kickoff'
  if (/^strategie/.test(t)) return 'strategie'
  return null
}

const ANCHOR_HINT = 'draaidag, vorige draaidag, contract, kick-off of strategiemeeting'

function parseOffset(t: string): { anchor: Anchor; days: number } {
  if (/^op /.test(t) || anchorFrom(t)) {
    const a = anchorFrom(t.replace(/^op /, ''))
    if (!a) throw new Error(`Onbekend anker in "${t}". Kies ${ANCHOR_HINT}.`)
    return { anchor: a, days: 0 }
  }
  const m = t.match(/^(-?\d+)\s*(dag|dagen|d|week|weken|w)\s+(voor|na)\s+(.+)$/)
  if (!m) throw new Error(`Snap de regel "${t}" niet. Voorbeelden: "7 dagen voor draaidag", "2 weken na kick-off", "eerste woensdag", "2026-12-24" of "geen".`)
  const a = anchorFrom(m[4])
  if (!a) throw new Error(`Onbekend anker "${m[4]}". Kies ${ANCHOR_HINT}.`)
  const n = Math.abs(Number(m[1])) * (/^w/.test(m[2]) ? 7 : 1)
  return { anchor: a, days: m[3] === 'voor' ? -n : n }
}

/** "7 dagen voor draaidag", "21 dagen na vorige draaidag, anders 7 dagen na strategiemeeting", "eerste woensdag", "2026-12-24", "geen". */
export function parseRule(text: string): Rule {
  const t = norm(text)
  if (!t || /^(geen|geen deadline|-)$/.test(t)) return { kind: 'none' }
  const date = t.replace(/^vaste datum\s+/, '')
  if (isDate(date)) return { kind: 'date', date }
  if (DATE.test(date)) throw new Error(`"${date}" is geen geldige datum.`)
  const md = t.match(/^(?:elke\s+)?(\S+)\s+(\S+)(?:\s+van de maand)?(?:\s+(?:vanaf|na|op of na)\s+(.+))?$/)
  if (md && md[1] in NTH_WORD && weekdayFrom(md[2]) !== null) {
    const anchor = md[3] ? anchorFrom(md[3]) : undefined
    if (md[3] && !anchor) throw new Error(`Onbekend anker "${md[3]}". Kies ${ANCHOR_HINT}.`)
    return { kind: 'monthday', nth: NTH_WORD[md[1]], weekday: weekdayFrom(md[2])!, ...(anchor ? { anchor } : {}) }
  }
  const [main, alt] = t.split(/\s*,?\s*(?:anders|eerste keer:?)\s+/)
  const o = parseOffset(main.replace(/[()]/g, '').trim())
  return alt ? { kind: 'offset', ...o, fallback: parseOffset(alt.replace(/[()]/g, '').trim()) } : { kind: 'offset', ...o }
}

/** "elke 2e zondag", "elke 3 weken", "elke week", "geen". null = geen ritme. */
export function parseRhythm(text: string): Rhythm | null {
  const t = norm(text).replace(/ van de maand$/, '')
  if (!t || /^(geen|geen ritme|-)$/.test(t)) return null
  if (/^(elke|iedere) week$/.test(t)) return { kind: 'weeks', n: 1 }
  const w = t.match(/^(?:elke|iedere|om de)\s+(\d+)\s+weken$/)
  if (w) {
    const n = Number(w[1])
    if (n < 1 || n > 26) throw new Error('Ritme: tussen 1 en 26 weken.')
    return { kind: 'weeks', n }
  }
  const m = t.match(/^(?:elke|iedere)\s+(\S+)\s+(\S+)$/)
  if (m && m[1] in NTH_WORD && weekdayFrom(m[2]) !== null) return { kind: 'monthly', nth: NTH_WORD[m[1]], weekday: weekdayFrom(m[2])! }
  throw new Error(`Snap het ritme "${text}" niet. Voorbeelden: "elke 2e zondag", "elke 3 weken", "geen".`)
}

/** "elke maandag", "wekelijks op vrijdag", "laatste maandag", "elke eerste woensdag van de maand". */
export function parseSchedule(text: string): Schedule {
  const t = norm(text).replace(/ van de maand$/, '').replace(/^(elke|iedere|maandelijks( op)?|wekelijks( op)?)\s+/, '')
  const one = weekdayFrom(t)
  if (one !== null && !t.includes(' ')) return { kind: 'weekly', weekday: one }
  const m = t.match(/^(\S+)\s+(\S+)$/)
  if (m && m[1] in NTH_WORD && weekdayFrom(m[2]) !== null) return { kind: 'monthly', nth: NTH_WORD[m[1]], weekday: weekdayFrom(m[2])! }
  throw new Error(`Snap de planning "${text}" niet. Voorbeelden: "elke maandag", "laatste maandag", "eerste woensdag".`)
}

// ─── Controle van opgeslagen data (jsonb) ───────────────
const isNth = (v: unknown): v is Nth => [1, 2, 3, 4, 5, -1].includes(v as number)
const isWeekday = (v: unknown): v is Weekday => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6
const isAnchor = (v: unknown): v is Anchor => ANCHORS.includes(v as Anchor)
const isDays = (v: unknown): v is number => Number.isInteger(v) && Math.abs(v as number) <= 400

export function cleanRule(v: unknown): Rule {
  const r = (v ?? {}) as Record<string, unknown>
  if (r.kind === 'date' && isDate(r.date)) return { kind: 'date', date: r.date }
  if (r.kind === 'monthday' && isNth(r.nth) && isWeekday(r.weekday)) return { kind: 'monthday', nth: r.nth, weekday: r.weekday, ...(isAnchor(r.anchor) ? { anchor: r.anchor } : {}) }
  if (r.kind === 'offset' && isAnchor(r.anchor) && isDays(r.days)) {
    const f = (r.fallback ?? null) as Record<string, unknown> | null
    return { kind: 'offset', anchor: r.anchor, days: r.days, ...(f && isAnchor(f.anchor) && isDays(f.days) ? { fallback: { anchor: f.anchor, days: f.days } } : {}) }
  }
  return { kind: 'none' }
}
export function cleanRhythm(v: unknown): Rhythm | null {
  const r = (v ?? null) as Record<string, unknown> | null
  if (r?.kind === 'weeks' && Number.isInteger(r.n) && (r.n as number) >= 1 && (r.n as number) <= 26) return { kind: 'weeks', n: r.n as number }
  if (r?.kind === 'monthly' && isNth(r.nth) && isWeekday(r.weekday)) return { kind: 'monthly', nth: r.nth, weekday: r.weekday }
  return null
}
export function cleanSchedule(v: unknown): Schedule | null {
  const r = (v ?? null) as Record<string, unknown> | null
  if (r?.kind === 'weekly' && isWeekday(r.weekday)) return { kind: 'weekly', weekday: r.weekday }
  if (r?.kind === 'monthly' && isNth(r.nth) && isWeekday(r.weekday)) return { kind: 'monthly', nth: r.nth, weekday: r.weekday }
  return null
}
