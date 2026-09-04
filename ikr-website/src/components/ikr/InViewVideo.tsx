'use client'

import { forwardRef, useEffect, useRef, type CSSProperties } from 'react'
import { videoPoster } from '@/lib/video-poster'

let active: HTMLVideoElement | null = null

function armSource(el: HTMLVideoElement) {
  const next = el.dataset.src
  if (!next) return
  if (el.getAttribute('src') !== next) {
    el.src = next
    el.preload = 'auto'
    el.load()
  }
}

export function claimVideo(el: HTMLVideoElement | null) {
  if (!el) return
  if (active && active !== el) active.pause()
  active = el
  el.muted = true
  armSource(el)
  el.preload = 'auto'
  void el.play().catch(() => {})
}

export function releaseVideo(el: HTMLVideoElement | null) {
  if (!el) return
  el.pause()
  if (active === el) active = null
}

type InViewVideoProps = {
  src: string
  className?: string
  style?: CSSProperties
  threshold?: number
  /** Observer alleen onder 1024px. Desktop blijft hover. */
  phoneOnly?: boolean
  /** false = mag samen met andere video's spelen (homepage thumbs). */
  exclusive?: boolean
  onError?: () => void
}

export const InViewVideo = forwardRef<HTMLVideoElement, InViewVideoProps>(
  function InViewVideo(
    { src, className, style, threshold = 0.55, phoneOnly = false, exclusive = true, onError },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLVideoElement>(null)
    const poster = videoPoster(src)

    const setRefs = (node: HTMLVideoElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }

    useEffect(() => {
      const el = innerRef.current
      if (!el) return
      el.pause()

      const mq = window.matchMedia('(min-width: 1024px)')
      let io: IntersectionObserver | null = null

      const stop = () => {
        io?.disconnect()
        io = null
        el.pause()
        if (active === el) active = null
      }

      const start = () => {
        if (io) return
        io = new IntersectionObserver(
          ([entry]) => {
            if (!entry) return
            if (entry.isIntersecting) {
              armSource(el)
              if (entry.intersectionRatio >= threshold) {
                if (exclusive) claimVideo(el)
                else {
                  el.muted = true
                  el.preload = 'auto'
                  void el.play().catch(() => {})
                }
              } else {
                el.pause()
                if (active === el) active = null
              }
            } else {
              el.pause()
              if (active === el) active = null
            }
          },
          { rootMargin: '280px 0px', threshold: [0, threshold, 1] },
        )
        io.observe(el)
      }

      const sync = () => {
        if (phoneOnly && mq.matches) stop()
        else start()
      }

      sync()
      mq.addEventListener('change', sync)
      return () => {
        mq.removeEventListener('change', sync)
        stop()
      }
    }, [src, threshold, phoneOnly, exclusive])

    return (
      <video
        ref={setRefs}
        data-src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        className={className}
        onError={onError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          backgroundColor: '#D0C8BC',
          pointerEvents: 'none',
          ...style,
        }}
      />
    )
  },
)
