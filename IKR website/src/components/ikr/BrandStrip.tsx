import { readdirSync } from 'fs'
import { join } from 'path'
import { BrandStripMarquee } from './BrandStripMarquee'

export function BrandStrip() {
  let logos: { src: string; alt: string }[] = []

  try {
    const dir = join(process.cwd(), 'public/images/client_logos')
    logos = readdirSync(dir)
      .filter(f => /\.(png|jpe?g|webp|svg)$/i.test(f))
      .map(f => ({
        src: `/images/client_logos/${f}`,
        alt: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }))
  } catch {
    // map leeg of nog niet aangemaakt
  }

  return (
    <section style={{ backgroundColor: 'var(--ikr-cream)', paddingTop: 60, paddingBottom: 40 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p
          style={{
            fontFamily: 'var(--font-roboto-condensed)',
            fontWeight: 900,
            fontSize: 'clamp(2rem, 4.4vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
            color: 'var(--ikr-navy-text)',
          }}
        >
          WIJ FOCUSSEN OP
        </p>
        <p
          style={{
            fontFamily: 'var(--font-roboto-condensed)',
            fontWeight: 900,
            fontSize: 'clamp(2rem, 4.4vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
            color: '#00D4FF',
          }}
        >
          FOOD BRANDS
        </p>
      </div>

      <BrandStripMarquee logos={logos} />
    </section>
  )
}
