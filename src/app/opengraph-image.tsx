import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Permisjonsøkonomi-kalkulator – sammenlign 80% vs 100% foreldrepermisjon'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '56px',
            }}
          >
            👶
          </div>
          <div
            style={{
              fontSize: '56px',
            }}
          >
            📊
          </div>
        </div>
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            margin: '0 0 16px 0',
          }}
        >
          Permisjonsøkonomi-kalkulator
        </h1>
        <p
          style={{
            fontSize: '26px',
            color: '#a0aec0',
            textAlign: 'center',
            margin: '0 0 40px 0',
            maxWidth: '800px',
          }}
        >
          Sammenlign 80% vs 100% foreldrepermisjon og finn ut hva som lønner seg for familien
        </p>
        <div
          style={{
            display: 'flex',
            gap: '20px',
          }}
        >
          {['Gratis', 'Privat', 'Norsk'].map((badge) => (
            <div
              key={badge}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '9999px',
                padding: '10px 28px',
                fontSize: '20px',
                color: '#e2e8f0',
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
