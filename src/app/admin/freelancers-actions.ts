'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, type AdminSession } from '@/lib/admin/session'
import { cleanFreelancerInput, cleanFreelancerPatch, INLINE_FIELDS, type InlineField } from '@/lib/admin/freelancers/types'
import { formRaw as str } from '@/lib/admin/forms'
import type { ActionResult } from './actions'

/** Hetzelfde recht als de rest van het dashboard: elk teamlid (dus ook Milan) mag lezen en schrijven. */
async function attempt(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/freelancers')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

/** Enkel koppelingen aan klanten die (nog) bestaan. */
async function knownClients(session: AdminSession, ids: string[]) {
  const existing = new Set((await session.clients.list()).map((c) => c.id))
  return ids.filter((id) => existing.has(id))
}

const fields = (form: FormData) => ({
  name: str(form, 'name'),
  email: str(form, 'email'),
  phone: str(form, 'phone'),
  score: str(form, 'score'),
  assignments: str(form, 'assignments'),
  client_ids: form.getAll('client_ids').filter((v): v is string => typeof v === 'string'),
  portfolio_url: str(form, 'portfolio_url'),
  notes: str(form, 'notes'),
})

export async function createFreelancerAction(form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    const input = cleanFreelancerInput(fields(form))
    await session.freelancers.create({ ...input, client_ids: await knownClients(session, input.client_ids) }, session.user.email)
  })
}

/** De fiche: alle velden tegelijk. */
export async function updateFreelancerAction(id: string, form: FormData) {
  return attempt(async () => {
    const session = await requireAdmin()
    const patch = cleanFreelancerPatch(fields(form))
    if (patch.client_ids) patch.client_ids = await knownClients(session, patch.client_ids)
    await session.freelancers.update(id, patch)
  })
}

/** Eén cel rechtstreeks in de tabel. */
export async function updateFreelancerFieldAction(id: string, field: InlineField, value: string) {
  return attempt(async () => {
    if (!(INLINE_FIELDS as readonly string[]).includes(field)) throw new Error('Onbekend veld.')
    const { freelancers } = await requireAdmin()
    await freelancers.update(id, cleanFreelancerPatch({ [field]: value }))
  })
}

export async function deleteFreelancerAction(id: string) {
  return attempt(async () => {
    const { freelancers } = await requireAdmin()
    await freelancers.remove(id)
  })
}
