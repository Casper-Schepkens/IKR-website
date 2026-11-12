import 'server-only'
import { after } from 'next/server'
import { aiEngine, enqueue, runJob } from '../ai/jobs'
import { notifyGrok } from '../ai/notify'
import type { WeeklySopsInput } from '../ai/handlers'
import { createServiceSupabase } from '../supabase/server'
import { supabaseSops } from './repo'

/** Komt "SOP" of Grok Bot ("grokbot", "grok bot", "rock bot", "groc bot" …) voor in de tekst? (hint voor de taak) */
export const mentionsBot = (text: string) => /\bsop|\b(grok|grock|groc|grog|rok|rock)\s?bot/i.test(text)

/**
 * Na elke weekly (Fireflies-webhook, cron als vangnet): Grokbot verwerkt het transcript.
 * - Per persoon een kaart "Verwerking weekly" op de werkplek (afgesproken, tips, eventueel een actie).
 * - "@grokbot nieuwe SOP …" wordt een SOP-voorstel.
 * - Elke andere "@grokbot …" wordt een Opdracht-kaart bij wie het vroeg; Grokbot gaat er meteen mee aan de slag.
 * Eén keer per transcript.
 */
export async function queueWeeklySops(t: { id: string; title: string; date: string | null; text: string; url: string | null }, opts: { background?: boolean } = {}) {
  if (!t.text.trim()) return null
  const bestaande = (await supabaseSops(createServiceSupabase()).list()).map((s) => s.title)
  const d = t.date ? new Date(t.date) : new Date()
  const input: WeeklySopsInput = {
    weekly: { datum: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, titel: t.title },
    transcript: t.text,
    fireflies_url: t.url,
    bestaande,
    vraagt_bot: mentionsBot(t.text),
  }
  const job = await enqueue('weekly_sops', `fireflies:${t.id}`, input as unknown as Record<string, unknown>, 'fireflies')
  // Uitvoeren: via de API (cron: na het antwoord, want die heeft weinig tijd) of Grokbot porren (webhook naar Cursor).
  const kick = () => (aiEngine() === 'grokbot' ? notifyGrok([job.id]).then(() => undefined) : runJob(job.id))
  if (opts.background) after(kick)
  else await kick()
  return job.id
}
