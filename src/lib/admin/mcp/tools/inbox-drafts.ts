import 'server-only'
import { after } from 'next/server'
import { z } from 'zod'
import { daysSince, leadContext, loadWaiting } from '../../sales/waiting'
import { SIGNATURE_RULE } from '../../sales/signature'
import { DEFAULT_FOLLOW_UP_ACTION, FOLLOW_UP_WORKDAYS } from '../../sales/follow-up'
import { type MailDraft } from '../../sales/drafts'
import { loadInbox } from '../../sales/inbox'
import { aiEngine, dismissJob, runJob } from '../../ai/jobs'
import { styleInstructions, styleKeyFor } from '../../ai/style-profile'

import { BY, uuid, validateDraft, validateDraftPatch, type ToolCtx } from '../tool'

/** Sales-inbox, wachtlijst, schrijfstijl en mailconcepten (sales). Nooit versturen. */
export function registerInboxTools(ctx: ToolCtx) {
  const { tool, session } = ctx
  const { leads, drafts } = session
  // ─── Inbox ────────────────────────────────────────────────
  tool('inbox', 'Sales-mails die op een antwoord wachten, met het AI-voorstel (als dat al klaar is).', {}, true, async () => {
    const r = await loadInbox(session)
    if (r.status === 'not_connected') throw new Error(r.reason)
    if (r.pendingJobIds.length && aiEngine('inbox_reply') === 'api')
      after(async () => {
        for (const id of r.pendingJobIds) await runJob(id)
      })
    // Taken die net aangemaakt werden, voert Grokbot zelf uit via ai_taken_open.
    return r.items.map((i) => ({
      thread_id: i.thread.id,
      job_id: i.job?.id ?? null,
      lead: i.lead.name,
      lead_id: i.lead.id,
      van: i.last.fromEmail,
      datum: i.last.date,
      onderwerp: i.last.subject,
      mail: i.last.text,
      tab: i.tab === 'nieuw' ? 'Nieuwe leads' : 'Al gemaild',
      ai_status: i.job?.status ?? 'pending',
      ai: i.job?.output ?? null,
    }))
  })
  tool(
    'wachten_op_antwoord_lijst',
    'Leads waar wij (casper@/contact@/cedric@) als laatste mailden en nog geen echt antwoord kregen (afwezigheidsmeldingen tellen niet), langst wachtend eerst. Enkel lezen: deze tool verstuurt niets. Gmail wordt pas opnieuw bevraagd als de opgeslagen stand ouder is dan 10 minuten (of met bijwerken = true).',
    { bijwerken: z.boolean().optional().describe('true = nu opnieuw in Gmail kijken') },
    true,
    async ({ bijwerken }) => {
      const r = await loadWaiting(session, { sync: bijwerken ? 'force' : 'auto' })
      if (r.status === 'not_connected') throw new Error(r.reason)
      const now = new Date()
      return {
        bijgewerkt: r.syncedAt,
        waarschuwing: r.warning,
        leads: r.items
          .map((i) => ({
            lead_id: i.lead.id,
            naam: i.lead.company ?? i.lead.name,
            contactpersoon: i.lead.name,
            email: i.lead.email,
            context: leadContext(i.lead),
            laatste_mail: { datum: i.mail.date, van: i.mail.from_email, onderwerp: i.mail.subject, preview: i.mail.preview, thread_id: i.thread_id, mailbox: i.mailbox },
            dagen: daysSince(i.mail.date, now),
          }))
          .sort((a, b) => b.dagen - a.dagen),
      }
    },
  )
  tool('inbox_wegklikken', 'Mail in de inbox verbergen (geen antwoord nodig).', { job_id: z.string() }, false, async ({ job_id }) => {
    await dismissJob(job_id)
    return 'Verborgen.'
  })

  // ─── Mailconcepten (nieuwe uitgaande mails; NOOIT zelf versturen) ─────
  const draftView = (d: MailDraft) => ({
    concept_id: d.id,
    status: d.status,
    lead_id: d.lead_id,
    van: d.from_email,
    aan: d.to_email,
    cc: d.cc,
    onderwerp: d.subject,
    formaat: d.is_html ? 'html' : 'text',
    thread_id: d.thread_id,
    in_reply_to: d.in_reply_to,
    context: d.context,
    na_versturen: {
      volgende_actie: d.follow_up_action ?? `${DEFAULT_FOLLOW_UP_ACTION} (standaard)`,
      opvolgen_op: d.follow_up_on ?? `${FOLLOW_UP_WORKDAYS} werkdagen na verzending (standaard)`,
    },
  })
  tool(
    'schrijfstijl',
    'Het schrijfstijlprofiel van Casper (gids + voorbeelden), afgeleid uit zijn echte verzonden mails. Lees dit voor je een mail schrijft.',
    {},
    true,
    async () => `${(await styleInstructions(styleKeyFor())) || 'Nog geen schrijfstijlprofiel.'}\n\nVaste regel (gaat voor op het profiel): ${SIGNATURE_RULE}`,
  )
  tool(
    'mail_concept_aanmaken',
    'Zet een NIEUWE uitgaande mail als concept klaar bij een lead. Lees eerst lead_fiche en schrijfstijl en geef altijd context mee. Eindig met "Groetjes,", daaronder "Casper" en "IKnowRight" (elk op een eigen regel), nooit enkel "Casper". Afzender is altijd casper@iknowright.be. Er wordt niets verstuurd: Casper keurt het concept in het dashboard goed en verstuurt het zelf. Na versturen wordt de lead automatisch bijgewerkt (volgende actie, opvolgdatum, notitie met onderwerp); geef volgende_actie/opvolgen_op mee als de standaard niet past. Geeft het concept_id terug.',
    {
      lead_id: z.string().describe('id van de lead (zie leads_lijst of lead_fiche)'),
      to: z.string().describe('e-mailadres van de ontvanger'),
      cc: z.array(z.string()).optional(),
      subject: z.string(),
      body: z.string().describe('tekst of HTML'),
      formaat: z.enum(['text', 'html']).optional().describe('standaard: automatisch (html als de body HTML-tags bevat)'),
      thread_id: z.string().optional().describe('Gmail-thread om in te antwoorden (van de mailbox van de afzender)'),
      in_reply_to: z.string().optional().describe('Message-ID van de mail waarop geantwoord wordt'),
      context: z
        .string()
        .optional()
        .describe('Korte uitleg voor Casper (2–5 zinnen): wie is de lead, wat gebeurde er al, waarom deze mail nu. Wordt naast het concept getoond.'),
      volgende_actie: z
        .string()
        .optional()
        .describe(`Optioneel: volgende actie op de lead zodra Casper deze mail verstuurt. Standaard "${DEFAULT_FOLLOW_UP_ACTION}".`),
      opvolgen_op: z
        .string()
        .optional()
        .describe(`Optioneel: opvolgdatum (YYYY-MM-DD) op de lead na versturen. Standaard ${FOLLOW_UP_WORKDAYS} werkdagen na verzending.`),
    },
    false,
    async (a) => {
      const input = validateDraft(a)
      const lead = await leads.get(input.lead_id)
      if (!lead) throw new Error(`Geen lead met id ${input.lead_id}.`)
      const d = await drafts.create({ ...input, original_body: input.body, created_by: BY })
      return draftView(d)
    },
  )
  tool(
    'mail_concept_bijwerken',
    'Past een mailconcept aan (enkel zolang het nog een concept is). Enkel meegegeven velden veranderen. Er wordt niets verstuurd.',
    {
      concept_id: z.string(),
      to: z.string().optional(),
      cc: z.array(z.string()).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      formaat: z.enum(['text', 'html']).optional(),
      thread_id: z.string().optional(),
      in_reply_to: z.string().optional(),
      context: z.string().optional(),
      volgende_actie: z.string().nullable().optional().describe('Volgende actie op de lead na versturen; null of "" = standaard.'),
      opvolgen_op: z.string().nullable().optional().describe('Opvolgdatum (YYYY-MM-DD) na versturen; null of "" = standaard.'),
    },
    false,
    async (a) => {
      const id = uuid(a.concept_id, 'concept_id')
      const current = await drafts.get(id)
      if (!current) throw new Error(`Geen concept met id ${id}.`)
      if (current.status !== 'concept') throw new Error('Dit concept is al verstuurd en kan niet meer aangepast worden.')
      const patch = validateDraftPatch(a)
      if (!(await drafts.update(id, patch))) throw new Error('Dit concept kan niet meer aangepast worden.')
      return draftView((await drafts.get(id))!)
    },
  )
  tool('mail_concept_verwijderen', 'Verwijdert een mailconcept (enkel zolang het nog een concept is).', { concept_id: z.string() }, false, async (a) => {
    const id = uuid(a.concept_id, 'concept_id')
    const current = await drafts.get(id)
    if (!current) throw new Error(`Geen concept met id ${id}.`)
    if (current.status !== 'concept') throw new Error('Dit concept is al verstuurd en kan niet verwijderd worden.')
    if (!(await drafts.remove(id))) throw new Error('Dit concept kan niet verwijderd worden.')
    return { verwijderd: id }
  })

  tool(
    'mail_concepten_lijst',
    'Open mailconcepten (nog niet verstuurd) met id, lead, thread_id en tekst.',
    { lead_id: z.string().optional() },
    true,
    async ({ lead_id }) => {
      const list = await drafts.list({ status: 'concept', ...(lead_id ? { leadId: uuid(lead_id, 'lead_id') } : {}) })
      const names = new Map((await leads.list()).map((l) => [l.id, l.name]))
      return list.map((d) => ({ ...draftView(d), lead: names.get(d.lead_id) ?? null, body: d.body }))
    },
  )
}
