import 'server-only'
import { createAllDayEvent, deleteEvent, isGoogleConfigured, listConnections } from '../google'
import { inviteAddresses } from '../team/invites'
import { CONTACT_EMAIL, TEAM } from '../weekly/types'
import {
  byPosition,
  clientProduction,
  internalItems,
  newStepKey,
  OWNERS,
  stepsBefore,
  toStepDef,
  WHO_LABEL,
  type ClientProduction,
  type ClientStep,
  type Cycle,
  type InternalDone,
  type InternalTask,
  type Phase,
  type Production,
  type StepDef,
  type StepState,
  type TeamMember,
  type Template,
  type TemplateStep,
  type Who,
  type WeeklyProductionItem,
  weeklyProductionItems,
} from './core'
import { isoDay } from '../format'
import {
  addDays,
  cleanRhythm,
  cleanSchedule,
  isDate,
  nextShootDate,
  parseRhythm,
  parseRule,
  parseSchedule,
  rhythmLabel,
  ruleLabel,
  scheduleLabel,
  type Anchor,
  type Rhythm,
  type Rule,
  type Schedule,
} from './rules'
import { ChangeSet, revertChange, TABLES, type ProductionStore, type Row } from './store'
import { todayBrussels } from '../dates'

export type ProductionRepo = ProductionStore
type ClientRef = { id: string; name: string }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
/** Vandaag in Brussel (was UTC: tussen middernacht en 1 à 2 uur nog gisteren). */
export const today = () => todayBrussels()

// ─── Lezen ─────────────────────────────────────────────────
export type ProductionData = {
  productions: Production[]
  cycles: Cycle[]
  states: StepState[]
  clientSteps: ClientStep[]
  templates: Template[]
  templateSteps: TemplateStep[]
  tasks: InternalTask[]
  done: InternalDone[]
}

export async function loadData(repo: ProductionRepo): Promise<ProductionData> {
  const [p, c, s, cs, t, ts, it, id] = await Promise.all(TABLES.map((x) => repo.all(x)))
  return {
    productions: p.map((r) => ({ ...(r as unknown as Production), rhythm: cleanRhythm(r.rhythm) })),
    cycles: c as unknown as Cycle[],
    states: s as unknown as StepState[],
    clientSteps: cs.map((r) => toStepDef(r) as unknown as ClientStep),
    templates: t as unknown as Template[],
    templateSteps: ts.map((r) => toStepDef(r) as unknown as TemplateStep),
    tasks: it.flatMap((r) => {
      const schedule = cleanSchedule(r.schedule)
      return schedule ? [{ ...(r as unknown as InternalTask), schedule }] : []
    }),
    done: id as unknown as InternalDone[],
  }
}

export function defaultTemplate(d: ProductionData) {
  const template = d.templates.find((t) => t.is_default) ?? d.templates[0]
  if (!template) throw new Error('Er is nog geen workflow-sjabloon.')
  return { template, steps: d.templateSteps.filter((s) => s.template_id === template.id).sort((a, b) => (a.phase === b.phase ? byPosition(a, b) : a.phase === 'opstart' ? -1 : 1)) }
}

/** Stappen van een klant: de eigen kopie, of (nog niet gekopieerd) het standaard-sjabloon. */
export function defsFor(d: ProductionData, clientId: string): { defs: StepDef[]; fromTemplate: boolean } {
  const own = d.clientSteps.filter((s) => s.client_id === clientId)
  if (own.length) return { defs: own, fromTemplate: false }
  try {
    return { defs: defaultTemplate(d).steps, fromTemplate: true }
  } catch {
    return { defs: [], fromTemplate: true }
  }
}

/** Alle klanten met hun productie (klanten zonder productie apart), de interne taken en het sjabloon. */
export async function loadProduction(repo: ProductionRepo, clients: ClientRef[], day = today()) {
  const d = await loadData(repo)
  const started = new Map(d.productions.map((p) => [p.client_id, p]))
  const list: ClientProduction[] = clients
    .filter((c) => started.has(c.id))
    .map((c) => {
      const { defs, fromTemplate } = defsFor(d, c.id)
      return clientProduction(c, started.get(c.id)!, d.cycles, d.states, defs, day, fromTemplate)
    })
  let template: ReturnType<typeof defaultTemplate> | null = null
  try {
    template = defaultTemplate(d)
  } catch {
    template = null
  }
  return { list, notStarted: clients.filter((c) => !started.has(c.id)), internal: internalItems(d.tasks, d.done, day), tasks: d.tasks, template }
}

/**
 * "Uit Productie" voor de weekly, per teamlid: tot en met de dag van de volgende weekly (of de komende
 * 7 dagen als er nog geen gepland is), plus alles wat te laat is. Telkens berekend uit Productie.
 */
export async function weeklyProduction(repo: ProductionRepo, clients: ClientRef[], next: { starts_at: string } | null, day = today()) {
  const { list, internal } = await loadProduction(repo, clients, day)
  const until = next ? isoDay(new Date(next.starts_at)) : addDays(day, 7)
  const members: TeamMember[] = ['casper', 'cedric', 'milan']
  return { until, planned: Boolean(next), byOwner: Object.fromEntries(members.map((m) => [m, weeklyProductionItems(list, internal, m, until)])) as Record<TeamMember, WeeklyProductionItem[]> }
}

export async function getClientProduction(repo: ProductionRepo, client: ClientRef) {
  const { list } = await loadProduction(repo, [client])
  const cp = list[0]
  if (!cp) throw new Error(`Voor ${client.name} is de productie nog niet gestart.`)
  return cp
}

// ─── Controle van invoer ─────────────────────────────────
const checkDate = (v: string | null | undefined, label: string) => {
  const d = v?.trim() || null
  if (d && (!DATE.test(d) || !isDate(d))) throw new Error(`${label}: gebruik JJJJ-MM-DD.`)
  return d
}
const checkLink = (v: string | null | undefined) => {
  if (v === undefined) return undefined
  const l = v?.trim() || null
  if (l && !/^https:\/\//.test(l)) throw new Error('Link moet met https:// beginnen.')
  return l
}
const checkText = (v: string | null | undefined, max: number) => (v === undefined ? undefined : v?.trim().slice(0, max) || null)
const OWNER_WORDS: Record<string, Who> = { casper: 'casper', cedric: 'cedric', cédric: 'cedric', milan: 'milan', freelancer: 'freelancer', klant: 'klant' }
export function checkOwner(v: string): Who {
  const o = OWNER_WORDS[v.trim().toLowerCase()] ?? (OWNERS.includes(v as Who) ? (v as Who) : undefined)
  if (!o) throw new Error(`Onbekende eigenaar "${v}". Kies ${OWNERS.map((x) => WHO_LABEL[x]).join(', ')}.`)
  return o
}
export function checkMember(v: string): TeamMember {
  const o = checkOwner(v)
  if (o === 'freelancer' || o === 'klant') throw new Error('Een interne taak is voor Casper, Cédric of Milan.')
  return o
}
const toRule = (v: Rule | string) => (typeof v === 'string' ? parseRule(v) : v)

// ─── Productie per klant ─────────────────────────────────
/** Kopieert het standaard-sjabloon naar de klant als die nog geen eigen stappen heeft. */
async function ensureClientSteps(cs: ChangeSet, d: ProductionData, clientId: string) {
  if (d.clientSteps.some((s) => s.client_id === clientId)) return d.clientSteps.filter((s) => s.client_id === clientId)
  const { steps } = defaultTemplate(d)
  const out: ClientStep[] = []
  for (const s of steps) {
    const row = await cs.insert('production_client_steps', { client_id: clientId, phase: s.phase, position: s.position, key: s.key, title: s.title, owner: s.owner, rule: s.rule, done_when: s.done_when, is_shoot: s.is_shoot, link: s.link, note: s.note })
    out.push(toStepDef(row) as unknown as ClientStep)
  }
  d.clientSteps.push(...out)
  return out
}

async function ensureProductionRow(cs: ChangeSet, d: ProductionData, clientId: string, patch: Row = {}) {
  const p = d.productions.find((x) => x.client_id === clientId)
  if (p) {
    if (Object.keys(patch).length) await cs.update('production', clientId, { ...patch, updated_at: new Date().toISOString() })
  } else {
    const row = await cs.insert('production', { client_id: clientId, ...patch })
    d.productions.push({ ...(row as unknown as Production), rhythm: cleanRhythm(row.rhythm) })
  }
  await ensureClientSteps(cs, d, clientId)
}

export async function startProduction(repo: ProductionRepo, client: ClientRef, signedOn: string | null | undefined, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, `${client.name}: productie gestart`, client.id)
  await ensureProductionRow(cs, d, client.id, { ...(signedOn !== undefined ? { signed_on: checkDate(signedOn, 'Contract getekend') } : {}), active: true })
  await cs.commit()
}

export async function setActive(repo: ProductionRepo, client: ClientRef, active: boolean, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, `${client.name}: productie ${active ? 'actief' : 'gepauzeerd'}`, client.id)
  await ensureProductionRow(cs, d, client.id, { active })
  await cs.commit()
}

function cycleNoFor(d: ProductionData, clientId: string, no: number | null | undefined): { cycle: Cycle | null; no: number } {
  const mine = d.cycles.filter((c) => c.client_id === clientId).sort((a, b) => a.no - b.no)
  if (no == null) {
    // Geen nummer: de eerste draaidag zonder datum of de laatste; anders een nieuwe.
    const target = mine.find((c) => !c.shoot_on) ?? mine.at(-1)
    return target ? { cycle: target, no: target.no } : { cycle: null, no: 1 }
  }
  const hit = mine.find((c) => c.no === no)
  if (hit) return { cycle: hit, no }
  if (no > (mine.at(-1)?.no ?? 0) + 1) throw new Error(`Draaidag ${no} bestaat niet (er zijn er ${mine.length}).`)
  return { cycle: null, no }
}

async function cycleByNo(cs: ChangeSet, d: ProductionData, clientId: string, no: number | null | undefined, create = true): Promise<Cycle> {
  const r = cycleNoFor(d, clientId, no)
  if (r.cycle) return r.cycle
  if (!create) throw new Error('Draaidag niet gevonden.')
  const newNo = Math.max(0, ...d.cycles.filter((c) => c.client_id === clientId).map((c) => c.no)) + 1
  const row = (await cs.insert('production_cycles', { client_id: clientId, no: newNo })) as unknown as Cycle
  d.cycles.push(row)
  return row
}

/** Datum zetten: contract getekend, kick-off, strategiemeeting of een draaidag (met optioneel uur). Leeg = wissen. */
export async function setAnchor(repo: ProductionRepo, client: ClientRef, anchor: Exclude<Anchor, 'vorige_draaidag'>, date: string | null, opts: { cycleNo?: number | null; time?: string | null; by: string }) {
  const day = checkDate(date, 'Datum')
  const d = await loadData(repo)
  const label = { getekend: 'contract getekend', kickoff: 'kick-off', strategie: 'strategiemeeting', draaidag: 'draaidag' }[anchor]
  const cs = new ChangeSet(repo, opts.by, `${client.name}: ${label} ${day ?? 'gewist'}`, client.id)
  if (anchor !== 'draaidag') {
    await ensureProductionRow(cs, d, client.id, { [anchor === 'getekend' ? 'signed_on' : anchor === 'kickoff' ? 'kickoff_on' : 'strategy_on']: day })
    await cs.commit()
    return null
  }
  const t = opts.time?.trim() || null
  if (t && !TIME.test(t)) throw new Error('Uur: gebruik UU:MM.')
  await ensureProductionRow(cs, d, client.id)
  const cycle = await cycleByNo(cs, d, client.id, opts.cycleNo)
  cs.summary = `${client.name}: draaidag ${cycle.no} ${day ? `op ${day}${t ? ` ${t}` : ''}` : 'zonder datum'}`
  await cs.update('production_cycles', cycle.id, { shoot_on: day, shoot_time: t })
  await cs.commit()
  await syncShootCalendar(repo, client, { ...cycle, shoot_on: day, shoot_time: t })
  return cycle
}

/** Draaidag in de contact@-agenda (hele dag) met uitnodigingen voor het team; bij een nieuwe datum vervangen. */
async function syncShootCalendar(repo: ProductionRepo, client: ClientRef, cycle: Cycle) {
  try {
    if (!isGoogleConfigured() || !(await listConnections()).some((c) => c.email === CONTACT_EMAIL)) return
    if (cycle.calendar_event_id) await deleteEvent(CONTACT_EMAIL, cycle.calendar_event_id, true).catch(() => undefined)
    let eventId: string | null = null
    if (cycle.shoot_on) {
      const invites = await inviteAddresses()
      eventId = await createAllDayEvent({
        calendarOwner: CONTACT_EMAIL,
        summary: `Draaidag ${client.name}${cycle.shoot_time ? ` (${cycle.shoot_time})` : ''}`,
        date: cycle.shoot_on,
        attendees: [...new Set(TEAM.map((t) => invites[t.key]))],
        description: 'Ingepland via het IKR-dashboard (Productie).',
      })
    }
    // De agenda-koppeling zelf hoort niet in het wijzigingslog.
    if (await repo.get('production_cycles', cycle.id)) await repo.update('production_cycles', cycle.id, { calendar_event_id: eventId })
  } catch (e) {
    console.error('[productie] agenda', e)
  }
}

export async function addShootDay(repo: ProductionRepo, client: ClientRef, date: string | null | undefined, time: string | null | undefined, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, '', client.id)
  await ensureProductionRow(cs, d, client.id)
  const no = Math.max(0, ...d.cycles.filter((c) => c.client_id === client.id).map((c) => c.no)) + 1
  const c = (await cs.insert('production_cycles', { client_id: client.id, no })) as unknown as Cycle
  cs.summary = `${client.name}: draaidag ${c.no} toegevoegd`
  await cs.commit()
  if (date) await setAnchor(repo, client, 'draaidag', date, { cycleNo: c.no, time, by })
  return c
}

export async function removeShootDay(repo: ProductionRepo, client: ClientRef, no: number, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, `${client.name}: draaidag ${no} verwijderd`, client.id)
  const c = await cycleByNo(cs, d, client.id, no, false)
  if (c.calendar_event_id) await syncShootCalendar(repo, client, { ...c, shoot_on: null })
  // Eerst de afgevinkte stappen (anders verdwijnen ze via de cascade buiten het log), dan de draaidag.
  for (const s of d.states.filter((x) => x.cycle_id === c.id)) if (s.id) await cs.remove('production_steps', s.id)
  await cs.remove('production_cycles', c.id)
  await cs.commit()
}

async function setState(cs: ChangeSet, d: ProductionData, clientId: string, cycleId: string | null, step: string, patch: { done?: boolean; by?: string; due_on?: string | null; link?: string | null; note?: string | null }) {
  const row: Row = { updated_at: new Date().toISOString() }
  if (patch.done !== undefined) Object.assign(row, { done_at: patch.done ? new Date().toISOString() : null, done_by: patch.done ? (patch.by ?? null) : null })
  if (patch.due_on !== undefined) row.due_on = patch.due_on
  if (patch.link !== undefined) row.link = patch.link
  if (patch.note !== undefined) row.note = patch.note
  const existing = d.states.find((s) => s.client_id === clientId && (s.cycle_id ?? null) === cycleId && s.step === step)
  // Al zo (bv. al af): niets wijzigen, zodat een afvinkdatum niet verschuift.
  if (existing && patch.done !== undefined && Boolean(existing.done_at) === patch.done && Object.keys(row).length === 3) return
  if (existing?.id) {
    const after = await cs.update('production_steps', existing.id, row)
    if (after) Object.assign(existing, after)
  } else {
    const after = (await cs.insert('production_steps', { client_id: clientId, cycle_id: cycleId, step, ...row })) as unknown as StepState
    d.states.push(after)
  }
}

/** Stap afvinken, terugzetten, eigen deadline, link of notitie. Draaidagstappen: welke draaidag (standaard de huidige). */
export async function updateStep(
  repo: ProductionRepo,
  client: ClientRef,
  step: string,
  patch: { done?: boolean; due_on?: string | null; link?: string | null; note?: string | null },
  opts: { cycleNo?: number | null; by: string },
) {
  const d = await loadData(repo)
  const { defs } = defsFor(d, client.id)
  const def = defs.find((x) => x.key === step)
  if (!def) throw new Error(`Onbekende stap "${step}". Stappen van ${client.name}: ${defs.map((x) => x.key).join(', ')}.`)
  const what = patch.done === true ? 'af' : patch.done === false ? 'terug open' : 'aangepast'
  const cs = new ChangeSet(repo, opts.by, `${client.name}: "${def.title}" ${what}`, client.id)
  await ensureProductionRow(cs, d, client.id)
  let cycle: Cycle | null = null
  if (def.phase === 'draaidag') {
    const p = d.productions.find((x) => x.client_id === client.id)!
    const cp = clientProduction(client, p, d.cycles, d.states, defs, today())
    const no = opts.cycleNo ?? cp.cycleSteps.find((x) => x.steps.some((s) => s.key === step && !s.done))?.cycle.no ?? cp.cycles.at(-1)?.no ?? null
    cycle = await cycleByNo(cs, d, client.id, no)
    cs.summary = `${client.name}: draaidag ${cycle.no}, "${def.title}" ${what}`
  }
  await setState(cs, d, client.id, cycle?.id ?? null, step, {
    done: patch.done,
    by: opts.by,
    due_on: patch.due_on === undefined ? undefined : checkDate(patch.due_on, 'Deadline'),
    link: checkLink(patch.link),
    note: checkText(patch.note, 4000),
  })
  // Draaidag af en een ritme: meteen de volgende draaidag met berekende datum (in dezelfde wijziging).
  const created = patch.done === true && def.is_shoot && cycle ? await planNextByRhythm(cs, d, client, cycle) : null
  await cs.commit()
  if (created) await syncShootCalendar(repo, client, created)
  return created
}

/** Volgende draaidag volgens het ritme, als er na deze nog geen is. */
async function planNextByRhythm(cs: ChangeSet, d: ProductionData, client: ClientRef, after: Cycle): Promise<Cycle | null> {
  const p = d.productions.find((x) => x.client_id === client.id)
  if (!p?.rhythm) return null
  if (d.cycles.some((c) => c.client_id === client.id && c.no > after.no)) return null
  const shoot = nextShootDate(p.rhythm, after.shoot_on, today())
  const row = (await cs.insert('production_cycles', { client_id: client.id, no: after.no + 1, shoot_on: shoot, shoot_time: after.shoot_time ?? null })) as unknown as Cycle
  d.cycles.push(row)
  cs.summary += ` · draaidag ${row.no} gepland op ${shoot} (${rhythmLabel(p.rhythm)})`
  return row
}

/**
 * Zorgt dat draaidag `no + 1` bestaat (voor het ideeëndoc na draaidag `no`). Met een ritme krijgt hij
 * meteen de berekende datum (zoals bij het afvinken van de draaidag), anders geen datum (zoals bij
 * Tempus en Lilalou). Bestaat hij al, dan verandert er niets.
 */
export async function ensureNextCycle(repo: ProductionRepo, client: ClientRef, no: number, by: string): Promise<{ cycle: Cycle; created: boolean }> {
  const d = await loadData(repo)
  const mine = d.cycles.filter((c) => c.client_id === client.id)
  const existing = mine.find((c) => c.no === no + 1)
  if (existing) return { cycle: existing, created: false }
  const after = mine.find((c) => c.no === no)
  if (!after) throw new Error(`Draaidag ${no} van ${client.name} bestaat niet.`)
  const cs = new ChangeSet(repo, by, `${client.name}: draaidag ${no + 1} aangemaakt (zonder datum) voor het ideeëndoc`, client.id)
  await ensureProductionRow(cs, d, client.id)
  const planned = await planNextByRhythm(cs, d, client, after)
  if (planned) cs.summary = `${client.name}: draaidag ${planned.no} aangemaakt voor het ideeëndoc, gepland op ${planned.shoot_on} (${rhythmLabel(d.productions.find((x) => x.client_id === client.id)?.rhythm ?? null)})`
  const cycle = planned ?? ((await cs.insert('production_cycles', { client_id: client.id, no: no + 1 })) as unknown as Cycle)
  await cs.commit()
  if (planned) await syncShootCalendar(repo, client, planned)
  return { cycle, created: true }
}

/** Ritme van de draaidagen ("elke 2e zondag", "elke 3 weken"; null/"geen" = geen ritme). */
export async function setRhythm(repo: ProductionRepo, client: ClientRef, rhythm: Rhythm | string | null, by: string) {
  const r = typeof rhythm === 'string' ? parseRhythm(rhythm) : rhythm
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, `${client.name}: ritme ${rhythmLabel(r)}`, client.id)
  await ensureProductionRow(cs, d, client.id, { rhythm: r })
  const p = d.productions.find((x) => x.client_id === client.id)!
  p.rhythm = r
  // Is de laatste draaidag al gedraaid en staat er nog geen volgende? Dan meteen plannen.
  let created: Cycle | null = null
  const last = d.cycles.filter((c) => c.client_id === client.id).sort((a, b) => a.no - b.no).at(-1)
  const shootKey = defsFor(d, client.id).defs.find((x) => x.is_shoot)?.key
  if (r && last && shootKey && d.states.some((s) => s.cycle_id === last.id && s.step === shootKey && s.done_at)) created = await planNextByRhythm(cs, d, client, last)
  await cs.commit()
  if (created) await syncShootCalendar(repo, client, created)
  return { rhythm: r, created }
}

/**
 * "We zitten nu hier": alles vóór deze stap wordt afgevinkt, deze stap en wat erna komt (in die fase) staat open.
 * Voor klanten die niet van nul beginnen. Ontbrekende draaidagen worden aangemaakt.
 */
export async function setStartPoint(repo: ProductionRepo, client: ClientRef, step: string, cycleNo: number | null, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, '', client.id)
  await ensureProductionRow(cs, d, client.id)
  const defs = d.clientSteps.filter((s) => s.client_id === client.id)
  const def = defs.find((x) => x.key === step)
  if (!def) throw new Error(`Onbekende stap "${step}". Stappen van ${client.name}: ${defs.map((x) => x.key).join(', ')}.`)
  const onb = def.phase === 'opstart'
  cs.summary = `${client.name}: startpunt gezet op "${def.title}"${onb ? '' : ` (draaidag ${cycleNo ?? 1})`}`
  const before = stepsBefore(defs, step, onb ? null : (cycleNo ?? 1))
  const ids = new Map<number, string>()
  const idFor = async (no: number) => {
    if (!ids.has(no)) ids.set(no, (await cycleByNo(cs, d, client.id, no)).id)
    return ids.get(no)!
  }
  for (const b of before) await setState(cs, d, client.id, b.cycleNo == null ? null : await idFor(b.cycleNo), b.step, { done: true, by: `${by} (startpunt)` })
  // Vanaf deze stap open (binnen dezelfde fase).
  const block = defs.filter((x) => x.phase === def.phase).sort(byPosition)
  const from = block.findIndex((s) => s.key === step)
  const cid = onb ? null : await idFor(cycleNo ?? 1)
  for (const s of block.slice(from)) await setState(cs, d, client.id, cid, s.key, { done: false })
  await cs.commit()
}

// ─── Stappen aanpassen (sjabloon of per klant) ──────────
export type StepTarget = { kind: 'client'; client: ClientRef } | { kind: 'template'; templateId?: string }
type StepInput = { phase: Phase; title: string; owner: string; rule?: Rule | string; link?: string | null; note?: string | null; after?: string | null; position?: number | null }
type StepPatch = { title?: string; owner?: string; rule?: Rule | string; link?: string | null; note?: string | null }

async function targetSteps(cs: ChangeSet, d: ProductionData, t: StepTarget) {
  if (t.kind === 'client') {
    if (!d.productions.some((p) => p.client_id === t.client.id)) throw new Error(`Voor ${t.client.name} is de productie nog niet gestart.`)
    const steps = await ensureClientSteps(cs, d, t.client.id)
    return { table: 'production_client_steps' as const, steps: steps as StepDef[], owner: { client_id: t.client.id }, label: t.client.name }
  }
  const template = t.templateId ? d.templates.find((x) => x.id === t.templateId) : defaultTemplate(d).template
  if (!template) throw new Error('Sjabloon niet gevonden.')
  return { table: 'production_template_steps' as const, steps: d.templateSteps.filter((s) => s.template_id === template.id) as StepDef[], owner: { template_id: template.id }, label: `sjabloon ${template.name}` }
}

/** Posities van een fase opnieuw nummeren (10, 20, 30 …) in de gegeven volgorde. */
async function renumber(cs: ChangeSet, table: 'production_client_steps' | 'production_template_steps', ordered: StepDef[]) {
  for (const [i, s] of ordered.entries()) {
    const position = (i + 1) * 10
    if (s.position !== position) {
      await cs.update(table, s.id, { position })
      s.position = position
    }
  }
}

function findStep(steps: StepDef[], key: string, label: string) {
  const s = steps.find((x) => x.key === key.trim())
  if (!s) throw new Error(`Geen stap "${key}" bij ${label}. Stappen: ${steps.map((x) => x.key).join(', ')}.`)
  return s
}

export async function addStepDef(repo: ProductionRepo, target: StepTarget, input: StepInput, by: string) {
  const title = input.title?.trim()
  if (!title) throw new Error('Geef de stap een naam.')
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, '', target.kind === 'client' ? target.client.id : null)
  const t = await targetSteps(cs, d, target)
  const phase: Phase = input.phase === 'draaidag' ? 'draaidag' : 'opstart'
  const list = t.steps.filter((s) => s.phase === phase).sort(byPosition)
  const key = newStepKey(title, t.steps.map((s) => s.key))
  const row = toStepDef(
    await cs.insert(t.table, {
      ...t.owner,
      phase,
      key,
      title: title.slice(0, 200),
      owner: checkOwner(input.owner),
      rule: input.rule == null ? { kind: 'none' } : toRule(input.rule),
      link: checkLink(input.link) ?? null,
      note: checkText(input.note, 2000) ?? null,
      position: 0,
    }),
  )
  // Plaats: na een stap, op een positie (1 = eerst), of achteraan.
  let index = list.length
  if (input.after !== undefined && input.after !== null) index = list.indexOf(findStep(list, input.after, t.label)) + 1
  else if (input.position) index = Math.min(Math.max(1, input.position), list.length + 1) - 1
  list.splice(index, 0, row)
  await renumber(cs, t.table, list)
  cs.summary = `${t.label}: stap "${row.title}" toegevoegd (${phase === 'opstart' ? 'opstart' : 'per draaidag'}, plaats ${index + 1})`
  await cs.commit()
  return row
}

export async function updateStepDef(repo: ProductionRepo, target: StepTarget, key: string, patch: StepPatch, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, '', target.kind === 'client' ? target.client.id : null)
  const t = await targetSteps(cs, d, target)
  const s = findStep(t.steps, key, t.label)
  const row: Row = {}
  const what: string[] = []
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new Error('De naam mag niet leeg zijn.')
    row.title = patch.title.trim().slice(0, 200)
    what.push(`naam "${row.title}"`)
  }
  if (patch.owner !== undefined) {
    row.owner = checkOwner(patch.owner)
    what.push(`eigenaar ${WHO_LABEL[row.owner as Who]}`)
  }
  if (patch.rule !== undefined) {
    row.rule = toRule(patch.rule)
    what.push(`deadline ${ruleLabel(row.rule as Rule)}`)
  }
  if (patch.link !== undefined) {
    row.link = checkLink(patch.link)
    what.push('link')
  }
  if (patch.note !== undefined) {
    row.note = checkText(patch.note, 2000)
    what.push('notitie')
  }
  if (!what.length) throw new Error('Niets om aan te passen.')
  cs.summary = `${t.label}: "${s.title}": ${what.join(', ')}`
  await cs.update(t.table, s.id, row)
  await cs.commit()
}

export async function removeStepDef(repo: ProductionRepo, target: StepTarget, key: string, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, '', target.kind === 'client' ? target.client.id : null)
  const t = await targetSteps(cs, d, target)
  const s = findStep(t.steps, key, t.label)
  if (t.steps.filter((x) => x.phase === s.phase).length <= 1) throw new Error('De laatste stap van een fase kan niet weg.')
  cs.summary = `${t.label}: stap "${s.title}" verwijderd`
  await cs.remove(t.table, s.id)
  await renumber(cs, t.table, t.steps.filter((x) => x.phase === s.phase && x.id !== s.id).sort(byPosition))
  await cs.commit()
}

/** Stap verplaatsen binnen zijn fase: naar positie (1 = eerst), of na een andere stap. */
export async function moveStepDef(repo: ProductionRepo, target: StepTarget, key: string, to: { position?: number | null; after?: string | null }, by: string) {
  const d = await loadData(repo)
  const cs = new ChangeSet(repo, by, '', target.kind === 'client' ? target.client.id : null)
  const t = await targetSteps(cs, d, target)
  const s = findStep(t.steps, key, t.label)
  const list = t.steps.filter((x) => x.phase === s.phase && x.id !== s.id).sort(byPosition)
  let index: number
  if (to.after) {
    const a = findStep(list, to.after, t.label)
    index = list.indexOf(a) + 1
  } else if (to.position) index = Math.min(Math.max(1, to.position), list.length + 1) - 1
  else throw new Error('Geef een positie of "na stap".')
  list.splice(index, 0, s)
  cs.summary = `${t.label}: stap "${s.title}" naar plaats ${index + 1}`
  await renumber(cs, t.table, list)
  await cs.commit()
}

// ─── Intern: terugkerende taken zonder klant ────────────
type TaskInput = { title: string; owner: string; schedule: Schedule | string; link?: string | null; note?: string | null }
const toSchedule = (v: Schedule | string) => (typeof v === 'string' ? parseSchedule(v) : (cleanSchedule(v) ?? parseSchedule('')))

async function findTask(d: ProductionData, ref: string) {
  const q = ref.trim().toLowerCase()
  const hit = d.tasks.find((t) => t.id === ref.trim()) ?? d.tasks.find((t) => t.title.toLowerCase() === q)
  const partial = hit ? [hit] : d.tasks.filter((t) => t.title.toLowerCase().includes(q))
  if (partial.length === 1) return partial[0]
  throw new Error(partial.length ? `Meerdere interne taken passen bij "${ref}": ${partial.map((t) => t.title).join(', ')}.` : `Geen interne taak "${ref}".`)
}

export async function addInternalTask(repo: ProductionRepo, input: TaskInput, by: string) {
  const title = input.title?.trim()
  if (!title) throw new Error('Geef de taak een naam.')
  const schedule = toSchedule(input.schedule)
  const cs = new ChangeSet(repo, by, `Intern: "${title}" toegevoegd (${scheduleLabel(schedule)})`)
  const row = await cs.insert('production_internal_tasks', { title: title.slice(0, 200), owner: checkMember(input.owner), schedule, link: checkLink(input.link) ?? null, note: checkText(input.note, 2000) ?? null, active: true, start_on: today() })
  await cs.commit()
  return row as unknown as InternalTask
}

export async function updateInternalTask(repo: ProductionRepo, ref: string, patch: Partial<TaskInput> & { active?: boolean }, by: string) {
  const d = await loadData(repo)
  const t = await findTask(d, ref)
  const row: Row = {}
  if (patch.title !== undefined) row.title = patch.title.trim().slice(0, 200) || t.title
  if (patch.owner !== undefined) row.owner = checkMember(patch.owner)
  if (patch.schedule !== undefined) row.schedule = toSchedule(patch.schedule)
  if (patch.link !== undefined) row.link = checkLink(patch.link)
  if (patch.note !== undefined) row.note = checkText(patch.note, 2000)
  if (patch.active !== undefined) row.active = patch.active
  if (!Object.keys(row).length) throw new Error('Niets om aan te passen.')
  const cs = new ChangeSet(repo, by, `Intern: "${t.title}" aangepast`)
  await cs.update('production_internal_tasks', t.id, row)
  await cs.commit()
}

export async function removeInternalTask(repo: ProductionRepo, ref: string, by: string) {
  const d = await loadData(repo)
  const t = await findTask(d, ref)
  const cs = new ChangeSet(repo, by, `Intern: "${t.title}" verwijderd`)
  for (const x of d.done.filter((x) => x.task_id === t.id)) if (x.id) await cs.remove('production_internal_done', x.id)
  await cs.remove('production_internal_tasks', t.id)
  await cs.commit()
}

/** De huidige keer van een interne taak afvinken (of de laatst afgevinkte terug open zetten). */
export async function setInternalDone(repo: ProductionRepo, ref: string, done: boolean, by: string, occurrence?: string) {
  const d = await loadData(repo)
  const t = await findTask(d, ref)
  const item = internalItems([{ ...t, active: true }], d.done, today())[0]
  const cs = new ChangeSet(repo, by, '')
  if (done) {
    const occ = checkDate(occurrence, 'Datum') ?? item.due_on
    if (d.done.some((x) => x.task_id === t.id && x.occurrence === occ)) return
    cs.summary = `Intern: "${t.title}" af (${occ})`
    await cs.insert('production_internal_done', { task_id: t.id, occurrence: occ, done_at: new Date().toISOString(), done_by: by })
  } else {
    const occ = checkDate(occurrence, 'Datum') ?? item.last_done?.occurrence
    const row = d.done.find((x) => x.task_id === t.id && x.occurrence === occ)
    if (!row?.id) return
    cs.summary = `Intern: "${t.title}" terug open (${occ})`
    await cs.remove('production_internal_done', row.id)
  }
  await cs.commit()
}

// ─── Wijzigingslog ───────────────────────────────────────
export async function listChanges(repo: ProductionRepo, opts: { clientId?: string; limit?: number } = {}) {
  return repo.changes(opts)
}

/** Wijziging terugdraaien; draaidagen in de agenda volgen mee. */
export async function revert(repo: ProductionRepo, id: string, by: string, clients: ClientRef[]) {
  const entry = await repo.change(id)
  if (!entry) throw new Error('Wijziging niet gevonden.')
  const cycleIds = [...new Set(entry.changes.filter((c) => c.table === 'production_cycles').map((c) => c.pk))]
  const before = new Map(await Promise.all(cycleIds.map(async (cid) => [cid, (await repo.get('production_cycles', cid)) as unknown as Cycle | null] as const)))
  const res = await revertChange(repo, id, by)
  for (const cid of cycleIds) {
    const now = (await repo.get('production_cycles', cid)) as unknown as Cycle | null
    const was = before.get(cid)
    const client = clients.find((c) => c.id === (now ?? was)?.client_id) ?? { id: '', name: 'klant' }
    if (now) await syncShootCalendar(repo, client, { ...now, calendar_event_id: was?.calendar_event_id ?? now.calendar_event_id })
    else if (was?.calendar_event_id) await syncShootCalendar(repo, client, { ...was, shoot_on: null })
  }
  return res
}
