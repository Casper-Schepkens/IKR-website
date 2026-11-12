'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import type { Anchor } from '@/lib/admin/production/core'
import { addShootDay, removeShootDay, setAnchor, setStartPoint, startProduction, updateStep } from '@/lib/admin/production/service'
import type { ActionResult } from './actions'

/** Productie (hele team). Alles wat hier kan, kan Grokbot ook via de productie_*-tools. */
async function attempt(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/productie')
    revalidatePath('/admin/kalender')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
const str = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : null
}
async function ctx(clientId: string) {
  const session = await requireAdmin()
  const c = (await session.clients.list()).find((x) => x.id === clientId)
  if (!c) throw new Error('Klant niet gevonden.')
  return { session, client: { id: c.id, name: c.name } }
}
const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)

export async function startProductionAction(clientId: string) {
  return attempt(async () => {
    const { session } = await ctx(clientId)
    await startProduction(session.production, clientId, null)
  })
}

export async function setAnchorAction(clientId: string, anchor: Anchor, form: FormData) {
  return attempt(async () => {
    const { session, client } = await ctx(clientId)
    await setAnchor(session.production, client, anchor, str(form, 'date'), { cycleNo: num(str(form, 'cycle')), time: str(form, 'time') })
  })
}

export async function toggleStepAction(clientId: string, step: string, cycleNo: number | null, done: boolean) {
  return attempt(async () => {
    const { session, client } = await ctx(clientId)
    await updateStep(session.production, client, step, { done }, { cycleNo, by: session.user.email })
  })
}

export async function updateStepMetaAction(clientId: string, step: string, cycleNo: number | null, form: FormData) {
  return attempt(async () => {
    const { session, client } = await ctx(clientId)
    await updateStep(session.production, client, step, { due_on: str(form, 'due_on') || null, link: str(form, 'link'), note: str(form, 'note') }, { cycleNo, by: session.user.email })
  })
}

/** "We zitten nu hier" (waarde: "stap" of "stap|draaidagnr"). */
export async function setStartPointAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { session, client } = await ctx(clientId)
    const [step, no] = (str(form, 'point') ?? '').split('|')
    if (!step) throw new Error('Kies een stap.')
    await setStartPoint(session.production, client, step, num(no ?? null), session.user.email)
  })
}

export async function addShootDayAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { session, client } = await ctx(clientId)
    await addShootDay(session.production, client, str(form, 'date') || null, str(form, 'time') || null)
  })
}

export async function removeShootDayAction(clientId: string, no: number) {
  return attempt(async () => {
    const { session, client } = await ctx(clientId)
    await removeShootDay(session.production, client, no)
  })
}

export async function setProductionActiveAction(clientId: string, active: boolean) {
  return attempt(async () => {
    const { session } = await ctx(clientId)
    await session.production.upsert(clientId, { active })
  })
}
