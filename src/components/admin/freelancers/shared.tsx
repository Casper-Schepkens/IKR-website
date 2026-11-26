'use client'

import { SCORE_LABELS, SCORE_MEANING, SCORES, type Score } from '@/lib/admin/freelancers/types'
import { cn } from '@/utilities/ui'

/** Kleuren van Milans systeem: rood, oranje, groen en een eigen kleur (paars) voor zekerheid. */
export const SCORE_CLASS: Record<Score, string> = {
  rood: 'bg-adm-red-bg text-adm-red',
  oranje: 'bg-adm-warn-bg text-adm-warn',
  groen: 'bg-adm-green-bg text-adm-green',
  zekerheid: 'bg-adm-violet-bg text-adm-violet',
}
const DOT: Record<Score, string> = { rood: 'bg-[#C0261A]', oranje: 'bg-[#E0701F]', groen: 'bg-[#2E8B3A]', zekerheid: 'bg-[#5B3FA8]' }

export function ScorePill({ score, className }: { score: Score; className?: string }) {
  return (
    <span title={SCORE_MEANING[score]} className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', SCORE_CLASS[score], className)}>
      <span aria-hidden className={cn('size-2 rounded-full', DOT[score])} />
      {SCORE_LABELS[score]}
    </span>
  )
}

/** Keuzelijst met de vier fases (en "geen score"). */
export function ScoreOptions() {
  return (
    <>
      <option value="">Geen score</option>
      {SCORES.map((s) => (
        <option key={s} value={s}>
          {SCORE_LABELS[s]} – {SCORE_MEANING[s]}
        </option>
      ))}
    </>
  )
}

/** Uitleg bij de kleuren (boven de tabel). */
export function ScoreLegend() {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2 p-0 text-xs text-adm-muted">
      {SCORES.map((s) => (
        <li key={s} className="flex items-start gap-2">
          <ScorePill score={s} className="shrink-0" />
          <span className="pt-1">{SCORE_MEANING[s]}</span>
        </li>
      ))}
    </ul>
  )
}
