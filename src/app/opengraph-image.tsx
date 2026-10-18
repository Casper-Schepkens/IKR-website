import { ImageResponse } from 'next/og'

export const alt = 'IKnowRight: dé TikTok agency voor food brands in Vlaanderen'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F0ECCD',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 16,
              height: 16,
              backgroundColor: '#B192EC',
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#201737',
              letterSpacing: '0.18em',
            }}
          >
            IKNOWRIGHT
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: '#201737',
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
            }}
          >
            dé TikTok agency voor food brands in Vlaanderen
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              color: '#201737',
              opacity: 0.72,
            }}
          >
            TikTok-content voor food brands in Vlaanderen.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            fontWeight: 700,
            color: '#B192EC',
          }}
        >
          iknowright.be
        </div>
      </div>
    ),
    { ...size },
  )
}
