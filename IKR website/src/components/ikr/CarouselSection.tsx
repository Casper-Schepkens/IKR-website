'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const cards = [
  { id: 'far-left',   left: -11.6,  top: 127, rotation: -16, zIndex: 1,  src: '/videos/Pureto%20video%20brandoefening.mp4' },
  { id: 'near-left',  left:   9.86, top:  48, rotation: -10, zIndex: 2,  src: '/videos/pureto%20video%20theelepels.mp4' },
  { id: 'center',     left:  36.53, top:   0, rotation:   0, zIndex: 5,  src: '/videos/ssstik.io_%40wasbarontiktok_1777728322884.mp4', shadow: true },
  { id: 'near-right', left:  56.81, top:  48, rotation:  10, zIndex: 2,  src: '/videos/AQPqG4SqZV4UXGZ3hWquu3MNeOMQYJWr8n20QBgE7Za9REEzc6rxLdRaDJrDJykthPWf-Lyd8847GvjDATmM0BVp.mp4' },
  { id: 'far-right',  left:  74.1,  top: 127, rotation:  16, zIndex: 1,  src: '/videos/AQPQweSd1NLfgqKuAh9wpKsJ1pFBE4bPxsZNKbD_bYSvKqmazqpDpv9pLtB9ZSQ4WwPK5gOsEMDnErMeUAeREhCvoBtIq-kAnYZto7A.mp4' },
]

const CARD_W = 26.39
const CARD_H = 47.08
const BORDER = 1.18
const RADIUS = 1.18

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
        backgroundColor: '#F0EBE0',
        position: 'relative',
        height: `calc(${127 * (100 / 1440)}vw + ${CARD_H}vw + 6vw)`,
        overflow: 'hidden',
      }}
    >
      {cards.map((card, i) => (
        <div
          key={card.id}
          className="carousel-card"
          onMouseEnter={() => handleEnter(i, card.id)}
          onMouseLeave={() => handleLeave(i)}
          style={{
            position: 'absolute',
            left: `${card.left}vw`,
            top: `${card.top * (100 / 1440)}vw`,
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
        </div>
      ))}
    </section>
  )
}
