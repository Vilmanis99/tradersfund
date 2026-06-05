import Link from 'next/link'
import Image from 'next/image'
import { Star, ExternalLink, ArrowRight } from 'lucide-react'
import type { Firm } from '@/lib/firms'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Renders a list of firms as horizontal row-cards. Server component — no
 * client state. The URL itself is the filter, so users get a pre-narrowed
 * list and the page is fully SEO-indexable.
 *
 * Visual contract:
 *   • Card shell matches `.card` (bg2, border, radius 18, hover lift)
 *   • Internal grid: rank | logo | name+stats | score | CTA stack
 *   • Mobile: collapses to stacked, CTA full-width (matches FirmCtaCard)
 */
export default function FeatureFirmList({
  firms,
  featureLabel,
}: {
  firms: Firm[]
  featureLabel: string
}) {
  if (!firms.length) {
    return (
      <p
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--muted)',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 18,
        }}
      >
        No firms match this filter yet. Our directory is growing —{' '}
        <Link href="/main-table" style={{ color: 'var(--accent-light)' }}>
          browse all firms
        </Link>{' '}
        instead.
      </p>
    )
  }

  return (
    <ol
      className="feature-firm-list"
      aria-label={`Prop firms that allow ${featureLabel}, ranked`}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {firms.map((firm, i) => {
        const slug = slugify(firm.name)
        return (
          <li
            key={firm.name}
            className="feature-firm-card card"
            style={{ padding: '1.25rem 1.25rem 1.25rem 1.5rem' }}
          >
            <div className="feature-firm-card-grid">
              <span className="feature-firm-rank" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>

              <div className="feature-firm-logo-tile">
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

              <div className="feature-firm-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.25 }}>
                    {firm.name}
                  </h3>
                  <span className="score-badge">
                    <Star size={11} aria-hidden="true" /> {firm.score}
                  </span>
                </div>

                <ul className="feature-firm-stats" aria-label="Key terms">
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
                  {firm.maxAllocation && (
                    <li>
                      <span className="feature-firm-stat-label">Max</span>
                      <span className="feature-firm-stat-value">{firm.maxAllocation}</span>
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
              </div>

              <div className="feature-firm-actions">
                <Link
                  href={`/go/${slug}`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="btn-primary feature-firm-cta"
                >
                  Visit {firm.name} <ExternalLink size={13} aria-hidden="true" />
                </Link>
                <Link href={firm.reviewUrl} className="feature-firm-secondary">
                  Read review <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
