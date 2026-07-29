import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  Clock,
  Database,
  Filter,
  GitCompareArrows,
} from 'lucide-react'
import { getFeatureCounts } from '@/lib/features'
import {
  getAllChallenges,
  getAllFirms,
  isChallengeFresh,
} from '@/lib/firms'
import { breadcrumbSchema, itemListSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import FirmTable from '@/components/FirmTable'
import TiltCard from '@/components/TiltCard'

export const metadata: Metadata = {
  title: 'Compare Prop Firms: Fees, Rules & Payouts (2026)',
  description:
    'Compare prop firms by challenge fee, evaluation type, drawdown, payout timing, trading rules, platform and account size using source-dated product data.',
  alternates: { canonical: '/prop-firms' },
  openGraph: {
    title: 'Compare Prop Firms — Fees, Rules & Payouts',
    description:
      'Search every tracked firm, filter source-dated products, and send any two firms into a direct head-to-head comparison.',
    url: '/prop-firms',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Prop Firms — Fees, Rules & Payouts',
    description:
      'One global directory for source-dated challenge products and direct firm comparisons.',
  },
}

type DirectorySearchParams = Promise<Record<string, string | string[] | undefined>>

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function PropFirmsHubPage({
  searchParams,
}: {
  searchParams: DirectorySearchParams
}) {
  const query = await searchParams
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const freshChallenges = challenges.filter(challenge => isChallengeFresh(challenge))
  const tiles = getFeatureCounts()
  const size = Number(firstParam(query.size))
  const initialFilters = {
    asset: firstParam(query.asset),
    size: Number.isFinite(size) && size > 0 ? size : undefined,
    phase: firstParam(query.phase),
    drawdown: firstParam(query.drawdown),
    news: firstParam(query.news) === 'allowed',
    ea: firstParam(query.ea) === 'allowed',
    overnight: firstParam(query.overnight) === 'allowed',
    weekend: firstParam(query.weekend) === 'allowed',
  }
  const pricedProductCount = freshChallenges.filter(challenge =>
    challenge.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)),
  ).length
  const onDemandFirmCount = new Set(
    freshChallenges
      .filter(challenge => challenge.payoutFrequency === 'on-demand')
      .map(challenge => challenge.firmSlug),
  ).size
  const lastUpdated = freshChallenges
    .map(challenge => challenge.sourceCapturedAt)
    .sort()
    .at(-1)
  const rankedForSchema = [...firms].sort((a, b) => b.score - a.score)
  const itemLd = itemListSchema(rankedForSchema, 'Prop Firm Directory')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Compare Prop Firms' },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />

      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            <AnimatedNumber value={firms.length} duration={900} /> firms ·{' '}
            <AnimatedNumber value={freshChallenges.length} duration={1100} /> sourced products
            {lastUpdated && (
              <>
                {' '}· <Clock size={12} /> updated{' '}
                {new Date(lastUpdated).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </>
            )}
          </div>

          <h1 className="blog-hero-title">
            Compare every prop firm.{' '}
            <span className="gradient-text gradient-text--animated">
              Fees, rules and payouts.
            </span>
          </h1>

          <p className="blog-hero-sub">
            Search the global directory, filter product-level evaluation rules,
            and send any 2 firms into a direct comparison. Missing or stale
            figures stay unverified instead of becoming marketing claims.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '1.4rem' }}>
            <Link href="#global-prop-firm-directory" className="btn-primary btn-glow">
              Open the directory <ArrowRight size={15} />
            </Link>
            <Link href="/prop-firm-challenges" className="btn-outline">
              Compare challenge products
            </Link>
            <Link href="/prop-firm-challenge-changes" className="btn-outline">
              Track challenge changes
            </Link>
            <Link href="/compare" className="btn-outline">
              Head-to-head comparisons
            </Link>
            <Link href="/best-prop-firms-2026" className="btn-outline">
              Editorial ranking
            </Link>
          </div>

          <div style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '1.75rem',
            flexWrap: 'wrap',
          }}>
            {[
              [firms.length, 'firms tracked'],
              [pricedProductCount, 'priced products'],
              [onDemandFirmCount, 'on-demand payout firms'],
              [tiles.length, 'focused rule lists'],
            ].map(([value, label]) => (
              <div key={label as string}>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: label === 'priced products' ? 'var(--accent-light)' : '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <AnimatedNumber value={value as number} />
                </div>
                <div style={{
                  fontSize: '0.69rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--muted)',
                  fontWeight: 700,
                }}>
                  {label as string}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem', paddingBottom: 0 }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      <section
        id="global-prop-firm-directory"
        className="home-section"
        style={{ paddingTop: '2rem' }}
        aria-labelledby="global-directory-heading"
      >
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1.5rem' }}>
          <div className="section-head">
            <div>
              <h2 id="global-directory-heading" className="section-title">
                <Database size={18} style={{ color: 'var(--accent-light)' }} />
                Global prop-firm directory
              </h2>
              <p className="section-sub-text">
                Firm-level reputation plus product-level fees, phases, drawdown and trading rules.
              </p>
            </div>
            <span className="section-sub">
              <GitCompareArrows size={13} /> Select any 2 firms
            </span>
          </div>

          <FirmTable
            firms={firms}
            challenges={freshChallenges}
            initialFilters={initialFilters}
          />
        </div>
      </section>

      <section
        id="focused-rule-lists"
        className="home-section home-section--alt"
        style={{ paddingTop: '2.5rem' }}
      >
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <Filter size={18} style={{ color: 'var(--accent-light)' }} />
                Browse focused rule lists
              </h2>
              <p className="section-sub-text">
                Indexable shortlists for traders who already know the rule they need.
              </p>
            </div>
            <span className="section-sub">Ranked by the same editorial score</span>
          </div>

          <div className="post-grid">
            {tiles.map(({ feature, count }) => (
              <TiltCard key={feature.slug} className="blog-card" max={5}>
                <Link href={`/prop-firms/${feature.slug}`} className="blog-card-link">
                  <div className="blog-card-glow" aria-hidden />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent-light)',
                    }}>
                      Filter
                    </span>
                    <span style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: '#fff',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
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

      <section className="home-section">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 620 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
              Need a direct <span className="gradient-text">winner?</span>
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
              Browse every canonical matchup or select 2 firms in the directory above.
            </p>
            <Link href="/compare" className="btn-primary btn-glow">
              Browse head-to-head verdicts <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
