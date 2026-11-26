import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../../../../test/fake-supabase'

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('../../../../test/fake-supabase').fakeSupabase> | null }))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => db.current }))
vi.mock('./style-profile', () => ({ styleInstructions: async () => '', saveProfile: vi.fn(), styleKeyFor: () => 'casper' }))
const notify = vi.hoisted(() => ({ notifyGrok: vi.fn() }))
vi.mock('./notify', () => notify)
vi.mock('next/server', () => ({ after: () => { throw new Error('geen request') } }))
vi.mock('../google', () => ({ isGoogleConfigured: () => false, listConnections: async () => [], createAllDayEvent: vi.fn(), deleteEvent: vi.fn() }))
// Het taakresultaat schrijft via supabaseProduction: laat dat naar dezelfde geheugenopslag wijzen.
const prod = vi.hoisted(() => ({ repo: null as unknown }))
vi.mock('../production/repo', async (importOriginal) => ({ ...(await importOriginal<object>()), supabaseProduction: () => prod.repo }))
vi.mock('../team/invites', () => ({ inviteAddresses: async () => ({ casper: 'c@x', cedric: 'ce@x', milan: 'm@x' }) }))

import { memoryProduction } from '../production/repo'
import { addShootDay, getClientProduction, setActive, setRhythm, startProduction, updateStep } from '../production/service'
import { cycleNeedingIdeas, finishedOn, ideaDocRef, IDEA_NOTE } from '../production/ideeendoc-core'
import type { Cycle, StepState } from '../production/core'
import { queueIdeaDocs } from './ideeendoc'
import { completeJob, openJobs } from './jobs'
import { aiEngine } from './engine'

const DAY = '2026-11-26'
const tempus = { id: 'c-tempus', name: 'Tempus', freelancer: 'Jens', content_goal: 'Sollicitanten aantrekken', niche: 'Uitzendkantoor', audience: '18-30 jaar', available: 'Kantoor in Gent', drive_folder_id: 'FOLDER_TEMPUS_123' }
const BY = 'cron'
let repo: ReturnType<typeof memoryProduction>

beforeEach(() => {
  ;(globalThis as { __ikrProdStore?: unknown }).__ikrProdStore = undefined
  repo = memoryProduction()
  prod.repo = repo
  db.current = fakeSupabase({ ai_jobs: [], weekly_pins: [] }, { defaults: { ai_jobs: { status: 'pending', output: null } }, unique: { ai_jobs: [['type', 'ref']] } })
  process.env.IKR_AI_ENGINE = 'grokbot'
  notify.notifyGrok.mockReset().mockResolvedValue(true)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const cycle = (no: number, shoot_on: string | null): Cycle => ({ id: `cy${no}`, client_id: 'c', no, shoot_on, shoot_time: null })
const doneState = (cycleId: string, at: string): StepState => ({ client_id: 'c', cycle_id: cycleId, step: 'draaidag', done_at: at, done_by: 'x', due_on: null, link: null, note: null })

describe('wanneer is een draaidag voorbij', () => {
  it('datum in het verleden: voorbij; vandaag of later nog niet', () => {
    expect(finishedOn(cycle(1, '2026-11-20'), [], 'draaidag', DAY)).toBe('2026-11-20')
    expect(finishedOn(cycle(1, DAY), [], 'draaidag', DAY)).toBeNull()
    expect(finishedOn(cycle(1, '2026-12-03'), [], 'draaidag', DAY)).toBeNull()
  })

  it('draaidagstap af telt ook (zonder datum, of vandaag)', () => {
    expect(finishedOn(cycle(1, null), [doneState('cy1', '2026-11-25T15:00:00Z')], 'draaidag', DAY)).toBe('2026-11-25')
    expect(finishedOn(cycle(1, DAY), [doneState('cy1', `${DAY}T17:00:00Z`)], 'draaidag', DAY)).toBe(DAY)
  })

  it('enkel de laatste voorbije draaidag, en niet als die langer dan 14 dagen geleden is', () => {
    const cs = [cycle(1, '2026-10-01'), cycle(2, '2026-11-20'), cycle(3, '2026-12-10')]
    expect(cycleNeedingIdeas(cs, [], 'draaidag', DAY)?.no).toBe(2)
    expect(cycleNeedingIdeas([cycle(1, '2026-10-01')], [], 'draaidag', DAY)).toBeNull()
  })
})

describe('trigger: AI-taak ideeendoc na een draaidag', () => {
  it('draaidag in het verleden: precies één taak, draaidag n+1 zonder datum aangemaakt, webhook één keer', async () => {
    await startProduction(repo, tempus, '2026-09-01', 'test')
    await addShootDay(repo, tempus, '2026-11-20', null, 'test')
    await updateStep(repo, tempus, 'online', { note: 'Video "Een dag bij Tempus" gepost' }, { cycleNo: 1, by: 'test' })

    const res = await queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })
    expect(res).toEqual([expect.objectContaining({ klant: 'Tempus', draaidag: 1, resultaat: 'aangemaakt' })])

    const jobs = db.current!.tables.ai_jobs
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ type: 'ideeendoc', ref: ideaDocRef(tempus.id, 1), status: 'pending' })
    expect(jobs[0].input).toMatchObject({
      klant: { naam: 'Tempus' },
      draaidag: { nr: 1, datum: '2026-11-20' },
      volgende: { nr: 2, datum: null, nieuw_aangemaakt: true },
      fiche: { doel: 'Sollicitanten aantrekken', niche: 'Uitzendkantoor', doelgroep: '18-30 jaar', beschikbaar: 'Kantoor in Gent' },
      drive_map: { id: 'FOLDER_TEMPUS_123' },
      stap: { sleutel: 'ideeen_uitwerken', draaidag: 2, bestaat: true },
    })
    expect(JSON.stringify(jobs[0].input)).toContain('Een dag bij Tempus')

    const cp = await getClientProduction(repo, tempus)
    expect(cp.cycles.map((c) => [c.no, c.shoot_on])).toEqual([
      [1, '2026-11-20'],
      [2, null],
    ])
    expect(notify.notifyGrok).toHaveBeenCalledTimes(1)
    expect(notify.notifyGrok).toHaveBeenCalledWith([jobs[0].id])
  })

  it('herhaalde run maakt geen tweede taak en geen extra draaidag (ook niet nadat de taak klaar of weggeklikt is)', async () => {
    await startProduction(repo, tempus, '2026-09-01', 'test')
    await addShootDay(repo, tempus, '2026-11-20', null, 'test')
    await queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })
    const second = await queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })
    expect(second).toEqual([expect.objectContaining({ resultaat: 'bestond al' })])
    db.current!.tables.ai_jobs[0].status = 'dismissed'
    await queueIdeaDocs(repo, [tempus], { by: BY, day: '2026-11-27' })
    expect(db.current!.tables.ai_jobs).toHaveLength(1)
    expect((await getClientProduction(repo, tempus)).cycles).toHaveLength(2)
    expect(notify.notifyGrok).toHaveBeenCalledTimes(1)
  })

  it('twee runs tegelijk: toch maar één taak', async () => {
    await startProduction(repo, tempus, '2026-09-01', 'test')
    await addShootDay(repo, tempus, '2026-11-20', null, 'test')
    await Promise.all([queueIdeaDocs(repo, [tempus], { by: BY, day: DAY }), queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })])
    expect(db.current!.tables.ai_jobs.filter((j) => j.type === 'ideeendoc')).toHaveLength(1)
  })

  it('draaidagstap af (datum nog niet voorbij) triggert ook; met ritme krijgt n+1 meteen de berekende datum', async () => {
    await startProduction(repo, tempus, '2026-09-01', 'test')
    await addShootDay(repo, tempus, DAY, null, 'test')
    await setRhythm(repo, tempus, 'elke 3 weken', 'test')
    // Ritme zonder afgevinkte draaidag: nog geen volgende.
    expect((await getClientProduction(repo, tempus)).cycles).toHaveLength(1)
    await queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })
    expect(db.current!.tables.ai_jobs).toHaveLength(0)

    // Draaidagstap rechtstreeks in de opslag op af (zonder ritme-planning), dan de trigger.
    const cy = (await getClientProduction(repo, tempus)).cycles[0]
    await repo.insert('production_steps', { client_id: tempus.id, cycle_id: cy.id, step: 'draaidag', done_at: `${DAY}T16:00:00Z`, done_by: 'test' })
    await queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })
    expect(db.current!.tables.ai_jobs).toHaveLength(1)
    expect((await getClientProduction(repo, tempus)).cycles.map((c) => [c.no, c.shoot_on])).toEqual([
      [1, DAY],
      [2, '2026-12-17'],
    ])
  })

  it('geen taak: toekomstige draaidag, gepauzeerde productie of klant zonder productie', async () => {
    await startProduction(repo, tempus, '2026-09-01', 'test')
    await addShootDay(repo, tempus, '2026-12-05', null, 'test')
    const other = { id: 'c-x', name: 'Lilalou', freelancer: null }
    expect(await queueIdeaDocs(repo, [tempus, other], { by: BY, day: DAY })).toEqual([expect.objectContaining({ resultaat: 'geen voorbije draaidag' })])
    await setActive(repo, tempus, false, 'test')
    expect(await queueIdeaDocs(repo, [tempus], { by: BY, day: '2026-12-10' })).toEqual([expect.objectContaining({ resultaat: 'gepauzeerd' })])
    expect(db.current!.tables.ai_jobs).toHaveLength(0)
    expect(notify.notifyGrok).not.toHaveBeenCalled()
  })

  it('ideeendoc loopt altijd via Grok Bot, ook met engine api', () => {
    delete process.env.IKR_AI_ENGINE
    expect(aiEngine('ideeendoc')).toBe('grokbot')
    expect(aiEngine('chat')).toBe('api')
  })
})

describe('resultaat klaarzetten', () => {
  const docUrl = 'https://docs.google.com/document/d/DOC123/edit'
  const result = { doc_url: docUrl, doc_titel: 'Tempus – contentideeën draaidag 2', samenvatting: '6 formats rond werken bij Tempus.', map_id: 'FOLDER_TEMPUS_123' }

  async function setup() {
    await startProduction(repo, tempus, '2026-09-01', 'test')
    await addShootDay(repo, tempus, '2026-11-20', null, 'test')
    await updateStep(repo, tempus, 'briefing', { note: 'Locatie: kantoor' }, { cycleNo: 1, by: 'test' })
    await queueIdeaDocs(repo, [tempus], { by: BY, day: DAY })
    return db.current!.tables.ai_jobs[0]
  }

  it('zet de link en de notitie op ideeen_uitwerken van draaidag n+1, verder niets, plus een kaartje voor Milan', async () => {
    const job = await setup()
    expect((await openJobs()).map((j) => j.type)).toEqual(['ideeendoc'])
    const before = await getClientProduction(repo, tempus)
    await completeJob(job.id as string, result, 'grokbot')

    const cp = await getClientProduction(repo, tempus)
    const step2 = cp.cycleSteps.find((x) => x.cycle.no === 2)!.steps.find((s) => s.key === 'ideeen_uitwerken')!
    expect(step2).toMatchObject({ link: docUrl, note: IDEA_NOTE, done: false })
    // Draaidag 1 en de andere stappen blijven zoals ze waren.
    const strip = (c: typeof cp) => c.cycleSteps.map((x) => x.steps.filter((s) => !(x.cycle.no === 2 && s.key === 'ideeen_uitwerken')).map((s) => [x.cycle.no, s.key, s.link, s.note, s.done]))
    expect(strip(cp)).toEqual(strip(before))
    expect(db.current!.tables.weekly_pins).toEqual([expect.objectContaining({ for_owner: 'milan', url: docUrl, kind: 'document', created_via: 'grokbot' })])
    expect(db.current!.tables.ai_jobs[0].status).toBe('done')
  })

  it('bestaande notitie blijft staan; de notitie komt erachter (één keer)', async () => {
    const job = await setup()
    await updateStep(repo, tempus, 'ideeen_uitwerken', { note: 'Freelancer denkt mee' }, { cycleNo: 2, by: 'test' })
    await completeJob(job.id as string, result, 'grokbot')
    const step2 = (await getClientProduction(repo, tempus)).cycleSteps.find((x) => x.cycle.no === 2)!.steps.find((s) => s.key === 'ideeen_uitwerken')!
    expect(step2.note).toBe(`Freelancer denkt mee\n${IDEA_NOTE}`)
  })

  it('weigert een resultaat zonder geldige doc-link', async () => {
    const job = await setup()
    await expect(completeJob(job.id as string, { ...result, doc_url: 'https://example.com/x' }, 'grokbot')).rejects.toThrow(/vorm/)
    expect(db.current!.tables.ai_jobs[0].status).toBe('pending')
  })
})
