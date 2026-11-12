'use client'

import { useState } from 'react'
import type { Step } from '@/lib/admin/production/core'
import { buttonClass, Card, Empty, muted, Title } from '../ui'
import { StepRow } from './shared'
import { cn } from '@/utilities/ui'

export type PersonSteps = { key: 'cedric' | 'milan' | 'casper'; name: string; items: { clientId: string; clientName: string; step: Step }[] }

/** B: wat moet ik nu doen, over alle klanten heen (op deadline). */
export function NextSteps({ people, me, today, temp }: { people: PersonSteps[]; me: string | null; today: string; temp: boolean }) {
  const [who, setWho] = useState(people.find((p) => p.key === me)?.key ?? people[0].key)
  const p = people.find((x) => x.key === who)!
  const late = p.items.filter((i) => i.step.overdue).length
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Title className="m-0 text-2xl">{who === me ? 'Mijn volgende stappen' : `Volgende stappen ${p.name}`}{temp ? ' (temp)' : ''}</Title>
          <p className={cn('m-0 text-sm', muted)}>
            {p.items.length ? `${p.items.length} open${late ? `, waarvan ${late} te laat` : ''}.` : 'Niets open.'} Milan volgt de freelancer op, Cédric de klant.
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
      {!p.items.length ? (
        <Empty>Niets te doen. 🎉</Empty>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {p.items.map((i) => (
            <StepRow key={`${i.clientId}-${i.step.key}-${i.step.cycle?.no ?? 0}`} clientId={i.clientId} step={i.step} today={today} label={`${i.clientName} · ${i.step.cycle ? `draaidag ${i.step.cycle.no}` : 'opstart'}`} />
          ))}
        </ul>
      )}
    </Card>
  )
}
