'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moveStageAction } from '@/app/admin/actions'
import { BOARD_STAGES, STAGE_LABELS, type Stage } from '@/lib/admin/types'
import { muted, Pill } from './ui'
import { cn } from '@/utilities/ui'

export type KanbanCard = {
  id: string
  name: string
  stage: Stage
  daysInStage: number
  meta: string | null
  amount: string | null
}

export function Kanban({ cards }: { cards: KanbanCard[] }) {
  const router = useRouter()
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)
  const [optimistic, move] = useOptimistic(
    cards,
    (state, { id, stage }: { id: string; stage: Stage }) =>
      state.map((c) => (c.id === id ? { ...c, stage, daysInStage: 0 } : c)),
  )

  const drop = (id: string, stage: Stage) => {
    const card = optimistic.find((c) => c.id === id)
    if (!card || card.stage === stage) return
    setError(null)
    start(async () => {
      move({ id, stage })
      const res = await moveStageAction(id, stage)
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="m-0 text-sm text-[#A3470F]">
          {error}
        </p>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-3.5">
          {BOARD_STAGES.map((stage) => {
            const list = optimistic.filter((c) => c.stage === stage)
            const dark = stage === 'live'
            const hl = stage === 'shoot_planned'
            return (
              <section
                key={stage}
                aria-label={STAGE_LABELS[stage]}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(stage)
                }}
                onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(null)
                  drop(e.dataTransfer.getData('text/plain'), stage)
                }}
                className={cn(
                  'flex min-h-40 w-[260px] flex-col gap-2.5 rounded-[20px] p-3.5 transition-shadow',
                  dark ? 'bg-ikr-navy' : hl ? 'bg-[#C9EEF5]' : 'bg-[#E8E1D3]',
                  dragOver === stage && 'shadow-[inset_0_0_0_3px_#0FC1DE]',
                )}
              >
                <div className="flex items-center justify-between px-1 py-0.5">
                  <h2 className={cn('m-0 text-[15px] font-bold', dark && 'text-ikr-cream-light')}>
                    {STAGE_LABELS[stage]}
                  </h2>
                  <Pill tone={dark ? 'cyan' : 'light'}>{list.length}</Pill>
                </div>
                {list.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                    className="relative flex cursor-grab flex-col gap-2 rounded-2xl bg-ikr-cream-light p-3.5 hover:shadow-[inset_0_0_0_2px_#0FC1DE] active:cursor-grabbing"
                  >
                    <Link
                      href={`/admin/klanten/${c.id}`}
                      className="text-[15px] font-bold text-ikr-navy no-underline hover:text-[#0B7F93]"
                    >
                      {c.name}
                    </Link>
                    {c.meta && <span className={cn('text-[13px]', muted)}>{c.meta}</span>}
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone={c.daysInStage >= 5 && stage !== 'live' ? 'orange' : 'neutral'}>
                        {c.daysInStage === 0
                          ? 'vandaag'
                          : `${c.daysInStage} ${c.daysInStage === 1 ? 'dag' : 'dagen'}`}{' '}
                        in fase
                      </Pill>
                    </div>
                    {c.amount && <span className={cn('text-xs', muted)}>{c.amount}</span>}
                    <label className="sr-only" htmlFor={`stage-${c.id}`}>
                      Fase van {c.name}
                    </label>
                    <select
                      id={`stage-${c.id}`}
                      value={c.stage}
                      onChange={(e) => drop(c.id, e.target.value as Stage)}
                      className="min-h-9 rounded-full border-0 bg-ikr-cream px-3 text-xs font-semibold text-ikr-navy"
                    >
                      {BOARD_STAGES.concat('churned').map((s) => (
                        <option key={s} value={s}>
                          → {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
