import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Handshake, Tag, Star } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import { rankFirmAlternatives } from '@/lib/firmAlternatives'

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Renders alternatives at the end of a firm review:
 * - Alternatives are selected only by asset and platform relevance, with
 *   editorial score and name used as deterministic tie-breakers.
 * - Partnership presentation is applied only after the alternatives are set.
 *
 * Affiliate disclosure: every partner row is marked "Partner" so users see
 * the relationship before they click.
 */
export default function FirmAlternatives({
  current,
  allFirms,
}: {
  current: Firm
  allFirms: Firm[]
}) {
  const ranked = rankFirmAlternatives(current, allFirms)

  if (!ranked.length) return null

  return (
    <section
      aria-label={`Alternatives to ${current.name}`}
      style={{
        marginTop: '2.5rem',
        padding: '1.5rem',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
      }}
    >
      <h2 style={{ fontSize: '1.05rem', color: '#fff', margin: 0, marginBottom: '1rem', fontWeight: 700 }}>
        Not sold on {current.name}? See alternatives
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {ranked.map(firm => {
          const isPartner = Boolean(firm.affiliateUrl)
          return (
            <div
              key={firm.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.9rem 1rem',
                background: 'var(--bg3)',
                border: isPartner ? '1px solid rgba(39,161,123,0.4)' : '1px solid var(--border)',
                borderRadius: 12,
                position: 'relative',
              }}
            >
              <Link href={firm.reviewUrl} style={{ color: 'inherit', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{firm.name}</strong>
                  {isPartner && (
                    <span className="partner-pill">
                      <Handshake size={9} /> Partner
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gold)' }}>
                    <Star size={10} fill="currentColor" /> {firm.score}
                  </span>
                  {firm.profitSplitPct != null && (
                    <span>· {firm.profitSplitPct}% split</span>
                  )}
                  {firm.payoutFrequency && (
                    <span style={{ textTransform: 'capitalize' }}>
                      · {firm.payoutFrequency.replace('-', ' ')}
                    </span>
                  )}
                </div>
                {firm.discountCode && firm.discountPct && (
                  <div style={{ marginTop: 6 }}>
                    <span className="discount-pill">
                      <Tag size={9} /> {firm.discountPct}% off · code {firm.discountCode}
                    </span>
                  </div>
                )}
              </Link>

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {isPartner ? (
                  <Link
                    href={`/go/${firmSlug(firm.name)}?from=alternatives`}
                    prefetch={false}
                    rel="sponsored nofollow noopener"
                    target="_blank"
                    className="btn-primary btn-glow"
                    style={{ fontSize: '0.78rem', padding: '6px 14px', flex: 1, justifyContent: 'center' }}
                  >
                    Visit {firm.name} <ArrowUpRight size={12} />
                  </Link>
                ) : (
                  <Link
                    href={firm.reviewUrl}
                    className="btn-outline"
                    style={{ fontSize: '0.78rem', padding: '6px 14px', flex: 1, justifyContent: 'center' }}
                  >
                    Read review <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
