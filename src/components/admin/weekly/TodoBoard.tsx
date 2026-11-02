import { boardTodos } from '@/lib/admin/weekly/board'
import { TEAM, type Todo, type Weekly } from '@/lib/admin/weekly/types'
import { Card, Empty, muted, Title } from '../ui'
import { TodoCard } from './TodoCard'
import { cn } from '@/utilities/ui'

/** To-do's per persoon en de lange to-do's. */
export function TodoBoard({ todos, weeklies }: { todos: Todo[]; weeklies: Weekly[] }) {
  const { byOwner, long } = boardTodos(todos, weeklies)
  const concluded = new Set(weeklies.filter((w) => w.status === 'concluded').map((w) => w.id))
  const overdue = (t: Todo) => Boolean(t.weekly_id && concluded.has(t.weekly_id))
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {TEAM.map((p) => {
          const list = byOwner('weekly', p.key)
          return (
            <Card key={p.key} className="flex flex-col gap-3 p-4">
              <Title className="m-0 text-2xl">{p.name}</Title>
              {list.length ? list.map((t) => <TodoCard key={t.id} todo={t} overdue={overdue(t)} />) : <Empty>Geen to-do&apos;s.</Empty>}
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
              <TodoCard key={t.id} todo={t} overdue={false} showOwner />
            ))}
          </div>
        ) : (
          <Empty>Geen lange to-do&apos;s.</Empty>
        )}
      </Card>
    </>
  )
}
