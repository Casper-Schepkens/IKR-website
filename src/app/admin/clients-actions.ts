'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { reclassify } from '@/lib/admin/finance/store'
import { requireAdmin } from '@/lib/admin/session'
import { cleanClientInput } from '@/lib/admin/clients/types'
import { applyContractProposal, deriveContract, dismissContractProposal } from '@/lib/admin/clients/contract'
import type { ActionResult } from './actions'

async function attempt(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/klanten')
    revalidatePath('/admin/financien')
    // Nieuwe klant of banknaam: banktransacties opnieuw aan klanten koppelen (zonder Odoo).
    after(() => reclassify().catch(() => undefined))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
const str = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : null
}
const input = (form: FormData) => {
  const indefinite = str(form, 'contract_kind') === 'onbepaald'
  return cleanClientInput({
    name: str(form, 'name'),
    freelancer: str(form, 'freelancer'),
    contract_end: indefinite ? null : str(form, 'contract_end'),
    indefinite,
    contract_start: str(form, 'contract_start'),
    monthly_fee: str(form, 'monthly_fee'),
    freelancer_cost: str(form, 'freelancer_cost'),
    boosting_budget: str(form, 'boosting_budget'),
    bank_name: str(form, 'bank_name'),
  })
}

export async function createClientAction(form: FormData) {
  return attempt(async () => {
    const { clients, user } = await requireAdmin()
    const c = await clients.create(input(form), user.email)
    // "Leid de rest af uit het contract": op de achtergrond, de klant staat er al.
    if (str(form, 'derive') === 'on') after(() => deriveContract(clients, c.id, user.email, { inline: true }).then(() => undefined, (e) => console.error('[klanten] contract afleiden', e)))
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

/** Zoekt het contract in de Drive en laat de agent de bedragen eruit halen (voorstel). */
export async function deriveContractAction(id: string) {
  return attempt(async () => {
    const { clients, user } = await requireAdmin()
    await deriveContract(clients, id, user.email)
  })
}

export async function applyContractAction(id: string) {
  return attempt(async () => {
    const { clients } = await requireAdmin()
    await applyContractProposal(clients, id)
  })
}

export async function dismissContractAction(id: string) {
  return attempt(async () => {
    const { clients } = await requireAdmin()
    await dismissContractProposal(clients, id)
  })
}
