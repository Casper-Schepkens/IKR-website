'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const reviews = [
  { quote: 'ONGELOOFLIJK BLIJ MET DE RESULTATEN', name: 'Wout Desmedt', bg: 'var(--ikr-cyan)', color: '#fff' },
  { quote: 'WAUW! WAT EEN KWALITEIT WERD AFGELEVERD', name: 'Koen Degrote', bg: '#fff', color: 'var(--ikr-navy)' },
  { quote: 'NIET NORMAAL HOEVEEL VIEWS WIJ KREGEN', name: 'Bart Delrue', bg: '#c4b098', color: 'var(--ikr-navy)' },
]

export function ReviewsSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.review-card', {
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
        y: 50, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="relative py-24 overflow-hidden" style={{ backgroundColor: 'var(--ikr-cream-light)' }}>
      {/* IKNOWRIGHT watermark */}
      <div className="absolute inset-0 flex flex-col justify-center overflow-hidden select-none pointer-events-none"
        aria-hidden>
        <p className="font-display font-black uppercase leading-[0.85] text-center"
          style={{
            fontSize: 'clamp(8rem, 22vw, 22rem)',
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy)',
            opacity: 0.06,
            whiteSpace: 'nowrap',
          }}>
          IKNOW<br />RIGHT
        </p>
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <div key={i}
              className="review-card rounded-2xl p-8"
              style={{ backgroundColor: r.bg, color: r.color }}>
              <p className="font-display font-black uppercase leading-tight mb-6"
                style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', letterSpacing: '-0.03em' }}>
                {r.quote}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: r.color === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(32,23,55,0.15)' }} />
                <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-inter)' }}>{r.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
