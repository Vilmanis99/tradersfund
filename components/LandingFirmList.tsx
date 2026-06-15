import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowUpRight, Handshake, Tag, ExternalLink, ArrowRight } from 'lucide-react'
import type { LandingFirm } from '@/lib/landings'

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

interface Props {
  ranked: LandingFirm[]
  fromParam: string
}

export default function LandingFirmList({ ranked, fromParam }: Props) {
  if (!ranked.length) {
    return (
      <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>
        No firms currently match these criteria.{' '}
        <Link href="/main-table" style={{ color: 'var(--accent-light)' }}>
          Browse all firms →
        </Link>
      </p>
    )
  }

  return (
    <ol className="leaderboard" style={{ counterReset: 'rank' }}>
      {ranked.map((item, i) => {
        const { firm, highlight, note } = item
        const slug = firmSlug(firm.name)
        const isPartner = Boolean(firm.affiliateUrl)
        return (
          <li
            key={firm.name}
            className={`leader-row${isPartner ? ' leader-row--partner' : ''}`}
          >
            <span className="leader-rank">{String(i + 1).padStart(2, '0')}</span>
            <div className="leader-logo">
              {firm.logo ? (
                <Image
                  src={firm.logo}
                  alt=""
                  width={48}
                  height={48}
                  style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <span className="logo-fallback">{firm.name.charAt(0)}</span>
              )}
            </div>
            <div className="leader-body">
              <div className="leader-name">
                {firm.name}
                {isPartner && (
                  <span className="partner-pill" title="We have an affiliate partnership with this firm.">
                    <Handshake size={10} /> Partner
                  </span>
                )}
                {firm.discountCode && firm.discountPct && (
                  <span className="discount-pill" title={`Use code ${firm.discountCode} for ${firm.discountPct}% off.`}>
                    <Tag size={10} /> {firm.discountPct}% off
                  </span>
                )}
              </div>
              <div className="leader-meta">
                <span>{highlight}</span>
                <span className="leader-meta-dot">•</span>
                <span>Max {firm.maxAllocation}</span>
              </div>
              {note && (
                <p
                  style={{
                    margin: '0.4rem 0 0',
                    color: 'var(--muted)',
                    fontSize: '0.85rem',
                    lineHeight: 1.55,
                    maxWidth: '60ch',
                  }}
                >
                  {note}
                </p>
              )}
            </div>
            <div className="leader-stats">
              <div className="leader-stat">
                <div className="leader-stat-label">Score</div>
                <div className="leader-stat-value leader-stat-value--score">
                  <Star size={12} fill="currentColor" /> {firm.score.toFixed(1)}
                </div>
              </div>
              <div className="leader-stat leader-stat--hide-sm">
                <div className="leader-stat-label">Payouts</div>
                <div className="leader-stat-value leader-stat-value--small">
                  {firm.payoutFrequency ?? '—'}
                </div>
              </div>
            </div>
            <div className="leader-actions">
              {isPartner ? (
                <Link
                  href={`/go/${slug}?from=${fromParam}`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="btn-primary btn-glow leader-cta"
                >
                  Get funded <ExternalLink size={12} />
                </Link>
              ) : (
                <Link href={firm.reviewUrl} className="btn-outline leader-cta">
                  Review <ArrowRight size={14} />
                </Link>
              )}
              <Link href={firm.reviewUrl} className="leader-secondary">
                Deep dive →
              </Link>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
