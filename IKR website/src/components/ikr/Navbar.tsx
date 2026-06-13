'use client'

import Link from 'next/link'
import Image from 'next/image'

const navLinks = [
  { label: 'Home',    href: '/' },
  { label: 'Aanpak',  href: '/aanpak' },
  { label: 'Prices',  href: '/pricing' },
  { label: 'Cases',   href: '/cases' },
]

function LightningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}

export function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: 'var(--ikr-cream)' }}
    >
      <div className="max-w-[1440px] mx-auto px-6 h-[80px] flex items-center">
        <div
          className="flex items-center w-full h-[62px] px-5 gap-4"
          style={{ backgroundColor: 'var(--ikr-navy)', borderRadius: '100px' }}
        >
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/images/logo.png"
              alt="IKnowRight"
              width={57}
              height={42}
              style={{ height: '34px', width: 'auto', filter: 'brightness(0) invert(1)' }}
            />
          </Link>

          {/* Nav links */}
          <div className="flex items-center flex-1 gap-0">
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

          {/* Contact */}
          <Link
            href="/contact"
            className="flex items-center gap-2 pl-5 pr-1 h-[46px] rounded-full font-display font-black hover:opacity-85 transition-opacity shrink-0"
            style={{ backgroundColor: 'var(--ikr-cyan)', color: '#fff', letterSpacing: '-0.04em', fontSize: '1rem' }}
          >
            CONTACT
            <span
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--ikr-navy)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 11.5L11.5 2.5M11.5 2.5H5M11.5 2.5V9" stroke="#FFF9F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
