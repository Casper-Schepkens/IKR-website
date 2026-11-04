import { describe, expect, it } from 'vitest'
import type { Mail, Thread } from '../gmail'
import type { Lead } from './types'
import { computeWaiting, dayTone, daysSince, leadContext } from './waiting-core'

const lead = (id: string, email: string, extra: Partial<Lead> = {}): Lead => ({
  id,
  name: id,
  company: null,
  email,
  phone: null,
  source: 'cold_mail',
  stage: 'lead',
  lost_reason: null,
  lost_note: null,
  next_action: null,
  follow_up_on: null,
  notes: null,
  stage_changed_at: '',
  created_at: '',
  updated_at: '',
  ...extra,
})
let n = 0
const mail = (from: string, to: string, date: string, extra: Partial<Mail> = {}): Mail => ({
  id: `m${++n}`,
  threadId: 't',
  messageId: `<m${n}@x>`,
  references: null,
  fromName: from.split('@')[0],
  fromEmail: from,
  to,
  subject: 'Re: TikTok',
  date: `2026-11-${date}T09:00:00.000Z`,
  text: 'Hallo  daar\n\nnieuwe regel',
  ...extra,
})
const t = (id: string, mails: Mail[], mailbox = 'casper@iknowright.be') => ({
  mailbox,
  thread: { id, mails } as Thread,
})

describe('computeWaiting', () => {
  const leads = [
    lead('A', 'a@klant.be'),
    lead('B', 'b@klant.be'),
    lead('C', 'c@klant.be'),
    lead('L', 'l@klant.be', { stage: 'lost' }),
  ]

  it('neemt leads op waar wij als laatste mailden, niet waar de lead als laatste antwoordde', () => {
    const rows = computeWaiting(leads, [
      t('1', [
        mail('a@klant.be', 'casper@iknowright.be', '01'),
        mail('casper@iknowright.be', 'A <a@klant.be>', '02'),
      ]),
      t('2', [
        mail('casper@iknowright.be', 'b@klant.be', '01'),
        mail('b@klant.be', 'casper@iknowright.be', '03'),
      ]),
    ])
    expect(rows.map((r) => r.lead_id)).toEqual(['A'])
    expect(rows[0].mail).toMatchObject({
      from_email: 'casper@iknowright.be',
      preview: 'Hallo daar nieuwe regel',
    })
  })

  it('een afwezigheidsmelding telt niet als antwoord', () => {
    const rows = computeWaiting(leads, [
      t('1', [
        mail('casper@iknowright.be', 'a@klant.be', '02'),
        mail('a@klant.be', 'casper@iknowright.be', '02', {
          auto: true,
          subject: 'Automatisch antwoord: Re: TikTok',
        }),
      ]),
    ])
    expect(rows.map((r) => r.lead_id)).toEqual(['A'])
  })

  it('een echt antwoord haalt de lead uit de lijst, ook als het in een andere thread of mailbox zit', () => {
    const rows = computeWaiting(leads, [
      t('1', [mail('casper@iknowright.be', 'a@klant.be', '02')]),
      t(
        '9',
        [
          mail('contact@iknowright.be', 'a@klant.be', '01'),
          mail('a@klant.be', 'contact@iknowright.be', '04'),
        ],
        'contact@iknowright.be',
      ),
    ])
    expect(rows).toEqual([])
  })

  it('kijkt over mailboxen heen (contact@, cedric@ in cc) en negeert interne mails zonder de lead', () => {
    const rows = computeWaiting(leads, [
      t('1', [
        mail('c@klant.be', 'casper@iknowright.be', '01'),
        mail('cedric@iknowright.be', 'casper@iknowright.be', '05', { cc: 'C <c@klant.be>' }),
      ]),
      t('2', [
        mail('a@klant.be', 'casper@iknowright.be', '03'),
        mail('casper@iknowright.be', 'cedric@iknowright.be', '06'),
      ]),
    ])
    expect(rows.map((r) => [r.lead_id, r.mail.from_email])).toEqual([['C', 'cedric@iknowright.be']])
  })

  it('laat lost/won leads weg', () => {
    expect(
      computeWaiting(leads, [t('1', [mail('casper@iknowright.be', 'l@klant.be', '02')])]),
    ).toEqual([])
  })
})

describe('dagen en context', () => {
  it('telt kalenderdagen en kleurt groen < 4, oranje 4–7, rood > 7', () => {
    const now = new Date('2026-11-10T08:00:00Z')
    expect(daysSince('2026-11-09T22:30:00Z', now)).toBe(1)
    expect([3, 4, 7, 8].map(dayTone)).toEqual(['green', 'orange', 'orange', 'red'])
  })
  it('context: fase + volgende actie, anders de laatste notitie', () => {
    expect(leadContext(lead('A', 'a', { next_action: 'Prijs opvolgen' }))).toBe(
      'Lead · Prijs opvolgen',
    )
    expect(leadContext(lead('A', 'a', { notes: 'oud\n\n3 nov: wil eerst prijzen' }))).toBe(
      'Lead · 3 nov: wil eerst prijzen',
    )
    expect(leadContext(lead('A', 'a'))).toBe('Lead')
  })
})
