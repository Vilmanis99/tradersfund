import Link from 'next/link'
import Image from 'next/image'
import { Star, ExternalLink } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import CopyableCodePill from './CopyableCodePill'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Responsive firm CTA card. Renders above firm-review content so the primary
 * affiliate action is always visible on mobile (replaces the legacy inline
 * `.ftmo-flex-container` markup that was display:none on mobile).
 *
 * Drives entirely from firms.json — no hand-coded HTML per firm.
 */
export default function FirmCtaCard({ firm }: { firm: Firm }) {
  const slug = slugify(firm.name)
  const goUrl = `/go/${slug}?from=review-cta`
  const hasAffiliate = Boolean(firm.affiliateUrl)

  return (
    <aside
      aria-label={`${firm.name} summary and call to action`}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '1.25rem',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '1.25rem',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
        {firm.logo ? (
          <Image
            src={firm.logo}
            alt={`${firm.name} logo`}
            width={56}
            height={56}
            style={{ objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border)', flexShrink: 0 }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 56, height: 56, borderRadius: 10,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-light)',
              flexShrink: 0,
            }}
          >
            {firm.name.substring(0, 2).toUpperCase()}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{firm.name}</strong>
            <span className="score-badge" style={{ fontSize: '0.78rem' }}>
              <Star size={11} aria-hidden="true" /> {firm.score}
            </span>
            {firm.discountCode && firm.discountPct && (
              <CopyableCodePill code={firm.discountCode} pct={firm.discountPct} />
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 6, color: 'var(--muted)', fontSize: '0.82rem' }}>
            {firm.profitSplitPct != null && <span><strong style={{ color: '#e2e8f0' }}>{firm.profitSplitPct}%</strong> split</span>}
            {firm.payoutFrequency && <span style={{ textTransform: 'capitalize' }}>{firm.payoutFrequency.replace('-', ' ')} payouts</span>}
            {firm.maxAllocation && <span>Up to {firm.maxAllocation}</span>}
          </div>
        </div>
      </div>

      {hasAffiliate ? (
        <Link
          href={goUrl}
          rel="sponsored nofollow noopener"
          target="_blank"
          className="btn-primary btn-glow"
          style={{ whiteSpace: 'nowrap' }}
        >
          Visit {firm.name} <ExternalLink size={14} aria-hidden="true" />
        </Link>
      ) : (
        <Link
          href={firm.reviewUrl}
          className="btn-outline"
          style={{ whiteSpace: 'nowrap' }}
        >
          Read full review
        </Link>
      )}

      <style>{`
        @media (max-width: 600px) {
          aside[aria-label$="call to action"] {
            grid-template-columns: 1fr !important;
          }
          aside[aria-label$="call to action"] > a {
            justify-self: stretch;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
      {!hasAffiliate && (
        <span hidden data-affiliate-status="pending">
          Affiliate link not configured for {firm.name}; redirecting to review page.
        </span>
      )}
    </aside>
  )
}
