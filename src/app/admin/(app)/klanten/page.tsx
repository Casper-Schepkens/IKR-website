import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { STAGE_LABELS, STAGES } from '@/lib/admin/types'
import { STAGE_TONE } from '@/components/admin/stage'
import { euro, fmtDate, isoDay } from '@/lib/admin/format'
import { nextSendDate } from '@/lib/admin/billing'
import {
  Avatar,
  buttonClass,
  Card,
  Empty,
  input,
  label,
  muted,
  PageHeader,
  Pill,
  Title,
} from '@/components/admin/ui'
import { createClientAction } from '../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Klanten' }

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nieuw?: string; fase?: string }>
}) {
  const { q, nieuw, fase } = await searchParams
  const { repo } = await requireAdmin()
  const [clients, contracts] = await Promise.all([repo.listClients(), repo.listContracts()])
  const today = isoDay(new Date())

  const query = (q ?? '').trim().toLowerCase()
  const filtered = clients.filter(
    (c) =>
      (!query ||
        c.name.toLowerCase().includes(query) ||
        (c.sector ?? '').toLowerCase().includes(query)) &&
      (!fase ? c.stage !== 'churned' : c.stage === fase),
  )

  return (
    <>
      <PageHeader
        eyebrow={`${clients.filter((c) => c.stage !== 'churned').length} klanten en leads`}
        title="Klanten"
      >
        <form className="flex items-center gap-2" role="search">
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek klant…"
            aria-label="Zoek klant"
            className={cn(input, 'min-h-11 w-56 rounded-full bg-ikr-cream-light')}
          />
          {fase && <input type="hidden" name="fase" value={fase} />}
        </form>
        <Link href="/admin/klanten?nieuw=1" className={buttonClass('navy')}>
          + Nieuwe klant
        </Link>
      </PageHeader>

      {nieuw && (
        <Card>
          <Title className="mb-4 text-2xl">Nieuwe klant of lead</Title>
          <form
            action={createClientAction}
            className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
          >
            <label className={label}>
              Naam *
              <input name="name" required className={input} autoFocus />
            </label>
            <label className={label}>
              Fase
              <select name="stage" className={input} defaultValue="lead">
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Eigenaar
              <select name="owner" className={input} defaultValue="">
                <option value="">—</option>
                <option value="casper">Casper</option>
                <option value="cedric">Cedric</option>
              </select>
            </label>
            <label className={label}>
              Bron
              <input name="source" placeholder="bv. doorverwezen" className={input} />
            </label>
            <label className={label}>
              Sector
              <input name="sector" placeholder="bv. bakkerij" className={input} />
            </label>
            <label className={label}>
              Website
              <input name="website" type="url" placeholder="https://" className={input} />
            </label>
            <div className="flex items-end gap-3">
              <button type="submit" className={buttonClass('cyan')}>
                Aanmaken
              </button>
              <Link href="/admin/klanten" className={buttonClass('soft')}>
                Annuleren
              </Link>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/klanten" className={buttonClass(!fase ? 'navy' : 'light', true)}>
          Alle
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s}
            href={`/admin/klanten?fase=${s}`}
            className={buttonClass(fase === s ? 'navy' : 'light', true)}
          >
            {STAGE_LABELS[s]}
          </Link>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        {!filtered.length ? (
          <div className="p-6">
            <Empty>Geen klanten gevonden.</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">
                  Klant
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Fase
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Eigenaar
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Contract
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Volgende factuur
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Laatst gewijzigd
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const contract = contracts.find(
                  (k) => k.client_id === c.id && k.status === 'active',
                )
                const next = contract ? nextSendDate(contract, today) : null
                return (
                  <tr key={c.id} className="border-t border-[#E6DFD2] hover:bg-ikr-cream/60">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/admin/klanten/${c.id}`}
                        className="font-bold text-ikr-navy no-underline hover:text-[#0B7F93]"
                      >
                        {c.name}
                      </Link>
                      {c.sector && <div className={cn('text-xs', muted)}>{c.sector}</div>}
                    </td>
                    <td className="px-3 py-3.5">
                      <Pill tone={STAGE_TONE[c.stage]}>{STAGE_LABELS[c.stage]}</Pill>
                    </td>
                    <td className="px-3 py-3.5">
                      {c.owner ? <Avatar text={c.owner.slice(0, 2).toUpperCase()} /> : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      {contract ? `${euro(contract.monthly_amount_cents)}/mnd` : '—'}
                    </td>
                    <td className="px-3 py-3.5">{next ? fmtDate(next) : '—'}</td>
                    <td className={cn('px-3 py-3.5', muted)}>{fmtDate(c.updated_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
