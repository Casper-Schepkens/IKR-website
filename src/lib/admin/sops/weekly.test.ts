import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => ({}) }))
import { mentionsBot } from './weekly'

describe('weekly-transcript: is er iets voor Grok Bot?', () => {
  it('herkent SOP en grokbot zoals spraakherkenning het schrijft', () => {
    expect(mentionsBot('Casper: @grokbot nieuwe SOP, briefing 2 dagen op voorhand')).toBe(true)
    expect(mentionsBot('Milan: grok bot, werk dat idee eens uit')).toBe(true)
    expect(mentionsBot('Cedric: Rock bot zet dat klaar')).toBe(true)
    expect(mentionsBot('Casper: oké, volgende punt, de draaidag van Tempus')).toBe(false)
  })
})
