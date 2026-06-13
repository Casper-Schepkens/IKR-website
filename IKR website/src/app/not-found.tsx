import Link from 'next/link'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'

export default function NotFound() {
  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)', minHeight: '100vh' }}>
      <Navbar />
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '8rem 1.5rem 4rem',
          textAlign: 'center',
        }}
      >
        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(4rem, 15vw, 8rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy)',
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <p style={{ marginTop: '1rem', fontSize: '1.125rem', color: 'var(--ikr-navy-text)' }}>
          Deze pagina bestaat niet.
        </p>
        <Link
          href="/"
          className="font-display"
          style={{
            display: 'inline-flex',
            marginTop: '2rem',
            padding: '0 1.5rem',
            height: 48,
            alignItems: 'center',
            borderRadius: 9999,
            backgroundColor: 'var(--ikr-cyan)',
            color: 'var(--ikr-navy)',
            fontWeight: 900,
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Terug naar home
        </Link>
      </div>
      <SiteFooter />
    </main>
  )
}
