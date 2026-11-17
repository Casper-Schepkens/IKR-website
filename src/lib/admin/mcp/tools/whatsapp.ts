import 'server-only'
import { z } from 'zod'
import { chatLabel, conversationFor, whatsappFor } from '../../whatsapp/service'
import type { ToolCtx } from '../tool'

/** WhatsApp (read-only): gesprekken met een lead of klant lezen. Er is geen enkele tool die iets verstuurt. */
export function registerWhatsappTools(ctx: ToolCtx) {
  const { tool, session, resolveLead, resolveClient } = ctx
  tool(
    'whatsapp_gesprekken',
    'De laatste WhatsApp-berichten met een lead of klant (oudste eerst), uit alle chats die in het dashboard (WhatsApp) aan die lead of klant gekoppeld zijn. Enkel chats die op actief staan hebben berichten. Read-only: berichten versturen kan niet. Geef lead_id of klant_id (id, of naam).',
    {
      lead_id: z.string().optional().describe('id (of naam) van de lead'),
      klant_id: z.string().optional().describe('id (of naam) van de klant'),
      limit: z.number().int().min(1).max(200).optional().describe('aantal berichten, standaard 30'),
    },
    true,
    async ({ lead_id, klant_id, limit = 30 }) => {
      if (Boolean(lead_id) === Boolean(klant_id)) throw new Error('Geef ofwel lead_id ofwel klant_id.')
      const lead = lead_id ? await resolveLead(lead_id) : null
      const klant = klant_id ? await resolveClient(klant_id) : null
      const repo = await whatsappFor(session, true)
      const { chats, berichten } = await conversationFor(repo, { leadId: lead?.id, klantId: klant?.id }, limit)
      const wie = lead ? `lead ${lead.name}` : `klant ${klant!.name}`
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
}
