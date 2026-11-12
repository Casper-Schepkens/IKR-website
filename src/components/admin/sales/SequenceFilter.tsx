'use client'

import { useOptimistic, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { buttonClass, muted } from '../ui'
import { cn } from '@/utilities/ui'

/** Kies welke sequences meetellen: standaard alle actieve; schakelaar voor inactieve. */
export function SequenceFilter({ sequences, inactive, ids }: { sequences: { id: string; name: string; active: boolean }[]; inactive: boolean; ids: string[] }) {
  const router = useRouter()
  const path = usePathname()
  const [, start] = useTransition()
  // Meteen tonen wat je aanklikt; de pagina (stats) volgt na de navigatie.
  const [sel, setSel] = useOptimistic({ inactive, ids })
  const go = (next: { inactive: boolean; ids: string[] }) => {
    const p = new URLSearchParams()
    if (next.inactive) p.set('alle', '1')
    if (next.ids.length) p.set('seq', next.ids.join(','))
    start(() => {
      setSel(next)
      router.replace(p.size ? `${path}?${p}` : path, { scroll: false })
    })
  }
  const visible = sequences.filter((s) => s.active || sel.inactive)
  const all = !sel.ids.length
  const toggle = (id: string) => {
    // Vanuit "alle": enkel deze. Daarna aan- en uitvinken; niets meer gekozen = terug naar alle.
    const next = all ? [id] : sel.ids.includes(id) ? sel.ids.filter((x) => x !== id) : [...sel.ids, id]
    go({ inactive: sel.inactive, ids: next.length === visible.length ? [] : next })
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sequences">
        <button type="button" aria-pressed={all} onClick={() => go({ inactive: sel.inactive, ids: [] })} className={buttonClass(all ? 'navy' : 'light', true)}>
          {sel.inactive ? 'Alle sequences' : 'Alle actieve'}
        </button>
        {visible.map((s) => {
          const on = !all && sel.ids.includes(s.id)
          return (
            <button key={s.id} type="button" aria-pressed={on} onClick={() => toggle(s.id)} className={cn(buttonClass(on ? 'navy' : 'light', true), !s.active && 'italic')}>
              {s.name}
              {!s.active && <span className="opacity-60"> (inactief)</span>}
            </button>
          )
        })}
      </div>
      <label className={cn('flex items-center gap-2 text-xs', muted)}>
        <input type="checkbox" checked={sel.inactive} onChange={(e) => go({ inactive: e.target.checked, ids: e.target.checked ? sel.ids : sel.ids.filter((id) => sequences.find((s) => s.id === id)?.active) })} className="accent-ikr-navy" />
        Ook inactieve sequences tonen
      </label>
    </div>
  )
}
