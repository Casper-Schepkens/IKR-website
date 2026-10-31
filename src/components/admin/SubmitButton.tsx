'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass, Spinner } from './ui'

/** Verzendknop voor gewone server-action-formulieren, met directe bezig-status. */
export function SubmitButton({
  children,
  pendingText,
  variant = 'cyan',
  small = false,
  className,
}: {
  children: ReactNode
  pendingText?: string
  variant?: 'cyan' | 'navy' | 'soft' | 'light'
  small?: boolean
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      data-pending={pending}
      aria-busy={pending}
      className={className ?? buttonClass(variant, small)}
    >
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : children}
    </button>
  )
}
