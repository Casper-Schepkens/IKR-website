/**
 * Productieproces van de content (zoals Cédric het uitlegde), per klant:
 * eenmalig de onboarding (contract → kick-off → strategie), daarna een cyclus per draaidag
 * (ideeën → briefing → greenlight → draaidag → montage → revisie → online).
 * Deadlines volgen uit een paar ankerdata; elke stap kan afgevinkt worden of een eigen deadline krijgen.
 */

export type Who = 'casper' | 'cedric' | 'milan' | 'freelancer' | 'klant'
export const WHO_LABEL: Record<Who, string> = { casper: 'Casper', cedric: 'Cédric', milan: 'Milan', freelancer: 'Freelancer', klant: 'Klant' }
/** Wie een stap van de freelancer of de klant opvolgt. */
export const FOLLOWS_UP: Record<Who, 'casper' | 'cedric' | 'milan'> = { casper: 'casper', cedric: 'cedric', milan: 'milan', freelancer: 'milan', klant: 'cedric' }

export type Anchor = 'getekend' | 'kickoff' | 'strategie' | 'draaidag'
export const ANCHOR_LABEL: Record<Anchor, string> = { getekend: 'Contract getekend', kickoff: 'Kick-off', strategie: 'Strategiemeeting', draaidag: 'Draaidag' }

export type StepDef = {
  key: string
  title: string
  who: Who
  detail?: string
  /** Deadline = anker + dagen. */
  due?: { from: Anchor; days: number }
  /** Stap is vanzelf af zodra deze datum ingevuld is (bv. kick-off gepland). */
  doneWhenSet?: Anchor
}

export const ONBOARDING: StepDef[] = [
  { key: 'contract', title: 'Getekend contract in de groep en in de Drive', who: 'casper', detail: 'In de WhatsApp-groep naar Milan en Cédric (die tekenen ook), daarna in de Drive-map van de klant.', due: { from: 'getekend', days: 7 } },
  { key: 'groep', title: 'WhatsApp-groep met de klant en de freelancer', who: 'cedric', detail: 'Meteen na ondertekening.', due: { from: 'getekend', days: 7 } },
  { key: 'freelancer', title: 'Freelancer regelen (vóór de kick-off)', who: 'milan', detail: 'De freelancer gaat mee in de groep.', due: { from: 'getekend', days: 7 } },
  { key: 'kickoff_plannen', title: 'Kick-off plannen via een poll in de groep', who: 'cedric', due: { from: 'getekend', days: 7 }, doneWhenSet: 'kickoff' },
  { key: 'kickoff', title: 'Kick-off meeting (online)', who: 'cedric', detail: 'Klant, Cédric, Milan en de freelancer. Vragen: zie het kick-off-document.', due: { from: 'kickoff', days: 0 } },
  { key: 'strategie', title: 'Contentstrategie en PowerPoint', who: 'cedric', due: { from: 'kickoff', days: 14 } },
  { key: 'ideeen', title: 'Eerste contentideeën bij de strategie', who: 'milan', due: { from: 'kickoff', days: 14 } },
  { key: 'strategiemeeting', title: 'Strategiemeeting: strategie en ideeën voorstellen', who: 'cedric', due: { from: 'kickoff', days: 14 } },
  { key: 'feedback', title: 'Feedbackronde op de strategie verwerken', who: 'cedric', detail: 'De klant krijgt 1 feedbackronde.', due: { from: 'strategie', days: 7 } },
]

export const CYCLE: StepDef[] = [
  { key: 'draaidag_plannen', title: 'Draaidag plannen', who: 'cedric', doneWhenSet: 'draaidag' },
  { key: 'ideeen_uitwerken', title: 'Ideeën bijschaven, uitschrijven en naar Cédric', who: 'milan', detail: 'De freelancer mag meedenken (bv. via een call), maar hoeft niet.', due: { from: 'draaidag', days: -8 } },
  { key: 'briefing', title: 'Briefing in de groep', who: 'cedric', detail: 'Contentideeën, locatie, wanneer (dag en uren) en met wie.', due: { from: 'draaidag', days: -7 } },
  { key: 'greenlight', title: 'Greenlight van de klant', who: 'klant', detail: '2 dagen om feedback te geven en goed te keuren; snel antwoorden op vragen (materiaal, kostuums).', due: { from: 'draaidag', days: -5 } },
  { key: 'draaidag', title: 'Draaidag', who: 'freelancer', due: { from: 'draaidag', days: 0 } },
  { key: 'montage', title: "Alle video's gemonteerd in de groep", who: 'freelancer', due: { from: 'draaidag', days: 7 } },
  { key: 'revisie', title: 'Revisieronde van de klant', who: 'klant', detail: 'Enkel kleine montage-aanpassingen.', due: { from: 'draaidag', days: 14 } },
  { key: 'online', title: 'Aanpassingen doorgevoerd, eerste video online en contentplanning doorgestuurd', who: 'freelancer', due: { from: 'draaidag', days: 21 } },
]

export const ALL_STEP_KEYS = [...ONBOARDING, ...CYCLE].map((s) => s.key)
export const stepDef = (key: string) => [...ONBOARDING, ...CYCLE].find((s) => s.key === key)

export type Production = {
  client_id: string
  signed_on: string | null
  kickoff_on: string | null
  strategy_on: string | null
  active: boolean
  note: string | null
}
/** Id van de volgende draaidag die nog niet bestaat (verschijnt vanzelf; wordt aangemaakt zodra je iets invult). */
export const NEXT_CYCLE_ID = 'volgende'
export const isNextCycle = (c: Pick<Cycle, 'id'> | null | undefined) => c?.id === NEXT_CYCLE_ID

export type Cycle = { id: string; client_id: string; no: number; shoot_on: string | null; shoot_time: string | null; calendar_event_id?: string | null }
/** Enkel wat afwijkt van de berekening: afgevinkt, eigen deadline, link of notitie. */
export type StepState = { client_id: string; cycle_id: string | null; step: string; done_at: string | null; done_by: string | null; due_on: string | null; link: string | null; note: string | null }

export type Step = StepDef & {
  cycle: Cycle | null
  due_on: string | null
  done: boolean
  done_at: string | null
  done_by: string | null
  link: string | null
  note: string | null
  /** Pas te doen als de vorige stappen af zijn? (enkel voor de weergave) */
  overdue: boolean
}

const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

function anchorDate(a: Anchor, p: Production, c: Cycle | null) {
  if (a === 'getekend') return p.signed_on
  if (a === 'kickoff') return p.kickoff_on
  if (a === 'strategie') return p.strategy_on
  return c?.shoot_on ?? null
}

function build(def: StepDef, p: Production, c: Cycle | null, states: StepState[], today: string, prevShoot: (c: Cycle) => string | null = () => null): Step {
  const st = states.find((s) => s.step === def.key && (s.cycle_id ?? null) === (c?.id ?? null))
  const base = def.due ? anchorDate(def.due.from, p, c) : null
  let due = st?.due_on ?? (base ? addDays(base, def.due!.days) : null)
  // Draaidag plannen: de eerste in de feedbackweek (strategiemeeting + 7), een volgende tegen 21 dagen na de vorige draaidag.
  if (def.key === 'draaidag_plannen' && !st?.due_on && c) {
    const prev = prevShoot(c)
    due = c.no === 1 ? (p.strategy_on ? addDays(p.strategy_on, 7) : null) : prev ? addDays(prev, 21) : null
  }
  // Strategiemeeting: de ingevulde datum is de deadline; vanzelf af als die voorbij is en er een datum staat.
  if (def.key === 'strategiemeeting' && p.strategy_on && !st?.due_on) due = p.strategy_on
  const autoDone = def.doneWhenSet ? Boolean(anchorDate(def.doneWhenSet, p, c)) : false
  const done = Boolean(st?.done_at) || autoDone
  return {
    ...def,
    cycle: c,
    due_on: due,
    done,
    done_at: st?.done_at ?? null,
    done_by: st?.done_by ?? (autoDone ? 'datum ingevuld' : null),
    link: st?.link ?? null,
    note: st?.note ?? null,
    overdue: !done && Boolean(due && due < today),
  }
}

export type ClientProduction = {
  client_id: string
  name: string
  production: Production
  cycles: Cycle[]
  onboarding: Step[]
  /** Stappen per cyclus (draaidag), oudste eerst. */
  cycleSteps: { cycle: Cycle; steps: Step[] }[]
  /** Alle open stappen in volgorde. */
  open: Step[]
  next: Step | null
  phase: string
  /** 0..1 voor de voortgangsbalk (onboarding + huidige cyclus). */
  progress: number
}

export function clientProduction(c: { id: string; name: string }, p: Production, cycles: Cycle[], states: StepState[], today: string): ClientProduction {
  const mine = states.filter((s) => s.client_id === c.id)
  const cs = cycles.filter((x) => x.client_id === c.id).sort((a, b) => a.no - b.no)
  const onboarding = ONBOARDING.map((d) => build(d, p, null, mine, today))
  const prevShoot = (cy: Cycle) => cs.filter((x) => x.no < cy.no && x.shoot_on).at(-1)?.shoot_on ?? null
  // Geen open draaidag meer (of nog geen enkele)? Dan staat de volgende al klaar om te plannen.
  const allDone = cs.every((cy) => CYCLE.every((d) => build(d, p, cy, mine, today).done))
  const withNext = allDone ? [...cs, { id: NEXT_CYCLE_ID, client_id: c.id, no: (cs.at(-1)?.no ?? 0) + 1, shoot_on: null, shoot_time: null }] : cs
  const cycleSteps = withNext.map((cy) => ({ cycle: cy, steps: CYCLE.map((d) => build(d, p, cy, mine, today, prevShoot)) }))
  const open = [...onboarding, ...cycleSteps.flatMap((x) => x.steps)].filter((s) => !s.done)
  const next = open[0] ?? null
  const current = cycleSteps.find((x) => x.steps.some((s) => !s.done)) ?? cycleSteps.at(-1)
  const scope = [...onboarding, ...(current?.steps ?? [])]
  const phase = !next
    ? cs.length
      ? `Draaidag ${cs.at(-1)!.no} afgerond`
      : 'Onboarding afgerond'
    : next.cycle
      ? `Draaidag ${next.cycle.no}: ${lcFirst(next.title)}`
      : `Opstart: ${lcFirst(next.title)}`
  return { client_id: c.id, name: c.name, production: p, cycles: cs, onboarding, cycleSteps, open, next, phase, progress: scope.length ? scope.filter((s) => s.done).length / scope.length : 0 }
}

/**
 * Open stappen voor één teamlid, over alle klanten: eigen stappen en wat hij opvolgt (freelancer → Milan,
 * klant → Cédric). Per klant enkel de stappen die nu aan de beurt zijn (de eerste open stap per fase).
 */
export function myNextSteps(all: ClientProduction[], who: 'casper' | 'cedric' | 'milan') {
  const out: { client: ClientProduction; step: Step }[] = []
  for (const cp of all) {
    if (!cp.production.active) continue
    // Stappen die nu kunnen: de open onboardingstappen tot en met de eerstvolgende met een datum,
    // en in elke cyclus de eerste open stap(pen) met dezelfde deadline.
    const now = upcoming(cp)
    for (const s of now) if (FOLLOWS_UP[s.who] === who) out.push({ client: cp, step: s })
  }
  return out.sort((a, b) => (a.step.due_on ?? '9999').localeCompare(b.step.due_on ?? '9999') || a.client.name.localeCompare(b.client.name))
}

/** De stappen die nu aan de beurt zijn: alle open stappen met de vroegste deadline per blok (+ die zonder datum vooraan). */
export function upcoming(cp: ClientProduction): Step[] {
  const blocks = [cp.onboarding, ...cp.cycleSteps.map((x) => x.steps)]
  const out: Step[] = []
  for (const b of blocks) {
    const open = b.filter((s) => !s.done)
    if (!open.length) continue
    const first = open[0]
    // Gelijktijdige stappen (zelfde deadline of zelfde anker) samen tonen.
    const sameSlot = (s: Step) =>
      s === first || (s.due_on ? s.due_on === first.due_on : !first.due_on && s.due?.from === first.due?.from && s.due?.days === first.due?.days)
    out.push(...open.filter(sameSlot))
    // Onboarding moet af voor de cyclus echt loopt (behalve in de feedbackweek: dan plant Cédric al de
    // eerste draaidag); cycli lopen wel parallel aan elkaar.
    if (b === cp.onboarding && open.some((s) => s.key !== 'feedback')) break
  }
  return out
}

/** Startpunt ("we zitten nu hier"): alle stappen vóór deze stap worden afgevinkt. */
export function stepsBefore(stepKey: string, cycleNo: number | null): { cycleNo: number | null; step: string }[] {
  const out: { cycleNo: number | null; step: string }[] = []
  const inOnb = ONBOARDING.findIndex((s) => s.key === stepKey)
  if (inOnb >= 0) return ONBOARDING.slice(0, inOnb).map((s) => ({ cycleNo: null, step: s.key }))
  const inCycle = CYCLE.findIndex((s) => s.key === stepKey)
  if (inCycle < 0) throw new Error(`Onbekende stap "${stepKey}".`)
  out.push(...ONBOARDING.map((s) => ({ cycleNo: null, step: s.key })))
  const n = cycleNo ?? 1
  for (let k = 1; k < n; k++) out.push(...CYCLE.map((s) => ({ cycleNo: k, step: s.key })))
  out.push(...CYCLE.slice(0, inCycle).map((s) => ({ cycleNo: n, step: s.key })))
  return out
}
