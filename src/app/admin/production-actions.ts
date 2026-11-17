'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import type { Phase } from '@/lib/admin/production/core'
import {
  addInternalTask,
  addShootDay,
  addStepDef,
  moveStepDef,
  removeInternalTask,
  removeShootDay,
  removeStepDef,
  revert,
  setActive,
  setAnchor,
  setInternalDone,
  setRhythm,
  setStartPoint,
  startProduction,
  updateInternalTask,
  updateStep,
  updateStepDef,
  type StepTarget,
} from '@/lib/admin/production/service'
import type { ActionResult } from './actions'
import { formRaw as str } from '@/lib/admin/forms'

/** Productie (hele team). Alles wat hier kan, kan Grokbot ook via de productie_*-, workflow_*- en intern_*-tools. */
async function attempt(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/productie')
    revalidatePath('/admin/kalender')
    // "Uit Productie" op de weekly en de meetingpagina.
    revalidatePath('/admin/weekly', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}async function ctx(clientId: string) {
  const session = await requireAdmin()
  const c = (await session.clients.list()).find((x) => x.id === clientId)
  if (!c) throw new Error('Klant niet gevonden.')
  return { session, client: { id: c.id, name: c.name }, by: session.user.email }
}
const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)

export async function startProductionAction(clientId: string) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await startProduction(session.production, client, null, by)
  })
}

export async function setAnchorAction(clientId: string, anchor: 'getekend' | 'kickoff' | 'strategie' | 'draaidag', form: FormData) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await setAnchor(session.production, client, anchor, str(form, 'date'), { cycleNo: num(str(form, 'cycle')), time: str(form, 'time'), by })
  })
}

export async function toggleStepAction(clientId: string, step: string, cycleNo: number | null, done: boolean) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await updateStep(session.production, client, step, { done }, { cycleNo, by })
  })
}

export async function updateStepMetaAction(clientId: string, step: string, cycleNo: number | null, form: FormData) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await updateStep(session.production, client, step, { due_on: str(form, 'due_on') || null, link: str(form, 'link'), note: str(form, 'note') }, { cycleNo, by })
  })
}

/** "We zitten nu hier" (waarde: "stap" of "stap|draaidagnr"). */
export async function setStartPointAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    const [step, no] = (str(form, 'point') ?? '').split('|')
    if (!step) throw new Error('Kies een stap.')
    await setStartPoint(session.production, client, step, num(no ?? null), by)
  })
}

export async function addShootDayAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await addShootDay(session.production, client, str(form, 'date') || null, str(form, 'time') || null, by)
  })
}

export async function removeShootDayAction(clientId: string, no: number) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await removeShootDay(session.production, client, no, by)
  })
}

export async function setProductionActiveAction(clientId: string, active: boolean) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await setActive(session.production, client, active, by)
  })
}

export async function setRhythmAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { session, client, by } = await ctx(clientId)
    await setRhythm(session.production, client, str(form, 'rhythm') ?? '', by)
  })
}

// ─── Stappen (sjabloon of per klant) ─────────────────────
/** clientId null = het workflow-sjabloon. */
async function stepTarget(clientId: string | null): Promise<{ session: Awaited<ReturnType<typeof requireAdmin>>; target: StepTarget }> {
  if (!clientId) return { session: await requireAdmin(), target: { kind: 'template' } }
  const { session, client } = await ctx(clientId)
  return { session, target: { kind: 'client', client } }
}

export async function addStepDefAction(clientId: string | null, phase: Phase, form: FormData) {
  return attempt(async () => {
    const { session, target } = await stepTarget(clientId)
    await addStepDef(session.production, target, { phase, title: str(form, 'title') ?? '', owner: str(form, 'owner') ?? '', rule: str(form, 'rule') ?? '', after: str(form, 'after') || null, position: str(form, 'after') === '' ? 1 : null }, session.user.email)
  })
}

export async function updateStepDefAction(clientId: string | null, key: string, form: FormData) {
  return attempt(async () => {
    const { session, target } = await stepTarget(clientId)
    await updateStepDef(
      session.production,
      target,
      key,
      { title: str(form, 'title') ?? undefined, owner: str(form, 'owner') ?? undefined, rule: str(form, 'rule') ?? undefined, link: form.has('link') ? str(form, 'link') : undefined, note: form.has('note') ? str(form, 'note') : undefined },
      session.user.email,
    )
  })
}

export async function moveStepDefAction(clientId: string | null, key: string, position: number) {
  return attempt(async () => {
    const { session, target } = await stepTarget(clientId)
    await moveStepDef(session.production, target, key, { position }, session.user.email)
  })
}

export async function removeStepDefAction(clientId: string | null, key: string) {
  return attempt(async () => {
    const { session, target } = await stepTarget(clientId)
    await removeStepDef(session.production, target, key, session.user.email)
  })
}

// ─── Intern ────────────────────────────────────────────────
export async function addInternalTaskAction(form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    await addInternalTask(session.production, { title: str(form, 'title') ?? '', owner: str(form, 'owner') ?? '', schedule: str(form, 'schedule') ?? '', link: str(form, 'link'), note: str(form, 'note') }, session.user.email)
  })
}

export async function updateInternalTaskAction(id: string, form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    await updateInternalTask(session.production, id, { title: str(form, 'title') ?? undefined, owner: str(form, 'owner') ?? undefined, schedule: str(form, 'schedule') ?? undefined, link: str(form, 'link'), note: str(form, 'note') }, session.user.email)
  })
}

export async function removeInternalTaskAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await removeInternalTask(session.production, id, session.user.email)
  })
}

export async function toggleInternalAction(id: string, done: boolean) {
  return attempt(async () => {
    const session = await requireAdmin()
    await setInternalDone(session.production, id, done, session.user.email)
  })
}

// ─── Wijzigingslog ───────────────────────────────────────
export async function revertChangeAction(id: string) {
  return attempt(async () => {
    const session = await requireAdmin()
    await revert(session.production, id, session.user.email, (await session.clients.list()).map((c) => ({ id: c.id, name: c.name })))
  })
}
