'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const reviews = [
  {
    quote:
      'ZIJ SNAPPEN TIKTOK. IK BEN BLIJ DAT ZE ONS HELPEN OM MAISON SLASH NAAR EEN HOGER NIVEAU TE DUWEN.',
    name: 'Anne Cornu',
    role: 'CEO Maison Slash',
    bg: 'var(--ikr-cyan)',
    color: '#fff',
  },
  {
    quote:
      'ZIJ HEBDEN MIJN HAND VASTGEHOUDEN BIJ DE EERSTE STAPJES. SINDSDIEN VEEL MEER MEDIA-AANDACHT.',
    name: 'Dr. Anneke Govaerts',
    role: 'Migraine specialiste',
    bg: '#fff',
    color: 'var(--ikr-navy)',
  },
  {
    quote:
      'ONZE CIJFERS EXPLODEERDEN PAS MET IKNOWRIGHT. ÉÉN VIDEO GING VIRAAL EN ZETTE ALLES IN BEWEGING.',
    name: 'Maison Slash',
    role: 'Magazines voor ouders',
    bg: '#c4b098',
    color: 'var(--ikr-navy)',
  },
]

export function ReviewsSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.review-card', {
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="relative py-24 overflow-hidden" style={{ backgroundColor: 'var(--ikr-cream-light)' }}>
      <div className="absolute inset-0 flex flex-col justify-center overflow-hidden select-none pointer-events-none" aria-hidden>
        <p
          className="font-display font-black uppercase leading-[0.85] text-center"
          style={{
            fontSize: 'clamp(8rem, 22vw, 22rem)',
            letterSpacing: '-0.04em',
            color: 'var(--ikr-navy)',
            opacity: 0.06,
            whiteSpace: 'nowrap',
          }}
        >
          IKNOW
          <br />
          RIGHT
        </p>
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="review-card rounded-2xl p-8"
              style={{ backgroundColor: r.bg, color: r.color }}
            >
              <p
                className="font-display font-black uppercase leading-tight mb-6"
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', letterSpacing: '-0.03em' }}
              >
                {r.quote}
              </p>
              <div>
                <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                  {r.name}
                </p>
                <p className="text-xs opacity-75" style={{ fontFamily: 'var(--font-inter)' }}>
                  {r.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
