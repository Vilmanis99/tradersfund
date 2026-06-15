import type { Firm } from '@/lib/firms'
import type { SpecRow } from '@/lib/comparisons'

/**
 * Visual summary of a head-to-head: a win-tally scoreboard plus paired metric
 * bars (profit split, editorial score, max allocation). Pure SVG/CSS, server
 * component, data-driven — no decorative imagery, every pixel maps to a number.
 * firmA = accent green, firmB = accent teal (matches the rest of the matchup UI).
 */

const A_COLOR = '#27a17b'
const B_COLOR = '#2dd4bf'

function parseAllocation(v: string | undefined): number {
  if (!v) return 0
  return parseFloat(v.replace(/[^0-9.]/g, '')) || 0
}

function fmtAllocation(v: number): string {
  if (!v) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`
  return `$${(v / 1000).toFixed(0)}K`
}

function MetricBar({
  label,
  aName,
  bName,
  aValue,
  bValue,
  aPct,
  bPct,
  aDisplay,
  bDisplay,
}: {
  label: string
  aName: string
  bName: string
  aValue: number
  bValue: number
  aPct: number
  bPct: number
  aDisplay: string
  bDisplay: string
}) {
  const aWins = aValue > bValue
  const bWins = bValue > aValue
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      {[
        { name: aName, pct: aPct, display: aDisplay, color: A_COLOR, wins: aWins },
        { name: bName, pct: bPct, display: bDisplay, color: B_COLOR, wins: bWins },
      ].map(row => (
        <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: '34%', maxWidth: 150, fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.name}
          </span>
          <span style={{ flex: 1, height: 12, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden', display: 'block' }}>
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.max(3, Math.min(100, row.pct))}%`,
                background: row.color,
                borderRadius: 999,
                opacity: row.wins ? 1 : 0.55,
              }}
            />
          </span>
          <span style={{ width: 64, textAlign: 'right', fontSize: '0.85rem', fontWeight: row.wins ? 800 : 600, color: row.wins ? '#fff' : 'var(--muted)' }}>
            {row.display}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ComparisonInfographic({
  firmA,
  firmB,
  rows,
}: {
  firmA: Firm
  firmB: Firm
  rows: SpecRow[]
}) {
  const aWins = rows.filter(r => r.winner === 'a').length
  const bWins = rows.filter(r => r.winner === 'b').length
  const ties = rows.filter(r => r.winner === 'tie').length
  const total = aWins + bWins + ties || 1

  const allocA = parseAllocation(firmA.maxAllocation)
  const allocB = parseAllocation(firmB.maxAllocation)
  const allocMax = Math.max(allocA, allocB, 1)

  const leader = aWins > bWins ? firmA.name : bWins > aWins ? firmB.name : null

  return (
    <div
      className="compare-infographic"
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 'clamp(1.25rem, 3vw, 2rem)',
        margin: '1.5rem 0',
      }}
      aria-label={`Visual comparison of ${firmA.name} and ${firmB.name}`}
    >
      {/* Scoreboard */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Category scoreboard
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
          {leader
            ? <>
                <strong style={{ color: '#fff' }}>{leader}</strong> leads {Math.max(aWins, bWins)}–{Math.min(aWins, bWins)}
                {ties ? <span style={{ color: 'var(--muted)' }}> · {ties} tied</span> : null}
              </>
            : <>Dead heat · {aWins}–{bWins} with {ties} tied</>}
        </span>
      </div>

      <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', marginBottom: '0.6rem' }} aria-hidden="true">
        <span style={{ width: `${(aWins / total) * 100}%`, background: A_COLOR }} />
        <span style={{ width: `${(ties / total) * 100}%`, background: 'var(--border)' }} />
        <span style={{ width: `${(bWins / total) * 100}%`, background: B_COLOR }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        <span style={{ color: A_COLOR, fontWeight: 700 }}>{firmA.name} · {aWins}</span>
        <span style={{ color: 'var(--muted)' }}>{ties} tied</span>
        <span style={{ color: B_COLOR, fontWeight: 700 }}>{bWins} · {firmB.name}</span>
      </div>

      {/* Metric bars */}
      <MetricBar
        label="Profit split"
        aName={firmA.name} bName={firmB.name}
        aValue={firmA.profitSplitPct ?? 0} bValue={firmB.profitSplitPct ?? 0}
        aPct={firmA.profitSplitPct ?? 0} bPct={firmB.profitSplitPct ?? 0}
        aDisplay={firmA.profitSplitPct != null ? `${firmA.profitSplitPct}%` : '—'}
        bDisplay={firmB.profitSplitPct != null ? `${firmB.profitSplitPct}%` : '—'}
      />
      <MetricBar
        label="Editorial score"
        aName={firmA.name} bName={firmB.name}
        aValue={firmA.score} bValue={firmB.score}
        aPct={firmA.score * 10} bPct={firmB.score * 10}
        aDisplay={`${firmA.score.toFixed(1)}`}
        bDisplay={`${firmB.score.toFixed(1)}`}
      />
      <MetricBar
        label="Max allocation"
        aName={firmA.name} bName={firmB.name}
        aValue={allocA} bValue={allocB}
        aPct={(allocA / allocMax) * 100} bPct={(allocB / allocMax) * 100}
        aDisplay={fmtAllocation(allocA)}
        bDisplay={fmtAllocation(allocB)}
      />
    </div>
  )
}
