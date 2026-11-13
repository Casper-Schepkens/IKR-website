import { requireSales } from '@/lib/admin/session'
import { coldMailStats, isApolloConfigured } from '@/lib/admin/sales/apollo'
import { isDemoMode } from '@/lib/admin/env'
import { STAGES, type Stage } from '@/lib/admin/sales/types'
import { Suspense } from 'react'
import { Card, muted, PageHeader, Pill, Spinner, Stat } from '@/components/admin/ui'
import type { LeadsRepo } from '@/lib/admin/sales/repo'
import { cn } from '@/utilities/ui'
import { parseSelection, selectSequences } from '@/lib/admin/sales/sequence-filter'
import { SequenceFilter } from '@/components/admin/sales/SequenceFilter'

export const metadata = { title: 'Cold mails' }

/** Onder dit aantal nieuwe adressen: tijd om Grokbot om nieuwe adressen te vragen. */
const LOW_ADDRESSES = 20

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

export default async function ColdMailsPage({ searchParams }: { searchParams: Promise<{ alle?: string; seq?: string }> }) {
  const { leads } = await requireSales()
  const selection = parseSelection(await searchParams)

  if (!isApolloConfigured() && !isDemoMode()) {
    return (
      <>
        <PageHeader title="Cold mails" />
        <Card>
          <p className={cn('m-0', muted)}>
            Apollo is nog niet gekoppeld: zet <code>APOLLO_API_KEY</code> in Vercel en deploy opnieuw.
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow="Apollo · ververst om de 5 minuten" title="Cold mails" />
      <Suspense
        fallback={
          <Card className="flex items-center gap-2 text-sm font-semibold">
            <Spinner /> Cijfers uit Apollo laden…
          </Card>
        }
      >
        <ColdMailStats leads={leads} selection={selection} />
      </Suspense>
    </>
  )
}

/** Alles wat van Apollo komt: apart gestreamd, zodat de pagina niet op Apollo wacht. */
async function ColdMailStats({ leads, selection }: { leads: LeadsRepo; selection: ReturnType<typeof parseSelection> }) {
  // Leads (database) en Apollo tegelijk ophalen.
  const leadsList = leads.list()
  leadsList.catch(() => undefined)
  let stats: Awaited<ReturnType<typeof coldMailStats>>
  try {
    stats = await coldMailStats()
  } catch (e) {
    return (
      <Card>
        <p role="alert" className="m-0 text-[#A3470F]">
          {e instanceof Error ? e.message : 'Apollo is niet bereikbaar.'}
        </p>
      </Card>
    )
  }

  const all = await leadsList
  const fromColdMail = all.filter((l) => l.source === 'cold_mail')
  // Een lead die nu in een latere fase zit (of gewonnen is), heeft de vorige fases doorlopen.
  const reached = (s: Stage) =>
    fromColdMail.filter((l) => l.stage !== 'lost' && STAGES.indexOf(l.stage) >= STAGES.indexOf(s)).length

  // Stats en totalen enkel over de getoonde sequences (standaard de actieve).
  const { shown } = selectSequences(stats.sequences, selection)
  const delivered = shown.reduce((a, s) => a + s.delivered, 0)
  const replied = shown.reduce((a, s) => a + s.replied, 0)
  const low = stats.newAddresses < LOW_ADDRESSES

  const funnel = [
    { label: 'Verstuurd', value: delivered },
    { label: 'Reacties', value: replied },
    { label: 'Leads (mailverkeer)', value: fromColdMail.length },
    { label: 'Setter calls', value: reached('setter_planned') },
    { label: 'Sales calls', value: reached('sales_planned') },
    { label: 'Gewonnen', value: reached('won') },
  ]

  return (
    <>
      <Card
        className={cn('flex flex-wrap items-center justify-between gap-4', low ? 'bg-[#FCE3D2]' : '')}
      >
        <div className="flex flex-col gap-1">
          <span className={cn('text-[13px] font-medium', low ? 'text-[#8A3A0C]' : muted)}>
            Nieuwe adressen nog te mailen in de actieve sequence
          </span>
          <span className="font-display text-[56px] leading-none font-black tracking-[-0.03em]">
            {stats.newAddresses}
          </span>
          <span className={cn('text-[13px]', low ? 'text-[#8A3A0C]' : muted)}>
            {stats.scheduled} mails ingepland in totaal (incl. opvolgmails)
          </span>
        </div>
        {low && (
          <p className="m-0 max-w-sm text-[15px] font-semibold text-[#6E2E09]">
            Bijna op: vraag Grokbot om nieuwe adressen.
          </p>
        )}
      </Card>

      <SequenceFilter sequences={stats.sequences.map((x) => ({ id: x.id, name: x.name, active: x.active }))} inactive={selection.inactive} ids={selection.ids} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {funnel.map((f, i) => (
          <Stat
            key={f.label}
            label={f.label}
            value={f.value}
            note={i === 0 ? `${shown.length} sequence${shown.length === 1 ? '' : 's'}` : `${pct(f.value, funnel[i - 1].value)} van vorige stap`}
            noteTone="muted"
          />
        ))}
      </div>
      <p className={cn('-mt-4 m-0 text-xs', muted)}>
        Verstuurd en reacties: enkel de gekozen sequences. Leads en calls tellen alle leads met bron &quot;Cold mail&quot; (Apollo koppelt die niet aan een sequence); leads die lost zijn tellen enkel mee bij Leads.
      </p>

      <Card className="relative overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className={cn('text-xs', muted)}>
              <th scope="col" className="px-6 py-4 font-semibold">Sequence</th>
              <th scope="col" className="px-3 py-4 font-semibold">Verstuurd</th>
              <th scope="col" className="px-3 py-4 font-semibold">Reacties</th>
              <th scope="col" className="px-3 py-4 font-semibold">Uitgeschreven</th>
              <th scope="col" className="px-3 py-4 font-semibold">Bounces</th>
            </tr>
          </thead>
          <tbody>
            {!shown.length && (
              <tr>
                <td colSpan={5} className={cn('px-6 py-4', muted)}>
                  Geen sequences gekozen.
                </td>
              </tr>
            )}
            {shown.map((s) => (
              <tr key={s.id} className="border-t border-[#E6DFD2]">
                <td className="px-6 py-3">
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-bold text-ikr-navy no-underline hover:text-[#0B7F93]">
                    {s.name}
                  </a>{' '}
                  {s.active ? <Pill tone="green">Actief</Pill> : <Pill tone="light">Gepauzeerd</Pill>}
                </td>
                <td className="px-3 py-3">{s.delivered}</td>
                <td className="px-3 py-3">
                  {s.replied} <span className={cn('text-xs', muted)}>({pct(s.replied, s.delivered)})</span>
                </td>
                <td className="px-3 py-3">{s.unsubscribed}</td>
                <td className="px-3 py-3">{s.bounced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
