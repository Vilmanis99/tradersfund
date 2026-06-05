import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Swords, Star } from 'lucide-react'
import {
  COMPARISON_OVERLAYS,
  findFirmBySlug,
  getAllCanonicalPairs,
} from '@/lib/comparisons'
import { breadcrumbSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import TiltCard from '@/components/TiltCard'

/** Truncate at the last whitespace before `max`, so we never cut mid-word. */
function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s
  const slice = s.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice
  return cut.replace(/[.,;:!?\-—]+$/, '') + '…'
}

export const metadata: Metadata = {
  title: 'Prop Firm Comparisons — Head-to-Head',
  description:
    'Side-by-side comparisons of every major prop firm pair: FTMO vs FundedNext, Topstep vs My Funded Futures, and more. Verdicts, spec tables, and live data.',
  alternates: { canonical: '/compare' },
  openGraph: {
    title: 'Prop Firm Comparisons — Head-to-Head',
    description:
      'Side-by-side comparisons of every major prop firm pair. Verdicts, spec tables, and live data.',
    url: '/compare',
    type: 'website',
  },
}

export default function CompareHubPage() {
  const allPairs = getAllCanonicalPairs()

  // Curated matchups (have editorial overlay) first, in overlay-defined order.
  const curatedSlugs = Object.keys(COMPARISON_OVERLAYS)
  const curated = curatedSlugs
    .map(slug => {
      const [a, b] = slug.split('-vs-')
      const firmA = findFirmBySlug(a)
      const firmB = findFirmBySlug(b)
      if (!firmA || !firmB) return null
      const overlay = COMPARISON_OVERLAYS[slug]
      return { slug, firmA, firmB, overlay }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // All other pairs, score-ranked sum (so prominent firms surface first).
  const restPairs = allPairs
    .filter(p => !curatedSlugs.includes(p.matchup))
    .sort((x, y) => (y.firmA.score + y.firmB.score) - (x.firmA.score + x.firmB.score))

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Compare' },
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
            <span className="hero-eyebrow-dot" />
            <AnimatedNumber value={allPairs.length} duration={1300} /> matchups ·{' '}
            <AnimatedNumber value={curated.length} duration={900} /> editorial verdicts
          </div>

          <h1 className="blog-hero-title">
            Two firms enter,{' '}
            <span className="gradient-text gradient-text--animated">one wins.</span>
          </h1>

          <p className="blog-hero-sub">
            Head-to-head breakdowns of every major prop-firm pair — profit
            splits, payouts, drawdown rules, platforms, and a clear verdict on
            who wins for which trader profile.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      {/* ═══════════════════════════════ CURATED (editorial overlays) ═══════════════════════════════ */}
      {curated.length > 0 && (
        <section className="home-section" style={{ paddingTop: '1rem' }}>
          <div className="home-shell">
            <div className="section-head">
              <h2 className="section-title">
                <Swords size={18} style={{ color: 'var(--accent-light)' }} />
                Featured comparisons
              </h2>
              <span className="section-sub">Hand-picked editorial verdicts</span>
            </div>

            <div className="post-grid">
              {curated.map(({ slug, firmA, firmB, overlay }) => (
                <TiltCard key={slug} className="blog-card" max={5}>
                  <Link href={`/compare/${slug}`} className="blog-card-link">
                    <div className="blog-card-glow" aria-hidden />
                    <div className="blog-card-cats">
                      <span className="cat-pill" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--gold)', borderColor: 'rgba(245,158,11,0.25)' }}>
                        Editorial
                      </span>
                    </div>
                    <h3 className="blog-card-title">
                      {firmA.name} vs {firmB.name}
                    </h3>
                    <p className="blog-card-excerpt">{truncateAtWord(overlay.tlDr, 140)}</p>
                    <div className="blog-card-foot">
                      <span className="blog-card-meta">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Star size={11} fill="currentColor" style={{ color: 'var(--gold)' }} /> {firmA.score}
                        </span>
                        <span style={{ opacity: 0.5 }}>vs</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Star size={11} fill="currentColor" style={{ color: 'var(--gold)' }} /> {firmB.score}
                        </span>
                      </span>
                      <ArrowRight size={14} className="blog-card-arrow" />
                    </div>
                  </Link>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ ALL PAIRS ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '1rem' }}>
        <div className="home-shell">
          <div className="section-head">
            <h2 className="section-title">All matchups</h2>
            <span className="section-sub">
              <AnimatedNumber value={restPairs.length} duration={800} /> data-driven comparisons
            </span>
          </div>

          <div className="feature-hub-grid">
            {restPairs.map(({ matchup, firmA, firmB }) => (
              <Link key={matchup} href={`/compare/${matchup}`} className="feature-hub-tile">
                <div>
                  <div className="feature-hub-tile-label">
                    {firmA.name} vs {firmB.name}
                  </div>
                  <div className="feature-hub-tile-count">
                    ★ {firmA.score} vs ★ {firmB.score}
                  </div>
                </div>
                <div className="feature-hub-tile-cta">
                  Compare <ArrowRight size={14} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
