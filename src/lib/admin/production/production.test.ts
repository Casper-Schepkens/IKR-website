import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('../google', () => ({ isGoogleConfigured: () => false, listConnections: async () => [], createAllDayEvent: vi.fn(), deleteEvent: vi.fn() }))
vi.mock('../team/invites', () => ({ inviteAddresses: async () => ({ casper: 'c@x', cedric: 'ce@x', milan: 'm@x' }) }))
import { memoryProduction } from './repo'
import { myNextSteps, stepsBefore, upcoming } from './core'
import { addShootDay, getClientProduction, loadProduction, setAnchor, setStartPoint, startProduction, updateStep } from './service'

const albert = { id: 'c1', name: 'Chez Albert' }
const tempus = { id: 'c2', name: 'Tempus' }
let repo: ReturnType<typeof memoryProduction>
beforeEach(() => {
  ;(globalThis as { __ikrProd?: unknown }).__ikrProd = undefined
  repo = memoryProduction()
})

describe('productie: deadlines uit ankerdata', () => {
  it('opstart volgt uit contract en kick-off', async () => {
    await startProduction(repo, albert.id, '2026-11-02')
    await setAnchor(repo, albert, 'kickoff', '2026-11-10')
    const cp = await getClientProduction(repo, albert)
    const due = Object.fromEntries(cp.onboarding.map((s) => [s.key, s.due_on]))
    expect(due).toMatchObject({ contract: '2026-11-09', groep: '2026-11-09', kickoff: '2026-11-10', strategie: '2026-11-24', ideeen: '2026-11-24' })
    // Kick-off gepland = stap "kick-off plannen" vanzelf af.
    expect(cp.onboarding.find((s) => s.key === 'kickoff_plannen')!.done).toBe(true)
    expect(cp.next?.key).toBe('contract')
  })
  it('draaidag: briefing −7, greenlight −5, online +21; draaidag plannen vanzelf af', async () => {
    await startProduction(repo, albert.id)
    await setAnchor(repo, albert, 'draaidag', '2026-12-03', { time: '09:30' })
    const cp = await getClientProduction(repo, albert)
    const steps = Object.fromEntries(cp.cycleSteps[0].steps.map((s) => [s.key, s]))
    expect(steps.draaidag_plannen.done).toBe(true)
    expect([steps.briefing.due_on, steps.greenlight.due_on, steps.draaidag.due_on, steps.montage.due_on, steps.online.due_on]).toEqual(['2026-11-26', '2026-11-28', '2026-12-03', '2026-12-10', '2026-12-24'])
    expect(cp.cycles[0]).toMatchObject({ no: 1, shoot_on: '2026-12-03', shoot_time: '09:30' })
  })
})

describe('"we zitten nu hier"', () => {
  it('alles ervoor af, deze stap open; ontbrekende draaidagen aangemaakt', async () => {
    await setStartPoint(repo, tempus, 'briefing', 3, 'grokbot')
    const cp = await getClientProduction(repo, tempus)
    expect(cp.onboarding.every((s) => s.done)).toBe(true)
    expect(cp.cycles.map((c) => c.no)).toEqual([1, 2, 3])
    expect(cp.cycleSteps[1].steps.every((s) => s.done)).toBe(true)
    expect(cp.next).toMatchObject({ key: 'briefing', cycle: { no: 3 } })
    expect(cp.phase).toBe('Draaidag 3: briefing in de groep')
    expect(cp.onboarding[0].done_by).toBe('grokbot (startpunt)')
  })
  it('stepsBefore voor een opstartstap', () => {
    expect(stepsBefore('kickoff', null).map((s) => s.step)).toEqual(['contract', 'groep', 'freelancer', 'kickoff_plannen'])
    expect(() => stepsBefore('bestaat_niet', 1)).toThrow(/Onbekende stap/)
  })
})

describe('volgende stappen per persoon', () => {
  it('Milan volgt de freelancer op, Cédric de klant; gelijktijdige stappen samen', async () => {
    await setStartPoint(repo, tempus, 'montage', 1, 'grokbot')
    await setStartPoint(repo, albert, 'strategie', null, 'grokbot')
    const { list } = await loadProduction(repo, [albert, tempus], '2026-11-12')
    const albertNow = upcoming(list.find((x) => x.name === 'Chez Albert')!).map((s) => s.key)
    expect(albertNow).toEqual(['strategie', 'ideeen', 'strategiemeeting'])
    expect(myNextSteps(list, 'milan').map((x) => `${x.client.name}:${x.step.key}`)).toEqual(expect.arrayContaining(['Chez Albert:ideeen', 'Tempus:montage']))
    expect(myNextSteps(list, 'cedric').map((x) => x.step.key)).toEqual(expect.arrayContaining(['strategie', 'strategiemeeting']))
    expect(myNextSteps(list, 'casper')).toEqual([])
  })
  it('stap afvinken, eigen deadline en link; gepauzeerd = niet bij de volgende stappen', async () => {
    await startProduction(repo, albert.id, '2026-11-02')
    await updateStep(repo, albert, 'contract', { done: true, link: 'https://drive.google.com/x' }, { by: 'casper@iknowright.be' })
    await updateStep(repo, albert, 'groep', { due_on: '2026-11-20' }, { by: 'x' })
    let cp = await getClientProduction(repo, albert)
    expect(cp.onboarding[0]).toMatchObject({ done: true, link: 'https://drive.google.com/x', done_by: 'casper@iknowright.be' })
    expect(cp.onboarding[1].due_on).toBe('2026-11-20')
    await expect(updateStep(repo, albert, 'groep', { link: 'javascript:x' }, { by: 'x' })).rejects.toThrow(/https/)
    await repo.upsert(albert.id, { active: false })
    const { list } = await loadProduction(repo, [albert])
    expect(myNextSteps(list, 'cedric')).toEqual([])
    cp = list[0]
    expect(cp.production.active).toBe(false)
  })
  it('tweede draaidag toevoegen', async () => {
    await setStartPoint(repo, tempus, 'online', 1, 'x')
    await updateStep(repo, tempus, 'online', { done: true }, { by: 'x' })
    const c2 = await addShootDay(repo, tempus, '2027-01-14')
    expect(c2.no).toBe(2)
    const cp = await getClientProduction(repo, tempus)
    expect(cp.next).toMatchObject({ key: 'ideeen_uitwerken', cycle: { no: 2 }, due_on: '2027-01-06' })
  })
})

describe('volgende draaidag plannen', () => {
  it('na de opstart: "Draaidag 1 plannen" (Cédric), tegen strategiemeeting + 7', async () => {
    await setStartPoint(repo, albert, 'feedback', null, 'x')
    await setAnchor(repo, albert, 'strategie', '2026-11-05')
    await updateStep(repo, albert, 'feedback', { done: true }, { by: 'x' })
    let cp = await getClientProduction(repo, albert)
    expect(cp.next).toMatchObject({ key: 'draaidag_plannen', who: 'cedric', due_on: '2026-11-12', cycle: { no: 1, id: 'volgende' } })
    expect(cp.phase).toBe('Draaidag 1: draaidag plannen')
    expect(cp.cycles).toHaveLength(0)
    // In de feedbackweek staat het al bij Cédric.
    await updateStep(repo, albert, 'feedback', { done: false }, { by: 'x' })
    const { list } = await loadProduction(repo, [albert])
    expect(myNextSteps(list, 'cedric').map((x) => x.step.key)).toEqual(['feedback', 'draaidag_plannen'])
    // Plannen maakt de draaidag aan.
    await setAnchor(repo, albert, 'draaidag', '2026-11-26', { cycleNo: 1 })
    cp = await getClientProduction(repo, albert)
    expect(cp.cycles.map((c) => [c.no, c.shoot_on])).toEqual([[1, '2026-11-26']])
  })
  it('na een volledige draaidag: de volgende plannen tegen vorige draaidag + 21', async () => {
    await setStartPoint(repo, tempus, 'online', 1, 'x')
    await setAnchor(repo, tempus, 'draaidag', '2026-11-03', { cycleNo: 1 })
    await updateStep(repo, tempus, 'online', { done: true }, { by: 'x' })
    const cp = await getClientProduction(repo, tempus)
    expect(cp.next).toMatchObject({ key: 'draaidag_plannen', cycle: { no: 2 }, due_on: '2026-11-24' })
  })
})
