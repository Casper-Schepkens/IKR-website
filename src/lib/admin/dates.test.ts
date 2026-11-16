import { describe, expect, it } from 'vitest'
import { brusselsToIso } from './format'
import { addDays, todayBrussels } from './dates'
import { cleanLeadInput } from './sales/types'

describe('tijdzones', () => {
  it('een Brussels uur rond de wissel naar zomertijd (29 maart 2026) en wintertijd (25 oktober 2026)', () => {
    expect(brusselsToIso('2026-03-28', '10:00')).toBe('2026-03-28T09:00:00.000Z') // winter: UTC+1
    expect(brusselsToIso('2026-03-30', '10:00')).toBe('2026-03-30T08:00:00.000Z') // zomer: UTC+2
    expect(brusselsToIso('2026-10-24', '10:00')).toBe('2026-10-24T08:00:00.000Z')
    expect(brusselsToIso('2026-10-26', '10:00')).toBe('2026-10-26T09:00:00.000Z')
  })
  it('"vandaag" is de Brusselse dag, ook net na middernacht als het in UTC nog gisteren is', () => {
    expect(todayBrussels(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-17')
    expect(todayBrussels(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02')
  })
  it('dagen optellen over een maand- en jaargrens', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('leadcontrole (dashboard en Grok Bot)', () => {
  it('zelfde regels, eigen standaardbron', () => {
    expect(cleanLeadInput({ name: ' Jan ', email: 'Jan@X.be ' }, 'other')).toEqual({ name: 'Jan', company: null, email: 'jan@x.be', phone: null, source: 'other' })
    expect(cleanLeadInput({ name: 'Jan' }, 'cold_mail').source).toBe('cold_mail')
    expect(cleanLeadInput({ name: 'Jan', source: 'linkedin' }, 'other').source).toBe('linkedin')
    expect(() => cleanLeadInput({ name: ' ' }, 'other')).toThrow(/Naam/)
    expect(() => cleanLeadInput({ name: 'Jan', email: 'geen-adres' }, 'other')).toThrow(/e-mailadres/)
    expect(() => cleanLeadInput({ name: 'Jan', follow_up_on: '17/11' }, 'other')).toThrow(/YYYY-MM-DD/)
  })
})
