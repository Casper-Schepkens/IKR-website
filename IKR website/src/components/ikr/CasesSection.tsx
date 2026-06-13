import Image from 'next/image'
import Link from 'next/link'

export function CasesSection() {
  return (
    <section style={{ backgroundColor: 'var(--ikr-cream-light)' }} className="py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <p className="font-display font-black uppercase text-sm tracking-widest"
            style={{ color: 'rgba(32,23,55,0.4)' }}>
            Onze cases
          </p>
          <Link href="/cases"
            className="font-display font-black uppercase text-sm px-5 h-9 rounded-full flex items-center"
            style={{ backgroundColor: 'var(--ikr-navy)', color: '#fff' }}>
            ZIE ALLES →
          </Link>
        </div>

        {/* Cases grid — gebruik de geëxporteerde afbeelding als achtergrond */}
        <div className="rounded-3xl overflow-hidden" style={{ aspectRatio: '16/7' }}>
          <Image
            src="/images/cases-grid.png"
            alt="Onze cases"
            width={1200}
            height={525}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
