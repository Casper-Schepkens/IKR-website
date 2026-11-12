import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { currentWeekly, weeklyTimeRange } from '@/lib/admin/weekly/board'
import { ownerOf } from '@/lib/admin/weekly/types'
import { fmtDate } from '@/lib/admin/format'
import { buttonClass, Card, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { TodoBoard } from '@/components/admin/weekly/TodoBoard'
import { NewTodoForm } from '@/components/admin/weekly/NewTodoForm'
import { RetryCalendarButton } from '@/components/admin/weekly/RetryCalendarButton'
import { Prikbord } from '@/components/admin/weekly/Prikbord'
import { SopProposals } from '@/components/admin/sops/SopProposals'
import { PlanWeeklyForm } from '@/components/admin/weekly/PlanWeeklyForm'
import { planWeeklyAction, startWeeklyAction } from '../../weekly-actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Weekly' }

export default async function WeeklyPage() {
  const { weekly, user, sops } = await requireAdmin()
  const [weeklies, todos, pins, allSops] = await Promise.all([weekly.listWeeklies(), weekly.listTodos(), weekly.listPins().catch(() => []), sops.list().catch(() => [])])
  const next = currentWeekly(weeklies)

  // Meeting bezig: alles gebeurt op de meetingpagina. Hier niets aanpassen (zo werkt niemand per ongeluk
  // in de gewone weergave terwijl de rest al in de meeting zit).
  if (next?.status === 'started')
    return (
      <>
        <PageHeader eyebrow="Wekelijkse teammeeting" title="Weekly" />
        <Card className="flex flex-col items-start gap-4 bg-ikr-navy p-8 text-ikr-cream-light">
          <span className="text-sm font-semibold tracking-wide text-ikr-cyan uppercase">Weekly bezig</span>
          <p className="m-0 font-display text-4xl leading-tight font-black">Yo, de meeting is bezig 👋</p>
          <p className="m-0 max-w-xl text-base text-[#D9D3E6]">
            Alles gebeurt nu op de meetingpagina: to-do&apos;s afvinken, notities, prikbord. Hier pas je niets aan tot de weekly afgesloten is.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/admin/weekly/${next.id}`} className={buttonClass('cyan')}>
              Naar de meeting →
            </Link>
            {next.meet_url && (
              <a href={next.meet_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-ikr-cyan underline">
                Open Google Meet
              </a>
            )}
          </div>
        </Card>
      </>
    )

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
              Volgende weekly
            </span>
            <span className="text-xl font-bold">
              {fmtDate(next.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} · {weeklyTimeRange(next)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={next.mode === 'online' ? 'teal' : 'purple'}>{next.mode === 'online' ? 'Online' : 'Live'}</Pill>
              {next.meet_url && (
                <a href={next.meet_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#0B7F93]">
                  Google Meet
                </a>
              )}
            </div>
            {next.calendar_error && !next.calendar_event_id && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#A3470F]">Agenda: {next.calendar_error}</span>
                <RetryCalendarButton weeklyId={next.id} online={next.mode === 'online'} />
              </div>
            )}
          </div>
          <form action={startWeeklyAction.bind(null, next.id)}>
            <button type="submit" className={buttonClass('navy')}>
              Meeting starten
            </button>
          </form>
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

      <SopProposals proposals={allSops.filter((s) => s.status === 'voorstel')} compact />
      <Prikbord pins={pins} me={ownerOf(user.email)} />

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Nieuwe to-do</Title>
        <NewTodoForm defaultOwner={ownerOf(user.email)} />
      </Card>

      <TodoBoard todos={todos} weeklies={weeklies} me={user.email} />
    </>
  )
}
