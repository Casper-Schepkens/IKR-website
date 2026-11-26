'use client'

import Link from 'next/link'
import type { TeamMember, WeeklyProductionItem } from '@/lib/admin/production/core'
import { TEAM } from '@/lib/admin/weekly/types'
import { Card, Empty, muted, Title } from '../ui'
import { StepRow } from '../production/shared'
import { InternalRow } from '../production/InternalBlock'
import { cn } from '@/utilities/ui'

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })

/**
 * "Uit Productie" op de weekly: per teamlid wat in Productie tegen de volgende weekly klaar moet zijn
 * (of te laat is). Geen kopie: afvinken hier vinkt de stap of de interne taak in Productie af.
 */
export function ProductionOnWeekly({ byOwner, until, planned, today, me }: { byOwner: Record<TeamMember, WeeklyProductionItem[]>; until: string; planned: boolean; today: string; me: string | null }) {
  const people = [...TEAM].sort((a, b) => (a.key === me ? -1 : b.key === me ? 1 : 0))
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Title className="m-0 text-2xl">Uit Productie</Title>
          <p className={cn('m-0 text-sm', muted)}>
            Deadline tot en met {day(until)}
            {planned ? ' (volgende weekly)' : ' (nog geen weekly gepland: komende 7 dagen)'}, plus alles wat te laat is. Afvinken = afgevinkt in Productie.
          </p>
        </div>
        <Link href="/admin/productie" className="text-sm font-semibold text-adm-teal">
          Naar Productie →
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {people.map((p) => {
          const items = byOwner[p.key as TeamMember] ?? []
          const late = items.filter((i) => i.overdue).length
          return (
            <section key={p.key} aria-label={`Uit Productie: ${p.name}`} className="flex min-w-0 flex-col gap-1 rounded-2xl bg-adm-raised/50 p-3">
              <h3 className="m-0 text-sm font-bold">
                {p.name} <span className={cn('font-normal', muted)}>{items.length}</span>
                {late > 0 && <span className="ml-1.5 text-xs font-semibold text-adm-red">{late} te laat</span>}
              </h3>
              {!items.length ? (
                <Empty>Niets uit Productie.</Empty>
              ) : (
                <ul className="m-0 flex list-none flex-col p-0">
                  {items.map((i) =>
                    i.kind === 'step' ? (
                      <StepRow key={`${i.clientId}-${i.step.key}-${i.step.cycle?.no ?? 0}`} clientId={i.clientId} step={i.step} today={today} label={`${i.clientName} · ${i.step.cycle ? `draaidag ${i.step.cycle.no}` : 'opstart'}`} />
                    ) : (
                      <InternalRow key={`intern-${i.item.task.id}`} item={i.item} today={today} label="Intern" />
                    ),
                  )}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </Card>
  )
}
