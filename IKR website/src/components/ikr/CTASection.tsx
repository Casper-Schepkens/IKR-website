import Link from 'next/link'

export function CTASection() {
  return (
    <section style={{ backgroundColor: 'var(--ikr-cream-light)' }} className="pb-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="rounded-3xl p-12 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
          style={{ backgroundColor: 'var(--ikr-navy)' }}>
          <h2 className="font-display font-black uppercase leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.03em', color: '#fff', maxWidth: '28rem' }}>
            KLAAR OM JE SOCIALE MEDIA WAT EXTRA LIEFDE TE GEVEN?
          </h2>
          <Link href="/contact"
            className="shrink-0 font-display font-black px-8 h-16 rounded-full flex items-center text-lg whitespace-nowrap hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--ikr-cyan)', color: 'var(--ikr-navy)' }}>
            Plan een call →
          </Link>
        </div>
      </div>
    </section>
  )
}
