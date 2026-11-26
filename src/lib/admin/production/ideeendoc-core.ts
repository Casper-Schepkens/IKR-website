/**
 * Ideeëndoc na een draaidag (pure logica, geen DB): wanneer is een draaidag voorbij, en welke
 * draaidag krijgt een ideeëndoc. Zie ideeendoc.ts voor het aanmaken van de AI-taak.
 */
import { addDays } from './rules'
import type { Cycle, StepState } from './core'

/** Stap van de volgende draaidag waar de link van het ideeëndoc bij komt (Milan). */
export const IDEA_STEP = 'ideeen_uitwerken'
/** Hoe lang na een draaidag er nog een ideeëndoc aangemaakt wordt (geen taken voor oude draaidagen). */
export const IDEA_WINDOW_DAYS = 14
export const IDEA_NOTE = 'Ideeëndoc klaar door Grok Bot'

/** Eén taak per klant + draaidag: deze ref is uniek (unieke index op ai_jobs (type, ref)). */
export const ideaDocRef = (clientId: string, cycleNo: number) => `ideeendoc:${clientId}:${cycleNo}`

/**
 * Op welke dag een draaidag voorbij was, of null: de datum ligt vóór vandaag, of de stap van de
 * draaidag zelf staat op af (dan de dag van afvinken, ook als dat vroeger is dan de geplande datum).
 * De draaidag zelf (vandaag) telt nog niet: er kan nog gefilmd worden.
 */
export function finishedOn(cycle: Cycle, states: StepState[], shootKey: string | null, today: string): string | null {
  const done = shootKey ? states.find((s) => s.cycle_id === cycle.id && s.step === shootKey && s.done_at)?.done_at?.slice(0, 10) : undefined
  const byDate = cycle.shoot_on && cycle.shoot_on < today ? cycle.shoot_on : null
  if (done && byDate) return done < byDate ? done : byDate
  return done ?? byDate
}

/**
 * De draaidag van een klant die een ideeëndoc moet krijgen: de laatste (hoogste nr) die voorbij is,
 * maar enkel als dat hoogstens IDEA_WINDOW_DAYS geleden is. Zo krijgen oude draaidagen bij de eerste
 * run geen taak meer, en telt per klant enkel de meest recente.
 */
export function cycleNeedingIdeas(cycles: Cycle[], states: StepState[], shootKey: string | null, today: string, windowDays = IDEA_WINDOW_DAYS): Cycle | null {
  const last = [...cycles]
    .sort((a, b) => b.no - a.no)
    .map((c) => ({ c, on: finishedOn(c, states, shootKey, today) }))
    .find((x) => x.on)
  if (!last?.on) return null
  return last.on >= addDays(today, -windowDays) ? last.c : null
}
