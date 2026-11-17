import { beforeEach, describe, expect, it } from 'vitest'
import { chatLabel, memoryWhatsapp, phoneKey } from './repo'
import { conversationFor, linkChat, suggestLead } from './service'

const LEAD = '11111111-1111-4111-8111-111111111111'
const KLANT = '22222222-2222-4222-8222-222222222222'
const exists = { lead: async (id: string) => id === LEAD, klant: async (id: string) => id === KLANT }
const GROUP = '120363000000000001@g.us'
const MAMA = '32470000002@s.whatsapp.net'

beforeEach(() => {
  ;(globalThis as { __ikrWhatsapp?: unknown }).__ikrWhatsapp = undefined
})

describe('WhatsApp koppelen', () => {
  it('actief kan pas na koppelen aan een lead of klant', async () => {
    const repo = memoryWhatsapp()
    await expect(linkChat(repo, MAMA, { actief: true }, exists)).rejects.toThrow(/Koppel de chat eerst/)
    await expect(linkChat(repo, MAMA, { lead_id: '33333333-3333-4333-8333-333333333333' }, exists)).rejects.toThrow(/Lead niet gevonden/)
    await expect(linkChat(repo, 'onbekend@s.whatsapp.net', { lead_id: LEAD }, exists)).rejects.toThrow(/Chat niet gevonden/)
    await linkChat(repo, GROUP, { klant_id: KLANT, actief: true }, exists)
    expect(await repo.chat(GROUP)).toMatchObject({ klant_id: KLANT, actief: true })
    // Ontkoppelen terwijl hij actief staat mag niet.
    await expect(linkChat(repo, GROUP, { klant_id: null }, exists)).rejects.toThrow(/Koppel de chat eerst/)
  })
  it('gesprek: enkel berichten van actieve, gekoppelde chats, oudste eerst', async () => {
    const repo = memoryWhatsapp()
    await linkChat(repo, GROUP, { klant_id: KLANT }, exists)
    let c = await conversationFor(repo, { klantId: KLANT }, 30)
    expect(c.chats.map((x) => x.jid)).toEqual([GROUP])
    expect(c.berichten).toEqual([])
    await linkChat(repo, GROUP, { actief: true }, exists)
    c = await conversationFor(repo, { klantId: KLANT }, 2)
    expect(c.berichten.map((b) => b.id)).toEqual(['d2', 'd3'])
    expect((await conversationFor(repo, { leadId: LEAD }, 30)).chats).toEqual([])
  })
  it('naam: eigen naam, dan WhatsApp, dan nummer', () => {
    expect(chatLabel({ jid: '32470123456@s.whatsapp.net', naam: null })).toBe('+32470123456')
    expect(chatLabel({ jid: GROUP, naam: 'IKR × X' })).toBe('IKR × X')
    expect(chatLabel({ jid: GROUP, naam: 'IKR × X', naam_eigen: 'Chez Albert (klantgroep)' })).toBe('Chez Albert (klantgroep)')
    expect(chatLabel({ jid: '78821256634402@lid', naam: null, telefoon: '+32475788230' })).toBe('+32475788230')
    expect(chatLabel({ jid: '78821256634402@lid', naam: null })).toBe('Contact zonder naam of nummer')
    expect(chatLabel({ jid: '120363430459218345@g.us', naam: null, is_groep: true })).toBe('Groep zonder naam')
  })
  it('eigen naam bewaren (leeg = terug naar de WhatsApp-naam)', async () => {
    const repo = memoryWhatsapp()
    await linkChat(repo, MAMA, { naam_eigen: '  Mama (privé)  ' }, exists)
    expect((await repo.chat(MAMA))!.naam_eigen).toBe('Mama (privé)')
    await linkChat(repo, MAMA, { naam_eigen: '' }, exists)
    expect((await repo.chat(MAMA))!.naam_eigen).toBeNull()
  })
  it('lead voorstellen op telefoonnummer (0475… = +32475…)', () => {
    expect(phoneKey('0475 78 82 30')).toBe('32475788230')
    expect(phoneKey('+32 475/78.82.30')).toBe('32475788230')
    const leads = [
      { id: 'a', phone: '0475 78 82 30' },
      { id: 'b', phone: null },
    ]
    expect(suggestLead({ jid: '32475788230@s.whatsapp.net', telefoon: null }, leads)?.id).toBe('a')
    expect(suggestLead({ jid: '78821256634402@lid', telefoon: '+32475788230' }, leads)?.id).toBe('a')
    expect(suggestLead({ jid: '78821256634402@lid', telefoon: null }, leads)).toBeNull()
    // Twee leads met hetzelfde nummer: geen voorstel.
    expect(suggestLead({ jid: '32475788230@s.whatsapp.net', telefoon: null }, [...leads, { id: 'c', phone: '+32475788230' }])).toBeNull()
  })
})
