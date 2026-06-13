'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { caseCarouselVideos, heroFeedVideos } from '@/data/videos'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import { TikTokPhoneFeed, type FeedItem } from './TikTokPhoneFeed'

const heroFeed: FeedItem[] = [...heroFeedVideos]

const caseVideos = Array.from({ length: 10 }, (_, i) => caseCarouselVideos[i % caseCarouselVideos.length])

const steps = [
  {
    title: 'ELKAAR LEREN KENNEN',
    body: 'We luisteren. Wat is jouw verhaal? Wat wil je bereiken? Tijdens dit gesprek leren we je merk en doelen kennen, zodat we gericht aan de slag kunnen.',
    align: 'left' as const,
    iconSrc: '/images/aanpak/speech_bubble_img.png',
  },
  {
    title: 'PLANNING EN STRATEGIE',
    body: 'We presenteren onze creatieve strategie: welke soort content, welke formats, welke stijl. Je krijgt een helder overzicht van hoe we te werk gaan voor jouw brand — van ideeën tot publicatie.',
    align: 'right' as const,
    iconSrc: '/images/aanpak/checlist_img.png',
  },
  {
    title: 'JOUW MERK IN BEELD',
    body: "Onze creator komt langs op locatie en legt alles vast. Efficiënt, relaxed en met oog voor jouw merkidentiteit. Daarna editen wij alles tot scroll-stoppende video's die resultaten opleveren.",
    align: 'left' as const,
    iconSrc: '/images/aanpak/film_ding_img.png',
  },
]

function ProcessIcon({ src }: { src: string }) {
  return (
    <div
      style={{
        width: 'clamp(140px, 22vw, 320px)',
        height: 'clamp(140px, 22vw, 320px)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <Image src={src} alt="" fill style={{ objectFit: 'contain' }} sizes="320px" />
    </div>
  )
}

function HeroPhone() {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '9 / 19.5',
        borderRadius: 'clamp(40px, 16.5%, 62px)',
        padding: 'clamp(7px, 1.65%, 12px)',
        background: 'linear-gradient(165deg, #a1a1a6 0%, #636366 22%, #3a3a3c 55%, #1c1c1e 100%)',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
        filter: 'drop-shadow(0 28px 48px rgba(32,23,55,0.28))',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 'clamp(32px, 13.5%, 50px)',
          background: '#000',
          padding: 'clamp(4px, 0.9%, 7px)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'clamp(28px, 12%, 44px)',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#000',
          }}
        >
          <TikTokPhoneFeed items={heroFeed} variant="classic" />

          <div
            style={{
              position: 'absolute',
              top: '2.2%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '30%',
              height: '3.4%',
              minHeight: 11,
              backgroundColor: '#000',
              borderRadius: 99,
              zIndex: 4,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section style={{ backgroundColor: ikr.cream, paddingTop: 80, overflow: 'hidden' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(1rem, 6.8vw, 98px)' }}>
        <div style={{ paddingTop: 'clamp(2rem, 10vw, 140px)', textAlign: 'center' }}>
          <p style={{ ...displayFont, fontSize: 'clamp(1rem, 2.22vw, 32px)', color: ikr.navy, marginBottom: '0.5rem' }}>
            MAAR...
          </p>
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(2.5rem, 8.89vw, 128px)',
              lineHeight: '79%',
              color: ikr.navy,
              textTransform: 'uppercase',
              marginBottom: 'clamp(2rem, 5vw, 60px)',
            }}
          >
            WAT DOEN WE PRECIES?
          </h1>

          <div
            style={{
              width: 'min(calc(80svh * 9 / 19.5), 100%)',
              margin: '0 auto',
            }}
          >
            <HeroPhone />
          </div>
        </div>

        <div style={{ paddingTop: 'clamp(2rem, 6vw, 80px)', paddingBottom: 'clamp(2rem, 6vw, 80px)' }}>
          <p
            style={{
              ...displayFont,
              fontSize: 'clamp(1.5rem, 4.44vw, 64px)',
              lineHeight: '100%',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: 'clamp(1.5rem, 4vw, 60px)',
            }}
          >
            <span style={{ color: ikr.navy }}>SIMPEL!</span>
            <br />
            <span style={{ color: ikr.cyan }}>RESULTATEN BEHALEN</span>
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: '2rem' }}>
            {[
              { num: '125M', label: 'Weergaven' },
              { num: '263', label: "Video's" },
              { num: '400K', label: 'Nieuwe volgers' },
            ].map(({ num, label }) => (
              <div key={num} style={{ textAlign: 'center' }}>
                <span
                  style={{
                    ...displayFont,
                    fontSize: 'clamp(3rem, 10.4vw, 150px)',
                    lineHeight: '79%',
                    color: 'var(--ikr-navy-text)',
                    display: 'block',
                  }}
                >
                  {num}
                </span>
                <span
                  style={{
                    ...bodyFont,
                    fontSize: 'clamp(0.875rem, 2.78vw, 40px)',
                    color: ikr.navy,
                    marginTop: '0.5rem',
                    display: 'block',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProcessSection() {
  return (
    <section style={{ backgroundColor: ikr.navy }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(1rem, 6.8vw, 98px)' }}>
        <div style={{ paddingTop: 'clamp(2rem, 8.7vw, 125px)', paddingBottom: 'clamp(1rem, 4vw, 60px)' }}>
          <p
            style={{
              ...displayFont,
              fontSize: 'clamp(1rem, 2.22vw, 32px)',
              color: '#FFF9F1',
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            LEES HIER...
          </p>
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(2.5rem, 8.89vw, 128px)',
              lineHeight: '79%',
              color: '#FFF9F1',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: 'clamp(3rem, 8vw, 120px)',
            }}
          >
            HOE WIJ WERKEN
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(3rem, 8vw, 120px)',
            paddingBottom: 'clamp(3rem, 8vw, 120px)',
          }}
        >
          {steps.map((step) => (
            <div
              key={step.title}
              className={`flex flex-col items-center gap-[clamp(2rem,5vw,80px)] ${step.align === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'}`}
            >
              <div style={{ flex: 1, textAlign: step.align === 'right' ? 'right' : 'left' }}>
                <h3
                  style={{
                    ...displayFont,
                    fontSize: 'clamp(1.5rem, 4.44vw, 64px)',
                    lineHeight: '100%',
                    textTransform: 'uppercase',
                    color: '#FFF9F1',
                    marginBottom: 'clamp(1rem, 2vw, 28px)',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ ...bodyFont, fontSize: 'clamp(1rem, 2.22vw, 32px)', color: '#FFF9F1' }}>{step.body}</p>
              </div>
              {step.iconSrc && <ProcessIcon src={step.iconSrc} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Zelfde verhoudingen als homescreen CarouselSection */
const CASE_CARD_W = 26.39
const CASE_CARD_H = 47.08

const CASE_SCROLL_SPEED = 0.55

function CaseCardButton() {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href="/cases"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 'clamp(10px, 7%, 18px)',
        left: '50%',
        transform: `translateX(-50%) translateY(${hovered ? -2 : 0}px) scale(${hovered ? 1.08 : 1})`,
        ...displayFont,
        fontSize: 'clamp(0.6rem, 1.15vw, 15px)',
        color: ikr.navy,
        backgroundColor: '#FFF9F1',
        borderRadius: 48,
        padding: '0.45em 1.1em',
        textDecoration: 'none',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        zIndex: 2,
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 10px 24px rgba(32,23,55,0.32), 0 3px 8px rgba(15,193,222,0.2), inset 0 1px 0 rgba(255,255,255,0.9)'
          : '0 4px 14px rgba(32,23,55,0.2), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.85)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      ZIE CASE
    </Link>
  )
}

function CaseVideosRow() {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const offsetRef = useRef(0)
  const halfWidthRef = useRef(0)
  const pausedRef = useRef(false)
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartOffsetRef = useRef(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const loopVideos = [...caseVideos, ...caseVideos]

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => { halfWidthRef.current = el.scrollWidth / 2 }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (!pausedRef.current && !draggingRef.current && halfWidthRef.current > 0) {
        offsetRef.current -= CASE_SCROLL_SPEED
        if (Math.abs(offsetRef.current) >= halfWidthRef.current) {
          offsetRef.current += halfWidthRef.current
        }
      }
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onMove = (clientX: number) => {
      if (!draggingRef.current) return
      offsetRef.current = dragStartOffsetRef.current + (clientX - dragStartXRef.current)
      const half = halfWidthRef.current
      if (half > 0) {
        while (offsetRef.current <= -half) offsetRef.current += half
        while (offsetRef.current > 0) offsetRef.current -= half
      }
    }

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return
      onMove(e.touches[0].clientX)
    }
    const endDrag = () => {
      draggingRef.current = false
      setDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', endDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', endDrag)
    }
  }, [])

  const startDrag = (clientX: number) => {
    draggingRef.current = true
    setDragging(true)
    dragStartXRef.current = clientX
    dragStartOffsetRef.current = offsetRef.current
  }

  const handleCardEnter = (index: number) => {
    setHovered(index)
    videoRefs.current[index]?.play()
  }

  const handleCardLeave = (index: number) => {
    setHovered(null)
    const video = videoRefs.current[index]
    if (video) {
      video.pause()
      video.currentTime = 0
    }
  }

  return (
    <div
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest('a')) return
        e.preventDefault()
        startDrag(e.clientX)
      }}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      style={{
        overflow: 'hidden',
        marginBottom: 'clamp(1.5rem, 3vw, 48px)',
        minHeight: `clamp(320px, ${CASE_CARD_H * 0.72}vw, 620px)`,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(1.25rem, 4vw, 48px)',
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {loopVideos.map((src, i) => (
          <div
            key={`${src}-${i}`}
            onMouseEnter={() => handleCardEnter(i)}
            onMouseLeave={() => handleCardLeave(i)}
            style={{
              position: 'relative',
              width: `clamp(140px, ${CASE_CARD_W * 0.72}vw, 300px)`,
              aspectRatio: `${CASE_CARD_W} / ${CASE_CARD_H}`,
              border: 'clamp(3px, 0.28vw, 5px) solid #FFFFFF',
              borderRadius: 'clamp(18px, 2vw, 30px)',
              overflow: 'hidden',
              zIndex: hovered === i ? 10 : 1,
              boxShadow: hovered === i ? '0px 4px 24px rgba(0,0,0,0.25)' : 'none',
              transform: `scale(${hovered === i ? 1.06 : 1})`,
              transition: 'transform 0.35s ease, box-shadow 0.35s ease',
              flexShrink: 0,
              backgroundColor: '#D0C8BC',
              pointerEvents: dragging ? 'none' : 'auto',
            }}
          >
            <video
              ref={(el) => { videoRefs.current[i] = el }}
              src={src}
              muted
              loop
              playsInline
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 55%, rgba(32,23,55,0.75) 100%)',
                pointerEvents: 'none',
              }}
            />
            <CaseCardButton />
          </div>
        ))}
      </div>
    </div>
  )
}

function CTAButton({
  href,
  fullLabel,
  shortLabel,
  collapsed,
}: {
  href: string
  fullLabel: string
  shortLabel: string
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        ...displayFont,
        display: 'inline-block',
        position: 'relative',
        fontSize: 'clamp(1rem, 2.78vw, 40px)',
        color: ikr.navy,
        backgroundColor: '#FFF9F1',
        borderRadius: 48,
        padding: '0.4em 1.2em',
        textDecoration: 'none',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.35s ease' }}>
        {fullLabel}
      </span>
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: collapsed ? 1 : 0,
          transition: 'opacity 0.35s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {shortLabel}
      </span>
    </Link>
  )
}

function FadeText({
  visible,
  children,
  style,
}: {
  visible: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function CTAContent({
  collapsed,
  children,
  style,
}: {
  collapsed: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        ...style,
        transform: collapsed ? 'scale(0.4)' : 'scale(1)',
        transformOrigin: 'bottom left',
        transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  )
}

function CasesAndCTASection() {
  const [hoveredCta, setHoveredCta] = useState<'freelancer' | 'contact' | null>(null)

  const freelancerFlex = hoveredCta === 'freelancer' ? '0 0 80%' : hoveredCta === 'contact' ? '0 0 20%' : '1 1 50%'
  const contactFlex = hoveredCta === 'contact' ? '0 0 80%' : hoveredCta === 'freelancer' ? '0 0 20%' : '1 1 50%'
  const showFreelancerCopy = hoveredCta !== 'contact'
  const showContactCopy = hoveredCta !== 'freelancer'
  const freelancerCollapsed = hoveredCta === 'contact'
  const contactCollapsed = hoveredCta === 'freelancer'

  return (
    <section style={{ backgroundColor: ikr.cream, padding: 'clamp(3rem, 8vw, 120px) 0' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(1rem, 6.8vw, 98px)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'clamp(1.5rem, 3vw, 48px)',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span style={{ ...displayFont, fontSize: 'clamp(1rem, 2.78vw, 40px)', color: ikr.navy }}>
            BEKIJK HET ZELF...
          </span>
          <Link
            href="/cases"
            style={{
              ...displayFont,
              fontSize: 'clamp(0.875rem, 2.22vw, 32px)',
              color: '#FFF9F1',
              backgroundColor: ikr.navy,
              borderRadius: 48,
              padding: '0.45em 1.2em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            ZIE ALLES
          </Link>
        </div>

        <CaseVideosRow />

        <div
          className="hidden lg:flex gap-[clamp(1rem,2vw,28px)] items-stretch"
          style={{ transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div
            onMouseEnter={() => setHoveredCta('freelancer')}
            onMouseLeave={() => setHoveredCta(null)}
            style={{
              flex: freelancerFlex,
              borderRadius: 30,
              minHeight: 'clamp(300px, 58.7vw, 845px)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              transition: 'flex 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              minWidth: 0,
              cursor: 'pointer',
            }}
          >
            <Image
              src="/images/freelancer-cta.jpg"
              alt=""
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 55vw"
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(32,22,55,0.15) 0%, rgba(32,22,55,0.85) 100%)',
              }}
            />
            <CTAContent
              collapsed={freelancerCollapsed}
              style={{ position: 'relative', zIndex: 2, padding: 'clamp(2rem, 5vw, 72px) clamp(1.5rem, 4vw, 56px)' }}
            >
              <FadeText
                visible={showFreelancerCopy}
                style={{ marginBottom: 'clamp(1.5rem, 3vw, 44px)' }}
              >
                <h3
                  style={{
                    ...displayFont,
                    fontSize: 'clamp(1.25rem, 3.33vw, 48px)',
                    lineHeight: 1.15,
                    textTransform: 'uppercase',
                    color: '#FFF9F1',
                    margin: 0,
                  }}
                >
                  WIL JE BIJ IKNOWRIGHT WERKEN ALS FREELANCER?
                </h3>
              </FadeText>
              <CTAButton
                href="/contact"
                fullLabel="SOLLICITEER NU"
                shortLabel="SOLLICITEER"
                collapsed={freelancerCollapsed}
              />
            </CTAContent>
          </div>

          <div
            onMouseEnter={() => setHoveredCta('contact')}
            onMouseLeave={() => setHoveredCta(null)}
            style={{
              flex: contactFlex,
              borderRadius: 30,
              background: 'radial-gradient(170% 170% at 96% -86%, var(--ikr-cyan) 0%, var(--ikr-navy-text) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              minHeight: 'clamp(300px, 58.7vw, 845px)',
              transition: 'flex 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              minWidth: 0,
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <CTAContent
              collapsed={contactCollapsed}
              style={{ padding: 'clamp(2rem, 5vw, 72px) clamp(1.5rem, 4vw, 56px)' }}
            >
            <FadeText visible={showContactCopy}>
              <p
                style={{
                  ...displayFont,
                  fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
                  textTransform: 'uppercase',
                  color: '#FFF9F1',
                  marginBottom: '0.5rem',
                }}
              >
                SAMENWERKEN?
              </p>
              <h3
                style={{
                  ...displayFont,
                  fontSize: 'clamp(1.25rem, 3.33vw, 48px)',
                  lineHeight: 1.15,
                  textTransform: 'uppercase',
                  color: '#FFF9F1',
                  marginBottom: 'clamp(1.5rem, 3vw, 44px)',
                }}
              >
                KLAAR OM JE SOCIALE MEDIA WAT EXTRA LIEFDE TE GEVEN?
              </h3>
            </FadeText>
            <CTAButton
              href="/contact"
              fullLabel="CONTACTEER ONS"
              shortLabel="CONTACT"
              collapsed={contactCollapsed}
            />
            </CTAContent>
          </div>
        </div>

        {/* Mobile: stacked without hover expand */}
        <div className="flex flex-col gap-[clamp(1rem,2vw,28px)] lg:hidden">
          <div
            style={{
              borderRadius: 30,
              minHeight: 320,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <Image src="/images/freelancer-cta.jpg" alt="" fill style={{ objectFit: 'cover' }} sizes="100vw" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(32,22,55,0.15) 0%, rgba(32,22,55,0.85) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(2rem, 5vw, 72px) clamp(1.5rem, 4vw, 56px)' }}>
              <h3 style={{ ...displayFont, fontSize: 'clamp(1.25rem, 3.33vw, 48px)', lineHeight: 1.15, textTransform: 'uppercase', color: '#FFF9F1', marginBottom: 'clamp(1.5rem, 3vw, 44px)' }}>
                WIL JE BIJ IKNOWRIGHT WERKEN ALS FREELANCER?
              </h3>
              <Link href="/contact" style={{ ...displayFont, display: 'inline-block', fontSize: 'clamp(1rem, 2.78vw, 40px)', color: ikr.navy, backgroundColor: '#FFF9F1', borderRadius: 48, padding: '0.4em 1.2em', textDecoration: 'none', textTransform: 'uppercase' }}>
                SOLLICITEER NU
              </Link>
            </div>
          </div>
          <div
            style={{
              borderRadius: 30,
              background: 'radial-gradient(170% 170% at 96% -86%, var(--ikr-cyan) 0%, var(--ikr-navy-text) 100%)',
              padding: 'clamp(2rem, 5vw, 72px) clamp(1.5rem, 4vw, 56px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              minHeight: 320,
            }}
          >
            <p style={{ ...displayFont, fontSize: 'clamp(0.875rem, 1.67vw, 24px)', textTransform: 'uppercase', color: '#FFF9F1', marginBottom: '0.5rem' }}>SAMENWERKEN?</p>
            <h3 style={{ ...displayFont, fontSize: 'clamp(1.25rem, 3.33vw, 48px)', lineHeight: 1.15, textTransform: 'uppercase', color: '#FFF9F1', marginBottom: 'clamp(1.5rem, 3vw, 44px)' }}>
              KLAAR OM JE SOCIALE MEDIA WAT EXTRA LIEFDE TE GEVEN?
            </h3>
            <Link href="/contact" style={{ ...displayFont, display: 'inline-block', fontSize: 'clamp(1rem, 2.78vw, 40px)', color: ikr.navy, backgroundColor: '#FFF9F1', borderRadius: 48, padding: '0.4em 1.2em', textDecoration: 'none', textTransform: 'uppercase' }}>
              CONTACTEER ONS
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function AanpakPageContent() {
  return (
    <>
      <HeroSection />
      <ProcessSection />
      <CasesAndCTASection />
    </>
  )
}
