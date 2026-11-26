import { describe, expect, it } from 'vitest'
import { candidatesFor, computeSlots, dayWindows, groupByDay, localToUtc, memberStartsOnDay, rankMembers, type MemberAvailability, type SlotOptions } from './slots'
import { fmtTime, isoDay } from '@/lib/admin/format'

const CASPER = 'casper@iknowright.be'
const CEDRIC = 'cedric@iknowright.be'
const MILAN = 'milan@iknowright.be'

// Woensdag 2 december 2026, 08:00 Brusselse tijd (wintertijd, UTC+1).
const NOW = new Date('2026-12-02T07:00:00Z')
const opts = (o: Partial<SlotOptions> = {}): SlotOptions => ({ now: NOW, minutes: 45, step: 15, horizonDays: 21, priority: [CASPER, CEDRIC, MILAN], ...o })
const member = (email: string, m: Partial<MemberAvailability> = {}): MemberAvailability => ({ email, weekly: [], exceptions: [], busy: [], ...m })
const times = (ms: number[]) => ms.map((t) => fmtTime(new Date(t)))
const at = (day: string, hhmm: string) => localToUtc(day, Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)))

describe('slots: kwartierstappen en 45 minuten', () => {
  it('geeft starttijden per kwartier waarbij 45 min aaneensluitend in het blok past', () => {
    // Do 3 dec: 10:00-12:00 → laatste start 11:15.
    const m = member(CASPER, { weekly: [{ weekday: 4, start: '10:00', end: '12:00' }] })
    expect(times(memberStartsOnDay('2026-12-03', m, opts()))).toEqual(['10:00', '10:15', '10:30', '10:45', '11:00', '11:15'])
  })

  it('een blok korter dan 45 min geeft niets; een blok van precies 45 min één slot', () => {
    expect(memberStartsOnDay('2026-12-03', member(CASPER, { weekly: [{ weekday: 4, start: '10:00', end: '10:30' }] }), opts())).toEqual([])
    expect(times(memberStartsOnDay('2026-12-03', member(CASPER, { weekly: [{ weekday: 4, start: '10:00', end: '10:45' }] }), opts()))).toEqual(['10:00'])
  })

  it('blokken die tegen elkaar liggen tellen als één aaneensluitend blok', () => {
    const m = member(CASPER, { weekly: [{ weekday: 4, start: '10:00', end: '10:30' }, { weekday: 4, start: '10:30', end: '11:00' }] })
    expect(times(memberStartsOnDay('2026-12-03', m, opts()))).toEqual(['10:00', '10:15'])
  })

  it('een blok dat niet op een kwartier begint: eerste start op het volgende kwartier', () => {
    const m = member(CASPER, { weekly: [{ weekday: 4, start: '10:05', end: '11:30' }] })
    expect(times(memberStartsOnDay('2026-12-03', m, opts()))).toEqual(['10:15', '10:30', '10:45'])
  })
})

describe('slots: overlap met boekingen en agenda', () => {
  const m = (busy: { start: number; end: number }[]) => member(CASPER, { weekly: [{ weekday: 4, start: '10:00', end: '12:00' }], busy })

  it('geen overlap met een bestaande boeking', () => {
    // Boeking 10:30-11:15 → enkel 11:15 blijft over (10:00 zou tot 10:45 lopen en overlappen).
    const busy = [{ start: at('2026-12-03', '10:30'), end: at('2026-12-03', '11:15') }]
    expect(times(memberStartsOnDay('2026-12-03', m(busy), opts()))).toEqual(['11:15'])
  })

  it('aansluitend op een afspraak mag (einde = start is geen overlap)', () => {
    const busy = [{ start: at('2026-12-03', '09:00'), end: at('2026-12-03', '10:00') }]
    expect(times(memberStartsOnDay('2026-12-03', m(busy), opts()))[0]).toBe('10:00')
  })
})

describe('slots: uitzonderingen per datum', () => {
  const weekly = [{ weekday: 4 as const, start: '10:00', end: '12:00' }]
  it('hele dag schrappen laat het vaste schema van andere weken ongemoeid', () => {
    const m = member(CASPER, { weekly, exceptions: [{ day: '2026-12-03', kind: 'remove' }] })
    expect(memberStartsOnDay('2026-12-03', m, opts())).toEqual([])
    expect(memberStartsOnDay('2026-12-10', m, opts()).length).toBe(6)
  })
  it('een deel schrappen en een extra blok toevoegen', () => {
    const m = member(CASPER, {
      weekly,
      exceptions: [
        { day: '2026-12-03', kind: 'remove', start: '11:00', end: '12:00' },
        { day: '2026-12-03', kind: 'add', start: '15:00', end: '16:00' },
      ],
    })
    expect(times(memberStartsOnDay('2026-12-03', m, opts()))).toEqual(['10:00', '10:15', '15:00', '15:15'])
  })
  it('hele dag weg + extra blok = enkel dat blok', () => {
    expect(dayWindows('2026-12-03', weekly, [{ day: '2026-12-03', kind: 'remove' }, { day: '2026-12-03', kind: 'add', start: '14:00', end: '15:00' }])).toEqual([[840, 900]])
  })
  it('extra blok op een dag zonder vaste uren', () => {
    const m = member(CASPER, { exceptions: [{ day: '2026-12-05', kind: 'add', start: '09:00', end: '10:00' }] })
    expect(times(memberStartsOnDay('2026-12-05', m, opts()))).toEqual(['09:00', '09:15'])
  })
})

describe('slots: verleden en 3 weken vooruit', () => {
  it('slots in het verleden vallen weg, geen minimale vooraankondiging', () => {
    // Nu = woensdag 2 dec 10:20 → 10:30 is nog boekbaar, 10:15 niet.
    const now = new Date(at('2026-12-02', '10:20'))
    const m = member(CASPER, { weekly: [{ weekday: 3, start: '10:00', end: '12:00' }] })
    expect(times(memberStartsOnDay('2026-12-02', m, opts({ now }))))
      .toEqual(['10:30', '10:45', '11:00', '11:15'])
  })
  it('boekbaar tot en met vandaag + 21 dagen', () => {
    const m = member(CASPER, { weekly: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday: weekday as 1, start: '10:00', end: '10:45' })) })
    const slots = computeSlots([m], opts())
    const days = groupByDay(slots).map((d) => d.day)
    expect(days[0]).toBe('2026-12-02')
    expect(days[days.length - 1]).toBe('2026-12-23')
    expect(days.length).toBe(22)
    expect(candidatesFor(new Date(at('2026-12-24', '10:00')).toISOString(), [m], opts())).toEqual([])
    expect(candidatesFor(new Date(at('2026-12-23', '10:00')).toISOString(), [m], opts())).toEqual([CASPER])
  })
})

describe('slots: zomer- en wintertijd', () => {
  it('10:00 Brusselse tijd blijft 10:00, voor en na de overgang naar zomertijd (29 maart 2026)', () => {
    const m = member(CASPER, { weekly: [{ weekday: 5, start: '10:00', end: '10:45' }] })
    const now = new Date('2026-03-20T00:00:00Z')
    const before = memberStartsOnDay('2026-03-27', m, opts({ now }))
    const after = memberStartsOnDay('2026-04-03', m, opts({ now }))
    expect(new Date(before[0]).toISOString()).toBe('2026-03-27T09:00:00.000Z') // UTC+1
    expect(new Date(after[0]).toISOString()).toBe('2026-04-03T08:00:00.000Z') // UTC+2
    expect(times([...before, ...after])).toEqual(['10:00', '10:00'])
  })

  it('op de nacht van de overgang naar zomertijd bestaat 02:00-03:00 niet en duurt een slot echt 45 min', () => {
    const m = member(CASPER, { weekly: [{ weekday: 7, start: '01:00', end: '04:00' }] })
    const starts = memberStartsOnDay('2026-03-29', m, opts({ now: new Date('2026-03-20T00:00:00Z') }))
    const labels = times(starts)
    expect(labels.some((l) => l.startsWith('02:'))).toBe(false)
    // 01:00-04:00 lokaal is maar 2 uur echte tijd: laatste start 03:15 (eindigt 04:00).
    expect(labels[labels.length - 1]).toBe('03:15')
    // 01:15 → eindigt om 03:00 lokaal (45 echte minuten later): mag, zit binnen het blok.
    expect(labels).toContain('01:15')
  })

  it('overgang naar wintertijd (25 oktober 2026): 10:00 wordt UTC+1', () => {
    const m = member(CASPER, { weekly: [{ weekday: 1, start: '10:00', end: '10:45' }] })
    const now = new Date('2026-10-20T00:00:00Z')
    expect(new Date(memberStartsOnDay('2026-10-19', m, opts({ now: new Date('2026-10-18T00:00:00Z') }))[0]).toISOString()).toBe('2026-10-19T08:00:00.000Z')
    expect(new Date(memberStartsOnDay('2026-10-26', m, opts({ now }))[0]).toISOString()).toBe('2026-10-26T09:00:00.000Z')
  })

  it('slots worden per Brusselse dag gegroepeerd (ook een slot om 00:15)', () => {
    const m = member(CASPER, { weekly: [{ weekday: 4, start: '00:15', end: '01:00' }] })
    const s = computeSlots([m], opts())
    expect(isoDay(new Date(s[0].start))).toBe('2026-12-03')
    expect(groupByDay(s)[0].day).toBe('2026-12-03')
  })
})

describe('toewijzing: Casper > Cédric > Milan', () => {
  const block = [{ weekday: 4 as const, start: '10:00', end: '11:00' }]
  it('kunnen meerdere mensen, dan krijgt de eerste in de volgorde het slot', () => {
    const slots = computeSlots([member(MILAN, { weekly: block }), member(CEDRIC, { weekly: block }), member(CASPER, { weekly: block })], opts())
    expect(slots.filter((s) => s.start.startsWith('2026-12-03')).every((s) => s.member === CASPER)).toBe(true)
  })
  it('is Casper bezet, dan Cédric; is die ook bezet, dan Milan', () => {
    const busy = [{ start: at('2026-12-03', '10:00'), end: at('2026-12-03', '11:00') }]
    const iso = new Date(at('2026-12-03', '10:00')).toISOString()
    expect(candidatesFor(iso, [member(CASPER, { weekly: block, busy }), member(CEDRIC, { weekly: block }), member(MILAN, { weekly: block })], opts())).toEqual([CEDRIC, MILAN])
    expect(candidatesFor(iso, [member(CASPER, { weekly: block, busy }), member(CEDRIC, { weekly: block, busy }), member(MILAN, { weekly: block })], opts())).toEqual([MILAN])
  })
  it('de volgorde is instelbaar', () => {
    expect(rankMembers([CASPER, CEDRIC, MILAN], [MILAN, CASPER, CEDRIC])).toEqual([MILAN, CASPER, CEDRIC])
    const slots = computeSlots([member(CASPER, { weekly: block }), member(MILAN, { weekly: block })], opts({ priority: [MILAN, CASPER] }))
    expect(slots[0].member).toBe(MILAN)
  })
  it('een slot bestaat zodra minstens één teamlid kan', () => {
    const slots = computeSlots([member(CASPER), member(CEDRIC, { weekly: [{ weekday: 4, start: '14:00', end: '14:45' }] })], opts())
    expect(slots.map((s) => [fmtTime(s.start), s.member])).toEqual([
      ['14:00', CEDRIC], // 3 dec
      ['14:00', CEDRIC], // 10 dec
      ['14:00', CEDRIC], // 17 dec (24 dec valt buiten de 3 weken)
    ])
  })
  it('een tijdstip dat niet op een kwartier valt is geen slot', () => {
    expect(candidatesFor(new Date(at('2026-12-03', '10:05')).toISOString(), [member(CASPER, { weekly: block })], opts())).toEqual([])
  })
})

describe('agenda-check: weekuren tegenover de agenda', () => {
  it('Cedric heeft woensdag 13:00-15:00 iets in zijn agenda, binnen zijn weekuren: dat wordt gemeld en geen slot', async () => {
    const { availabilityConflicts } = await import('./slots')
    const weekly = [{ weekday: 3 as const, start: '13:00', end: '17:00' }]
    const busy = [{ start: at('2026-12-09', '13:00'), end: at('2026-12-09', '15:00') }, { start: at('2026-12-09', '18:00'), end: at('2026-12-09', '19:00') }]
    const c = availabilityConflicts({ weekly, exceptions: [] }, busy, opts())
    expect(c.map((x) => [isoDay(new Date(x.start)), fmtTime(new Date(x.start)), fmtTime(new Date(x.end))])).toEqual([['2026-12-09', '13:00', '15:00']])
    const starts = times(memberStartsOnDay('2026-12-09', member(CEDRIC, { weekly, busy }), opts()))
    expect(starts[0]).toBe('15:00')
    expect(starts.some((t) => t < '15:00')).toBe(false)
  })
  it('een afspraak die deels in het blok valt: enkel dat deel', async () => {
    const { availabilityConflicts } = await import('./slots')
    const weekly = [{ weekday: 4 as const, start: '10:00', end: '12:00' }]
    const c = availabilityConflicts({ weekly, exceptions: [] }, [{ start: at('2026-12-03', '09:00'), end: at('2026-12-03', '10:30') }], opts())
    expect(c.map((x) => fmtTime(new Date(x.end)))).toEqual(['10:30'])
    expect(c.map((x) => fmtTime(new Date(x.start)))).toEqual(['10:00'])
  })
})
