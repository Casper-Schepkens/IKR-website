'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Rendert alleen op de publieke site — niet in /admin (geen analytics of ads-pixel in het dashboard). */
export function PublicOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <>{children}</>
}
