'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addInternalTaskAction, removeInternalTaskAction, toggleInternalAction, updateInternalTaskAction } from '@/app/admin/production-actions'
import { WHO_LABEL, type InternalItem, type TeamMember } from '@/lib/admin/production/core'
import { scheduleLabel } from '@/lib/admin/production/rules'
import { buttonClass, Card, Empty, input, muted, Spinner, Title } from '../ui'
import { DuePill } from './shared'
import { cn } from '@/utilities/ui'

const SCHEDULE_HINT = 'Bv. "elke maandag" (wekelijks), "laatste maandag" of "eerste woensdag" (maandelijks).'
const MEMBERS: TeamMember[] = ['casper', 'cedric', 'milan']

/** Intern: terugkerende taken zonder klant (wekelijks of maandelijks), met eigenaar en deadline. */
export function InternalBlock({ items, today, me }: { items: InternalItem[]; today: string; me: TeamMember | null }) {
  const [adding, setAdding] = useState(false)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Title className="m-0 text-2xl">Intern</Title>
          <p className={cn('m-0 text-sm', muted)}>Terugkerende taken zonder klant. Afvinken = de volgende keer verschijnt.</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={buttonClass('light', true)}>
            + Interne taak
          </button>
        )}
      </div>
      {adding && <TaskForm me={me} onDone={() => setAdding(false)} />}
      {!items.length && !adding ? (
        <Empty>Nog geen interne taken.</Empty>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((i) => (
            <InternalRow key={i.task.id} item={i} today={today} />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function InternalRow({ item: i, today, label }: { item: InternalItem; today: string; label?: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [done, setDone] = useOptimistic(false)
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else after?.()
      router.refresh()
    })
  return (
    <li className="flex flex-col gap-1.5 border-t border-[#E6DFD2] py-2 first:border-t-0">
      {label && <span className={cn('text-[11px] font-bold tracking-wide uppercase', muted)}>{label}</span>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={done}
          onChange={() =>
            start(async () => {
              setDone(true)
              setError(null)
              const res = await toggleInternalAction(i.task.id, true)
              if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
              router.refresh()
            })
          }
          aria-label={`Af: ${i.task.title} (${i.due_on})`}
          className="size-4 shrink-0 cursor-pointer accent-ikr-navy"
        />
        <span className="min-w-0 flex-1 text-sm font-semibold">
          {i.task.title}
          <span className={cn('ml-1.5 text-xs font-normal', muted)}>
            · {WHO_LABEL[i.task.owner]} · {scheduleLabel(i.task.schedule)}
          </span>
          {i.task.link && (
            <a href={i.task.link} target="_blank" rel="noreferrer" className="ml-1.5 text-xs font-normal underline">
              link
            </a>
          )}
        </span>
        <DuePill due={i.due_on} today={today} />
        <button type="button" onClick={() => setEdit(!edit)} aria-expanded={edit} aria-label={`Meer: ${i.task.title}`} className={cn(buttonClass('soft', true), 'min-h-8 px-2.5')}>
          …
        </button>
        {pending && <Spinner />}
      </div>
      {i.task.note && !edit && <p className={cn('m-0 ml-6 text-xs whitespace-pre-line', muted)}>{i.task.note}</p>}
      {i.last_done && !edit && (
        <p className={cn('m-0 ml-6 text-[11px]', muted)}>
          vorige keer ({i.last_done.occurrence}) af · {(i.last_done.done_by ?? '').split('@')[0]}{' '}
          <button type="button" disabled={pending} onClick={() => run(() => toggleInternalAction(i.task.id, false))} className="underline">
            terug open
          </button>
        </p>
      )}
      {edit && (
        <div className="ml-6 flex flex-col gap-2">
          <TaskForm item={i} onDone={() => setEdit(false)} />
          <button
            type="button"
            disabled={pending}
            onClick={() => window.confirm(`"${i.task.title}" verwijderen?`) && run(() => removeInternalTaskAction(i.task.id))}
            className={cn(buttonClass('soft', true), 'self-start')}
          >
            Taak verwijderen
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 ml-6 text-xs text-[#A3470F]">
          {error}
        </p>
      )}
    </li>
  )
}

function TaskForm({ item, me, onDone }: { item?: InternalItem; me?: TeamMember | null; onDone: () => void }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = item?.task
  return (
    <form
      className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-2 rounded-xl bg-ikr-cream/50 p-2"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        start(async () => {
          setError(null)
          const res = t ? await updateInternalTaskAction(t.id, data) : await addInternalTaskAction(data)
          if (!res.ok) return setError(res.error ?? 'Er ging iets mis.')
          onDone()
          router.refresh()
        })
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Taak
        <input name="title" required maxLength={200} defaultValue={t?.title ?? ''} autoFocus={!t} className={cn(input, 'min-h-9 py-1 text-sm')} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Eigenaar
        <select name="owner" defaultValue={t?.owner ?? me ?? 'casper'} className={cn(input, 'min-h-9 py-1 text-sm')}>
          {MEMBERS.map((m) => (
            <option key={m} value={m}>
              {WHO_LABEL[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Wanneer
        <input name="schedule" required defaultValue={t ? scheduleLabel(t.schedule) : ''} placeholder="elke maandag" className={cn(input, 'min-h-9 py-1 text-sm')} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Link (optioneel)
        <input name="link" type="url" defaultValue={t?.link ?? ''} placeholder="https://" className={cn(input, 'min-h-9 py-1 text-sm')} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-xs font-semibold">
        Notitie
        <textarea name="note" rows={2} defaultValue={t?.note ?? ''} className={cn(input, 'py-1.5 text-sm')} />
      </label>
      <p className={cn('col-span-full m-0 text-xs', muted)}>{SCHEDULE_HINT}</p>
      <div className="col-span-full flex items-center gap-2">
        <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
          {t ? 'Bewaar' : 'Toevoegen'}
        </button>
        <button type="button" onClick={onDone} className={buttonClass('soft', true)}>
          Annuleren
        </button>
        {pending && <Spinner />}
        {error && (
          <span role="alert" className="text-xs text-[#A3470F]">
            {error}
          </span>
        )}
      </div>
    </form>
  )
}
