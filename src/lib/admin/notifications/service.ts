import 'server-only'
import { isSalesOwner, isSupabaseConfigured } from '../env'
import { getNavPrefs } from '../team/nav-prefs'
import { EMPTY_NAV, showsSales } from '../team/nav-core'
import { createServiceSupabase } from '../supabase/server'
import { memoryLeads, supabaseLeads } from '../sales/repo'
import { demoDrafts, supabaseDrafts } from '../sales/drafts'
import { memoryWeekly, supabaseWeekly } from '../weekly/repo'
import { memoryCalls, supabaseCalls } from '../calls/repo'
import { memoryClients, supabaseClients } from '../clients/repo'
import { memorySops, supabaseSops } from '../sops/repo'
import { memoryProduction, supabaseProduction } from '../production/repo'
import { myInternalItems, myNextSteps } from '../production/core'
import { loadProduction } from '../production/service'
import { paymentChecks } from '../finance/core'
import { loadClients as financeClients, loadTxs } from '../finance/store'
import { workspaceRepo } from '../workspace/repo'
import { ownerOf } from '../weekly/types'
import { countProblems, systemStatus } from '../system-status'
import { countCallsToFinish, countExpiring, countFollowUps, countOverdueTodos, countSopProposals, countWorkspace, type Counts } from './core'
import { todayBrussels } from '../dates'

/** Repos met de service role (meldingen worden server-side berekend, per gebruiker gefilterd); lokaal in het geheugen. */
function repos() {
  if (!isSupabaseConfigured())
    return { leads: memoryLeads(), drafts: demoDrafts(), weekly: memoryWeekly(), calls: memoryCalls(), clients: memoryClients(), sops: memorySops(), production: memoryProduction(), db: null }
  const db = createServiceSupabase()
  return { leads: supabaseLeads(db), drafts: supabaseDrafts(db), weekly: supabaseWeekly(db), calls: supabaseCalls(db), clients: supabaseClients(db), sops: supabaseSops(db), production: supabaseProduction(db), db }
}

/** Een bron die faalt, geeft null (de teller toont dan "?"), nooit een valse 0. De fout komt in de logs. */
const tryLoad = async <T,>(what: string, p: Promise<T>): Promise<T | null> =>
  p.catch((e: unknown) => {
    console.error(`[meldingen] ${what}`, e instanceof Error ? e.message : e)
    return null
  })
/** Tellen enkel als alle bronnen geladen zijn. */
const when = <A extends unknown[]>(...args: [...{ [K in keyof A]: A[K] | null }, (...v: A) => number]): number | null => {
  const fn = args.pop() as (...v: A) => number
  return args.some((a) => a === null) ? null : fn(...(args as unknown as A))
}
const today = () => todayBrussels()

/**
 * Tellers kort bewaren per gebruiker (per serverinstantie): de zijbalk vraagt ze elke 30 s en bij elke
 * navigatie op, en elke telling kost 11 tot 17 queries. Een Realtime-wijziging vraagt ze vers op.
 */
const CACHE_MS = 20_000
const cache = (globalThis as unknown as { __ikrCounts?: Map<string, { at: number; value: Promise<Counts> }> }).__ikrCounts ??= new Map()

export function cachedNotificationsFor(email: string, opts: { fresh?: boolean } = {}): Promise<Counts> {
  const key = email.toLowerCase()
  const hit = cache.get(key)
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value
  const value = notificationsFor(key)
  cache.set(key, { at: Date.now(), value })
  value.catch(() => cache.delete(key))
  return value
}

/** Tellers voor één teamlid. Een fout in één bron mag de rest niet tegenhouden. */
export async function notificationsFor(email: string): Promise<Counts> {
  const r = repos()
  const owner = ownerOf(email)
  const day = today()
  const now = Date.now()
  // Sales-tellers enkel als iemand sales-pagina's in zijn menu heeft (standaard: Casper).
  const [cards, sops, todos, weeklies, clients, status, prefs] = await Promise.all([
    tryLoad('werkplek', workspaceRepo().list(email)),
    tryLoad("SOP's", r.sops.list()),
    tryLoad("to-do's", r.weekly.listTodos()),
    tryLoad('weeklies', r.weekly.listWeeklies()),
    tryLoad('klanten', r.clients.list()),
    tryLoad('systeemstatus', systemStatus()),
    getNavPrefs(email).catch(() => EMPTY_NAV),
  ])
  const sales = showsSales(prefs, isSalesOwner(email))
  const counts: Counts = {
    werkplek: when(cards, (c) => countWorkspace(c, email)),
    sops: when(sops, (s) => countSopProposals(s)),
    weekly: owner ? when(todos, weeklies, (t, w) => countOverdueTodos(t, w, owner)) : 0,
    instellingen: status ? countProblems(status) : 0,
  }
  if (owner && clients) {
    const prod = await tryLoad('productie', loadProduction(r.production, clients.map((c) => ({ id: c.id, name: c.name })), day))
    counts.productie = prod ? myNextSteps(prod.list, owner).filter((x) => x.step.overdue).length + myInternalItems(prod.internal, owner).filter((i) => i.overdue).length : null
  } else if (owner) counts.productie = null
  if (sales) {
    const [drafts, calls, leads, unlinked, txs, finClients] = await Promise.all([
      tryLoad('concepten', r.drafts.list({ status: 'concept' })),
      tryLoad('calls', r.calls.list()),
      tryLoad('leads', r.leads.list()),
      r.db
        ? tryLoad(
            'transcripts',
            Promise.resolve(r.db.from('call_transcripts').select('fireflies_id', { count: 'exact', head: true }).in('status', ['ongekoppeld', 'fout'])).then((x) => {
              if (x.error) throw new Error(x.error.message)
              return x.count ?? 0
            }),
          )
        : Promise.resolve(0),
      tryLoad('transacties', loadTxs()),
      tryLoad('financiën', financeClients()),
    ])
    counts.inbox = when(drafts, (d) => d.length)
    counts.calls = when(calls, unlinked, (c, u) => countCallsToFinish(c, now) + u)
    counts.leads = when(leads, (l) => countFollowUps(l, day))
    counts.klanten = when(clients, (c) => countExpiring(c, day))
    counts.financien = when(txs, finClients, (t, c) => paymentChecks(t, c, day).filter((x) => x.status === 'achterstallig').length)
  }
  return counts
}
