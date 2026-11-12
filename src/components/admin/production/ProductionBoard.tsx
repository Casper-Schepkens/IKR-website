'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addShootDayAction, removeShootDayAction, setAnchorAction, setProductionActiveAction, setStartPointAction, startProductionAction } from '@/app/admin/production-actions'
import { CYCLE, ONBOARDING, WHO_LABEL, type Anchor, type ClientProduction } from '@/lib/admin/production/core'
import { buttonClass, Card, Empty, input, muted, Pill, Spinner, Title } from '../ui'
import { DuePill, StepRow } from './shared'
import { cn } from '@/utilities/ui'

type Run = (fn: () => Promise<{ ok: boolean; error?: string }>) => void
function useRun() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const run: Run = (fn) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      router.refresh()
    })
  return { pending, error, run }
}

/** A: per klant de fase, de volgende stap en (open) alle stappen en data. */
export function ProductionBoard({ list, notStarted, today, temp }: { list: ClientProduction[]; notStarted: { id: string; name: string }[]; today: string; temp: boolean }) {
  const active = list.filter((c) => c.production.active)
  const paused = list.filter((c) => !c.production.active)
  return (
    <Card className="flex flex-col gap-3 p-0">
      <div className="px-6 pt-5">
        <Title className="m-0 text-2xl">Per klant{temp ? ' (temp)' : ''}</Title>
        <p className={cn('m-0 text-sm', muted)}>Klik op een klant voor alle stappen, data en draaidagen.</p>
      </div>
      {!list.length && (
        <div className="px-6">
          <Empty>Nog geen productie gestart. Start hieronder een klant, of zeg tegen Grok Bot waar een klant zit.</Empty>
        </div>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {[...active, ...paused].map((c) => (
          <ClientRow key={c.client_id} cp={c} today={today} />
        ))}
      </ul>
      {notStarted.length > 0 && <NotStarted clients={notStarted} />}
    </Card>
  )
}

function ClientRow({ cp, today }: { cp: ClientProduction; today: string }) {
  // "Ga naar productie van X" (?klant=id): openklappen en ernaartoe scrollen.
  const focus = useSearchParams().get('klant') === cp.client_id
  const ref = useRef<HTMLLIElement>(null)
  // Zelf open- of dichtgeklikt gaat voor; anders open als er naartoe gesprongen werd.
  const [toggled, setOpen] = useState<boolean | null>(null)
  const open = toggled ?? focus
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])
  const n = cp.next
  return (
    <li ref={ref} className={cn('scroll-mt-24 border-t border-[#E6DFD2]', !cp.production.active && 'opacity-60')}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="grid w-full grid-cols-1 items-center gap-2 px-6 py-3 text-left hover:bg-ikr-cream/60 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className={cn('inline-block text-xs transition-transform', open && 'rotate-90')}>
            ▸
          </span>
          <span className="font-bold">{cp.name}</span>
          {!cp.production.active && <Pill tone="neutral">gepauzeerd</Pill>}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm">{cp.phase}</span>
          <span className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-[#E6DFD2]" aria-hidden>
            <span className="block h-full rounded-full bg-[#0B9DB8]" style={{ width: `${Math.round(cp.progress * 100)}%` }} />
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 md:justify-end">
          {n ? (
            <>
              <span className={cn('text-xs', muted)}>{WHO_LABEL[n.who]}</span>
              <DuePill due={n.due_on} today={today} />
            </>
          ) : (
            <Pill tone="green">alles af</Pill>
          )}
        </span>
      </button>
      {open && (
        <div className="bg-ikr-cream/40 px-6 pt-1 pb-5">
          <Detail cp={cp} today={today} />
        </div>
      )}
    </li>
  )
}

function DateField({ clientId, anchor, label, value, cycle, time }: { clientId: string; anchor: Anchor; label: string; value: string | null; cycle?: number; time?: string | null }) {
  const { pending, error, run } = useRun()
  return (
    <form
      className="flex flex-col gap-1"
      onChange={(e) => {
        const f = e.currentTarget
        run(() => setAnchorAction(clientId, anchor, new FormData(f)))
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="flex items-center gap-1.5">
        <input name="date" type="date" defaultValue={value ?? ''} disabled={pending} className={cn(input, 'min-h-9 py-1 text-sm')} aria-label={label} />
        {cycle != null && (
          <>
            <input type="hidden" name="cycle" value={cycle} />
            <input name="time" type="time" defaultValue={time ?? ''} disabled={pending} className={cn(input, 'min-h-9 w-28 py-1 text-sm')} aria-label={`${label}: uur`} />
          </>
        )}
        {pending && <Spinner />}
      </span>
      {error && (
        <span role="alert" className="text-xs text-[#A3470F]">
          {error}
        </span>
      )}
    </form>
  )
}

function Detail({ cp, today }: { cp: ClientProduction; today: string }) {
  const { pending, error, run } = useRun()
  const p = cp.production
  const points = [
    ...ONBOARDING.map((s) => ({ v: s.key, l: `Opstart: ${s.title}` })),
    ...Array.from({ length: Math.max(1, cp.cycles.length) + 1 }, (_, i) => i + 1).flatMap((no) => CYCLE.map((s) => ({ v: `${s.key}|${no}`, l: `Draaidag ${no}: ${s.title}` }))),
  ]
  const current = cp.next ? (cp.next.cycle ? `${cp.next.key}|${cp.next.cycle.no}` : cp.next.key) : ''
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 rounded-2xl bg-white/60 p-3">
        <DateField clientId={cp.client_id} anchor="getekend" label="Contract getekend" value={p.signed_on} />
        <DateField clientId={cp.client_id} anchor="kickoff" label="Kick-off" value={p.kickoff_on} />
        <DateField clientId={cp.client_id} anchor="strategie" label="Strategiemeeting" value={p.strategy_on} />
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          run(() => setStartPointAction(cp.client_id, data))
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold">
          We zitten nu bij (alles ervoor wordt afgevinkt)
          <select name="point" defaultValue={current} className={cn(input, 'min-h-9 py-1 text-sm')}>
            {points.map((x) => (
              <option key={x.v} value={x.v}>
                {x.l}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className={buttonClass('soft', true)}>
          Zet hier
        </button>
      </form>

      <Block title="Opstart" done={cp.onboarding.every((s) => s.done)}>
        <ul className="m-0 flex list-none flex-col p-0">
          {cp.onboarding.map((s) => (
            <StepRow key={s.key} clientId={cp.client_id} step={s} today={today} />
          ))}
        </ul>
      </Block>

      {cp.cycleSteps.map(({ cycle, steps }) => (
        <Block key={cycle.id} title={`Draaidag ${cycle.no}${cycle.shoot_on ? ` · ${new Date(`${cycle.shoot_on}T12:00:00Z`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}` : ''}`} done={steps.every((s) => s.done)}>
          <div className="flex flex-wrap items-end justify-end gap-2">
            <div className="flex items-end gap-2">
              <DateField clientId={cp.client_id} anchor="draaidag" label="Datum en uur" value={cycle.shoot_on} cycle={cycle.no} time={cycle.shoot_time} />
              <button type="button" disabled={pending} onClick={() => run(() => removeShootDayAction(cp.client_id, cycle.no))} className={cn(buttonClass('soft', true), 'min-h-9')} aria-label={`Draaidag ${cycle.no} verwijderen`}>
                ✕
              </button>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {steps.map((s) => (
              <StepRow key={s.key} clientId={cp.client_id} step={s} today={today} />
            ))}
          </ul>
        </Block>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => addShootDayAction(cp.client_id, data))
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Nieuwe draaidag (datum mag later)
            <input name="date" type="date" className={cn(input, 'min-h-9 py-1 text-sm')} />
          </label>
          <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
            Draaidag toevoegen
          </button>
        </form>
        <button type="button" disabled={pending} onClick={() => run(() => setProductionActiveAction(cp.client_id, !p.active))} className={cn(buttonClass('soft', true), 'ml-auto')}>
          {p.active ? 'Pauzeren' : 'Terug actief'}
        </button>
        {pending && <Spinner />}
        {error && (
          <span role="alert" className="text-xs text-[#A3470F]">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}

function NotStarted({ clients }: { clients: { id: string; name: string }[] }) {
  const { pending, error, run } = useRun()
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#E6DFD2] px-6 py-4">
      <span className={cn('text-sm', muted)}>Nog niet gestart:</span>
      {clients.map((c) => (
        <button key={c.id} type="button" disabled={pending} onClick={() => run(() => startProductionAction(c.id))} className={buttonClass('light', true)}>
          + {c.name}
        </button>
      ))}
      {pending && <Spinner />}
      {error && (
        <span role="alert" className="text-xs text-[#A3470F]">
          {error}
        </span>
      )}
    </div>
  )
}

/** Een fase; helemaal af = ingeklapt (klik om te openen). */
function Block({ title, done, children }: { title: string; done: boolean; children: React.ReactNode }) {
  if (done)
    return (
      <details className="rounded-xl bg-white/50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-bold tracking-wide uppercase">
          {title} <span className={cn('font-normal normal-case', muted)}>· alles af ✓</span>
        </summary>
        <div className="mt-2 flex flex-col gap-2">{children}</div>
      </details>
    )
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="m-0 text-sm font-bold tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  )
}
