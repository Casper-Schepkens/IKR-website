/** Funnelfases van een lead. Fase 0 (contact in Apollo) en 1 (reactie) zijn nog geen leads. */
export const STAGES = [
  'lead',
  'setter_planned',
  'setter_done',
  'sales_planned',
  'sales_done',
  'next_steps',
  'won',
  'lost',
] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  setter_planned: 'Setter call gepland',
  setter_done: 'Setter call gehouden',
  sales_planned: 'Sales call gepland',
  sales_done: 'Sales call gehouden',
  next_steps: 'Next steps verstuurd',
  won: 'Gewonnen',
  lost: 'Lost',
}

/** Fases waarin een lead nog loopt. */
export const OPEN_STAGES: Stage[] = STAGES.filter((s) => s !== 'won' && s !== 'lost')

export const SOURCES = ['cold_mail', 'website', 'event', 'linkedin', 'referral', 'other'] as const
export type Source = (typeof SOURCES)[number]
export const SOURCE_LABELS: Record<Source, string> = {
  cold_mail: 'Cold mail',
  website: 'Website',
  event: 'Event',
  linkedin: 'LinkedIn',
  referral: 'Doorverwezen',
  other: 'Andere',
}

export const LOST_REASONS = ['no_reply', 'not_interested', 'not_for_me'] as const
export type LostReason = (typeof LOST_REASONS)[number]
export const LOST_REASON_LABELS: Record<LostReason, string> = {
  no_reply: 'Geen reactie na alle follow-ups',
  not_interested: 'Niet geïnteresseerd',
  not_for_me: 'Na een call: "dit is niets voor mij"',
}

export type Lead = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  source: Source
  stage: Stage
  lost_reason: LostReason | null
  lost_note: string | null
  next_action: string | null
  /** 'YYYY-MM-DD' */
  follow_up_on: string | null
  notes: string | null
  /** Teamlid dat de lead opvolgt (e-mail); gezet bij een boeking via /boek. */
  owner?: string | null
  stage_changed_at: string
  created_at: string
  updated_at: string
}

export type LeadInput = Pick<Lead, 'name' | 'company' | 'email' | 'phone' | 'source'> &
  Partial<Pick<Lead, 'next_action' | 'follow_up_on' | 'notes'>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const blank = (v: string | null | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Eén controle voor een nieuwe of aangepaste lead, voor het dashboard en voor Grok Bot (MCP): zelfde
 * regels voor naam, e-mail, datum en bron. `defaultSource` verschilt: het formulier kiest 'other',
 * Grok Bot 'cold_mail' (die maakt leads vooral uit antwoorden op cold mails).
 */
export function cleanLeadInput(
  raw: { name?: string | null; company?: string | null; email?: string | null; phone?: string | null; source?: string | null; next_action?: string | null; follow_up_on?: string | null; notes?: string | null },
  defaultSource: Source,
): LeadInput {
  const name = blank(raw.name)
  if (!name) throw new Error('Naam is verplicht.')
  if (name.length > 200) throw new Error('Naam is te lang (max 200 tekens).')
  const email = blank(raw.email)?.toLowerCase() ?? null
  if (email && !EMAIL.test(email)) throw new Error(`Dat e-mailadres klopt niet: "${email}".`)
  const follow = blank(raw.follow_up_on)
  if (follow && (!/^\d{4}-\d{2}-\d{2}$/.test(follow) || Number.isNaN(Date.parse(`${follow}T00:00:00Z`)))) throw new Error('Opvolgdatum: gebruik YYYY-MM-DD.')
  const source = raw.source && (SOURCES as readonly string[]).includes(raw.source) ? (raw.source as Source) : defaultSource
  return {
    name,
    company: blank(raw.company),
    email,
    phone: blank(raw.phone),
    source,
    ...(raw.next_action !== undefined ? { next_action: blank(raw.next_action) } : {}),
    ...(raw.follow_up_on !== undefined ? { follow_up_on: follow } : {}),
    ...(raw.notes !== undefined ? { notes: blank(raw.notes) } : {}),
  }
}
