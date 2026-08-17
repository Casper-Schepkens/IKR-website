'use client'

import Image from 'next/image'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import {
  pad,
  RelatedCases,
  TEMPUS,
  TempusCtaCluster,
  TempusVersionSwitcher,
  TempusVideoThumb,
} from './shared'

export function TempusCaseB() {
  const probleem = TEMPUS.story[0]
  const aanpak = TEMPUS.story[1]

  return (
    <div style={{ backgroundColor: ikr.cream }}>
      <TempusVersionSwitcher active="b" />

      <section
        className="tempus-split"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 42%) minmax(0, 1fr)',
          minHeight: 'calc(100vh - 90px)',
        }}
      >
        <div
          className="tempus-split-panel"
          style={{
            backgroundColor: ikr.navy,
            padding: `clamp(2rem, 5vw, 64px) clamp(1.25rem, 3vw, 48px)`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'sticky',
            top: 0,
            alignSelf: 'start',
            minHeight: 'calc(100vh - 90px)',
          }}
        >
          <p
            style={{
              ...displayFont,
              fontSize: 13,
              color: ikr.cyan,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 16,
            }}
          >
            01 — Het probleem
          </p>
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(2.4rem, 5vw, 72px)',
              lineHeight: 0.88,
              color: '#FEFEFE',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {TEMPUS.bedrijf}
          </h1>
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(1.1rem, 2vw, 28px)',
              color: ikr.cyan,
              textTransform: 'uppercase',
              margin: '20px 0',
            }}
          >
            {probleem?.title}
          </h2>
          <p style={{ ...bodyFont, fontSize: 16, color: 'rgba(254,254,254,0.88)', lineHeight: 1.55, margin: 0 }}>
            {probleem?.body}
          </p>
          <p style={{ ...bodyFont, fontSize: 15, color: 'rgba(254,254,254,0.7)', marginTop: 20, lineHeight: 1.5 }}>
            {TEMPUS.summary[0]}
          </p>
          <div style={{ marginTop: 32 }}>
            <TempusCtaCluster dark />
          </div>
        </div>

        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <Image src={probleem?.image ?? TEMPUS.heroImage} alt="" fill style={{ objectFit: 'cover' }} sizes="60vw" priority />
        </div>
      </section>

      <section style={{ backgroundColor: ikr.cream, padding: `clamp(3rem, 7vw, 96px) ${pad}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <p
            style={{
              ...displayFont,
              fontSize: 13,
              color: ikr.cyan,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 8,
            }}
          >
            02 — Zo hebben we het gefixt
          </p>
          <div
            className="tempus-step"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 'clamp(24px, 4vw, 56px)',
              alignItems: 'end',
            }}
          >
            <div>
              <h2
                style={{
                  ...displayFont,
                  fontSize: 'clamp(1.6rem, 3.5vw, 48px)',
                  color: ikr.navy,
                  textTransform: 'uppercase',
                  margin: '0 0 16px',
                  lineHeight: 0.95,
                }}
              >
                {aanpak?.title}
              </h2>
              <p style={{ ...bodyFont, fontSize: 17, color: ikr.navyText, lineHeight: 1.55, margin: 0 }}>
                {aanpak?.body}
              </p>
              <p style={{ ...bodyFont, fontSize: 16, color: ikr.navyText, lineHeight: 1.55, marginTop: 16 }}>
                {TEMPUS.summary[1]}
              </p>
            </div>
            {aanpak?.image && (
              <div style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: 28, overflow: 'hidden' }}>
                <Image src={aanpak.image} alt="" fill style={{ objectFit: 'cover' }} sizes="45vw" />
              </div>
            )}
          </div>

          <div
            className="tempus-video-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
              marginTop: 40,
            }}
          >
            {TEMPUS.videos.map((v) => (
              <TempusVideoThumb key={v.src} src={v.src} stat={v.stat} tiktokUrl={v.tiktokUrl} />
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          position: 'relative',
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <Image src={TEMPUS.heroImage} alt="" fill style={{ objectFit: 'cover' }} sizes="100vw" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(32,23,55,0.15) 20%, rgba(32,23,55,0.88) 100%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', padding: `clamp(2rem, 5vw, 64px) ${pad}` }}>
          <p
            style={{
              ...displayFont,
              fontSize: 13,
              color: ikr.cyan,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 8,
            }}
          >
            03 — Zo is het nu
          </p>
          <p
            style={{
              ...displayFont,
              fontSize: 'clamp(1.4rem, 3.5vw, 48px)',
              color: '#FEFEFE',
              textTransform: 'uppercase',
              maxWidth: 800,
              margin: '0 0 28px',
              lineHeight: 0.95,
            }}
          >
            {TEMPUS.outcomeLine}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 24,
            }}
          >
            {TEMPUS.results.map((r) => (
              <div
                key={r.label}
                style={{
                  backgroundColor: 'rgba(240,235,224,0.95)',
                  borderRadius: 16,
                  padding: '14px 20px',
                  minWidth: 140,
                }}
              >
                <p style={{ ...displayFont, fontSize: 28, color: ikr.navy, margin: 0, lineHeight: 1 }}>{r.value}</p>
                <p
                  style={{
                    ...bodyFont,
                    fontSize: 12,
                    color: ikr.navyText,
                    textTransform: 'uppercase',
                    margin: '4px 0 0',
                  }}
                >
                  {r.label}
                </p>
              </div>
            ))}
          </div>
          <p
            style={{
              ...bodyFont,
              fontSize: 18,
              color: '#FEFEFE',
              maxWidth: 640,
              fontStyle: 'italic',
              margin: '0 0 28px',
            }}
          >
            &ldquo;{TEMPUS.testimonial.quote}&rdquo;
            <span style={{ display: 'block', marginTop: 8, fontStyle: 'normal', fontWeight: 700, fontSize: 14 }}>
              {TEMPUS.testimonial.name} — {TEMPUS.testimonial.role}
            </span>
          </p>
          <TempusCtaCluster dark />
        </div>
      </section>

      <section style={{ backgroundColor: ikr.cream, padding: `clamp(3rem, 6vw, 80px) ${pad}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(1.25rem, 2.5vw, 36px)',
              color: ikr.navy,
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Meer cases
          </h2>
          <RelatedCases />
        </div>
      </section>
    </div>
  )
}
