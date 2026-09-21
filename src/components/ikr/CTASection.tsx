'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackCtaClick, trackCtaSectionView } from '@/lib/analytics'

const PLACEMENT = 'home_bottom' as const

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const viewedRef = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || viewedRef.current) return
        viewedRef.current = true
        trackCtaSectionView(PLACEMENT)
        observer.disconnect()
      },
      { threshold: 0.5 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} style={{ backgroundColor: 'var(--ikr-cream-light)' }} className="pb-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div
          className="rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
          style={{ backgroundColor: 'var(--ikr-navy)' }}
        >
          <h2
            className="font-display font-black uppercase leading-tight"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              letterSpacing: '-0.03em',
              color: '#fff',
              maxWidth: '28rem',
            }}
          >
            KLAAR OM JE SOCIALE MEDIA WAT EXTRA LIEFDE TE GEVEN?
          </h2>
          <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/contact"
              onClick={() => trackCtaClick('plan_call', PLACEMENT)}
              className="w-full sm:w-auto justify-center font-display font-black px-8 h-16 rounded-full flex items-center text-lg whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--ikr-cyan)', color: 'var(--ikr-navy)' }}
            >
              Plan een call →
            </Link>
            <Link
              href="/pricing"
              onClick={() => trackCtaClick('request_pricing', PLACEMENT)}
              className="w-full sm:w-auto justify-center font-display font-black px-8 h-16 rounded-full flex items-center text-lg whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: 'transparent',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.55)',
              }}
            >
              Vraag onze prijzen aan →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
