'use client'

import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import { SpeechBubble } from '../SpeechBubble'
import {
  pad,
  RelatedCases,
  TEMPUS,
  TempusCtaCluster,
  TempusVideoThumb,
} from './shared'

type Metric = { value: string; label: string }

const steps: {
  n: string
  kicker: string
  title: string
  body: string
  bg: string
  color: string
  kickerColor: string
  metrics: Metric[]
}[] = [
  {
    n: '01',
    kicker: 'Het probleem',
    title: TEMPUS.story[0]?.title ?? 'De uitdaging',
    body: TEMPUS.story[0]?.body ?? TEMPUS.summary[0],
    bg: ikr.cream,
    color: ikr.navy,
    kickerColor: ikr.cyan,
    metrics: [
      { value: 'Sep ’25', label: 'Start TikTok-kanaal' },
      { value: 'HR', label: 'Geen productpromo — verpleegkundigen aantrekken' },
      { value: 'Gen Z', label: 'Zit op TikTok, niet op vacaturesites' },
    ],
  },
  {
    n: '02',
    kicker: 'Zo hebben we het gefixt',
    title: TEMPUS.story[1]?.title ?? 'Onze aanpak',
    body: TEMPUS.story[1]?.body ?? TEMPUS.summary[1],
    bg: ikr.navy,
    color: '#FEFEFE',
    kickerColor: ikr.cyan,
    metrics: [
      { value: '71', label: "Video's sinds de start" },
      { value: '6×', label: 'Per maand, consistent' },
      { value: '25K', label: 'Likes op de content' },
    ],
  },
  {
    n: '03',
    kicker: 'Zo is het nu',
    title: 'Het resultaat',
    body: TEMPUS.summary[2] ?? TEMPUS.outcomeLine ?? '',
    bg: ikr.cream,
    color: ikr.navy,
    kickerColor: ikr.cyan,
    metrics: [
      { value: '1M+', label: 'Views' },
      { value: '886K', label: 'Bereik' },
      { value: '142K', label: 'Topvideo' },
      { value: '1–2', label: 'Sollicitaties per dag' },
    ],
  },
]

function MetricPanel({ items, dark = false }: { items: Metric[]; dark?: boolean }) {
  const valueColor = dark ? ikr.cyan : ikr.navy
  const labelColor = dark ? 'rgba(254,254,254,0.78)' : ikr.navyText
  const border = dark ? '1px solid rgba(15,193,222,0.35)' : '1px solid rgba(32,23,55,0.12)'
  const bg = dark ? 'rgba(15,193,222,0.06)' : '#FFF9F1'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 12,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            backgroundColor: bg,
            border,
            borderRadius: 20,
            padding: 'clamp(16px, 2.2vw, 28px)',
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              ...displayFont,
              fontSize: 'clamp(1.6rem, 3.4vw, 44px)',
              color: valueColor,
              margin: 0,
              lineHeight: 0.9,
              textTransform: 'uppercase',
            }}
          >
            {item.value}
          </p>
          <p
            style={{
              ...bodyFont,
              fontSize: 'clamp(0.75rem, 1.05vw, 14px)',
              color: labelColor,
              margin: '10px 0 0',
              lineHeight: 1.35,
            }}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}

export function TempusCaseA() {
  return (
    <div style={{ backgroundColor: ikr.cream }}>
      <section style={{ padding: `clamp(5.5rem, 10vw, 120px) ${pad} clamp(1rem, 2vw, 24px)` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <p
            style={{
              ...displayFont,
              fontSize: 14,
              color: ikr.cyan,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Case · {TEMPUS.tags.join(' · ')}
          </p>
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(3rem, 8vw, 112px)',
              lineHeight: 0.85,
              color: ikr.navy,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {TEMPUS.bedrijf}
          </h1>
          {TEMPUS.outcomeLine && (
            <p
              style={{
                ...displayFont,
                fontSize: 'clamp(1rem, 2vw, 28px)',
                color: ikr.cyan,
                textTransform: 'uppercase',
                marginTop: 16,
                maxWidth: 720,
              }}
            >
              {TEMPUS.outcomeLine}
            </p>
          )}
          <p
            style={{
              ...bodyFont,
              fontSize: 'clamp(0.95rem, 1.3vw, 18px)',
              color: ikr.navyText,
              maxWidth: 640,
              marginTop: 20,
            }}
          >
            {TEMPUS.summary[0]}
          </p>
        </div>
      </section>

      {steps.map((step, i) => (
        <section key={step.n} style={{ backgroundColor: step.bg, padding: `clamp(2.5rem, 6vw, 80px) ${pad}` }}>
          <div
            className="tempus-step"
            style={{
              maxWidth: 1440,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
              gap: 'clamp(24px, 4vw, 64px)',
              alignItems: 'center',
            }}
          >
            <div style={{ order: i % 2 === 1 ? 2 : 1 }}>
              <p
                style={{
                  ...displayFont,
                  fontSize: 'clamp(3rem, 7vw, 96px)',
                  lineHeight: 0.8,
                  color: step.kickerColor,
                  margin: 0,
                }}
              >
                {step.n}
              </p>
              <p
                style={{
                  ...displayFont,
                  fontSize: 'clamp(0.85rem, 1.2vw, 16px)',
                  color: step.kickerColor,
                  textTransform: 'uppercase',
                  margin: '16px 0 8px',
                }}
              >
                {step.kicker}
              </p>
              <h2
                style={{
                  ...displayFont,
                  fontSize: 'clamp(1.5rem, 3.2vw, 44px)',
                  color: step.color,
                  textTransform: 'uppercase',
                  margin: '0 0 16px',
                }}
              >
                {step.title}
              </h2>
              <p
                style={{
                  ...bodyFont,
                  fontSize: 'clamp(0.9rem, 1.25vw, 18px)',
                  color: step.color,
                  opacity: 0.9,
                  lineHeight: 1.55,
                  maxWidth: 560,
                  margin: 0,
                }}
              >
                {step.body}
              </p>
              {i === 1 && (
                <div style={{ marginTop: 28 }}>
                  <TempusCtaCluster dark />
                </div>
              )}
            </div>
            <div style={{ order: i % 2 === 1 ? 1 : 2 }}>
              <MetricPanel items={step.metrics} dark={step.bg === ikr.navy} />
            </div>
          </div>
        </section>
      ))}

      <section style={{ backgroundColor: ikr.navy, padding: `clamp(2.5rem, 5vw, 72px) ${pad}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(1.25rem, 2.5vw, 36px)',
              color: '#FEFEFE',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Cijfers @tempusverpleging
          </h2>
          <p
            style={{
              ...bodyFont,
              fontSize: 14,
              color: 'rgba(254,254,254,0.55)',
              margin: '0 0 24px',
            }}
          >
            TikTok · sep 2025 – aug 2026
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: 12,
            }}
          >
            {TEMPUS.results.map((r) => (
              <div
                key={r.label}
                style={{
                  border: '1px solid rgba(15,193,222,0.35)',
                  borderRadius: 20,
                  padding: 'clamp(16px, 2vw, 28px)',
                }}
              >
                <p
                  style={{
                    ...displayFont,
                    fontSize: 'clamp(1.6rem, 3.2vw, 42px)',
                    color: ikr.cyan,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {r.value}
                </p>
                <p
                  style={{
                    ...bodyFont,
                    fontSize: 13,
                    color: '#FEFEFE',
                    textTransform: 'uppercase',
                    margin: '8px 0 0',
                    letterSpacing: '0.04em',
                  }}
                >
                  {r.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: ikr.cream, padding: `clamp(2.5rem, 5vw, 72px) ${pad}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(1.25rem, 2.5vw, 36px)',
              color: ikr.navy,
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            De content
          </h2>
          <div
            className="tempus-video-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            {TEMPUS.videos.map((v) => (
              <TempusVideoThumb key={v.src} src={v.src} stat={v.stat} tiktokUrl={v.tiktokUrl} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: ikr.cream, padding: `0 ${pad} clamp(2.5rem, 5vw, 64px)` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <SpeechBubble tail="left" maxWidth="100%">
            <p style={{ ...bodyFont, fontSize: 'clamp(0.95rem, 1.3vw, 18px)', color: ikr.navyText, margin: '0 0 10px' }}>
              &ldquo;{TEMPUS.testimonial.quote}&rdquo;
            </p>
            <p style={{ ...bodyFont, fontWeight: 700, fontSize: 15, color: ikr.navyText, margin: 0 }}>
              {TEMPUS.testimonial.name} — {TEMPUS.testimonial.role}
            </p>
          </SpeechBubble>
        </div>
      </section>

      <section style={{ backgroundColor: ikr.cream, padding: `0 ${pad} clamp(4rem, 8vw, 100px)` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2
            style={{
              ...displayFont,
              fontSize: 'clamp(1.5rem, 3.5vw, 48px)',
              color: ikr.navy,
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Klaar om dit voor jouw merk te doen?
          </h2>
          <TempusCtaCluster />
          <div style={{ marginTop: 40 }}>
            <RelatedCases />
          </div>
        </div>
      </section>
    </div>
  )
}
