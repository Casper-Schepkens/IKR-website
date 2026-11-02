import Link from 'next/link'
import { requireSales } from '@/lib/admin/session'
import { daysBetween } from '@/lib/admin/format'
import {
  OPEN_STAGES,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  type Lead,
} from '@/lib/admin/sales/types'
import { SubmitButton } from '@/components/admin/SubmitButton'
import { buttonClass, Card, Empty, input, label, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { createLeadAction } from '../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Leads' }

type View = 'open' | 'won' | 'lost'
const VIEWS: { id: View; label: string }[] = [
  { id: 'open', label: 'Lopend' },
  { id: 'won', label: 'Gewonnen' },
  { id: 'lost', label: 'Lost' },
]

const inView = (l: Lead, v: View) => (v === 'open' ? OPEN_STAGES.includes(l.stage) : l.stage === v)

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ nieuw?: string; fout?: string; weergave?: string }>
}) {
  const { nieuw, fout, weergave } = await searchParams
  const view: View = weergave === 'won' || weergave === 'lost' ? weergave : 'open'
  const { leads } = await requireSales()
  const all = await leads.list()
  const rows = all.filter((l) => inView(l, view))
  const now = new Date()

  return (
    <>
      <PageHeader eyebrow={`${all.filter((l) => inView(l, 'open')).length} lopende leads`} title="Leads">
        <Link href="/admin/sales?nieuw=1" className={buttonClass('navy')}>
          + Nieuwe lead
        </Link>
      </PageHeader>

      {nieuw && (
        <Card>
          <Title className="mb-4 text-2xl">Nieuwe lead</Title>
          {fout && (
            <p role="alert" className="m-0 mb-4 rounded-2xl bg-[#FCE3D2] p-3 text-sm text-[#6E2E09]">
              {fout}
            </p>
          )}
          <form action={createLeadAction} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <label className={label}>
              Naam *
              <input name="name" required className={input} autoFocus />
            </label>
            <label className={label}>
              Bedrijf
              <input name="company" className={input} />
            </label>
            <label className={label}>
              E-mail
              <input name="email" type="email" className={input} />
            </label>
            <label className={label}>
              Telefoon
              <input name="phone" type="tel" className={input} />
            </label>
            <label className={label}>
              Waar komt de lead vandaan?
              <select name="source" className={input} defaultValue="website">
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-3">
              <SubmitButton pendingText="Aanmaken…">Aanmaken</SubmitButton>
              <Link href="/admin/sales" className={buttonClass('soft')}>
                Annuleren
              </Link>
            </div>
          </form>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-bold">Funnel</h2>
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
          {OPEN_STAGES.concat('won').map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className={muted}>→</span>}
              <span className="flex items-baseline gap-1.5 rounded-xl bg-ikr-cream px-3 py-2">
                <span className="font-display text-2xl leading-none font-black">
                  {all.filter((l) => l.stage === s).length}
                </span>
                <span className={cn('text-xs', muted)}>{STAGE_LABELS[s]}</span>
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 sm:ml-auto">
            <span className="flex items-baseline gap-1.5 rounded-xl bg-[#FCE3D2] px-3 py-2">
              <span className="font-display text-2xl leading-none font-black">
                {all.filter((l) => l.stage === 'lost').length}
              </span>
              <span className="text-xs text-[#8A3A0C]">Lost</span>
            </span>
          </li>
        </ol>
      </Card>

      <nav aria-label="Weergave" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={v.id === 'open' ? '/admin/sales' : `/admin/sales?weergave=${v.id}`}
            aria-current={view === v.id ? 'page' : undefined}
            className={buttonClass(view === v.id ? 'navy' : 'light', true)}
          >
            {v.label} <span className="opacity-60">{all.filter((l) => inView(l, v.id)).length}</span>
          </Link>
        ))}
      </nav>

      <Card className="relative overflow-x-auto p-0">
        {!rows.length ? (
          <div className="p-6">
            <Empty>{view === 'open' ? 'Nog geen lopende leads.' : 'Niets in deze lijst.'}</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">Lead</th>
                <th scope="col" className="px-3 py-4 font-semibold">Fase</th>
                <th scope="col" className="px-3 py-4 font-semibold">Bron</th>
                <th scope="col" className="px-3 py-4 font-semibold">In deze fase</th>
                <th scope="col" className="px-6 py-4"><span className="sr-only">Openen</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const days = Math.max(0, daysBetween(l.stage_changed_at, now))
                return (
                  <tr key={l.id} className="border-t border-[#E6DFD2] hover:bg-ikr-cream/60">
                    <td className="px-6 py-3">
                      <Link href={`/admin/sales/leads/${l.id}`} className="font-bold text-ikr-navy no-underline hover:text-[#0B7F93]">
                        {l.name}
                      </Link>
                      {l.company && <div className={cn('text-xs', muted)}>{l.company}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={l.stage === 'lost' ? 'orange' : l.stage === 'won' ? 'green' : 'teal'}>
                        {STAGE_LABELS[l.stage]}
                      </Pill>
                    </td>
                    <td className="px-3 py-3">{SOURCE_LABELS[l.source]}</td>
                    <td className={cn('px-3 py-3', muted)}>
                      {days === 0 ? 'vandaag' : `${days} ${days === 1 ? 'dag' : 'dagen'}`}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/sales/leads/${l.id}`} className={buttonClass('soft', true)}>
                        Open lead
                      </Link>
                    </td>
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
