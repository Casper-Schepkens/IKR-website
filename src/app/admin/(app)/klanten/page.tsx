import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { CLIENT_STAGES, LEAD_STAGES, STAGE_LABELS, STAGES, type Client, type Contract } from '@/lib/admin/types'
import { STAGE_TONE } from '@/components/admin/stage'
import { SubmitButton } from '@/components/admin/SubmitButton'
import { ClientLogo } from '@/components/admin/ClientLogo'
import { daysBetween, euro, fmtDate, isoDay } from '@/lib/admin/format'
import { nextSendDate } from '@/lib/admin/billing'
import {
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

type View = 'klanten' | 'leads' | 'gestopt'
const VIEWS: { id: View; label: string }[] = [
  { id: 'klanten', label: 'Klanten' },
  { id: 'leads', label: 'Leads' },
  { id: 'gestopt', label: 'Gestopt' },
]

const th = 'px-3 py-4 font-semibold'
const td = 'px-3 py-3.5'

/** Het lopende contract: actief, met de laatste einddatum (bv. een verlenging die net start). */
function currentContract(contracts: Contract[], clientId: string) {
  const mine = contracts.filter((k) => k.client_id === clientId)
  const active = mine.filter((k) => k.status === 'active').sort((a, b) => (b.end_date ?? '9999').localeCompare(a.end_date ?? '9999'))
  return { active: active[0] ?? null, draft: mine.find((k) => k.status === 'draft') ?? null }
}

function NameCell({ c }: { c: Client }) {
  return (
    <td className="px-6 py-3">
      <Link
        href={`/admin/klanten/${c.id}`}
        className="flex items-center gap-3 font-bold text-ikr-navy no-underline hover:text-[#0B7F93]"
      >
        <ClientLogo client={c} size={36} />
        <span className="flex flex-col">
          {c.name}
          {c.sector && <span className={cn('text-xs font-normal', muted)}>{c.sector}</span>}
        </span>
      </Link>
    </td>
  )
}

function OpenCell({ id, text }: { id: string; text: string }) {
  return (
    <td className="px-6 py-3 text-right">
      <Link href={`/admin/klanten/${id}`} className={buttonClass('soft', true)}>
        {text}
      </Link>
    </td>
  )
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nieuw?: string; weergave?: string }>
}) {
  const { q, nieuw, weergave } = await searchParams
  const view: View = weergave === 'leads' || weergave === 'gestopt' ? weergave : 'klanten'
  const { repo } = await requireAdmin()
  const now = new Date()
  const inAYear = new Date(now.getTime() + 366 * 86_400_000)
  const [clients, contracts, events] = await Promise.all([
    repo.listClients(),
    repo.listContracts(),
    repo.listEvents(now.toISOString(), inAYear.toISOString()),
  ])
  const today = isoDay(now)

  const inView = (c: Client) =>
    view === 'klanten'
      ? CLIENT_STAGES.includes(c.stage)
      : view === 'leads'
        ? LEAD_STAGES.includes(c.stage)
        : c.stage === 'churned'
  const count = (v: View) =>
    clients.filter((c) =>
      v === 'klanten' ? CLIENT_STAGES.includes(c.stage) : v === 'leads' ? LEAD_STAGES.includes(c.stage) : c.stage === 'churned',
    ).length

  const query = (q ?? '').trim().toLowerCase()
  const filtered = clients.filter(
    (c) =>
      inView(c) &&
      (!query || c.name.toLowerCase().includes(query) || (c.sector ?? '').toLowerCase().includes(query)),
  )

  const nextShoot = (clientId: string) =>
    events
      .filter((e) => e.kind === 'shoot' && e.client_id === clientId && e.starts_at >= now.toISOString())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null

  // Klanten: eerst wie het snelst een draaidag heeft, zonder draaidag achteraan.
  const rows =
    view === 'klanten'
      ? filtered
          .map((c) => ({ c, shoot: nextShoot(c.id), ...currentContract(contracts, c.id) }))
          .sort((a, b) => (a.shoot?.starts_at ?? '9999').localeCompare(b.shoot?.starts_at ?? '9999'))
      : []

  const newStage = view === 'leads' ? 'lead' : 'signed'

  return (
    <>
      <PageHeader
        eyebrow={`${count('klanten')} klanten · ${count('leads')} leads`}
        title={view === 'leads' ? 'Leads' : view === 'gestopt' ? 'Gestopt' : 'Klanten'}
      >
        <form className="flex items-center gap-2" role="search">
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek…"
            aria-label="Zoek klant of lead"
            className={cn(input, 'min-h-11 w-56 rounded-full bg-ikr-cream-light')}
          />
          {view !== 'klanten' && <input type="hidden" name="weergave" value={view} />}
        </form>
        <Link
          href={`/admin/klanten?nieuw=1${view === 'leads' ? '&weergave=leads' : ''}`}
          className={buttonClass('navy')}
        >
          {view === 'leads' ? '+ Nieuwe lead' : '+ Nieuwe klant'}
        </Link>
      </PageHeader>

      {nieuw && (
        <Card>
          <Title className="mb-4 text-2xl">{view === 'leads' ? 'Nieuwe lead' : 'Nieuwe klant'}</Title>
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
              <select name="stage" className={input} defaultValue={newStage}>
                {STAGES.filter((s) => s !== 'churned').map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
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
              <SubmitButton pendingText="Aanmaken…">Aanmaken</SubmitButton>
              <Link
                href={`/admin/klanten${view === 'klanten' ? '' : `?weergave=${view}`}`}
                className={buttonClass('soft')}
              >
                Annuleren
              </Link>
            </div>
          </form>
        </Card>
      )}

      <nav aria-label="Weergave" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={v.id === 'klanten' ? '/admin/klanten' : `/admin/klanten?weergave=${v.id}`}
            aria-current={view === v.id ? 'page' : undefined}
            className={buttonClass(view === v.id ? 'navy' : 'light', true)}
          >
            {v.label} <span className="opacity-60">{count(v.id)}</span>
          </Link>
        ))}
      </nav>

      <Card className="overflow-x-auto p-0">
        {!filtered.length ? (
          <div className="p-6">
            <Empty>
              {view === 'leads' ? 'Geen leads.' : view === 'gestopt' ? 'Niemand gestopt.' : 'Geen klanten gevonden.'}
            </Empty>
          </div>
        ) : view === 'klanten' ? (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">Klant</th>
                <th scope="col" className={th}>Volgende draaidag</th>
                <th scope="col" className={th}>Einde contract</th>
                <th scope="col" className={th}>Per maand</th>
                <th scope="col" className={th}>Volgende factuur</th>
                <th scope="col" className="px-6 py-4"><span className="sr-only">Openen</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, shoot, active, draft }) => {
                const left = active?.end_date ? daysBetween(today, active.end_date) : null
                const next = active ? nextSendDate(active, today) : null
                return (
                  <tr key={c.id} className="border-t border-[#E6DFD2] hover:bg-ikr-cream/60">
                    <NameCell c={c} />
                    <td className={td}>
                      {shoot ? (
                        <span className="font-semibold">
                          {fmtDate(shoot.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <Link href="/admin/kalender" className={cn('text-xs', muted)}>
                          nog niet gepland
                        </Link>
                      )}
                    </td>
                    <td className={td}>
                      {active ? (
                        <span className="flex flex-wrap items-center gap-2">
                          {active.end_date ? fmtDate(active.end_date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'geen einddatum'}
                          {left !== null && left <= 45 && (
                            <Pill tone={left < 0 ? 'orange' : left <= 14 ? 'orange' : 'neutral'}>
                              {left < 0 ? 'verlopen' : left === 0 ? 'vandaag' : `nog ${left} d`}
                            </Pill>
                          )}
                        </span>
                      ) : draft ? (
                        <span className={cn('text-xs', muted)}>concept: nog aanvullen</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={td}>{active ? euro(active.monthly_amount_cents) : '—'}</td>
                    <td className={td}>{next ? fmtDate(next) : '—'}</td>
                    <OpenCell id={c.id} text="Open klant" />
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : view === 'leads' ? (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">Lead</th>
                <th scope="col" className={th}>Fase</th>
                <th scope="col" className={th}>Bron</th>
                <th scope="col" className={th}>In deze fase</th>
                <th scope="col" className="px-6 py-4"><span className="sr-only">Openen</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => LEAD_STAGES.indexOf(b.stage) - LEAD_STAGES.indexOf(a.stage))
                .map((c) => {
                  const days = Math.max(0, daysBetween(c.stage_changed_at, now))
                  return (
                    <tr key={c.id} className="border-t border-[#E6DFD2] hover:bg-ikr-cream/60">
                      <NameCell c={c} />
                      <td className={td}>
                        <Pill tone={STAGE_TONE[c.stage]}>{STAGE_LABELS[c.stage]}</Pill>
                      </td>
                      <td className={td}>{c.source ?? '—'}</td>
                      <td className={td}>
                        <Pill tone={days >= 5 ? 'orange' : 'neutral'}>
                          {days === 0 ? 'vandaag' : `${days} ${days === 1 ? 'dag' : 'dagen'}`}
                        </Pill>
                      </td>
                      <OpenCell id={c.id} text="Open lead" />
                    </tr>
                  )
                })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">Klant</th>
                <th scope="col" className={th}>Gestopt sinds</th>
                <th scope="col" className="px-6 py-4"><span className="sr-only">Openen</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-[#E6DFD2] hover:bg-ikr-cream/60">
                  <NameCell c={c} />
                  <td className={cn(td, muted)}>
                    {fmtDate(c.stage_changed_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <OpenCell id={c.id} text="Open" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
