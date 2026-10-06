import Link from 'next/link'
import FirmLogo from './FirmLogo'
import { Star, ExternalLink } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import CopyableCodePill from './CopyableCodePill'
import TrustpilotRating from './TrustpilotRating'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Responsive firm CTA card. Renders above firm-review content so the current
 * official or affiliate destination is always visible on mobile (replaces the
 * legacy inline `.ftmo-flex-container` markup that was display:none on mobile).
 *
 * Drives entirely from firms.json — no hand-coded HTML per firm.
 */
export default function FirmCtaCard({ firm, productSpecific = false }: { firm: Firm; productSpecific?: boolean }) {
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
        <FirmLogo name={firm.name} src={firm.logo} size={56} />

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text)', fontSize: '1.05rem' }}>{firm.name}</strong>
            <span className="score-badge" style={{ fontSize: '0.78rem' }}>
              <Star size={11} aria-hidden="true" /> {firm.score} / 10
            </span>
            {firm.discountCode && firm.discountPct && (
              <CopyableCodePill
                code={firm.discountCode}
                pct={firm.discountPct}
                analyticsFirm={slug}
                analyticsPlacement="review-cta-code"
                analyticsOfferType="partner_support"
              />
            )}
            {/* Cited Trustpilot figure, sat beside our own score so the two
                ratings read together above the fold. Unlinked here — the
                verification link lives in the FirmStatPanel further down the
                same page, so this doesn't compete with the affiliate CTA. */}
            <TrustpilotRating firm={firm} label />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 6, color: 'var(--muted)', fontSize: '0.82rem' }}>
            {productSpecific ? <span>Fees, splits and payout gates differ by product. See the captured terms below.</span> : <>
              {firm.profitSplitPct != null && <span><strong style={{ color: 'var(--text)' }}>{firm.profitSplitPct}%</strong> split</span>}
              {firm.payoutFrequency && <span style={{ textTransform: 'capitalize' }}>{firm.payoutFrequency.replace('-', ' ')} payouts</span>}
              {firm.maxAllocation && <span>Up to {firm.maxAllocation}</span>}
            </>}
          </div>
        </div>
      </div>

      <Link
        href={goUrl}
        prefetch={false}
        rel={hasAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}
        target="_blank"
        className={hasAffiliate ? 'btn-primary btn-glow' : 'btn-outline'}
        style={{ whiteSpace: 'nowrap' }}
      >
        {hasAffiliate ? `Visit ${firm.name}` : 'View official plans'}{' '}
        <ExternalLink size={14} aria-hidden="true" />
      </Link>

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
        <span hidden data-outbound-relationship="official">
          This link opens {firm.name}&apos;s official website without affiliate tracking.
        </span>
      )}
    </aside>
  )
}
