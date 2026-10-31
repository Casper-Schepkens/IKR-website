import 'server-only'
import type { AdminRepo, VideoWithStats } from './repo'
import type {
  Activity,
  AiRun,
  CalendarEvent,
  Client,
  ClientProfile,
  Contact,
  ContentIdea,
  Contract,
  Deck,
  Invoice,
  KnowledgeDoc,
  Template,
  Video,
  VideoStatsSnapshot,
} from '../types'
import { addDays, isoDay, startOfWeek } from '../format'

/**
 * Demomodus: alle data in het geheugen van de server, met voorbeelddata.
 * Bedoeld om /admin lokaal te bekijken zonder Supabase. Wijzigingen verdwijnen bij een herstart.
 */

type Store = {
  clients: Client[]
  contacts: Contact[]
  activities: Activity[]
  profiles: ClientProfile[]
  contracts: Contract[]
  invoices: Invoice[]
  events: CalendarEvent[]
  ideas: ContentIdea[]
  templates: Template[]
  decks: Deck[]
  knowledge: KnowledgeDoc[]
  videos: Video[]
  stats: VideoStatsSnapshot[]
  aiRuns: AiRun[]
}

const g = globalThis as unknown as { __ikrDemoStore?: Store }

function id() {
  return crypto.randomUUID()
}

function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function seed(): Store {
  const now = new Date()
  const daysAgo = (n: number) => addDays(now, -n).toISOString()
  const today = isoDay(now)
  const nextMonday = addDays(startOfWeek(now), 7)
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = addDays(nextMonday, dayOffset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const mk = (
    name: string,
    stage: Client['stage'],
    owner: string,
    extra: Partial<Client> = {},
  ): Client => ({
    id: id(),
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    stage,
    stage_changed_at: daysAgo(6),
    owner,
    source: null,
    sector: 'Food',
    website: null,
    tiktok_handle: null,
    drive_folder_url: null,
    logo_url: null,
    vat_number: null,
    billing_email: null,
    summary: null,
    created_at: daysAgo(120),
    updated_at: daysAgo(1),
    ...extra,
  })

  const wasbar = mk('Wasbar', 'shoot_planned', 'cedric', {
    summary: 'Wassalon met koffiebar. Content rond de beleving: wassen, koffie, mensen.',
  })
  const tempus = mk('Tempus', 'shoot_planned', 'casper')
  const maison = mk('Maison Slash', 'shoot_planned', 'cedric')
  const ohma = mk('Oh!ma', 'live', 'casper')
  const chez = mk('Chez Albert', 'ideas', 'casper', { stage_changed_at: daysAgo(3) })
  const lilalou = mk('Lilalou', 'editing', 'cedric')
  const lead1 = mk('Voorbeeld-lead: Bakkerij', 'lead', 'cedric', {
    source: 'contactformulier',
    created_at: daysAgo(2),
    stage_changed_at: daysAgo(2),
  })
  const lead2 = mk('Voorbeeld-lead: Foodtruck', 'lead', 'casper', {
    source: 'doorverwezen',
    created_at: daysAgo(5),
    stage_changed_at: daysAgo(5),
  })
  const lead3 = mk('Voorbeeld-lead: Restaurant', 'sales_call', 'casper', {
    source: 'pricingformulier',
  })

  const clients = [wasbar, tempus, maison, ohma, chez, lilalou, lead1, lead2, lead3]

  const contract = (
    c: Client,
    amount: number,
    videos: number,
    start: string,
    end: string | null,
  ): Contract => ({
    id: id(),
    client_id: c.id,
    package_name: `${videos} video's / maand`,
    videos_per_month: videos,
    monthly_amount_cents: amount * 100,
    billing_cycle: 'monthly',
    billing_day: 1,
    start_date: start,
    end_date: end,
    renewal_notice_days: 30,
    status: 'active',
    billit_customer_id: null,
    notes: null,
  })

  const ohmaEnd = isoDay(addDays(now, 28))
  const contracts = [
    contract(wasbar, 1250, 8, '2026-05-01', '2027-04-30'),
    contract(tempus, 1650, 8, '2026-03-01', '2027-02-28'),
    contract(maison, 1650, 8, '2026-02-01', '2027-01-31'),
    contract(ohma, 1100, 6, isoDay(addDays(now, -155)), ohmaEnd),
    contract(chez, 900, 4, '2026-09-01', '2027-08-31'),
    contract(lilalou, 1250, 8, '2026-04-01', '2027-03-31'),
  ]

  const invoices: Invoice[] = [
    {
      id: id(),
      client_id: maison.id,
      contract_id: contracts[2].id,
      label: 'November 2026',
      send_date: isoDay(addDays(now, 2)),
      amount_cents: 165000,
      status: 'to_send',
      billit_invoice_id: null,
      sent_at: null,
      paid_at: null,
    },
    {
      id: id(),
      client_id: wasbar.id,
      contract_id: contracts[0].id,
      label: 'Oktober 2026',
      send_date: '2026-10-01',
      amount_cents: 125000,
      status: 'paid',
      billit_invoice_id: null,
      sent_at: '2026-10-01T09:00:00Z',
      paid_at: '2026-10-06T09:00:00Z',
    },
  ]

  const contacts: Contact[] = [
    {
      id: id(),
      client_id: wasbar.id,
      name: 'Charlotte',
      role: 'Contactpersoon',
      email: null,
      phone: null,
      is_primary: true,
    },
  ]

  const profiles: ClientProfile[] = [
    {
      client_id: wasbar.id,
      brand_summary: 'Wassalon met koffiebar: je wast, je drinkt iets, je ontmoet mensen.',
      tone_of_voice: 'Speels, nuchter, geen clickbait.',
      target_audience: '[aanvullen]',
      what_works: 'Medewerkers in beeld, achter de schermen, reeksen.',
      avoid: 'Dansjes, trends zonder link met de zaak.',
      learnings: '2 ideeën afgekeurd als “te gescript”.',
      updated_at: daysAgo(3),
    },
  ]

  const activities: Activity[] = [
    {
      id: id(),
      client_id: wasbar.id,
      kind: 'ai',
      title: 'IKR AI maakte 5 ideeën',
      body: null,
      created_by: 'IKR AI',
      created_at: daysAgo(3),
    },
    {
      id: id(),
      client_id: wasbar.id,
      kind: 'system',
      title: 'Fase → Draaidag gepland',
      body: null,
      created_by: 'cedric',
      created_at: daysAgo(2),
    },
    {
      id: id(),
      client_id: wasbar.id,
      kind: 'note',
      title: 'Call met Charlotte',
      body: 'Ze willen meer de koffiebar in beeld. Draaidag op woensdag past.',
      created_by: 'cedric',
      created_at: daysAgo(4),
    },
    {
      id: id(),
      client_id: lead1.id,
      kind: 'system',
      title: 'Nieuwe lead via contactformulier',
      body: null,
      created_by: 'website',
      created_at: daysAgo(2),
    },
  ]

  const idea = (
    c: Client,
    title: string,
    summary: string,
    status: ContentIdea['status'],
    extra: Partial<ContentIdea> = {},
  ): ContentIdea => ({
    id: id(),
    client_id: c.id,
    title,
    summary,
    format: null,
    status,
    source: 'ai',
    hook: null,
    structure: [],
    shots: [],
    needs: [],
    cta: null,
    feedback: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
    ...extra,
  })

  const ideas: ContentIdea[] = [
    idea(
      wasbar,
      'Gevonden in de wasmachine',
      'Wekelijkse reeks met de gekste dingen die klanten in hun zakken vergeten.',
      'developed',
      {
        format: 'Reeks · 4 afleveringen',
        hook: 'Dit vonden we deze maand allemaal in onze machines.',
        structure: [
          'Close-up: trommel gaat open',
          'Snelle cuts van 5 vondsten, tekst-overlay',
          'Laatste vondst = plot twist',
          'Barista: “Is dit van jou? Kom het halen.”',
        ],
        shots: [
          'Trommel close-up (macro)',
          'Handen leggen vondsten op de toog',
          'Reactie barista, medium shot',
        ],
        needs: ['5 “vondsten” als props'],
        cta: 'Tag iemand die altijd iets vergeet in z’n zakken.',
      },
    ),
    idea(
      wasbar,
      'Was vs. cappuccino',
      'Split-screen: wat doe je allemaal terwijl je was draait?',
      'approved',
    ),
    idea(
      wasbar,
      'Mythbusters: moet je echt op 60° wassen?',
      'Medewerker ontkracht 3 wasmythes in 30 seconden.',
      'developed',
      {
        hook: 'Op 60° wassen? Bijna nooit nodig.',
        structure: [
          'Mythe 1 met tekst-overlay',
          'Snelle uitleg medewerker',
          'Mythe 2 en 3 in hetzelfde ritme',
        ],
        shots: ['Medewerker aan de machines', 'Close-up draaiknop'],
        needs: [],
        cta: 'Welke mythe moeten we nog checken?',
      },
    ),
    idea(
      wasbar,
      'POV: je eerste date in een wassalon',
      'Sketch met twee klanten, eindigt aan de bar.',
      'proposal',
    ),
    idea(
      wasbar,
      'Vouw-challenge: barista vs. klant',
      'Wie vouwt het snelst een hoeslaken? Terugkerend format.',
      'proposal',
    ),
    idea(chez, '[Voorbeeldidee 1]', 'Door IKR AI voorgesteld — wacht op selectie.', 'proposal'),
    idea(chez, '[Voorbeeldidee 2]', 'Door IKR AI voorgesteld — wacht op selectie.', 'proposal'),
  ]

  const events: CalendarEvent[] = [
    {
      id: id(),
      client_id: lilalou.id,
      kind: 'sales_call',
      title: 'Sales call · Lilalou (verlenging)',
      starts_at: at(0, 14),
      ends_at: at(0, 14, 45),
      location: 'Google Meet',
      attendees: ['casper'],
      notes: null,
      brief: null,
      google_event_id: null,
    },
    {
      id: id(),
      client_id: tempus.id,
      kind: 'shoot',
      title: 'Draaidag · Tempus',
      starts_at: at(1, 8, 30),
      ends_at: at(1, 16),
      location: null,
      attendees: ['casper', 'cedric'],
      notes: '4 video’s',
      brief: null,
      google_event_id: null,
    },
    {
      id: id(),
      client_id: wasbar.id,
      kind: 'meeting',
      title: 'Ideeën-review · Wasbar',
      starts_at: at(2, 11),
      ends_at: at(2, 12),
      location: 'Bij de klant',
      attendees: ['cedric'],
      notes: null,
      brief: null,
      google_event_id: null,
    },
    {
      id: id(),
      client_id: maison.id,
      kind: 'shoot',
      title: 'Draaidag · Maison Slash',
      starts_at: at(3, 9),
      ends_at: at(3, 13),
      location: null,
      attendees: ['cedric'],
      notes: null,
      brief: {
        schedule: [
          { time: '09:00', what: 'Opbouw licht + set' },
          { time: '09:45', what: 'Video 1' },
        ],
        shotlist: ['[voorbeeld]'],
        checklist: ['Batterijen geladen'],
      },
      google_event_id: null,
    },
    {
      id: id(),
      client_id: lead3.id,
      kind: 'sales_call',
      title: 'Sales call · Voorbeeld-lead: Restaurant',
      starts_at: at(4, 15),
      ends_at: at(4, 15, 45),
      location: null,
      attendees: ['casper'],
      notes: null,
      brief: null,
      google_event_id: null,
    },
  ]

  const knowledge: KnowledgeDoc[] = [
    [
      'wie-we-zijn',
      'Wie we zijn',
      'IKnowRight (IKR) is een TikTok-bureau voor food brands in Vlaanderen. We bedenken, filmen en monteren TikTok-content voor merken, en volgen de resultaten op.\n\n[Vul aan: team, sinds wanneer, waar jullie gevestigd zijn.]',
    ],
    [
      'aanpak',
      'Onze aanpak',
      'Analyse → Creatie → Iteratie.\n- Analyse: merk, doelgroep en wat al werkt op TikTok.\n- Creatie: ideeën, draaidag, montage.\n- Iteratie: resultaten opvolgen en bijsturen op basis van wat werkt.',
    ],
    [
      'tone-of-voice',
      'Tone of voice',
      '[Hoe klinkt IKR? Hoe schrijven we hooks en captions? Wat doen we nooit?]',
    ],
    [
      'wat-werkt',
      'Wat werkt op TikTok',
      '[Jullie lessen: sterke hooks, formats die scoren, ideale lengte, reeksen, mensen in beeld, …]',
    ],
    [
      'pakketten',
      'Pakketten & prijzen',
      '[Pakketten, aantallen video’s per maand, prijsrichtlijnen.]',
    ],
  ].map(([slug, title, body], i) => ({
    id: id(),
    slug,
    title,
    body,
    sort_order: (i + 1) * 10,
    updated_by: null,
    updated_at: daysAgo(10),
  }))

  const videos: Video[] = []
  const stats: VideoStatsSnapshot[] = []
  const titles = [
    'Gevonden in de wasmachine #1',
    'Gevonden in de wasmachine #2',
    '[titel video]',
    '[titel video]',
    '[titel video]',
  ]
  let n = 1
  for (const c of [wasbar, tempus, maison, ohma, chez, lilalou]) {
    for (let v = 0; v < 5; v++) {
      const published = addDays(now, -Math.floor(seeded(n) * 50) - 3)
      const video: Video = {
        id: id(),
        client_id: c.id,
        tiktok_video_id: null,
        title: c === wasbar ? titles[v] : '[titel video]',
        cover_url: null,
        share_url: null,
        published_at: published.toISOString(),
      }
      videos.push(video)
      const final = Math.round(20_000 + seeded(n + 7) ** 2 * 450_000)
      for (let w = 8; w >= 0; w--) {
        const capturedAt = addDays(now, -w * 7)
        if (capturedAt < published) continue
        const age = (capturedAt.getTime() - published.getTime()) / 86_400_000
        const views = Math.round(final * Math.min(1, 0.35 + age / 30))
        stats.push({
          video_id: video.id,
          captured_at: capturedAt.toISOString(),
          views,
          likes: Math.round(views * 0.055),
          comments: Math.round(views * 0.004),
          shares: Math.round(views * 0.006),
        })
      }
      n++
    }
  }

  void today
  return {
    clients,
    contacts,
    activities,
    profiles,
    contracts,
    invoices,
    events,
    ideas,
    templates: [
      {
        id: id(),
        name: 'Content-voorstel v3',
        kind: 'deck',
        description: 'Ideeën voorstellen aan een klant',
        storage_path: null,
        anthropic_file_id: null,
      },
      {
        id: id(),
        name: 'Maandrapport',
        kind: 'deck',
        description: 'Resultaten van de maand',
        storage_path: null,
        anthropic_file_id: null,
      },
    ],
    decks: [],
    knowledge,
    videos,
    stats,
    // Voorbeeld-oproepen zodat het kostenoverzicht in demomodus iets toont.
    aiRuns: (
      [
        ['daily_briefing', null, 'claude-sonnet-5-5', 1, 1800, 900, 6200, 0],
        ['generate_ideas', wasbar.id, 'claude-opus-5-5', 1, 3200, 5400, 6200, 0],
        ['develop_idea', wasbar.id, 'claude-opus-5-5', 1, 2100, 2600, 6200, 0],
        ['draft_email', tempus.id, 'claude-sonnet-5-5', 2, 1500, 700, 6200, 0],
        ['ask', null, 'claude-sonnet-5-5', 3, 2400, 600, 0, 6200],
        ['shoot_brief', maison.id, 'claude-sonnet-5-5', 5, 2600, 1900, 6200, 0],
        ['summarize_client', tempus.id, 'claude-sonnet-5-5', 8, 2200, 800, 6200, 0],
      ] as const
    ).map(([task, client_id, model, ago, inp, out, read, write]) => ({
      id: id(),
      task,
      client_id,
      model,
      status: 'ok' as const,
      input_tokens: inp,
      output_tokens: out,
      cache_read_tokens: read,
      cache_write_tokens: write,
      output: null,
      error: null,
      created_by: 'demo@iknowright.be',
      created_at: daysAgo(ago),
    })),
  }
}

function store(): Store {
  if (!g.__ikrDemoStore) g.__ikrDemoStore = seed()
  return g.__ikrDemoStore
}

export function createDemoRepo(): AdminRepo {
  const s = store()
  return {
    async listClients() {
      return [...s.clients].sort((a, b) => a.name.localeCompare(b.name))
    },
    async getClient(cid) {
      return s.clients.find((c) => c.id === cid) ?? null
    },
    async createClient(input) {
      const now = new Date().toISOString()
      const c: Client = {
        id: id(),
        slug: null,
        stage: 'lead',
        stage_changed_at: now,
        owner: null,
        source: null,
        sector: null,
        website: null,
        tiktok_handle: null,
        drive_folder_url: null,
        logo_url: null,
        vat_number: null,
        billing_email: null,
        summary: null,
        created_at: now,
        updated_at: now,
        ...input,
      }
      s.clients.push(c)
      return c
    },
    async updateClient(cid, patch) {
      const c = s.clients.find((x) => x.id === cid)
      if (c) Object.assign(c, patch, { updated_at: new Date().toISOString() })
    },
    async moveStage(cid, stage) {
      const c = s.clients.find((x) => x.id === cid)
      if (c && c.stage !== stage)
        Object.assign(c, { stage, stage_changed_at: new Date().toISOString() })
    },

    async listContacts(cid) {
      return s.contacts.filter((c) => c.client_id === cid)
    },
    async addContact(input) {
      s.contacts.push({ ...input, id: id() })
    },

    async listActivities({ clientId, limit = 50 }) {
      return s.activities
        .filter((a) => !clientId || a.client_id === clientId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
    },
    async addActivity(input) {
      s.activities.push({
        id: id(),
        title: null,
        body: null,
        created_by: null,
        created_at: new Date().toISOString(),
        ...input,
      })
    },

    async getProfile(cid) {
      return s.profiles.find((p) => p.client_id === cid) ?? null
    },
    async upsertProfile(cid, patch) {
      const existing = s.profiles.find((p) => p.client_id === cid)
      const updated_at = new Date().toISOString()
      if (existing) Object.assign(existing, patch, { updated_at })
      else
        s.profiles.push({
          client_id: cid,
          brand_summary: null,
          tone_of_voice: null,
          target_audience: null,
          what_works: null,
          avoid: null,
          learnings: null,
          updated_at,
          ...patch,
        })
    },

    async listContracts(cid) {
      return s.contracts.filter((c) => !cid || c.client_id === cid)
    },
    async saveContract(input) {
      const existing = input.id ? s.contracts.find((c) => c.id === input.id) : null
      if (existing) Object.assign(existing, input)
      else s.contracts.push({ ...input, id: id() })
    },

    async listInvoices(opts = {}) {
      return s.invoices
        .filter(
          (i) =>
            (!opts.clientId || i.client_id === opts.clientId) &&
            (!opts.statuses || opts.statuses.includes(i.status)),
        )
        .sort((a, b) => b.send_date.localeCompare(a.send_date))
    },
    async createInvoice(input) {
      if (
        s.invoices.some(
          (i) => i.contract_id === input.contract_id && i.send_date === input.send_date,
        )
      )
        return
      s.invoices.push({ ...input, id: id(), billit_invoice_id: null, sent_at: null, paid_at: null })
    },
    async updateInvoice(iid, patch) {
      const inv = s.invoices.find((i) => i.id === iid)
      if (inv) Object.assign(inv, patch)
    },

    async listEvents(fromIso, toIso) {
      return s.events
        .filter((e) => e.starts_at >= fromIso && e.starts_at < toIso)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    },
    async getEvent(eid) {
      return s.events.find((e) => e.id === eid) ?? null
    },
    async createEvent(input) {
      const e: CalendarEvent = { brief: null, google_event_id: null, ...input, id: id() }
      s.events.push(e)
      return e
    },
    async updateEvent(eid, patch) {
      const e = s.events.find((x) => x.id === eid)
      if (e) Object.assign(e, patch)
    },
    async deleteEvent(eid) {
      s.events = s.events.filter((e) => e.id !== eid)
    },

    async listIdeas(cid) {
      return s.ideas
        .filter((i) => i.client_id === cid)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
    async getIdea(iid) {
      return s.ideas.find((i) => i.id === iid) ?? null
    },
    async insertIdeas(cid, list) {
      const now = new Date().toISOString()
      for (const i of list) {
        s.ideas.push({
          id: id(),
          client_id: cid,
          summary: null,
          format: null,
          status: 'proposal',
          source: 'ai',
          hook: null,
          structure: [],
          shots: [],
          needs: [],
          cta: null,
          feedback: null,
          created_at: now,
          updated_at: now,
          ...i,
        })
      }
    },
    async updateIdea(iid, patch) {
      const i = s.ideas.find((x) => x.id === iid)
      if (i) Object.assign(i, patch, { updated_at: new Date().toISOString() })
    },

    async listTemplates() {
      return s.templates
    },
    async listDecks(cid) {
      return s.decks.filter((d) => d.client_id === cid)
    },
    async createDeck(input) {
      const d: Deck = {
        ...input,
        id: id(),
        status: 'queued',
        storage_path: null,
        error: null,
        created_at: new Date().toISOString(),
      }
      s.decks.unshift(d)
      return d
    },
    async updateDeck(did, patch) {
      const d = s.decks.find((x) => x.id === did)
      if (d) Object.assign(d, patch)
    },

    async listKnowledge() {
      return [...s.knowledge].sort((a, b) => a.sort_order - b.sort_order)
    },
    async saveKnowledge(doc) {
      const existing = s.knowledge.find((k) => k.slug === doc.slug)
      const updated_at = new Date().toISOString()
      if (existing) Object.assign(existing, doc, { updated_at })
      else
        s.knowledge.push({
          id: id(),
          sort_order: (s.knowledge.length + 1) * 10,
          updated_by: null,
          ...doc,
          updated_at,
        })
    },

    async listVideosWithStats(opts = {}): Promise<VideoWithStats[]> {
      return s.videos
        .filter((v) => !opts.clientId || v.client_id === opts.clientId)
        .map((v) => ({
          ...v,
          client_name: s.clients.find((c) => c.id === v.client_id)?.name ?? '',
          stats: s.stats.filter(
            (st) => st.video_id === v.id && (!opts.sinceIso || st.captured_at >= opts.sinceIso),
          ),
        }))
    },

    async latestAiRun(task, opts = {}) {
      return (
        s.aiRuns
          .filter(
            (r) =>
              r.task === task &&
              r.status === 'ok' &&
              (!opts.sinceIso || r.created_at >= opts.sinceIso) &&
              (!opts.clientId || r.client_id === opts.clientId),
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
      )
    },
    async logAiRun(run) {
      s.aiRuns.push({
        id: id(),
        created_at: new Date().toISOString(),
        task: run.task,
        client_id: run.client_id,
        model: run.model,
        status: run.status,
        input_tokens: run.input_tokens ?? null,
        output_tokens: run.output_tokens ?? null,
        cache_read_tokens: run.cache_read_tokens ?? null,
        cache_write_tokens: run.cache_write_tokens ?? null,
        output: run.output,
        error: run.error,
        created_by: run.created_by,
      })
    },
    async listAiRuns(sinceIso) {
      return s.aiRuns
        .filter((r) => r.created_at >= sinceIso)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  }
}
