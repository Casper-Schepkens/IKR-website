import 'server-only'
import { after } from 'next/server'
import { aiEngine, enqueue, runJob } from '../ai/jobs'
import { notifyGrok } from '../ai/notify'
import { canSeeSales, isSupabaseConfigured, SALES_EMAIL } from '../env'
import { TEAM } from '../weekly/types'
import { workspaceRepo } from './repo'
import { CARD_KINDS, type Card, type CardWithMessages } from './types'

export const BOT = 'grokbot'
export type BotReason = 'opdracht' | 'antwoord' | 'actie'
export type WerkplekInput = {
  reden: BotReason
  kaart: { id: string; soort: string; titel: string; tekst: string; status: string; actie: string | null; actie_uitleg: string | null; link: string | null }
  voor: { naam: string; email: string; sales: boolean }
  draadje: { van: string; tekst: string; op: string }[]
}

export const memberEmail = (who: string) => {
  const t = TEAM.find((m) => m.key === who.toLowerCase() || m.email === who.toLowerCase() || m.name.toLowerCase() === who.toLowerCase())
  if (!t) throw new Error(`Onbekend teamlid "${who}". Kies casper, cedric of milan.`)
  return t.email
}
export const memberName = (email: string) => TEAM.find((m) => m.email === email.toLowerCase())?.name ?? email.split('@')[0]

/** Eigen kaarten; Casper mag (voorlopig) alles zien en doen. */
export function canUse(card: Pick<Card, 'owner_email'>, userEmail: string) {
  return card.owner_email.toLowerCase() === userEmail.toLowerCase() || canSeeSales(userEmail)
}

export async function getOwnCard(id: string, userEmail: string) {
  const c = await workspaceRepo().get(id)
  if (!c || !canUse(c, userEmail)) throw new Error('Kaart niet gevonden.')
  return c
}

/** Grok Bot aan het werk zetten op een kaart (AI-taak "werkplek"): opdracht uitvoeren, antwoorden of de actie doen. */
export async function askBot(card: CardWithMessages, reden: BotReason, by: string) {
  // Demo (lokaal zonder Supabase): geen AI-taken; een vast antwoord om de pagina te kunnen testen.
  if (!isSupabaseConfigured()) {
    await workspaceRepo().addMessage(card.id, BOT, `(demo) Grok Bot zou nu ${reden === 'actie' ? 'de actie klaarzetten' : reden === 'opdracht' ? 'met de opdracht aan de slag gaan' : 'antwoorden'}.`)
    if (reden === 'actie') await workspaceRepo().update(card.id, { action_status: 'uitgevoerd' })
    return null
  }
  const input: WerkplekInput = {
    reden,
    kaart: { id: card.id, soort: CARD_KINDS[card.kind], titel: card.title, tekst: card.body, status: card.status, actie: card.action_label, actie_uitleg: card.action_detail, link: card.link },
    voor: { naam: memberName(card.owner_email), email: card.owner_email, sales: card.owner_email === SALES_EMAIL },
    draadje: card.messages.slice(-20).map((m) => ({ van: m.author === BOT ? 'Grok Bot' : memberName(m.author), tekst: m.body, op: m.created_at })),
  }
  const job = await enqueue('werkplek', `${card.id}:${Date.now()}`, input as unknown as Record<string, unknown>, by)
  await workspaceRepo().update(card.id, { bot_busy_since: new Date().toISOString() })
  const kick = () => (aiEngine() === 'grokbot' ? notifyGrok([job.id]).then(() => undefined) : aiEngine() === 'api' ? runJob(job.id) : Promise.resolve())
  try {
    after(kick)
  } catch {
    void kick()
  }
  return job
}
