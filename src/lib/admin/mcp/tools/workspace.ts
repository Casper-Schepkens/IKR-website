import 'server-only'
import { SALES_EMAIL } from '../../env'
import { z } from 'zod'
import { safeUrl } from '../../weekly/pins'
import { TEAM } from '../../weekly/types'
import { notificationsFor } from '../../notifications/service'
import { workspaceRepo } from '../../workspace/repo'
import { BOT as WS_BOT, memberEmail, memberName as wsMemberName } from '../../workspace/service'
import { CARD_KINDS, type CardWithMessages } from '../../workspace/types'

import { owner, type ToolCtx } from '../tool'

/** Werkplek (pagina Grok Bot) en meldingen. */
export function registerWorkspaceTools(ctx: ToolCtx) {
  const { tool, scope } = ctx
  // Team-sessie: de werkplek van Casper kan sales bevatten, dus die is hier niet zichtbaar.
  const visible = (ownerEmail: string) => scope === 'sales' || ownerEmail.toLowerCase() !== SALES_EMAIL
  const getCard = async (id: string) => {
    const c = await workspaceRepo().get(id)
    if (!c || !visible(c.owner_email)) throw new Error('Kaart niet gevonden.')
    return c
  }
  // ─── Werkplek (pagina Grok Bot) ─────────────────────────
  const cardView = (c: CardWithMessages, full = false) => ({
    kaart_id: c.id,
    voor: wsMemberName(c.owner_email),
    soort: c.kind,
    titel: c.title,
    tekst: full ? c.body : c.body.slice(0, 300),
    status: c.status,
    actie: c.action_label ? { label: c.action_label, uitleg: c.action_detail, status: c.action_status } : null,
    link: c.link,
    berichten: full ? c.messages.map((m) => ({ van: m.author === WS_BOT ? 'Grok Bot' : wsMemberName(m.author), tekst: m.body, op: m.created_at })) : c.messages.length,
    laatst_van: c.messages.at(-1) ? (c.messages.at(-1)!.author === WS_BOT ? 'Grok Bot' : wsMemberName(c.messages.at(-1)!.author)) : null,
    sinds: c.created_at,
  })
  tool(
    'werkplek_lijst',
    'Kaarten op de werkplek (pagina Grok Bot) van een teamlid of iedereen: onderwerpen, opdrachten, vragen en voorgestelde acties met hun status. Gebruik dit eerst bij een proactieve ronde om niets dubbel klaar te zetten.',
    { teamlid: owner.optional(), status: z.enum(['open', 'besproken', 'archief', 'alle']).optional().describe('standaard open') },
    true,
    async ({ teamlid, status = 'open' }) =>
      (await workspaceRepo().list(teamlid ? memberEmail(teamlid) : null)).filter((c) => visible(c.owner_email) && (status === 'alle' || c.status === status)).map((c) => cardView(c)),
  )
  tool('werkplek_kaart', 'Eén kaart met de volledige tekst en het hele draadje.', { kaart_id: z.string() }, true, async ({ kaart_id }) => {
    return cardView(await getCard(kaart_id), true)
  })
  tool(
    'werkplek_kaart_aanmaken',
    `Iets klaarzetten op de werkplek van een teamlid (enkel die persoon ziet het). Soorten: ${Object.entries(CARD_KINDS).map(([k, v]) => `${k} (${v})`).join(', ')}. Wil je iets doen waarvoor je toestemming vraagt, geef dan actie (korte knoptekst, bv. "Opvolgmail klaarzetten") en actie_uitleg: het teamlid klikt "Doe maar" of "Nee"; daarna krijg je een AI-taak om het uit te voeren. Nooit iets versturen. Sales enkel voor casper.`,
    { voor: owner, soort: z.enum(Object.keys(CARD_KINDS) as [string, ...string[]]), titel: z.string(), tekst: z.string(), link: z.string().optional(), actie: z.string().optional(), actie_uitleg: z.string().optional() },
    false,
    async ({ voor, soort, titel, tekst, link, actie, actie_uitleg }) => {
      const t = titel.trim()
      if (!t) throw new Error('Geef een titel.')
      const url = link ? safeUrl(link) : null
      if (link && !url) throw new Error('Die link klopt niet (enkel http/https).')
      const c = await workspaceRepo().create({ owner_email: memberEmail(voor), kind: soort as never, title: t.slice(0, 200), body: tekst.slice(0, 20000), link: url, action_label: actie?.trim().slice(0, 200) || null, action_detail: actie_uitleg?.trim().slice(0, 4000) || null, action_status: actie?.trim() ? 'voorgesteld' : null, created_by: WS_BOT })
      return { kaart_id: c.id, voor: wsMemberName(c.owner_email) }
    },
  )
  tool('werkplek_reageren', 'Een bericht in het draadje van een kaart zetten (bv. een antwoord of een update).', { kaart_id: z.string(), tekst: z.string() }, false, async ({ kaart_id, tekst }) => {
    const repo = workspaceRepo()
    const c = await getCard(kaart_id)
    if (!tekst.trim()) throw new Error('Leeg bericht.')
    await repo.addMessage(c.id, WS_BOT, tekst.trim().slice(0, 20000))
    await repo.update(c.id, { bot_busy_since: null, unread: true })
    return 'Geplaatst.'
  })
  tool(
    'werkplek_kaart_bijwerken',
    'Titel, tekst, status (open/besproken/archief) of de voorgestelde actie van een kaart aanpassen. actie_uitgevoerd: true na het uitvoeren van een goedgekeurde actie.',
    { kaart_id: z.string(), titel: z.string().optional(), tekst: z.string().optional(), status: z.enum(['open', 'besproken', 'archief']).optional(), actie: z.string().optional(), actie_uitleg: z.string().optional(), actie_uitgevoerd: z.boolean().optional() },
    false,
    async ({ kaart_id, titel, tekst, status, actie, actie_uitleg, actie_uitgevoerd }) => {
      const repo = workspaceRepo()
      const c = await getCard(kaart_id)
      await repo.update(c.id, {
        ...(titel?.trim() ? { title: titel.trim().slice(0, 200) } : {}),
        ...(tekst !== undefined ? { body: tekst.slice(0, 20000) } : {}),
        ...(status ? { status } : {}),
        ...(actie !== undefined ? { action_label: actie.trim() || null, action_status: actie.trim() ? 'voorgesteld' : null } : {}),
        ...(actie_uitleg !== undefined ? { action_detail: actie_uitleg.trim() || null } : {}),
        ...(actie_uitgevoerd ? { action_status: 'uitgevoerd' as const, bot_busy_since: null } : {}),
      })
      return 'Bijgewerkt.'
    },
  )
  tool(
    'meldingen_overzicht',
    'Wat er per teamlid openstaat (dezelfde tellers als de bolletjes in de zijbalk): werkplek (nieuwe kaarten of wachtend op "Doe maar"), SOP-voorstellen, to-do’s te laat, productiestappen te laat; voor Casper ook inbox-concepten, calls af te ronden/transcripts te koppelen, leads op te volgen, aflopende contracten en achterstallige betalingen. Enkel lezen.',
    { teamlid: owner.optional() },
    true,
    async ({ teamlid }) => {
      const people = (teamlid ? TEAM.filter((t) => t.key === teamlid) : TEAM).filter((t) => scope === 'sales' || t.email !== SALES_EMAIL)
      return Object.fromEntries(await Promise.all(people.map(async (t) => [t.name, await notificationsFor(t.email)] as const)))
    },
  )
}
