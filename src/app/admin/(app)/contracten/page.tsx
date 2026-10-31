import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { contractProgress, daysUntil, nextSendDate } from '@/lib/admin/billing'
import { euro, fmtDate, isoDay } from '@/lib/admin/format'
import { isBillitConfigured } from '@/lib/admin/integrations/billit'
import { ActionButton } from '@/components/admin/ActionButton'
import { Card, Empty, muted, PageHeader, Pill, Stat, Title } from '@/components/admin/ui'
import {
  prepareInvoicesAction,
  pushInvoiceToBillitAction,
  setInvoiceStatusAction,
} from '../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Contracten' }

export default async function ContractsPage() {
  const { repo } = await requireAdmin()
  const [contracts, clients, invoices] = await Promise.all([
    repo.listContracts(),
    repo.listClients(),
    repo.listInvoices(),
  ])
  const today = isoDay(new Date())
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'
  const active = contracts.filter((c) => c.status === 'active')
  const mrr = active.reduce((s, c) => s + c.monthly_amount_cents, 0)
  const open = invoices.filter((i) => ['to_send', 'draft', 'sent', 'overdue'].includes(i.status))
  const endingSoon = active.filter(
    (c) => c.end_date && daysUntil(c.end_date, today) <= 60 && daysUntil(c.end_date, today) >= 0,
  )
  const billit = isBillitConfigured()

  return (
    <>
      <PageHeader eyebrow="Contracten, facturen en verlengingen" title="Contracten">
        <ActionButton
          action={prepareInvoicesAction}
          variant="navy"
          small={false}
          pendingText="Klaarzetten…"
        >
          Facturen klaarzetten
        </ActionButton>
      </PageHeader>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Stat label="Actieve contracten" value={active.length} />
        <Stat label="MRR" value={euro(mrr)} note={`${euro(mrr * 12)} op jaarbasis`} />
        <Stat
          label="Openstaande facturen"
          value={open.length}
          note={euro(open.reduce((s, i) => s + i.amount_cents, 0))}
          noteTone={open.length ? 'down' : 'muted'}
        />
        <Stat
          label="Lopen af binnen 60 dagen"
          value={endingSoon.length}
          noteTone={endingSoon.length ? 'down' : 'muted'}
          note={endingSoon.map((c) => name(c.client_id)).join(', ') || '—'}
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="px-6 pt-6">
          <Title className="m-0 text-2xl">Contracten</Title>
        </div>
        {!contracts.length ? (
          <div className="p-6">
            <Empty>
              Nog geen contracten. Voeg ze toe in het klantdossier (tabblad Contract & facturen).
            </Empty>
          </div>
        ) : (
          <table className="mt-2 w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Klant
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Pakket
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Bedrag
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Looptijd
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Einde
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Volgende factuur
                </th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const p = contractProgress(c, today)
                const left = c.end_date ? daysUntil(c.end_date, today) : null
                const next = nextSendDate(c, today)
                return (
                  <tr key={c.id} className="border-t border-[#E6DFD2]">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/admin/klanten/${c.client_id}?tab=contract`}
                        className="font-bold text-ikr-navy no-underline hover:text-[#0B7F93]"
                      >
                        {name(c.client_id)}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">{c.package_name ?? '—'}</td>
                    <td className="px-3 py-3.5">{euro(c.monthly_amount_cents)}/mnd</td>
                    <td className="px-3 py-3.5">
                      {p ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-ikr-cream">
                            <div
                              className="h-full bg-ikr-cyan"
                              style={{ width: `${(p.elapsed / p.total) * 100}%` }}
                            />
                          </div>
                          <span className={cn('text-xs', muted)}>
                            {p.elapsed}/{p.total}
                          </span>
                        </div>
                      ) : (
                        'onbepaald'
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {c.end_date
                        ? fmtDate(c.end_date, { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                      {left != null && left >= 0 && left <= 60 && (
                        <Pill tone="yellow" className="ml-2">
                          nog {left} d
                        </Pill>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {next ? fmtDate(next, { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <Title className="m-0 text-2xl">Openstaande facturen</Title>
        {!billit && (
          <p className={cn('m-0 text-xs', muted)}>
            Billit is nog niet gekoppeld. Zet BILLIT_API_KEY en BILLIT_PARTY_ID om concepten
            automatisch klaar te zetten.
          </p>
        )}
        {!open.length && <Empty>Alles is verstuurd en betaald.</Empty>}
        {open
          .sort((a, b) => a.send_date.localeCompare(b.send_date))
          .map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3 text-sm"
            >
              <div className="flex flex-[1_1_240px] flex-col">
                <span className="font-semibold">
                  {name(inv.client_id)} · {inv.label}
                </span>
                <span className={cn('text-xs', muted)}>
                  {euro(inv.amount_cents)} ·{' '}
                  {fmtDate(inv.send_date, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <Pill
                tone={
                  inv.status === 'to_send' || inv.status === 'overdue'
                    ? 'orange'
                    : inv.status === 'draft'
                      ? 'yellow'
                      : 'teal'
                }
              >
                {inv.status === 'to_send'
                  ? 'Te versturen'
                  : inv.status === 'draft'
                    ? 'Concept in Billit'
                    : inv.status === 'sent'
                      ? 'Verstuurd'
                      : 'Te laat'}
              </Pill>
              {inv.status === 'to_send' && billit && (
                <ActionButton
                  action={pushInvoiceToBillitAction.bind(null, inv.id)}
                  pendingText="Naar Billit…"
                >
                  Concept in Billit
                </ActionButton>
              )}
              {(inv.status === 'to_send' || inv.status === 'draft') && (
                <ActionButton action={setInvoiceStatusAction.bind(null, inv.id, 'sent')}>
                  Verstuurd
                </ActionButton>
              )}
              {(inv.status === 'sent' || inv.status === 'overdue') && (
                <ActionButton action={setInvoiceStatusAction.bind(null, inv.id, 'paid')}>
                  Betaald
                </ActionButton>
              )}
            </div>
          ))}
      </Card>
    </>
  )
}
