import { describe, expect, it, vi } from 'vitest'
import { addWorkdays, leadPatchAfterSend, updateLeadAfterSend } from './follow-up'

describe('addWorkdays', () => {
  it('slaat het weekend over', () => {
    expect(addWorkdays('2026-11-13', 5)).toBe('2026-11-20') // vrijdag → volgende vrijdag
    expect(addWorkdays('2026-11-16', 5)).toBe('2026-11-23') // maandag → volgende maandag
    expect(addWorkdays('2026-11-18', 5)).toBe('2026-11-25') // woensdag → volgende woensdag
    expect(addWorkdays('2026-11-14', 5)).toBe('2026-11-20') // zaterdag → vrijdag erna
    expect(addWorkdays('2026-11-15', 1)).toBe('2026-11-16') // zondag → maandag
  })
  it('over de maand- en jaargrens', () => {
    expect(addWorkdays('2026-12-28', 5)).toBe('2027-01-04')
  })
})

describe('leadPatchAfterSend', () => {
  // Vrijdag 13/11/2026 23:30 in Brussel (22:30 UTC): de dag in Brussel telt.
  const sentAt = new Date('2026-11-13T22:30:00Z')

  it('standaard: antwoord opvolgen, 5 werkdagen later, notitie met datum en onderwerp', () => {
    expect(leadPatchAfterSend({ notes: null }, { subject: ' Voorstel TikTok ' }, sentAt)).toEqual({
      next_action: 'antwoord opvolgen',
      follow_up_on: '2026-11-20',
      notes: '13/11/2026: mail verstuurd: "Voorstel TikTok"',
    })
  })

  it('notitie komt onderaan bestaande notities', () => {
    const p = leadPatchAfterSend({ notes: 'Lijn 1\n' }, { subject: 'Re: offerte' }, sentAt)
    expect(p.notes).toBe('Lijn 1\n\n13/11/2026: mail verstuurd: "Re: offerte"')
  })

  it('eigen waarden van het concept krijgen voorrang; lege waarden niet', () => {
    expect(leadPatchAfterSend({ notes: null }, { subject: 'X', follow_up_action: 'Bellen', follow_up_on: '2026-12-01' }, sentAt)).toMatchObject({
      next_action: 'Bellen',
      follow_up_on: '2026-12-01',
    })
    expect(leadPatchAfterSend({ notes: null }, { subject: 'X', follow_up_action: '  ', follow_up_on: '' }, sentAt)).toMatchObject({
      next_action: 'antwoord opvolgen',
      follow_up_on: '2026-11-20',
    })
  })
})

describe('updateLeadAfterSend', () => {
  it('zonder lead of bij een fout: null, geen exception', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const leads = { get: vi.fn().mockResolvedValue(null), patch: vi.fn() }
    expect(await updateLeadAfterSend(leads, { lead_id: 'L1', subject: 'X' })).toBeNull()
    expect(leads.patch).not.toHaveBeenCalled()
    leads.get.mockRejectedValue(new Error('DB plat'))
    expect(await updateLeadAfterSend(leads, { lead_id: 'L1', subject: 'X' })).toBeNull()
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
})
