'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moveStageAction } from '@/app/admin/actions'
import { STAGE_LABELS, STAGES, type Stage } from '@/lib/admin/types'

export function StageSelect({ clientId, stage }: { clientId: string; stage: Stage }) {
  const [value, setValue] = useState(stage)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  return (
    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#5E5670]">
      Fase
      <select
        value={value}
        disabled={pending}
        data-pending={pending}
        aria-busy={pending}
        onChange={(e) => {
          const next = e.target.value as Stage
          setValue(next)
          start(async () => {
            const res = await moveStageAction(clientId, next)
            if (!res.ok) {
              setError(res.error)
              setValue(stage)
            } else router.refresh()
          })
        }}
        className="min-h-11 rounded-full border-0 bg-ikr-cream-light px-4 text-sm font-semibold text-ikr-navy"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-[#A3470F]">{error}</span>}
    </label>
  )
}
