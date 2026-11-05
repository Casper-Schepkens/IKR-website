import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { currentWeekly } from '@/lib/admin/weekly/board'
import { ownerOf } from '@/lib/admin/weekly/types'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { buttonClass, Card, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { TodoBoard } from '@/components/admin/weekly/TodoBoard'
import { NewTodoForm } from '@/components/admin/weekly/NewTodoForm'
import { PlanWeeklyForm } from '@/components/admin/weekly/PlanWeeklyForm'
import { planWeeklyAction, startWeeklyAction } from '../../weekly-actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Weekly' }

export default async function WeeklyPage() {
  const { weekly, user } = await requireAdmin()
  const [weeklies, todos] = await Promise.all([weekly.listWeeklies(), weekly.listTodos()])
  const next = currentWeekly(weeklies)

  return (
    <>
      <PageHeader eyebrow="Wekelijkse teammeeting" title="Weekly">
        <Link href="/admin/weekly/vorige" className={buttonClass('light', true)}>
          Vorige weeklies
        </Link>
      </PageHeader>

      {next ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className={cn('text-[13px] font-medium', muted)}>
              {next.status === 'started' ? 'Weekly bezig' : 'Volgende weekly'}
            </span>
            <span className="text-xl font-bold">
              {fmtDate(next.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} · {fmtTime(next.starts_at)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={next.mode === 'online' ? 'teal' : 'purple'}>{next.mode === 'online' ? 'Online' : 'Live'}</Pill>
              {next.meet_url && (
                <a href={next.meet_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#0B7F93]">
                  Google Meet
                </a>
              )}
            </div>
            {next.calendar_error && <span className="text-sm text-[#A3470F]">Agenda: {next.calendar_error}</span>}
          </div>
          {next.status === 'started' ? (
            <Link href={`/admin/weekly/${next.id}`} className={buttonClass('navy')}>
              Naar de meeting
            </Link>
          ) : (
            <form action={startWeeklyAction.bind(null, next.id)}>
              <button type="submit" className={buttonClass('navy')}>
                Meeting starten
              </button>
            </form>
          )}
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <Title className="m-0 text-2xl">Plan de eerste weekly</Title>
          <p className={cn('m-0 text-sm', muted)}>
            Daarna plan je telkens de volgende in bij &quot;Conclude meeting&quot;.
          </p>
          <PlanWeeklyForm action={planWeeklyAction} submitLabel="Inplannen" />
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Nieuwe to-do</Title>
        <NewTodoForm defaultOwner={ownerOf(user.email)} />
      </Card>

      <TodoBoard todos={todos} weeklies={weeklies} me={user.email} />
    </>
  )
}
