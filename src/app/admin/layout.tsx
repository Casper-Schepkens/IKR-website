import type { Metadata } from 'next'
import { Suspense } from 'react'
import { NavFeedback } from '@/components/admin/NavFeedback'
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

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ikr-admin min-h-dvh bg-ikr-cream font-sans tracking-[-0.01em] text-ikr-navy">
      <Suspense fallback={null}>
        <NavFeedback />
      </Suspense>
      {children}
    </div>
  )
}
