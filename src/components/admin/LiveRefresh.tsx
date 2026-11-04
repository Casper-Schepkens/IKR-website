'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/admin/supabase/browser'

/** Wacht even zodat een reeks bot-wijzigingen (bv. 3 concepten na elkaar) één refresh geeft. */
const DEBOUNCE_MS = 700

/**
 * Ververst de huidige pagina zodra Grok Bot via MCP iets wijzigt.
 * Elke geslaagde schrijf-tool logt een rij in `bot_actions` (ná de wijziging); via Supabase Realtime
 * horen we die insert en doen we `router.refresh()` (server-data opnieuw, client-state blijft).
 * Enkel voor de sales-gebruiker (RLS op bot_actions laat anderen niets zien).
 */
export function LiveRefresh() {
  const router = useRouter()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    const supabase = createBrowserSupabase()
    let timer: ReturnType<typeof setTimeout> | undefined
    let connectedBefore = false
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS)
    }

    const channel = supabase
      .channel('admin-bot-actions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bot_actions' },
        (payload) => {
          if ((payload.new as { ok?: boolean }).ok) refresh()
        },
      )
      .subscribe((status) => {
        // Na een herverbinding kunnen we events gemist hebben: één keer bijwerken.
        if (status === 'SUBSCRIBED') {
          if (connectedBefore) refresh()
          connectedBefore = true
        }
      })

    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
