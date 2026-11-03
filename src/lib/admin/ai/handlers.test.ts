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
