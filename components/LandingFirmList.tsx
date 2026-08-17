import Link from 'next/link'
import Image from 'next/image'
import { Star, Handshake, Tag, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react'
import type { LandingFirm } from '@/lib/landings'
import TrustpilotRating from '@/components/TrustpilotRating'

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
        <Link href="/prop-firms" style={{ color: 'var(--accent-light)' }}>
          Browse all firms →
        </Link>
      </p>
    )
  }

  const renderList = (items: LandingFirm[]) => (
    <ol className="leaderboard" style={{ counterReset: 'rank' }}>
      {items.map((item, i) => {
        const { firm, highlight, note } = item
        const slug = firmSlug(firm.name)
        const isPartner = Boolean(firm.affiliateUrl)
        return (
          <li
            key={`${item.groupLabel ?? 'all'}:${firm.name}`}
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
              {item.evidence && (
                <a
                  href={item.evidence.url}
                  target="_blank"
                  rel="nofollow noopener"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: '0.45rem',
                    color: 'var(--accent-light)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  {item.evidence.label} · checked {item.evidence.capturedAt}
                  <ExternalLink size={10} aria-hidden="true" />
                </a>
              )}
            </div>
            <div className="leader-stats">
              <div className="leader-stat">
                <div className="leader-stat-label">{item.metricLabel ?? 'Score'}</div>
                <div className="leader-stat-value leader-stat-value--score">
                  {item.metricValue ? (
                    <><ShieldCheck size={12} /> {item.metricValue}</>
                  ) : (
                    <><Star size={12} fill="currentColor" /> {firm.score.toFixed(1)}</>
                  )}
                </div>
              </div>
              {/* Our editorial score sits next to the crowd's — the pairing
                  is the reason readers search "<firm> trustpilot" at all. */}
              <div className="leader-stat">
                <div className="leader-stat-label">Trustpilot</div>
                <div className="leader-stat-value">
                  <TrustpilotRating firm={firm} />
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
                  prefetch={false}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="btn-primary btn-glow leader-cta"
                >
                  View plans <ExternalLink size={12} />
                </Link>
              ) : (
                <Link href={firm.reviewUrl} className="btn-outline leader-cta">
                  Review <ArrowRight size={14} />
                </Link>
              )}
              {isPartner ? (
                <Link href={firm.reviewUrl} className="leader-secondary">
                  Deep dive →
                </Link>
              ) : (
                <Link
                  href={`/go/${slug}?from=${fromParam}`}
                  prefetch={false}
                  rel="nofollow noopener"
                  target="_blank"
                  className="leader-secondary"
                >
                  Official site <ExternalLink size={11} />
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )

  const hasGroups = ranked.some(item => item.groupLabel)
  if (!hasGroups) return renderList(ranked)

  const groups = new Map<string, LandingFirm[]>()
  for (const item of ranked) {
    const label = item.groupLabel ?? 'Other published currencies'
    groups.set(label, [...(groups.get(label) ?? []), item])
  }

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {[...groups.entries()].map(([label, items]) => {
        const headingId = `ranking-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        return (
          <section key={label} aria-labelledby={headingId}>
            <div style={{ marginBottom: '0.85rem' }}>
              <h3
                id={headingId}
                style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}
              >
                {label}
              </h3>
              {items[0].groupDescription && (
                <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.83rem', lineHeight: 1.55 }}>
                  {items[0].groupDescription}
                </p>
              )}
            </div>
            {renderList(items)}
          </section>
        )
      })}
    </div>
  )
}
