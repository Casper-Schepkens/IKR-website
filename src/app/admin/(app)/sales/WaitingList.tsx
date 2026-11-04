import Link from 'next/link'
import type { AdminSession } from '@/lib/admin/session'
import { dayTone, daysSince, leadContext, loadWaiting } from '@/lib/admin/sales/waiting'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { buttonClass, Card, Empty, muted, Pill } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'

export type WaitingSort = 'lang' | 'kort'

const TONE = { green: 'green', orange: 'orange', red: 'red' } as const
const RED = 'bg-[#F8D3D0] text-[#8E1B12]'

const href = (sort: WaitingSort, extra = '') =>
  `/admin/sales?weergave=wachten${sort === 'kort' ? '&sorteer=kort' : ''}${extra}`

/** Leads waar wij als laatste mailden en nog geen antwoord kregen (leest de momentopname; Gmail enkel als die verouderd is). */
export async function WaitingList({
  session,
  sort,
  force,
}: {
  session: AdminSession
  sort: WaitingSort
  force: boolean
}) {
  let result: Awaited<ReturnType<typeof loadWaiting>>
  try {
    result = await loadWaiting(session, { sync: force ? 'force' : 'auto' })
  } catch (e) {
    return (
      <Card>
        <p role="alert" className="m-0 text-[#A3470F]">
          {e instanceof Error ? e.message : 'De lijst kon niet geladen worden.'}
        </p>
      </Card>
    )
  }
  if (result.status === 'not_connected')
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn('m-0', muted)}>{result.reason}</p>
        <Link href="/admin/instellingen" className={buttonClass('navy', true)}>
          Naar Instellingen
        </Link>
      </Card>
    )

  const now = new Date()
  const rows = result.items.map((i) => ({ ...i, days: daysSince(i.mail.date, now) }))
  rows.sort((a, b) =>
    sort === 'lang'
      ? b.days - a.days || a.mail.date.localeCompare(b.mail.date)
      : a.days - b.days || b.mail.date.localeCompare(a.mail.date),
  )

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-3 text-xs', muted)}>
        <span>
          {rows.length} {rows.length === 1 ? 'lead wacht' : 'leads wachten'} op een antwoord
          {result.syncedAt &&
            ` · bijgewerkt ${fmtDate(result.syncedAt)} ${fmtTime(result.syncedAt)}`}
        </span>
        <Link
          href={href(sort, '&bijwerken=1')}
          prefetch={false}
          className={buttonClass('soft', true)}
        >
          Nu bijwerken
        </Link>
      </div>
      {result.warning && (
        <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-3 text-sm text-[#6E2E09]">
          {result.warning}
        </p>
      )}
      <Card className="relative overflow-x-auto p-0">
        {!rows.length ? (
          <div className="p-6">
            <Empty>Niemand wacht op een antwoord van een lead. 🎉</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">
                  Lead
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Context
                </th>
                <th scope="col" className="px-3 py-4 font-semibold">
                  Laatste mail
                </th>
                <th
                  scope="col"
                  className="px-3 py-4 font-semibold"
                  aria-sort={sort === 'lang' ? 'descending' : 'ascending'}
                >
                  <Link
                    href={href(sort === 'lang' ? 'kort' : 'lang')}
                    className="text-inherit no-underline hover:text-ikr-navy"
                  >
                    Dagen sinds contact {sort === 'lang' ? '↓' : '↑'}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tone = dayTone(r.days)
                return (
                  <tr
                    key={r.lead_id}
                    className="border-t border-[#E6DFD2] align-top hover:bg-ikr-cream/60"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/sales/leads/${r.lead_id}`}
                        className="font-bold text-ikr-navy no-underline hover:text-[#0B7F93]"
                      >
                        {r.lead.company ?? r.lead.name}
                      </Link>
                      <div className={cn('text-xs', muted)}>
                        {r.lead.company ? `${r.lead.name} · ` : ''}
                        {r.lead.email}
                      </div>
                    </td>
                    <td className={cn('max-w-[260px] px-3 py-3', muted)}>
                      <span className="line-clamp-3">{leadContext(r.lead)}</span>
                    </td>
                    <td className="max-w-[360px] px-3 py-3">
                      <div className={cn('text-xs', muted)}>
                        {fmtDate(r.mail.date)} · {r.mail.from_email}
                      </div>
                      <div className="font-semibold">{r.mail.subject || '(geen onderwerp)'}</div>
                      <div className={cn('line-clamp-2 text-xs', muted)}>{r.mail.preview}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Pill
                        tone={tone === 'red' ? 'neutral' : TONE[tone]}
                        className={tone === 'red' ? RED : undefined}
                      >
                        {r.days === 0 ? 'vandaag' : r.days === 1 ? '1 dag' : `${r.days} dagen`}
                      </Pill>
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
