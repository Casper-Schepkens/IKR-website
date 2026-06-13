import Link from 'next/link'

const NAV = ['Home', 'Wat we doen', 'Werkwijze', 'Pricing', 'Contact']
const CASES = ['Panos', "O'Tacos", 'Aiki', 'Andere cases']
const LEGAL = ['Privacy Policy', 'Cookie Policy', 'Algemene voorwaarden']

const LINK: React.CSSProperties = {
  fontFamily: 'var(--font-inter)',
  fontWeight: 400,
  fontSize: 'clamp(0.9rem, 1.67vw, 24px)',
  lineHeight: '29px',
  letterSpacing: '-0.04em',
  color: 'var(--ikr-navy-text)',
  textDecoration: 'none',
  display: 'block',
}

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--ikr-navy)',
        borderRadius: 48,
        padding: '4px 12px',
        marginBottom: 'clamp(12px, 1.7vw, 24px)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-roboto-condensed)',
          fontWeight: 900,
          fontSize: 16,
          lineHeight: '19px',
          letterSpacing: '-0.04em',
          color: '#FEFEFE',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
    </div>
  )
}

// tail: 'right' → driehoek onderaan rechts, 'left' → onderaan links
function SpeechBubble({ tail, children }: { tail: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', marginBottom: 'clamp(18px, 2.5vw, 36px)' }}>
      <div style={{
        backgroundColor: '#FEFEFE',
        borderRadius: 20,
        padding: 'clamp(12px, 1.4vw, 20px) clamp(16px, 1.9vw, 28px)',
      }}>
        {children}
      </div>
      {/* Triangular tail */}
      <div style={{
        position: 'absolute',
        bottom: -22,
        ...(tail === 'right' ? { right: '12%' } : { left: '12%' }),
        width: 56,
        height: 24,
        backgroundColor: '#FEFEFE',
        clipPath: tail === 'right'
          ? 'polygon(0% 0%, 100% 0%, 100% 100%)'   // rechts-onder hoek
          : 'polygon(0% 0%, 100% 0%, 0% 100%)',     // links-onder hoek
      }} />
    </div>
  )
}

function ContactLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-inter)',
        fontWeight: 700,
        fontSize: 'clamp(0.75rem, 1.39vw, 20px)',
        lineHeight: '100%',
        letterSpacing: '-0.04em',
        color: 'var(--ikr-navy-text)',
        marginBottom: '0.35em',
      }}
    >
      {children}
    </p>
  )
}

function ContactValue({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-inter)',
        fontWeight: 400,
        fontSize: 'clamp(0.75rem, 1.39vw, 20px)',
        lineHeight: '100%',
        letterSpacing: '-0.04em',
        color: 'var(--ikr-navy-text)',
      }}
    >
      {children}
    </p>
  )
}

// Simple SVG social icons
function IconTikTok() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.02a8.18 8.18 0 004.78 1.52V7.1a4.85 4.85 0 01-1.01-.41z" fill="var(--ikr-navy)"/>
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="var(--ikr-navy)" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke="var(--ikr-navy)" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.5" fill="var(--ikr-navy)"/>
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" fill="var(--ikr-navy)"/>
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--ikr-cream)',
        padding: 'clamp(16px, 2.8vw, 40px) clamp(1rem, 3.5vw, 51px) clamp(24px, 4vw, 60px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--ikr-cyan)',
          borderRadius: 30,
          padding: 'clamp(24px, 2.8vw, 40px) clamp(24px, 3.96vw, 57px)',
          maxWidth: 1319,
          margin: '0 auto',
        }}
      >
        {/* Main columns */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(24px, 4.2vw, 60px)',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          {/* Navigatie */}
          <div>
            <ColHeader>Navigatie</ColHeader>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.1vw, 16px)' }}>
              {NAV.map((l) => (
                <li key={l}>
                  <Link href="#" style={LINK}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cases */}
          <div>
            <ColHeader>Cases</ColHeader>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.1vw, 16px)' }}>
              {CASES.map((l) => (
                <li key={l}>
                  <Link href="#" style={LINK}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <ColHeader>Legal</ColHeader>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.1vw, 16px)' }}>
              {LEGAL.map((l) => (
                <li key={l}>
                  <Link href="#" style={LINK}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact (pushed to right) */}
          <div style={{ marginLeft: 'auto', minWidth: 'clamp(240px, 27.8vw, 400px)' }}>
            {/* Email — speech bubble, tail rechts */}
            <SpeechBubble tail="right">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: 'var(--ikr-navy)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                    <rect x="0.5" y="0.5" width="19" height="15" rx="2.5" stroke="#FFF9F1"/>
                    <path d="M1 1l9 8 9-8" stroke="#FFF9F1" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div>
                  <ContactLabel>E-mailadres</ContactLabel>
                  <ContactValue>contact@iknowright.be</ContactValue>
                </div>
              </div>
            </SpeechBubble>

            {/* Phone — speech bubble, tail links */}
            <SpeechBubble tail="left">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
                <div>
                  <ContactLabel>Telefoonnummer</ContactLabel>
                  <ContactValue>0471 57 13 99</ContactValue>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: 'var(--ikr-navy)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="#FFF9F1"/>
                  </svg>
                </div>
              </div>
            </SpeechBubble>

            {/* Socials */}
            <div style={{ marginTop: 'clamp(10px, 1.4vw, 20px)' }}>
              <p
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 700,
                  fontSize: 'clamp(0.75rem, 1.39vw, 20px)',
                  letterSpacing: '-0.04em',
                  color: 'var(--ikr-navy-text)',
                  marginBottom: 'clamp(8px, 1.1vw, 16px)',
                }}
              >
                Bekijk onze socials
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { icon: <IconTikTok />, label: 'TikTok' },
                  { icon: <IconInstagram />, label: 'Instagram' },
                  { icon: <IconFacebook />, label: 'Facebook' },
                ].map(({ icon, label }) => (
                  <Link
                    key={label}
                    href="#"
                    aria-label={label}
                    style={{
                      width: 'clamp(44px, 4.73vw, 68px)',
                      height: 'clamp(42px, 4.54vw, 65px)',
                      borderRadius: '50%',
                      backgroundColor: '#FEFEFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div
          style={{
            marginTop: 'clamp(24px, 3.3vw, 48px)',
            paddingTop: 'clamp(12px, 1.7vw, 24px)',
            borderTop: '1px solid rgba(32,23,55,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="IKR"
            style={{ height: 20, width: 'auto', objectFit: 'contain' }}
          />
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontWeight: 400,
              fontSize: 13,
              lineHeight: '16px',
              letterSpacing: '-0.04em',
              color: 'var(--ikr-navy)',
            }}
          >
            © Copyright, IKnowRight 2026
          </p>
        </div>
      </div>
    </footer>
  )
}
