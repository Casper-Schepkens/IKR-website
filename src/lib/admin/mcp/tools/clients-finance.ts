import 'server-only'
import { z } from 'zod'
import { isoDay } from '../../format'
import { cleanClientInput, daysLeft, type Client } from '../../clients/types'
import { applyContractProposal, deriveContract, loadProposal } from '../../clients/contract'
import { ALL_CATEGORIES, CATEGORY_LABELS, isInCategory, isOutCategory, overview, paymentChecks, periodKeyFor, periodOf, type PeriodKind } from '../../finance/core'
import { loadClients, loadTxs, setTxCategory, syncFinance, syncState } from '../../finance/store'

import { BY, PERIOD_KEY, relinkFinance, type ToolCtx } from '../tool'

/** Klanten, contracten en financiën (hele team; Odoo enkel lezen). */
export function registerClientTools(ctx: ToolCtx) {
  const { tool, resolveClient, session } = ctx
  const { clients } = session
  // ─── Klanten (productie, zichtbaar voor het hele team) ───────────────
  const clientView = (c: Client) => ({
    klant_id: c.id,
    naam: c.name,
    freelancer: c.freelancer,
    contract_start: c.contract_start ?? null,
    contract_tot: c.contract_end,
    contract_onbepaald: Boolean(c.contract_indefinite),
    dagen_over: daysLeft(c, isoDay(new Date())),
    maandbedrag: c.monthly_fee ?? null,
    freelancer_kost: c.freelancer_cost ?? null,
    boosting: c.boosting_budget ?? null,
    bank_naam: c.bank_name ?? null,
  })
  const contractTot = z
    .string()
    .optional()
    .describe('Einde contract: YYYY-MM-DD, leeg (niet gekend) of "onbepaald" (contract van onbepaalde duur, zonder einddatum)')
  const contractMoney = {
    contract_start: z.string().optional().describe('Start contract YYYY-MM-DD (leeg = niet gekend)'),
    maandbedrag: z.union([z.number(), z.string()]).nullable().optional().describe('Wat de klant per maand betaalt, excl. btw, volgens het contract (incl. het boostingbudget als dat mee gefactureerd wordt)'),
    freelancer_kost: z.union([z.number(), z.string()]).nullable().optional().describe('Wat we de freelancer per maand voor deze klant betalen'),
    boosting: z.union([z.number(), z.string()]).nullable().optional().describe('Boostingbudget per maand'),
    bank_naam: z.string().optional().describe('Naam waaronder de klant op de bank verschijnt, als die afwijkt'),
  }
  const onbepaald = z.boolean().optional().describe('true = contract van onbepaalde duur (wist de einddatum); false = niet onbepaald')
  tool(
    'klanten_lijst',
    'Alle klanten met freelancer en contract: contract_tot (datum of null), contract_onbepaald (true = onbepaalde duur, dan dagen_over null en nooit verlopen) en dagen_over. Eerst aflopend bovenaan, dan onbepaalde duur, dan zonder einddatum.',
    {},
    true,
    async () => (await clients.list()).map(clientView),
  )
  tool(
    'klant_aanmaken',
    'Nieuwe klant toevoegen. Contract: een einddatum (contract_tot), onbepaalde duur (contract_tot "onbepaald" of onbepaald: true), of leeg als het niet gekend is.',
    { naam: z.string(), freelancer: z.string().optional(), contract_tot: contractTot, onbepaald, ...contractMoney },
    false,
    async ({ naam, freelancer, contract_tot, onbepaald: ind, contract_start, maandbedrag, freelancer_kost, boosting, bank_naam }) => {
      relinkFinance()
      return clientView(
        await clients.create(
          cleanClientInput({ name: naam, freelancer, contract_end: contract_tot, indefinite: ind, contract_start, monthly_fee: maandbedrag, freelancer_cost: freelancer_kost, boosting_budget: boosting, bank_name: bank_naam }),
          BY,
        ),
      )
    },
  )
  tool(
    'klant_bijwerken',
    'Freelancer, contract of naam van een klant aanpassen. Contract: contract_tot = YYYY-MM-DD (einddatum), "onbepaald" (onbepaalde duur) of leeg (niet gekend); of onbepaald: true/false. Een lege tekst maakt het veld leeg; niet meegegeven velden blijven.',
    { klant: z.string().describe('naam of id'), naam: z.string().optional(), freelancer: z.string().optional(), contract_tot: contractTot, onbepaald, ...contractMoney },
    false,
    async ({ klant, naam, freelancer, contract_tot, onbepaald: ind, contract_start, maandbedrag, freelancer_kost, boosting, bank_naam }) => {
      const c = await resolveClient(klant)
      // Contract enkel aanpassen als het meegegeven is; een datum zet onbepaalde duur uit, onbepaald wist de datum.
      const end = contract_tot !== undefined ? contract_tot : ind ? null : c.contract_end
      const indefinite = ind !== undefined ? ind : contract_tot !== undefined ? false : c.contract_indefinite
      const next = cleanClientInput({
        name: naam ?? c.name,
        freelancer: freelancer ?? c.freelancer,
        contract_end: end,
        indefinite,
        ...(contract_start !== undefined ? { contract_start } : {}),
        ...(maandbedrag !== undefined ? { monthly_fee: maandbedrag } : {}),
        ...(freelancer_kost !== undefined ? { freelancer_cost: freelancer_kost } : {}),
        ...(boosting !== undefined ? { boosting_budget: boosting } : {}),
        ...(bank_naam !== undefined ? { bank_name: bank_naam } : {}),
      })
      await clients.update(c.id, next)
      relinkFinance()
      return `${next.name} bijgewerkt.`
    },
  )
  tool(
    'klant_contract_afleiden',
    'Zoekt de contracten van een klant in de IKR-Drive (contract, addendum, offerte, freelancecontract) en zet een AI-taak contract_afleiden klaar die maandbedrag, boosting, freelancerkost en looptijd eruit haalt. Het resultaat is een voorstel dat het team op de Klanten-pagina overneemt (of jij met klant_contract_overnemen, enkel als iemand daarom vraagt).',
    { klant: z.string().describe('naam of id') },
    false,
    async ({ klant }) => {
      const c = await resolveClient(klant)
      const job = await deriveContract(clients, c.id, BY)
      const docs = ((job.input as { docs?: { naam: string }[] }).docs ?? []).map((d) => d.naam)
      return { taak_id: job.id, documenten: docs, uitleg: docs.length ? 'De AI-taak staat klaar (ai_taken_open bij de Grokbot-engine).' : 'Geen contracten gevonden in de Drive.' }
    },
  )
  tool('klant_contract_voorstel', 'Het voorstel uit "leid af uit het contract" voor een klant: status, gevonden bedragen, wat zou veranderen en de gebruikte documenten.', { klant: z.string() }, true, async ({ klant }) => {
    const c = await resolveClient(klant)
    return (await loadProposal(c)) ?? `${c.name}: geen voorstel.`
  })
  tool('klant_contract_overnemen', 'Neemt het voorstel uit het contract over in de klant (enkel gevonden velden). Enkel als iemand van het team daarom vraagt.', { klant: z.string() }, false, async ({ klant }) => {
    const c = await resolveClient(klant)
    const next = await applyContractProposal(clients, c.id)
    relinkFinance()
    return `${c.name} bijgewerkt: ${JSON.stringify(next)}`
  })
  tool('klant_verwijderen', 'Klant uit de lijst halen.', { klant: z.string() }, false, async ({ klant }) => {
    const c = await resolveClient(klant)
    await clients.remove(c.id)
    return `${c.name} verwijderd.`
  })
  // ─── Financiën (Odoo, enkel lezen) ──────────────────────
  const finPeriod = (periode: PeriodKind | undefined, sleutel: string | undefined) => {
    const kind = periode ?? 'maand'
    const key = sleutel?.trim() || periodKeyFor(kind, isoDay(new Date()))
    if (!PERIOD_KEY[kind].test(key)) throw new Error(`Sleutel voor ${kind}: bv. ${kind === 'maand' ? '2026-10' : kind === 'kwartaal' ? '2026-Q4' : '2026'}.`)
    return periodOf(kind, key)
  }
  const periodeArgs = {
    periode: z.enum(['maand', 'kwartaal', 'jaar']).optional().describe('standaard maand'),
    sleutel: z.string().optional().describe('2026-10 (maand), 2026-Q4 (kwartaal) of 2026 (jaar); leeg = de huidige'),
  }
  tool(
    'financien_overzicht',
    'Cijfers van IKR over een maand, kwartaal of jaar (kasbasis, uit de bank in Odoo): omzet excl. btw, freelancers, boosting, andere kosten per categorie (met grootste tegenpartijen), wat overblijft, btw apart, banksaldo, per klant (ontvangen vs contract) en hoeveel nog in te delen is. Bedragen in euro.',
    periodeArgs,
    true,
    async ({ periode, sleutel }) => {
      const p = finPeriod(periode, sleutel)
      await syncFinance().catch(() => undefined)
      const [txs, cl, st] = await Promise.all([loadTxs(), loadClients(), syncState()])
      return { ...overview(txs, cl, p), banksaldo: st.bank_balance, bijgewerkt: st.synced_at, fout_bij_bijwerken: st.error }
    },
  )
  tool(
    'financien_transacties',
    `Banktransacties uit Odoo met hun indeling. Filter op periode, categorie (${ALL_CATEGORIES.join(', ')}) of tekst. "onbekend" = nog in te delen. Max 200, nieuwste eerst.`,
    { ...periodeArgs, categorie: z.string().optional(), zoek: z.string().optional().describe('tekst in tegenpartij of omschrijving') },
    true,
    async ({ periode, sleutel, categorie, zoek }) => {
      const p = periode || sleutel ? finPeriod(periode, sleutel) : null
      const [txs, cl] = await Promise.all([loadTxs(), loadClients()])
      const names = new Map(cl.map((c) => [c.id, c.name]))
      const q = zoek?.trim().toLowerCase()
      return txs
        .filter((t) => (!p || (t.date >= p.from && t.date <= p.to)) && (!categorie || t.category === categorie) && (!q || `${t.counterparty} ${t.description}`.toLowerCase().includes(q)))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 200)
        .map((t) => ({
          odoo_id: t.odoo_id,
          datum: t.date,
          bedrag: t.amount,
          tegenpartij: t.counterparty,
          omschrijving: t.description,
          categorie: t.category,
          categorie_label: CATEGORY_LABELS[t.category] ?? t.category,
          klant: t.client_id ? (names.get(t.client_id) ?? null) : null,
          handmatig: t.manual,
        }))
    },
  )
  tool(
    'financien_indelen',
    'Eén banktransactie in een categorie zetten (enkel in het dashboard; Odoo blijft ongewijzigd). Inkomsten: klant (met klant), vennoot_in, terug, overig_in. Uitgaven: freelancer, boosting, marketing, tools, boekhouder, vennoten (onkosten van Casper/Cedric/Milan), vervoer, onkosten, materiaal, overheid, overig_uit, btw. regel: true = dezelfde tegenpartij voortaan altijd zo indelen.',
    { odoo_id: z.number().int(), categorie: z.string(), klant: z.string().optional().describe('naam of id, enkel bij categorie klant'), regel: z.boolean().optional() },
    false,
    async ({ odoo_id, categorie, klant, regel }) => {
      const tx = (await loadTxs()).find((t) => t.odoo_id === odoo_id)
      if (!tx) throw new Error('Transactie niet gevonden.')
      if (!(tx.amount >= 0 ? isInCategory(categorie) : isOutCategory(categorie))) throw new Error(`"${categorie}" past niet bij een ${tx.amount >= 0 ? 'inkomst' : 'uitgave'}.`)
      const clientId = categorie === 'klant' && klant ? (await resolveClient(klant)).id : null
      await setTxCategory(odoo_id, categorie, clientId, { makeRule: Boolean(regel), by: BY })
      return `Ingedeeld als ${CATEGORY_LABELS[categorie]}${regel ? ' (en voortaan altijd zo)' : ''}.`
    },
  )
  tool(
    'financien_betalingen',
    'Betalingscheck per klant: kwam het contractbedrag (incl. btw) elke maand binnen? Per maand betaald / deels / open (nog niet vervallen) / achterstallig (21 dagen na het einde van de maand), het achterstallige bedrag, te veel betaald en betalingen met een afwijkend bedrag. Enkel klanten met maandbedrag en contractstart.',
    { klant: z.string().optional().describe('naam of id; leeg = alle klanten') },
    true,
    async ({ klant }) => {
      // Mislukt Odoo, dan rekenen we met de laatst gekende cijfers: zeg dat erbij.
      const waarschuwing = await syncFinance().then(
        () => null,
        (e: unknown) => `Odoo kon niet bijgewerkt worden (${e instanceof Error ? e.message : String(e)}): cijfers van de vorige keer.`,
      )
      const [txs, cl] = await Promise.all([loadTxs(), loadClients()])
      const checks = paymentChecks(txs, cl, isoDay(new Date()))
      if (!klant) return { klanten: checks, zonder_check: cl.filter((c) => !c.monthly_fee || !c.contract_start).map((c) => c.name), ...(waarschuwing ? { waarschuwing } : {}) }
      const c = await resolveClient(klant)
      return checks.find((x) => x.client_id === c.id) ?? `${c.name}: geen maandbedrag of contractstart ingevuld.`
    },
  )
  tool('financien_bijwerken', 'Haalt nu de nieuwste banktransacties en het saldo uit Odoo (enkel lezen).', {}, false, async () => syncFinance({ force: true }))
}
