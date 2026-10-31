import 'server-only'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { AdminSession } from '../session'
import {
  EVENT_KIND_LABELS,
  IDEA_STATUS_LABELS,
  STAGE_LABELS,
  STAGES,
  type Client,
  type EventKind,
  type Stage,
} from '../types'
import { addDays, brusselsToIso, euro, fmtDate, fmtTime, isoDay } from '../format'
import { contractProgress, nextSendDate } from '../billing'
import { computeTodos } from '../todos'
import { resultsToText, summarizeResults } from '../results'

const BY = 'Claude (connector)'

const INSTRUCTIONS = `Dit is IKR Admin: het interne dashboard van IKnowRight (IKR), een TikTok-bureau voor food brands in Vlaanderen.
Je werkt namens het IKR-team (Casper en Cedric). Schrijf in vlot Nederlands zoals in Vlaanderen, kort en concreet.

Werkwijze:
- Lees bij creatief werk (ideeën, uitwerkingen, draaiboeken, mails) eerst de IKR-kennis (ikr_kennis) en het klantdossier (klant_dossier).
- Respecteer wat een klant níét wil en leer uit afgekeurde ideeën (staan in het dossier).
- Verzin geen cijfers of feiten; gebruik [plaatshouders] als info ontbreekt.
- Toon voorstellen eerst aan de gebruiker en sla ze pas op na akkoord, tenzij de gebruiker expliciet vraagt om meteen op te slaan.
- Klanten kan je met hun naam aanduiden; de tools zoeken zelf de juiste klant.
- Presentaties maak je zelf in het gesprek (pptx), op basis van de templates die de gebruiker deelt.`

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }
}

function fail(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

/** Zoekt een klant op id of (deel van de) naam. */
async function resolveClient(session: AdminSession, ref: string): Promise<Client | string> {
  const q = ref.trim().toLowerCase()
  const clients = await session.repo.listClients()
  const byId = clients.find((c) => c.id === ref.trim())
  if (byId) return byId
  const exact = clients.filter((c) => c.name.toLowerCase() === q)
  if (exact.length === 1) return exact[0]
  const partial = clients.filter((c) => c.name.toLowerCase().includes(q))
  if (partial.length === 1) return partial[0]
  if (!partial.length) return `Geen klant gevonden voor "${ref}". Gebruik zoek_klanten om de juiste naam te vinden.`
  return `Meerdere klanten passen bij "${ref}": ${partial.map((c) => c.name).join(', ')}. Wees specifieker.`
}

const lines = z.array(z.string()).default([])

export function buildMcpServer(session: AdminSession) {
  const { repo } = session
  const server = new McpServer({ name: 'ikr-admin', version: '1.0.0' }, { instructions: INSTRUCTIONS })

  // ─── Lezen ────────────────────────────────────────────────

  server.registerTool(
    'ikr_kennis',
    {
      title: 'IKR-kennis',
      description: 'De vaste IKR-kennis: wie we zijn, aanpak, tone of voice, wat werkt op TikTok, pakketten. Lees dit vóór creatief werk.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const docs = await repo.listKnowledge()
      return text(docs.map((d) => `## ${d.title}\n${d.body}`).join('\n\n'))
    },
  )

  server.registerTool(
    'zoek_klanten',
    {
      title: 'Klanten zoeken',
      description: 'Lijst van klanten en leads met fase en eigenaar. Optioneel filteren op naam of fase.',
      inputSchema: {
        zoekterm: z.string().optional().describe('Deel van de naam'),
        fase: z.enum(STAGES).optional().describe('Filter op fase'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ zoekterm, fase }) => {
      const q = zoekterm?.toLowerCase().trim()
      const clients = (await repo.listClients()).filter(
        (c) => (!q || c.name.toLowerCase().includes(q)) && (!fase || c.stage === fase),
      )
      return text(
        clients.map((c) => ({
          id: c.id,
          naam: c.name,
          fase: STAGE_LABELS[c.stage],
          fase_code: c.stage,
          eigenaar: c.owner,
          sector: c.sector,
          in_fase_sinds: fmtDate(c.stage_changed_at, { day: 'numeric', month: 'short', year: 'numeric' }),
        })),
      )
    },
  )

  server.registerTool(
    'klant_dossier',
    {
      title: 'Klantdossier',
      description:
        'Alles over één klant: gegevens, AI-klantprofiel (toon, wat werkt, wat niet, geleerd), contactpersonen, contract, facturen, alle ideeën (met status en feedback), recente activiteit en komende afspraken.',
      inputSchema: { klant: z.string().describe('Naam of id van de klant') },
      annotations: { readOnlyHint: true },
    },
    async ({ klant }) => {
      const c = await resolveClient(session, klant)
      if (typeof c === 'string') return fail(c)
      const now = new Date()
      const today = isoDay(now)
      const [profile, contacts, contracts, invoices, ideas, activities, events] = await Promise.all([
        repo.getProfile(c.id),
        repo.listContacts(c.id),
        repo.listContracts(c.id),
        repo.listInvoices({ clientId: c.id }),
        repo.listIdeas(c.id),
        repo.listActivities({ clientId: c.id, limit: 20 }),
        repo.listEvents(now.toISOString(), addDays(now, 60).toISOString()),
      ])
      return text({
        klant: {
          id: c.id,
          naam: c.name,
          fase: STAGE_LABELS[c.stage],
          eigenaar: c.owner,
          sector: c.sector,
          website: c.website,
          tiktok: c.tiktok_handle,
          omschrijving: c.summary,
        },
        klantprofiel: profile && {
          merk: profile.brand_summary,
          toon: profile.tone_of_voice,
          doelgroep: profile.target_audience,
          werkt: profile.what_works,
          liever_niet: profile.avoid,
          geleerd: profile.learnings,
        },
        contactpersonen: contacts.map((p) => ({ naam: p.name, rol: p.role, email: p.email, telefoon: p.phone })),
        contracten: contracts.map((k) => ({
          pakket: k.package_name,
          per_maand: euro(k.monthly_amount_cents),
          start: k.start_date,
          einde: k.end_date,
          looptijd: contractProgress(k, today),
          volgende_factuur: nextSendDate(k, today),
          status: k.status,
        })),
        facturen: invoices.slice(0, 6).map((i) => ({ label: i.label, bedrag: euro(i.amount_cents), datum: i.send_date, status: i.status })),
        ideeen: ideas.map((i) => ({
          id: i.id,
          titel: i.title,
          status: IDEA_STATUS_LABELS[i.status],
          omschrijving: i.summary,
          format: i.format,
          hook: i.hook,
          opbouw: i.structure,
          shots: i.shots,
          nodig: i.needs,
          cta: i.cta,
          feedback: i.feedback,
        })),
        recente_activiteit: activities.map((a) => ({
          datum: fmtDate(a.created_at, { day: 'numeric', month: 'short' }),
          soort: a.kind,
          titel: a.title,
          tekst: a.body,
        })),
        komende_afspraken: events
          .filter((e) => e.client_id === c.id)
          .map((e) => ({
            id: e.id,
            soort: EVENT_KIND_LABELS[e.kind],
            titel: e.title,
            wanneer: `${fmtDate(e.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} ${fmtTime(e.starts_at)}`,
            draaiboek: Boolean(e.brief),
          })),
      })
    },
  )

  server.registerTool(
    'week_overzicht',
    {
      title: 'Overzicht: wat staat er open',
      description: 'Openstaande actiepunten (facturen, contracten die aflopen, ideeën zonder feedback, leads, draaidagen zonder draaiboek) en de agenda van de komende 14 dagen.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const now = new Date()
      const [todos, events, clients] = await Promise.all([
        computeTodos(session),
        repo.listEvents(now.toISOString(), addDays(now, 14).toISOString()),
        repo.listClients(),
      ])
      const name = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null
      return text({
        vandaag: fmtDate(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        actiepunten: todos.map((t) => ({ wat: t.title, detail: t.detail, soort: t.tag, eigenaar: t.owner })),
        agenda: events.map((e) => ({
          id: e.id,
          wanneer: `${fmtDate(e.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(e.starts_at)}${e.ends_at ? `–${fmtTime(e.ends_at)}` : ''}`,
          soort: EVENT_KIND_LABELS[e.kind],
          titel: e.title,
          klant: name(e.client_id),
          draaiboek: e.kind === 'shoot' ? Boolean(e.brief) : undefined,
        })),
      })
    },
  )

  server.registerTool(
    'agenda',
    {
      title: 'Agenda',
      description: 'Afspraken (draaidagen, sales calls, meetings) tussen twee datums. Standaard de komende 30 dagen.',
      inputSchema: {
        van: z.string().optional().describe('Startdatum YYYY-MM-DD'),
        tot: z.string().optional().describe('Einddatum YYYY-MM-DD'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ van, tot }) => {
      const from = van ? brusselsToIso(van, '00:00') : new Date().toISOString()
      const to = tot ? brusselsToIso(tot, '23:59') : addDays(new Date(), 30).toISOString()
      const [events, clients] = await Promise.all([repo.listEvents(from, to), repo.listClients()])
      return text(
        events.map((e) => ({
          id: e.id,
          soort: EVENT_KIND_LABELS[e.kind],
          titel: e.title,
          klant: clients.find((c) => c.id === e.client_id)?.name ?? null,
          start: `${fmtDate(e.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(e.starts_at)}`,
          einde: e.ends_at ? fmtTime(e.ends_at) : null,
          locatie: e.location,
          wie: e.attendees,
          notities: e.notes,
          draaiboek: e.brief,
        })),
      )
    },
  )

  server.registerTool(
    'resultaten',
    {
      title: 'TikTok-resultaten',
      description: 'Samenvatting van de TikTok-cijfers (views, engagement, top-video’s), voor alle klanten of één klant.',
      inputSchema: { klant: z.string().optional().describe('Naam of id; leeg = alle klanten') },
      annotations: { readOnlyHint: true },
    },
    async ({ klant }) => {
      let clientId: string | undefined
      if (klant) {
        const c = await resolveClient(session, klant)
        if (typeof c === 'string') return fail(c)
        clientId = c.id
      }
      const videos = await repo.listVideosWithStats({ clientId })
      if (!videos.length) return text('Nog geen videodata. De TikTok-koppeling is nog niet actief voor deze klant(en).')
      return text(resultsToText(summarizeResults(videos)))
    },
  )

  // ─── Schrijven ────────────────────────────────────────────

  server.registerTool(
    'ideeen_opslaan',
    {
      title: 'Ideeën opslaan',
      description: 'Slaat nieuwe content-ideeën op in het dossier van een klant (status: voorstel).',
      inputSchema: {
        klant: z.string().describe('Naam of id van de klant'),
        ideeen: z
          .array(
            z.object({
              titel: z.string(),
              omschrijving: z.string().optional(),
              format: z.string().optional().describe('Bv. "Losse video", "Reeks · 3 delen"'),
            }),
          )
          .min(1),
      },
    },
    async ({ klant, ideeen }) => {
      const c = await resolveClient(session, klant)
      if (typeof c === 'string') return fail(c)
      await repo.insertIdeas(
        c.id,
        ideeen.map((i) => ({ title: i.titel, summary: i.omschrijving ?? null, format: i.format ?? null, source: 'ai' as const, status: 'proposal' as const })),
      )
      await repo.addActivity({ client_id: c.id, kind: 'ai', title: `${ideeen.length} ideeën toegevoegd via Claude`, created_by: BY })
      return text(`${ideeen.length} ${ideeen.length === 1 ? 'idee' : 'ideeën'} opgeslagen bij ${c.name}.`)
    },
  )

  server.registerTool(
    'idee_uitwerken',
    {
      title: 'Idee uitwerken',
      description: 'Slaat de uitwerking van een idee op (hook, opbouw, shots, benodigdheden, CTA). Gebruik het idee-id uit klant_dossier.',
      inputSchema: {
        idee_id: z.string(),
        titel: z.string().optional(),
        hook: z.string(),
        opbouw: lines.describe('Stappen, in volgorde'),
        shots: lines,
        nodig: lines.describe('Props, mensen, locatie'),
        cta: z.string(),
      },
    },
    async ({ idee_id, titel, hook, opbouw, shots, nodig, cta }) => {
      const idea = await repo.getIdea(idee_id)
      if (!idea) return fail('Idee niet gevonden. Haal het id op via klant_dossier.')
      await repo.updateIdea(idee_id, {
        ...(titel ? { title: titel } : {}),
        hook,
        structure: opbouw,
        shots,
        needs: nodig,
        cta,
        status: idea.status === 'approved' ? 'approved' : 'developed',
      })
      return text(`Uitwerking van “${titel ?? idea.title}” opgeslagen.`)
    },
  )

  server.registerTool(
    'idee_status',
    {
      title: 'Status van een idee',
      description: 'Keurt een idee goed, af (met reden, zodat we eruit leren) of markeert het als gemaakt.',
      inputSchema: {
        idee_id: z.string(),
        status: z.enum(['approved', 'rejected', 'produced', 'proposal']).describe('approved = goedgekeurd, rejected = afgekeurd, produced = gemaakt'),
        reden: z.string().optional().describe('Bij afkeuren: waarom (komt in het klantprofiel)'),
      },
    },
    async ({ idee_id, status, reden }) => {
      const idea = await repo.getIdea(idee_id)
      if (!idea) return fail('Idee niet gevonden.')
      await repo.updateIdea(idee_id, { status, ...(reden ? { feedback: reden } : {}) })
      if (status === 'rejected' && reden) {
        const profile = await repo.getProfile(idea.client_id)
        const line = `“${idea.title}” afgekeurd: ${reden}`
        await repo.upsertProfile(idea.client_id, { learnings: profile?.learnings ? `${profile.learnings}\n${line}` : line })
      }
      return text(`“${idea.title}” staat nu op ${IDEA_STATUS_LABELS[status]}.`)
    },
  )

  server.registerTool(
    'notitie_toevoegen',
    {
      title: 'Notitie toevoegen',
      description: 'Voegt een notitie of verslag van een call toe aan de tijdlijn van een klant.',
      inputSchema: {
        klant: z.string(),
        tekst: z.string(),
        titel: z.string().optional(),
        soort: z.enum(['note', 'call', 'email']).default('note'),
      },
    },
    async ({ klant, tekst, titel, soort }) => {
      const c = await resolveClient(session, klant)
      if (typeof c === 'string') return fail(c)
      await repo.addActivity({ client_id: c.id, kind: soort, title: titel ?? (soort === 'call' ? 'Call' : 'Notitie'), body: tekst, created_by: `${session.user.name} via Claude` })
      return text(`Notitie toegevoegd bij ${c.name}.`)
    },
  )

  server.registerTool(
    'fase_wijzigen',
    {
      title: 'Fase wijzigen',
      description: `Zet een klant in een andere fase van de pipeline. Fases: ${STAGES.map((s) => `${s} (${STAGE_LABELS[s]})`).join(', ')}.`,
      inputSchema: { klant: z.string(), fase: z.enum(STAGES) },
    },
    async ({ klant, fase }) => {
      const c = await resolveClient(session, klant)
      if (typeof c === 'string') return fail(c)
      await repo.moveStage(c.id, fase as Stage, BY)
      await repo.addActivity({ client_id: c.id, kind: 'system', title: `Fase → ${STAGE_LABELS[fase as Stage]} (via Claude)`, created_by: BY })
      return text(`${c.name} staat nu op ${STAGE_LABELS[fase as Stage]}.`)
    },
  )

  server.registerTool(
    'klant_aanmaken',
    {
      title: 'Klant of lead aanmaken',
      description: 'Maakt een nieuwe klant of lead aan.',
      inputSchema: {
        naam: z.string(),
        fase: z.enum(STAGES).default('lead'),
        eigenaar: z.enum(['casper', 'cedric']).optional(),
        sector: z.string().optional(),
        bron: z.string().optional(),
        website: z.string().optional(),
        omschrijving: z.string().optional(),
      },
    },
    async ({ naam, fase, eigenaar, sector, bron, website, omschrijving }) => {
      const existing = (await repo.listClients()).find((c) => c.name.toLowerCase() === naam.toLowerCase())
      if (existing) return fail(`${existing.name} bestaat al (id ${existing.id}).`)
      const c = await repo.createClient({ name: naam, stage: fase as Stage, owner: eigenaar ?? null, sector: sector ?? null, source: bron ?? null, website: website ?? null, summary: omschrijving ?? null })
      await repo.addActivity({ client_id: c.id, kind: 'system', title: 'Klant aangemaakt via Claude', created_by: BY })
      return text({ ok: true, id: c.id, naam: c.name })
    },
  )

  server.registerTool(
    'klantprofiel_bijwerken',
    {
      title: 'Klantprofiel bijwerken',
      description: 'Werkt het AI-klantprofiel bij (wat IKR AI over de klant weet). Lege velden blijven ongewijzigd.',
      inputSchema: {
        klant: z.string(),
        merk: z.string().optional(),
        toon: z.string().optional(),
        doelgroep: z.string().optional(),
        werkt: z.string().optional(),
        liever_niet: z.string().optional(),
        geleerd: z.string().optional(),
      },
    },
    async ({ klant, merk, toon, doelgroep, werkt, liever_niet, geleerd }) => {
      const c = await resolveClient(session, klant)
      if (typeof c === 'string') return fail(c)
      const patch = Object.fromEntries(
        Object.entries({ brand_summary: merk, tone_of_voice: toon, target_audience: doelgroep, what_works: werkt, avoid: liever_niet, learnings: geleerd }).filter(([, v]) => v !== undefined),
      )
      await repo.upsertProfile(c.id, patch)
      return text(`Klantprofiel van ${c.name} bijgewerkt.`)
    },
  )

  server.registerTool(
    'afspraak_plannen',
    {
      title: 'Afspraak of draaidag plannen',
      description: 'Zet een afspraak in de IKR-kalender. Tijden in Belgische tijd.',
      inputSchema: {
        titel: z.string(),
        soort: z.enum(['shoot', 'sales_call', 'meeting', 'deadline', 'other']).describe('shoot = draaidag'),
        datum: z.string().describe('YYYY-MM-DD'),
        van: z.string().describe('HH:MM'),
        tot: z.string().optional().describe('HH:MM'),
        klant: z.string().optional(),
        locatie: z.string().optional(),
        wie: z.array(z.enum(['casper', 'cedric'])).optional(),
        notities: z.string().optional(),
      },
    },
    async ({ titel, soort, datum, van, tot, klant, locatie, wie, notities }) => {
      let clientId: string | null = null
      if (klant) {
        const c = await resolveClient(session, klant)
        if (typeof c === 'string') return fail(c)
        clientId = c.id
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !/^\d{1,2}:\d{2}$/.test(van)) return fail('Gebruik datum YYYY-MM-DD en tijd HH:MM.')
      const e = await repo.createEvent({
        client_id: clientId,
        kind: soort as EventKind,
        title: titel,
        starts_at: brusselsToIso(datum, van),
        ends_at: tot ? brusselsToIso(datum, tot) : null,
        location: locatie ?? null,
        attendees: wie ?? [],
        notes: notities ?? null,
      })
      return text({ ok: true, id: e.id, gepland: `${fmtDate(e.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} ${fmtTime(e.starts_at)}` })
    },
  )

  server.registerTool(
    'draaiboek_opslaan',
    {
      title: 'Draaiboek opslaan',
      description: 'Slaat een draaiboek op bij een draaidag (planning per uur, shotlist, checklist). Haal het afspraak-id op via agenda of week_overzicht.',
      inputSchema: {
        afspraak_id: z.string(),
        planning: z.array(z.object({ tijd: z.string().describe('HH:MM'), wat: z.string() })),
        shotlist: lines,
        checklist: lines,
        notities: z.string().optional(),
      },
    },
    async ({ afspraak_id, planning, shotlist, checklist, notities }) => {
      const e = await repo.getEvent(afspraak_id)
      if (!e) return fail('Afspraak niet gevonden.')
      await repo.updateEvent(afspraak_id, {
        brief: { schedule: planning.map((p) => ({ time: p.tijd, what: p.wat })), shotlist, checklist, notes: notities },
      })
      return text(`Draaiboek opgeslagen bij “${e.title}”.`)
    },
  )

  server.registerTool(
    'kennis_bijwerken',
    {
      title: 'IKR-kennis bijwerken',
      description: 'Werkt een onderwerp van de IKR-kennis bij of voegt er een toe. Overschrijft de volledige tekst van dat onderwerp: lees eerst ikr_kennis.',
      inputSchema: { titel: z.string(), tekst: z.string() },
    },
    async ({ titel, tekst }) => {
      const docs = await repo.listKnowledge()
      const existing = docs.find((d) => d.title.toLowerCase() === titel.toLowerCase())
      const slug = existing?.slug ?? titel.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      await repo.saveKnowledge({ slug, title: existing?.title ?? titel, body: tekst, updated_by: `${session.user.name} via Claude` })
      return text(`IKR-kennis “${existing?.title ?? titel}” ${existing ? 'bijgewerkt' : 'toegevoegd'}.`)
    },
  )

  return server
}
