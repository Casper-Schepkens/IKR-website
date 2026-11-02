'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass, Spinner } from './ui'

/** Verzendknop die eerst om bevestiging vraagt (voor iets dat je niet ongedaan kan maken). */
export function ConfirmSubmit({ message, children }: { message: string; children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      data-pending={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
      className={buttonClass('soft', true)}
    >
      {pending && <Spinner />}
      {children}
    </button>
  )
}
