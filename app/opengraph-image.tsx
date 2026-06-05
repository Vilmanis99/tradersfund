import { ImageResponse } from 'next/og'

export const alt = 'Traders Fund Hub — Best Prop Firm Reviews & Comparisons'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'linear-gradient(135deg, #0f0f12 0%, #131318 50%, #0f0f12 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #27a17b, #2dd4bf)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 900,
              color: '#ffffff',
            }}
          >
            ↗
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            Traders Fund Hub
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 1040,
              color: '#ffffff',
            }}
          >
            Find the best prop firm for your trading style.
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#94a3b8', maxWidth: 1040 }}>
            In-depth reviews, honest comparisons, and trading education.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#64748b',
            fontSize: 20,
          }}
        >
          <div>tradersfundhub.com</div>
          <div>Reviews · Guides · Comparisons</div>
        </div>
      </div>
    ),
    size
  )
}
