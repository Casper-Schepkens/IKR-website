'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTodoNoteAction, deleteTodoAction, pushTodoAction, renameTodoAction, setTodoCheckedAction, setTodoDoneAction, unpushTodoAction } from '@/app/admin/weekly-actions'
import { TEAM, type Todo } from '@/lib/admin/weekly/types'
import { Icon, input, muted, Pill, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const nameOf = (email: string | null) => TEAM.find((t) => t.email === email)?.name ?? email?.split('@')[0] ?? ''
const small =
  'ikr-btn inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:opacity-60'

/**
 * `meeting`: tijdens/na de weekly zelf. Dan geen "afgewerkt"-vinkje en niets grijs: we overlopen alles.
 */
export function TodoCard({ todo, overdue, showOwner, me, meeting = false }: { todo: Todo; overdue: boolean; showOwner?: boolean; me: string; meeting?: boolean }) {
  const [pending, start] = useTransition()
  const [noteOpen, setNoteOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editTitle, setEditTitle] = useState(false)
  const saveTitle = (value: string) => {
    const t = value.trim()
    if (!t || t === todo.title) return setEditTitle(false)
    run(() => renameTodoAction(todo.id, t), () => setEditTitle(false))
  }
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const done = Boolean(todo.done_at)
  // Afgewerkt vóór de weekly: enkel voor gewone to-do's, niet tijdens de meeting.
  const canCheck = todo.kind === 'weekly' && !done && !meeting
  // Meteen grijs bij klikken; de server bevestigt daarna.
  const [checked, setChecked] = useOptimistic(canCheck && Boolean(todo.checked_at))
  // Eigen notitie: de Notitie-knop opent die om verder te werken (in plaats van telkens een nieuwe).
  const own = [...todo.notes].reverse().find((n) => n.author === me) ?? null

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
    <div className={cn('flex flex-col gap-2 rounded-2xl bg-ikr-cream-light p-3.5', done && 'opacity-60', checked && 'bg-[#E4E1DB] text-[#6F6A76]')}>
      <div className="group flex items-start gap-1.5">
        {editTitle ? (
          <input
            autoFocus
            defaultValue={todo.title}
            aria-label="Titel van de to-do"
            disabled={pending}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveTitle(e.currentTarget.value)
              } else if (e.key === 'Escape') setEditTitle(false)
            }}
            onBlur={(e) => saveTitle(e.currentTarget.value)}
            className={cn(input, 'min-h-9 flex-1 py-1 text-[15px] font-semibold')}
          />
        ) : (
          <>
            {canCheck && (
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const v = e.currentTarget.checked
                  start(async () => {
                    setChecked(v)
                    setError(null)
                    const res = await setTodoCheckedAction(todo.id, v)
                    if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
                    router.refresh()
                  })
                }}
                aria-label={`Afgewerkt: ${todo.title}`}
                title="Afgewerkt (voor jezelf, vóór de weekly)"
                className="mt-1 size-4 shrink-0 cursor-pointer accent-[#6F6A76]"
              />
            )}
            <span className={cn('min-w-0 text-[15px] font-semibold', done && 'line-through')}>{todo.title}</span>
            {/* Potlood: verschijnt bij hover (op touch altijd zichtbaar, lichter). */}
            <button
              type="button"
              onClick={() => setEditTitle(true)}
              aria-label={`Titel aanpassen: ${todo.title}`}
              title="Titel aanpassen"
              className="mt-0.5 shrink-0 rounded-full p-1 text-[#5E5670] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ikr-cream hover:text-ikr-navy focus-visible:opacity-100 [@media(hover:none)]:opacity-60"
            >
              <Icon.pencil size={14} />
            </button>
            <span className="flex-1" />
          </>
        )}
        {pending && <Spinner />}
      </div>
      {(showOwner || todo.pushed_count > 0 || overdue) && (
        <div className="flex flex-wrap gap-1.5">
          {showOwner && <Pill tone="light">{TEAM.find((t) => t.key === todo.owner)?.name}</Pill>}
          {todo.pushed_count > 0 && <Pill tone="yellow">Doorgeschoven{todo.pushed_count > 1 ? ` ×${todo.pushed_count}` : ''}</Pill>}
          {overdue && !done && <Pill tone="orange">Niet af vorige weekly</Pill>}
        </div>
      )}
      {/* Tijdens het bewerken staat je eigen notitie in het tekstvak, niet dubbel erboven. */}
      {todo.notes.some((n) => !(noteOpen && n.id === own?.id)) && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {todo.notes.filter((n) => !(noteOpen && n.id === own?.id)).map((n) => (
            <li key={n.id} className="text-sm leading-snug whitespace-pre-line">
              {n.body} <span className={cn('text-xs', muted)}>· {nameOf(n.author)}</span>
            </li>
          ))}
        </ul>
      )}
      {noteOpen && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => addTodoNoteAction(todo.id, data), () => setNoteOpen(false))
          }}
        >
          <textarea
            name="note"
            autoFocus
            rows={Math.min(8, Math.max(3, (own?.body.split('\n').length ?? 1) + 2))}
            defaultValue={own?.body ?? ''}
            aria-label="Notitie"
            placeholder="Notitie…"
            onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
            className={cn(input, 'min-h-9 flex-1 resize-y py-2 text-sm')}
          />
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
              {own ? 'Notitie aanpassen' : 'Notitie'}
            </button>
            {todo.kind === 'weekly' &&
              (todo.pushed_at ? (
                // Net doorgeschoven: een tweede klik annuleert in plaats van ×2 te tellen.
                <button
                  type="button"
                  disabled={pending}
                  data-pending={pending}
                  onClick={() => run(() => unpushTodoAction(todo.id))}
                  className={cn(small, 'bg-[#FFF0C2] text-[#6B5300]')}
                >
                  Doorschuiven annuleren
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  data-pending={pending}
                  onClick={() => run(() => pushTodoAction(todo.id))}
                  className={cn(small, 'bg-ikr-cream text-ikr-navy')}
                >
                  Schuif door
                </button>
              ))}
            {/* Niet af en geraakt ook niet af: weghalen, met bevestiging tegen een misklik. */}
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  data-pending={pending}
                  onClick={() => run(() => deleteTodoAction(todo.id), () => setConfirmDelete(false))}
                  className={cn(small, 'bg-[#B42318] text-white')}
                >
                  Ja, verwijder
                </button>
                <button type="button" disabled={pending} onClick={() => setConfirmDelete(false)} className={cn(small, 'bg-ikr-cream text-ikr-navy')}>
                  Annuleer
                </button>
              </>
            ) : (
              <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className={cn(small, 'bg-[#F8D3D0] text-[#8E1B12]')}>
                Verwijder
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
