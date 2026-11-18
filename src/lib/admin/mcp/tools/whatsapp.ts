import 'server-only'
import { z } from 'zod'
import { chatLabel, conversationFor, recentAll, whatsappFor } from '../../whatsapp/service'
import type { ToolCtx } from '../tool'

/** WhatsApp (read-only): gesprekken met een lead of klant lezen. Er is geen enkele tool die iets verstuurt. */
export function registerWhatsappTools(ctx: ToolCtx) {
  const { tool, session, resolveLead, resolveClient } = ctx
  tool(
    'whatsapp_gesprekken',
    'De laatste WhatsApp-berichten met een lead of klant (oudste eerst), uit alle chats die in het dashboard (WhatsApp) aan die lead of klant gekoppeld zijn. Enkel chats die op actief staan hebben berichten. Read-only: berichten versturen kan niet. Geef lead_id of klant_id (id, of naam), of intern: true voor de interne chats (teamgroep van IKR).',
    {
      lead_id: z.string().optional().describe('id (of naam) van de lead'),
      klant_id: z.string().optional().describe('id (of naam) van de klant'),
      intern: z.boolean().optional().describe('true = de interne chats (teamgroep van IKR)'),
      limit: z.number().int().min(1).max(200).optional().describe('aantal berichten, standaard 30'),
    },
    true,
    async ({ lead_id, klant_id, intern, limit = 30 }) => {
      if ([Boolean(lead_id), Boolean(klant_id), Boolean(intern)].filter(Boolean).length !== 1) throw new Error('Geef ofwel lead_id, ofwel klant_id, ofwel intern: true.')
      const lead = lead_id ? await resolveLead(lead_id) : null
      const klant = klant_id ? await resolveClient(klant_id) : null
      const repo = await whatsappFor(session, true)
      const { chats, berichten } = await conversationFor(repo, { leadId: lead?.id, klantId: klant?.id, intern: Boolean(intern) }, limit)
      const wie = lead ? `lead ${lead.name}` : klant ? `klant ${klant.name}` : 'de interne chats (IKR-team)'
      const names = new Map(chats.map((c) => [c.jid, chatLabel(c)]))
      return {
        voor: wie,
        chats: chats.map((c) => ({ naam: chatLabel(c), groep: c.is_groep, actief: c.actief, laatst_actief: c.laatst_actief })),
        ...(chats.length ? {} : { uitleg: `Nog geen WhatsApp-chat gekoppeld aan ${wie}. Dat gebeurt in het dashboard (WhatsApp).` }),
        ...(chats.length && !chats.some((c) => c.actief) ? { uitleg: 'De gekoppelde chat staat niet op actief: er zijn geen berichten bewaard.' } : {}),
        berichten: berichten.map((b) => ({
          tijdstip: b.tijdstip,
          chat: names.get(b.jid) ?? b.jid,
          van: b.richting === 'uit' ? 'IKR' : (b.afzender ?? names.get(b.jid) ?? 'contact'),
          richting: b.richting,
          tekst: b.tekst,
          media: b.media_type,
        })),
      }
    },
  )
  tool(
    'whatsapp_nieuw',
    'Nieuwe WhatsApp-berichten in alle actieve chats (klantgroepen, leads, de interne teamgroep) sinds een tijdstip, per chat, oudste eerst. Gebruik dit in je werkplek-rondes om te zien wat er sinds de vorige ronde gezegd werd. Read-only.',
    {
      sinds: z.string().optional().describe('ISO-tijdstip; standaard 24 uur geleden'),
      limit: z.number().int().min(1).max(500).optional().describe('max. aantal berichten in totaal, standaard 200'),
    },
    true,
    async ({ sinds, limit = 200 }) => {
      const since = sinds && !Number.isNaN(Date.parse(sinds)) ? new Date(sinds).toISOString() : new Date(Date.now() - 24 * 3_600_000).toISOString()
      const repo = await whatsappFor(session, true)
      const [groups, leads, clients] = await Promise.all([recentAll(repo, since, limit), session.leads.list(), session.clients.list()])
      return {
        sinds: since,
        chats: groups.map(({ chat, berichten }) => ({
          chat: chatLabel(chat),
          voor: chat.intern ? 'intern (IKR-team)' : chat.klant_id ? `klant ${clients.find((c) => c.id === chat.klant_id)?.name ?? chat.klant_id}` : chat.lead_id ? `lead ${leads.find((l) => l.id === chat.lead_id)?.name ?? chat.lead_id}` : null,
          klant_id: chat.klant_id,
          lead_id: chat.lead_id,
          berichten: berichten.map((b) => ({ tijdstip: b.tijdstip, van: b.richting === 'uit' ? 'IKR' : (b.afzender ?? chatLabel(chat)), tekst: b.tekst, media: b.media_type })),
        })),
        ...(groups.length ? {} : { uitleg: 'Geen nieuwe berichten in de actieve chats sinds dat tijdstip.' }),
      }
    },
  )
}
