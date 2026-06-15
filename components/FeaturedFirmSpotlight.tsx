import Link from 'next/link'
import Image from 'next/image'
import { Star, ExternalLink, Check, Sparkles } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import CopyableCodePill from '@/components/CopyableCodePill'

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Prominent "start here / editor's pick" spotlight for our headline affiliate.
 * Promotes via prominence — featured placement, the discount, a strong CTA —
 * while the score and the score-leaderboard below stay honest. The pitch and
 * bullets are passed in (sourced facts), so the component never invents claims.
 */
export default function FeaturedFirmSpotlight({
  firm,
  eyebrow,
  pitch,
  bullets,
  fromParam,
}: {
  firm: Firm
  eyebrow: string
  pitch: string
  bullets: string[]
  fromParam: string
}) {
  const slug = firmSlug(firm.name)
  const isPartner = Boolean(firm.affiliateUrl)

  return (
    <section className="home-section">
      <div className="home-shell">
        <div className="featured-spotlight">
          <div className="aurora-orb aurora-orb--2 featured-spotlight-orb" aria-hidden />
          <div className="featured-spotlight-inner">
            {/* Left: identity + pitch */}
            <div className="featured-spotlight-main">
              <span className="featured-spotlight-eyebrow">
                <Sparkles size={13} aria-hidden /> {eyebrow}
              </span>

              <div className="featured-spotlight-head">
                <div className="featured-spotlight-logo">
                  {firm.logo ? (
                    <Image src={firm.logo} alt="" width={52} height={52} style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                  ) : (
                    <span className="logo-fallback">{firm.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="featured-spotlight-name">{firm.name}</h2>
                  <span className="featured-spotlight-score">
                    <Star size={13} fill="currentColor" aria-hidden /> {firm.score.toFixed(1)} / 10 editorial score
                  </span>
                </div>
              </div>

              <p className="featured-spotlight-pitch">{pitch}</p>

              <ul className="featured-spotlight-bullets">
                {bullets.map(b => (
                  <li key={b}>
                    <Check size={15} aria-hidden /> <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: offer + CTA */}
            <div className="featured-spotlight-cta">
              {firm.discountCode && firm.discountPct ? (
                <div className="featured-spotlight-offer">
                  <div className="featured-spotlight-offer-amount">{firm.discountPct}% off</div>
                  <div className="featured-spotlight-offer-label">your first challenge</div>
                  <div style={{ marginTop: '0.6rem' }}>
                    <CopyableCodePill code={firm.discountCode} pct={firm.discountPct} />
                  </div>
                </div>
              ) : null}

              {isPartner ? (
                <Link
                  href={`/go/${slug}?from=${fromParam}`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="btn-primary btn-glow featured-spotlight-button"
                >
                  Get funded with {firm.name} <ExternalLink size={14} aria-hidden />
                </Link>
              ) : (
                <Link href={firm.reviewUrl} className="btn-primary btn-glow featured-spotlight-button">
                  Read the review
                </Link>
              )}
              <Link href={firm.reviewUrl} className="featured-spotlight-review">
                Read our full {firm.name} review →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
