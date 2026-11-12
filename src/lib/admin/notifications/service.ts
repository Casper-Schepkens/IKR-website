import 'server-only'
import { canSeeSales, isSupabaseConfigured } from '../env'
import { createServiceSupabase } from '../supabase/server'
import { memoryLeads, supabaseLeads } from '../sales/repo'
import { demoDrafts, supabaseDrafts } from '../sales/drafts'
import { memoryWeekly, supabaseWeekly } from '../weekly/repo'
import { memoryCalls, supabaseCalls } from '../calls/repo'
import { memoryClients, supabaseClients } from '../clients/repo'
import { memorySops, supabaseSops } from '../sops/repo'
import { memoryProduction, supabaseProduction } from '../production/repo'
import { myNextSteps } from '../production/core'
import { loadProduction } from '../production/service'
import { paymentChecks } from '../finance/core'
import { loadClients as financeClients, loadTxs } from '../finance/store'
import { workspaceRepo } from '../workspace/repo'
import { ownerOf } from '../weekly/types'
import { countCallsToFinish, countExpiring, countFollowUps, countOverdueTodos, countSopProposals, countWorkspace, type Counts } from './core'

/** Repos met de service role (meldingen worden server-side berekend, per gebruiker gefilterd); lokaal in het geheugen. */
function repos() {
  if (!isSupabaseConfigured())
    return { leads: memoryLeads(), drafts: demoDrafts(), weekly: memoryWeekly(), calls: memoryCalls(), clients: memoryClients(), sops: memorySops(), production: memoryProduction(), db: null }
  const db = createServiceSupabase()
  return { leads: supabaseLeads(db), drafts: supabaseDrafts(db), weekly: supabaseWeekly(db), calls: supabaseCalls(db), clients: supabaseClients(db), sops: supabaseSops(db), production: supabaseProduction(db), db }
}

const safe = async <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback)
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())

/** Tellers voor één teamlid. Een fout in één bron mag de rest niet tegenhouden. */
export async function notificationsFor(email: string): Promise<Counts> {
  const r = repos()
  const owner = ownerOf(email)
  const sales = canSeeSales(email)
  const day = today()
  const now = Date.now()
  const [cards, sops, todos, weeklies, clients] = await Promise.all([
    safe(workspaceRepo().list(email), []),
    safe(r.sops.list(), []),
    safe(r.weekly.listTodos(), []),
    safe(r.weekly.listWeeklies(), []),
    safe(r.clients.list(), []),
  ])
  const counts: Counts = {
    werkplek: countWorkspace(cards, email),
    sops: countSopProposals(sops),
    weekly: owner ? countOverdueTodos(todos, weeklies, owner) : 0,
  }
  if (owner) {
    const prod = await safe(loadProduction(r.production, clients.map((c) => ({ id: c.id, name: c.name })), day), { list: [], notStarted: [] })
    counts.productie = myNextSteps(prod.list, owner).filter((x) => x.step.overdue).length
  }
  if (sales) {
    const [drafts, calls, leads, unlinked, txs, finClients] = await Promise.all([
      safe(r.drafts.list({ status: 'concept' }), []),
      safe(r.calls.list(), []),
      safe(r.leads.list(), []),
      r.db ? safe(Promise.resolve(r.db.from('call_transcripts').select('fireflies_id', { count: 'exact', head: true }).in('status', ['ongekoppeld', 'fout'])).then((x) => x.count ?? 0), 0) : Promise.resolve(0),
      safe(loadTxs(), []),
      safe(financeClients(), []),
    ])
    counts.inbox = drafts.length
    counts.calls = countCallsToFinish(calls, now) + unlinked
    counts.leads = countFollowUps(leads, day)
    counts.klanten = countExpiring(clients, day)
    counts.financien = paymentChecks(txs, finClients, day).filter((c) => c.status === 'achterstallig').length
  }
  return counts
}
