import Link from 'next/link'
import Image from 'next/image'
import { Star, ExternalLink, ArrowRight } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import { firmSlug } from '@/lib/comparisons'

/**
 * Two mirrored firm cards side-by-side. Each has logo, score, the three
 * highest-impact stats, and a `.btn-primary` CTA through /go/[firm].
 *
 * This is the one place on the site where two `.btn-primary` CTAs share a
 * fold — justified because the comparison page's entire job is to let the
 * user click into either firm.
 */
export default function ComparisonHero({ firmA, firmB }: { firmA: Firm; firmB: Firm }) {
  return (
    <div className="compare-hero-grid" aria-label="Firm summary">
      <FirmHeroCard firm={firmA} />
      <div className="compare-hero-vs" aria-hidden="true">vs</div>
      <FirmHeroCard firm={firmB} />
    </div>
  )
}

function FirmHeroCard({ firm }: { firm: Firm }) {
  const slug = firmSlug(firm.name)
  return (
    <div className="card compare-firm-card">
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
      </ul>

      <Link
        href={`/go/${slug}`}
        rel="sponsored nofollow noopener"
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
