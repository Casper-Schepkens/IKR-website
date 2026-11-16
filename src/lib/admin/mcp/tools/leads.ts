import 'server-only'
import { z } from 'zod'
import { fmtDate } from '../../format'
import { textMatches } from '../../search'
import { LOST_REASON_LABELS, LOST_REASONS, OPEN_STAGES, SOURCES, STAGE_LABELS, STAGES, type Lead } from '../../sales/types'
import { coldMailStats } from '../../sales/apollo'

import { dateStr, leadView, type ToolCtx } from '../tool'

/** Leads en cold mails (sales). */
export function registerLeadTools(ctx: ToolCtx) {
  const { tool, resolveLead, session } = ctx
  const { leads } = session
  // ─── Leads ────────────────────────────────────────────────
  tool(
    'leads_lijst',
    'Lijst van leads. Standaard de lopende, gesorteerd op opvolgdatum. Optioneel filteren op weergave of zoekterm.',
    { weergave: z.enum(['lopend', 'gewonnen', 'lost', 'alles']).optional(), zoek: z.string().optional() },
    true,
    async ({ weergave = 'lopend', zoek }) => {
      const q = zoek?.trim()
      return (await leads.list())
        .filter((l) =>
          weergave === 'alles' ? true : weergave === 'lopend' ? OPEN_STAGES.includes(l.stage) : l.stage === (weergave === 'gewonnen' ? 'won' : 'lost'),
        )
        .filter((l) => !q || [l.name, l.company, l.email, l.notes].some((v) => textMatches(v, q)))
        .sort((a, b) => (a.follow_up_on ?? '9999').localeCompare(b.follow_up_on ?? '9999'))
        .map((l) => ({ id: l.id, naam: l.name, bedrijf: l.company, fase: STAGE_LABELS[l.stage], volgende_actie: l.next_action, opvolgen_op: l.follow_up_on }))
    },
  )
  tool('lead_fiche', 'Alle gegevens en notities van één lead.', { lead: z.string() }, true, async ({ lead }) => leadView(await resolveLead(lead)))
  tool(
    'lead_aanmaken',
    'Nieuwe lead aanmaken.',
    {
      naam: z.string(),
      bedrijf: z.string().optional(),
      email: z.string().optional(),
      telefoon: z.string().optional(),
      bron: z.enum(SOURCES).optional(),
      volgende_actie: z.string().optional(),
      opvolgen_op: dateStr.optional(),
      notities: z.string().optional(),
    },
    false,
    async (a) => {
      const l = await leads.create({
        name: a.naam,
        company: a.bedrijf ?? null,
        email: a.email?.toLowerCase() ?? null,
        phone: a.telefoon ?? null,
        source: a.bron ?? 'cold_mail',
        next_action: a.volgende_actie ?? null,
        follow_up_on: a.opvolgen_op ?? null,
        notes: a.notities ?? null,
      })
      return leadView(l)
    },
  )
  tool(
    'lead_bijwerken',
    'Velden van een lead aanpassen. Enkel meegegeven velden veranderen; een lege tekst maakt een veld leeg. "notities" vervangt alle notities (gebruik lead_notitie_toevoegen om iets toe te voegen).',
    {
      lead: z.string(),
      naam: z.string().optional(),
      bedrijf: z.string().optional(),
      email: z.string().optional(),
      telefoon: z.string().optional(),
      bron: z.enum(SOURCES).optional(),
      volgende_actie: z.string().optional(),
      opvolgen_op: z.string().optional().describe('YYYY-MM-DD, of leeg om te wissen'),
      notities: z.string().optional(),
    },
    false,
    async (a) => {
      const l = await resolveLead(a.lead)
      const v = (x: string | undefined) => (x === undefined ? undefined : x.trim() || null)
      if (a.opvolgen_op && !/^\d{4}-\d{2}-\d{2}$/.test(a.opvolgen_op)) throw new Error('opvolgen_op moet YYYY-MM-DD zijn.')
      const patch = Object.fromEntries(
        Object.entries({
          name: a.naam?.trim() || undefined,
          company: v(a.bedrijf),
          email: v(a.email)?.toLowerCase() ?? (a.email === undefined ? undefined : null),
          phone: v(a.telefoon),
          source: a.bron,
          next_action: v(a.volgende_actie),
          follow_up_on: v(a.opvolgen_op),
          notes: v(a.notities),
        }).filter(([, x]) => x !== undefined),
      )
      await leads.patch(l.id, patch)
      return leadView((await leads.get(l.id))!)
    },
  )
  tool('lead_notitie_toevoegen', 'Notitie onderaan de notities van een lead toevoegen (met datum).', { lead: z.string(), notitie: z.string() }, false, async ({ lead, notitie }) => {
    const l = await resolveLead(lead)
    const line = `${fmtDate(new Date())} (Grokbot): ${notitie.trim()}`
    await leads.patch(l.id, { notes: l.notes ? `${l.notes}\n\n${line}` : line })
    return 'Notitie toegevoegd.'
  })
  tool('lead_fase', 'Fase van een lead zetten (ook om een lost lead te heropenen).', { lead: z.string(), fase: z.enum(STAGES.filter((s) => s !== 'lost') as [string, ...string[]]) }, false, async ({ lead, fase }) => {
    const l = await resolveLead(lead)
    await leads.setStage(l.id, fase as Lead['stage'])
    return `${l.name}: ${STAGE_LABELS[fase as Lead['stage']]}.`
  })
  tool('lead_lost', 'Lead op lost zetten met een reden.', { lead: z.string(), reden: z.enum(LOST_REASONS), notitie: z.string().optional() }, false, async ({ lead, reden, notitie }) => {
    const l = await resolveLead(lead)
    await leads.markLost(l.id, reden, notitie ?? null)
    return `${l.name} staat op lost (${LOST_REASON_LABELS[reden]}).`
  })
  tool('lead_verwijderen', 'Geen lead (bv. een freelancer): verwijderen zonder lost te zetten. Enkel met het exacte id of e-mailadres (nooit op naam). Mails van dit adres verschijnen niet meer in de inbox. Lukt niet als de lead calls of verstuurde mails heeft.', { lead: z.string().describe('id of e-mailadres') }, false, async ({ lead }) => {
    const q = lead.trim().toLowerCase()
    const l = (await leads.list()).find((x) => x.id === lead.trim() || (x.email && x.email.toLowerCase() === q))
    if (!l) throw new Error('Geef het exacte id of e-mailadres van de lead (zie lead_fiche); verwijderen op naam kan niet.')
    await leads.removeNotALead(l.id)
    return `${l.name} is verwijderd.`
  })

  // ─── Cold mails ───────────────────────────────────────────
  tool('cold_mails', 'Apollo: nieuwe adressen nog te mailen, ingeplande mails en cijfers per sequence.', {}, true, async () => coldMailStats())
}
