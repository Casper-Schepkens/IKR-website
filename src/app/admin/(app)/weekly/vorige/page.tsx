import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { TEAM } from '@/lib/admin/weekly/types'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { Card, Empty, muted, PageHeader, Pill } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Vorige weeklies' }

export default async function PastWeekliesPage() {
  const { weekly } = await requireAdmin()
  const [weeklies, todos] = await Promise.all([weekly.listWeeklies(), weekly.listTodos()])
  const past = weeklies.filter((w) => w.status === 'concluded')
  const name = (k: string) => TEAM.find((t) => t.key === k)?.name ?? k

  return (
    <>
      <nav aria-label="Kruimelpad" className={cn('text-sm', muted)}>
        <Link href="/admin/weekly" className={cn(muted, 'no-underline hover:underline')}>
          Weekly
        </Link>{' '}
        / <span className="font-semibold text-ikr-navy">Vorige weeklies</span>
      </nav>
      <PageHeader title="Vorige weeklies" />
      {!past.length && (
        <Card>
          <Empty>Nog geen afgesloten weeklies.</Empty>
        </Card>
      )}
      {past.map((w) => {
        const list = todos.filter((t) => t.weekly_id === w.id)
        return (
          <Card key={w.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">
                {fmtDate(w.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {fmtTime(w.starts_at)}
              </span>
              <Pill tone={w.mode === 'online' ? 'teal' : 'purple'}>{w.mode === 'online' ? 'Online' : 'Live'}</Pill>
              {w.recording_url ? (
                <a href={w.recording_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#0B7F93]">
                  Opname / transcript
                </a>
              ) : (
                <span className={cn('text-sm', muted)}>Geen opname</span>
              )}
            </div>
            {list.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {list.map((t) => (
                  <li key={t.id} className="text-sm">
                    <span className={cn('font-semibold', t.done_at && 'line-through opacity-70')}>{t.title}</span>{' '}
                    <span className={muted}>· {name(t.owner)}{t.done_at ? '' : ' · niet af'}</span>
                    {t.notes.map((n) => (
                      <div key={n.id} className={cn('pl-4 text-xs', muted)}>
                        {n.body}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn('m-0 text-sm', muted)}>Geen to-do&apos;s.</p>
            )}
          </Card>
        )
      })}
    </>
  )
}
