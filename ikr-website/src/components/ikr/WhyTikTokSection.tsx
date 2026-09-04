import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import { tiktokBelgium } from '@/data/ikr-stats'

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function slicePath(cx: number, cy: number, r: number, start: number, pct: number) {
  const end = start + pct * 3.6
  const s = polar(cx, cy, r, start)
  const e = polar(cx, cy, r, end)
  const large = pct > 50 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`
}

function AgePie() {
  const { ageSlices } = tiktokBelgium
  let cursor = 0
  const slices = ageSlices.map((slice) => {
    const path = slicePath(80, 80, 72, cursor, slice.pct)
    const mid = cursor + slice.pct * 1.8
    cursor += slice.pct * 3.6
    const labelPos = polar(80, 80, 46, mid)
    return { ...slice, path, labelPos }
  })

  return (
    <svg viewBox="0 0 160 160" width="100%" role="img" aria-label="Leeftijd van TikTok-gebruikers in België" style={{ display: 'block' }}>
      {slices.map((slice) => (
        <path key={slice.label} d={slice.path} fill={slice.color} />
      ))}
      <circle cx="80" cy="80" r="28" fill={ikr.navy} />
      <text
        x="80"
        y="76"
        textAnchor="middle"
        fill="#FFF9F1"
        fontFamily="var(--font-roboto-condensed), sans-serif"
        fontWeight="900"
        fontSize="16"
      >
        {tiktokBelgium.over35Pct}%
      </text>
      <text
        x="80"
        y="92"
        textAnchor="middle"
        fill="rgba(255,249,241,0.7)"
        fontFamily="var(--font-inter), sans-serif"
        fontSize="8"
      >
        is 35+
      </text>
    </svg>
  )
}

export function WhyTikTokSection() {
  return (
    <section
      style={{
        backgroundColor: ikr.navy,
        padding: 'clamp(2.25rem, 8vw, 100px) clamp(1rem, 6.8vw, 98px)',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <h2
          style={{
            ...displayFont,
            fontSize: 'clamp(2rem, 6vw, 72px)',
            lineHeight: '95%',
            textTransform: 'uppercase',
            color: '#FFF9F1',
            textAlign: 'center',
            marginBottom: 'clamp(1.25rem, 3vw, 32px)',
          }}
        >
          Waarom TikTok?
        </h2>

        <p
          style={{
            ...bodyFont,
            fontSize: 'clamp(0.95rem, 1.6vw, 20px)',
            lineHeight: 1.55,
            color: 'rgba(255,249,241,0.88)',
            textAlign: 'center',
            maxWidth: 720,
            margin: '0 auto clamp(2rem, 5vw, 48px)',
          }}
        >
          Je klanten zitten op TikTok. {tiktokBelgium.adultReachLabel} volwassen Belgen ook. Maar ze zien je
          alleen als de content klopt. Wij doen TikTok omdat we daar het best in zijn, en omdat het de
          kortste weg is naar jouw doelgroep.
        </p>

        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{
            gap: 'clamp(1.5rem, 4vw, 40px)',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255,249,241,0.06)',
              borderRadius: 24,
              padding: 'clamp(1.25rem, 2.5vw, 28px)',
            }}
          >
            <div style={{ width: 'min(100%, 280px)', margin: '0 auto' }}>
              <AgePie />
            </div>
            <ul style={{ listStyle: 'none', margin: '1.25rem 0 0', padding: 0 }}>
              {tiktokBelgium.ageSlices.map((slice) => (
                <li
                  key={slice.label}
                  style={{
                    ...bodyFont,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 'clamp(0.8rem, 1.1vw, 15px)',
                    color: '#FFF9F1',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      backgroundColor: slice.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{slice.label}</span>
                  <span style={{ color: ikr.cyan }}>{slice.pct}%</span>
                </li>
              ))}
            </ul>
            <p
              style={{
                ...bodyFont,
                fontSize: 12,
                color: 'rgba(255,249,241,0.45)',
                marginTop: 12,
              }}
            >
              {tiktokBelgium.sourceAge}
            </p>
          </div>

          <div>
            {[
              {
                num: tiktokBelgium.adultReachLabel,
                label: 'volwassen Belgen zit op TikTok: bijna de helft, geen tiener-app',
              },
              {
                num: `${tiktokBelgium.over35Pct}%`,
                label: 'van de gebruikers is 35 of ouder. Meer 40-plussers dan de meeste merken denken.',
              },
              {
                num: 'Content',
                label: 'is de filter. Zonder scroll-stoppende video’s zie je die mensen niet.',
              },
            ].map(({ num, label }) => (
              <div key={num} style={{ marginBottom: 'clamp(1.25rem, 3vw, 28px)' }}>
                <span
                  style={{
                    ...displayFont,
                    fontSize: 'clamp(2rem, 4.5vw, 48px)',
                    lineHeight: 1,
                    color: ikr.cyan,
                    display: 'block',
                  }}
                >
                  {num}
                </span>
                <span
                  style={{
                    ...bodyFont,
                    fontSize: 'clamp(0.9rem, 1.3vw, 18px)',
                    color: 'rgba(255,249,241,0.8)',
                    display: 'block',
                    marginTop: 8,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
            <p
              style={{
                ...bodyFont,
                fontSize: 12,
                color: 'rgba(255,249,241,0.45)',
              }}
            >
              Bereik: {tiktokBelgium.sourceReach}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
