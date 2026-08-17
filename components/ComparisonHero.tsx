import Link from 'next/link'
import Image from 'next/image'
import { Star, ExternalLink, ArrowRight } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import { firmSlug } from '@/lib/comparisons'
import type { MatchupFirmSummary } from '@/lib/challengeMatchup'

function formatSplitRange(splits: number[]): string {
  if (!splits.length) return 'Not published'
  if (splits.length === 1) return `${splits[0]}%`
  return `${splits[0]}–${splits.at(-1)}%`
}

/**
 * Two mirrored firm cards side-by-side. Each has logo, score, three fresh
 * product-level facts, and a `.btn-primary` CTA through /go/[firm].
 *
 * This is the one place on the site where two `.btn-primary` CTAs share a
 * fold — justified because the comparison page's entire job is to let the
 * user click into either firm.
 */
export default function ComparisonHero({
  firmA,
  firmB,
  campaign,
  summaryA,
  summaryB,
}: {
  firmA: Firm
  firmB: Firm
  campaign: string
  summaryA?: MatchupFirmSummary
  summaryB?: MatchupFirmSummary
}) {
  return (
    <div className="compare-hero-grid" aria-label="Firm summary">
      <FirmHeroCard firm={firmA} campaign={campaign} summary={summaryA} />
      <div className="compare-hero-vs" aria-hidden="true">vs</div>
      <FirmHeroCard firm={firmB} campaign={campaign} summary={summaryB} />
    </div>
  )
}

function FirmHeroCard({
  firm,
  campaign,
  summary,
}: {
  firm: Firm
  campaign: string
  summary?: MatchupFirmSummary
}) {
  const slug = firmSlug(firm.name)
  return (
    <div
      className="card compare-firm-card"
      data-compare-firm={slug}
      data-product-count={summary?.productCount}
      data-starting-splits={summary ? formatSplitRange(summary.profitSplits) : undefined}
      data-drawdowns={summary?.drawdownTypes.join(' / ')}
    >
      <div className="compare-firm-card-head">
        <div className="feature-firm-logo-tile" style={{ width: 56, height: 56 }}>
          {firm.logo ? (
            <Image
              src={firm.logo}
              alt={`${firm.name} logo`}
              width={40}
              height={40}
              style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
            />
          ) : (
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-light)' }}>
              {firm.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2 }}>
            {firm.name}
          </h2>
          <span className="score-badge" style={{ marginTop: 6, display: 'inline-flex' }}>
            <Star size={11} aria-hidden="true" /> {firm.score}
          </span>
        </div>
      </div>

      <ul className="compare-firm-stats" aria-label={`${firm.name} key terms`}>
        {summary ? (
          <>
            <li>
              <span className="feature-firm-stat-label">Products</span>
              <span className="feature-firm-stat-value">{summary.productCount} fresh</span>
            </li>
            <li>
              <span className="feature-firm-stat-label">Starting splits</span>
              <span className="feature-firm-stat-value">{formatSplitRange(summary.profitSplits)}</span>
            </li>
            <li>
              <span className="feature-firm-stat-label">Drawdowns</span>
              <span className="feature-firm-stat-value">{summary.drawdownTypes.join(' / ')}</span>
            </li>
          </>
        ) : (
          <>
            {firm.profitSplitPct != null && (
              <li>
                <span className="feature-firm-stat-label">Split</span>
                <span className="feature-firm-stat-value">{firm.profitSplitPct}%</span>
              </li>
            )}
            {firm.payoutFrequency && (
              <li>
                <span className="feature-firm-stat-label">Payouts</span>
                <span className="feature-firm-stat-value" style={{ textTransform: 'capitalize' }}>
                  {firm.payoutFrequency.replace('-', ' ')}
                </span>
              </li>
            )}
            {firm.drawdownType && (
              <li>
                <span className="feature-firm-stat-label">Drawdown</span>
                <span className="feature-firm-stat-value" style={{ textTransform: 'capitalize' }}>
                  {firm.drawdownType.replace('-', ' ')}
                </span>
              </li>
            )}
          </>
        )}
      </ul>

      <Link
        href={`/go/${slug}?from=compare-${campaign}`}
        prefetch={false}
        rel={firm.affiliateUrl ? 'sponsored nofollow noopener' : 'nofollow noopener'}
        target="_blank"
        className="btn-primary compare-firm-cta"
      >
        Visit {firm.name} <ExternalLink size={13} aria-hidden="true" />
      </Link>
      <Link href={firm.reviewUrl} className="compare-firm-review-link">
        Read full review <ArrowRight size={12} aria-hidden="true" />
      </Link>
    </div>
  )
}
