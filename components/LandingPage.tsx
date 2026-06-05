import Link from 'next/link'
import { ArrowRight, Clock, Flame, ShieldCheck } from 'lucide-react'
import { breadcrumbSchema, itemListSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import LandingFirmList from '@/components/LandingFirmList'
import { buildLandingPayload, type Landing } from '@/lib/landings'

export default function LandingPage({ landing }: { landing: Landing }) {
  const { ranked, count } = buildLandingPayload(landing)
  const firms = ranked.map(r => r.firm)

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: landing.h1 },
  ])
  const itemList = firms.length
    ? itemListSchema(firms, landing.h1)
    : null

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {itemList && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      )}

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            <AnimatedNumber value={count} duration={1000} />
            {' '}firms ranked · updated{' '}
            {new Date(landing.lastReviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          <h1 className="blog-hero-title">{landing.h1}</h1>
          <p className="blog-hero-sub">{landing.intro}</p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      {/* ═══════════════════════════════ RANKED LIST ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '1rem' }}>
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <Flame size={18} style={{ color: 'var(--accent-light)' }} />
                Ranked & verified
              </h2>
              <p className="section-sub-text">
                Partners marked. Numbers pulled live from{' '}
                <Link href="/methodology" style={{ color: 'var(--accent-light)' }}>
                  our methodology
                </Link>
                {' '}— no marketing reprints.
              </p>
            </div>
            <span className="section-sub">
              <Clock size={13} />
              {' '}{new Date(landing.lastReviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <LandingFirmList
            ranked={ranked}
            fromParam={landing.slug}
          />
        </div>
      </section>

      {/* ═══════════════════════════════ METHODOLOGY ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="post-sidebar-card" style={{ maxWidth: 760, margin: '0 auto', padding: '1.75rem' }}>
            <span className="bento-tile-eyebrow">
              <ShieldCheck size={12} /> How we rank
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0.5rem 0 0.75rem' }}>
              What this ranking measures
            </h2>
            <p style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
              {landing.methodology}
            </p>
            <Link
              href="/methodology"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: '1rem', color: 'var(--accent-light)',
                fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none',
              }}
            >
              Read the full scoring rubric <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className="home-section">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 560 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
              Need a different cut of the data?
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
              Filter every firm in the full directory by asset, platform, profit split, and payout speed.
            </p>
            <div className="cta-final-row">
              <Link href="/main-table" className="btn-primary btn-glow">
                Open the comparison table <ArrowRight size={16} />
              </Link>
              <Link href="/prop-firms" className="btn-outline">
                Browse by rule
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
