import 'server-only'
import { after } from 'next/server'
import { enqueue, runJob } from '../ai/jobs'
import type { WeeklySopsInput } from '../ai/handlers'
import { createServiceSupabase } from '../supabase/server'
import { supabaseSops } from './repo'

/**
 * Na een weekly: Grokbot leest het transcript en zet elke afspraak die expliciet als nieuwe SOP
 * aangeduid werd ("@grokbot nieuwe SOP") klaar als SOP-voorstel. Eén keer per transcript.
 */
export async function queueWeeklySops(t: { id: string; title: string; date: string | null; text: string; url: string | null }, opts: { background?: boolean } = {}) {
  if (!t.text.trim()) return null
  // Snelle voorfilter: zonder "SOP" in het transcript is er niets te doen (bespaart een AI-taak).
  if (!/\bsop/i.test(t.text)) return null
  const bestaande = (await supabaseSops(createServiceSupabase()).list()).map((s) => s.title)
  const d = t.date ? new Date(t.date) : new Date()
  const input: WeeklySopsInput = {
    weekly: { datum: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, titel: t.title },
    transcript: t.text,
    fireflies_url: t.url,
    bestaande,
  }
  const job = await enqueue('weekly_sops', `fireflies:${t.id}`, input as unknown as Record<string, unknown>, 'fireflies')
  // Cron: na het antwoord uitvoeren (die heeft weinig tijd); webhook: meteen.
  if (opts.background) after(() => runJob(job.id))
  else await runJob(job.id)
  return job.id
}
