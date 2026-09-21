import Link from 'next/link'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'

type LegalPageLayoutProps = {
  title: string
  children: React.ReactNode
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <section style={{ paddingTop: 80 }}>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: 'clamp(2.5rem, 8vw, 120px) clamp(1rem, 6.8vw, 98px)',
          }}
        >
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(2rem, 4vw, 56px)',
              textTransform: 'uppercase',
              color: ikr.navy,
              marginBottom: 'clamp(1.5rem, 3vw, 32px)',
            }}
          >
            {title}
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>{children}</div>

          <p style={{ ...bodyFont, fontSize: '0.9rem', color: ikr.navyText, marginTop: '2rem' }}>
            <Link href="/" style={{ color: ikr.navy, fontWeight: 700 }}>
              ← Terug naar home
            </Link>
            {' · '}
            <Link href="/privacy" style={{ color: ikr.navy }}>
              Privacy
            </Link>
            {' · '}
            <Link href="/cookies" style={{ color: ikr.navy }}>
              Cookies
            </Link>
            {' · '}
            <Link href="/algemene-voorwaarden" style={{ color: ikr.navy }}>
              Voorwaarden
            </Link>
            {' · '}
            <Link href="/legal" style={{ color: ikr.navy }}>
              Bedrijfsgegevens
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...bodyFont, fontSize: '1rem', color: ikr.navyText, lineHeight: 1.55 }}>{children}</p>
  )
}
