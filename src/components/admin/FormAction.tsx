'use client'

import { useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/app/admin/actions'
import { buttonClass } from './ui'
import { cn } from '@/utilities/ui'

/** Formulier dat een server action met FormData aanroept, met laad- en foutstatus. */
export function FormAction({
  action,
  children,
  submitLabel = 'Opslaan',
  pendingText = 'Opslaan…',
  resetOnSuccess = false,
  className,
  submitVariant = 'navy',
  onSuccess,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown>>
  children: ReactNode
  submitLabel?: ReactNode
  pendingText?: string
  resetOnSuccess?: boolean
  className?: string
  submitVariant?: 'cyan' | 'navy' | 'soft'
  onSuccess?: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLFormElement>(null)
  const router = useRouter()

  return (
    <form
      ref={ref}
      className={cn('flex flex-col gap-3', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        setError(null)
        setSaved(false)
        start(async () => {
          const res = await action(data)
          if (!res.ok) return setError(res.error)
          if (resetOnSuccess) ref.current?.reset()
          setSaved(true)
          onSuccess?.()
          router.refresh()
        })
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass(submitVariant, true)}>
          {pending ? pendingText : submitLabel}
        </button>
        {error && (
          <span role="alert" className="text-sm font-medium text-[#A3470F]">
            {error}
          </span>
        )}
        {saved && !error && !pending && <span className="text-sm text-[#1E5B27]">Opgeslagen</span>}
      </div>
    </form>
  )
}
