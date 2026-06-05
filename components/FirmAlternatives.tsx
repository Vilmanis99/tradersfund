import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Handshake, Tag, Star } from 'lucide-react'
import type { Firm } from '@/lib/firms'

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Jaccard similarity over two string arrays. */
function overlapScore(a: string[] = [], b: string[] = []) {
  if (!a.length || !b.length) return 0
  const A = new Set(a)
  const B = new Set(b)
  let intersect = 0
  for (const v of A) if (B.has(v)) intersect++
  return intersect / (A.size + B.size - intersect)
}

/**
 * Renders alternatives at the end of a firm review:
 * - Partners (affiliate-enabled firms) bubble to the top with their full CTA
 *   so non-partner-page traffic has a clear conversion path.
 * - The remaining slots are filled by similarity (asset + platform overlap).
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
  const others = allFirms.filter(f => f.name !== current.name)

  // Score every other firm. Partners get a flat boost so they beat any
  // non-partner with even mediocre similarity — they're the conversion path.
  const ranked = others
    .map(f => ({
      firm: f,
      score:
        overlapScore(current.assets, f.assets) * 2 +
        overlapScore(current.platforms, f.platforms) +
        (f.affiliateUrl ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.firm)

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
