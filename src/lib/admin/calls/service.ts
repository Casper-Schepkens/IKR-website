import 'server-only'
import { brusselsToIso, fmtDate, fmtTime } from '../format'
import { createEvent, deleteEvent, isGoogleConfigured, listConnections, listEvents } from '../google'
import type { DraftsRepo } from '../sales/drafts'
import type { LeadsRepo } from '../sales/repo'
import { OPEN_STAGES, type Lead } from '../sales/types'
import { CONTACT_EMAIL, TEAM } from '../weekly/types'
import type { CallsRepo } from './repo'
import { CALL_KIND_LABELS, CALL_MINUTES, forwardStage, STAGE_AFTER, type Call, type CallKind } from './types'

/**
 * Calls inplannen, afronden en detecteren. Agenda = de contact-agenda (zoals Casper nu werkt), met een
 * uitnodiging voor zijn eigen agenda. De lead wordt enkel uitgenodigd als Casper dat aanvinkt; Grok Bot
 * nodigt nooit uit (registreert enkel). Er wordt hier nooit een mail verstuurd.
 */

export type CallDeps = { calls: CallsRepo; leads: LeadsRepo }
const CASPER_CALENDAR = TEAM.find((t) => t.key === 'casper')!.calendar

const title = (kind: CallKind, lead: Pick<Lead, 'name' | 'company'>) => `IKR × ${lead.company ?? lead.name} · ${CALL_KIND_LABELS[kind].toLowerCase()}`

function times(date: string | null, time: string | null, minutes: number | null, kind: CallKind) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Kies een datum en een uur.')
  const mins = minutes ?? CALL_MINUTES[kind]
  if (!Number.isFinite(mins) || mins < 5 || mins > 240) throw new Error('Duur: tussen 5 en 240 minuten.')
  const startsAt = brusselsToIso(date, time)
  return { startsAt, endsAt: new Date(new Date(startsAt).getTime() + mins * 60_000).toISOString(), minutes: mins }
}

async function advanceStage(leads: LeadsRepo, lead: Lead, next: Lead['stage']) {
  const s = forwardStage(lead.stage, next)
  if (s) await leads.setStage(lead.id, s)
}

/** Plant een call: rij + agenda-item in de contact-agenda (Meet bij een sales call) + fase vooruit. */
export async function scheduleCall(
  deps: CallDeps,
  input: { leadId: string; kind: CallKind; date: string | null; time: string | null; minutes?: number | null; inviteLead?: boolean; via: 'dashboard' | 'inbox'; by: string },
): Promise<Call> {
  const lead = await deps.leads.get(input.leadId)
  if (!lead) throw new Error('Lead niet gevonden.')
  if (input.kind !== 'setter' && input.kind !== 'sales') throw new Error('Kies setter call of sales call.')
  const { startsAt, endsAt, minutes } = times(input.date, input.time, input.minutes ?? null, input.kind)
  // Zelfde lead, zelfde moment, nog open: niet dubbel inplannen.
  const dup = (await deps.calls.list({ leadId: lead.id })).find((c) => c.status === 'gepland' && c.starts_at === startsAt && c.kind === input.kind)
  if (dup) return dup
  let call = await deps.calls.create({ lead_id: lead.id, kind: input.kind, starts_at: startsAt, ends_at: endsAt, meet_url: null, created_by: input.by, created_via: input.via })
  const invite = Boolean(input.inviteLead && lead.email)
  try {
    if (!isGoogleConfigured()) throw new Error('Google is nog niet ingesteld.')
    if (!(await listConnections()).some((c) => c.email === CONTACT_EMAIL)) throw new Error('De contact-agenda is nog niet gekoppeld (Instellingen).')
    const ev = await createEvent({
      calendarOwner: CONTACT_EMAIL,
      summary: title(input.kind, lead),
      startsAt,
      minutes,
      attendees: [CASPER_CALENDAR, ...(invite ? [lead.email!] : [])],
      meet: input.kind === 'sales',
    })
    await deps.calls.update(call.id, { calendar_event_id: ev.eventId, meet_url: ev.meetUrl, invited: invite, calendar_error: null })
  } catch (e) {
    await deps.calls.update(call.id, { calendar_error: e instanceof Error ? e.message : 'Agenda mislukt.' })
  }
  await advanceStage(deps.leads, lead, STAGE_AFTER.gepland[input.kind])
  call = (await deps.calls.get(call.id))!
  return call
}

/** Grok Bot: een call registreren die al in de agenda staat. Maakt geen agenda-item en nodigt niemand uit. */
export async function registerCall(
  deps: CallDeps,
  input: { leadId: string; kind: CallKind; date: string; time: string; minutes?: number; meetUrl?: string | null; by: string },
) {
  const lead = await deps.leads.get(input.leadId)
  if (!lead) throw new Error('Lead niet gevonden.')
  const { startsAt, endsAt } = times(input.date, input.time, input.minutes ?? null, input.kind)
  const meet = input.meetUrl?.trim() || null
  if (meet && !/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(meet)) throw new Error('meet_link moet een Google Meet-link zijn.')
  const dup = (await deps.calls.list({ leadId: lead.id })).find((c) => c.status === 'gepland' && c.starts_at === startsAt)
  if (dup) return dup
  const call = await deps.calls.create({ lead_id: lead.id, kind: input.kind, starts_at: startsAt, ends_at: endsAt, meet_url: meet, created_by: input.by, created_via: 'grokbot' })
  await advanceStage(deps.leads, lead, STAGE_AFTER.gepland[input.kind])
  return call
}

/**
 * Call afronden. Afgerond: fase vooruit (setter/sales call gehouden). No-show: concept om een nieuwe call
 * te plannen (Casper verstuurt het zelf). Geeft het concept-id terug bij een no-show.
 */
export async function finishCall(
  deps: CallDeps & { drafts: DraftsRepo },
  id: string,
  outcome: 'afgerond' | 'no_show',
  note: string | null,
  by: string,
): Promise<{ call: Call; draftId: string | null }> {
  const call = await deps.calls.get(id)
  if (!call) throw new Error('Call niet gevonden.')
  if (call.status === 'geannuleerd') throw new Error('Deze call is geannuleerd.')
  await deps.calls.update(id, { status: outcome, finished_at: new Date().toISOString(), ...(note ? { note } : {}) })
  const lead = await deps.leads.get(call.lead_id)
  let draftId: string | null = null
  if (lead && outcome === 'afgerond') await advanceStage(deps.leads, lead, STAGE_AFTER.afgerond[call.kind])
  if (lead && outcome === 'no_show' && lead.email && !(await deps.drafts.list({ leadId: lead.id, status: 'concept' })).some((d) => d.context?.startsWith('No-show'))) {
    const first = lead.name.split(' ')[0]
    const when = fmtDate(call.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })
    const body = `Hoi ${first},\n\nJammer dat het ${when} niet lukte voor onze call. Geen probleem! Zullen we een nieuw moment zoeken? Laat gerust weten wat jou past, dan plan ik het in.\n\nGroetjes,\nCasper`
    const d = await deps.drafts.create({
      lead_id: lead.id,
      from_email: 'casper@iknowright.be',
      to_email: lead.email,
      cc: [],
      subject: 'Nieuw moment voor onze call?',
      body,
      is_html: false,
      thread_id: null,
      in_reply_to: null,
      context: `No-show bij de ${CALL_KIND_LABELS[call.kind].toLowerCase()} van ${when} ${fmtTime(call.starts_at)}. Concept om een nieuwe call te plannen; pas gerust aan.`,
      created_by: by,
      original_body: body,
    })
    draftId = d.id
  }
  return { call: (await deps.calls.get(id))!, draftId }
}

/** Annuleren. Vanuit het dashboard ook het agenda-item weghalen (deelnemers krijgen een annulering). */
export async function cancelCall(deps: CallDeps, id: string, opts: { removeFromCalendar: boolean; note?: string | null }) {
  const call = await deps.calls.get(id)
  if (!call) throw new Error('Call niet gevonden.')
  if (call.status !== 'gepland') throw new Error('Enkel een geplande call kan geannuleerd worden.')
  if (opts.removeFromCalendar && call.calendar_event_id) await deleteEvent(CONTACT_EMAIL, call.calendar_event_id, true)
  await deps.calls.update(id, { status: 'geannuleerd', ...(opts.note ? { note: opts.note } : {}) })
}

// ─── Detectie uit de contact-agenda ────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/**
 * Welke lead hoort bij een agenda-item: eerst via het e-mailadres van een deelnemer, anders via de naam of
 * het bedrijf in de titel (enkel als dat precies één lead oplevert). Weeklies tellen niet.
 */
export function matchLead(ev: { summary: string; attendees: string[] }, leads: Lead[]): Lead | null {
  if (/weekly/i.test(ev.summary)) return null
  const open = leads.filter((l) => OPEN_STAGES.includes(l.stage))
  const byMail = open.filter((l) => l.email && ev.attendees.includes(l.email.toLowerCase()))
  if (byMail.length === 1) return byMail[0]
  const t = norm(ev.summary)
  const byTitle = open.filter((l) => [l.company, l.name].some((v) => v && v.trim().length >= 4 && t.includes(norm(v.trim()))))
  return byTitle.length === 1 ? byTitle[0] : null
}

export const guessKind = (ev: { summary: string; meetUrl: string | null }): CallKind =>
  /setter/i.test(ev.summary) ? 'setter' : /sales/i.test(ev.summary) ? 'sales' : ev.meetUrl ? 'sales' : 'setter'

const g = globalThis as unknown as { __ikrCallSync?: number }

/**
 * Leest de contact-agenda (gisteren tot 60 dagen vooruit) en maakt een call aan voor elk item dat bij een
 * lead hoort en nog niet gekend is; verschoven items worden bijgewerkt. Hoogstens om de 5 minuten (tenzij force).
 */
export async function syncCallsFromCalendar(deps: CallDeps, opts: { force?: boolean } = {}) {
  if (!opts.force && g.__ikrCallSync && Date.now() - g.__ikrCallSync < 5 * 60_000) return { nieuw: 0, bijgewerkt: 0, overgeslagen: true }
  if (!isGoogleConfigured() || !(await listConnections()).some((c) => c.email === CONTACT_EMAIL)) return { nieuw: 0, bijgewerkt: 0, overgeslagen: true }
  g.__ikrCallSync = Date.now()
  const now = Date.now()
  const events = (await listEvents(CONTACT_EMAIL, new Date(now - 86_400_000), new Date(now + 60 * 86_400_000))).filter((e) => e.status !== 'cancelled')
  const [leads, calls] = await Promise.all([deps.leads.list(), deps.calls.list()])
  const byEvent = new Map(calls.filter((c) => c.calendar_event_id).map((c) => [c.calendar_event_id!, c]))
  let nieuw = 0
  let bijgewerkt = 0
  for (const ev of events) {
    const known = byEvent.get(ev.id)
    if (known) {
      if (known.status === 'gepland' && (known.starts_at !== ev.start || known.ends_at !== ev.end || (ev.meetUrl && known.meet_url !== ev.meetUrl))) {
        await deps.calls.update(known.id, { starts_at: ev.start, ends_at: ev.end, ...(ev.meetUrl ? { meet_url: ev.meetUrl } : {}) })
        bijgewerkt++
      }
      continue
    }
    const lead = matchLead(ev, leads)
    if (!lead) continue
    const kind = guessKind(ev)
    try {
      await deps.calls.create({
        lead_id: lead.id,
        kind,
        starts_at: ev.start,
        ends_at: ev.end,
        meet_url: ev.meetUrl,
        calendar_event_id: ev.id,
        invited: Boolean(lead.email && ev.attendees.includes(lead.email.toLowerCase())),
        created_by: 'contact-agenda',
        created_via: 'agenda',
      })
      await advanceStage(deps.leads, lead, STAGE_AFTER.gepland[kind])
      nieuw++
    } catch {
      // al aangemaakt door een gelijktijdige sync (unieke index): overslaan
    }
  }
  return { nieuw, bijgewerkt, overgeslagen: false }
}
