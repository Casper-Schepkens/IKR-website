'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Aanpak', href: '/aanpak' },
  { label: 'Prijzen', href: '/pricing' },
  { label: 'Cases', href: '/cases' },
]

function LightningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}

/**
 * Minimal musical-note mark + typographic “TikTok” — not an official brand asset.
 * Cream/cyan on navy so it reads “TikTok agency” without competing with the hero wordmark.
 */
function TikTokAgencyMark() {
  return (
    <span
      aria-label="TikTok agency"
      title="TikTok agency"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        paddingLeft: 2,
        opacity: 0.92,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path
          d="M14 3v9.2a3.6 3.6 0 1 1-2.4-3.4V3h2.4z"
          fill="var(--ikr-cyan)"
        />
        <path
          d="M16.2 3c.55 1.85 1.9 3.35 3.8 4.05V9.3c-1.55-.35-2.9-1.1-3.8-2.15V3z"
          fill="#FFF9F1"
          fillOpacity="0.85"
        />
      </svg>
      <span
        className="font-display font-black uppercase"
        style={{
          color: '#FFF9F1',
          fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        TikTok
      </span>
    </span>
  )
}

function ContactArrow() {
  return (
    <span
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: 'var(--ikr-navy)' }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 11.5L11.5 2.5M11.5 2.5H5M11.5 2.5V9" stroke="#FFF9F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100]"
      style={{
        backgroundColor: 'var(--ikr-cream)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        bottom: open ? 0 : undefined,
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-[72px] lg:h-[80px] flex items-center">
        <div
          className="flex items-center w-full h-[54px] lg:h-[62px] px-4 lg:px-5 gap-3 lg:gap-4"
          style={{ backgroundColor: 'var(--ikr-navy)', borderRadius: '100px' }}
        >
          <Link href="/" className="shrink-0 relative z-[1]" onClick={() => setOpen(false)}>
            <Image
              src="/images/logo.png"
              alt="IKnowRight"
              width={57}
              height={42}
              style={{ height: '34px', width: 'auto', filter: 'brightness(0) invert(1)' }}
            />
          </Link>

          <div
            aria-hidden
            style={{
              width: 1,
              height: 22,
              backgroundColor: 'rgba(255,255,255,0.22)',
              flexShrink: 0,
            }}
          />
          <TikTokAgencyMark />

          <div className="hidden lg:flex items-center flex-1 gap-0">
            {navLinks.map((link, i) => (
              <div key={link.label} className="flex items-center">
                {i > 0 && <span className="mx-3"><LightningIcon /></span>}
                <Link
                  href={link.href}
                  className="font-display font-black uppercase hover:opacity-60 transition-opacity whitespace-nowrap"
                  style={{
                    color: '#FFFFFF',
                    fontSize: 'clamp(0.8rem, 2.22vw, 2rem)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {link.label}
                </Link>
              </div>
            ))}
          </div>

          <Link
            href="/contact"
            className="hidden lg:flex items-center gap-2 pl-5 pr-1 h-[46px] rounded-full font-display font-black hover:opacity-85 transition-opacity shrink-0"
            style={{ backgroundColor: 'var(--ikr-cyan)', color: '#fff', letterSpacing: '-0.04em', fontSize: '1rem' }}
          >
            CONTACT
            <ContactArrow />
          </Link>

          <button
            type="button"
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full lg:hidden"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={open ? 'Menu sluiten' : 'Menu openen'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M4 4l10 10M14 4L4 14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
                <path d="M1 1h16M1 7h16M1 13h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="lg:hidden"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(72px + env(safe-area-inset-top, 0px))',
            bottom: 0,
            backgroundColor: 'var(--ikr-cream)',
            overflowY: 'auto',
            padding: '24px 20px calc(40px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-display font-black uppercase py-3"
                style={{
                  color: 'var(--ikr-navy-text)',
                  fontSize: 'clamp(2rem, 10vw, 3.5rem)',
                  letterSpacing: '-0.04em',
                  lineHeight: 0.9,
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex items-center self-start gap-2 pl-5 pr-1 h-[52px] rounded-full font-display font-black"
              style={{ backgroundColor: 'var(--ikr-cyan)', color: '#fff', letterSpacing: '-0.04em', fontSize: '1.1rem' }}
            >
              CONTACT
              <ContactArrow />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
