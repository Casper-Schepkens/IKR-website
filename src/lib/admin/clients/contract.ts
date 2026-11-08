import 'server-only'
import { after } from 'next/server'
import { enqueue, getJob, runJob, type AiJob } from '../ai/jobs'
import type { ContractAfleiden, ContractAfleidenInput } from '../ai/handlers'
import { isSupabaseConfigured } from '../env'
import { findContractDocs } from './contract-docs'
import { cleanClientInput, type Client, type ClientInput } from './types'
import type { ClientsRepo } from './repo'

/**
 * "Leid af uit het contract": het dashboard zoekt de contracten van de klant in de IKR-Drive en een
 * AI-taak (contract_afleiden) haalt er maandbedrag, boosting, freelancerkost en looptijd uit.
 * Het resultaat is een voorstel; pas na "Overnemen" verandert de klant.
 */
export async function deriveContract(clients: ClientsRepo, clientId: string, by: string, opts: { inline?: boolean } = {}): Promise<AiJob> {
  if (!isSupabaseConfigured()) throw new Error('Werkt enkel online (AI-taken staan in Supabase).')
  const c = (await clients.list()).find((x) => x.id === clientId)
  if (!c) throw new Error('Klant niet gevonden.')
  const docs = await findContractDocs(c)
  const input: ContractAfleidenInput = { client: { id: c.id, name: c.name, freelancer: c.freelancer }, docs }
  const job = await enqueue('contract_afleiden', `${c.id}:${Date.now()}`, input as unknown as Record<string, unknown>, by)
  await clients.update(c.id, { contract_job_id: job.id })
  if (opts.inline) {
    await runJob(job.id)
    return job
  }
  try {
    after(() => runJob(job.id))
  } catch {
    void runJob(job.id) // buiten een request
  }
  return job
}

export type ContractProposal = {
  status: AiJob['status']
  error: string | null
  output: ContractAfleiden | null
  docs: { id: string; naam: string; link: string }[]
  /** Velden die zouden veranderen (enkel wat de AI vond en verschilt van nu). */
  changes: { field: keyof ClientInput; label: string; from: string; to: string }[]
  contractLink: string | null
}

const LABELS: Partial<Record<keyof ClientInput, string>> = {
  monthly_fee: 'Klant betaalt / maand',
  boosting_budget: 'Boosting / maand',
  freelancer_cost: 'Freelancer / maand',
  freelancer: 'Freelancer',
  contract_start: 'Contract start',
  contract_end: 'Contract loopt tot',
  contract_indefinite: 'Onbepaalde duur',
}
const show = (v: unknown) => (v == null || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'ja' : 'nee') : typeof v === 'number' ? `€ ${v.toLocaleString('nl-BE')}` : String(v))

/** Wat het voorstel aan de klant zou veranderen. Leeg gevonden velden laten bestaande waarden staan. */
export function proposalPatch(c: Client, out: ContractAfleiden): Partial<ClientInput> {
  const patch: Partial<ClientInput> = {}
  if (out.maandbedrag != null) patch.monthly_fee = out.maandbedrag
  if (out.boosting != null) patch.boosting_budget = out.boosting
  if (out.freelancer_kost != null) patch.freelancer_cost = out.freelancer_kost
  if (out.freelancer && !c.freelancer) patch.freelancer = out.freelancer
  if (out.contract_start) patch.contract_start = out.contract_start
  if (out.onbepaald) Object.assign(patch, { contract_indefinite: true, contract_end: null })
  else if (out.contract_tot) Object.assign(patch, { contract_indefinite: false, contract_end: out.contract_tot })
  return patch
}

export function describeProposal(c: Client, job: AiJob | null): ContractProposal | null {
  if (!job) return null
  const input = job.input as unknown as ContractAfleidenInput
  const docs = (input.docs ?? []).map((d) => ({ id: d.id, naam: d.naam, link: d.link }))
  const output = job.status === 'done' ? (job.output as unknown as ContractAfleiden) : null
  const patch = output ? proposalPatch(c, output) : {}
  const changes = (Object.keys(patch) as (keyof ClientInput)[])
    .filter((k) => LABELS[k] && String(patch[k] ?? '') !== String((c as Record<string, unknown>)[k] ?? ''))
    .map((k) => ({ field: k, label: LABELS[k]!, from: show((c as Record<string, unknown>)[k]), to: show(patch[k]) }))
  const contractLink = output?.contract ? (docs.find((d) => d.id === output.contract!.id)?.link ?? null) : null
  return { status: job.status, error: job.error, output, docs, changes, contractLink }
}

export async function loadProposal(c: Client) {
  return describeProposal(c, c.contract_job_id ? await getJob(c.contract_job_id) : null)
}

/** Voorstel overnemen: enkel gevonden velden, de rest blijft. */
export async function applyContractProposal(clients: ClientsRepo, clientId: string) {
  const c = (await clients.list()).find((x) => x.id === clientId)
  if (!c?.contract_job_id) throw new Error('Geen voorstel om over te nemen.')
  const p = await loadProposal(c)
  if (!p?.output) throw new Error('Het voorstel is nog niet klaar.')
  const patch = proposalPatch(c, p.output)
  const next = cleanClientInput({
    name: c.name,
    freelancer: patch.freelancer ?? c.freelancer,
    contract_end: 'contract_end' in patch ? (patch.contract_end ?? null) : c.contract_end,
    indefinite: patch.contract_indefinite ?? c.contract_indefinite,
    contract_start: patch.contract_start ?? c.contract_start ?? null,
    monthly_fee: patch.monthly_fee ?? c.monthly_fee ?? null,
    freelancer_cost: patch.freelancer_cost ?? c.freelancer_cost ?? null,
    boosting_budget: patch.boosting_budget ?? c.boosting_budget ?? null,
  })
  await clients.update(c.id, { ...next, contract_url: p.contractLink ?? c.contract_url ?? null, contract_job_id: null })
  return next
}

export async function dismissContractProposal(clients: ClientsRepo, clientId: string) {
  await clients.update(clientId, { contract_job_id: null })
}
