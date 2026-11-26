import 'server-only'
import { SITE_URL } from '@/lib/site'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { addDays } from '@/lib/admin/dates'
import { createEvent, isGoogleConfigured, listConnections, SCOPES, hasScopes } from '@/lib/admin/google'
import { inviteAddress } from '@/lib/admin/team/invites'
import { CONTACT_EMAIL, ownerOf } from '@/lib/admin/weekly/types'
import type { CallsRepo } from '@/lib/admin/calls/repo'
import { forwardStage, STAGE_AFTER } from '@/lib/admin/calls/types'
import type { LeadsRepo } from '@/lib/admin/sales/repo'
import type { Lead } from '@/lib/admin/sales/types'
import { readMemberBusy } from './busy'
import { BookingError, parseBookingForm, renderTemplate, TAKEN_MESSAGE, templateValues, type Booking, type BookingConfig, type BookingMember, type BusySource } from './core'
import { escapeHtml, notifyFrom, personalFrom, resendMailer, textToHtml, type Mailer } from './mail'
import { bookableDays, candidatesFor, computeSlots, groupByDay, type Busy, type MemberAvailability, type SlotOptions } from './slots'
import type { BookingStore } from './store'

/**
 * Boekingen via /boek: vrije momenten berekenen, een slot vastleggen (zonder dubbele boekingen) en daarna
 * agenda, dashboard en mails regelen. Alles hier draait op de server; /boek krijgt enkel tijdstippen.
 */

export type CalendarCreator = (opts: { calendarOwner: string; summary: string; startsAt: string; minutes: number; attendees: string[]; meet: boolean }) => Promise<{ eventId: string; meetUrl: string | null }>

export type BookingDeps = {
  store: BookingStore
  leads: LeadsRepo
  calls: CallsRepo
  now?: () => Date
  /** Vrij/bezet uit de agenda's (standaard: Google via busy.ts). */
  readBusy?: (member: string, sources: BusySource[], from: Date, to: Date) => Promise<Busy[]>
  /** Agenda-item met Meet maken (standaard: Google). */
  createCalendarEvent?: CalendarCreator
  /** In wiens agenda het item komt (standaard: eigen agenda als die met schrijfrechten gekoppeld is, anders contact@). */
  calendarOwnerFor?: (member: string) => Promise<{ owner: string; inviteMember: string | null }>
  mailer?: Mailer
}

// ─── Vrij/bezet-cache (Google niet bij elke paginaweergave bevragen) ─────────
const BUSY_TTL_MS = 60_000
const cache = globalThis as unknown as { __ikrBookingBusy?: Map<string, { until: number; busy: Busy[] }> }
const busyCache = () => (cache.__ikrBookingBusy ??= new Map())
export const clearBusyCache = () => busyCache().clear()

const defaultReadBusy = (_member: string, sources: BusySource[], from: Date, to: Date) => readMemberBusy(sources, from, to)

/** Of een teamlid meedoet: actief en ergens beschikbaarheid ingesteld. */
const takesBookings = (m: BookingMember) => m.active && (m.weekly.length > 0 || m.exceptions.some((e) => e.kind === 'add'))

export type Availability = { config: BookingConfig; members: MemberAvailability[]; options: SlotOptions; busyErrors: Record<string, string> }

/**
 * Beschikbaarheid van iedereen nu. `fresh` = agenda's opnieuw lezen (bij het boeken zelf).
 * Lukt het lezen van iemands agenda niet, dan telt die persoon even niet mee (liever geen slot dan een
 * dubbele afspraak); de fout staat in het dashboard.
 */
export async function loadAvailability(deps: BookingDeps, opts: { fresh?: boolean } = {}): Promise<Availability> {
  const now = deps.now?.() ?? new Date()
  const config = await deps.store.loadConfig()
  const options: SlotOptions = {
    now,
    minutes: config.callType.minutes,
    step: config.settings.step_minutes,
    horizonDays: config.settings.horizon_days,
    priority: config.settings.priority,
  }
  const { last } = bookableDays(now, options.horizonDays)
  const from = new Date(now.getTime() - 3_600_000)
  const to = new Date(`${addDays(last, 2)}T00:00:00Z`)
  const dbBusy = await deps.store.dbBusy(from, to)
  const readBusy = deps.readBusy ?? defaultReadBusy
  const busyErrors: Record<string, string> = {}
  const members: MemberAvailability[] = []
  await Promise.all(
    config.members.filter(takesBookings).map(async (m) => {
      let calendarBusy: Busy[] = []
      const sources = m.sources.filter((s) => s.active)
      if (m.use_busy && sources.length) {
        const key = m.member_email
        const hit = busyCache().get(key)
        if (!opts.fresh && hit && hit.until > Date.now()) calendarBusy = hit.busy
        else {
          try {
            calendarBusy = await readBusy(m.member_email, sources, from, to)
            busyCache().set(key, { until: Date.now() + BUSY_TTL_MS, busy: calendarBusy })
            if (m.busy_error) await deps.store.setBusyStatus(m.member_email, null).catch(() => undefined)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            busyErrors[m.member_email] = msg
            if (m.busy_error !== msg) await deps.store.setBusyStatus(m.member_email, msg).catch(() => undefined)
            return
          }
        }
      }
      members.push({
        email: m.member_email,
        weekly: m.weekly,
        exceptions: m.exceptions,
        busy: [...dbBusy.filter((b) => b.member === m.member_email).map(({ start, end }) => ({ start, end })), ...calendarBusy],
      })
    }),
  )
  return { config, members, options, busyErrors }
}

/** Wat /boek te zien krijgt: enkel de naam/duur van de call en vrije tijdstippen. Geen namen, geen agenda. */
export async function publicSlots(deps: BookingDeps) {
  const a = await loadAvailability(deps)
  const slots = computeSlots(a.members, a.options)
  const { first, last } = bookableDays(a.options.now, a.options.horizonDays)
  return { callType: { name: a.config.callType.name, minutes: a.config.callType.minutes }, first, last, days: groupByDay(slots) }
}

export const RATE_WINDOW_MS = 60 * 60_000
export const RATE_MAX = 5

/**
 * Een slot boeken. Volgorde:
 *  1. spam- en invoercontrole, rate limit
 *  2. beschikbaarheid opnieuw berekenen op de server (agenda's vers gelezen)
 *  3. de boeking invoegen voor het eerste vrije teamlid; de database weigert een overlap (exclusion
 *     constraint), dus bij twee gelijktijdige requests wint er precies één per teamlid. Lukt het niet,
 *     dan het volgende vrije teamlid; is niemand meer vrij: "net weggekocht".
 *  4. lead, call, agenda-item en mails (fouten daar maken de boeking niet ongedaan; ze worden bewaard).
 */
export async function bookSlot(
  deps: BookingDeps,
  raw: Record<string, unknown>,
  meta: { ipHash: string | null; honeypot?: unknown },
): Promise<{ booking: Booking; startsAt: string; endsAt: string; callName: string }> {
  if (typeof meta.honeypot === 'string' && meta.honeypot.trim()) throw new BookingError('spam', 'Er ging iets mis. Probeer later opnieuw.')
  const form = parseBookingForm(raw)
  if (meta.ipHash && (await deps.store.rateHit(meta.ipHash, RATE_WINDOW_MS)) > RATE_MAX)
    throw new BookingError('rate_limited', 'Te veel pogingen. Probeer het over een uur opnieuw, of mail ons op contact@iknowright.be.')

  const a = await loadAvailability(deps, { fresh: true })
  const start = new Date(form.start).toISOString()
  const candidates = candidatesFor(start, a.members, a.options)
  if (!candidates.length) throw new BookingError('taken', TAKEN_MESSAGE)
  const endsAt = new Date(Date.parse(start) + a.config.callType.minutes * 60_000).toISOString()
  let booking: Booking | null = null
  for (const member of candidates) {
    booking = await deps.store.insertBooking({
      call_type_id: a.config.callType.id,
      member_email: member,
      starts_at: start,
      ends_at: endsAt,
      name: form.name,
      email: form.email,
      company: form.company,
      phone: form.phone,
      ip_hash: meta.ipHash,
    })
    if (booking) break
  }
  if (!booking) throw new BookingError('taken', TAKEN_MESSAGE)
  // Andere bezoekers zien het slot meteen verdwijnen (de database telt al; de agenda-cache van dit teamlid niet).
  busyCache().delete(booking.member_email)
  const member = a.config.members.find((m) => m.member_email === booking!.member_email)!
  await finalizeBooking(deps, booking, member, a.config)
  return { booking, startsAt: start, endsAt, callName: a.config.callType.name }
}

/** Zoek de lead op e-mail, of maak hem aan; vul lege velden aan, zet eigenaar en fase. */
export async function upsertLead(leads: LeadsRepo, b: Pick<Booking, 'name' | 'email' | 'company' | 'phone' | 'member_email'>, callKind: 'setter' | 'sales'): Promise<Lead> {
  const email = b.email.toLowerCase()
  let lead = (await leads.list()).find((l) => l.email?.toLowerCase() === email) ?? null
  if (!lead) {
    try {
      lead = await leads.create({ name: b.name, company: b.company, email, phone: b.phone, source: 'website' })
    } catch (e) {
      // Gelijktijdig aangemaakt (unieke index op e-mail): opnieuw opzoeken.
      lead = (await leads.list()).find((l) => l.email?.toLowerCase() === email) ?? null
      if (!lead) throw e
    }
  } else {
    const fill = { ...(!lead.company ? { company: b.company } : {}), ...(!lead.phone ? { phone: b.phone } : {}) }
    if (Object.keys(fill).length) await leads.patch(lead.id, fill)
  }
  await leads.setOwner(lead.id, b.member_email)
  const target = STAGE_AFTER.gepland[callKind]
  // Een "lost" lead die zelf een call boekt, loopt opnieuw; enkel vooruit, en nooit uit "gewonnen".
  const next = lead.stage === 'lost' ? target : forwardStage(lead.stage, target)
  if (next) await leads.setStage(lead.id, next)
  return (await leads.get(lead.id)) ?? lead
}

/** Eigen agenda als het teamlid die met schrijfrechten koppelde (Instellingen); anders contact@ met een uitnodiging. */
async function defaultCalendarOwner(member: string) {
  const own = (await listConnections()).find((c) => c.email === member)
  if (own && hasScopes(own, [SCOPES.calendar])) return { owner: member, inviteMember: null }
  const key = ownerOf(member)
  return { owner: CONTACT_EMAIL, inviteMember: key ? await inviteAddress(key) : member }
}

async function finalizeBooking(deps: BookingDeps, booking: Booking, member: BookingMember, config: BookingConfig) {
  const patch: Parameters<BookingStore['updateBooking']>[1] = {}
  const err = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500)
  const callName = config.callType.name

  // 1. Lead + call in het dashboard.
  let lead: Lead | null = null
  let callId: string | null = null
  try {
    lead = await upsertLead(deps.leads, booking, config.callType.call_kind)
    patch.lead_id = lead.id
    const call = await deps.calls.create({
      lead_id: lead.id,
      kind: config.callType.call_kind,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      meet_url: null,
      owner: booking.member_email,
      invited: true,
      note: `${callName} geboekt via /boek door ${booking.name} (${booking.company}, ${booking.phone}).`,
      created_by: 'boekingspagina',
      created_via: 'boeking',
    })
    callId = call.id
    patch.call_id = call.id
  } catch (e) {
    patch.lead_error = err(e)
  }

  // 2. Agenda-item met Meet, lead als gast.
  try {
    if (!deps.createCalendarEvent && !isGoogleConfigured()) throw new Error('Google is nog niet ingesteld.')
    const { owner, inviteMember } = await (deps.calendarOwnerFor ?? defaultCalendarOwner)(booking.member_email)
    if (!deps.createCalendarEvent && owner === CONTACT_EMAIL && !(await listConnections()).some((c) => c.email === CONTACT_EMAIL))
      throw new Error('De contact-agenda is nog niet gekoppeld (Instellingen).')
    const ev = await (deps.createCalendarEvent ?? createEvent)({
      calendarOwner: owner,
      summary: `IKR × ${booking.company} · ${callName.toLowerCase()}`,
      startsAt: booking.starts_at,
      minutes: Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60_000),
      attendees: [...new Set([...(inviteMember ? [inviteMember] : []), booking.email])],
      meet: true,
    })
    Object.assign(patch, { calendar_owner: owner, calendar_event_id: ev.eventId, meet_url: ev.meetUrl, calendar_error: null })
    if (callId) await deps.calls.update(callId, { calendar_event_id: ev.eventId, meet_url: ev.meetUrl, calendar_error: null }).catch(() => undefined)
  } catch (e) {
    patch.calendar_error = err(e)
    if (callId) await deps.calls.update(callId, { calendar_error: patch.calendar_error }).catch(() => undefined)
  }

  const b: Booking = { ...booking, ...patch }
  const mailer = deps.mailer ?? resendMailer

  // 3. Melding naar het teamlid.
  try {
    await mailer(notificationMail(b, member, callName, lead?.id ?? null))
  } catch (e) {
    patch.notify_error = err(e)
  }

  // 4. Bevestiging naar de lead, namens het teamlid.
  try {
    await mailer(confirmationMail(b, member, config))
  } catch (e) {
    patch.confirm_error = err(e)
  }

  // De boeking zelf staat al vast: een fout bij het bijwerken mag de lead geen foutmelding geven.
  await deps.store.updateBooking(booking.id, patch).catch((e) => console.error('boek: boeking bijwerken', e))
  Object.assign(booking, patch)
}

const when = (iso: string) => `${fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long' })} om ${fmtTime(iso)}`

export function notificationMail(b: Booking, member: Pick<BookingMember, 'member_email' | 'notify_email' | 'name'>, callName: string, leadId: string | null) {
  const link = leadId ? `${SITE_URL}/admin/sales/leads/${leadId}` : `${SITE_URL}/admin/boekingen`
  const lines = [
    `Nieuwe ${callName.toLowerCase()} geboekt via /boek, voor jou.`,
    '',
    `Wie: ${b.name}`,
    `Bedrijf: ${b.company}`,
    `E-mail: ${b.email}`,
    `Telefoon: ${b.phone}`,
    `Wanneer: ${when(b.starts_at)} (tot ${fmtTime(b.ends_at)})`,
    `Meet: ${b.meet_url ?? (b.calendar_error ? `geen (agenda mislukt: ${b.calendar_error})` : 'zie agenda')}`,
    '',
    `Lead in het dashboard: ${link}`,
  ]
  const text = lines.join('\n')
  return {
    from: notifyFrom(),
    to: member.notify_email ?? member.member_email,
    replyTo: b.email,
    subject: `Nieuwe boeking: ${b.name} (${b.company}), ${fmtDate(b.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(b.starts_at)}`,
    text,
    html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#211636">${textToHtml(text)}<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#201737;color:#FFF8F1;padding:10px 18px;border-radius:999px;text-decoration:none">Open de lead</a></p></div>`,
  }
}

export function confirmationMail(b: Booking, member: Pick<BookingMember, 'member_email' | 'name'>, config: Pick<BookingConfig, 'settings' | 'callType'>) {
  const values = templateValues(b, member.name, config.callType.minutes)
  const text = renderTemplate(config.settings.confirm_template, values)
  return {
    from: personalFrom(member.name),
    to: b.email,
    replyTo: member.member_email,
    subject: renderTemplate(config.settings.confirm_subject, values),
    text,
    html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.5;color:#211636">${textToHtml(text)}</div>`,
  }
}
