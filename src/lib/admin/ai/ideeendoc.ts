import 'server-only'
import type { Client } from '../clients/types'
import { cycleNeedingIdeas, ideaDocRef } from '../production/ideeendoc-core'
import { ideaDocInput } from '../production/ideeendoc'
import { defsFor, ensureNextCycle, loadData, today, type ProductionRepo } from '../production/service'
import { claimJob, jobsByRef, updateJobInput } from './jobs'
import { kickJobs } from './kick'

export type IdeaDocResult = { klant: string; draaidag: number | null; resultaat: 'aangemaakt' | 'bestond al' | 'geen voorbije draaidag' | 'gepauzeerd' | string; job_id?: string }

/**
 * Trigger "ideeëndoc na een draaidag": per klant met een actieve productie de laatste draaidag die
 * voorbij is (datum in het verleden of de draaidagstap af, hoogstens 14 dagen geleden). Daarvoor
 * precies één AI-taak `ideeendoc` (ref per klant + draaidag; de unieke index maakt een tweede
 * onmogelijk, ook als deze check vaker of tegelijk loopt). Bestaat draaidag n+1 nog niet, dan wordt hij
 * aangemaakt (zonder datum, of met de datum van het ritme). Daarna één webhook naar Grok Bot.
 * Verstuurt niets naar klanten.
 */
export async function queueIdeaDocs(repo: ProductionRepo, clients: (Pick<Client, 'id' | 'name' | 'freelancer'> & Partial<Client>)[], opts: { by: string; day?: string }): Promise<IdeaDocResult[]> {
  const day = opts.day ?? today()
  const d = await loadData(repo)
  const results: IdeaDocResult[] = []
  const created: string[] = []
  for (const client of clients) {
    const p = d.productions.find((x) => x.client_id === client.id)
    if (!p) continue
    try {
      if (!p.active) {
        results.push({ klant: client.name, draaidag: null, resultaat: 'gepauzeerd' })
        continue
      }
      const shootKey = defsFor(d, client.id).defs.find((x) => x.is_shoot)?.key ?? null
      const cycles = d.cycles.filter((c) => c.client_id === client.id)
      const cycle = cycleNeedingIdeas(cycles, d.states, shootKey, day)
      if (!cycle) {
        results.push({ klant: client.name, draaidag: null, resultaat: 'geen voorbije draaidag' })
        continue
      }
      const ref = ideaDocRef(client.id, cycle.no)
      // Snelle controle; de echte garantie is de unieke index bij claimJob hieronder.
      // Al een taak (in welke status ook, ook weggeklikt): niets meer doen, ook geen draaidag aanmaken.
      const [existing] = await jobsByRef('ideeendoc', [ref])
      if (existing) {
        results.push({ klant: client.name, draaidag: cycle.no, resultaat: 'bestond al', job_id: existing.id })
        continue
      }
      const earlierDocs = (await jobsByRef('ideeendoc', cycles.filter((c) => c.no < cycle.no).map((c) => ideaDocRef(client.id, c.no))))
        .filter((j) => j.status === 'done' && j.output)
        .map((j) => {
          const o = j.output as { doc_url?: string; doc_titel?: string; samenvatting?: string }
          const i = j.input as { volgende?: { nr?: number } }
          return { draaidag: i.volgende?.nr ?? 0, titel: o.doc_titel ?? 'Ideeëndoc', url: o.doc_url ?? '', samenvatting: o.samenvatting ?? null }
        })
        .filter((x) => x.url)
        .sort((a, b) => a.draaidag - b.draaidag)
      const known = cycles.find((c) => c.no === cycle.no + 1) ?? null
      const input = await ideaDocInput(repo, client, cycle, { id: known?.id ?? null, no: cycle.no + 1, shoot_on: known?.shoot_on ?? null }, earlierDocs)
      // Eerst de taak claimen (unieke index type + ref), pas daarna draaidag n+1 aanmaken: zo maakt
      // enkel de run die de taak echt aanmaakte een draaidag aan, ook als twee runs tegelijk lopen.
      const job = await claimJob('ideeendoc', ref, input as unknown as Record<string, unknown>, opts.by)
      if (!job) {
        results.push({ klant: client.name, draaidag: cycle.no, resultaat: 'bestond al' })
        continue
      }
      // Vanaf hier bestaat de taak: altijd melden, ook als draaidag n+1 aanmaken mislukt (dan maakt het
      // klaarzetten hem later alsnog aan, want updateStep maakt de volgende draaidag aan als die ontbreekt).
      created.push(job.id)
      const next = await ensureNextCycle(repo, client, cycle.no, opts.by)
      // Met een ritme kreeg de nieuwe draaidag meteen een datum: die ook in de opdracht zetten.
      if (next.created && next.cycle.shoot_on !== input.volgende.datum)
        await updateJobInput(job.id, { ...input, volgende: { ...input.volgende, datum: next.cycle.shoot_on } } as unknown as Record<string, unknown>)
      results.push({ klant: client.name, draaidag: cycle.no, resultaat: 'aangemaakt', job_id: job.id })
    } catch (e) {
      results.push({ klant: client.name, draaidag: null, resultaat: `fout: ${e instanceof Error ? e.message : String(e)}` })
    }
  }
  // Eén signaal naar Grok Bot voor alle nieuwe taken (bestaande webhook, event ai_jobs_pending).
  if (created.length) await kickJobs(created)
  return results
}
