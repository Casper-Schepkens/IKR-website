import { STAGES, type Stage } from '../sales/types'

/** Calls (sales). Setter = kort telefoongesprek (opname via Record), sales = Google Meet (+ Fireflies, ppt). */

export const CALL_KINDS = ['setter', 'sales'] as const
export type CallKind = (typeof CALL_KINDS)[number]
export const CALL_KIND_LABELS: Record<CallKind, string> = { setter: 'Setter call', sales: 'Sales call' }
/** Standaardduur in minuten (aanpasbaar bij het inplannen). */
export const CALL_MINUTES: Record<CallKind, number> = { setter: 15, sales: 60 }

export const CALL_STATUSES = ['gepland', 'afgerond', 'no_show', 'geannuleerd'] as const
export type CallStatus = (typeof CALL_STATUSES)[number]
export const CALL_STATUS_LABELS: Record<CallStatus, string> = { gepland: 'Gepland', afgerond: 'Afgerond', no_show: 'Kwam niet opdagen', geannuleerd: 'Geannuleerd' }

/** Analyse van een call door Grok Bot (generiek tot er een script is). */
export type CallAnalysis = { samenvatting: string; goed: string[]; beter: string[]; score: number | null; tips: string[] }

/** De sales-ppt (Google Slides, "iedereen met de link kan bekijken"). */
/** Standaard sales-ppt; per call te vervangen (call.sales_ppt_url). */
export const SALES_PPT_URL = 'https://docs.google.com/presentation/d/1iQxatKi2QdE2FopGM4fx9z2erTqKRqSg/edit?usp=sharing'
/** De sales-ppt van een call: eigen link of de standaard. */
export const salesPptUrl = (c: Pick<Call, 'sales_ppt_url'>) => c.sales_ppt_url || SALES_PPT_URL
/** Eigen sales-ppt: enkel https; leeg = terug naar de standaard (null). */
export function cleanPptUrl(v: string | null | undefined): string | null {
  const t = v?.trim() || ''
  if (!t) return null
  if (!/^https:\/\/[^\s]+$/i.test(t)) throw new Error('De ppt-link moet met https:// beginnen.')
  return t.slice(0, 2000)
}

export type Call = {
  id: string
  lead_id: string
  kind: CallKind
  starts_at: string
  ends_at: string
  status: CallStatus
  meet_url: string | null
  calendar_event_id: string | null
  calendar_error: string | null
  invited: boolean
  recording_url: string | null
  started_at: string | null
  fireflies_added_at: string | null
  finished_at: string | null
  note: string | null
  thank_you_draft_id?: string | null
  fireflies_id?: string | null
  transcript_url?: string | null
  transcript_received_at?: string | null
  analysis?: CallAnalysis | null
  recording_file_id?: string | null
  recording_public_permission?: string | null
  /** Eigen sales-ppt voor deze call; leeg = SALES_PPT_URL (standaard). */
  sales_ppt_url?: string | null
  created_by: string | null
  /** agenda = gevonden in de contact-agenda (zelf ingepland). */
  created_via: 'dashboard' | 'inbox' | 'grokbot' | 'agenda'
  created_at: string
  updated_at: string
}
export type NewCall = Pick<Call, 'lead_id' | 'kind' | 'starts_at' | 'ends_at' | 'meet_url' | 'created_by' | 'created_via'> & Partial<Pick<Call, 'note' | 'calendar_event_id' | 'invited'>>
export type CallPatch = Partial<
  Pick<Call, 'thank_you_draft_id' | 'fireflies_id' | 'transcript_url' | 'transcript_received_at' | 'analysis' | 'recording_file_id' | 'recording_public_permission' | 'sales_ppt_url' | 'starts_at' | 'ends_at' | 'kind' | 'status' | 'meet_url' | 'calendar_event_id' | 'calendar_error' | 'invited' | 'recording_url' | 'started_at' | 'fireflies_added_at' | 'finished_at' | 'note'>
>

/** Fase van de lead na inplannen / afronden (enkel vooruit; zie forwardStage). */
export const STAGE_AFTER: Record<'gepland' | 'afgerond', Record<CallKind, Stage>> = {
  gepland: { setter: 'setter_planned', sales: 'sales_planned' },
  afgerond: { setter: 'setter_done', sales: 'sales_done' },
}
/** Nieuwe fase als die verder ligt dan de huidige (nooit terug, nooit uit won/lost). */
export function forwardStage(current: Stage, next: Stage): Stage | null {
  if (current === 'won' || current === 'lost') return null
  return STAGES.indexOf(next) > STAGES.indexOf(current) ? next : null
}

/** Open calls eerst (vroegste bovenaan), dan de rest (nieuwste eerst). */
export const sortCalls = (list: Call[]) =>
  [...list].sort((a, b) =>
    a.status === 'gepland' && b.status !== 'gepland'
      ? -1
      : b.status === 'gepland' && a.status !== 'gepland'
        ? 1
        : a.status === 'gepland'
          ? a.starts_at.localeCompare(b.starts_at)
          : b.starts_at.localeCompare(a.starts_at),
  )

export type CallStats = Record<CallKind, { gepland: number; afgerond: number; no_show: number; geannuleerd: number; no_show_pct: number | null }> & {
  /** Leads met een afgeronde setter call in de periode, en hoeveel daarvan (ooit) een sales call kregen. */
  setter_naar_sales: { setter_afgerond: number; met_sales_call: number; pct: number | null }
}

/** Cijfers over calls die starten in [van, tot] (ISO-datums, tot inclusief). Enkel opgeslagen/opvraagbaar, niet getoond. */
export function callStats(all: Call[], van?: string, tot?: string): CallStats {
  const inRange = all.filter((c) => (!van || c.starts_at.slice(0, 10) >= van) && (!tot || c.starts_at.slice(0, 10) <= tot))
  const per = (kind: CallKind) => {
    const k = inRange.filter((c) => c.kind === kind)
    const count = (s: CallStatus) => k.filter((c) => c.status === s).length
    const held = count('afgerond')
    const noShow = count('no_show')
    return { gepland: count('gepland'), afgerond: held, no_show: noShow, geannuleerd: count('geannuleerd'), no_show_pct: held + noShow ? Math.round((noShow / (held + noShow)) * 100) : null }
  }
  const setterLeads = new Set(inRange.filter((c) => c.kind === 'setter' && c.status === 'afgerond').map((c) => c.lead_id))
  const salesLeads = new Set(all.filter((c) => c.kind === 'sales' && c.status !== 'geannuleerd').map((c) => c.lead_id))
  const withSales = [...setterLeads].filter((l) => salesLeads.has(l)).length
  return {
    setter: per('setter'),
    sales: per('sales'),
    setter_naar_sales: { setter_afgerond: setterLeads.size, met_sales_call: withSales, pct: setterLeads.size ? Math.round((withSales / setterLeads.size) * 100) : null },
  }
}

/**
 * Zet de regel met de Meet-link in de mail: net boven de afsluitgroet als die er is, anders onderaan.
 * Staat de link er al in, dan verandert er niets.
 */
export function insertMeetLink(body: string, meetUrl: string, when: string) {
  if (body.includes(meetUrl)) return body
  const line = `Hier is de link voor onze call (${when}): ${meetUrl}`
  const m = body.match(/\n\s*\n((?:groetjes|groeten|vriendelijke groet|met vriendelijke groet|mvg|tot dan|tot snel|tot binnenkort|beste groeten|warme groet)[^\n]*(?:\n[^\n]*)?)\s*$/i)
  if (m && m.index !== undefined) return `${body.slice(0, m.index).trimEnd()}\n\n${line}\n\n${m[1].trim()}`
  return `${body.trimEnd()}\n\n${line}`
}

/** Bedankmail na een sales call (meteen als concept; wordt persoonlijker zodra het transcript er is). */
export function thankYouMail(firstName: string, weekday: string, pptUrl: string = SALES_PPT_URL) {
  return {
    subject: 'Bedankt voor de call',
    body: `Hoi ${firstName},\n\nBedankt voor de fijne call ${weekday}! Zoals beloofd vind je hier de presentatie: ${pptUrl}\n\nLaat gerust weten als je nog vragen hebt.\n\nGroetjes,\nCasper`,
  }
}
