import Link from 'next/link'
import { ArrowRight, GitCompareArrows } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import { buildRelatedComparisons } from '@/lib/relatedComparisons'

function formatCaptureDate(value: string | null) {
  if (!value) return 'refresh pending'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function RelatedComparisons({
  firmA,
  firmB,
  allFirms,
}: {
  firmA: Firm
  firmB: Firm
  allFirms: readonly Firm[]
}) {
  const comparisons = buildRelatedComparisons(firmA, firmB, allFirms)
  if (!comparisons.length) return null

  return (
    <section
      aria-label={`Related comparisons for ${firmA.name} and ${firmB.name}`}
      data-related-comparisons="true"
      style={{ marginTop: '3rem' }}
    >
      <div className="section-heading-row" style={{ alignItems: 'end' }}>
        <div>
          <span className="section-kicker">
            <GitCompareArrows size={13} aria-hidden="true" /> Keep comparing
          </span>
          <h2 className="section-title" style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)' }}>
            Compare each firm with close alternatives
          </h2>
          <p className="section-sub" style={{ maxWidth: 720 }}>
            These links are selected by asset and platform overlap, then limited to matchups
            where both sides have current first-party product evidence.
          </p>
        </div>
        <Link href="/compare" className="section-link">
          All comparisons <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <ul
        className="compare-when-grid"
        style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}
      >
        {comparisons.map(comparison => (
          <li
            key={comparison.matchup}
            className="compare-when-card"
            data-related-matchup={comparison.matchup}
            data-related-anchor={comparison.anchorName}
          >
            <span className="bento-tile-eyebrow">More with {comparison.anchorName}</span>
            <h3 style={{ marginTop: '0.55rem' }}>
              <Link href={comparison.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                {comparison.label}
              </Link>
            </h3>
            <p>
              {comparison.productCount} current products · {comparison.sourceCount}{' '}
              first-party source {comparison.sourceCount === 1 ? 'page' : 'pages'} · checked{' '}
              {formatCaptureDate(comparison.latestCapture)}
            </p>
            <Link href={comparison.href} className="section-link">
              Open comparison <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
