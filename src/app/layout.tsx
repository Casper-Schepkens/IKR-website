import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { cn } from '@/utilities/ui'
import {
  organizationJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from '@/lib/site'
import { Analytics } from '@vercel/analytics/next'
import { OpenAIAdsPixel } from '@/components/ikr/OpenAIAdsPixel'
import { PublicOnly } from '@/components/ikr/PublicOnly'
import './globals.css'

// Lettertypes zitten in de repo (Google Fonts, Latin, variabel): de build hangt zo niet af van
// fonts.googleapis.com, dat soms niet antwoordt en dan de deploy liet mislukken.
const inter = localFont({
  src: './fonts/Inter-latin.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
})
const robotoCondensed = localFont({
  src: './fonts/RobotoCondensed-latin.woff2',
  weight: '100 900',
  variable: '--font-roboto-condensed',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'nl_BE',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn(inter.variable, robotoCondensed.variable)} lang="nl-BE">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        {children}
        <PublicOnly>
          <Analytics />
          <OpenAIAdsPixel />
        </PublicOnly>
      </body>
    </html>
  )
}
