import type { Metadata } from 'next'

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
    <div className="min-h-dvh bg-ikr-cream font-sans tracking-[-0.01em] text-ikr-navy">
      {children}
    </div>
  )
}
