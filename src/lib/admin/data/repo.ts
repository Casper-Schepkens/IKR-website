import type {
  Activity,
  ActivityKind,
  AiRun,
  CalendarEvent,
  Client,
  ClientProfile,
  Contact,
  ContentIdea,
  Contract,
  Deck,
  Invoice,
  InvoiceStatus,
  KnowledgeDoc,
  Stage,
  Template,
  Video,
  VideoStatsSnapshot,
} from '../types'

export type NewClient = Pick<Client, 'name'> &
  Partial<
    Pick<Client, 'stage' | 'owner' | 'source' | 'sector' | 'website' | 'tiktok_handle' | 'summary'>
  >

export type ClientPatch = Partial<
  Pick<
    Client,
    | 'name'
    | 'owner'
    | 'source'
    | 'sector'
    | 'website'
    | 'tiktok_handle'
    | 'drive_folder_url'
    | 'logo_url'
    | 'vat_number'
    | 'billing_email'
    | 'summary'
  >
>

export type NewActivity = {
  client_id: string | null
  kind: ActivityKind
  title?: string | null
  body?: string | null
  created_by?: string | null
}

export type NewIdea = Pick<ContentIdea, 'title'> &
  Partial<
    Pick<
      ContentIdea,
      'summary' | 'format' | 'status' | 'source' | 'hook' | 'structure' | 'shots' | 'needs' | 'cta'
    >
  >

export type IdeaPatch = Partial<
  Pick<
    ContentIdea,
    | 'title'
    | 'summary'
    | 'format'
    | 'status'
    | 'hook'
    | 'structure'
    | 'shots'
    | 'needs'
    | 'cta'
    | 'feedback'
    | 'dev_status'
    | 'dev_provider'
    | 'dev_requested_at'
  >
>

export type NewEvent = Omit<CalendarEvent, 'id' | 'brief' | 'google_event_id'> & {
  brief?: CalendarEvent['brief']
}

export type ContractInput = Omit<Contract, 'id'> & { id?: string }

export type VideoWithStats = Video & { client_name: string; stats: VideoStatsSnapshot[] }

type TokenFields = 'input_tokens' | 'output_tokens' | 'cache_read_tokens' | 'cache_write_tokens'
export type NewAiRun = Omit<AiRun, 'id' | 'created_at' | TokenFields> & Partial<Pick<AiRun, TokenFields>>

/** Alles wat /admin met data doet loopt via deze interface (Supabase in productie, geheugen in demomodus). */
export interface AdminRepo {
  listClients(): Promise<Client[]>
  getClient(id: string): Promise<Client | null>
  createClient(input: NewClient): Promise<Client>
  updateClient(id: string, patch: ClientPatch): Promise<void>
  moveStage(id: string, stage: Stage, by: string): Promise<void>

  listContacts(clientId: string): Promise<Contact[]>
  addContact(input: Omit<Contact, 'id'>): Promise<void>

  listActivities(opts: { clientId?: string; limit?: number }): Promise<Activity[]>
  addActivity(input: NewActivity): Promise<void>

  getProfile(clientId: string): Promise<ClientProfile | null>
  upsertProfile(
    clientId: string,
    patch: Partial<Omit<ClientProfile, 'client_id' | 'updated_at'>>,
  ): Promise<void>

  listContracts(clientId?: string): Promise<Contract[]>
  saveContract(input: ContractInput): Promise<void>

  listInvoices(opts?: { clientId?: string; statuses?: InvoiceStatus[] }): Promise<Invoice[]>
  createInvoice(
    input: Omit<Invoice, 'id' | 'billit_invoice_id' | 'sent_at' | 'paid_at'>,
  ): Promise<void>
  updateInvoice(
    id: string,
    patch: Partial<Pick<Invoice, 'status' | 'billit_invoice_id' | 'sent_at' | 'paid_at'>>,
  ): Promise<void>

  listEvents(fromIso: string, toIso: string): Promise<CalendarEvent[]>
  getEvent(id: string): Promise<CalendarEvent | null>
  createEvent(input: NewEvent): Promise<CalendarEvent>
  updateEvent(id: string, patch: Partial<Omit<CalendarEvent, 'id'>>): Promise<void>
  deleteEvent(id: string): Promise<void>

  listIdeas(clientId: string): Promise<ContentIdea[]>
  getIdea(id: string): Promise<ContentIdea | null>
  insertIdeas(clientId: string, ideas: NewIdea[]): Promise<void>
  updateIdea(id: string, patch: IdeaPatch): Promise<void>

  listTemplates(): Promise<Template[]>
  listDecks(clientId: string): Promise<Deck[]>
  createDeck(input: Pick<Deck, 'client_id' | 'template_id' | 'title' | 'idea_ids'>): Promise<Deck>
  updateDeck(
    id: string,
    patch: Partial<Pick<Deck, 'status' | 'storage_path' | 'error'>>,
  ): Promise<void>

  listKnowledge(): Promise<KnowledgeDoc[]>
  saveKnowledge(doc: {
    id?: string
    slug: string
    title: string
    body: string
    sort_order?: number
    updated_by?: string
  }): Promise<void>

  listVideosWithStats(opts?: { clientId?: string; sinceIso?: string }): Promise<VideoWithStats[]>

  latestAiRun(task: string, opts?: { sinceIso?: string; clientId?: string }): Promise<AiRun | null>
  logAiRun(run: NewAiRun): Promise<void>
  /** Alle runs sinds een datum, zonder output (voor het kostenoverzicht). */
  listAiRuns(sinceIso: string): Promise<AiRun[]>
}
