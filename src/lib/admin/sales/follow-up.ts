import { fmtDate, isoDay } from '../format'

/** Volgende actie op de lead na een verstuurde mail, als het concept er zelf geen meegeeft. */
export const DEFAULT_FOLLOW_UP_ACTION = 'antwoord opvolgen'
export const FOLLOW_UP_WORKDAYS = 5

/** `n` werkdagen (ma–vr) na een dag (YYYY-MM-DD). Zaterdag en zondag tellen niet mee. */
export function addWorkdays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`)
  let left = n
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return d.toISOString().slice(0, 10)
}

export type FollowUpDraft = { subject: string; follow_up_action?: string | null; follow_up_on?: string | null }

/**
 * Wat er op de lead verandert na het versturen van een concept: volgende actie en opvolgdatum (eigen
 * waarden van het concept krijgen voorrang) en een notitie met datum en onderwerp onderaan de notities.
 */
export function leadPatchAfterSend(lead: { notes: string | null }, draft: FollowUpDraft, sentAt: Date) {
  const action = draft.follow_up_action?.trim() || DEFAULT_FOLLOW_UP_ACTION
  const on = draft.follow_up_on || addWorkdays(isoDay(sentAt), FOLLOW_UP_WORKDAYS)
  const date = fmtDate(sentAt, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const line = `${date}: mail verstuurd: "${draft.subject.trim()}"`
  return {
    next_action: action,
    follow_up_on: on,
    notes: lead.notes?.trim() ? `${lead.notes.trimEnd()}\n\n${line}` : line,
  }
}

type LeadsLike = {
  get(id: string): Promise<{ notes: string | null } | null>
  patch(id: string, input: { next_action: string; follow_up_on: string; notes: string }): Promise<void>
}

/**
 * Werkt de gekoppelde lead bij na een verstuurd concept. Mag het versturen nooit doen mislukken:
 * fouten worden enkel gelogd. Geeft de toegepaste wijziging terug (of null).
 */
export async function updateLeadAfterSend(leads: LeadsLike, draft: FollowUpDraft & { lead_id: string | null }, sentAt = new Date()) {
  try {
    if (!draft.lead_id) return null
    const lead = await leads.get(draft.lead_id)
    if (!lead) return null
    const patch = leadPatchAfterSend(lead, draft, sentAt)
    await leads.patch(draft.lead_id, patch)
    return patch
  } catch (e) {
    console.error('[concept verstuurd] lead bijwerken mislukt (mail is wel verstuurd)', e)
    return null
  }
}
