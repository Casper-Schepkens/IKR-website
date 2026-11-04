import type { Mail, Thread } from '../gmail'
import { daysBetween, isoDay } from '../format'
import { OPEN_STAGES, STAGE_LABELS, type Lead } from './types'

/** Pure logica voor "Wachten op antwoord" (zonder Gmail/DB, zodat ze testbaar is). */

export type WaitingMail = {
  id: string
  date: string
  from_email: string
  from_name: string
  subject: string
  preview: string
}
export type WaitingRow = { lead_id: string; mailbox: string; thread_id: string; mail: WaitingMail }

const isInternal = (email: string) => email.toLowerCase().endsWith('@iknowright.be')

export const openLeads = (leads: Lead[]) =>
  leads.filter((l) => l.email && OPEN_STAGES.includes(l.stage))

/** Alle adressen in een header als "Naam <a@b.be>, c@d.be". */
export function addresses(header: string | undefined) {
  return (header ?? '').match(/[^\s<>,;"']+@[^\s<>,;"']+/g)?.map((a) => a.toLowerCase()) ?? []
}

export function preview(text: string, max = 220) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/**
 * Per open lead de laatste echte mail tussen ons en de lead (over alle threads en mailboxen heen).
 * De lead wacht als die laatste mail van ons komt. Automatische antwoorden (afwezigheid) tellen niet.
 */
export function computeWaiting(
  leads: Lead[],
  threads: { mailbox: string; thread: Thread }[],
): WaitingRow[] {
  const byEmail = new Map(openLeads(leads).map((l) => [l.email!.toLowerCase(), l]))
  const latest = new Map<string, { mailbox: string; thread: Thread; mail: Mail }>()
  const seen = new Set<string>()

  for (const { mailbox, thread } of threads) {
    for (const m of thread.mails) {
      if (m.auto) continue
      // Dezelfde mail kan in meerdere mailboxen staan (bv. contact@ in cc).
      const key = m.messageId ?? `${mailbox}:${m.id}`
      const from = m.fromEmail.toLowerCase()
      const recipients = [...addresses(m.to), ...addresses(m.cc)]
      const leadsHere = isInternal(from)
        ? recipients.filter((a) => byEmail.has(a))
        : byEmail.has(from)
          ? [from]
          : []
      for (const email of leadsHere) {
        const lead = byEmail.get(email)!
        const dedupe = `${lead.id}|${key}`
        if (seen.has(dedupe)) continue
        seen.add(dedupe)
        const cur = latest.get(lead.id)
        if (!cur || m.date > cur.mail.date) latest.set(lead.id, { mailbox, thread, mail: m })
      }
    }
  }

  const rows: WaitingRow[] = []
  for (const [leadId, { mailbox, thread, mail }] of latest) {
    if (!isInternal(mail.fromEmail)) continue // de lead heeft als laatste geantwoord
    rows.push({
      lead_id: leadId,
      mailbox,
      thread_id: thread.id,
      mail: {
        id: mail.id,
        date: mail.date,
        from_email: mail.fromEmail.toLowerCase(),
        from_name: mail.fromName,
        subject: mail.subject,
        preview: preview(mail.text),
      },
    })
  }
  return rows.sort((a, b) => a.mail.date.localeCompare(b.mail.date))
}

/** Kalenderdagen (Brusselse tijd) tussen de laatste mail en vandaag. */
export const daysSince = (iso: string, now = new Date()) =>
  Math.max(0, daysBetween(isoDay(new Date(iso)), isoDay(now)))

/** Groen < 4, oranje 4–7, rood > 7. */
export const dayTone = (days: number): 'green' | 'orange' | 'red' =>
  days < 4 ? 'green' : days <= 7 ? 'orange' : 'red'

/** Korte samenvatting van waar we staan: fase + volgende actie, anders het begin van de laatste notitie. */
export function leadContext(lead: Lead, max = 160) {
  const stage = STAGE_LABELS[lead.stage]
  if (lead.next_action?.trim()) return `${stage} · ${preview(lead.next_action, max)}`
  const last = lead.notes
    ?.trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .at(-1)
  return last ? `${stage} · ${preview(last, max)}` : stage
}
