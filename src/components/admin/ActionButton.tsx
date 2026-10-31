'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/app/admin/actions'
import { buttonClass, Icon, Spinner } from './ui'
import { cn } from '@/utilities/ui'

/**
 * Knop die een server action uitvoert, laadtekst toont, fouten netjes meldt en de pagina ververst.
 * `ai` toont het IKR AI-sterretje.
 */
export function ActionButton({
  action,
  children,
  pendingText = 'Bezig…',
  variant = 'soft',
  small = true,
  ai = false,
  confirm,
  className,
  onDone,
}: {
  action: () => Promise<ActionResult<unknown>>
  children: ReactNode
  pendingText?: string
  variant?: 'cyan' | 'navy' | 'soft' | 'light' | 'ghostDark'
  small?: boolean
  ai?: boolean
  confirm?: string
  className?: string
  onDone?: (data: unknown) => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <span className={cn('inline-flex flex-col items-start gap-1', className)}>
      <button
        type="button"
        disabled={pending}
        data-pending={pending}
        aria-busy={pending}
        className={buttonClass(variant, small)}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return
          setError(null)
          start(async () => {
            const res = await action()
            if (!res.ok) setError(res.error)
            else {
              onDone?.(res.data)
              router.refresh()
            }
          })
        }}
      >
        {pending ? (
          <Spinner />
        ) : ai && (
          <Icon.sparkle
            size={14}
            className={
              variant === 'cyan' || variant === 'light' || variant === 'soft'
                ? 'text-[#0B7F93]'
                : 'text-ikr-cyan'
            }
          />
        )}
        {pending ? pendingText : children}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-xs font-medium text-[#A3470F]">
          {error}
        </span>
      )}
    </span>
  )
}
