'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addStepDefAction, moveStepDefAction, removeStepDefAction, updateStepDefAction } from '@/app/admin/production-actions'
import { ANCHOR_LABEL, OWNERS, PHASE_LABEL, WHO_LABEL, byPosition, type Phase, type StepDef } from '@/lib/admin/production/core'
import { ruleLabel, ruleText } from '@/lib/admin/production/rules'
import { buttonClass, input, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

export const RULE_HINT = 'Bv. "7 dagen voor draaidag", "2 weken na kick-off", "op draaidag", "eerste woensdag" (op of na het anker), "2026-12-24" of "geen".'

function useRun() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else after?.()
      router.refresh()
    })
  return { pending, error, run }
}

/**
 * Stappen bewerken: naam, eigenaar, volgorde, deadlineregel, link en notitie, per fase.
 * clientId = de eigen kopie van die klant; null = het workflow-sjabloon (voor nieuwe klanten).
 */
export function StepDefEditor({ clientId, defs }: { clientId: string | null; defs: StepDef[] }) {
  return (
    <div className="flex flex-col gap-4">
      {(['opstart', 'draaidag'] as Phase[]).map((phase) => {
        const list = defs.filter((d) => d.phase === phase).sort(byPosition)
        return (
          <section key={phase} aria-label={PHASE_LABEL[phase]} className="flex flex-col gap-1">
            <h3 className="m-0 text-sm font-bold tracking-wide uppercase">{PHASE_LABEL[phase]}</h3>
            <ol className="m-0 flex list-none flex-col p-0">
              {list.map((d, i) => (
                <DefRow key={d.id} clientId={clientId} def={d} index={i} count={list.length} />
              ))}
            </ol>
            <AddStep clientId={clientId} phase={phase} list={list} />
          </section>
        )
      })}
      <p className={cn('m-0 text-xs', muted)}>{RULE_HINT} Elke wijziging komt in het wijzigingslog en is terug te draaien.</p>
    </div>
  )
}

function OwnerSelect({ value, name = 'owner' }: { value?: string; name?: string }) {
  return (
    <select name={name} defaultValue={value ?? 'cedric'} aria-label="Eigenaar" className={cn(input, 'min-h-9 w-auto py-1 text-sm')}>
      {OWNERS.map((o) => (
        <option key={o} value={o}>
          {WHO_LABEL[o]}
        </option>
      ))}
    </select>
  )
}

function DefRow({ clientId, def: d, index, count }: { clientId: string | null; def: StepDef; index: number; count: number }) {
  const { pending, error, run } = useRun()
  const [edit, setEdit] = useState(false)
  return (
    <li className="flex flex-col gap-1.5 border-t border-[#E6DFD2] py-2 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('w-5 text-right text-xs', muted)}>{index + 1}.</span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{d.title}</span>
          <span className={cn('ml-1.5 text-xs', muted)}>
            · {WHO_LABEL[d.owner]} · {ruleLabel(d.rule)}
            {d.done_when && ` · vanzelf af als ${ANCHOR_LABEL[d.done_when]} ingevuld`}
            {d.is_shoot && ' · de draaidag zelf'}
          </span>
        </span>
        <button type="button" disabled={pending || index === 0} onClick={() => run(() => moveStepDefAction(clientId, d.key, index))} aria-label={`${d.title} omhoog`} className={cn(buttonClass('soft', true), 'min-h-8 px-2.5')}>
          ↑
        </button>
        <button type="button" disabled={pending || index === count - 1} onClick={() => run(() => moveStepDefAction(clientId, d.key, index + 2))} aria-label={`${d.title} omlaag`} className={cn(buttonClass('soft', true), 'min-h-8 px-2.5')}>
          ↓
        </button>
        <button type="button" onClick={() => setEdit(!edit)} aria-expanded={edit} aria-label={`${d.title} aanpassen`} className={cn(buttonClass('soft', true), 'min-h-8 px-2.5')}>
          …
        </button>
        <button
          type="button"
          disabled={pending || count <= 1}
          onClick={() => window.confirm(`Stap "${d.title}" verwijderen?`) && run(() => removeStepDefAction(clientId, d.key))}
          aria-label={`${d.title} verwijderen`}
          className={cn(buttonClass('soft', true), 'min-h-8 px-2.5')}
        >
          ✕
        </button>
        {pending && <Spinner />}
      </div>
      {edit && (
        <form
          className="ml-7 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => updateStepDefAction(clientId, d.key, data), () => setEdit(false))
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Naam
            <input name="title" defaultValue={d.title} required maxLength={200} className={cn(input, 'min-h-9 py-1 text-sm')} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Eigenaar
            <OwnerSelect value={d.owner} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Deadlineregel
            <input name="rule" defaultValue={ruleText(d.rule)} className={cn(input, 'min-h-9 py-1 text-sm')} aria-describedby={`hint-${d.id}`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Link (optioneel)
            <input name="link" type="url" defaultValue={d.link ?? ''} placeholder="https://" className={cn(input, 'min-h-9 py-1 text-sm')} />
          </label>
          <label className="col-span-full flex flex-col gap-1 text-xs font-semibold">
            Notitie (uitleg bij de stap)
            <textarea name="note" rows={2} defaultValue={d.note ?? ''} className={cn(input, 'py-1.5 text-sm')} />
          </label>
          <p id={`hint-${d.id}`} className={cn('col-span-full m-0 text-xs', muted)}>
            {RULE_HINT}
          </p>
          <div className="col-span-full flex gap-2">
            <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
              Bewaar
            </button>
            <button type="button" onClick={() => setEdit(false)} className={buttonClass('soft', true)}>
              Sluiten
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="m-0 ml-7 text-xs text-[#A3470F]">
          {error}
        </p>
      )}
    </li>
  )
}

function AddStep({ clientId, phase, list }: { clientId: string | null; phase: Phase; list: StepDef[] }) {
  const { pending, error, run } = useRun()
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(buttonClass('light', true), 'self-start')}>
        + Stap ({phase === 'opstart' ? 'opstart' : 'per draaidag'})
      </button>
    )
  return (
    <form
      className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-2 rounded-xl bg-white/60 p-2"
      onSubmit={(e) => {
        e.preventDefault()
        const f = e.currentTarget
        const data = new FormData(f)
        run(() => addStepDefAction(clientId, phase, data), () => {
          f.reset()
          setOpen(false)
        })
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Naam
        <input name="title" required maxLength={200} autoFocus className={cn(input, 'min-h-9 py-1 text-sm')} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Eigenaar
        <OwnerSelect />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Deadlineregel
        <input name="rule" placeholder={phase === 'draaidag' ? '2 dagen na draaidag' : '7 dagen na contract'} className={cn(input, 'min-h-9 py-1 text-sm')} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Na stap
        <select name="after" defaultValue={list.at(-1)?.key ?? ''} className={cn(input, 'min-h-9 py-1 text-sm')}>
          <option value="">(helemaal vooraan)</option>
          {list.map((d) => (
            <option key={d.key} value={d.key}>
              {d.title}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-full flex items-center gap-2">
        <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
          Toevoegen
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass('soft', true)}>
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
