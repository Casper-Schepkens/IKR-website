/**
 * Productieproces van de content, per klant: eenmalig de opstart, daarna een cyclus per draaidag.
 * De stappen staan in de database: een workflow-sjabloon (voor nieuwe klanten) en per klant een
 * aanpasbare kopie. Elke stap heeft een eigenaar, een volgorde en een deadlineregel (zie rules.ts).
 * Per draaidag wordt enkel bewaard wat afwijkt: afgevinkt, eigen deadline, link of notitie.
 */
import { addDays, cleanRule, currentOccurrence, ruleDue, ruleSlot, type Anchor, type Rhythm, type Rule, type Schedule } from './rules'

export { ANCHOR_LABEL, type Anchor } from './rules'

export type Who = 'casper' | 'cedric' | 'milan' | 'freelancer' | 'klant'
export const OWNERS: Who[] = ['casper', 'cedric', 'milan', 'freelancer', 'klant']
export const WHO_LABEL: Record<Who, string> = { casper: 'Casper', cedric: 'Cédric', milan: 'Milan', freelancer: 'Freelancer', klant: 'Klant' }
export type TeamMember = 'casper' | 'cedric' | 'milan'
/** Wie een stap van de freelancer of de klant opvolgt. */
export const FOLLOWS_UP: Record<Who, TeamMember> = { casper: 'casper', cedric: 'cedric', milan: 'milan', freelancer: 'milan', klant: 'cedric' }

export type Phase = 'opstart' | 'draaidag'
export const PHASE_LABEL: Record<Phase, string> = { opstart: 'Opstart', draaidag: 'Per draaidag' }

/** Een stap in het sjabloon of in de kopie van een klant. */
export type StepDef = {
  id: string
  key: string
  phase: Phase
  position: number
  title: string
  owner: Who
  rule: Rule
  /** Vanzelf af zodra deze datum ingevuld is (kick-off gepland, draaidag gepland). */
  done_when: Anchor | null
  /** Dit is de draaidag zelf: af = met een ritme wordt de volgende draaidag aangemaakt. */
  is_shoot: boolean
  link: string | null
  note: string | null
}
export type TemplateStep = StepDef & { template_id: string }
export type ClientStep = StepDef & { client_id: string }
export type Template = { id: string; name: string; is_default: boolean }

export type Production = {
  client_id: string
  signed_on: string | null
  kickoff_on: string | null
  strategy_on: string | null
  active: boolean
  note: string | null
  rhythm: Rhythm | null
}
/** Id van de volgende draaidag die nog niet bestaat (verschijnt vanzelf; wordt aangemaakt zodra je iets invult). */
export const NEXT_CYCLE_ID = 'volgende'
export const isNextCycle = (c: Pick<Cycle, 'id'> | null | undefined) => c?.id === NEXT_CYCLE_ID

export type Cycle = { id: string; client_id: string; no: number; shoot_on: string | null; shoot_time: string | null; calendar_event_id?: string | null }
/** Enkel wat afwijkt van de berekening: afgevinkt, eigen deadline, link of notitie. */
export type StepState = { id?: string; client_id: string; cycle_id: string | null; step: string; done_at: string | null; done_by: string | null; due_on: string | null; link: string | null; note: string | null }

export type Step = {
  key: string
  title: string
  owner: Who
  phase: Phase
  rule: Rule
  done_when: Anchor | null
  is_shoot: boolean
  /** Uitleg bij de stap (notitie van de stapdefinitie). */
  detail: string | null
  cycle: Cycle | null
  due_on: string | null
  done: boolean
  done_at: string | null
  done_by: string | null
  /** Link van deze keer, anders die van de stapdefinitie. */
  link: string | null
  /** Notitie van deze keer. */
  note: string | null
  overdue: boolean
  /** Deadline, of (zonder datum) welk deel van de regel geldt: stappen met hetzelfde slot horen samen. */
  slot: string
}

const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
export const byPosition = <T extends { position: number; key: string }>(a: T, b: T) => a.position - b.position || a.key.localeCompare(b.key)

function build(def: StepDef, p: Production, c: Cycle | null, states: StepState[], today: string, prevCycle: (c: Cycle) => Cycle | null): Step {
  const st = states.find((s) => s.step === def.key && (s.cycle_id ?? null) === (c?.id ?? null))
  const anchor = (a: Anchor): string | null => {
    if (a === 'getekend') return p.signed_on
    if (a === 'kickoff') return p.kickoff_on
    if (a === 'strategie') return p.strategy_on
    if (a === 'draaidag') return c?.shoot_on ?? null
    return c ? (prevCycle(c)?.shoot_on ?? null) : null
  }
  const ctx = { anchor, hasPrevious: Boolean(c && prevCycle(c)), defaultAnchor: def.phase === 'draaidag' ? ('draaidag' as const) : ('getekend' as const) }
  const due = st?.due_on ?? ruleDue(def.rule, ctx)
  const autoDone = def.done_when ? Boolean(anchor(def.done_when)) : false
  const done = Boolean(st?.done_at) || autoDone
  return {
    key: def.key,
    title: def.title,
    owner: def.owner,
    phase: def.phase,
    rule: def.rule,
    done_when: def.done_when,
    is_shoot: def.is_shoot,
    detail: def.note,
    cycle: c,
    due_on: due,
    done,
    done_at: st?.done_at ?? null,
    done_by: st?.done_by ?? (autoDone ? 'datum ingevuld' : null),
    link: st?.link ?? def.link ?? null,
    note: st?.note ?? null,
    overdue: !done && Boolean(due && due < today),
    slot: due ?? ruleSlot(def.rule, ctx),
  }
}

export type ClientProduction = {
  client_id: string
  name: string
  production: Production
  /** De stappen van deze klant (eigen kopie, of het sjabloon als er nog geen kopie is). */
  defs: StepDef[]
  /** true = de stappen komen nog rechtstreeks uit het sjabloon (nog niet aangepast). */
  fromTemplate: boolean
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

export function clientProduction(
  c: { id: string; name: string },
  p: Production,
  cycles: Cycle[],
  states: StepState[],
  defs: StepDef[],
  today: string,
  fromTemplate = false,
): ClientProduction {
  const mine = states.filter((s) => s.client_id === c.id)
  const cs = cycles.filter((x) => x.client_id === c.id).sort((a, b) => a.no - b.no)
  const onb = defs.filter((d) => d.phase === 'opstart').sort(byPosition)
  const cyc = defs.filter((d) => d.phase === 'draaidag').sort(byPosition)
  const prevCycle = (cy: Cycle) => cs.filter((x) => x.no < cy.no).at(-1) ?? null
  const onboarding = onb.map((d) => build(d, p, null, mine, today, prevCycle))
  // Geen open draaidag meer (of nog geen enkele)? Dan staat de volgende al klaar om te plannen.
  const allDone = cyc.length > 0 && cs.every((cy) => cyc.every((d) => build(d, p, cy, mine, today, prevCycle).done))
  const virtual: Cycle = { id: NEXT_CYCLE_ID, client_id: c.id, no: (cs.at(-1)?.no ?? 0) + 1, shoot_on: null, shoot_time: null }
  const withNext = allDone ? [...cs, virtual] : cs
  const prevOf = (cy: Cycle) => (cy.id === NEXT_CYCLE_ID ? (cs.at(-1) ?? null) : prevCycle(cy))
  const cycleSteps = withNext.map((cy) => ({ cycle: cy, steps: cyc.map((d) => build(d, p, cy, mine, today, prevOf)) }))
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
  return {
    client_id: c.id,
    name: c.name,
    production: p,
    defs: [...onb, ...cyc],
    fromTemplate,
    cycles: cs,
    onboarding,
    cycleSteps,
    open,
    next,
    phase,
    progress: scope.length ? scope.filter((s) => s.done).length / scope.length : 0,
  }
}

/** De stappen die nu aan de beurt zijn: alle open stappen met de vroegste deadline per blok (+ die zonder datum vooraan). */
export function upcoming(cp: ClientProduction): Step[] {
  const blocks = [cp.onboarding, ...cp.cycleSteps.map((x) => x.steps)]
  const lastOnboarding = cp.onboarding.at(-1)?.key
  const out: Step[] = []
  for (const b of blocks) {
    const open = b.filter((s) => !s.done)
    if (!open.length) continue
    const first = open[0]
    // Gelijktijdige stappen (zelfde deadline, of zonder deadline met dezelfde regel) samen tonen.
    const sameSlot = (s: Step) => s === first || s.slot === first.slot
    out.push(...open.filter(sameSlot))
    // De opstart moet af voor de draaidagen echt lopen; enkel tijdens de laatste opstartstap (bv. de
    // feedbackweek) plant het team al de eerste draaidag. Draaidagen lopen wel parallel aan elkaar.
    if (b === cp.onboarding && open.some((s) => s.key !== lastOnboarding)) break
  }
  return out
}

/**
 * Open stappen voor één teamlid, over alle klanten: eigen stappen en wat hij opvolgt (freelancer → Milan,
 * klant → Cédric). Per klant enkel de stappen die nu aan de beurt zijn.
 */
export function myNextSteps(all: ClientProduction[], who: TeamMember) {
  const out: { client: ClientProduction; step: Step }[] = []
  for (const cp of all) {
    if (!cp.production.active) continue
    for (const s of upcoming(cp)) if (FOLLOWS_UP[s.owner] === who) out.push({ client: cp, step: s })
  }
  return out.sort((a, b) => (a.step.due_on ?? '9999').localeCompare(b.step.due_on ?? '9999') || a.client.name.localeCompare(b.client.name))
}

/** Startpunt ("we zitten nu hier"): alle stappen vóór deze stap worden afgevinkt. */
export function stepsBefore(defs: StepDef[], stepKey: string, cycleNo: number | null): { cycleNo: number | null; step: string }[] {
  const onb = defs.filter((d) => d.phase === 'opstart').sort(byPosition)
  const cyc = defs.filter((d) => d.phase === 'draaidag').sort(byPosition)
  const inOnb = onb.findIndex((s) => s.key === stepKey)
  if (inOnb >= 0) return onb.slice(0, inOnb).map((s) => ({ cycleNo: null, step: s.key }))
  const inCycle = cyc.findIndex((s) => s.key === stepKey)
  if (inCycle < 0) throw new Error(`Onbekende stap "${stepKey}". Kies uit: ${defs.map((d) => d.key).join(', ')}.`)
  const out: { cycleNo: number | null; step: string }[] = onb.map((s) => ({ cycleNo: null, step: s.key }))
  const n = cycleNo ?? 1
  for (let k = 1; k < n; k++) out.push(...cyc.map((s) => ({ cycleNo: k, step: s.key })))
  out.push(...cyc.slice(0, inCycle).map((s) => ({ cycleNo: n, step: s.key })))
  return out
}

/** Unieke sleutel voor een nieuwe stap (uit de titel). */
export function newStepKey(title: string, taken: string[]) {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'stap'
  if (!taken.includes(base)) return base
  for (let i = 2; ; i++) if (!taken.includes(`${base}_${i}`)) return `${base}_${i}`
}

// ─── Intern: terugkerende taken zonder klant ────────────
export type InternalTask = {
  id: string
  title: string
  owner: TeamMember
  schedule: Schedule
  link: string | null
  note: string | null
  active: boolean
  start_on: string
}
export type InternalDone = { id?: string; task_id: string; occurrence: string; done_at: string; done_by: string | null }
export type InternalItem = { task: InternalTask; due_on: string; overdue: boolean; last_done: InternalDone | null }

export function internalItems(tasks: InternalTask[], done: InternalDone[], today: string): InternalItem[] {
  return tasks
    .filter((t) => t.active)
    .map((t) => {
      const mine = done.filter((d) => d.task_id === t.id)
      const due = currentOccurrence(t.schedule, t.start_on, new Set(mine.map((d) => d.occurrence)), today)
      const last = mine.sort((a, b) => b.occurrence.localeCompare(a.occurrence))[0] ?? null
      return { task: t, due_on: due, overdue: due < today, last_done: last }
    })
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.task.title.localeCompare(b.task.title))
}

export const myInternalItems = (items: InternalItem[], who: TeamMember) => items.filter((i) => i.task.owner === who)

// ─── Standaard-sjabloon (zoals Cédric het proces uitlegde) ───
type Seed = Omit<StepDef, 'id' | 'position' | 'phase' | 'link' | 'note' | 'done_when' | 'is_shoot'> & Partial<Pick<StepDef, 'note' | 'done_when' | 'is_shoot'>>
const off = (anchor: Anchor, days: number, fallback?: { anchor: Anchor; days: number }): Rule => ({ kind: 'offset', anchor, days, ...(fallback ? { fallback } : {}) })
const SEED_ONBOARDING: Seed[] = [
  { key: 'contract', title: 'Getekend contract in de groep en in de Drive', owner: 'casper', note: 'In de WhatsApp-groep naar Milan en Cédric (die tekenen ook), daarna in de Drive-map van de klant.', rule: off('getekend', 7) },
  { key: 'groep', title: 'WhatsApp-groep met de klant en de freelancer', owner: 'cedric', note: 'Meteen na ondertekening.', rule: off('getekend', 7) },
  { key: 'freelancer', title: 'Freelancer regelen (vóór de kick-off)', owner: 'milan', note: 'De freelancer gaat mee in de groep.', rule: off('getekend', 7) },
  { key: 'kickoff_plannen', title: 'Kick-off plannen via een poll in de groep', owner: 'cedric', rule: off('getekend', 7), done_when: 'kickoff' },
  { key: 'kickoff', title: 'Kick-off meeting (online)', owner: 'cedric', note: 'Klant, Cédric, Milan en de freelancer. Vragen: zie het kick-off-document.', rule: off('kickoff', 0) },
  { key: 'strategie', title: 'Contentstrategie en PowerPoint', owner: 'cedric', rule: off('kickoff', 14) },
  { key: 'ideeen', title: 'Eerste contentideeën bij de strategie', owner: 'milan', rule: off('kickoff', 14) },
  { key: 'strategiemeeting', title: 'Strategiemeeting: strategie en ideeën voorstellen', owner: 'cedric', rule: off('strategie', 0, { anchor: 'kickoff', days: 14 }) },
  { key: 'feedback', title: 'Feedbackronde op de strategie verwerken', owner: 'cedric', note: 'De klant krijgt 1 feedbackronde.', rule: off('strategie', 7) },
]
const SEED_CYCLE: Seed[] = [
  { key: 'draaidag_plannen', title: 'Draaidag plannen', owner: 'cedric', rule: off('vorige_draaidag', 21, { anchor: 'strategie', days: 7 }), done_when: 'draaidag' },
  { key: 'ideeen_uitwerken', title: 'Ideeën bijschaven, uitschrijven en naar Cédric', owner: 'milan', note: 'De freelancer mag meedenken (bv. via een call), maar hoeft niet.', rule: off('draaidag', -8) },
  { key: 'briefing', title: 'Briefing in de groep', owner: 'cedric', note: 'Contentideeën, locatie, wanneer (dag en uren) en met wie.', rule: off('draaidag', -7) },
  { key: 'greenlight', title: 'Greenlight van de klant', owner: 'klant', note: '2 dagen om feedback te geven en goed te keuren; snel antwoorden op vragen (materiaal, kostuums).', rule: off('draaidag', -5) },
  { key: 'draaidag', title: 'Draaidag', owner: 'freelancer', rule: off('draaidag', 0), is_shoot: true },
  { key: 'montage', title: "Alle video's gemonteerd in de groep", owner: 'freelancer', rule: off('draaidag', 7) },
  { key: 'revisie', title: 'Revisieronde van de klant', owner: 'klant', note: 'Enkel kleine montage-aanpassingen.', rule: off('draaidag', 14) },
  { key: 'online', title: 'Aanpassingen doorgevoerd, eerste video online en contentplanning doorgestuurd', owner: 'freelancer', rule: off('draaidag', 21) },
]
/** Het standaard-sjabloon (ook in de migratie gezaaid); positie per 10, zodat er stappen tussen passen. */
export const DEFAULT_STEPS: Omit<StepDef, 'id'>[] = [
  ...SEED_ONBOARDING.map((s, i) => ({ phase: 'opstart' as const, position: (i + 1) * 10, link: null, note: null, done_when: null, is_shoot: false, ...s })),
  ...SEED_CYCLE.map((s, i) => ({ phase: 'draaidag' as const, position: (i + 1) * 10, link: null, note: null, done_when: null, is_shoot: false, ...s })),
]

/** Rij uit de database → StepDef (regel gecontroleerd). */
export function toStepDef<T extends Record<string, unknown>>(r: T): StepDef & T {
  return {
    ...r,
    id: String(r.id),
    key: String(r.key),
    phase: r.phase === 'draaidag' ? 'draaidag' : 'opstart',
    position: Number(r.position ?? 0),
    title: String(r.title ?? ''),
    owner: (OWNERS.includes(r.owner as Who) ? r.owner : 'cedric') as Who,
    rule: cleanRule(r.rule),
    done_when: (['getekend', 'kickoff', 'strategie', 'draaidag'].includes(r.done_when as string) ? r.done_when : null) as Anchor | null,
    is_shoot: Boolean(r.is_shoot),
    link: (r.link as string | null) ?? null,
    note: (r.note as string | null) ?? null,
  }
}

export { addDays }

// ─── Productie op de weekly ─────────────────────────────
export type WeeklyProductionItem =
  | { kind: 'step'; clientId: string; clientName: string; step: Step; due_on: string | null; overdue: boolean }
  | { kind: 'intern'; item: InternalItem; due_on: string; overdue: boolean }

/**
 * "Uit Productie" op de weekly, voor één teamlid: wat nu aan de beurt is (zelfde logica als de
 * volgende stappen: eigen stappen, Milan volgt de freelancer op, Cédric de klant) plus de interne
 * taken, met een deadline op of vóór de dag van de volgende weekly, of te laat. Berekend, geen kopie.
 */
export function weeklyProductionItems(list: ClientProduction[], internal: InternalItem[], who: TeamMember, until: string): WeeklyProductionItem[] {
  const due = (d: string | null, overdue: boolean) => overdue || Boolean(d && d <= until)
  const steps: WeeklyProductionItem[] = myNextSteps(list, who)
    .filter(({ step }) => due(step.due_on, step.overdue))
    .map(({ client, step }) => ({ kind: 'step', clientId: client.client_id, clientName: client.name, step, due_on: step.due_on, overdue: step.overdue }))
  const tasks: WeeklyProductionItem[] = myInternalItems(internal, who)
    .filter((i) => due(i.due_on, i.overdue))
    .map((item) => ({ kind: 'intern', item, due_on: item.due_on, overdue: item.overdue }))
  return [...steps, ...tasks].sort((a, b) => (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999'))
}
