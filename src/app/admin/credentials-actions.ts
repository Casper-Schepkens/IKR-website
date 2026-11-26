'use server'

import { revalidatePath } from 'next/cache'
import { requireCoreTeam } from '@/lib/admin/session'
import { cleanCredentialInput, cleanCredentialPatch } from '@/lib/admin/credentials/types'
import { formRaw as str } from '@/lib/admin/forms'
import type { ActionResult } from './actions'

/**
 * Inloggegevens van klanten (enkel Casper, Cédric en Milan). Wachtwoorden worden nooit gelogd: fouten geven
 * enkel een korte melding terug, zonder de ingevulde waarden.
 */
async function attempt<T = void>(fn: () => Promise<T>, revalidate = true): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    if (revalidate) revalidatePath('/admin/klanten')
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

const fields = (form: FormData) => ({
  platform: str(form, 'platform'),
  username: str(form, 'username'),
  password: str(form, 'password'),
  note: str(form, 'note'),
})

export async function createCredentialAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { user, credentials } = await requireCoreTeam()
    await credentials.create(clientId, cleanCredentialInput(fields(form)), user.email)
  })
}

/** Leeg wachtwoordveld = het bewaarde wachtwoord blijft. */
export async function updateCredentialAction(id: string, form: FormData) {
  return attempt(async () => {
    const { user, credentials } = await requireCoreTeam()
    await credentials.update(id, cleanCredentialPatch(fields(form)), user.email)
  })
}

export async function deleteCredentialAction(id: string) {
  return attempt(async () => {
    const { credentials } = await requireCoreTeam()
    await credentials.remove(id)
  })
}

/** Eén wachtwoord in klare tekst, enkel op aanvraag ("toon" of "kopieer"). */
export async function revealCredentialAction(id: string) {
  return attempt(async () => {
    const { credentials } = await requireCoreTeam()
    return (await credentials.reveal(id)) ?? ''
  }, false)
}
