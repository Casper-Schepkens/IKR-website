'use server'

import { revalidatePath } from 'next/cache'
import { requireSales } from '@/lib/admin/session'
import { importHistory, linkChat, whatsappFor } from '@/lib/admin/whatsapp/service'
import type { ActionResult } from './actions'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const idOrNull = (v: FormDataEntryValue | null, label: string) => {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  if (!UUID.test(s)) throw new Error(`${label} klopt niet.`)
  return s
}

/** Chat koppelen aan een lead/klant en actief zetten (dan bewaart de bridge zijn berichten). Nooit iets versturen. */
export async function saveWhatsappChatAction(jid: string, form: FormData): Promise<ActionResult> {
  try {
    const session = await requireSales()
    const repo = await whatsappFor(session)
    await linkChat(
      repo,
      jid,
      {
        lead_id: idOrNull(form.get('lead_id'), 'Lead'),
        klant_id: idOrNull(form.get('klant_id'), 'Klant'),
        intern: form.get('intern') === 'on',
        actief: form.get('actief') === 'on',
        ...(form.has('naam_eigen') ? { naam_eigen: String(form.get('naam_eigen') ?? '') } : {}),
      },
      {
        lead: async (id) => Boolean(await session.leads.get(id)),
        klant: async (id) => (await session.clients.list()).some((c) => c.id === id),
      },
    )
    revalidatePath('/admin/whatsapp')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

/** Historiek uit "Chat exporteren" (in de browser gelezen, hier per stukje van max. 500 berichten). */
export async function importWhatsappAction(jid: string, rows: unknown[]): Promise<ActionResult<{ nieuw: number; overgeslagen: number }>> {
  try {
    const session = await requireSales()
    const res = await importHistory(await whatsappFor(session), jid, rows)
    revalidatePath('/admin/whatsapp')
    return { ok: true, data: res }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
