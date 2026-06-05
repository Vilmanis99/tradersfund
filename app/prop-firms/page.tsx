import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Filter } from 'lucide-react'
import { getFeatureCounts } from '@/lib/features'
import { breadcrumbSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import TiltCard from '@/components/TiltCard'

export const metadata: Metadata = {
  title: 'Prop Firm Lists — Filter by Feature',
  description:
    'Browse prop firms by feature: EA-allowed, news-trading-allowed, weekend-holding, crypto payouts, static drawdown, and more. Hand-ranked lists for 2026.',
  alternates: { canonical: '/prop-firms' },
  openGraph: {
    title: 'Prop Firm Lists — Filter by Feature',
    description:
      'Browse prop firms by feature: EA-allowed, news trading, weekend holding, crypto payouts, static drawdown.',
    url: '/prop-firms',
    type: 'website',
  },
}

export default function PropFirmsHubPage() {
  const tiles = getFeatureCounts()
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firms' },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <Filter size={12} />
            <AnimatedNumber value={tiles.length} duration={900} /> rule-based filters
          </div>

          <h1 className="blog-hero-title">
            Filter firms by the rule that{' '}
            <span className="gradient-text gradient-text--animated">actually matters.</span>
          </h1>

          <p className="blog-hero-sub">
            Algorithmic trading, news trading, weekend holding, crypto
            payouts, static drawdown — each list ranked by editorial score and
            refreshed against firms&apos; current rules.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      {/* ═══════════════════════════════ FEATURE TILES ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '1rem' }}>
        <div className="home-shell">
          <div className="section-head">
            <h2 className="section-title">All filters</h2>
            <span className="section-sub">Pick a rule, see the ranked firms</span>
          </div>

          <div className="post-grid">
            {tiles.map(({ feature, count }) => (
              <TiltCard key={feature.slug} className="blog-card" max={5}>
                <Link href={`/prop-firms/${feature.slug}`} className="blog-card-link">
                  <div className="blog-card-glow" aria-hidden />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-light)' }}>
                      Filter
                    </span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                      <AnimatedNumber value={count} duration={800} />
                    </span>
                  </div>
                  <h3 className="blog-card-title">{feature.label}</h3>
                  <p className="blog-card-excerpt" style={{ marginTop: 'auto' }}>
                    {count} {count === 1 ? 'firm' : 'firms'} matching this rule
                  </p>
                  <div className="blog-card-foot">
                    <span style={{ color: 'var(--accent-light)', fontSize: '0.82rem', fontWeight: 700 }}>
                      View list
                    </span>
                    <ArrowRight size={14} className="blog-card-arrow" />
                  </div>
                </Link>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 560 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
              Or browse the <span className="gradient-text">full directory.</span>
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
              Every firm side-by-side, with column-level filters.
            </p>
            <Link href="/main-table" className="btn-primary btn-glow">
              Open the comparison table <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
