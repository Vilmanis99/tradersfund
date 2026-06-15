import type { Firm } from '@/lib/firms'

/**
 * "At a glance" visual panel for a firm review — breaks up the long-form text
 * with an SVG score ring, a profit-split bar, and a grid of key-fact tiles.
 * Pure SVG/CSS, server component, all values sourced from the Firm record.
 */

function fmtTitle(v: string | null | undefined): string {
  if (!v) return '—'
  return v.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function FirmStatPanel({ firm }: { firm: Firm }) {
  const score = firm.score ?? 0
  const split = firm.profitSplitPct ?? 0

  // SVG ring geometry for the score (out of 10).
  const r = 34
  const circ = 2 * Math.PI * r
  const dash = circ * (score / 10)

  const tiles: Array<{ label: string; value: string }> = [
    { label: 'Profit split', value: split ? `${split}%` : '—' },
    { label: 'Payouts', value: fmtTitle(firm.payoutFrequency) },
    { label: 'Drawdown', value: fmtTitle(firm.drawdownType) },
    { label: 'Max allocation', value: firm.maxAllocation || '—' },
    { label: 'Min trading days', value: firm.minTradingDays != null ? String(firm.minTradingDays) : '—' },
    { label: 'Founded', value: firm.founded || '—' },
  ]

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 'clamp(1.1rem, 3vw, 1.6rem)',
        margin: '1.5rem 0 2rem',
      }}
      aria-label={`${firm.name} at a glance`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        {/* Score ring */}
        <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`Editorial score ${score.toFixed(1)} out of 10`} style={{ flexShrink: 0 }}>
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--bg3)" strokeWidth="8" />
          <circle
            cx="42" cy="42" r={r} fill="none" stroke="#27a17b" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 42 42)"
          />
          <text x="42" y="40" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">{score.toFixed(1)}</text>
          <text x="42" y="56" textAnchor="middle" fontSize="9" fill="var(--muted)">/ 10</text>
        </svg>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            {firm.name} · at a glance
          </div>
          {/* Profit split bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text)', width: 78 }}>Profit split</span>
            <span style={{ flex: 1, height: 12, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden', display: 'block' }}>
              <span style={{ display: 'block', height: '100%', width: `${Math.min(100, split)}%`, background: 'linear-gradient(90deg, #27a17b, #2dd4bf)', borderRadius: 999 }} />
            </span>
            <span style={{ width: 48, textAlign: 'right', fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{split ? `${split}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.7rem 0.85rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>{t.label}</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>{t.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
