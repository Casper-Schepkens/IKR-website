import type { Metadata } from 'next'
import { Inter, Roboto_Condensed } from 'next/font/google'
import { cn } from '@/utilities/ui'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-roboto-condensed',
})

export const metadata: Metadata = {
  title: 'IKnowRight — TikTok bureau voor food brands',
  description: 'Wij maken scroll-stoppende content voor food brands die gezien en onthouden willen worden.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn(inter.variable, robotoCondensed.variable)} lang="nl">
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
      </head>
      <body>{children}</body>
    </html>
  )
}
