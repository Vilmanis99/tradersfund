import { FileCheck2, Trophy } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import type { CategoryCall } from '@/lib/comparisons'

/**
 * Top-of-page verdict band — accent-tinted strip with the TL;DR. If an
 * overlay supplies categoryCalls, also renders a compact category-by-category
 * winner strip below the TL;DR.
 */
export default function ComparisonVerdict({
  firmA,
  firmB,
  tlDr,
  categoryCalls,
  title = 'Our verdict',
  caption,
}: {
  firmA: Firm
  firmB: Firm
  tlDr: string
  categoryCalls?: CategoryCall[]
  title?: string
  /** Small line under the "Our verdict" heading — e.g. "Updated April 2026" */
  caption?: string
}) {
  const Icon = categoryCalls?.length ? Trophy : FileCheck2
  return (
    <section className="compare-verdict" aria-label={title}>
      <div className="compare-verdict-head">
        <div className="compare-verdict-icon" aria-hidden="true">
          <Icon size={20} color="var(--accent-light)" />
        </div>
        <div>
          <h2 className="compare-verdict-title">{title}</h2>
          {caption && <p className="compare-verdict-caption">{caption}</p>}
        </div>
      </div>
      <p className="compare-verdict-tldr">{tlDr}</p>

      {categoryCalls && categoryCalls.length > 0 && (
        <ul className="compare-verdict-calls" aria-label="Category-by-category winners">
          {categoryCalls.map(call => (
            <li key={call.category}>
              <span className="compare-verdict-call-label">{call.category}</span>
              <span className={`compare-verdict-call-winner compare-verdict-call-${call.winner}`}>
                {call.winner === 'tie'
                  ? 'Tie'
                  : call.winner === 'a'
                    ? firmA.name
                    : firmB.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
