import 'server-only'
import { createAllDayEvent, deleteEvent, isGoogleConfigured, listConnections } from '../google'
import { inviteAddresses } from '../team/invites'
import { CONTACT_EMAIL, TEAM } from '../weekly/types'
import { CYCLE, ONBOARDING, clientProduction, stepsBefore, type Anchor, type ClientProduction, type Cycle } from './core'
import type { ProductionRepo } from './repo'

type ClientRef = { id: string; name: string }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
export const today = () => new Date().toISOString().slice(0, 10)

/** Alle klanten met hun productie; klanten zonder productie staan apart. */
export async function loadProduction(repo: ProductionRepo, clients: ClientRef[], day = today()) {
  const d = await repo.load()
  const started = new Map(d.productions.map((p) => [p.client_id, p]))
  const list: ClientProduction[] = clients.filter((c) => started.has(c.id)).map((c) => clientProduction(c, started.get(c.id)!, d.cycles, d.states, day))
  return { list, notStarted: clients.filter((c) => !started.has(c.id)) }
}

export async function getClientProduction(repo: ProductionRepo, client: ClientRef) {
  const { list } = await loadProduction(repo, [client])
  const cp = list[0]
  if (!cp) throw new Error(`Voor ${client.name} is de productie nog niet gestart.`)
  return cp
}

const checkDate = (v: string | null | undefined, label: string) => {
  const d = v?.trim() || null
  if (d && !DATE.test(d)) throw new Error(`${label}: gebruik JJJJ-MM-DD.`)
  return d
}

export async function startProduction(repo: ProductionRepo, clientId: string, signedOn?: string | null) {
  await repo.upsert(clientId, { ...(signedOn !== undefined ? { signed_on: checkDate(signedOn, 'Contract getekend') } : {}), active: true })
}

/** Zorgt dat er een productie is, zonder bestaande waarden (of pauze) te wijzigen. */
export async function ensureProduction(repo: ProductionRepo, clientId: string) {
  await repo.upsert(clientId, {})
}

async function cycleByNo(repo: ProductionRepo, clientId: string, no: number | null | undefined, create = true): Promise<Cycle> {
  const { cycles } = await repo.load()
  const mine = cycles.filter((c) => c.client_id === clientId).sort((a, b) => a.no - b.no)
  if (no == null) {
    // Geen nummer: de laatste draaidag zonder datum of de laatste; anders een nieuwe.
    const target = mine.find((c) => !c.shoot_on) ?? mine.at(-1)
    if (target) return target
  } else {
    const hit = mine.find((c) => c.no === no)
    if (hit) return hit
    if (no > (mine.at(-1)?.no ?? 0) + 1) throw new Error(`Draaidag ${no} bestaat niet (er zijn er ${mine.length}).`)
  }
  if (!create) throw new Error('Draaidag niet gevonden.')
  return repo.addCycle(clientId, {})
}

/** Datum zetten: contract getekend, kick-off, strategiemeeting of een draaidag (met optioneel uur). Leeg = wissen. */
export async function setAnchor(repo: ProductionRepo, client: ClientRef, anchor: Anchor, date: string | null, opts: { cycleNo?: number | null; time?: string | null } = {}) {
  const d = checkDate(date, 'Datum')
  await ensureProduction(repo, client.id)
  if (anchor === 'getekend') return repo.upsert(client.id, { signed_on: d })
  if (anchor === 'kickoff') return repo.upsert(client.id, { kickoff_on: d })
  if (anchor === 'strategie') return repo.upsert(client.id, { strategy_on: d })
  const t = opts.time?.trim() || null
  if (t && !TIME.test(t)) throw new Error('Uur: gebruik UU:MM.')
  const cycle = await cycleByNo(repo, client.id, opts.cycleNo)
  await repo.updateCycle(cycle.id, { shoot_on: d, shoot_time: t })
  await syncShootCalendar(repo, client, { ...cycle, shoot_on: d, shoot_time: t })
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
    await repo.updateCycle(cycle.id, { calendar_event_id: eventId })
  } catch (e) {
    console.error('[productie] agenda', e)
  }
}

export async function addShootDay(repo: ProductionRepo, client: ClientRef, date?: string | null, time?: string | null) {
  const c = await repo.addCycle(client.id, {})
  if (date) await setAnchor(repo, client, 'draaidag', date, { cycleNo: c.no, time })
  return c
}

export async function removeShootDay(repo: ProductionRepo, client: ClientRef, no: number) {
  const c = await cycleByNo(repo, client.id, no, false)
  if (c.calendar_event_id) await syncShootCalendar(repo, client, { ...c, shoot_on: null })
  await repo.removeCycle(c.id)
}

const isOnboarding = (step: string) => ONBOARDING.some((s) => s.key === step)
const checkStep = (step: string) => {
  if (!isOnboarding(step) && !CYCLE.some((s) => s.key === step)) throw new Error(`Onbekende stap "${step}". Kies uit: ${[...ONBOARDING, ...CYCLE].map((s) => s.key).join(', ')}.`)
}

/** Stap afvinken, terugzetten, eigen deadline, link of notitie. Cyclusstappen: welke draaidag (standaard de huidige). */
export async function updateStep(
  repo: ProductionRepo,
  client: ClientRef,
  step: string,
  patch: { done?: boolean; due_on?: string | null; link?: string | null; note?: string | null },
  opts: { cycleNo?: number | null; by: string },
) {
  checkStep(step)
  let cycleId: string | null = null
  if (!isOnboarding(step)) {
    const cp = await getClientProduction(repo, client)
    const no = opts.cycleNo ?? cp.cycleSteps.find((x) => x.steps.some((s) => s.key === step && !s.done))?.cycle.no ?? cp.cycles.at(-1)?.no ?? null
    cycleId = (await cycleByNo(repo, client.id, no)).id
  }
  const link = patch.link === undefined ? undefined : patch.link?.trim() || null
  if (link && !/^https:\/\//.test(link)) throw new Error('Link moet met https:// beginnen.')
  await repo.setStep(client.id, cycleId, step, { done: patch.done, by: opts.by, due_on: patch.due_on === undefined ? undefined : checkDate(patch.due_on, 'Deadline'), link, note: patch.note === undefined ? undefined : patch.note?.trim().slice(0, 4000) || null })
}

/**
 * "We zitten nu hier": alles vóór deze stap wordt afgevinkt, deze stap en wat erna komt (in die fase) staat open.
 * Voor klanten die niet van nul beginnen. Ontbrekende draaidagen worden aangemaakt.
 */
export async function setStartPoint(repo: ProductionRepo, client: ClientRef, step: string, cycleNo: number | null, by: string) {
  checkStep(step)
  await ensureProduction(repo, client.id)
  const before = stepsBefore(step, isOnboarding(step) ? null : (cycleNo ?? 1))
  const ids = new Map<number, string>()
  const idFor = async (no: number) => {
    if (!ids.has(no)) ids.set(no, (await cycleByNo(repo, client.id, no)).id)
    return ids.get(no)!
  }
  for (const b of before) await repo.setStep(client.id, b.cycleNo == null ? null : await idFor(b.cycleNo), b.step, { done: true, by: `${by} (startpunt)` })
  // Vanaf deze stap open (binnen dezelfde fase).
  const block = isOnboarding(step) ? ONBOARDING : CYCLE
  const from = block.findIndex((s) => s.key === step)
  const cid = isOnboarding(step) ? null : await idFor(cycleNo ?? 1)
  for (const s of block.slice(from)) await repo.setStep(client.id, cid, s.key, { done: false })
}
