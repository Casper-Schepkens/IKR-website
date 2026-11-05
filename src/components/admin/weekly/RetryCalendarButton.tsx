'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { retryWeeklyCalendarAction } from '@/app/admin/weekly-actions'
import { buttonClass, Spinner } from '../ui'

/** Agenda-item en Meet alsnog aanmaken (de bewaarde foutmelding kan van vóór het koppelen zijn). */
export function RetryCalendarButton({ weeklyId, online }: { weeklyId: string; online: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        data-pending={pending}
        onClick={() =>
          start(async () => {
            setError(null)
            const res = await retryWeeklyCalendarAction(weeklyId)
            if (!res.ok) setError(res.error)
            router.refresh()
          })
        }
        className={buttonClass('soft', true)}
      >
        {pending && <Spinner />} {online ? 'Agenda en Meet opnieuw proberen' : 'Agenda opnieuw proberen'}
      </button>
      {error && (
        <span role="alert" className="text-xs text-[#A3470F]">
          {error}
        </span>
      )}
    </span>
  )
}
