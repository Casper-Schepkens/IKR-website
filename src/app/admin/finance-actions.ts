'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { isInCategory, isOutCategory } from '@/lib/admin/finance/core'
import { loadTxs, setTxCategory, syncFinance } from '@/lib/admin/finance/store'
import type { ActionResult } from './actions'

/** Financiën (hele team). Odoo wordt enkel gelezen; de indeling staat in het dashboard. */
async function attempt<T = void>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    revalidatePath('/admin/financien')
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

export async function syncFinanceAction() {
  return attempt(async () => {
    await requireAdmin()
    return syncFinance({ force: true })
  })
}

export async function setCategoryAction(odooId: number, category: string, clientId: string | null, makeRule: boolean) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const tx = (await loadTxs()).find((t) => t.odoo_id === odooId)
    if (!tx) throw new Error('Transactie niet gevonden.')
    if (!(tx.amount >= 0 ? isInCategory(category) : isOutCategory(category))) throw new Error('Die categorie past niet bij deze transactie.')
    await setTxCategory(odooId, category, category === 'klant' ? clientId : null, { makeRule, by: user.email })
  })
}
