import 'server-only'
import { after } from 'next/server'
import { aiEngine, enqueue, runJob } from '../ai/jobs'
import { notifyGrok } from '../ai/notify'
import type { WeeklySopsInput } from '../ai/handlers'
import { createServiceSupabase } from '../supabase/server'
import { supabaseSops } from './repo'

/** Komt "SOP" of Grok Bot ("grokbot", "grok bot", "rock bot", "groc bot" …) voor in de tekst? */
export const mentionsBot = (text: string) => /\bsop|\b(grok|grock|groc|grog|rok|rock)\s?bot/i.test(text)

/**
 * Na een weekly: Grokbot leest het transcript. Elke afspraak die expliciet als nieuwe SOP aangeduid werd
 * ("@grokbot nieuwe SOP") wordt een SOP-voorstel; elke andere "@grokbot …"-vraag een Opdracht-kaart op de
 * werkplek van wie het vroeg, waar Grokbot meteen mee aan de slag gaat. Eén keer per transcript.
 */
export async function queueWeeklySops(t: { id: string; title: string; date: string | null; text: string; url: string | null }, opts: { background?: boolean } = {}) {
  if (!t.text.trim()) return null
  // Snelle voorfilter: zonder "SOP" of "grokbot" (ook zoals spraakherkenning het schrijft) is er niets te doen.
  if (!mentionsBot(t.text)) return null
  const bestaande = (await supabaseSops(createServiceSupabase()).list()).map((s) => s.title)
  const d = t.date ? new Date(t.date) : new Date()
  const input: WeeklySopsInput = {
    weekly: { datum: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, titel: t.title },
    transcript: t.text,
    fireflies_url: t.url,
    bestaande,
  }
  const job = await enqueue('weekly_sops', `fireflies:${t.id}`, input as unknown as Record<string, unknown>, 'fireflies')
  // Uitvoeren: via de API (cron: na het antwoord, want die heeft weinig tijd) of Grokbot porren (webhook naar Cursor).
  const kick = () => (aiEngine() === 'grokbot' ? notifyGrok([job.id]).then(() => undefined) : runJob(job.id))
  if (opts.background) after(kick)
  else await kick()
  return job.id
}
