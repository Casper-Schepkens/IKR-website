'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Directe feedback bij het klikken op een interne link in /admin:
 * de aangeklikte link kleurt meteen en bovenaan loopt een laadbalk tot de nieuwe pagina er is.
 */
export function NavFeedback() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [busy, setBusy] = useState(false)

  // Nieuwe pagina geladen: alles terug normaal.
  useEffect(() => {
    setBusy(false)
    document.querySelectorAll('[data-nav-pending]').forEach((el) => {
      el.removeAttribute('data-nav-pending')
      el.removeAttribute('data-pending')
    })
  }, [pathname, search])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/admin')) return
      if (url.pathname.includes('/decks/') || url.pathname.startsWith('/admin/auth/')) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      a.setAttribute('data-pending', 'true')
      a.setAttribute('data-nav-pending', '')
      setBusy(true)
      clearTimeout(timer)
      timer = setTimeout(() => setBusy(false), 15000)
    }
    // Capture-fase: Next.js-links stoppen het standaardgedrag, maar we zien de klik toch.
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      clearTimeout(timer)
    }
  }, [])

  return busy ? <div className="ikr-progress" aria-hidden="true" /> : null
}
