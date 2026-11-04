'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { addFirefliesAction, firefliesStatusAction } from '@/app/admin/weekly-actions'
import { buttonClass, Pill, Spinner } from '../ui'

/** Checkt om de 30 seconden of de Fireflies-bot in de Meet zit, met een knop om hem toe te voegen. */
export function FirefliesCheck({ weeklyId }: { weeklyId: string }) {
  const [active, setActive] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const check = useCallback(async () => {
    const res = await firefliesStatusAction(weeklyId)
    if (res.ok) {
      setActive(res.data)
      setError(null)
    } else setError(res.error)
  }, [weeklyId])

  useEffect(() => {
    const kick = setTimeout(() => void check(), 0)
    const t = setInterval(() => void check(), 30_000)
    return () => {
      clearTimeout(kick)
      clearInterval(t)
    }
  }, [check])

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Is Fireflies actief?</span>
      {active === null && !error && <Spinner />}
      {active === true && <Pill tone="green">Ja, Fireflies neemt op</Pill>}
      {active === false && (
        <>
          <Pill tone="orange">Nee</Pill>
          <button
            type="button"
            disabled={pending}
            data-pending={pending}
            className={buttonClass('navy', true)}
            onClick={() =>
              start(async () => {
                const res = await addFirefliesAction(weeklyId)
                if (!res.ok) setError(res.error)
                else setTimeout(check, 20_000)
              })
            }
          >
            {pending && <Spinner />}
            Fireflies toevoegen
          </button>
        </>
      )}
      {error && <span className="text-sm text-[#A3470F]">{error}</span>}
    </span>
  )
}
