import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('../google', () => ({ isGoogleConfigured: () => false, listConnections: async () => [], createAllDayEvent: vi.fn(), deleteEvent: vi.fn() }))
vi.mock('../team/invites', () => ({ inviteAddresses: async () => ({ casper: 'c@x', cedric: 'ce@x', milan: 'm@x' }) }))
import { memoryProduction } from './repo'
import { myNextSteps, upcoming } from './core'
import {
  addInternalTask,
  addShootDay,
  addStepDef,
  getClientProduction,
  listChanges,
  loadProduction,
  moveStepDef,
  removeShootDay,
  removeStepDef,
  revert,
  setActive,
  setAnchor,
  setInternalDone,
  setRhythm,
  setStartPoint,
  startProduction,
  updateStep,
  updateStepDef,
} from './service'

const albert = { id: 'c1', name: 'Chez Albert' }
const tempus = { id: 'c2', name: 'Tempus' }
const BY = 'test'
let repo: ReturnType<typeof memoryProduction>
beforeEach(() => {
  ;(globalThis as { __ikrProdStore?: unknown }).__ikrProdStore = undefined
  repo = memoryProduction()
  vi.useRealTimers()
})

describe('productie: deadlines uit ankerdata (zelfde gedrag als de vaste lijst)', () => {
  it('opstart volgt uit contract en kick-off', async () => {
    await startProduction(repo, albert, '2026-11-02', BY)
    await setAnchor(repo, albert, 'kickoff', '2026-11-10', { by: BY })
    const cp = await getClientProduction(repo, albert)
    const due = Object.fromEntries(cp.onboarding.map((s) => [s.key, s.due_on]))
    expect(due).toMatchObject({ contract: '2026-11-09', groep: '2026-11-09', kickoff: '2026-11-10', strategie: '2026-11-24', ideeen: '2026-11-24', strategiemeeting: '2026-11-24' })
    expect(cp.onboarding.find((s) => s.key === 'kickoff_plannen')!.done).toBe(true)
    expect(cp.next?.key).toBe('contract')
    expect(cp.fromTemplate).toBe(false)
  })
  it('draaidag: briefing −7, greenlight −5, online +21; draaidag plannen vanzelf af', async () => {
    await startProduction(repo, albert, null, BY)
    await setAnchor(repo, albert, 'draaidag', '2026-12-03', { time: '09:30', by: BY })
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
  it('onbekende stap', async () => {
    await expect(setStartPoint(repo, tempus, 'bestaat_niet', 1, BY)).rejects.toThrow(/Onbekende stap/)
  })
})

describe('volgende stappen per persoon', () => {
  it('Milan volgt de freelancer op, Cédric de klant; gelijktijdige stappen samen', async () => {
    await setStartPoint(repo, tempus, 'montage', 1, BY)
    await setStartPoint(repo, albert, 'strategie', null, BY)
    const { list } = await loadProduction(repo, [albert, tempus], '2026-11-12')
    expect(upcoming(list.find((x) => x.name === 'Chez Albert')!).map((s) => s.key)).toEqual(['strategie', 'ideeen', 'strategiemeeting'])
    expect(myNextSteps(list, 'milan').map((x) => `${x.client.name}:${x.step.key}`)).toEqual(expect.arrayContaining(['Chez Albert:ideeen', 'Tempus:montage']))
    expect(myNextSteps(list, 'cedric').map((x) => x.step.key)).toEqual(expect.arrayContaining(['strategie', 'strategiemeeting']))
    expect(myNextSteps(list, 'casper')).toEqual([])
  })
  it('stap afvinken, eigen deadline en link; gepauzeerd = niet bij de volgende stappen', async () => {
    await startProduction(repo, albert, '2026-11-02', BY)
    await updateStep(repo, albert, 'contract', { done: true, link: 'https://drive.google.com/x' }, { by: 'casper@iknowright.be' })
    await updateStep(repo, albert, 'groep', { due_on: '2026-11-20' }, { by: BY })
    let cp = await getClientProduction(repo, albert)
    expect(cp.onboarding[0]).toMatchObject({ done: true, link: 'https://drive.google.com/x', done_by: 'casper@iknowright.be' })
    expect(cp.onboarding[1].due_on).toBe('2026-11-20')
    await expect(updateStep(repo, albert, 'groep', { link: 'javascript:x' }, { by: BY })).rejects.toThrow(/https/)
    await setActive(repo, albert, false, BY)
    const { list } = await loadProduction(repo, [albert])
    expect(myNextSteps(list, 'cedric')).toEqual([])
    cp = list[0]
    expect(cp.production.active).toBe(false)
  })
  it('tweede draaidag toevoegen', async () => {
    await setStartPoint(repo, tempus, 'online', 1, BY)
    await updateStep(repo, tempus, 'online', { done: true }, { by: BY })
    const c2 = await addShootDay(repo, tempus, '2027-01-14', null, BY)
    expect(c2.no).toBe(2)
    const cp = await getClientProduction(repo, tempus)
    expect(cp.next).toMatchObject({ key: 'ideeen_uitwerken', cycle: { no: 2 }, due_on: '2027-01-06' })
  })
})

describe('volgende draaidag plannen', () => {
  it('na de opstart: "Draaidag 1 plannen" (Cédric), tegen strategiemeeting + 7; in de feedbackweek al zichtbaar', async () => {
    await setStartPoint(repo, albert, 'feedback', null, BY)
    await setAnchor(repo, albert, 'strategie', '2026-11-05', { by: BY })
    await updateStep(repo, albert, 'feedback', { done: true }, { by: BY })
    let cp = await getClientProduction(repo, albert)
    expect(cp.next).toMatchObject({ key: 'draaidag_plannen', owner: 'cedric', due_on: '2026-11-12', cycle: { no: 1, id: 'volgende' } })
    expect(cp.phase).toBe('Draaidag 1: draaidag plannen')
    expect(cp.cycles).toHaveLength(0)
    await updateStep(repo, albert, 'feedback', { done: false }, { by: BY })
    const { list } = await loadProduction(repo, [albert])
    expect(myNextSteps(list, 'cedric').map((x) => x.step.key)).toEqual(['feedback', 'draaidag_plannen'])
    await setAnchor(repo, albert, 'draaidag', '2026-11-26', { cycleNo: 1, by: BY })
    cp = await getClientProduction(repo, albert)
    expect(cp.cycles.map((c) => [c.no, c.shoot_on])).toEqual([[1, '2026-11-26']])
  })
  it('na een volledige draaidag: de volgende plannen tegen vorige draaidag + 21', async () => {
    await setStartPoint(repo, tempus, 'online', 1, BY)
    await setAnchor(repo, tempus, 'draaidag', '2026-11-03', { cycleNo: 1, by: BY })
    await updateStep(repo, tempus, 'online', { done: true }, { by: BY })
    const cp = await getClientProduction(repo, tempus)
    expect(cp.next).toMatchObject({ key: 'draaidag_plannen', cycle: { no: 2 }, due_on: '2026-11-24' })
  })
})

describe('stappen per klant aanpassen (kopie van het sjabloon)', () => {
  it('toevoegen, eigenaar, deadlineregel, verplaatsen en verwijderen; het sjabloon blijft', async () => {
    await startProduction(repo, albert, '2026-11-02', BY)
    await setAnchor(repo, albert, 'draaidag', '2026-12-03', { by: BY })
    await addStepDef(repo, { kind: 'client', client: albert }, { phase: 'draaidag', title: 'Thumbnails maken', owner: 'Milan', rule: '2 dagen na draaidag', after: 'draaidag' }, BY)
    let cp = await getClientProduction(repo, albert)
    const keys = cp.cycleSteps[0].steps.map((s) => s.key)
    expect(keys.slice(keys.indexOf('draaidag'), keys.indexOf('draaidag') + 2)).toEqual(['draaidag', 'thumbnails_maken'])
    expect(cp.cycleSteps[0].steps.find((s) => s.key === 'thumbnails_maken')).toMatchObject({ owner: 'milan', due_on: '2026-12-05' })

    await updateStepDef(repo, { kind: 'client', client: albert }, 'briefing', { owner: 'milan', rule: 'eerste woensdag' }, BY)
    await moveStepDef(repo, { kind: 'client', client: albert }, 'briefing', { position: 1 }, BY)
    await removeStepDef(repo, { kind: 'client', client: albert }, 'revisie', BY)
    cp = await getClientProduction(repo, albert)
    const briefing = cp.cycleSteps[0].steps[0]
    // "Eerste woensdag" = de eerste op of na de draaidag (3/12) → 6/1.
    expect(briefing).toMatchObject({ key: 'briefing', owner: 'milan', due_on: '2027-01-06' })
    expect(cp.cycleSteps[0].steps.some((s) => s.key === 'revisie')).toBe(false)

    // Nieuwe klant krijgt nog het ongewijzigde sjabloon.
    await startProduction(repo, tempus, null, BY)
    const t = await getClientProduction(repo, tempus)
    expect(t.defs.some((d) => d.key === 'thumbnails_maken')).toBe(false)
    expect(t.defs.find((d) => d.key === 'briefing')!.owner).toBe('cedric')
  })
  it('sjabloon aanpassen geldt voor nieuwe klanten', async () => {
    await addStepDef(repo, { kind: 'template' }, { phase: 'opstart', title: 'Welkomstmail', owner: 'casper', rule: 'op contract', position: 1 }, BY)
    await startProduction(repo, albert, '2026-11-02', BY)
    const cp = await getClientProduction(repo, albert)
    expect(cp.onboarding[0]).toMatchObject({ key: 'welkomstmail', owner: 'casper', due_on: '2026-11-02' })
    expect(cp.next?.key).toBe('welkomstmail')
  })
})

describe('draaidag-ritme', () => {
  it('draaidag af → de volgende wordt aangemaakt met berekende datum en deadlines', async () => {
    await setStartPoint(repo, tempus, 'draaidag', 1, BY)
    await setAnchor(repo, tempus, 'draaidag', '2026-11-08', { cycleNo: 1, time: '10:00', by: BY })
    await setRhythm(repo, tempus, 'elke 2e zondag', BY)
    await updateStep(repo, tempus, 'draaidag', { done: true }, { by: BY })
    const cp = await getClientProduction(repo, tempus)
    expect(cp.cycles.map((c) => [c.no, c.shoot_on, c.shoot_time])).toEqual([
      [1, '2026-11-08', '10:00'],
      [2, '2026-12-13', '10:00'],
    ])
    const c2 = cp.cycleSteps.find((x) => x.cycle.no === 2)!.steps
    expect(c2.find((s) => s.key === 'briefing')!.due_on).toBe('2026-12-06')
    expect(c2.find((s) => s.key === 'draaidag_plannen')!.done).toBe(true)
    expect(cp.production.rhythm).toEqual({ kind: 'monthly', nth: 2, weekday: 0 })
    // Opnieuw afvinken maakt geen derde aan.
    await updateStep(repo, tempus, 'draaidag', { done: false }, { cycleNo: 1, by: BY })
    await updateStep(repo, tempus, 'draaidag', { done: true }, { cycleNo: 1, by: BY })
    expect((await getClientProduction(repo, tempus)).cycles).toHaveLength(2)
  })
  it('elke N weken; zonder ritme geen automatische draaidag', async () => {
    await setStartPoint(repo, albert, 'draaidag', 1, BY)
    await setAnchor(repo, albert, 'draaidag', '2026-11-03', { cycleNo: 1, by: BY })
    await updateStep(repo, albert, 'draaidag', { done: true }, { by: BY })
    expect((await getClientProduction(repo, albert)).cycles).toHaveLength(1)
    // Ritme zetten nadat de draaidag al gedraaid is: meteen de volgende.
    await setRhythm(repo, albert, 'elke 3 weken', BY)
    expect((await getClientProduction(repo, albert)).cycles.map((c) => c.shoot_on)).toEqual(['2026-11-03', '2026-11-24'])
    await expect(setRhythm(repo, albert, 'af en toe', BY)).rejects.toThrow(/ritme/)
  })
})

describe('intern', () => {
  it('wekelijks en "laatste maandag": deadline, te laat, afvinken schuift door', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-16T09:00:00Z')) // maandag
    await addInternalTask(repo, { title: 'Facturen nakijken', owner: 'Casper', schedule: 'elke vrijdag' }, BY)
    await addInternalTask(repo, { title: 'Maandrapport', owner: 'cedric', schedule: 'laatste maandag' }, BY)
    let { internal } = await loadProduction(repo, [], '2026-11-16')
    expect(internal.map((i) => [i.task.title, i.due_on, i.overdue])).toEqual([
      ['Facturen nakijken', '2026-11-20', false],
      ['Maandrapport', '2026-11-30', false],
    ])
    vi.setSystemTime(new Date('2026-11-23T09:00:00Z'))
    internal = (await loadProduction(repo, [], '2026-11-23')).internal
    expect(internal[0]).toMatchObject({ due_on: '2026-11-20', overdue: true })
    await setInternalDone(repo, 'facturen', true, 'casper@iknowright.be')
    internal = (await loadProduction(repo, [], '2026-11-23')).internal
    expect(internal.find((i) => i.task.title === 'Facturen nakijken')).toMatchObject({ due_on: '2026-11-27', overdue: false, last_done: { occurrence: '2026-11-20' } })
    await expect(addInternalTask(repo, { title: 'X', owner: 'freelancer', schedule: 'elke maandag' }, BY)).rejects.toThrow(/Casper, Cédric of Milan/)
  })
})

describe('wijzigingslog en terugdraaien', () => {
  it('wie, wat, wanneer; terugdraaien zet alles terug en wordt zelf gelogd', async () => {
    await startProduction(repo, albert, '2026-11-02', 'cedric@iknowright.be')
    await setStartPoint(repo, albert, 'strategie', null, 'grokbot')
    let cp = await getClientProduction(repo, albert)
    expect(cp.next?.key).toBe('strategie')
    const log = await listChanges(repo, { clientId: albert.id })
    expect(log[0]).toMatchObject({ by: 'grokbot', summary: 'Chez Albert: startpunt gezet op "Contentstrategie en PowerPoint"' })
    expect(log[1].summary).toBe('Chez Albert: productie gestart')

    await revert(repo, log[0].id, 'casper@iknowright.be', [albert])
    cp = await getClientProduction(repo, albert)
    expect(cp.next?.key).toBe('contract')
    const after = await listChanges(repo)
    expect(after[0]).toMatchObject({ by: 'casper@iknowright.be', summary: expect.stringMatching(/^Teruggedraaid: /), revert_of: log[0].id })
    expect(after[1].reverted_at).not.toBeNull()
    await expect(revert(repo, log[0].id, BY, [albert])).rejects.toThrow(/al teruggedraaid/)
  })
  it('weigert als er sindsdien iets aan veranderde; verwijderde draaidag komt terug met zijn stappen', async () => {
    await setStartPoint(repo, tempus, 'montage', 1, BY)
    await updateStepDef(repo, { kind: 'client', client: tempus }, 'briefing', { owner: 'milan' }, BY)
    const [ownerChange] = await listChanges(repo)
    await updateStepDef(repo, { kind: 'client', client: tempus }, 'briefing', { owner: 'casper' }, BY)
    await expect(revert(repo, ownerChange.id, BY, [tempus])).rejects.toThrow(/latere wijziging/)

    await removeShootDay(repo, tempus, 1, BY)
    expect((await getClientProduction(repo, tempus)).cycles).toHaveLength(0)
    const [removal] = await listChanges(repo)
    await revert(repo, removal.id, BY, [tempus])
    const cp = await getClientProduction(repo, tempus)
    expect(cp.cycles).toHaveLength(1)
    expect(cp.next).toMatchObject({ key: 'montage', cycle: { no: 1 } })
  })
})
