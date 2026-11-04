import { STAGES, STAGE_LABELS, type Stage } from './types'

/**
 * "Na verzending": pure logica (testbaar, zonder DB). Bepaalt welke voorgestelde wijzigingen op de
 * lead toegepast mogen worden. Regel: een veld dat sinds het versturen al veranderd is (door Casper),
 * wordt nooit overschreven.
 */

export const AFTER_SEND_FIELDS = {
  volgende_actie: { column: 'next_action', label: 'Volgende actie' },
  opvolgen_op: { column: 'follow_up_on', label: 'Opvolgen op' },
  fase: { column: 'stage', label: 'Fase' },
  telefoon: { column: 'phone', label: 'Telefoon' },
  bedrijf: { column: 'company', label: 'Bedrijf' },
} as const
export type AfterSendField = keyof typeof AFTER_SEND_FIELDS
export type AfterSendColumn = (typeof AFTER_SEND_FIELDS)[AfterSendField]['column']

/** De velden van de lead die de AI mag aanpassen (momentopname bij het versturen, of de huidige stand). */
export type LeadFields = Record<AfterSendColumn, string | null>

export type Proposal = { waarde: string; reden: string } | null
export type AfterSendOutput = Partial<Record<AfterSendField, Proposal>>

/** Fasen die de AI mag zetten: enkel vooruit, en nooit gewonnen of lost (dat beslist Casper). */
export const AI_STAGES = STAGES.filter((s) => s !== 'won' && s !== 'lost') as Exclude<Stage, 'won' | 'lost'>[]

export type PlannedChange = {
  field: AfterSendField
  column: AfterSendColumn
  from: string | null
  to: string
  reden: string
  status: 'toepassen' | 'overgeslagen'
  /** Waarom niet toegepast (enkel bij overgeslagen). */
  waarom?: string
}

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime())

/** Zet een voorstel om naar een geldige waarde, of null als het niet bruikbaar is. */
function normalize(field: AfterSendField, raw: string, current: string | null, sentDay: string): string | null {
  const v = raw.trim()
  if (!v) return null // de AI mag een veld niet leegmaken
  switch (field) {
    case 'opvolgen_op':
      return isDay(v) && v >= sentDay ? v : null
    case 'fase': {
      if (!(AI_STAGES as string[]).includes(v)) return null
      const now = current ? STAGES.indexOf(current as Stage) : -1
      return STAGES.indexOf(v as Stage) > now ? v : null // enkel vooruit
    }
    case 'volgende_actie':
      return v.slice(0, 300)
    case 'telefoon':
      return /\d{6,}/.test(v.replace(/[\s./()-]/g, '')) ? v.slice(0, 40) : null
    case 'bedrijf':
      return v.slice(0, 120)
  }
}

export function planAfterSend(snapshot: LeadFields, current: LeadFields, output: AfterSendOutput, sentDay: string): PlannedChange[] {
  const out: PlannedChange[] = []
  for (const field of Object.keys(AFTER_SEND_FIELDS) as AfterSendField[]) {
    const p = output[field]
    if (!p || typeof p.waarde !== 'string') continue
    const { column } = AFTER_SEND_FIELDS[field]
    const to = normalize(field, p.waarde, current[column], sentDay)
    if (to === null || to === current[column]) continue
    const base = { field, column, from: current[column], to, reden: (p.reden ?? '').trim().slice(0, 300) }
    if ((current[column] ?? null) !== (snapshot[column] ?? null))
      out.push({ ...base, status: 'overgeslagen', waarom: 'Je had dit veld na het versturen zelf al aangepast.' })
    else out.push({ ...base, status: 'toepassen' })
  }
  return out
}

/** Leesbare waarde voor de lead-fiche. */
export function displayValue(column: AfterSendColumn, v: string | null) {
  if (v === null || v === '') return '—'
  if (column === 'stage') return STAGE_LABELS[v as Stage] ?? v
  return v
}
