'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { cleanSopInput, SOP_STATUSES, type SopStatus } from '@/lib/admin/sops/types'
import type { ActionResult } from './actions'

/** SOP's: iedereen van het team mag altijd toevoegen, aanpassen, goedkeuren en verwijderen. */
async function attempt(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/sops')
    revalidatePath('/admin/weekly')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
const str = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : null
}

export async function createSopAction(form: FormData) {
  return attempt(async () => {
    const { sops, user } = await requireAdmin()
    await sops.create(cleanSopInput({ title: str(form, 'title'), body: str(form, 'body'), category: str(form, 'category'), status: 'afgesproken', source: str(form, 'source') }), user.email)
  })
}

export async function updateSopAction(id: string, form: FormData) {
  return attempt(async () => {
    const { sops } = await requireAdmin()
    await sops.update(id, cleanSopInput({ title: str(form, 'title'), body: str(form, 'body'), category: str(form, 'category') }))
  })
}

export async function setSopStatusAction(id: string, status: SopStatus) {
  return attempt(async () => {
    if (!SOP_STATUSES.includes(status)) throw new Error('Onbekende status.')
    const { sops } = await requireAdmin()
    await sops.update(id, { status })
  })
}

/** Voorstel: vinkje = afgesproken, kruisje = weg. */
export async function decideSopAction(id: string, approve: boolean) {
  return attempt(async () => {
    const { sops } = await requireAdmin()
    if (approve) await sops.update(id, { status: 'afgesproken' })
    else await sops.remove(id)
  })
}

export async function deleteSopAction(id: string) {
  return attempt(async () => {
    const { sops } = await requireAdmin()
    await sops.remove(id)
  })
}
