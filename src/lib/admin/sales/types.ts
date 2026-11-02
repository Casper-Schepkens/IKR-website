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
  stage_changed_at: string
  created_at: string
  updated_at: string
}

export type LeadInput = Pick<Lead, 'name' | 'company' | 'email' | 'phone' | 'source'>
