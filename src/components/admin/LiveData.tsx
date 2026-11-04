'use client'

import { startTransition, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { adminLiveStamp } from '@/app/admin/live-actions'
import { isLivePath, LIVE_TABLES } from '@/lib/admin/live'
import { createBrowserSupabase } from '@/lib/admin/supabase/browser'

/** Wacht even zodat een reeks wijzigingen (bv. 3 concepten na elkaar) één verversing geeft. */
const DEBOUNCE_MS = 400
/** Reserve als Realtime niet verbonden is (of lokaal zonder Supabase): de lichte stempel pollen. */
const FALLBACK_POLL_MS = 3000

/**
 * Op sales- en weekly-pagina's: als Grok Bot, een AI-taak of een collega data wijzigt, de pagina
 * opnieuw laden. Standaard via Supabase Realtime (RLS bepaalt wie welke wijziging hoort);
 * enkel zolang Realtime niet verbonden is, valt dit terug op de stempel-poll.
 * Velden die je zelf aan het typen bent blijven staan (useFollowServer / FormAction serverValues).
 */
export function LiveData({ stamp: rendered }: { stamp: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const live = isLivePath(pathname)
  // Laatst gekende stand: eerst die van de server-render, daarna van elke controle of nieuwe render.
  const known = useRef<string | null>(rendered)
  useEffect(() => {
    known.current = rendered
  }, [rendered])

  useEffect(() => {
    if (!live) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!disposed) startTransition(() => router.refresh())
      }, DEBOUNCE_MS)
    }

    // Stempel vergelijken met de laatst gekende stand; verschil = verversen.
    let seq = 0
    const check = async () => {
      const id = ++seq
      const res = await adminLiveStamp()
      if (disposed || id !== seq || !res.ok) return
      if (known.current !== null && known.current !== res.data) refresh()
      known.current = res.data
    }

    // ── Reserve: pollen zolang Realtime niet verbonden is ──
    let realtimeUp = false
    const tick = () => {
      if (!realtimeUp && !document.hidden) void check()
    }
    const poll = window.setInterval(tick, FALLBACK_POLL_MS)
    tick()

    // ── Realtime ──
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = url && key ? createBrowserSupabase() : null
    let wasUp = false
    const channel = supabase?.channel(`admin-live-${pathname}`)
    if (supabase && channel) {
      for (const table of LIVE_TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeUp = true
          // Wijzigingen van vóór de verbinding (sinds de render of tijdens een onderbreking): één controle.
          if (wasUp) refresh()
          else void check()
          wasUp = true
        } else {
          realtimeUp = false
        }
      })
    }

    // Terug naar het tabblad: één keer bijwerken (de browser kan de verbinding gepauzeerd hebben).
    const onVisible = () => {
      if (document.hidden) return
      void check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      seq += 1
      clearTimeout(timer)
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [live, pathname, router])

  return null
}
