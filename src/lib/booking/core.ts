import { z } from 'zod'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import type { DayException, WeeklyBlock, Weekday } from './slots'
import { toMinutes } from './slots'

/** Gedeelde types en pure helpers voor de boekingen (zonder database). */

export type CallType = { id: string; name: string; minutes: number; call_kind: 'setter' | 'sales'; active: boolean }

export type BookingSettings = {
  priority: string[]
  horizon_days: number
  step_minutes: number
  confirm_subject: string
  confirm_template: string
}

export type BusySource = {
  id: string
  member_email: string
  /** contact_agenda | team_agenda (later uit te breiden, bv. ical). */
  provider: string
  label: string | null
  account_email: string | null
  calendar_ids: string[]
  active: boolean
}

export type BookingMember = {
  member_email: string
  name: string
  active: boolean
  notify_email: string | null
  use_busy: boolean
  busy_error: string | null
  busy_checked_at: string | null
  weekly: (WeeklyBlock & { id: string })[]
  exceptions: (DayException & { id: string })[]
  sources: BusySource[]
}

export type BookingConfig = { settings: BookingSettings; callType: CallType; members: BookingMember[] }

export type Booking = {
  id: string
  call_type_id: string
  member_email: string
  starts_at: string
  ends_at: string
  status: 'bevestigd' | 'geannuleerd'
  name: string
  email: string
  company: string
  phone: string
  lead_id: string | null
  call_id: string | null
  calendar_owner: string | null
  calendar_event_id: string | null
  meet_url: string | null
  calendar_error: string | null
  lead_error: string | null
  notify_error: string | null
  confirm_error: string | null
  created_at: string
}

export const DEFAULT_SETTINGS: BookingSettings = {
  priority: ['casper@iknowright.be', 'cedric@iknowright.be', 'milan@iknowright.be'],
  horizon_days: 21,
  step_minutes: 15,
  confirm_subject: 'Onze kennismakingscall op {dag} {datum}',
  confirm_template:
    'Hey {voornaam},\n\nIk ben {teamlid} van IKnowRight. Ik zit {dag} {datum} om {uur} samen met jou. Hier is de link nog eens: {meet_link}\n\nTot dan!\n{teamlid}',
}
export const DEFAULT_CALL_TYPE: CallType = { id: 'kennismaking', name: 'Kennismakingscall', minutes: 45, call_kind: 'sales', active: true }

/** Plaatshouders in de bevestigingsmail. */
export const TEMPLATE_FIELDS = ['voornaam', 'naam', 'bedrijf', 'teamlid', 'dag', 'datum', 'uur', 'meet_link', 'duur'] as const
export type TemplateField = (typeof TEMPLATE_FIELDS)[number]

/** Vult {plaatshouders} in; onbekende blijven staan zodat een tikfout opvalt. */
export function renderTemplate(template: string, values: Record<TemplateField, string>) {
  return template.replace(/\{([a-z_]+)\}/g, (all, key: string) => (key in values ? values[key as TemplateField] : all))
}

export function templateValues(b: Pick<Booking, 'name' | 'company' | 'starts_at' | 'meet_url'>, memberName: string, minutes: number): Record<TemplateField, string> {
  return {
    voornaam: b.name.trim().split(/\s+/)[0],
    naam: b.name.trim(),
    bedrijf: b.company,
    teamlid: memberName,
    dag: fmtDate(b.starts_at, { weekday: 'long' }),
    datum: fmtDate(b.starts_at, { day: 'numeric', month: 'long' }),
    uur: fmtTime(b.starts_at),
    meet_link: b.meet_url ?? '(de link volgt in de agenda-uitnodiging)',
    duur: `${minutes} minuten`,
  }
}

/** Onbekende plaatshouders in een template (om bij het opslaan te waarschuwen). */
export const unknownFields = (template: string) =>
  [...template.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((k) => !(TEMPLATE_FIELDS as readonly string[]).includes(k))

// ─── Formulier op /boek ────────────────────────────────────────────────────

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

export const bookingFormSchema = z.object({
  start: z.iso.datetime({ offset: true, message: 'Kies een moment.' }),
  name: z.string().min(2, 'Vul je naam in.').max(120, 'Je naam is te lang.'),
  email: z.email('Vul een geldig e-mailadres in.').max(200),
  company: z.string().min(1, 'Vul je bedrijf in.').max(160, 'De bedrijfsnaam is te lang.'),
  phone: z
    .string()
    .min(6, 'Vul je telefoonnummer in.')
    .max(40, 'Dat telefoonnummer is te lang.')
    .regex(/^\+?[0-9 ().\/-]{6,40}$/, 'Vul een geldig telefoonnummer in.')
    .refine((v) => v.replace(/\D/g, '').length >= 8, 'Vul een geldig telefoonnummer in.'),
})
export type BookingForm = z.infer<typeof bookingFormSchema>

/** Controleert en normaliseert het formulier. Gooit met een Nederlandse melding. */
export function parseBookingForm(raw: Record<string, unknown>): BookingForm {
  const r = bookingFormSchema.safeParse({
    start: clean(raw.start),
    name: clean(raw.name),
    email: clean(raw.email).toLowerCase(),
    company: clean(raw.company),
    phone: clean(raw.phone),
  })
  if (!r.success) throw new BookingError('invalid', r.error.issues[0]?.message ?? 'Controleer je gegevens.')
  // Geen links of HTML in naam/bedrijf (gaat in agenda-items en mails).
  if (/[<>]|https?:\/\//i.test(`${r.data.name} ${r.data.company}`)) throw new BookingError('invalid', 'Controleer je naam en bedrijf.')
  return r.data
}

export type BookingErrorCode = 'invalid' | 'taken' | 'rate_limited' | 'spam' | 'unavailable'
export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message: string,
  ) {
    super(message)
  }
}
export const TAKEN_MESSAGE = 'Dit moment is net weggekocht, kies een ander.'

// ─── Beheer: weekuren en uitzonderingen ────────────────────────────────────

const timeOk = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(t)

/** Weekuren uit het dashboard: geldig, einde na start, geen overlap per dag. */
export function cleanWeekly(raw: unknown): WeeklyBlock[] {
  if (!Array.isArray(raw)) throw new Error('Ongeldige weekuren.')
  if (raw.length > 50) throw new Error('Te veel blokken.')
  const blocks = raw.map((b) => {
    const x = b as { weekday?: unknown; start?: unknown; end?: unknown }
    const weekday = Number(x.weekday)
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) throw new Error('Ongeldige dag.')
    if (!timeOk(x.start) || !timeOk(x.end)) throw new Error('Gebruik uren als 10:00.')
    if (toMinutes(x.end) <= toMinutes(x.start)) throw new Error(`Het einde (${x.end}) moet na het begin (${x.start}) liggen.`)
    return { weekday: weekday as Weekday, start: x.start, end: x.end }
  })
  for (let d = 1; d <= 7; d++) {
    const day = blocks.filter((b) => b.weekday === d).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    for (let i = 1; i < day.length; i++) if (toMinutes(day[i].start) < toMinutes(day[i - 1].end)) throw new Error('Twee blokken op dezelfde dag overlappen.')
  }
  return blocks
}

export function cleanException(raw: { day?: unknown; kind?: unknown; start?: unknown; end?: unknown }): DayException {
  const day = typeof raw.day === 'string' ? raw.day : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw new Error('Kies een datum.')
  const kind = raw.kind === 'add' || raw.kind === 'remove' ? raw.kind : null
  if (!kind) throw new Error('Kies toevoegen of schrappen.')
  const start = raw.start || null
  const end = raw.end || null
  if (!start && !end) {
    if (kind === 'add') throw new Error('Geef een begin- en einduur voor het extra blok.')
    return { day, kind }
  }
  if (!timeOk(start) || !timeOk(end)) throw new Error('Gebruik uren als 10:00.')
  if (toMinutes(end) <= toMinutes(start)) throw new Error('Het einduur moet na het beginuur liggen.')
  return { day, kind, start, end }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function cleanNotifyEmail(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (!s) return null
  if (!EMAIL.test(s) || s.length > 200) throw new Error(`"${s}" is geen geldig e-mailadres.`)
  return s
}

/** Volgorde: enkel gekende teamleden, elk één keer; ontbrekende achteraan in hun huidige volgorde. */
export function cleanPriority(raw: unknown, known: string[]): string[] {
  const list = (Array.isArray(raw) ? raw : []).filter((x): x is string => typeof x === 'string').map((x) => x.toLowerCase())
  const out = [...new Set(list.filter((x) => known.includes(x)))]
  return [...out, ...known.filter((k) => !out.includes(k))]
}

/**
 * Welke agenda we lezen voor vrij/bezet: altijd die van het uitnodigingsadres (waar ook de weeklies en
 * calls naartoe gaan; bij Casper zijn persoonlijke agenda). De agenda-koppeling moet die agenda kunnen
 * zien: ofwel is het hetzelfde Google-account, ofwel staat die agenda in de lijst van het account.
 */
export function agendaCalendarFor(conn: { google_email: string; calendars: { id: string }[] }, inviteAddress: string): string {
  const target = inviteAddress.toLowerCase()
  if (conn.google_email.toLowerCase() === target) return 'primary'
  const shared = conn.calendars.find((c) => c.id.toLowerCase() === target)
  if (shared) return shared.id
  throw new Error(
    `${inviteAddress} staat niet tussen de agenda's die ${conn.google_email} kan zien. Deel in Google Agenda de agenda van ${inviteAddress} met ${conn.google_email} ("Alle details van afspraken bekijken"), accepteer de deelmail en klik in Instellingen → Mijn koppelingen bij "Agenda koppelen" op "Lijst vernieuwen".`,
  )}
