import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, ExternalLink, Swords } from 'lucide-react'
import {
  buildSpecTable,
  canonicalMatchupSlug,
  findFirmBySlug,
  firmSlug,
  getAllCanonicalPairs,
  getOverlay,
  parseMatchup,
} from '@/lib/comparisons'
import {
  breadcrumbSchema,
  comparisonItemListSchema,
  faqPageSchema,
  jsonLd,
} from '@/lib/schema'
import {
  buildChallengeMatchup,
  describeMatchup,
} from '@/lib/challengeMatchup'
import ChallengeMatchup from '@/components/ChallengeMatchup'
import ComparisonHero from '@/components/ComparisonHero'
import ComparisonTable from '@/components/ComparisonTable'
import ComparisonVerdict from '@/components/ComparisonVerdict'
import FeatureFaq from '@/components/FeatureFaq'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import { TrustpilotPanel } from '@/components/TrustpilotRating'
import RelatedComparisons from '@/components/RelatedComparisons'
import { getAllFirms } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

interface Props { params: Promise<{ matchup: string }> }

function formatCheckedDate(value: string | undefined): string {
  if (!value) return 'source date unavailable'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Emit one static page per canonical (alphabetical) firm pair. */
export async function generateStaticParams() {
  return getAllCanonicalPairs().map(p => ({ matchup: p.matchup }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchup } = await params
  const parsed = parseMatchup(matchup)
  if (!parsed) return {}
  const firmA = findFirmBySlug(parsed.a)
  const firmB = findFirmBySlug(parsed.b)
  if (!firmA || !firmB) return {}

  const canonical = canonicalMatchupSlug(firmSlug(firmA.name), firmSlug(firmB.name))
  const overlay = getOverlay(canonical)
  // Keep the search title focused on the exact comparison query. The more
  // expressive editorial headline still renders as the page H1.
  const title = `${firmA.name} vs ${firmB.name} (2026)`

  // Without an overlay every description was the same sentence with two names
  // swapped in. The product count is read from the challenge files, so each
  // page describes what it actually holds.
  const productTotal = (() => {
    const m = buildChallengeMatchup(
      { name: firmA.name, slug: firmSlug(firmA.name) },
      { name: firmB.name, slug: firmSlug(firmB.name) },
    )
    return m.hasData ? m.a.productCount + m.b.productCount : 0
  })()
  const description =
    overlay?.metaDescription ||
    (productTotal
      ? `${firmA.name} vs ${firmB.name}: compare ${productTotal} challenge products by funded cost, profit split, drawdown and payout rules using first-party data.`
      : `Compare ${firmA.name} and ${firmB.name} side by side: profit split, payouts, drawdown, platforms, rules. Updated for 2026.`)

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/compare/${canonical}`,
      languages: getLanguageAlternates(`/compare/${canonical}`),
    },
    openGraph: { title, description, url: `/compare/${canonical}`, type: 'article' },
  }
}

export default async function ComparePage({ params }: Props) {
  const { matchup } = await params
  const parsed = parseMatchup(matchup)
  if (!parsed) notFound()

  const firmA = findFirmBySlug(parsed.a)
  const firmB = findFirmBySlug(parsed.b)
  if (!firmA || !firmB) notFound()
  const allFirms = getAllFirms()

  // Canonical-redirect: if the requested slug isn't alphabetical, 301 to the
  // canonical version so we never split SEO across two URLs.
  const canonical = canonicalMatchupSlug(firmSlug(firmA.name), firmSlug(firmB.name))
  if (canonical !== matchup) permanentRedirect(`/compare/${canonical}`)

  // After redirect: firmA / firmB are in URL order, which IS canonical here.
  // The data-driven helpers all assume alphabetical (firmA before firmB).
  const overlay = getOverlay(canonical)
  const rows = buildSpecTable(firmA, firmB)

  // Product-level data. The spec table above compares firm aggregates, which
  // flatten every product a firm sells into one row per term — so a firm
  // whose 1-Step and 2-Step disagree on split and drawdown shows only one of
  // them. This section restores the detail from content/data/challenges.
  const challengeMatchup = buildChallengeMatchup(
    { name: firmA.name, slug: firmSlug(firmA.name) },
    { name: firmB.name, slug: firmSlug(firmB.name) },
  )
  const isFtmoFundedNext = canonical === 'ftmo-vs-fundednext'
  const matchupProse = describeMatchup(challengeMatchup)
  const currentProductCount = challengeMatchup.a.productCount + challengeMatchup.b.productCount
  const currentSourceCount = challengeMatchup.sources.length
  const dataDrivenTlDr = challengeMatchup.hasData
    ? matchupProse.slice(0, 2).join(' ')
    : ''
  const fallbackTlDr =
    'Fresh product captures are unavailable for one or both firms, so this page withholds a product winner until both sides pass the 30-day freshness gate. The firm-directory context below is not a substitute for live product terms.'
  const tlDr = overlay?.tlDr || dataDrivenTlDr || fallbackTlDr
  const firmContextRows = rows
    .filter(row => ['Founded', 'Platforms', 'Assets', 'Payout Methods'].includes(row.label))
    .map(row => ({ ...row, winner: null }))
  const aggregateFallbackRows = rows.map(row => ({ ...row, winner: null }))
  const comparisonCheckedAt =
    overlay?.challengeReviewedAt ||
    challengeMatchup.latestCapture ||
    [firmA.lastUpdated, firmB.lastUpdated]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)

  const matchupLabel = `${firmA.name} vs ${firmB.name}`
  // Canonical URL order is stable and neutral. ItemList position must not
  // imply a winner based on flattened firm aggregates.
  const itemLd = comparisonItemListSchema(firmA, firmB, matchupLabel)
  const crumbsLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Compare', url: '/compare' },
    { name: matchupLabel },
  ])
  const faqLd = overlay?.faqs?.length ? faqPageSchema(overlay.faqs) : null

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
      )}

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/compare" className="post-back">
            <ArrowLeft size={14} aria-hidden="true" /> All comparisons
          </Link>

          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            {overlay ? (
              <>
                <Swords size={12} /> Editorial verdict
                {challengeMatchup.hasData ? (
                  <> · {currentProductCount} products · {currentSourceCount} source pages</>
                ) : null}
              </>
            ) : (
              <>
                <span className="hero-eyebrow-dot" />
                {challengeMatchup.hasData
                  ? `Product evidence · ${currentProductCount} products · ${currentSourceCount} source pages`
                  : 'Product evidence refreshing'}
              </>
            )}
          </div>

          <h1 className="blog-hero-title" style={{ maxWidth: '24ch' }}>
            {overlay?.h1 ? (
              overlay.h1
            ) : (
              <>
                {firmA.name}{' '}
                <span className="gradient-text gradient-text--animated">vs</span>{' '}
                {firmB.name}{' '}
                {challengeMatchup.hasData ? (
                  <span>(2026): {challengeMatchup.a.productCount} vs {challengeMatchup.b.productCount} Products</span>
                ) : null}
              </>
            )}
          </h1>

          <p className="blog-hero-sub">
            {challengeMatchup.hasData
              ? `Compare ${currentProductCount} current products across ${currentSourceCount} first-party source ${currentSourceCount === 1 ? 'page' : 'pages'} — funded cost, split, drawdown and payout rules without flattening one product into a firm-wide answer.`
              : `Fresh product evidence for ${firmA.name} and ${firmB.name} is incomplete. Directory context stays visible below, but this page withholds a product winner.`}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════ BODY ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '2.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
          <AffiliateDisclosure />

          <ComparisonHero
            firmA={firmA}
            firmB={firmB}
            campaign={canonical}
            summaryA={challengeMatchup.hasData ? challengeMatchup.a : undefined}
            summaryB={challengeMatchup.hasData ? challengeMatchup.b : undefined}
          />

          <ComparisonVerdict
            firmA={firmA}
            firmB={firmB}
            tlDr={tlDr}
            categoryCalls={overlay?.verdictByCategory}
            title={overlay ? 'Our verdict' : 'Evidence summary'}
            caption={`${overlay ? 'Editorial verdict' : 'Data-driven comparison'} · checked ${formatCheckedDate(comparisonCheckedAt)}`}
          />

          <ChallengeMatchup matchup={challengeMatchup} prose={matchupProse} />

          {challengeMatchup.hasData ? (
            <section aria-label="Firm-level context" data-compare-firm-context>
              <h2 style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '2.5rem 0 0.5rem', letterSpacing: '-0.01em' }}>
                Firm-level context
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                These directory fields describe the firms, not a universal product rule. The sourced product tables above decide the exact fee, split, drawdown and trading conditions.
              </p>
              <ComparisonTable firmA={firmA} firmB={firmB} rows={firmContextRows} />
            </section>
          ) : (
            <section aria-label="Firm-directory fallback" data-compare-aggregate-fallback>
              <h2 style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '2.5rem 0 0.5rem', letterSpacing: '-0.01em' }}>
                Firm-directory fallback
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                No winner is marked because one or both product captures are outside the 30-day freshness gate. Recheck the exact product terms before making a purchase decision.
              </p>
              <ComparisonTable firmA={firmA} firmB={firmB} rows={aggregateFallbackRows} />
            </section>
          )}

          {/* Third-party reputation. Deliberately outside <ComparisonTable>:
              these are cited Trustpilot figures on a 0–5 scale, not specs we
              can declare a winner on, and a suppressed rating needs the full
              warning treatment rather than a cell of text. No JSON-LD is
              emitted for them — see lib/trustpilot.ts. */}
          <section aria-label="Third-party reputation" style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
              Trustpilot: {firmA.name} vs {firmB.name}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
              Scored out of 5 by Trustpilot users, not by us. Where Trustpilot has
              pulled a firm&apos;s aggregate rating we say so rather than leaving a blank.
            </p>
            <div className="compare-when-grid">
              {[firmA, firmB].map(f => (
                <div key={f.name}>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{f.name}</h3>
                  <TrustpilotPanel firm={f} />
                </div>
              ))}
            </div>
          </section>

          {overlay && (overlay.whenToPickA || overlay.whenToPickB) && (
            <section aria-label="When to pick each firm" className="compare-when-grid">
              {overlay.whenToPickA && (
                <div className="compare-when-card">
                  <h3>Pick {firmA.name} if…</h3>
                  <p>{overlay.whenToPickA}</p>
                </div>
              )}
              {overlay.whenToPickB && (
                <div className="compare-when-card">
                  <h3>Pick {firmB.name} if…</h3>
                  <p>{overlay.whenToPickB}</p>
                </div>
              )}
            </section>
          )}

          {overlay?.faqs?.length ? (
            <section aria-label="Frequently asked questions" style={{ marginTop: '3rem' }}>
              <h2 style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
                Frequently asked questions
              </h2>
              <FeatureFaq faqs={overlay.faqs} />
            </section>
          ) : null}

          <RelatedComparisons firmA={firmA} firmB={firmB} allFirms={allFirms} />
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          {isFtmoFundedNext ? (
            <div
              className="cta-final"
              style={{ maxWidth: 720 }}
              data-compare-conversion="ftmo-fundednext-final"
            >
              <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                Choose the product, then <span className="gradient-text">verify the offer</span>
              </h2>
              <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                FTMO prices these captured products in EUR; FundedNext prices them in USD.
                Compare the live checkout totals and your card&apos;s FX cost before paying.
              </p>
              <div className="cta-final-row">
                <Link
                  href="/go/fundednext?from=compare-ftmo-vs-fundednext-final"
                  prefetch={false}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="btn-primary btn-glow"
                  data-affiliate-placement="compare-ftmo-vs-fundednext-final"
                >
                  Check FundedNext offer <ExternalLink size={15} aria-hidden="true" />
                </Link>
                <Link
                  href="/go/ftmo?from=compare-ftmo-vs-fundednext-final"
                  prefetch={false}
                  rel="nofollow noopener"
                  target="_blank"
                  className="btn-outline"
                >
                  Check FTMO terms <ExternalLink size={15} aria-hidden="true" />
                </Link>
                <Link href="/prop-firm-discount-codes" className="btn-outline">
                  Verified offers
                </Link>
              </div>
              <p className="cta-final-foot">
                FundedNext is a partner; FTMO is not. Partnership does not change our verdict.
              </p>
            </div>
          ) : (
            <div className="cta-final" style={{ maxWidth: 640 }}>
              <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                Want to compare a <span className="gradient-text">different pair?</span>
              </h2>
              <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                Every firm pair has a page. Browse the hub or open the full directory.
              </p>
              <div className="cta-final-row">
                <Link href="/compare" className="btn-primary btn-glow">
                  All comparisons <ArrowRight size={16} />
                </Link>
                <Link href="/prop-firms" className="btn-outline">
                  Full firm directory
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
