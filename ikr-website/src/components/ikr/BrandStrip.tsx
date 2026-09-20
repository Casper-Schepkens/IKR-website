import { brandStripItems } from '@/data/brands'
import { BrandStripMarquee } from './BrandStripMarquee'

export function BrandStrip() {
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

      <BrandStripMarquee items={brandStripItems} />
    </section>
  )
}
