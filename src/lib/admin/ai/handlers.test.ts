import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabase/server', () => ({ createServiceSupabase: vi.fn() }))

import { HANDLERS } from './handlers'

describe('mail_rewrite', () => {
  const input = {
    target: 'draft',
    targetId: 'd1',
    instruction: 'Korter en vraag naar een datum',
    subject: 'Even opvolgen',
    body: 'Hey Lotte, …',
    context: 'Voorstel verstuurd op 22/10',
    lead: { name: 'Lotte Maes', company: 'Foodtruck Lotte', notes: 'Wil starten in het voorjaar' },
  }

  it('geeft de uitleg van Casper, de context, de notities en de mail mee', () => {
    const p = HANDLERS.mail_rewrite.prompt(input)
    expect(p).toContain('Korter en vraag naar een datum')
    expect(p).toContain('Voorstel verstuurd op 22/10')
    expect(p).toContain('Wil starten in het voorjaar')
    expect(p).toContain('<mail>\nHey Lotte, …\n</mail>')
    expect(p).toContain('Onderwerp: Even opvolgen')
  })

  it('verwacht een body en een (optioneel) nieuw onderwerp', () => {
    expect(HANDLERS.mail_rewrite.schema.safeParse({ subject: null, body: 'Nieuw' }).success).toBe(true)
    expect(HANDLERS.mail_rewrite.schema.safeParse({ subject: 'x' }).success).toBe(false)
  })
})

describe('inbox_reply', () => {
  it('vraagt altijd om context', () => {
    expect(HANDLERS.inbox_reply.instructions).toMatch(/Vul altijd "context" in/)
  })
})

describe('style_profile', () => {
  const input = {
    key: 'casper',
    mailbox: 'casper@iknowright.be + contact@iknowright.be',
    mails: [{ subject: 'Re: Voorstel', date: '2026-10-01', text: 'Hey Jan, top! Zullen we donderdag bellen? Groetjes, Casper' }],
    feedback: [{ ai_text: 'Beste Jan, hartelijk dank voor uw bericht.', sent_text: 'Hey Jan, merci!' }],
    current: { guide: '- Altijd "Groetjes" als afsluiting' },
  }

  it('geeft de mails, de aanpassingen en de vorige gids (met correcties) mee', () => {
    const p = HANDLERS.style_profile.prompt(input)
    expect(p).toContain('Hey Jan, top!')
    expect(p).toContain('<ai>\nBeste Jan, hartelijk dank voor uw bericht.\n</ai>')
    expect(p).toContain('<verstuurd>\nHey Jan, merci!\n</verstuurd>')
    expect(p).toContain('Altijd "Groetjes" als afsluiting')
  })

  it('vraagt om namen en contactgegevens weg te laten in de voorbeelden', () => {
    expect(HANDLERS.style_profile.instructions).toMatch(/\[naam\], \[bedrijf\], \[e-mail\], \[telefoon\]/)
  })

  it('verwacht een gids en voorbeelden', () => {
    expect(HANDLERS.style_profile.schema.safeParse({ guide: '- kort', examples: ['Hey'] }).success).toBe(true)
    expect(HANDLERS.style_profile.schema.safeParse({ guide: '- kort' }).success).toBe(false)
  })
})

describe('welk schrijfstijlprofiel gaat mee', () => {
  it('één profiel: inbox en herschrijven gebruiken altijd dat van Casper', () => {
    expect(HANDLERS.inbox_reply.style!()).toBe('casper')
    expect(HANDLERS.mail_rewrite.style!()).toBe('casper')
    expect('style' in HANDLERS.style_profile).toBe(false)
  })
})
