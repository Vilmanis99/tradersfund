import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Swords } from 'lucide-react'
import {
  findFirmBySlug,
  firmSlug,
  getActiveOverlays,
  getAllCanonicalPairs,
  getCurrentCanonicalPairs,
} from '@/lib/comparisons'
import { freshChallenges } from '@/lib/challengeMatchup'
import { getAllFirms } from '@/lib/firms'
import { breadcrumbSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import ComparisonDirectory from '@/components/ComparisonDirectory'
import type { ComparisonDirectoryRow } from '@/lib/comparisonDirectory'
import TiltCard from '@/components/TiltCard'

function hubEvidence() {
  const allPairs = getCurrentCanonicalPairs()
  const hubFirms = getAllFirms().map(firm => ({ firm, products: freshChallenges(firmSlug(firm.name)) }))
    .filter(entry => entry.products.length)
  const currentProductCount = hubFirms.reduce((total, entry) => total + entry.products.length, 0)
  const description =
    `Compare ${hubFirms.length} prop firms across ${allPairs.length} head-to-head matchups and `
    + `${currentProductCount} fresh products, with source-dated fees, rules, drawdowns and payouts.`
  return { allPairs, hubFirms, currentProductCount, description }
}

/** Truncate at the last whitespace before `max`, so we never cut mid-word. */
function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s
  const slice = s.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice
  return cut.replace(/[.,;:!?\-—]+$/, '') + '…'
}

export function generateMetadata(): Metadata {
  const { allPairs, description } = hubEvidence()
  return {
    title: { absolute: `Prop Firm Comparisons (2026): ${allPairs.length} Matchups` },
    description,
    alternates: { canonical: '/compare' },
    openGraph: {
      title: `Prop Firm Comparisons (2026): ${allPairs.length} Matchups`,
      description,
      url: '/compare',
      type: 'website',
    },
  }
}

function pairEvidence(firmASlug: string, firmBSlug: string) {
  const products = [...freshChallenges(firmASlug), ...freshChallenges(firmBSlug)]
  return {
    productCount: products.length,
    sourceCount: new Set(products.map(product => product.sourceUrl)).size,
    evidenceDate: products.map(product => product.sourceCapturedAt).sort().at(-1) ?? null,
  }
}

function evidenceDateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function CompareHubPage() {
  const { allPairs, hubFirms, currentProductCount } = hubEvidence()
  const pairRows = allPairs.map(pair => ({
    ...pair,
    evidence: pairEvidence(firmSlug(pair.firmA.name), firmSlug(pair.firmB.name)),
  }))
  const pairBySlug = new Map(pairRows.map(pair => [pair.matchup, pair]))

  // Curated matchups first, but only after both aggregate and product claims
  // pass the shared freshness gate used by the detail route.
  const curated = getActiveOverlays()
    .map(overlay => {
      const slug = overlay.matchupSlug
      const [a, b] = slug.split('-vs-')
      const firmA = findFirmBySlug(a)
      const firmB = findFirmBySlug(b)
      const pair = pairBySlug.get(slug)
      if (!firmA || !firmB || !pair) return null
      return { slug, firmA, firmB, overlay, evidence: pair.evidence }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
  const curatedSlugs = curated.map(({ slug }) => slug)

  // All other pairs, score-ranked sum (so prominent firms surface first).
  const restPairs = pairRows
    .filter(p => !curatedSlugs.includes(p.matchup))
    .sort((x, y) => (y.firmA.score + y.firmB.score) - (x.firmA.score + x.firmB.score))
  const directoryRow = (
    pair: (typeof pairRows)[number],
    editorial: boolean,
  ): ComparisonDirectoryRow => ({
    matchup: pair.matchup,
    firmAName: pair.firmA.name,
    firmBName: pair.firmB.name,
    productCount: pair.evidence.productCount,
    sourceCount: pair.evidence.sourceCount,
    evidenceDate: pair.evidence.evidenceDate,
    editorial,
  })
  const directoryRows: ComparisonDirectoryRow[] = [
    ...restPairs.map(pair => directoryRow(pair, false)),
    ...curated.map(({ slug }) => directoryRow(pairBySlug.get(slug)!, true)),
  ]
  const pendingRows = getAllCanonicalPairs()
    .filter(pair => !pairBySlug.has(pair.matchup))
    .map(pair => directoryRow({
      ...pair,
      evidence: pairEvidence(firmSlug(pair.firmA.name), firmSlug(pair.firmB.name)),
    }, false))

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
            <AnimatedNumber value={allPairs.length} duration={1300} /> matchups
            {' '}· <AnimatedNumber value={hubFirms.length} duration={900} /> firms
            {' '}· <AnimatedNumber value={currentProductCount} duration={1100} /> current products
          </div>

          <h1 className="blog-hero-title">
            Prop firm comparisons,{' '}
            <span className="gradient-text gradient-text--animated">product by product.</span>
          </h1>

          <p className="blog-hero-sub">
            Search {allPairs.length} head-to-head matchups across {hubFirms.length} firms.
            Each page exposes the current products, sourced rules, capture dates,
            costs and trade-offs behind the comparison.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="home-shell">
          <AffiliateDisclosure />
          <p className="blog-hero-sub" style={{ fontSize: '0.95rem' }}>
            This directory includes pairs with at least one source-checked product on each side, within our 30-day verification window.
            Missing firms are awaiting evidence checks, not necessarily closed. Existing comparison URLs remain available with their source status.
          </p>
          <nav className="comparison-paths" aria-label="Choose a comparison method">
            <Link href="/prop-firm-challenges">
              Compare current products <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <Link href="/cheapest-prop-firms">
              Compare verified entry costs <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <Link href="/prop-firm-challenge-changes">
              Check recent rule changes <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </nav>
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
              {curated.map(({ slug, firmA, firmB, overlay, evidence }) => (
                <TiltCard key={slug} className="blog-card" max={5}>
                  <Link
                    href={`/compare/${slug}`}
                    className="blog-card-link"
                    data-curated-matchup={slug}
                    data-product-count={evidence.productCount}
                    data-source-count={evidence.sourceCount}
                    data-evidence-date={evidence.evidenceDate ?? undefined}
                  >
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
                      <span className="blog-card-meta comparison-card-evidence">
                        {evidence.productCount} current products · {evidence.sourceCount} first-party pages
                        {evidence.evidenceDate ? (
                          <> · evidence <time dateTime={evidence.evidenceDate}>{evidenceDateLabel(evidence.evidenceDate)}</time></>
                        ) : null}
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
              Search all {allPairs.length}; browse {restPairs.length} additional data-driven comparisons
            </span>
          </div>

          <ComparisonDirectory rows={directoryRows} pendingRows={pendingRows} />
        </div>
      </section>
    </div>
  )
}
