import { describe, expect, it } from 'vitest'
import { currentOccurrence, monthdayFrom, nextShootDate, nthWeekdayOfMonth, parseRhythm, parseRule, parseSchedule, rhythmLabel, ruleDue, ruleLabel, ruleText, scheduleLabel, type Rule } from './rules'

describe('regels als tekst', () => {
  it('dagen voor/na een anker, met "anders"', () => {
    expect(parseRule('7 dagen voor draaidag')).toEqual({ kind: 'offset', anchor: 'draaidag', days: -7 })
    expect(parseRule('2 weken na kick-off')).toEqual({ kind: 'offset', anchor: 'kickoff', days: 14 })
    expect(parseRule('op draaidag')).toEqual({ kind: 'offset', anchor: 'draaidag', days: 0 })
    expect(parseRule('1 dag na Contract')).toEqual({ kind: 'offset', anchor: 'getekend', days: 1 })
    expect(parseRule('21 dagen na vorige draaidag, anders 7 dagen na strategiemeeting')).toEqual({
      kind: 'offset',
      anchor: 'vorige_draaidag',
      days: 21,
      fallback: { anchor: 'strategie', days: 7 },
    })
  })
  it('vaste dag in de maand, vaste datum, geen', () => {
    expect(parseRule('eerste woensdag')).toEqual({ kind: 'monthday', nth: 1, weekday: 3 })
    expect(parseRule('laatste vrijdag van de maand vanaf kick-off')).toEqual({ kind: 'monthday', nth: -1, weekday: 5, anchor: 'kickoff' })
    expect(parseRule('2e di')).toEqual({ kind: 'monthday', nth: 2, weekday: 2 })
    expect(parseRule('2026-12-24')).toEqual({ kind: 'date', date: '2026-12-24' })
    expect(parseRule('geen')).toEqual({ kind: 'none' })
    expect(() => parseRule('2026-02-31')).toThrow(/geen geldige datum/)
    expect(() => parseRule('ergens volgende week')).toThrow(/Snap de regel/)
    expect(() => parseRule('3 dagen na lunch')).toThrow(/Onbekend anker/)
  })
  it('label ↔ tekst gaat heen en terug', () => {
    const rules: Rule[] = [
      { kind: 'offset', anchor: 'draaidag', days: -8 },
      { kind: 'offset', anchor: 'strategie', days: 0, fallback: { anchor: 'kickoff', days: 14 } },
      { kind: 'monthday', nth: 3, weekday: 1, anchor: 'getekend' },
      { kind: 'date', date: '2027-01-15' },
      { kind: 'none' },
    ]
    for (const r of rules) expect(parseRule(ruleText(r))).toEqual(r)
    expect(ruleLabel(rules[0])).toBe('8 dagen voor draaidag')
    expect(ruleLabel(rules[1])).toBe('op strategiemeeting, anders 14 dagen na kick-off')
  })
})

describe('datums', () => {
  it('n-de weekdag van de maand', () => {
    expect(nthWeekdayOfMonth(2026, 10, 2, 0)).toBe('2026-11-08') // 2e zondag november
    expect(nthWeekdayOfMonth(2026, 10, -1, 1)).toBe('2026-11-30') // laatste maandag
    expect(nthWeekdayOfMonth(2026, 1, 5, 1)).toBeNull() // geen 5e maandag in februari 2026
    expect(monthdayFrom('2026-11-09', 2, 0)).toBe('2026-12-13')
    expect(monthdayFrom('2026-11-08', 2, 0)).toBe('2026-11-08')
    expect(monthdayFrom('2026-11-08', 2, 0, true)).toBe('2026-12-13')
  })
  it('deadline uit een regel', () => {
    const ctx = { anchor: (a: string) => ({ draaidag: '2026-12-03', strategie: null, kickoff: '2026-11-10' })[a as 'draaidag'] ?? null, hasPrevious: false, defaultAnchor: 'draaidag' as const }
    expect(ruleDue({ kind: 'offset', anchor: 'draaidag', days: -7 }, ctx)).toBe('2026-11-26')
    expect(ruleDue({ kind: 'offset', anchor: 'strategie', days: 0, fallback: { anchor: 'kickoff', days: 14 } }, ctx)).toBe('2026-11-24')
    expect(ruleDue({ kind: 'monthday', nth: 1, weekday: 3 }, ctx)).toBe('2027-01-06')
    // Vorige draaidag bestaat maar heeft geen datum: geen fallback.
    expect(ruleDue({ kind: 'offset', anchor: 'vorige_draaidag', days: 21, fallback: { anchor: 'kickoff', days: 0 } }, { ...ctx, hasPrevious: true })).toBeNull()
    expect(ruleDue({ kind: 'offset', anchor: 'vorige_draaidag', days: 21, fallback: { anchor: 'kickoff', days: 0 } }, ctx)).toBe('2026-11-10')
  })
})

describe('ritme en interne planning', () => {
  it('ritme', () => {
    expect(parseRhythm('elke 2e zondag')).toEqual({ kind: 'monthly', nth: 2, weekday: 0 })
    expect(parseRhythm('elke 3 weken')).toEqual({ kind: 'weeks', n: 3 })
    expect(parseRhythm('om de 2 weken')).toEqual({ kind: 'weeks', n: 2 })
    expect(parseRhythm('geen')).toBeNull()
    expect(rhythmLabel({ kind: 'monthly', nth: 2, weekday: 0 })).toBe('elke tweede zondag van de maand')
    expect(parseRhythm(rhythmLabel({ kind: 'monthly', nth: -1, weekday: 6 }))).toEqual({ kind: 'monthly', nth: -1, weekday: 6 })
    expect(nextShootDate({ kind: 'weeks', n: 3 }, '2026-11-03', '2026-11-20')).toBe('2026-11-24')
    expect(nextShootDate({ kind: 'monthly', nth: 2, weekday: 0 }, '2026-11-08', '2026-11-20')).toBe('2026-12-13')
    expect(nextShootDate({ kind: 'monthly', nth: 2, weekday: 0 }, null, '2026-11-20')).toBe('2026-12-13')
  })
  it('interne planning en de huidige keer', () => {
    expect(parseSchedule('elke maandag')).toEqual({ kind: 'weekly', weekday: 1 })
    expect(parseSchedule('wekelijks op vrijdag')).toEqual({ kind: 'weekly', weekday: 5 })
    expect(parseSchedule('laatste maandag')).toEqual({ kind: 'monthly', nth: -1, weekday: 1 })
    expect(parseSchedule(scheduleLabel({ kind: 'monthly', nth: 1, weekday: 3 }))).toEqual({ kind: 'monthly', nth: 1, weekday: 3 })
    const fri = { kind: 'weekly' as const, weekday: 5 as const }
    // Maandag 23/11: vrijdag 20/11 nog open → die is aan de beurt (te laat).
    expect(currentOccurrence(fri, '2026-11-01', new Set(), '2026-11-23')).toBe('2026-11-20')
    expect(currentOccurrence(fri, '2026-11-01', new Set(['2026-11-20']), '2026-11-23')).toBe('2026-11-27')
    // Gestart na de laatste vrijdag: de volgende.
    expect(currentOccurrence(fri, '2026-11-22', new Set(), '2026-11-23')).toBe('2026-11-27')
    // Vooraf afgevinkt (dinsdag 17/11 de vrijdag van 20/11): de vrijdag erna.
    expect(currentOccurrence(fri, '2026-11-17', new Set(['2026-11-20']), '2026-11-17')).toBe('2026-11-27')
    expect(currentOccurrence({ kind: 'monthly', nth: -1, weekday: 1 }, '2026-11-01', new Set(['2026-11-30']), '2026-11-17')).toBe('2026-12-28')
    // Op de dag zelf.
    expect(currentOccurrence(fri, '2026-11-01', new Set(), '2026-11-20')).toBe('2026-11-20')
    expect(currentOccurrence({ kind: 'monthly', nth: -1, weekday: 1 }, '2026-11-01', new Set(), '2026-11-16')).toBe('2026-11-30')
  })
})
