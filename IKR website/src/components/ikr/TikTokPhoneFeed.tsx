'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type FeedItem = {
  src: string
  user: string
  caption: string
  song: string
  likes: string
  comments: string
}

export type TikTokVariant = 'classic' | 'ios' | 'modern2026'

/** iPhone 15 Pro logical size — overlay is designed at this resolution and scaled down */
const REF_W = 390
const REF_H = 844

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const BTN_RESET: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '4px 2px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 5,
  pointerEvents: 'auto',
  WebkitTapHighlightColor: 'transparent',
}

function SideAction({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        setPressed(true)
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        ...BTN_RESET,
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        transition: 'transform 0.12s ease',
      }}
    >
      {children}
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: FONT, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        {label}
      </span>
    </button>
  )
}

function ActionRail({
  item,
  liked,
  onLike,
  compact = false,
}: {
  item: FeedItem
  liked: boolean
  onLike: () => void
  compact?: boolean
}) {
  const icon = compact ? 32 : 42
  const avatar = compact ? 44 : 52
  const disc = compact ? 40 : 46

  return (
    <div
      style={{
        position: 'absolute',
        right: 8,
        top: compact ? 100 : 100,
        bottom: compact ? 110 : 68,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
        zIndex: 5,
      }}
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ ...BTN_RESET, position: 'relative', marginBottom: 0 }}
      >
        <div style={{ width: avatar, height: avatar, borderRadius: '50%', border: '2px solid #fff', background: 'linear-gradient(135deg, #666, #222)' }} />
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: '#fe2c55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1 }}>+</span>
        </div>
      </button>

      <SideAction label={item.likes} onClick={onLike}>
        <svg width={icon} height={icon} viewBox="0 0 48 48" fill={liked ? '#fe2c55' : '#fff'} style={{ transition: 'fill 0.2s ease, transform 0.2s ease', transform: liked ? 'scale(1.12)' : 'scale(1)' }}>
          <path d="M34.6 3.1c-3.6 0-6.6 1.8-8.6 4.6-2-2.8-5-4.6-8.6-4.6C8.4 3.1 3 8.6 3 15.3c0 11.7 20.1 22.8 21.4 23.5.4.2.8.3 1.2.3s.8-.1 1.2-.3c1.3-.7 21.4-11.8 21.4-23.5 0-6.7-5.4-12.2-12-12.2z" />
        </svg>
      </SideAction>

      <SideAction label={item.comments}>
        <svg width={icon} height={icon} viewBox="0 0 48 48" fill="#fff">
          <path d="M48 24c0 13.3-10.8 24-24 24-3.6 0-7-.8-10.1-2.2L0 48l2.2-13.9C.8 31 0 27.6 0 24 0 10.8 10.8 0 24 0s24 10.8 24 24z" />
        </svg>
      </SideAction>

      <SideAction label="Share">
        <svg width={icon - 2} height={icon - 2} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </SideAction>

      <button type="button" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ ...BTN_RESET, padding: 0 }}>
        <div
          style={{
            width: disc,
            height: disc,
            borderRadius: '50%',
            border: '8px solid rgba(0,0,0,0.85)',
            background: 'conic-gradient(from 0deg, #fe2c55, #25f4ee, #fe2c55)',
            animation: 'tiktok-spin 4s linear infinite',
          }}
        />
      </button>
    </div>
  )
}

function BottomMeta({ item, bottom = 108 }: { item: FeedItem; bottom?: number }) {
  return (
    <div style={{ position: 'absolute', left: 12, right: 72, bottom }}>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2, fontFamily: FONT }}>
        {item.user}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 14,
          fontWeight: 400,
          color: '#fff',
          lineHeight: 1.35,
          fontFamily: FONT,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {item.caption}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, overflow: 'hidden' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ flexShrink: 0 }}>
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <p className="tiktok-song-marquee" style={{ margin: 0, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', fontFamily: FONT }}>
            {item.song} · {item.song}
          </p>
        </div>
      </div>
    </div>
  )
}

function TabBarClassic() {
  const tabs = [
    { label: 'Home', active: true, home: true },
    { label: 'Friends', active: false },
    { label: 'Create', active: false, create: true },
    { label: 'Inbox', active: false, inbox: true },
    { label: 'Profile', active: false, profile: true },
  ]

  return (
    <div style={{ background: '#000', borderTop: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', padding: '6px 4px 10px', height: 56 }}>
      {tabs.map((tab) => (
        <div key={tab.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 56 }}>
          {tab.create ? (
            <div style={{ width: 48, height: 30, borderRadius: 8, background: 'linear-gradient(90deg, #25f4ee 48%, #fe2c55 52%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 22, fontWeight: 300, lineHeight: 1 }}>+</span>
            </div>
          ) : tab.home ? (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="#fff"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" /></svg>
          ) : tab.inbox ? (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          ) : tab.profile ? (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          ) : (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
          )}
          <span style={{ fontSize: 10, fontWeight: tab.active ? 700 : 400, color: tab.active ? '#fff' : 'rgba(255,255,255,0.65)', fontFamily: FONT }}>{tab.label}</span>
        </div>
      ))}
    </div>
  )
}

function TabBarIOS() {
  return (
    <div style={{ background: '#000', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 8px 14px', height: 52 }}>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="#fff"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" /></svg>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
      <div style={{ width: 40, height: 26, borderRadius: 7, background: 'linear-gradient(90deg, #25f4ee 48%, #fe2c55 52%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 300 }}>+</span>
      </div>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
    </div>
  )
}

/** 2026-style: frosted glass nav, pill tabs, repost + shop + home indicator */
function TabBar2026() {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          height: 54,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '6px 8px 4px',
          background: 'rgba(22,22,24,0.65)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          borderTop: '0.5px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="#fff"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" /></svg>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', fontFamily: FONT }}>Home</span>
        </div>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <div style={{ width: 42, height: 27, borderRadius: 8, background: 'linear-gradient(135deg, #25f4ee 0%, #fe2c55 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(254,44,85,0.35)' }}>
          <span style={{ color: '#fff', fontSize: 19, fontWeight: 300, lineHeight: 1 }}>+</span>
        </div>
        <div style={{ position: 'relative' }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <div style={{ position: 'absolute', top: -2, right: -4, width: 7, height: 7, borderRadius: '50%', background: '#fe2c55', border: '1.5px solid rgba(22,22,24,0.9)' }} />
        </div>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
      </div>
      <div style={{ height: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(22,22,24,0.65)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div style={{ width: 108, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.92)' }} />
      </div>
    </div>
  )
}

function TikTokOverlay({
  item,
  variant,
  liked,
  onLike,
}: {
  item: FeedItem
  variant: TikTokVariant
  liked: boolean
  onLike: () => void
}) {
  const gradient = 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 22%, transparent 50%, rgba(0,0,0,0.6) 100%)'

  if (variant === 'modern2026') {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, fontFamily: FONT }}>
        <div style={{ position: 'absolute', inset: 0, background: gradient }} />

        {/* Segmented control — frosted pill */}
        <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', display: 'flex', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 10, padding: 3, gap: 1, border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', padding: '6px 16px' }}>Following</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 16px', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.2)' }}>For You</span>
        </div>

        {/* LIVE + search */}
        <div style={{ position: 'absolute', top: 52, right: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', borderRadius: 4, padding: '3px 7px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fe2c55' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 0.4 }}>LIVE</span>
          </div>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        </div>

        <BottomMeta item={item} bottom={122} />

        <div style={{ position: 'absolute', right: 8, bottom: 126, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #fff', background: 'linear-gradient(135deg, #555, #1a1a1a)' }} />
            <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 17, height: 17, borderRadius: '50%', background: '#fe2c55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>+</span>
            </div>
          </div>
          <SideAction label={item.likes}>
            <svg width={30} height={30} viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M34.6 3.1c-3.6 0-6.6 1.8-8.6 4.6-2-2.8-5-4.6-8.6-4.6C8.4 3.1 3 8.6 3 15.3c0 11.7 20.1 22.8 21.4 23.5.4.2.8.3 1.2.3s.8-.1 1.2-.3c1.3-.7 21.4-11.8 21.4-23.5 0-6.7-5.4-12.2-12-12.2z" /></svg>
          </SideAction>
          <SideAction label={item.comments}>
            <svg width={30} height={30} viewBox="0 0 48 48" fill="#fff"><path d="M48 24c0 13.3-10.8 24-24 24-3.6 0-7-.8-10.1-2.2L0 48l2.2-13.9C.8 31 0 27.6 0 24 0 10.8 10.8 0 24 0s24 10.8 24 24z" /></svg>
          </SideAction>
          <SideAction label="Repost">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
          </SideAction>
          <SideAction label="Save">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
          </SideAction>
          <div style={{ width: 38, height: 38, borderRadius: '50%', border: '7px solid rgba(0,0,0,0.75)', background: 'conic-gradient(#fe2c55, #25f4ee, #fe2c55)', animation: 'tiktok-spin 4s linear infinite' }} />
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <TabBar2026 />
        </div>
      </div>
    )
  }

  if (variant === 'ios') {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
        <div style={{ position: 'absolute', inset: 0, background: gradient }} />
        <div style={{ position: 'relative', paddingTop: 52, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Following</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', borderBottom: '2px solid #fff', paddingBottom: 3 }}>For You</span>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ position: 'absolute', right: 16, top: 54 }}>
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
          </svg>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <BottomMeta item={item} />
          <ActionRail item={item} liked={liked} onLike={onLike} compact />
        </div>
        <TabBarIOS />
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      <div style={{ position: 'absolute', inset: 0, background: gradient }} />
      <div style={{ position: 'relative', paddingTop: 54, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Following</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', position: 'relative', paddingBottom: 4 }}>
          For You
          <span style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <BottomMeta item={item} />
        <ActionRail item={item} liked={liked} onLike={onLike} />
      </div>
      <TabBarClassic />
    </div>
  )
}

export function TikTokPhoneFeed({ items, variant = 'classic' }: { items: FeedItem[]; variant?: TikTokVariant }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [scale, setScale] = useState(1)
  const [activeIndex, setActiveIndex] = useState(0)
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set())
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const wheelLock = useRef(false)
  const touchStartY = useRef(0)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / REF_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(items.length - 1, prev + 1))
    setDragOffset(0)
  }, [items.length])

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1))
    setDragOffset(0)
  }, [items.length])

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return
      if (i === activeIndex) {
        video.currentTime = 0
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [activeIndex])

  useEffect(() => {
    const el = feedRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (wheelLock.current) return
      if (Math.abs(e.deltaY) < 12) return
      wheelLock.current = true
      if (e.deltaY > 0) goNext()
      else goPrev()
      window.setTimeout(() => { wheelLock.current = false }, 500)
    }

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      setIsDragging(true)
    }

    const onTouchMove = (e: TouchEvent) => {
      const delta = e.touches[0].clientY - touchStartY.current
      const maxDrag = REF_H * 0.35
      setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, delta)))
    }

    const onTouchEnd = (e: TouchEvent) => {
      setIsDragging(false)
      const delta = e.changedTouches[0].clientY - touchStartY.current
      if (delta < -50) goNext()
      else if (delta > 50) goPrev()
      else setDragOffset(0)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [goNext, goPrev])

  const slideShare = 100 / items.length
  const translateY = `calc(-${activeIndex * slideShare}% + ${dragOffset / scale}px)`
  const isLiked = likedVideos.has(activeIndex)

  const toggleLike = useCallback(() => {
    setLikedVideos((prev) => {
      const next = new Set(prev)
      if (next.has(activeIndex)) next.delete(activeIndex)
      else next.add(activeIndex)
      return next
    })
  }, [activeIndex])

  return (
    <div ref={outerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: '#000' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: REF_W,
          height: REF_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          ref={feedRef}
          style={{
            width: REF_W,
            height: REF_H,
            overflow: 'hidden',
            touchAction: 'none',
            cursor: 'grab',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: `${items.length * 100}%`,
              transform: `translateY(${translateY})`,
              transition: isDragging ? 'none' : 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {items.map((item, i) => (
              <div key={`${item.src}-${i}`} style={{ height: `${slideShare}%`, position: 'relative' }}>
                <video
                  ref={(el) => { videoRefs.current[i] = el }}
                  src={item.src}
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
          <TikTokOverlay
            item={items[activeIndex] ?? items[0]}
            variant={variant}
            liked={isLiked}
            onLike={toggleLike}
          />
        </div>
      </div>
    </div>
  )
}

export type { FeedItem }
