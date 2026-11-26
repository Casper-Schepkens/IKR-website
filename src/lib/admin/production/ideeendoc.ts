import 'server-only'
import { createServiceSupabase } from '../supabase/server'
import { supabaseWeekly } from '../weekly/repo'
import type { Client } from '../clients/types'
import type { IdeeendocInput } from '../ai/tasks/schemas'
import { IDEA_NOTE, IDEA_STEP } from './ideeendoc-core'
import { defsFor, getClientProduction, loadData, updateStep, type ProductionRepo } from './service'
import type { Cycle } from './core'

export const folderLink = (id: string) => `https://drive.google.com/drive/folders/${id}`

/**
 * De opdracht voor Grok Bot: klant, draaidag n en n+1, klantfiche, wat al gefilmd/gepost is
 * (notities en links van eerdere draaidagen), de Drive-map en de stap waar de link komt.
 */
export async function ideaDocInput(
  repo: ProductionRepo,
  client: Pick<Client, 'id' | 'name' | 'freelancer'> & Partial<Client>,
  cycle: Cycle,
  /** Draaidag n+1: bestaand (id) of nog aan te maken (id null). */
  next: { id: string | null; no: number; shoot_on: string | null },
  earlierDocs: IdeeendocInput['eerdere_docs'],
): Promise<IdeeendocInput> {
  const d = await loadData(repo)
  const { defs } = defsFor(d, client.id)
  const title = new Map(defs.map((x) => [x.key, x.title]))
  const production = d.productions.find((p) => p.client_id === client.id)
  const earlier = d.cycles
    .filter((c) => c.client_id === client.id && c.no <= cycle.no)
    .sort((a, b) => a.no - b.no)
    .map((c) => ({
      draaidag: c.no,
      datum: c.shoot_on,
      items: d.states
        .filter((s) => s.cycle_id === c.id && (s.note || s.link))
        .map((s) => `${title.get(s.step) ?? s.step}: ${[s.note, s.link].filter(Boolean).join(' – ')}`),
    }))
    .filter((e) => e.items.length)
  const state = next.id ? d.states.find((s) => s.cycle_id === next.id && s.step === IDEA_STEP) : undefined
  return {
    klant: { id: client.id, naam: client.name, freelancer: client.freelancer ?? null },
    draaidag: { nr: cycle.no, datum: cycle.shoot_on },
    volgende: { nr: next.no, datum: next.shoot_on, nieuw_aangemaakt: !next.id },
    fiche: { doel: client.content_goal ?? null, niche: client.niche ?? null, doelgroep: client.audience ?? null, beschikbaar: client.available ?? null },
    productie_notitie: production?.note ?? null,
    drive_map: client.drive_folder_id ? { id: client.drive_folder_id, link: folderLink(client.drive_folder_id) } : null,
    stap: { sleutel: IDEA_STEP, draaidag: next.no, bestaat: defs.some((x) => x.key === IDEA_STEP && x.phase === 'draaidag'), huidige_link: state?.link ?? null },
    eerder: earlier,
    eerdere_docs: earlierDocs,
  }
}

/**
 * Resultaat van Grok Bot verwerken: de link van het doc op "ideeen_uitwerken" van draaidag n+1, met
 * een korte notitie (achter een bestaande notitie, niets anders aangeraakt), en een prikbordkaartje
 * voor Milan. Verstuurt niets.
 */
export async function applyIdeaDoc(repo: ProductionRepo, input: IdeeendocInput, output: { doc_url: string; doc_titel: string; samenvatting: string }) {
  const client = { id: input.klant.id, name: input.klant.naam }
  const problems: string[] = []
  try {
    const cp = await getClientProduction(repo, client)
    const current = cp.cycleSteps.find((x) => x.cycle.no === input.stap.draaidag)?.steps.find((s) => s.key === IDEA_STEP)
    const note = current?.note?.includes(IDEA_NOTE) ? current.note : [current?.note, IDEA_NOTE].filter(Boolean).join('\n')
    await updateStep(repo, client, IDEA_STEP, { link: output.doc_url, note }, { cycleNo: input.stap.draaidag, by: 'grokbot' })
  } catch (e) {
    problems.push(e instanceof Error ? e.message : String(e))
  }
  await supabaseWeekly(createServiceSupabase())
    .createPin({
      kind: 'document',
      title: `Ideeëndoc ${input.klant.naam} – draaidag ${input.volgende.nr}`.slice(0, 200),
      body: [output.samenvatting, problems.length ? `Link niet bij de stap gezet: ${problems.join(' · ')}` : ''].filter(Boolean).join('\n\n').slice(0, 4000),
      url: output.doc_url,
      for_owner: 'milan',
      created_by: 'grokbot',
      created_via: 'grokbot',
    })
    .catch((e: unknown) => console.error('[ideeendoc] prikbordkaartje', e))
  if (problems.length) throw new Error(`Ideeëndoc: link niet gezet (${problems.join(' · ')})`)
}
