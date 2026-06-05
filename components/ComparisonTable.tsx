import { Check } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import type { SpecRow } from '@/lib/comparisons'

/**
 * 3-column comparison table with per-row winner highlighting.
 * - Col 1: spec label
 * - Col 2: firmA value (with optional ✓ if winner)
 * - Col 3: firmB value (with optional ✓ if winner)
 *
 * Winners are highlighted via `var(--accent-light)` + a check icon. Ties
 * render an inline "tie" chip in muted styling. No new accent colors are
 * introduced — the design contract holds.
 */
export default function ComparisonTable({
  firmA,
  firmB,
  rows,
}: {
  firmA: Firm
  firmB: Firm
  rows: SpecRow[]
}) {
  return (
    <div className="compare-table" role="table" aria-label={`${firmA.name} vs ${firmB.name} specs`}>
      <div className="compare-table-head" role="row">
        <div role="columnheader" className="compare-cell compare-cell-label">Spec</div>
        <div role="columnheader" className="compare-cell compare-cell-firm">{firmA.name}</div>
        <div role="columnheader" className="compare-cell compare-cell-firm">{firmB.name}</div>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          role="row"
          className={`compare-table-row${i % 2 === 0 ? ' compare-table-row-alt' : ''}`}
        >
          <div role="cell" className="compare-cell compare-cell-label">{row.label}</div>
          <div
            role="cell"
            data-label={row.label}
            className={`compare-cell compare-cell-value${row.winner === 'a' ? ' compare-cell-winner' : ''}`}
          >
            <span>{row.format ? row.format(row.valueA) : String(row.valueA ?? '—')}</span>
            {row.winner === 'a' && (
              <Check size={14} aria-label="Winner" className="compare-winner-icon" />
            )}
          </div>
          <div
            role="cell"
            data-label={row.label}
            className={`compare-cell compare-cell-value${row.winner === 'b' ? ' compare-cell-winner' : ''}`}
          >
            <span>{row.format ? row.format(row.valueB) : String(row.valueB ?? '—')}</span>
            {row.winner === 'b' && (
              <Check size={14} aria-label="Winner" className="compare-winner-icon" />
            )}
            {row.winner === 'tie' && (
              <span className="compare-tie-chip" aria-label="Tie">tie</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
