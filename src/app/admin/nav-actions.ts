'use server'

import { requireAdmin } from '@/lib/admin/session'
import { navTargets } from '@/lib/admin/nav/load'

/** Doelen voor "Ga naar …" (Ctrl+K en de chatbalk). */
export async function navTargetsAction() {
  try {
    return { ok: true as const, data: await navTargets(await requireAdmin()) }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Kon de lijst niet laden.' }
  }
}
