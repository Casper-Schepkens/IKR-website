'use client'

import { startTransition, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { adminLiveStamp } from '@/app/admin/live-actions'
import { isLivePath, refreshSoon } from '@/lib/admin/live'

const POLL_MS = 3000

/**
 * Op sales- en weekly-pagina's: als Grok Bot (of een AI-taak) data wijzigt, de pagina
 * opnieuw laden. De stempel raakt Gmail en Apollo niet; enkel bij een echte wijziging verversen we.
 */
export function LiveData() {
  const pathname = usePathname()
  const router = useRouter()
  const live = isLivePath(pathname)

  useEffect(() => {
    if (!live) return
    let stamp: string | null = null
    let seq = 0
    const tick = async () => {
      if (document.hidden) return
      const id = ++seq
      const res = await adminLiveStamp()
      if (id !== seq || !res.ok) return
      if (stamp === null) {
        stamp = res.data
        return
      }
      if (stamp === res.data) return
      stamp = res.data
      refreshSoon(() => startTransition(() => router.refresh()))
    }
    const timer = window.setInterval(tick, POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    void tick()
    return () => {
      seq += 1
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [live, router])

  return null
}
