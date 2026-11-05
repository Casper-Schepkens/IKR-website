'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { removeTeamConnection, setSelectedCalendars, type TeamKind } from '@/lib/admin/team/connections'
import { listCalendars } from '@/lib/admin/team/google-read'
import type { ActionResult } from './actions'

/** Mijn koppelingen: elk teamlid beheert enkel zijn eigen koppelingen (altijd op basis van de sessie). */
async function attempt(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/instellingen')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

export async function disconnectTeamAction(kind: TeamKind) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    if (kind !== 'mail' && kind !== 'agenda') throw new Error('Onbekende koppeling.')
    await removeTeamConnection(user.email, kind)
  })
}

export async function saveCalendarsAction(form: FormData) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const ids = form.getAll('calendar').filter((v): v is string => typeof v === 'string')
    await setSelectedCalendars(user.email, ids)
  })
}

/** Lijst met agenda's opnieuw ophalen (bv. na een nieuwe gedeelde agenda); keuze blijft waar mogelijk. */
export async function refreshCalendarsAction() {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const calendars = await listCalendars(user.email)
    const { listOwnConnections } = await import('@/lib/admin/team/connections')
    const own = (await listOwnConnections(user.email)).find((c) => c.kind === 'agenda')
    const keep = (own?.selected_calendars ?? []).filter((id) => calendars.some((c) => c.id === id))
    await setSelectedCalendars(user.email, keep.length ? keep : calendars.filter((c) => c.primair).map((c) => c.id), calendars)
  })
}
