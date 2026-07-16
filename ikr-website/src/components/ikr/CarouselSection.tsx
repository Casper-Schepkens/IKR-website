'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { homepageCarouselCards } from '@/data/cases'

gsap.registerPlugin(ScrollTrigger)

const SCALE = 0.5
const CARD_W = 26.39 * SCALE
const CARD_H = 47.08 * SCALE
const BORDER = 1.18 * SCALE
const RADIUS = 1.18 * SCALE
const LAYOUT_CENTER = 36.53
const ORIG_CARD_W = 26.39
const ORIG_TOP_SPREAD = 127

export function CarouselSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.carousel-card', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 85%' },
        y: 80,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const handleEnter = (index: number, id: string) => {
    setHovered(id)
    const video = videoRefs.current[index]
    if (video) video.play()
  }

  const handleLeave = (index: number) => {
    setHovered(null)
    const video = videoRefs.current[index]
    if (video) {
      video.pause()
      video.currentTime = 0
    }
  }

  return (
    <section
      ref={sectionRef}
      style={{
        backgroundColor: 'var(--ikr-cream)',
        position: 'relative',
        height: `calc(${ORIG_TOP_SPREAD * SCALE * (100 / 1440)}vw + ${CARD_H}vw + 4vw)`,
        overflow: 'hidden',
      }}
    >
      {homepageCarouselCards.map((card, i) => (
        <Link
          key={card.id}
          href={card.href}
          aria-label={`Case ${card.label}`}
          className="carousel-card"
          onMouseEnter={() => handleEnter(i, card.id)}
          onMouseLeave={() => handleLeave(i)}
          style={{
            position: 'absolute',
            left: `${LAYOUT_CENTER + (ORIG_CARD_W - CARD_W) / 2 + (card.left - LAYOUT_CENTER) * SCALE}vw`,
            top: `${card.top * SCALE * (100 / 1440)}vw`,
            width: `${CARD_W}vw`,
            height: `${CARD_H}vw`,
            border: `${BORDER}vw solid #FFFFFF`,
            borderRadius: `${RADIUS}vw`,
            overflow: 'hidden',
            zIndex: hovered === card.id ? 10 : card.zIndex,
            boxShadow: card.shadow ? '0px 4px 24px rgba(0,0,0,0.25)' : 'none',
            transform: `rotate(${card.rotation}deg) scale(${hovered === card.id ? 1.06 : 1})`,
            transition: 'transform 0.35s ease, box-shadow 0.35s ease',
            cursor: 'pointer',
            display: 'block',
            textDecoration: 'none',
          }}
        >
          <video
            ref={(el) => { videoRefs.current[i] = el }}
            src={card.src}
            muted
            loop
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: '#D0C8BC',
            }}
          />
        </Link>
      ))}
    </section>
  )
}
