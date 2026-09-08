import { ImageResponse } from 'next/og'

export const alt = 'Traders Fund Hub: compare prop firm challenge fees, drawdown rules and payout conditions using dated first-party sources.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 70, background: '#0b1418', color: '#f0f6f3', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', color: '#6ee7b7', fontSize: 26, letterSpacing: 3 }}>TRADERS FUND HUB</div>
      <div style={{ display: 'flex', fontSize: 70, lineHeight: 1.12, fontWeight: 700, marginTop: 58, maxWidth: 1000 }}>Compare the programme. Understand the rules.</div>
      <div style={{ display: 'flex', gap: 20, marginTop: 40, fontSize: 26, color: '#bed1c8' }}><span>Fees</span><span>·</span><span>Drawdown</span><span>·</span><span>Payout conditions</span></div>
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 22, color: '#6ee7b7' }}>Dated sources. Clear differences. No universal winner.</div>
    </div>,
    size,
  )
}
