'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Ververst de pagina periodiek zolang `active` waar is (bv. terwijl een deck gemaakt wordt). */
export function AutoRefresh({
  active,
  intervalMs = 5000,
}: {
  active: boolean
  intervalMs?: number
}) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(t)
  }, [active, intervalMs, router])
  return null
}
