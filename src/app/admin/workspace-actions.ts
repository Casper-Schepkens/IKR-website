'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { workspaceRepo } from '@/lib/admin/workspace/repo'
import { askBot, getOwnCard, memberEmail } from '@/lib/admin/workspace/service'
import { CARD_STATUSES, type CardStatus } from '@/lib/admin/workspace/types'
import type { ActionResult } from './actions'

/** Werkplek van Grok Bot: elk teamlid enkel op zijn eigen kaarten (Casper voorlopig op alle). */
async function attempt(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath('/admin/werkplek')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}
const str = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

/** Opdracht aan Grok Bot: wordt een kaart "Opdracht" en de bot gaat ermee aan de slag. */
export async function giveOrderAction(form: FormData) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const text = str(form, 'text')
    if (!text) throw new Error('Schrijf wat Grok Bot moet doen.')
    // Casper kan (voorlopig) ook een opdracht op de werkplek van iemand anders zetten.
    const forWho = str(form, 'for')
    const owner = forWho && canSeeSales(user.email) ? memberEmail(forWho) : user.email
    const firstLine = text.split('\n')[0]
    const card = await workspaceRepo().create({ owner_email: owner, kind: 'opdracht', title: firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine, body: text.slice(0, 20000), created_by: user.email, unread: false })
    await askBot({ ...card, messages: [] }, 'opdracht', user.email)
  })
}

export async function replyCardAction(id: string, form: FormData) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const card = await getOwnCard(id, user.email)
    const text = str(form, 'text')
    if (!text) throw new Error('Schrijf een bericht.')
    const msg = await workspaceRepo().addMessage(card.id, user.email, text.slice(0, 20000))
    await askBot({ ...card, messages: [...card.messages, msg] }, 'antwoord', user.email)
  })
}

/** Voorgestelde actie: "Doe maar" (bot zet het klaar, verstuurt nooit) of "Nee". */
export async function decideCardActionAction(id: string, approve: boolean) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const card = await getOwnCard(id, user.email)
    if (card.action_status !== 'voorgesteld') throw new Error('Er staat geen actie open.')
    await workspaceRepo().update(card.id, { action_status: approve ? 'goedgekeurd' : 'afgewezen' })
    if (approve) await askBot({ ...card, action_status: 'goedgekeurd' }, 'actie', user.email)
  })
}

export async function setCardStatusAction(id: string, status: CardStatus) {
  return attempt(async () => {
    if (!CARD_STATUSES.includes(status)) throw new Error('Onbekende status.')
    const { user } = await requireAdmin()
    await getOwnCard(id, user.email)
    await workspaceRepo().update(id, { status })
  })
}

export async function markCardReadAction(id: string) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    const card = await getOwnCard(id, user.email)
    // Enkel de eigenaar zet "gelezen" (Casper die meekijkt niet).
    if (card.unread && card.owner_email === user.email) await workspaceRepo().update(id, { unread: false })
  })
}

export async function deleteCardAction(id: string) {
  return attempt(async () => {
    const { user } = await requireAdmin()
    await getOwnCard(id, user.email)
    await workspaceRepo().remove(id)
  })
}
