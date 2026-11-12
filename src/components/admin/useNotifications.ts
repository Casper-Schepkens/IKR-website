'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/admin/supabase/browser'
import { titleWithCount, total, type Counts } from '@/lib/admin/notifications/core'

const POLL_MS = 30_000
/** Een actie die een teller verandert (kaart geopend, voorstel beslist …) kan meteen laten hertellen. */
export const refreshNotifications = () => window.dispatchEvent(new Event('ikr:meldingen'))
/** Tabellen waarvan een wijziging de tellers meteen laat verversen (Realtime). */
const TABLES = ['bot_cards', 'bot_card_messages', 'sops', 'weekly_todos', 'mail_drafts', 'calls', 'production_steps']

/** Meldingstellers van de ingelogde gebruiker: bij laden, elke 30 s, bij navigeren en live via Realtime. */
export function useNotifications(): Counts {
  const [counts, setCounts] = useState<Counts>({})
  const pathname = usePathname()
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/meldingen', { cache: 'no-store' })
      if (res.ok && res.headers.get('content-type')?.includes('json')) setCounts((await res.json()) as Counts)
    } catch {
      // offline of even niet bereikbaar: volgende ronde opnieuw
    }
  }, [])

  useEffect(() => {
    // Na het navigeren opnieuw tellen (bv. een kaart geopend = niet meer nieuw).
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load, pathname])

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!document.hidden) void load()
    }, POLL_MS)
    const onEvent = () => void load()
    window.addEventListener('ikr:meldingen', onEvent)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = url && key ? createBrowserSupabase() : null
    let timer: ReturnType<typeof setTimeout> | undefined
    const channel = supabase?.channel('admin-meldingen')
    if (channel) {
      for (const table of TABLES)
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          clearTimeout(timer)
          timer = setTimeout(() => void load(), 600)
        })
      channel.subscribe()
    }
    return () => {
      window.clearInterval(t)
      window.removeEventListener('ikr:meldingen', onEvent)
      clearTimeout(timer)
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [load])

  // Totaal in de tabtitel, bv. "(5) Klanten | IKR". Na navigatie zet Next een nieuwe titel: dan opnieuw.
  const n = total(counts)
  useEffect(() => {
    const apply = () => {
      const next = titleWithCount(document.title, n)
      if (document.title !== next) document.title = next
    }
    apply()
    const t = setTimeout(apply, 300)
    return () => clearTimeout(t)
  }, [n, pathname])

  return counts
}
