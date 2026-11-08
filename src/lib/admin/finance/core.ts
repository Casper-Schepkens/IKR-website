/** Financiën: pure logica (indeling, periodes, cijfers). Geen DB en geen Odoo, zodat het testbaar is. */

export const IN_CATEGORIES = {
  klant: 'Klanten',
  vennoot_in: 'Inbreng vennoten',
  terug: 'Terugbetalingen',
  overig_in: 'Andere inkomsten',
} as const
export const OUT_CATEGORIES = {
  freelancer: 'Freelancers',
  boosting: 'Boosting (TikTok-ads voor klanten)',
  marketing: 'Eigen marketing',
  tools: 'Tools & software',
  boekhouder: 'Boekhouder',
  vennoten: 'Onkosten vennoten',
  vervoer: 'Vervoer & parking',
  onkosten: 'Eten & andere onkosten',
  materiaal: 'Materiaal',
  overheid: 'Overheid & sociale bijdragen',
  overig_uit: 'Andere kosten',
  btw: 'Btw (apart)',
} as const
export const CATEGORY_LABELS: Record<string, string> = { ...IN_CATEGORIES, ...OUT_CATEGORIES, onbekend: 'Nog in te delen' }
export type Category = keyof typeof IN_CATEGORIES | keyof typeof OUT_CATEGORIES | 'onbekend'
export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
export const isInCategory = (c: string) => c in IN_CATEGORIES
export const isOutCategory = (c: string) => c in OUT_CATEGORIES

/** Btw op omzet van Belgische klanten. */
export const VAT_RATE = 0.21

export type Tx = { odoo_id: number; date: string; amount: number; counterparty: string; description: string; category: string; client_id: string | null; manual: boolean }
/** field: 'tegenpartij' = enkel de naam van de tegenpartij (voor namen van personen: de omschrijving bevat ook de naam van de kaarthouder). */
export type Rule = { id?: string; pattern: string; category: string; client_id?: string | null; priority?: number; field?: 'alles' | 'tegenpartij' }
export type ClientLite = {
  id: string
  name: string
  bank_name: string | null
  contract_start: string | null
  contract_end: string | null
  contract_indefinite: boolean
  monthly_fee: number | null
  freelancer_cost: number | null
  boosting_budget: number | null
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
/** Klantnaam zonder rechtsvorm, om op de bank te herkennen (Tempus Thuisverpleging Bv → tempus thuisverpleging). */
export const bankKey = (s: string) => norm(s).replace(/\b(bv|bvba|nv|vzw|commv|cv|srl|sa)\b\.?/g, '').replace(/\s+/g, ' ').trim()

/**
 * Standaardregels, afgeleid uit de echte bank (nov 2026). Eigen regels in de DB gaan altijd voor.
 * Een regel geldt enkel in de richting van zijn categorie (een "klant"-regel nooit op een uitgave).
 */
export const DEFAULT_RULES: Rule[] = [
  // In
  ...['tempus', 'maison slash', 'trixx', 'smartpaw', 'lilalou', 'thrive', 'govaerts', 'v.s.a. foods', 'vsa foods', 'colemont', 'naos optics', 'devlietoever', 'van aalst', 'upper at home', 'beyers annick', 'chez albert', 'wasbar', 'oh!ma', 'ohma', 'shecan'].map((p) => ({ pattern: p, category: 'klant' })),
  ...['jezofficial', 'dpg media', 'correctie'].map((p) => ({ pattern: p, category: 'terug' })),
  ...['meert milan', 'milan meert', 'galle c', 'casper schepkens'].map((p) => ({ pattern: p, category: 'vennoot_in', field: 'tegenpartij' as const })),
  // Uit
  ...['creado por celia', 'celia', 'senna', 'jana', 'davina', 'raphael'].map((p) => ({ pattern: p, category: 'freelancer', field: 'tegenpartij' as const })),
  { pattern: 'tiktok ads', category: 'boosting' },
  ...['facebk', 'facebook', 'rocket leads', 'visitekaart', 'vistaprint'].map((p) => ({ pattern: p, category: 'marketing' })),
  ...['apollo.io', 'zapier', 'bitly', 'metricool', 'odoo', 'google workspace', 'porkbun', 'sintra', 'whop', 'iclosed', 'notion', 'canva', 'openai', 'anthropic', 'vercel', 'cursor', 'capcut', 'adobe', 'lucid', 'wix.com', 'billit', 'mobile vikings', 'chatgpt', 'squarespace', 'godaddy', 'figma', 'slack', 'dropbox', 'apple.com', 'google *', 'fireflies', 'wetransfer', 'base44', 'microsoft', 'greengeeks', 'hostinger', 'midjourney', 'elevenlabs'].map((p) => ({ pattern: p, category: 'tools' })),
  { pattern: 'big on tax', category: 'boekhouder' },
  ...['bijdrage kbc', 'kbc-business pro', 'coda', 'kosten rekening'].map((p) => ({ pattern: p, category: 'overig_uit' })),
  ...['vat revenue', 'tva btw', 'btw administratie', 'btw-'].map((p) => ({ pattern: p, category: 'btw', priority: 5 })),
  ...['acerta', 'fod justitie', 'vlabel', 'fod financien', 'rsz', 'xerius', 'liantis', 'kamer van koophandel', 'staatsblad'].map((p) => ({ pattern: p, category: 'overheid' })),
  ...['meert milan', 'milan meert', 'galle c', 'casper schepkens', 'casper'].map((p) => ({ pattern: p, category: 'vennoten', field: 'tegenpartij' as const })),
  ...['caps energy', 'servicestation', 'parking', 'nmbs', 'sncb', 'interparking', 'shell', 'texaco', 'q8 ', 'lukoil', 'esso', 'total energies', 'dats 24', 'be-mobile', 'parkeren', 'parkeer', 'park ', 'q-park', 'indigo', 'tankstation', 'esso', 'total ', 'oostende p', 'q8', 'gabriels', 'octa+'].map((p) => ({ pattern: p, category: 'vervoer' })),
  ...['restaurant', 'aperitivo', 'delhaize', 'colruyt', 'carrefour', 'albert heijn', 'lunch', 'frituur', 'pizza', 'cafe ', 'brasserie', 'bakkerij', 'starbucks', 'panos', 'takeaway', 'deliveroo', 'uber eats', 'paylogic', 'mcdonald', 'mc donald', 'kfc', 'quick ', 'exki', 'lidl', 'aldi', 'spar ', 'bar ', 'burger', 'poke', 'pok?', 'bowl', 'tacos', 'bistro', 'resto', 'kapitein', 'bavet', 'republiek', 'pureto', 'bocca', 'buddha', 'smash', 'ellis gourmet', 'pittoresk', 'airbnb', 'hotel', 'booking.com', 'gate 5'].map((p) => ({ pattern: p, category: 'onkosten' })),
  ...['coolblue', 'mediamarkt', 'media markt', 'fnac', 'bol.com', 'amazon', 'action ', 'kamera express', 'krefel', 'vanden borre', 'ikea', 'hema', '2 copy', 'copy', 'edc ', 'decathlon'].map((p) => ({ pattern: p, category: 'materiaal' })),
]

function ruleMatches(r: Rule, tx: Pick<Tx, 'amount' | 'counterparty' | 'description'>) {
  const kindOk = r.category === 'onbekend' || (tx.amount > 0 ? isInCategory(r.category) : isOutCategory(r.category))
  if (!kindOk) return false
  const p = norm(r.pattern)
  if (!p) return false
  if (r.field === 'tegenpartij') return norm(tx.counterparty).includes(p)
  return norm(tx.counterparty).includes(p) || norm(tx.description).includes(p)
}

/** Klant bij een inkomst: via bank_name of naam van de klant (zonder rechtsvorm). */
export function matchClient(tx: Pick<Tx, 'counterparty' | 'description'>, clients: ClientLite[]): string | null {
  const hay = bankKey(`${tx.counterparty} ${tx.description}`)
  const hits = clients.filter((c) => [c.bank_name, c.name].some((n) => n && bankKey(n).length >= 3 && hay.includes(bankKey(n))))
  return hits.length === 1 ? hits[0].id : null
}

/** Indeling van één transactie: eigen regels (hoogste prioriteit) voor standaardregels; anders "onbekend". */
export function classify(tx: Pick<Tx, 'amount' | 'counterparty' | 'description'>, rules: Rule[], clients: ClientLite[]): { category: string; client_id: string | null; rule_id: string | null } {
  const ordered = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  const hit = ordered.find((r) => ruleMatches(r, tx)) ?? [...DEFAULT_RULES].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).find((r) => ruleMatches(r, tx))
  if (!hit) return { category: tx.amount > 0 ? 'overig_in' : 'onbekend', client_id: null, rule_id: null }
  const client = hit.client_id ?? (hit.category === 'klant' ? matchClient(tx, clients) : null)
  return { category: hit.category, client_id: client, rule_id: hit.id ?? null }
}

// ─── Periodes ─────────────────────────────────────────────
export type PeriodKind = 'maand' | 'kwartaal' | 'jaar'
export type Period = { kind: PeriodKind; key: string; label: string; from: string; to: string }

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const pad = (n: number) => String(n).padStart(2, '0')
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** key: '2026-10' (maand), '2026-Q4' (kwartaal), '2026' (jaar). */
export function periodOf(kind: PeriodKind, key: string): Period {
  if (kind === 'jaar') {
    const y = Number(key)
    return { kind, key, label: String(y), from: `${y}-01-01`, to: `${y}-12-31` }
  }
  if (kind === 'kwartaal') {
    const [y, q] = [Number(key.slice(0, 4)), Number(key.slice(-1))]
    const m1 = (q - 1) * 3 + 1
    return { kind, key, label: `Q${q} ${y}`, from: `${y}-${pad(m1)}-01`, to: `${y}-${pad(m1 + 2)}-${lastDay(y, m1 + 2)}` }
  }
  const [y, m] = key.split('-').map(Number)
  return { kind, key, label: `${MONTHS[m - 1]} ${y}`, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` }
}

export function periodKeyFor(kind: PeriodKind, day: string) {
  const [y, m] = [Number(day.slice(0, 4)), Number(day.slice(5, 7))]
  return kind === 'jaar' ? String(y) : kind === 'kwartaal' ? `${y}-Q${Math.ceil(m / 3)}` : `${y}-${pad(m)}`
}

export function shiftPeriod(p: Period, step: number): Period {
  if (p.kind === 'jaar') return periodOf('jaar', String(Number(p.key) + step))
  const months = p.kind === 'kwartaal' ? 3 * step : step
  const d = new Date(Date.UTC(Number(p.from.slice(0, 4)), Number(p.from.slice(5, 7)) - 1 + months, 1))
  return periodOf(p.kind, periodKeyFor(p.kind, d.toISOString().slice(0, 10)))
}

/** Maanden (YYYY-MM) in een periode. */
export const monthsIn = (p: Period) => {
  const out: string[] = []
  let d = new Date(`${p.from}T00:00:00Z`)
  while (d.toISOString().slice(0, 10) <= p.to) {
    out.push(d.toISOString().slice(0, 7))
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  }
  return out
}

// ─── Cijfers ──────────────────────────────────────────────
const r2 = (n: number) => Math.round(n * 100) / 100 + 0 // + 0: geen "-0"
const exVat = (n: number) => n / (1 + VAT_RATE)

export type ClientRow = {
  client_id: string | null
  naam: string
  ontvangen: number
  ontvangen_excl_btw: number
  contract_omzet: number | null
  freelancer: number | null
  boosting: number | null
  over: number | null
  actieve_maanden: number
}

export type Overview = {
  period: Period
  omzet_excl_btw: number
  omzet_incl_btw: number
  freelancers: number
  boosting: number
  na_freelancer_boosting: number
  kosten: { category: string; label: string; total: number; top: { naam: string; total: number }[] }[]
  overige_kosten: number
  over: number
  btw: { op_omzet: number; betaald: number; saldo: number }
  vennoten_inbreng: number
  terugbetalingen: number
  andere_inkomsten: number
  nog_in_te_delen: { aantal: number; total: number }
  per_klant: ClientRow[]
}

/** Actieve contractmaanden van een klant binnen de maanden van een periode. */
function activeMonths(c: ClientLite, months: string[]) {
  return months.filter((m) => (!c.contract_start || m >= c.contract_start.slice(0, 7)) && (c.contract_indefinite || !c.contract_end || m <= c.contract_end.slice(0, 7)))
}

/**
 * Overzicht over een periode (kasbasis = de bank). Omzet exclusief btw (÷1,21), kosten zoals betaald.
 * Btw-betalingen en inbreng van vennoten tellen niet mee in "over". Per klant: wat er binnenkwam en,
 * als het contract ingevuld is, freelancer en boosting volgens het contract.
 */
export function overview(txs: Tx[], clients: ClientLite[], period: Period): Overview {
  const inP = txs.filter((t) => t.date >= period.from && t.date <= period.to)
  const sum = (f: (t: Tx) => boolean) => r2(inP.filter(f).reduce((a, t) => a + t.amount, 0))
  const omzetIncl = sum((t) => t.category === 'klant')
  const out = (c: string) => r2(-sum((t) => t.category === c))
  const costCats = (Object.keys(OUT_CATEGORIES) as string[]).filter((c) => c !== 'btw')
  const kosten = [...costCats, 'onbekend']
    .map((c) => {
      const list = inP.filter((t) => t.category === c && t.amount < 0)
      const by = new Map<string, number>()
      for (const t of list) by.set(t.counterparty || t.description.slice(0, 40), (by.get(t.counterparty || t.description.slice(0, 40)) ?? 0) - t.amount)
      return {
        category: c,
        label: CATEGORY_LABELS[c],
        total: r2(list.reduce((a, t) => a - t.amount, 0)),
        top: [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([naam, total]) => ({ naam, total: r2(total) })),
      }
    })
    .filter((k) => k.total > 0)
    .sort((a, b) => b.total - a.total)
  const freelancers = out('freelancer')
  const boosting = out('boosting')
  const totalCosts = r2(kosten.reduce((a, k) => a + k.total, 0))
  const omzet = r2(exVat(omzetIncl))
  const btwOp = r2(omzetIncl - omzet)
  const btwBetaald = out('btw')

  // Per klant
  const months = monthsIn(period)
  const rows = new Map<string, ClientRow>()
  const rowFor = (id: string | null, naam: string) => {
    const k = id ?? `bank:${naam}`
    if (!rows.has(k)) rows.set(k, { client_id: id, naam, ontvangen: 0, ontvangen_excl_btw: 0, contract_omzet: null, freelancer: null, boosting: null, over: null, actieve_maanden: 0 })
    return rows.get(k)!
  }
  for (const t of inP.filter((x) => x.category === 'klant')) {
    // Ook betalingen van vóór de klant (of zijn banknaam) in het dashboard stond, alsnog koppelen.
    const id = t.client_id ?? matchClient(t, clients)
    const c = id ? clients.find((x) => x.id === id) : null
    const row = rowFor(c?.id ?? null, c?.name ?? (t.counterparty || 'Onbekende klant'))
    row.ontvangen = r2(row.ontvangen + t.amount)
  }
  for (const c of clients) {
    const act = activeMonths(c, months)
    if (!act.length || (c.monthly_fee == null && c.freelancer_cost == null && c.boosting_budget == null)) continue
    const row = rowFor(c.id, c.name)
    row.actieve_maanden = act.length
    row.contract_omzet = c.monthly_fee != null ? r2(c.monthly_fee * act.length) : null
    row.freelancer = c.freelancer_cost != null ? r2(c.freelancer_cost * act.length) : null
    row.boosting = c.boosting_budget != null ? r2(c.boosting_budget * act.length) : null
  }
  for (const row of rows.values()) {
    row.ontvangen_excl_btw = r2(exVat(row.ontvangen))
    const base = row.ontvangen_excl_btw || row.contract_omzet || 0
    row.over = row.freelancer != null || row.boosting != null ? r2(base - (row.freelancer ?? 0) - (row.boosting ?? 0)) : null
  }

  const onbekend = inP.filter((t) => t.category === 'onbekend')
  return {
    period,
    omzet_excl_btw: omzet,
    omzet_incl_btw: omzetIncl,
    freelancers,
    boosting,
    na_freelancer_boosting: r2(omzet - freelancers - boosting),
    kosten,
    overige_kosten: r2(totalCosts - freelancers - boosting),
    over: r2(omzet - totalCosts + sum((t) => t.category === 'terug') + sum((t) => t.category === 'overig_in')),
    btw: { op_omzet: btwOp, betaald: btwBetaald, saldo: r2(btwOp - btwBetaald) },
    vennoten_inbreng: sum((t) => t.category === 'vennoot_in'),
    terugbetalingen: sum((t) => t.category === 'terug'),
    andere_inkomsten: sum((t) => t.category === 'overig_in'),
    nog_in_te_delen: { aantal: onbekend.length, total: r2(-onbekend.reduce((a, t) => a + t.amount, 0)) },
    per_klant: [...rows.values()].sort((a, b) => b.ontvangen - a.ontvangen || (b.contract_omzet ?? 0) - (a.contract_omzet ?? 0)),
  }
}

/** Per maand: omzet (excl. btw) en kosten (zonder btw), voor de grafiek. */
export function monthlySeries(txs: Tx[], months: string[]) {
  return months.map((m) => {
    const list = txs.filter((t) => t.date.startsWith(m))
    const omzet = r2(exVat(list.filter((t) => t.category === 'klant').reduce((a, t) => a + t.amount, 0)))
    const kosten = r2(-list.filter((t) => t.amount < 0 && t.category !== 'btw' && (isOutCategory(t.category) || t.category === 'onbekend')).reduce((a, t) => a + t.amount, 0))
    return { maand: m, omzet, kosten, over: r2(omzet - kosten) }
  })
}

// ─── Betalingscheck per klant ─────────────────────────────
export type PaymentStatus = 'betaald' | 'deels' | 'open' | 'achterstallig'
export type PaymentMonth = { maand: string; verwacht: number; ontvangen: number; status: PaymentStatus; vervalt: string }
export type PaymentCheck = {
  client_id: string
  naam: string
  maandbedrag_incl_btw: number
  maanden: PaymentMonth[]
  verwacht_vervallen: number
  ontvangen: number
  achterstallig: number
  tegoed: number
  afwijkend: { datum: string; bedrag: number }[]
  status: 'in_orde' | 'achterstallig' | 'wacht'
}

/** Betalingstermijn uit de contracten: 21 dagen na de factuur (die valt ten laatste op het einde van de maand). */
export const PAYMENT_TERM_DAYS = 21
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/**
 * Kwam elke maand het contractbedrag (incl. btw) binnen? Betalingen van een klant vanaf de contractstart worden
 * op volgorde over de contractmaanden verdeeld (een late of dubbele betaling vult dus de oudste open maand).
 * Een maand is achterstallig als hij 21 dagen na het einde van die maand nog niet (helemaal) betaald is.
 * Betalingen die geen veelvoud van het maandbedrag zijn, komen bij "afwijkend".
 */
export function paymentChecks(txs: Tx[], clients: ClientLite[], today: string): PaymentCheck[] {
  const thisMonth = today.slice(0, 7)
  const out: PaymentCheck[] = []
  for (const c of clients) {
    if (!c.monthly_fee || !c.contract_start) continue
    const start = c.contract_start.slice(0, 7)
    const end = !c.contract_indefinite && c.contract_end ? c.contract_end.slice(0, 7) : null
    const last = end && end < thisMonth ? end : thisMonth
    if (start > last) continue
    const months = monthsIn({ kind: 'maand', key: '', label: '', from: `${start}-01`, to: `${last}-28` })
    const due = r2(c.monthly_fee * (1 + VAT_RATE))
    const pays = txs
      .filter((t) => t.category === 'klant' && t.amount > 0 && t.date >= c.contract_start! && (t.client_id ?? matchClient(t, clients)) === c.id)
      .sort((a, b) => a.date.localeCompare(b.date))
    let pool = r2(pays.reduce((a, t) => a + t.amount, 0))
    const maanden = months.map((m): PaymentMonth => {
      const [y, mo] = m.split('-').map(Number)
      const vervalt = addDays(`${m}-${pad(lastDay(y, mo))}`, PAYMENT_TERM_DAYS)
      const got = r2(Math.min(pool, due))
      pool = r2(pool - got)
      const status: PaymentStatus = got >= due - 0.5 ? 'betaald' : today > vervalt ? 'achterstallig' : got > 0 ? 'deels' : 'open'
      return { maand: m, verwacht: due, ontvangen: got, status, vervalt }
    })
    const vervallen = maanden.filter((m) => today > m.vervalt)
    const achterstallig = r2(vervallen.reduce((a, m) => a + (m.verwacht - m.ontvangen), 0))
    const afwijkend = pays.filter((t) => ![1, 2, 3].some((k) => Math.abs(t.amount - k * due) < 1)).map((t) => ({ datum: t.date, bedrag: t.amount }))
    out.push({
      client_id: c.id,
      naam: c.name,
      maandbedrag_incl_btw: due,
      maanden,
      verwacht_vervallen: r2(vervallen.reduce((a, m) => a + m.verwacht, 0)),
      ontvangen: r2(pays.reduce((a, t) => a + t.amount, 0)),
      achterstallig,
      tegoed: pool,
      afwijkend,
      status: achterstallig > 0.5 ? 'achterstallig' : maanden.some((m) => m.status !== 'betaald') ? 'wacht' : 'in_orde',
    })
  }
  return out.sort((a, b) => b.achterstallig - a.achterstallig || a.naam.localeCompare(b.naam))
}
