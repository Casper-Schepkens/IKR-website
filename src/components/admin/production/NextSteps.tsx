'use client'

import { useState } from 'react'
import type { InternalItem, Step, TeamMember } from '@/lib/admin/production/core'
import { buttonClass, Card, Empty, muted, Title } from '../ui'
import { StepRow } from './shared'
import { InternalRow } from './InternalBlock'
import { cn } from '@/utilities/ui'

export type PersonItem = { kind: 'step'; clientId: string; clientName: string; step: Step } | { kind: 'intern'; item: InternalItem }
export type PersonSteps = { key: TeamMember; name: string; items: PersonItem[] }

const dueOf = (i: PersonItem) => (i.kind === 'step' ? i.step.due_on : i.item.due_on)
const lateOf = (i: PersonItem) => (i.kind === 'step' ? i.step.overdue : i.item.overdue)

/** Wat moet ik nu doen, over alle klanten heen en intern (op deadline). */
export function NextSteps({ people, me, today, temp }: { people: PersonSteps[]; me: string | null; today: string; temp: boolean }) {
  const [who, setWho] = useState(people.find((p) => p.key === me)?.key ?? people[0].key)
  const p = people.find((x) => x.key === who)!
  const items = [...p.items].sort((a, b) => (dueOf(a) ?? '9999').localeCompare(dueOf(b) ?? '9999'))
  const late = items.filter(lateOf).length
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Title className="m-0 text-2xl">
            {who === me ? 'Mijn volgende stappen' : `Volgende stappen ${p.name}`}
            {temp ? ' (temp)' : ''}
          </Title>
          <p className={cn('m-0 text-sm', muted)}>
            {items.length ? `${items.length} open${late ? `, waarvan ${late} te laat` : ''}.` : 'Niets open.'} Milan volgt de freelancer op, Cédric de klant.
          </p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Wie">
          {people.map((x) => (
            <button key={x.key} type="button" aria-pressed={x.key === who} onClick={() => setWho(x.key)} className={buttonClass(x.key === who ? 'navy' : 'light', true)}>
              {x.name} <span className="opacity-60">{x.items.length}</span>
            </button>
          ))}
        </div>
      </div>
      {!items.length ? (
        <Empty>Niets te doen. 🎉</Empty>
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
    </Card>
  )
}
