import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { NavFeedback } from '@/components/admin/NavFeedback'
import { parseTheme, THEME_COOKIE } from '@/lib/admin/theme'
import './admin.css'

export const metadata: Metadata = {
  title: { default: 'IKR Admin', template: '%s · IKR Admin' },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Thema uit de cookie al in de HTML zetten, zodat er bij het laden niets flitst. Geen cookie = systeem volgen.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <div data-theme={theme === 'system' ? undefined : theme} className="ikr-admin min-h-dvh bg-adm-page font-sans tracking-[-0.01em] text-adm-fg">
      <Suspense fallback={null}>
        <NavFeedback />
      </Suspense>
      {children}
    </div>
  )
}
