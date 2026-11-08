import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { loadClients, loadTxs, syncFinance, syncState } from '@/lib/admin/finance/store'
import { isOdooConfigured } from '@/lib/admin/finance/odoo'
import { monthlySeries, overview, paymentChecks, periodKeyFor, type PaymentCheck, type PaymentStatus, periodOf, shiftPeriod, type PeriodKind } from '@/lib/admin/finance/core'
import { fmtDate, fmtTime, isoDay } from '@/lib/admin/format'
import { buttonClass, Card, muted, PageHeader, Title } from '@/components/admin/ui'
import { FinanceChart } from '@/components/admin/finance/FinanceChart'
import { SyncFinanceButton, TxList } from '@/components/admin/finance/FinanceClient'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Financiën' }

const eur = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)

/** Tijdstip van deze render (servercomponent, één keer per verzoek). */
function today() {
  return isoDay(new Date())
}

const KINDS: { id: PeriodKind; label: string }[] = [
  { id: 'maand', label: 'Maand' },
  { id: 'kwartaal', label: 'Kwartaal' },
  { id: 'jaar', label: 'Jaar' },
]

/**
 * Financieel overzicht (hele team): per maand, kwartaal of jaar wat er binnenkwam, wat er naar freelancers en
 * boosting ging, waar de rest naartoe gaat en wat er overblijft. Bron: de bank in Odoo (enkel lezen).
 */
export default async function FinancePage({ searchParams }: { searchParams: Promise<{ p?: string; k?: string }> }) {
  await requireAdmin()
  const sp = await searchParams
  const kind: PeriodKind = sp.p === 'kwartaal' || sp.p === 'jaar' ? sp.p : 'maand'
  const period = periodOf(kind, sp.k && /^\d{4}(-(Q[1-4]|\d{2}))?$/.test(sp.k) ? sp.k : periodKeyFor(kind, today()))
  const syncError = isOdooConfigured() ? await syncFinance().then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e))) : 'ODOO_API_KEY ontbreekt in Vercel.'
  const [txs, clients, state] = await Promise.all([loadTxs(), loadClients(), syncState()])
  const o = overview(txs, clients, period)
  const checks = paymentChecks(txs, clients, today())
  const last12 = Array.from({ length: 12 }, (_, i) => shiftPeriod(periodOf('maand', periodKeyFor('maand', today())), i - 11).key)
  const series = monthlySeries(txs, last12)
  const href = (p: PeriodKind, k: string) => `/admin/financien?p=${p}&k=${k}`
  const prev = shiftPeriod(period, -1)
  const next = shiftPeriod(period, 1)
  const inPeriod = txs.filter((t) => t.date >= period.from && t.date <= period.to)

  return (
    <>
      <PageHeader eyebrow={`Bron: bank in Odoo${state.synced_at ? ` · bijgewerkt ${fmtDate(state.synced_at)} ${fmtTime(state.synced_at)}` : ''}`} title="Financiën">
        <SyncFinanceButton />
      </PageHeader>
      {(syncError || state.error) && (
        <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-3 text-sm text-[#6E2E09]">
          Odoo niet bijgewerkt: {syncError ?? state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Periode" className="flex gap-1.5">
          {KINDS.map((k) => (
            <Link key={k.id} href={href(k.id, periodKeyFor(k.id, period.from))} aria-current={kind === k.id ? 'page' : undefined} className={buttonClass(kind === k.id ? 'navy' : 'light', true)}>
              {k.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={href(kind, prev.key)} aria-label={`Vorige: ${prev.label}`} className={buttonClass('light', true)}>
            ←
          </Link>
          <span className="min-w-36 text-center text-lg font-bold capitalize">{period.label}</span>
          <Link href={href(kind, next.key)} aria-label={`Volgende: ${next.label}`} className={buttonClass('light', true)}>
            →
          </Link>
        </div>
      </div>

      {/* Kerncijfers */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <Tile label="Omzet (excl. btw)" value={eur(o.omzet_excl_btw)} sub={`${eur(o.omzet_incl_btw)} ontvangen incl. btw`} />
        <Tile label="Freelancers" value={eur(o.freelancers)} />
        <Tile label="Boosting" value={eur(o.boosting)} />
        <Tile label="Na freelancers & boosting" value={eur(o.na_freelancer_boosting)} strong />
        <Tile label="Andere kosten" value={eur(o.overige_kosten)} sub={o.nog_in_te_delen.aantal ? `waarvan ${eur(o.nog_in_te_delen.total)} nog in te delen` : undefined} />
        <Tile label="Over" value={eur(o.over)} strong tone={o.over < 0 ? 'neg' : 'pos'} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <Tile label="Banksaldo (nu)" value={eur(state.bank_balance)} />
        <Tile label="Btw op omzet deze periode" value={eur(o.btw.op_omzet)} sub={`${eur(o.btw.betaald)} btw betaald deze periode`} />
        <Tile label="Btw nog te betalen (schatting)" value={eur(o.btw.saldo)} sub="btw op omzet − btw betaald; zonder aftrekbare btw op kosten" />
      </div>

      <Payments checks={checks} noFee={clients.filter((c) => !c.monthly_fee || !c.contract_start).map((c) => c.name)} />

      {/* Per klant */}
      <Card className="relative overflow-x-auto p-0">
        <div className="px-6 pt-5">
          <Title className="m-0 text-2xl">Per klant</Title>
          <p className={cn('m-0 text-sm', muted)}>Ontvangen volgens de bank; freelancer en boosting volgens het contract (in te vullen bij Klanten).</p>
        </div>
        <table className="mt-3 w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className={cn('text-xs', muted)}>
              <th scope="col" className="px-6 py-3 font-semibold">Klant</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Ontvangen (excl. btw)</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Contract</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Freelancer</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Boosting</th>
              <th scope="col" className="px-6 py-3 text-right font-semibold">Over</th>
            </tr>
          </thead>
          <tbody>
            {!o.per_klant.length && (
              <tr>
                <td colSpan={6} className={cn('px-6 py-4', muted)}>
                  Geen klantbetalingen in deze periode.
                </td>
              </tr>
            )}
            {o.per_klant.map((r) => (
              <tr key={r.client_id ?? r.naam} className="border-t border-[#E6DFD2]">
                <td className="px-6 py-2.5 font-semibold">{r.naam}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {eur(r.ontvangen_excl_btw)}
                  {r.contract_omzet != null && r.ontvangen === 0 && <span className="ml-1 text-xs text-[#A3470F]">nog niet betaald</span>}
                </td>
                <td className={cn('px-3 py-2.5 text-right tabular-nums', muted)}>{eur(r.contract_omzet)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.freelancer == null ? <span className={muted}>?</span> : eur(r.freelancer)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.boosting == null ? <span className={muted}>?</span> : eur(r.boosting)}</td>
                <td className="px-6 py-2.5 text-right font-bold tabular-nums">{eur(r.over)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={cn('m-0 px-6 py-3 text-xs', muted)}>
          ? = nog niet ingevuld bij <Link href="/admin/klanten">Klanten</Link>. &quot;Over&quot; = ontvangen (of contract) − freelancer − boosting.
        </p>
      </Card>

      {/* Waar gaat het geld naartoe */}
      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Waar gaat het geld naartoe</Title>
        {!o.kosten.length && <p className={cn('m-0 text-sm', muted)}>Geen uitgaven in deze periode.</p>}
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {o.kosten.map((k) => {
            const max = o.kosten[0]?.total || 1
            return (
              <li key={k.category} className="grid grid-cols-[minmax(130px,200px)_1fr_auto] items-center gap-3 text-sm">
                <span className={cn('font-semibold', k.category === 'onbekend' && 'text-[#A3470F]')}>{k.label}</span>
                <span className="relative h-5" title={`${k.label}: ${eur(k.total, 2)}\n${k.top.map((t) => `${t.naam}: ${eur(t.total, 2)}`).join('\n')}`}>
                  <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-[#EB6834]" style={{ width: `${Math.max(2, (k.total / max) * 100)}%` }} />
                </span>
                <span className="tabular-nums">{eur(k.total)}</span>
              </li>
            )
          })}
        </ul>
        {o.vennoten_inbreng > 0 || o.terugbetalingen > 0 || o.andere_inkomsten > 0 ? (
          <p className={cn('m-0 text-xs', muted)}>
            Niet in de omzet: inbreng vennoten {eur(o.vennoten_inbreng)} · terugbetalingen {eur(o.terugbetalingen)} · andere inkomsten {eur(o.andere_inkomsten)}.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Laatste 12 maanden</Title>
        <FinanceChart data={series} />
      </Card>

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Transacties · {period.label}</Title>
        <TxList
          txs={inPeriod.map((t) => ({ ...t }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          defaultFilter={o.nog_in_te_delen.aantal ? 'onbekend' : 'alles'}
        />
      </Card>
    </>
  )
}

function Tile({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string; strong?: boolean; tone?: 'pos' | 'neg' }) {
  return (
    <Card className={cn('flex flex-col gap-1 p-4', strong && 'ring-2 ring-ikr-navy')}>
      <span className={cn('text-xs font-semibold', muted)}>{label}</span>
      <span className={cn('text-2xl font-black tabular-nums', tone === 'neg' && 'text-[#A3470F]')}>{value}</span>
      {sub && <span className={cn('text-xs', muted)}>{sub}</span>}
    </Card>
  )
}

const STATUS: Record<PaymentStatus, { label: string; icon: string; cls: string }> = {
  betaald: { label: 'betaald', icon: '✓', cls: 'bg-[#DDF1E4] text-[#1E5B33]' },
  open: { label: 'nog niet vervallen', icon: '…', cls: 'bg-[#EFE9DE] text-ikr-navy' },
  deels: { label: 'deels betaald', icon: '½', cls: 'bg-[#FBEFC9] text-[#6B4A00]' },
  achterstallig: { label: 'achterstallig', icon: '!', cls: 'bg-[#FCE3D2] text-[#8A3209]' },
}
const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const monthLabel = (m: string) => `${MONTH_SHORT[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`

/** Kwam het contractbedrag elke maand binnen? (laatste 6 contractmaanden per klant) */
function Payments({ checks, noFee }: { checks: PaymentCheck[]; noFee: string[] }) {
  const late = checks.filter((c) => c.status === 'achterstallig')
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Title className="m-0 text-2xl">Betalingen klanten</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Contractbedrag incl. btw tegenover wat er op de bank binnenkwam. Een maand is achterstallig als hij {21} dagen na het einde van de maand niet betaald is.
          {late.length ? ` ${late.length} klant${late.length > 1 ? 'en' : ''} met achterstal.` : ' Niets achterstallig.'}
        </p>
      </div>
      {!checks.length && <p className={cn('m-0 text-sm', muted)}>Vul bij Klanten het maandbedrag en de contractstart in.</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {checks.map((c) => (
          <li key={c.client_id} className="flex flex-col gap-2 border-t border-[#E6DFD2] py-3 md:flex-row md:items-center md:gap-4">
            <div className="min-w-0 md:w-48">
              <p className="m-0 font-semibold">{c.naam}</p>
              <p className={cn('m-0 text-xs', muted)}>{eur(c.maandbedrag_incl_btw, 2)} / maand incl. btw</p>
            </div>
            <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={`Maanden ${c.naam}`}>
              {c.maanden.slice(-6).map((m) => {
                const s = STATUS[m.status]
                return (
                  <li
                    key={m.maand}
                    title={`${monthLabel(m.maand)}: ${s.label} · ${eur(m.ontvangen, 2)} van ${eur(m.verwacht, 2)} · vervalt ${m.vervalt}`}
                    className={cn('rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', s.cls)}
                  >
                    <span aria-hidden>{s.icon}</span> {monthLabel(m.maand)}
                    <span className="sr-only">: {s.label}</span>
                  </li>
                )
              })}
            </ol>
            <div className="text-sm md:ml-auto md:text-right">
              {c.achterstallig > 0.5 ? (
                <p className="m-0 font-bold text-[#8A3209]">! {eur(c.achterstallig, 2)} achterstallig</p>
              ) : (
                <p className="m-0 font-semibold">{c.status === 'in_orde' ? '✓ in orde' : 'in orde tot nu'}</p>
              )}
              {c.tegoed > 0.5 && <p className={cn('m-0 text-xs', muted)}>{eur(c.tegoed, 2)} te veel betaald</p>}
              {c.afwijkend.map((a) => (
                <p key={a.datum + a.bedrag} className="m-0 text-xs text-[#6B4A00]">
                  Afwijkend bedrag: {eur(a.bedrag, 2)} op {a.datum}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {noFee.length > 0 && (
        <p className={cn('m-0 text-xs', muted)}>
          Geen check voor {noFee.join(', ')}: maandbedrag of contractstart ontbreekt bij <Link href="/admin/klanten">Klanten</Link>.
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.values(STATUS).map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span aria-hidden className={cn('rounded-full px-1.5', s.cls)}>{s.icon}</span> {s.label}
          </span>
        ))}
      </div>
    </Card>
  )
}
