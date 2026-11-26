import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin/google', () => ({
  createEvent: vi.fn(),
  isGoogleConfigured: () => true,
  listConnections: async () => [],
  hasScopes: () => false,
  SCOPES: { calendar: 'cal' },
}))
vi.mock('@/lib/admin/team/invites', () => ({ inviteAddress: async () => 'tandloosispam@gmail.com' }))
vi.mock('./busy', () => ({ readMemberBusy: async () => [] }))

import { memoryLeads } from '@/lib/admin/sales/repo'
import { memoryCalls } from '@/lib/admin/calls/repo'
import { fmtTime } from '@/lib/admin/format'
import { bookSlot, clearBusyCache, confirmationMail, loadAvailability, publicSlots, type BookingDeps } from './service'
import { memoryBookingStore, type BookingStore } from './store'
import { BookingError, renderTemplate, DEFAULT_SETTINGS } from './core'
import { localToUtc } from './slots'
import type { OutgoingMail } from './mail'

const CASPER = 'casper@iknowright.be'
const CEDRIC = 'cedric@iknowright.be'
const MILAN = 'milan@iknowright.be'
const NOW = new Date('2026-12-02T07:00:00Z') // woensdag 08:00
const THU_10 = new Date(localToUtc('2026-12-03', 600)).toISOString()

const g = globalThis as unknown as { __ikrLeads?: unknown; __ikrCalls?: unknown; __ikrIgnored?: unknown }

let store: BookingStore
let mails: OutgoingMail[]
let events: { calendarOwner: string; attendees: string[]; startsAt: string; minutes: number }[]

function deps(over: Partial<BookingDeps> = {}): BookingDeps {
  return {
    store,
    leads: memoryLeads(),
    calls: memoryCalls(),
    now: () => NOW,
    readBusy: async () => [],
    calendarOwnerFor: async (m) => ({ owner: 'contact@iknowright.be', inviteMember: m }),
    createCalendarEvent: async (o) => {
      events.push(o)
      return { eventId: `EV${events.length}`, meetUrl: 'https://meet.google.com/abc-defg-hij' }
    },
    mailer: async (m) => {
      mails.push(m)
    },
    ...over,
  }
}

const form = (o: Record<string, string> = {}) => ({ start: THU_10, name: 'Jan Peeters', email: 'Jan@Peeters.be', company: 'Bakkerij Peeters', phone: '+32 470 12 34 56', ...o })
const thursday = (from = '10:00', to = '12:00') => [{ weekday: 4 as const, start: from, end: to }]

async function setHours(member: string, from?: string, to?: string) {
  await store.saveWeekly(member, thursday(from, to))
}

beforeEach(() => {
  delete g.__ikrLeads
  delete g.__ikrCalls
  delete g.__ikrIgnored
  clearBusyCache()
  store = memoryBookingStore()
  mails = []
  events = []
})

describe('publieke slots', () => {
  it('toont enkel tijdstippen, geen namen of e-mailadressen', async () => {
    await setHours(CEDRIC)
    const r = await publicSlots(deps())
    expect(r.callType).toEqual({ name: 'Kennismakingscall', minutes: 45 })
    expect(r.days[0].starts.map((s) => fmtTime(s))).toEqual(['10:00', '10:15', '10:30', '10:45', '11:00', '11:15'])
    expect(JSON.stringify(r)).not.toMatch(/iknowright\.be|cedric/i)
  })

  it('een nieuwe weekuren- of uitzonderingsinstelling is meteen zichtbaar', async () => {
    await setHours(CASPER)
    expect((await publicSlots(deps())).days.length).toBe(3)
    await store.addException(CASPER, { day: '2026-12-10', kind: 'remove' }, CASPER)
    expect((await publicSlots(deps())).days.map((d) => d.day)).toEqual(['2026-12-03', '2026-12-17'])
  })

  it('vrij/bezet uit de agenda telt enkel als het aan staat', async () => {
    await setHours(CASPER)
    await store.saveMember(CASPER, { use_busy: false })
    const busy = async () => [{ start: localToUtc('2026-12-03', 600), end: localToUtc('2026-12-03', 720) }]
    expect((await publicSlots(deps({ readBusy: busy }))).days[0].day).toBe('2026-12-03')
    await store.saveMember(CASPER, { use_busy: true })
    clearBusyCache()
    expect((await publicSlots(deps({ readBusy: busy }))).days[0].day).toBe('2026-12-10')
  })

  it('kan een agenda niet gelezen worden, dan telt dat teamlid even niet mee (en de fout wordt bewaard)', async () => {
    await setHours(CASPER)
    await setHours(MILAN, '14:00', '15:00')
    await store.saveMember(MILAN, { use_busy: false })
    const a = await loadAvailability(deps({ readBusy: async () => Promise.reject(new Error('verlopen')) }))
    expect(a.members.map((m) => m.email)).toEqual([MILAN])
    expect((await store.loadConfig()).members.find((m) => m.member_email === CASPER)?.busy_error).toBe('verlopen')
  })
})

describe('vrij/bezet standaard aan en strikt', () => {
  it('Cédric vergat woensdag 13:00-15:00 te schrappen, maar het staat in zijn agenda: daar kan geen lead boeken', async () => {
    await store.saveWeekly(CEDRIC, [{ weekday: 3, start: '13:00', end: '17:00' }])
    const busy = async () => [{ start: localToUtc('2026-12-09', 780), end: localToUtc('2026-12-09', 900) }]
    const d = deps({ readBusy: busy })
    const day = (await publicSlots(d)).days.find((x) => x.day === '2026-12-09')!
    expect(day.starts.map((s) => fmtTime(s))[0]).toBe('15:00')
    await expect(bookSlot(d, form({ start: new Date(localToUtc('2026-12-09', 810)).toISOString() }), { ipHash: null })).rejects.toMatchObject({ code: 'taken' })
  })
  it('geen agenda aangevinkt of geen koppeling: geen boekingen (liever geen lead dan een dubbele afspraak)', async () => {
    await setHours(CEDRIC)
    await store.setSource(CEDRIC, 'contact_agenda', false)
    await store.setSource(CEDRIC, 'team_agenda', false)
    expect((await publicSlots(deps())).days).toEqual([])
    await store.setSource(CEDRIC, 'team_agenda', true)
    clearBusyCache()
    expect((await publicSlots(deps({ readBusy: async () => Promise.reject(new Error('Cedric heeft nog geen agenda gekoppeld')) }))).days).toEqual([])
  })
  it('agenda-check en weekmail tonen de botsing', async () => {
    const { agendaCheck, weeklyCheckMail } = await import('./check')
    await store.saveWeekly(CEDRIC, [{ weekday: 3, start: '13:00', end: '17:00' }])
    const r = (await agendaCheck(deps({ readBusy: async () => [{ start: localToUtc('2026-12-09', 780), end: localToUtc('2026-12-09', 900) }] }), { member: CEDRIC, fresh: true }))[0]
    expect(r.conflicts.length).toBe(1)
    const mail = weeklyCheckMail(r, 21)
    expect(mail.to).toBe(CEDRIC)
    expect(mail.subject).toBe('Check je beschikbaarheid op /boek')
    expect(mail.text).toContain('woensdag 9 december 13:00–15:00')
  })
})

describe('boeken', () => {
  it('Casper > Cédric > Milan: wie eerst in de volgorde staat en kan, krijgt de call', async () => {
    await Promise.all([setHours(CASPER), setHours(CEDRIC), setHours(MILAN)])
    const r = await bookSlot(deps(), form(), { ipHash: 'ip1' })
    expect(r.booking.member_email).toBe(CASPER)
  })

  it('maakt lead, call, agenda-item met Meet (lead als gast) en verstuurt beide mails', async () => {
    await setHours(CEDRIC)
    const d = deps()
    const r = await bookSlot(d, form(), { ipHash: 'ip1' })
    const b = r.booking
    expect(b.member_email).toBe(CEDRIC)
    expect(b.meet_url).toBe('https://meet.google.com/abc-defg-hij')
    expect(events[0]).toMatchObject({ attendees: [CEDRIC, 'jan@peeters.be'], startsAt: THU_10, minutes: 45 })

    const lead = (await d.leads.list())[0]
    expect(lead).toMatchObject({ email: 'jan@peeters.be', name: 'Jan Peeters', company: 'Bakkerij Peeters', source: 'website', stage: 'sales_planned', owner: CEDRIC })
    const call = (await d.calls.list())[0]
    expect(call).toMatchObject({ lead_id: lead.id, owner: CEDRIC, created_via: 'boeking', kind: 'sales', meet_url: 'https://meet.google.com/abc-defg-hij', calendar_event_id: 'EV1', starts_at: THU_10 })

    const [notify, confirm] = mails
    expect(notify.to).toBe(CEDRIC)
    expect(notify.text).toContain('Bakkerij Peeters')
    expect(notify.text).toContain(`/admin/sales/leads/${lead.id}`)
    expect(confirm.to).toBe('jan@peeters.be')
    expect(confirm.replyTo).toBe(CEDRIC)
    expect(confirm.from).toMatch(/^Cedric van IKnowRight </)
    expect(confirm.text).toContain('Hey Jan,')
    expect(confirm.text).toContain('Ik ben Cedric van IKnowRight. Ik zit donderdag 3 december om 10:00 samen met jou.')
    expect(confirm.text).toContain('https://meet.google.com/abc-defg-hij')
  })

  it('een bestaande lead (bv. uit Apollo) wordt bijgewerkt in plaats van dubbel aangemaakt', async () => {
    await setHours(MILAN)
    const d = deps()
    const existing = await d.leads.create({ name: 'Jan P.', company: null, email: 'jan@peeters.be', phone: null, source: 'cold_mail' })
    await d.leads.setStage(existing.id, 'setter_done')
    await bookSlot(d, form(), { ipHash: 'ip1' })
    const all = await d.leads.list()
    expect(all.length).toBe(1)
    expect(all[0]).toMatchObject({ id: existing.id, name: 'Jan P.', company: 'Bakkerij Peeters', phone: '+32 470 12 34 56', stage: 'sales_planned', owner: MILAN, source: 'cold_mail' })
  })

  it('een mislukt agenda-item maakt de boeking niet ongedaan; de fout wordt bewaard', async () => {
    await setHours(CASPER)
    const r = await bookSlot(deps({ createCalendarEvent: async () => Promise.reject(new Error('Google weigerde')) }), form(), { ipHash: 'ip1' })
    expect(r.booking.calendar_error).toBe('Google weigerde')
    expect((await store.listBookings())[0].calendar_error).toBe('Google weigerde')
    expect(mails.length).toBe(2)
  })

  it('weigert een slot dat niet bestaat, in het verleden ligt of verder dan 3 weken', async () => {
    await setHours(CASPER)
    for (const start of [
      new Date(localToUtc('2026-12-03', 605)).toISOString(), // 10:05
      new Date(localToUtc('2026-12-03', 840)).toISOString(), // 14:00: niet beschikbaar
      new Date(localToUtc('2026-11-26', 600)).toISOString(), // verleden
      new Date(localToUtc('2026-12-31', 600)).toISOString(), // > 3 weken
    ])
      await expect(bookSlot(deps(), form({ start }), { ipHash: null })).rejects.toMatchObject({ code: 'taken' })
  })

  it('valideert alle velden op de server', async () => {
    await setHours(CASPER)
    await expect(bookSlot(deps(), form({ email: 'geen-mail' }), { ipHash: null })).rejects.toMatchObject({ code: 'invalid' })
    await expect(bookSlot(deps(), form({ phone: 'abc' }), { ipHash: null })).rejects.toMatchObject({ code: 'invalid' })
    await expect(bookSlot(deps(), form({ company: '' }), { ipHash: null })).rejects.toMatchObject({ code: 'invalid' })
    await expect(bookSlot(deps(), form({ name: 'https://spam.example' }), { ipHash: null })).rejects.toMatchObject({ code: 'invalid' })
    expect(await store.listBookings()).toEqual([])
  })

  it('honeypot en rate limiting', async () => {
    await setHours(CASPER, '09:00', '18:00')
    await expect(bookSlot(deps(), form(), { ipHash: 'x', honeypot: 'https://bot' })).rejects.toMatchObject({ code: 'spam' })
    const starts = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((t) => new Date(localToUtc('2026-12-03', Number(t.slice(0, 2)) * 60)).toISOString())
    for (const start of starts.slice(0, 5)) await bookSlot(deps(), form({ start, email: `${start.slice(11, 13)}@x.be` }), { ipHash: 'same' })
    await expect(bookSlot(deps(), form({ start: starts[5] }), { ipHash: 'same' })).rejects.toMatchObject({ code: 'rate_limited' })
  })
})

describe('race condition: gelijktijdige boekingen op hetzelfde slot', () => {
  it('slechts één persoon beschikbaar: van twee gelijktijdige boekingen slaagt er precies één', async () => {
    await setHours(CASPER)
    const results = await Promise.allSettled([
      bookSlot(deps(), form({ email: 'a@a.be' }), { ipHash: 'a' }),
      bookSlot(deps(), form({ email: 'b@b.be' }), { ipHash: 'b' }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1)
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(failed.reason).toBeInstanceOf(BookingError)
    expect(failed.reason.code).toBe('taken')
    expect(failed.reason.message).toBe('Dit moment is net weggekocht, kies een ander.')
    expect((await store.listBookings()).length).toBe(1)
  })

  it('ook als beide requests het slot eerst vrij zagen: de database (insert) beslist', async () => {
    await setHours(CASPER)
    // Beide requests lezen eerst de beschikbaarheid; pas daarna wordt er ingevoegd.
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    let waiting = 0
    const slow: BookingStore = {
      ...store,
      insertBooking: async (row) => {
        if (++waiting === 2) release()
        await gate
        return store.insertBooking(row)
      },
    }
    const results = await Promise.allSettled([bookSlot(deps({ store: slow }), form({ email: 'a@a.be' }), { ipHash: 'a' }), bookSlot(deps({ store: slow }), form({ email: 'b@b.be' }), { ipHash: 'b' })])
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
  })

  it('zijn er meerdere teamleden vrij, dan gaat de tweede boeking naar de volgende in de volgorde (nooit dubbel per persoon)', async () => {
    await Promise.all([setHours(CASPER), setHours(CEDRIC)])
    const [a, b, c] = await Promise.allSettled([
      bookSlot(deps(), form({ email: 'a@a.be' }), { ipHash: 'a' }),
      bookSlot(deps(), form({ email: 'b@b.be' }), { ipHash: 'b' }),
      bookSlot(deps(), form({ email: 'c@c.be' }), { ipHash: 'c' }),
    ])
    const owners = [a, b].map((r) => (r as PromiseFulfilledResult<{ booking: { member_email: string } }>).value.booking.member_email)
    expect(owners.sort()).toEqual([CASPER, CEDRIC])
    expect(c.status).toBe('rejected')
  })

  it('een overlappend slot (10:00 en 10:30) bij dezelfde persoon slaagt ook nooit allebei', async () => {
    await setHours(CASPER)
    const half = new Date(localToUtc('2026-12-03', 630)).toISOString()
    const results = await Promise.allSettled([bookSlot(deps(), form({ email: 'a@a.be' }), { ipHash: 'a' }), bookSlot(deps(), form({ start: half, email: 'b@b.be' }), { ipHash: 'b' })])
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1)
  })
})

describe('bevestigingsmail', () => {
  it('is een bewerkbare template', () => {
    const m = confirmationMail(
      { name: 'An De Smet', company: 'X', starts_at: THU_10, meet_url: 'https://meet.google.com/x', email: 'an@x.be' } as never,
      { member_email: CASPER, name: 'Casper' },
      { settings: { ...DEFAULT_SETTINGS, confirm_subject: 'Tot {dag}!', confirm_template: 'Dag {voornaam}, {teamlid} hier. {uur} · {meet_link} · {onbekend}' }, callType: { id: 'k', name: 'K', minutes: 45, call_kind: 'sales', active: true } },
    )
    expect(m.subject).toBe('Tot donderdag!')
    expect(m.text).toBe('Dag An, Casper hier. 10:00 · https://meet.google.com/x · {onbekend}')
    expect(renderTemplate('{voornaam}', { voornaam: 'A' } as never)).toBe('A')
  })
})

describe('agenda van het uitnodigingsadres', () => {
  it('leest de agenda van het uitnodigingsadres, niet zomaar het gekoppelde account', async () => {
    const { agendaCalendarFor } = await import('./core')
    // Cédric: koppeling en uitnodigingsadres zijn hetzelfde account.
    expect(agendaCalendarFor({ google_email: 'cedric@iknowright.be', calendars: [] }, 'cedric@iknowright.be')).toBe('primary')
    // Casper: uitnodigingen gaan naar tandloosispam; een koppeling met casper@ zonder die agenda is niet goed.
    // Niet in de lijst: toch rechtstreeks proberen (gedeeld maar verborgen of niet geabonneerd).
    expect(agendaCalendarFor({ google_email: 'casper@iknowright.be', calendars: [{ id: 'casper@iknowright.be' }] }, 'tandloosispam@gmail.com')).toBe('tandloosispam@gmail.com')
    // ...met tandloosispam zelf gekoppeld, of gedeeld met casper@: wel goed.
    expect(agendaCalendarFor({ google_email: 'tandloosispam@gmail.com', calendars: [] }, 'tandloosispam@gmail.com')).toBe('primary')
    expect(agendaCalendarFor({ google_email: 'casper@iknowright.be', calendars: [{ id: 'tandloosispam@gmail.com' }] }, 'tandloosispam@gmail.com')).toBe('tandloosispam@gmail.com')
  })

  it('agenda-item: in contact@ met uitnodiging naar het uitnodigingsadres, ook al heeft casper@ schrijfrechten', async () => {
    const google = await import('@/lib/admin/google')
    vi.spyOn(google, 'listConnections').mockResolvedValue([{ email: 'casper@iknowright.be', scopes: 'cal', connected_at: '' }])
    vi.spyOn(google, 'hasScopes').mockReturnValue(true)
    const { defaultCalendarOwner } = await import('./service')
    expect(await defaultCalendarOwner(CASPER)).toEqual({ owner: 'contact@iknowright.be', inviteMember: 'tandloosispam@gmail.com' })
  })
})
