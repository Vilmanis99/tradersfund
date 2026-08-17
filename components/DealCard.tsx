'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, CalendarClock, ShieldCheck, ArrowUpRight } from 'lucide-react'
import CopyableCodePill from './CopyableCodePill'

/**
 * Plain, serialized shape for one deal row. Deliberately NOT the `Firm` type
 * (that module imports `fs` and must never reach the client bundle) — the
 * server page flattens firm + deal into these primitives and passes them down.
 */
export interface DealCardData {
  firmName: string
  firmSlug: string
  logo: string
  score: number
  reviewUrl: string
  /** True when we have an affiliate link — the outbound click earns. */
  isPartner: boolean
  /** Subset of ['Forex','Futures','Crypto'] for the market filter. */
  markets: string[]
  mechanism: 'checkout-code' | 'link-applied' | 'earned-coupon'
  code?: string
  pct?: number
  /** Human-readable value of the verified offer. */
  amountLabel: string
  scope?: string
  verifiedOn: string
  sourceUrl: string
  sourceLabel: string
  expiresOn?: string
  ctaLabel: string
  note?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Deterministic ISO → "Jun 15, 2026" — no locale/TZ so server and client match. */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

export default function DealCard({ deal }: { deal: DealCardData }) {
  const goHref = `/go/${deal.firmSlug}?from=discount-hub-${deal.mechanism}`
  const mechanismLabel = {
    'checkout-code': 'Checkout code',
    'link-applied': 'Automatic discount',
    'earned-coupon': 'Earned coupon',
  }[deal.mechanism]

  return (
    <article className="deal-card">
      <div className="deal-card-head">
        <div className="deal-card-logo">
          {deal.logo ? (
            <Image
              src={deal.logo}
              alt={`${deal.firmName} logo`}
              width={44}
              height={44}
              style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
            />
          ) : (
            <span className="logo-fallback">{deal.firmName.charAt(0)}</span>
          )}
        </div>
        <div className="deal-card-id">
          <span className="deal-card-name">{deal.firmName}</span>
          <span className="deal-card-score">{deal.score.toFixed(1)} / 10</span>
        </div>
        {deal.isPartner ? (
          <span className="partner-pill" title="We have an affiliate link with this firm">
            <ShieldCheck size={11} aria-hidden="true" /> Partner
          </span>
        ) : (
          <span className="deal-listed-pill" title="No partnership — listed for completeness">Listed</span>
        )}
      </div>

      <div className="deal-card-offer">
        <span className="deal-card-kind">{mechanismLabel}</span>
        <span className="deal-card-amount">{deal.amountLabel}</span>
        {deal.scope && <span className="deal-card-scope">{deal.scope}</span>}
      </div>

      {deal.code && deal.pct != null && (
        <div className="deal-card-pill-row">
          <CopyableCodePill code={deal.code} pct={deal.pct} />
        </div>
      )}

      <div className="deal-card-meta">
        <span className="deal-card-verified">
          <BadgeCheck size={12} aria-hidden="true" /> Checked {fmtDate(deal.verifiedOn)}
        </span>
        <a
          href={deal.sourceUrl}
          target="_blank"
          rel="nofollow noopener"
          className="deal-card-source"
          data-deal-source={deal.firmSlug}
        >
          {deal.sourceLabel} <ArrowUpRight size={11} aria-hidden="true" />
        </a>
        {deal.expiresOn && (
          <span className="deal-card-expires">
            <CalendarClock size={12} aria-hidden="true" /> Ends {fmtDate(deal.expiresOn)}
          </span>
        )}
      </div>

      {deal.note && <p className="deal-card-note">{deal.note}</p>}

      <div className="deal-card-cta-row">
        {deal.isPartner ? (
          <>
            <a
              href={goHref}
              rel="sponsored nofollow noopener"
              target="_blank"
              className="btn-primary deal-card-cta"
              data-affiliate-placement={`discount-hub-${deal.mechanism}`}
            >
              {deal.ctaLabel}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <Link href={deal.reviewUrl} className="deal-card-cta deal-card-cta--ghost">
              Compare rules
            </Link>
          </>
        ) : (
          <Link href={deal.reviewUrl} className="deal-card-cta deal-card-cta--ghost">
            Read our review
          </Link>
        )}
      </div>
    </article>
  )
}
