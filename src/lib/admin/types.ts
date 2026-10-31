/** Domeintypes voor /admin — spiegelen de tabellen in supabase/migrations. */

export const STAGES = [
  'lead',
  'sales_call',
  'ideas',
  'proposal',
  'signed',
  'shoot_planned',
  'editing',
  'live',
  'churned',
] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  sales_call: 'Sales call',
  ideas: 'Content-ideeën',
  proposal: 'Voorstel / deck',
  signed: 'Getekend',
  shoot_planned: 'Draaidag gepland',
  editing: 'Montage',
  live: 'Live · rapportage',
  churned: 'Gestopt',
}

/** Fases die als kolom op het kanbanbord staan (gestopt zit in een filter). */
export const BOARD_STAGES: Stage[] = STAGES.filter((s) => s !== 'churned')

export type Client = {
  id: string
  name: string
  slug: string | null
  stage: Stage
  stage_changed_at: string
  owner: string | null
  source: string | null
  sector: string | null
  website: string | null
  tiktok_handle: string | null
  drive_folder_url: string | null
  /** Externe https-URL, of pad in de privé bucket 'logos'. */
  logo_url: string | null
  vat_number: string | null
  billing_email: string | null
  summary: string | null
  created_at: string
  updated_at: string
}

export type Contact = {
  id: string
  client_id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
}

export type ActivityKind = 'note' | 'call' | 'email' | 'system' | 'ai'
export type Activity = {
  id: string
  client_id: string | null
  kind: ActivityKind
  title: string | null
  body: string | null
  created_by: string | null
  created_at: string
}

export type ClientProfile = {
  client_id: string
  brand_summary: string | null
  tone_of_voice: string | null
  target_audience: string | null
  what_works: string | null
  avoid: string | null
  learnings: string | null
  updated_at: string
}

export type BillingCycle = 'monthly' | 'quarterly' | 'one_off'
export type Contract = {
  id: string
  client_id: string
  package_name: string | null
  videos_per_month: number | null
  monthly_amount_cents: number
  billing_cycle: BillingCycle
  billing_day: number
  start_date: string
  end_date: string | null
  renewal_notice_days: number
  status: 'draft' | 'active' | 'ended'
  billit_customer_id: string | null
  notes: string | null
}

export type InvoiceStatus = 'to_send' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type Invoice = {
  id: string
  client_id: string
  contract_id: string | null
  label: string | null
  send_date: string
  amount_cents: number
  status: InvoiceStatus
  billit_invoice_id: string | null
  sent_at: string | null
  paid_at: string | null
}

export type EventKind = 'shoot' | 'sales_call' | 'meeting' | 'deadline' | 'other'
export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  shoot: 'Draaidag',
  sales_call: 'Sales call',
  meeting: 'Klantmeeting',
  deadline: 'Deadline',
  other: 'Andere',
}

export type ShootBrief = {
  schedule: { time: string; what: string }[]
  shotlist: string[]
  checklist: string[]
  notes?: string
}

export type CalendarEvent = {
  id: string
  client_id: string | null
  kind: EventKind
  title: string
  starts_at: string
  ends_at: string | null
  location: string | null
  attendees: string[]
  notes: string | null
  brief: ShootBrief | null
  google_event_id: string | null
}

export type IdeaStatus = 'proposal' | 'developed' | 'approved' | 'rejected' | 'produced'
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  proposal: 'Voorstel',
  developed: 'Uitgewerkt',
  approved: 'Goedgekeurd',
  rejected: 'Afgekeurd',
  produced: 'Gemaakt',
}

export type ContentIdea = {
  id: string
  client_id: string
  title: string
  summary: string | null
  format: string | null
  status: IdeaStatus
  source: 'ai' | 'manual' | 'grok'
  hook: string | null
  structure: string[]
  shots: string[]
  needs: string[]
  cta: string | null
  feedback: string | null
  /** Externe uitwerking (bv. Grok-bot): 'requested' terwijl het bezig is. */
  dev_status?: 'requested' | 'failed' | null
  dev_provider?: string | null
  dev_requested_at?: string | null
  created_at: string
  updated_at: string
}

export type Template = {
  id: string
  name: string
  kind: string
  description: string | null
  storage_path: string | null
  anthropic_file_id: string | null
}

export type Deck = {
  id: string
  client_id: string
  template_id: string | null
  title: string
  idea_ids: string[]
  status: 'queued' | 'generating' | 'ready' | 'failed'
  storage_path: string | null
  error: string | null
  created_at: string
}

export type Video = {
  id: string
  client_id: string
  tiktok_video_id: string | null
  title: string | null
  cover_url: string | null
  share_url: string | null
  published_at: string | null
}

export type VideoStatsSnapshot = {
  video_id: string
  captured_at: string
  views: number
  likes: number
  comments: number
  shares: number
}

export type KnowledgeDoc = {
  id: string
  slug: string
  title: string
  body: string
  sort_order: number
  updated_by: string | null
  updated_at: string
}

export type AiRun = {
  id: string
  task: string
  client_id: string | null
  model: string | null
  status: 'ok' | 'error'
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  output: unknown
  error: string | null
  created_by: string | null
  created_at: string
}

export type AdminUser = {
  email: string
  name: string
}

/** Leads: nog niet getekend. Klanten: getekend en in productie. */
export const LEAD_STAGES: Stage[] = ['lead', 'sales_call', 'ideas', 'proposal']
export const CLIENT_STAGES: Stage[] = ['signed', 'shoot_planned', 'editing', 'live']
