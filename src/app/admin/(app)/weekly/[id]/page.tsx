import { weeklyEnd, weeklyTimeRange } from '@/lib/admin/weekly/board'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { ownerOf } from '@/lib/admin/weekly/types'
import { fmtDate, fmtTime, isoDay } from '@/lib/admin/format'
import { buttonClass, Card, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { TodoBoard } from '@/components/admin/weekly/TodoBoard'
import { RetryCalendarButton } from '@/components/admin/weekly/RetryCalendarButton'
import { Prikbord } from '@/components/admin/weekly/Prikbord'
import { UploadRecording } from '@/components/admin/weekly/UploadRecording'
import { SopProposals } from '@/components/admin/sops/SopProposals'
import { NewTodoForm } from '@/components/admin/weekly/NewTodoForm'
import { PlanWeeklyForm } from '@/components/admin/weekly/PlanWeeklyForm'
import { concludeWeeklyAction, finishWeeklyRecordingAction, startWeeklyRecordingAction } from '../../../weekly-actions'
import { RecordButton } from '@/components/admin/RecordButton'
import { RecordingPill } from '@/components/admin/recorder/RecordingIndicator'
import { FirefliesCheck } from '@/components/admin/weekly/FirefliesCheck'
import { ProductionOnWeekly } from '@/components/admin/weekly/ProductionOnWeekly'
import { today as todayBrussels, weeklyProduction } from '@/lib/admin/production/service'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Weekly' }

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { weekly, user, sops, clients, production } = await requireAdmin()
  const [w, weeklies, todos, pins, allSops, clientList] = await Promise.all([weekly.getWeekly(id), weekly.listWeeklies(), weekly.listTodos(), weekly.listPins().catch(() => []), sops.list().catch(() => []), clients.list().catch(() => [])])
  if (!w) notFound()
  // Tijdens de meeting ook "Uit Productie" overlopen (tot en met de dag van deze weekly + te laat).
  const prod = w.status === 'concluded' ? null : await weeklyProduction(production, clientList.map((c) => ({ id: c.id, name: c.name })), w).catch(() => null)

  const nextDefault = new Date(new Date(w.starts_at).getTime() + 7 * 86_400_000)

  return (
    <>
      <nav aria-label="Kruimelpad" className={cn('text-sm', muted)}>
        <Link href="/admin/weekly" className={cn(muted, 'no-underline hover:underline')}>
          Weekly
        </Link>{' '}
        / <span className="font-semibold text-adm-fg">Meeting</span>
      </nav>
      <PageHeader
        eyebrow={`${fmtDate(w.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} · ${weeklyTimeRange(w)}`}
        title="Weekly"
      >
        <Pill tone={w.mode === 'online' ? 'teal' : 'purple'}>{w.mode === 'online' ? 'Online' : 'Live'}</Pill>
        <RecordingPill recKey={`weekly:${w.id}`} />
      </PageHeader>

      {w.status === 'concluded' ? (
        <Card className="flex flex-col gap-3">
          <p className={cn('m-0', muted)}>
            Deze weekly is afgesloten. <Link href="/admin/weekly">Naar de volgende</Link>.
          </p>
          <UploadRecording weeklyId={w.id} atFireflies={Boolean(w.recording_public_permission)} />
        </Card>
      ) : w.mode === 'live' ? (
        <Card className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold">Live: neem de meeting op</span>
          <RecordButton
            target={{ key: `weekly:${w.id}`, href: `/admin/weekly/${w.id}`, label: `Weekly ${fmtDate(w.starts_at, { day: 'numeric', month: 'short' })}` }}
            startUpload={startWeeklyRecordingAction.bind(null, w.id)}
            finish={finishWeeklyRecordingAction.bind(null, w.id)}
            existingUrl={w.recording_url}
          />
          {w.recording_url && (
            <a href={w.recording_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-adm-teal">
              Open opname
            </a>
          )}
          <span className={cn('text-sm', muted)}>of</span>
          <UploadRecording weeklyId={w.id} atFireflies={Boolean(w.recording_public_permission)} />
        </Card>
      ) : (
        (
          <Card className="flex flex-wrap items-center gap-4">
            {w.meet_url ? (
              <a href={w.meet_url} target="_blank" rel="noreferrer" className={buttonClass('cyan')}>
                Open Google Meet
              </a>
            ) : (
              <>
                <span className="text-sm text-adm-warn">Geen Meet-link ({w.calendar_error ?? 'agenda niet gekoppeld'}).</span>
                <RetryCalendarButton weeklyId={w.id} online />
              </>
            )}
            {w.meet_url && <FirefliesCheck weeklyId={w.id} />}
          </Card>
        )
      )}

      <TodoBoard
        todos={todos}
        weeklies={weeklies}
        me={user.email}
        meeting
        productionCounts={prod ? Object.fromEntries(Object.entries(prod.byOwner).map(([k, v]) => [k, v.length])) : undefined}
        production={prod && <ProductionOnWeekly byOwner={prod.byOwner} until={prod.until} planned={prod.planned} today={todayBrussels()} me={ownerOf(user.email)} />}
      />

      {w.status !== 'concluded' && (
        <>
          {/* Tijdens de meeting: overlopen en leegmaken. */}
          <SopProposals proposals={allSops.filter((s) => s.status === 'voorstel')} compact />
      <Prikbord pins={pins} me={ownerOf(user.email)} />
          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-2xl">To-do voor de volgende keer</Title>
            <NewTodoForm defaultOwner={ownerOf(user.email)} />
          </Card>
          <Card dark className="flex flex-col gap-3">
            <Title className="m-0 text-2xl text-ikr-cream-light">Conclude meeting</Title>
            <p className="m-0 text-sm text-[#E7E2F0]">Plan de volgende weekly in. Bij online wordt de Meet meteen aangemaakt.</p>
            <div className="rounded-2xl bg-adm-card p-4">
              <PlanWeeklyForm
                action={concludeWeeklyAction.bind(null, w.id)}
                submitLabel="Afsluiten en inplannen"
                defaults={{ date: isoDay(nextDefault), time: fmtTime(w.starts_at), endTime: fmtTime(weeklyEnd(w)), mode: w.mode }}
              />
            </div>
          </Card>
        </>
      )}
    </>
  )
}
