'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleStepAction, updateStepMetaAction } from '@/app/admin/production-actions'
import { WHO_LABEL, type Step } from '@/lib/admin/production/core'
import { buttonClass, input, muted, Pill, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const DAY = 86_400_000
export function dueInfo(due: string | null, today: string, done = false) {
  if (!due) return { text: 'datum nog niet gekend', tone: 'light' as const }
  const d = Math.round((Date.parse(due) - Date.parse(today)) / DAY)
  const date = new Date(`${due}T12:00:00Z`).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
  if (done) return { text: date, tone: 'light' as const }
  if (d < 0) return { text: `${-d} d te laat (${date})`, tone: 'red' as const }
  if (d === 0) return { text: `vandaag`, tone: 'orange' as const }
  if (d === 1) return { text: `morgen`, tone: 'orange' as const }
  if (d <= 3) return { text: `over ${d} d (${date})`, tone: 'orange' as const }
  return { text: date, tone: 'neutral' as const }
}

export function DuePill({ due, today, done }: { due: string | null; today: string; done?: boolean }) {
  const i = dueInfo(due, today, done)
  return (
    <Pill tone={i.tone === 'red' ? 'orange' : i.tone} className={cn('whitespace-nowrap', i.tone === 'red' && 'bg-[#F8D3D0] text-[#8E1B12]')}>
      {i.tone === 'red' ? '! ' : ''}
      {i.text}
    </Pill>
  )
}

/** Eén stap: afvinken, en via "…" een eigen deadline, link of notitie. */
export function StepRow({ clientId, step: s, today, showWho = true, label }: { clientId: string; step: Step; today: string; showWho?: boolean; label?: string }) {
  const [pending, start] = useTransition()
  const [meta, setMeta] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const cycleNo = s.cycle?.no ?? null
  // Meteen afgevinkt bij klikken; de server bevestigt daarna.
  const [done, setDone] = useOptimistic(s.done)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else after?.()
      router.refresh()
    })
  return (
    <li className={cn('flex flex-col gap-1.5 border-t border-[#E6DFD2] py-2 first:border-t-0', s.done && 'text-[#6F6A76]')}>
      {label && <span className={cn('text-[11px] font-bold tracking-wide uppercase', muted)}>{label}</span>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => {
            const v = e.currentTarget.checked
            start(async () => {
              setDone(v)
              setError(null)
              const res = await toggleStepAction(clientId, s.key, cycleNo, v)
              if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
              router.refresh()
            })
          }}
          aria-label={`${s.done ? 'Terug open' : 'Af'}: ${s.title}`}
          className="size-4 shrink-0 cursor-pointer accent-ikr-navy"
        />
        <span className={cn('min-w-0 flex-1 text-sm', !s.done && 'font-semibold')}>
          {s.title}
          {showWho && <span className={cn('ml-1.5 text-xs font-normal', muted)}>· {WHO_LABEL[s.who]}</span>}
          {s.link && (
            <a href={s.link} target="_blank" rel="noreferrer" className="ml-1.5 text-xs font-normal underline">
              link
            </a>
          )}
        </span>
        {!(s.done && !s.due_on) && <DuePill due={s.due_on} today={today} done={s.done} />}
        <button type="button" onClick={() => setMeta(!meta)} aria-expanded={meta} aria-label={`Meer: ${s.title}`} className={cn(buttonClass('soft', true), 'min-h-8 px-2.5')}>
          …
        </button>
        {pending && <Spinner />}
      </div>
      {(s.note || s.detail) && !meta && <p className={cn('m-0 ml-6 text-xs whitespace-pre-line', muted)}>{s.note ?? s.detail}</p>}
      {s.done && s.done_by && !meta && <p className={cn('m-0 ml-6 text-[11px]', muted)}>af · {s.done_by.split('@')[0]}</p>}
      {meta && (
        <form
          className="ml-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => updateStepMetaAction(clientId, s.key, cycleNo, data), () => setMeta(false))
          }}
        >
          {s.detail && <p className={cn('col-span-full m-0 text-xs', muted)}>{s.detail}</p>}
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Eigen deadline (leeg = berekend)
            <input name="due_on" type="date" defaultValue={s.due_on ?? ''} className={cn(input, 'min-h-9 py-1 text-sm')} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Link (briefing, ppt, Drive …)
            <input name="link" type="url" defaultValue={s.link ?? ''} placeholder="https://" className={cn(input, 'min-h-9 py-1 text-sm')} />
          </label>
          <label className="col-span-full flex flex-col gap-1 text-xs font-semibold">
            Notitie
            <textarea name="note" rows={2} defaultValue={s.note ?? ''} className={cn(input, 'py-1.5 text-sm')} />
          </label>
          <div className="col-span-full flex gap-2">
            <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
              Bewaar
            </button>
            <button type="button" onClick={() => setMeta(false)} className={buttonClass('soft', true)}>
              Sluiten
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="m-0 ml-6 text-xs text-[#A3470F]">
          {error}
        </p>
      )}
    </li>
  )
}
