import { describe, expect, it, vi } from 'vitest'
import { isLivePath, tablesFor } from './live'
import { memoryChat } from './chat/repo'
import { logIfSlow } from './timing'

describe('snelheid', () => {
  it('elke pagina volgt enkel haar eigen tabellen, nooit het log', () => {
    expect(tablesFor('/admin/financien')).toEqual(['finance_transactions', 'finance_rules', 'clients'])
    expect(tablesFor('/admin/sales/calls')).toContain('calls')
    for (const p of ['/admin/sales', '/admin/weekly', '/admin/productie', '/admin/werkplek'])
      expect(tablesFor(p)).not.toEqual(expect.arrayContaining(['bot_actions']))
    expect(tablesFor('/admin/instellingen')).toEqual([])
    expect(isLivePath('/admin/instellingen')).toBe(false)
    expect(isLivePath('/admin/weekly/123')).toBe(true)
  })

  it('chat: enkel berichten na het laatste gekende', async () => {
    const chat = memoryChat([])
    const a = await chat.add({ user_id: 'U1', role: 'user', text: 'a' })
    const b = await chat.add({ user_id: 'U1', role: 'bot', text: 'b' })
    await chat.add({ user_id: 'U2', role: 'user', text: 'ander' })
    expect((await chat.listSince('U1', a.created_at)).map((m) => m.id)).toEqual([b.id])
    expect(await chat.listSince('U1', b.created_at)).toEqual([])
  })

  it('trage stappen komen in de logs, snelle niet', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await logIfSlow('snel', Promise.resolve(1), 50)).toBe(1)
    expect(warn).not.toHaveBeenCalled()
    await logIfSlow('traag', new Promise((r) => setTimeout(r, 20)), 5)
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[traag\] traag \d+ ms$/))
  })
})
