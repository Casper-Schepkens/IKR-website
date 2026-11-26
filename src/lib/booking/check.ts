import 'server-only'
import { SITE_URL } from '@/lib/site'
import { addDays } from '@/lib/admin/dates'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import type { BookingMember } from './core'
import { notifyFrom, textToHtml, type OutgoingMail } from './mail'
import { memberCalendarBusy, type BookingDeps } from './service'
import { availabilityConflicts, bookableDays, computeSlots, type Busy } from './slots'

/**
 * Agenda-check per teamlid: kan zijn agenda gelezen worden, en welke stukken van zijn weekuren zijn in
 * zijn agenda al bezet (bv. iets op woensdagnamiddag dat hij vergat te schrappen)? Die stukken komen
 * niet op /boek zolang vrij/bezet aan staat; de check maakt het zichtbaar, in het dashboard en elke week
 * per mail.
 */

export type AgendaReport = {
  member: string
  name: string
  notifyTo: string
  active: boolean
  useBusy: boolean
  /** null = agenda gelezen (of vrij/bezet staat uit). */
  error: string | null
  /** Overlap tussen weekuren/uitzonderingen en de agenda (UTC ms). */
  conflicts: Busy[]
  /** Vrije momenten op /boek die naar dit teamlid gaan. */
  freeSlots: number
  hasHours: boolean
}

export async function agendaCheck(deps: BookingDeps, opts: { member?: string; fresh?: boolean } = {}): Promise<AgendaReport[]> {
  const now = deps.now?.() ?? new Date()
  const config = await deps.store.loadConfig()
  const o = { now, minutes: config.callType.minutes, step: config.settings.step_minutes, horizonDays: config.settings.horizon_days, priority: config.settings.priority }
  const { last } = bookableDays(now, o.horizonDays)
  const to = new Date(`${addDays(last, 2)}T00:00:00Z`)
  const dbBusy = await deps.store.dbBusy(now, to)
  const members = config.members.filter((m) => !opts.member || m.member_email === opts.member)
  const reports = await Promise.all(
    members.map(async (m: BookingMember) => {
      const cal = await memberCalendarBusy(deps, m, now, to, Boolean(opts.fresh))
      const busy = cal.ok ? cal.busy : []
      const hasHours = m.weekly.length > 0 || m.exceptions.some((e) => e.kind === 'add')
      const avail = { email: m.member_email, weekly: m.weekly, exceptions: m.exceptions, busy: [...busy, ...dbBusy.filter((b) => b.member === m.member_email)] }
      return {
        member: m.member_email,
        name: m.name,
        notifyTo: m.notify_email ?? m.member_email,
        active: m.active,
        useBusy: m.use_busy,
        error: cal.ok ? null : cal.error,
        conflicts: cal.ok ? availabilityConflicts(m, busy, o) : [],
        // Enkel dit teamlid: hoeveel momenten het zelf zou kunnen nemen.
        freeSlots: m.active && cal.ok && hasHours ? computeSlots([avail], o).length : 0,
        hasHours,
      }
    }),
  )
  return reports
}

export const conflictText = (c: Busy) => `${fmtDate(new Date(c.start), { weekday: 'long', day: 'numeric', month: 'long' })} ${fmtTime(new Date(c.start))}–${fmtTime(new Date(c.end))}`

/** Wekelijkse controlemail voor één teamlid. */
export function weeklyCheckMail(r: AgendaReport, horizonDays: number): OutgoingMail {
  const first = r.name
  const lines: string[] = [`Hey ${first},`, '', `Dit is de wekelijkse check van je beschikbaarheid op ${SITE_URL}/boek (komende ${horizonDays} dagen).`, '']
  if (!r.active) lines.push('Je neemt nu geen boekingen aan via /boek. Klopt dat niet? Zet het aan in het dashboard.')
  else if (!r.hasHours) lines.push('Je hebt geen weekuren ingesteld, dus leads kunnen niet bij jou boeken.')
  else if (r.error) lines.push(`Let op: je agenda kon niet gelezen worden, dus je krijgt nu GEEN boekingen tot dit opgelost is.`, `Reden: ${r.error}`)
  else {
    if (!r.useBusy) lines.push('Let op: vrij/bezet uit je agenda staat uit. Een afspraak in je agenda houdt een lead dan NIET tegen.', '')
    lines.push(`Je hebt ${r.freeSlots} vrije ${r.freeSlots === 1 ? 'moment' : 'momenten'} voor leads.`)
    if (r.conflicts.length) {
      lines.push('', 'Deze stukken van je weekuren staan bezet in je agenda. Ze verschijnen niet op /boek; klopt je schema nog?', ...r.conflicts.map((c) => `- ${conflictText(c)}`))
    } else lines.push('Er staat niets in je agenda dat met je weekuren botst.')
  }
  lines.push('', `Aanpassen: ${SITE_URL}/admin/boekingen?lid=${encodeURIComponent(r.member)}`)
  const text = lines.join('\n')
  const problem = !r.active || !r.hasHours || Boolean(r.error) || !r.useBusy || r.conflicts.length > 0
  return {
    from: notifyFrom(),
    to: r.notifyTo,
    subject: problem ? 'Check je beschikbaarheid op /boek' : 'Je beschikbaarheid op /boek klopt',
    text,
    html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#211636">${textToHtml(text)}</div>`,
  }
}
