'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { cleanClientInput } from '@/lib/admin/clients/types'
import type { ActionResult } from './actions'

async function attempt(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/klanten')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
const str = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : null
}
const input = (form: FormData) => cleanClientInput({ name: str(form, 'name'), freelancer: str(form, 'freelancer'), contract_end: str(form, 'contract_end') })

export async function createClientAction(form: FormData) {
  return attempt(async () => {
    const { clients, user } = await requireAdmin()
    await clients.create(input(form), user.email)
  })
}

export async function updateClientAction(id: string, form: FormData) {
  return attempt(async () => {
    const { clients } = await requireAdmin()
    await clients.update(id, input(form))
  })
}

export async function deleteClientAction(id: string) {
  return attempt(async () => {
    const { clients } = await requireAdmin()
    await clients.remove(id)
  })
}
