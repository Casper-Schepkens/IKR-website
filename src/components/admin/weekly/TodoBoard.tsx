import { boardTodos, splitByWeek } from '@/lib/admin/weekly/board'
import { fmtDate } from '@/lib/admin/format'
import { TEAM, type Todo, type Weekly } from '@/lib/admin/weekly/types'
import { Card, Empty, muted, Title } from '../ui'
import { TodoCard } from './TodoCard'
import { cn } from '@/utilities/ui'

function WeekLabel({ children }: { children: React.ReactNode }) {
  return <span className={cn('-mt-1 text-xs font-bold tracking-wide uppercase', muted)}>{children}</span>
}

/** To-do's per persoon (deze week | lijn | volgende week) en de lange to-do's. */
export function TodoBoard({ todos, weeklies, me }: { todos: Todo[]; weeklies: Weekly[]; me: string }) {
  const { byOwner, long } = boardTodos(todos, weeklies)
  const concluded = new Set(weeklies.filter((w) => w.status === 'concluded').map((w) => w.id))
  const overdue = (t: Todo) => Boolean(t.weekly_id && concluded.has(t.weekly_id))
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {TEAM.map((p) => {
          const { current, thisWeek, nextWeek } = splitByWeek(byOwner('weekly', p.key), weeklies)
          const card = (t: Todo) => <TodoCard key={t.id} todo={t} overdue={overdue(t)} me={me} />
          return (
            <Card key={p.key} className="flex flex-col gap-3 p-4">
              <Title className="m-0 text-2xl">{p.name}</Title>
              {current && <WeekLabel>Deze week · weekly {fmtDate(current.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })}</WeekLabel>}
              {thisWeek.length ? thisWeek.map(card) : <Empty>Geen to-do&apos;s.</Empty>}
              {current && (
                <>
                  {/* Duidelijke lijn: hieronder staat wat al voor de weekly daarna is. */}
                  <div role="separator" aria-label="Volgende week" className="mt-2 flex items-center gap-2">
                    <span className="h-[3px] flex-1 rounded-full bg-ikr-navy" />
                    <span className="text-xs font-black tracking-wide text-ikr-navy uppercase">Volgende week</span>
                    <span className="h-[3px] flex-1 rounded-full bg-ikr-navy" />
                  </div>
                  {nextWeek.length ? (
                    <div className="flex flex-col gap-3 opacity-90">{nextWeek.map(card)}</div>
                  ) : (
                    <p className={cn('m-0 text-xs', muted)}>Nog niets voor volgende week.</p>
                  )}
                </>
              )}
            </Card>
          )
        })}
      </div>
      <Card className="flex flex-col gap-3 p-4">
        <div>
          <Title className="m-0 text-2xl">Lange to-do&apos;s</Title>
          <p className={cn('m-0 text-sm', muted)}>Zonder weekly-deadline.</p>
        </div>
        {long.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {long.map((t) => (
              <TodoCard key={t.id} todo={t} overdue={false} me={me} showOwner />
            ))}
          </div>
        ) : (
          <Empty>Geen lange to-do&apos;s.</Empty>
        )}
      </Card>
    </>
  )
}
