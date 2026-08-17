'use client'

import Image from 'next/image'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import { SpeechBubble } from '../SpeechBubble'
import {
  pad,
  RelatedCases,
  TEMPUS,
  CyanBtn,
  GhostBtn,
  TempusVersionSwitcher,
  TempusVideoThumb,
} from './shared'

const chapters = [
  {
    n: '01',
    kicker: 'Probleem',
    title: TEMPUS.story[0]?.title ?? 'De uitdaging',
    body: TEMPUS.story[0]?.body ?? '',
    extra: TEMPUS.summary[0],
    image: TEMPUS.story[0]?.image,
    bg: ikr.cream,
    fg: ikr.navy,
    accent: ikr.navy,
  },
  {
    n: '02',
    kicker: 'Aanpak',
    title: TEMPUS.story[1]?.title ?? 'Onze aanpak',
    body: TEMPUS.story[1]?.body ?? '',
    extra: TEMPUS.summary[1],
    image: TEMPUS.story[1]?.image,
    bg: ikr.navy,
    fg: '#FEFEFE',
    accent: ikr.cyan,
  },
  {
    n: '03',
    kicker: 'Nu',
    title: 'Zo is het nu',
    body: TEMPUS.summary[2] ?? '',
    extra: TEMPUS.outcomeLine,
    image: TEMPUS.heroImage,
    bg: ikr.cyan,
    fg: ikr.navy,
    accent: ikr.navy,
  },
] as const

export function TempusCaseC() {
  return (
    <div style={{ backgroundColor: ikr.cream }}>
      <TempusVersionSwitcher active="c" />

      <section style={{ padding: `clamp(1.5rem, 3vw, 32px) ${pad} 0` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <h1
              style={{
                ...displayFont,
                fontSize: 'clamp(2.5rem, 7vw, 88px)',
                lineHeight: 0.85,
                color: ikr.navy,
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              {TEMPUS.bedrijf}
            </h1>
            <p style={{ ...displayFont, fontSize: 16, color: ikr.navy, textTransform: 'uppercase', marginTop: 12 }}>
              HR-marketing via TikTok — drie hoofdstukken
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CyanBtn href="/contact">Plan een gesprek →</CyanBtn>
            <GhostBtn href="/pricing">Prijzen</GhostBtn>
          </div>
        </div>
      </section>

      <section
        className="tempus-chapters"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          minHeight: '78vh',
          marginTop: 28,
        }}
      >
        {chapters.map((ch) => (
          <article
            key={ch.n}
            style={{
              backgroundColor: ch.bg,
              color: ch.fg,
              padding: 'clamp(24px, 3vw, 40px) clamp(18px, 2.2vw, 32px)',
              display: 'flex',
              flexDirection: 'column',
              borderRight: ch.n !== '03' ? '1px solid rgba(32,23,55,0.12)' : undefined,
            }}
          >
            <p
              style={{
                ...displayFont,
                fontSize: 64,
                lineHeight: 0.8,
                color: ch.accent,
                margin: 0,
                opacity: 0.85,
              }}
            >
              {ch.n}
            </p>
            <p
              style={{
                ...displayFont,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: '16px 0 8px',
              }}
            >
              {ch.kicker}
            </p>
            <h2
              style={{
                ...displayFont,
                fontSize: 'clamp(1.15rem, 1.8vw, 26px)',
                textTransform: 'uppercase',
                margin: '0 0 14px',
                lineHeight: 1.05,
              }}
            >
              {ch.title}
            </h2>
            <p style={{ ...bodyFont, fontSize: 15, lineHeight: 1.5, margin: 0, opacity: 0.92 }}>{ch.body}</p>
            <p style={{ ...bodyFont, fontSize: 14, lineHeight: 1.5, marginTop: 12, opacity: 0.8 }}>{ch.extra}</p>
            {ch.image && (
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '4 / 5',
                  borderRadius: 18,
                  overflow: 'hidden',
                  marginTop: 24,
                  flex: 1,
                  minHeight: 200,
                }}
              >
                <Image src={ch.image} alt="" fill style={{ objectFit: 'cover' }} sizes="33vw" />
              </div>
            )}
          </article>
        ))}
      </section>

      <section style={{ backgroundColor: ikr.navy, padding: `clamp(2.5rem, 5vw, 72px) ${pad}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'end',
              marginBottom: 28,
            }}
          >
            <h2
              style={{
                ...displayFont,
                fontSize: 'clamp(1.3rem, 2.8vw, 40px)',
                color: '#FEFEFE',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Bewijs in cijfers + video
            </h2>
            <GhostBtn href="/cases" dark>
              Andere cases
            </GhostBtn>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 28,
            }}
          >
            {TEMPUS.results.map((r) => (
              <div key={r.label} style={{ backgroundColor: ikr.cyan, borderRadius: 16, padding: 20 }}>
                <p style={{ ...displayFont, fontSize: 'clamp(1.5rem, 2.8vw, 36px)', color: ikr.navy, margin: 0, lineHeight: 1 }}>
                  {r.value}
                </p>
                <p
                  style={{
                    ...bodyFont,
                    fontSize: 12,
                    color: ikr.navy,
                    textTransform: 'uppercase',
                    margin: '6px 0 0',
                    fontWeight: 700,
                  }}
                >
                  {r.label}
                </p>
              </div>
            ))}
          </div>
          <div
            className="tempus-video-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {TEMPUS.videos.map((v) => (
              <TempusVideoThumb key={v.src} src={v.src} stat={v.stat} tiktokUrl={v.tiktokUrl} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: ikr.cream, padding: `clamp(2.5rem, 5vw, 72px) ${pad}` }}>
        <div
          className="tempus-quote-grid"
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 40,
            alignItems: 'center',
          }}
        >
          <SpeechBubble tail="right" maxWidth="100%">
            <p style={{ ...bodyFont, fontSize: 18, color: ikr.navyText, margin: '0 0 10px' }}>
              &ldquo;{TEMPUS.testimonial.quote}&rdquo;
            </p>
            <p style={{ ...bodyFont, fontWeight: 700, fontSize: 15, color: ikr.navyText, margin: 0 }}>
              {TEMPUS.testimonial.name} — {TEMPUS.testimonial.role}
            </p>
          </SpeechBubble>
          <div>
            <h2
              style={{
                ...displayFont,
                fontSize: 'clamp(1.5rem, 3vw, 40px)',
                color: ikr.navy,
                textTransform: 'uppercase',
                margin: '0 0 16px',
              }}
            >
              Zelfde aanpak voor jouw merk?
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <CyanBtn href="/contact">Plan een gesprek →</CyanBtn>
              <GhostBtn href="/pricing">Bekijk prijzen</GhostBtn>
            </div>
            <RelatedCases />
          </div>
        </div>
      </section>
    </div>
  )
}
