'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  caseLinkProps,
  homepageCarouselCards,
  homepageCarouselCardsMobile,
} from '@/data/cases'
import { ClickHint, ClientLogoSticker, TikTokHandleCaption } from './ClientLogoSticker'
import { claimVideo, InViewVideo } from './InViewVideo'

gsap.registerPlugin(ScrollTrigger)

const SCALE = 0.5
const CARD_W = 26.39 * SCALE
const CARD_H = 47.08 * SCALE
const BORDER = 1.18 * SCALE
const RADIUS = 1.18 * SCALE
const LAYOUT_CENTER = 36.53
const ORIG_CARD_W = 26.39
const ORIG_TOP_SPREAD = 127
const TOP_PAD = 3.2

function MobileCarouselCard({
  card,
}: {
  card: (typeof homepageCarouselCards)[number]
}) {
  return (
    <Link
      {...caseLinkProps(card.href)}
      aria-label={card.handle ? `${card.label} ${card.handle} bekijken` : `${card.label} bekijken`}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: 'min(82vw, 340px)',
        aspectRatio: '9 / 16',
        border: '4px solid #FFFFFF',
        borderRadius: 22,
        overflow: 'hidden',
        scrollSnapAlign: 'center',
        display: 'block',
        textDecoration: 'none',
        backgroundColor: '#D0C8BC',
      }}
    >
      <InViewVideo src={card.src} threshold={0.6} phoneOnly />
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, pointerEvents: 'none' }}>
        <ClientLogoSticker name={card.label} logo={card.logo} rotate={-7} />
      </div>
      {card.handle ? (
        <div style={{ position: 'absolute', left: 12, bottom: 14, zIndex: 2, pointerEvents: 'none' }}>
          <TikTokHandleCaption handle={card.handle} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 2, pointerEvents: 'none' }}>
        <ClickHint />
      </div>
    </Link>
  )
}

function PhoneInfiniteStrip() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const jumpingRef = useRef(false)
  const copies = 3
  // Food-first mobile order (Oh!ma, Wasbar, …). Later: swap non-food for Chez Albert + Lilalou.
  const mobileCards = homepageCarouselCardsMobile
  const loopCards = Array.from({ length: copies }, (_, copy) =>
    mobileCards.map((card) => ({ card, copy })),
  ).flat()

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const setWidth = () => {
      const first = el.children[0] as HTMLElement | undefined
      const next = el.children[mobileCards.length] as HTMLElement | undefined
      if (!first || !next) return 0
      return next.offsetLeft - first.offsetLeft
    }

    const goToMiddle = () => {
      const w = setWidth()
      if (w <= 0) return
      jumpingRef.current = true
      const snap = el.style.scrollSnapType
      el.style.scrollSnapType = 'none'
      el.scrollLeft = w
      requestAnimationFrame(() => {
        el.style.scrollSnapType = snap
        jumpingRef.current = false
      })
    }

    const wrap = () => {
      if (jumpingRef.current) return
      const w = setWidth()
      if (w <= 0) return
      if (el.scrollLeft < w) {
        jumpingRef.current = true
        const snap = el.style.scrollSnapType
        el.style.scrollSnapType = 'none'
        el.scrollLeft += w
        requestAnimationFrame(() => {
          el.style.scrollSnapType = snap
          jumpingRef.current = false
        })
      } else if (el.scrollLeft >= w * 2) {
        jumpingRef.current = true
        const snap = el.style.scrollSnapType
        el.style.scrollSnapType = 'none'
        el.scrollLeft -= w
        requestAnimationFrame(() => {
          el.style.scrollSnapType = snap
          jumpingRef.current = false
        })
      }
    }

    goToMiddle()
    requestAnimationFrame(goToMiddle)
    el.addEventListener('scroll', wrap, { passive: true })
    el.addEventListener('touchend', wrap)
    return () => {
      el.removeEventListener('scroll', wrap)
      el.removeEventListener('touchend', wrap)
    }
  }, [])

  return (
    <div
      ref={scrollerRef}
      className="flex lg:hidden"
      style={{
        gap: 12,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        padding: '0 20px 28px',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x pan-y',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {loopCards.map(({ card, copy }) => (
        <MobileCarouselCard key={`m-${copy}-${card.id}`} card={card} />
      ))}
    </div>
  )
}

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
    claimVideo(videoRefs.current[index])
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
      style={{ backgroundColor: 'var(--ikr-cream)', position: 'relative' }}
    >
      <PhoneInfiniteStrip />

      <div
        className="hidden lg:block"
        style={{
          position: 'relative',
          height: `calc(${TOP_PAD}vw + ${ORIG_TOP_SPREAD * SCALE * (100 / 1440)}vw + ${CARD_H * 1.08}vw + 4vw)`,
          overflow: 'hidden',
        }}
      >
        {homepageCarouselCards.map((card, i) => (
          <Link
            key={card.id}
            {...caseLinkProps(card.href)}
            aria-label={card.handle ? `${card.label} ${card.handle} bekijken` : `${card.label} bekijken`}
            className="carousel-card"
            onMouseEnter={() => handleEnter(i, card.id)}
            onMouseLeave={() => handleLeave(i)}
            style={{
              position: 'absolute',
              left: `${LAYOUT_CENTER + (ORIG_CARD_W - CARD_W) / 2 + (card.left - LAYOUT_CENTER) * SCALE}vw`,
              top: `${TOP_PAD + card.top * SCALE * (100 / 1440)}vw`,
              width: `${CARD_W}vw`,
              height: `${CARD_H}vw`,
              border: `${BORDER}vw solid #FFFFFF`,
              borderRadius: `${RADIUS}vw`,
              overflow: 'hidden',
              zIndex: hovered === card.id ? 10 : card.zIndex,
              boxShadow: card.shadow ? '0px 4px 24px rgba(0,0,0,0.25)' : 'none',
              transform: `rotate(${card.rotation}deg) scale(${hovered === card.id ? 1.06 : 1})`,
              transformOrigin: 'bottom center',
              transition: 'transform 0.35s ease, box-shadow 0.35s ease',
              cursor: 'pointer',
              display: 'block',
              textDecoration: 'none',
            }}
          >
            <InViewVideo
              ref={(el) => { videoRefs.current[i] = el }}
              src={card.src}
              phoneOnly
            />
            <div
              style={{
                position: 'absolute',
                top: 'clamp(8px, 4%, 14px)',
                left: 'clamp(8px, 4%, 14px)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <ClientLogoSticker name={card.label} logo={card.logo} rotate={-7} />
            </div>
            {card.handle ? (
              <div
                style={{
                  position: 'absolute',
                  left: 'clamp(8px, 4%, 14px)',
                  bottom: 'clamp(10px, 5%, 16px)',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              >
                <TikTokHandleCaption handle={card.handle} />
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                right: 'clamp(8px, 4%, 14px)',
                bottom: 'clamp(8px, 4%, 14px)',
                zIndex: 2,
                pointerEvents: 'none',
                opacity: hovered === card.id ? 1 : 0.85,
                transform: `scale(${hovered === card.id ? 1.08 : 1})`,
                transition: 'opacity 0.25s ease, transform 0.25s ease',
              }}
            >
              <ClickHint />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
