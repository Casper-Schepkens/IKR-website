'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/app/admin/actions'
import { keepEdited } from '@/lib/admin/live'
import { buttonClass, Spinner } from './ui'
import { cn } from '@/utilities/ui'

function isField(el: Element): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

/** Wat het veld toonde vóór een server-update (defaultValue, niet een latere DOM-schrijfactie). */
function fieldBaseline(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (el instanceof HTMLSelectElement) {
    return Array.from(el.options).find((o) => o.defaultSelected)?.value ?? el.value
  }
  return el.defaultValue
}

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
  serverValues,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown>>
  children: ReactNode
  submitLabel?: ReactNode
  pendingText?: string
  resetOnSuccess?: boolean
  className?: string
  submitVariant?: 'cyan' | 'navy' | 'soft'
  onSuccess?: () => void
  /** Laatste waarden van de server, per veldnaam. Ongerepte velden nemen die over. */
  serverValues?: Record<string, string>
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLFormElement>(null)
  const applied = useRef<Record<string, string> | null>(null)
  const serialized = serverValues ? JSON.stringify(serverValues) : ''
  const router = useRouter()

  // Nieuwe serverdata in ongerepte velden zetten. Een veld dat Casper aan het aanpassen is blijft staan.
  useEffect(() => {
    if (!serialized) return
    const form = ref.current
    if (!form) return
    const next = JSON.parse(serialized) as Record<string, string>
    const prev = applied.current
    for (const el of Array.from(form.elements)) {
      if (!isField(el) || !el.name || !(el.name in next)) continue
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.type === 'hidden')) continue
      const baseline = prev && el.name in prev ? prev[el.name] : fieldBaseline(el)
      const value = keepEdited(el.value, baseline, next[el.name])
      if (el.value !== value) el.value = value
    }
    applied.current = next
  }, [serialized])

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
        <button
          type="submit"
          disabled={pending}
          data-pending={pending}
          aria-busy={pending}
          className={buttonClass(submitVariant, true)}
        >
          {pending && <Spinner />}
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
