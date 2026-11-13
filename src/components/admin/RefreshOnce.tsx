'use client'

import { startTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Ververst de pagina één keer (na een achtergrond-sync die nieuwe data opleverde). */
export function RefreshOnce() {
  const router = useRouter()
  useEffect(() => {
    startTransition(() => router.refresh())
  }, [router])
  return null
}
