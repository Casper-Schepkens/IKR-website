'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTodoNoteAction, pushTodoAction, setTodoDoneAction } from '@/app/admin/weekly-actions'
import { TEAM, type Todo } from '@/lib/admin/weekly/types'
import { input, muted, Pill, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const nameOf = (email: string | null) => TEAM.find((t) => t.email === email)?.name ?? email?.split('@')[0] ?? ''
const small =
  'ikr-btn inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:opacity-60'

export function TodoCard({ todo, overdue, showOwner }: { todo: Todo; overdue: boolean; showOwner?: boolean }) {
  const [pending, start] = useTransition()
  const [noteOpen, setNoteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const done = Boolean(todo.done_at)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else {
        after?.()
        router.refresh()
      }
    })

  return (
    <div className={cn('flex flex-col gap-2 rounded-2xl bg-ikr-cream-light p-3.5', done && 'opacity-60')}>
      <div className="flex items-start gap-2">
        <span className={cn('flex-1 text-[15px] font-semibold', done && 'line-through')}>{todo.title}</span>
        {pending && <Spinner />}
      </div>
      {(showOwner || todo.pushed_count > 0 || overdue) && (
        <div className="flex flex-wrap gap-1.5">
          {showOwner && <Pill tone="light">{TEAM.find((t) => t.key === todo.owner)?.name}</Pill>}
          {todo.pushed_count > 0 && <Pill tone="yellow">Doorgeschoven{todo.pushed_count > 1 ? ` ×${todo.pushed_count}` : ''}</Pill>}
          {overdue && !done && <Pill tone="orange">Niet af vorige weekly</Pill>}
        </div>
      )}
      {todo.notes.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {todo.notes.map((n) => (
            <li key={n.id} className="text-sm leading-snug">
              {n.body} <span className={cn('text-xs', muted)}>· {nameOf(n.author)}</span>
            </li>
          ))}
        </ul>
      )}
      {noteOpen && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => addTodoNoteAction(todo.id, data), () => setNoteOpen(false))
          }}
        >
          <input name="note" autoFocus aria-label="Notitie" placeholder="Notitie…" className={cn(input, 'min-h-9 flex-1 text-sm')} />
          <button type="submit" disabled={pending} data-pending={pending} className={cn(small, 'bg-ikr-navy text-ikr-cream-light')}>
            Bewaar
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={pending}
          data-pending={pending}
          onClick={() => run(() => setTodoDoneAction(todo.id, !done))}
          className={cn(small, done ? 'bg-ikr-cream text-ikr-navy' : 'bg-ikr-cyan text-ikr-navy')}
        >
          {done ? 'Toch niet af' : 'Done'}
        </button>
        {!done && (
          <>
            <button type="button" disabled={pending} onClick={() => setNoteOpen((v) => !v)} className={cn(small, 'bg-ikr-cream text-ikr-navy')}>
              Notitie
            </button>
            {todo.kind === 'weekly' && (
              <button
                type="button"
                disabled={pending}
                data-pending={pending}
                onClick={() => run(() => pushTodoAction(todo.id))}
                className={cn(small, 'bg-ikr-cream text-ikr-navy')}
              >
                Schuif door
              </button>
            )}
          </>
        )}
      </div>
      {error && (
        <span role="alert" className="text-xs font-medium text-[#A3470F]">
          {error}
        </span>
      )}
    </div>
  )
}
