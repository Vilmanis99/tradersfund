import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Swords } from 'lucide-react'
import {
  buildSpecTable,
  canonicalMatchupSlug,
  computeFallbackTlDr,
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
import ComparisonHero from '@/components/ComparisonHero'
import ComparisonInfographic from '@/components/ComparisonInfographic'
import ComparisonTable from '@/components/ComparisonTable'
import ComparisonVerdict from '@/components/ComparisonVerdict'
import FeatureFaq from '@/components/FeatureFaq'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import { TrustpilotPanel } from '@/components/TrustpilotRating'

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
  const description =
    overlay?.metaDescription ||
    `Compare ${firmA.name} and ${firmB.name} side by side: profit split, payouts, drawdown, platforms, rules. Updated for 2026.`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/compare/${canonical}` },
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

  // Canonical-redirect: if the requested slug isn't alphabetical, 301 to the
  // canonical version so we never split SEO across two URLs.
  const canonical = canonicalMatchupSlug(firmSlug(firmA.name), firmSlug(firmB.name))
  if (canonical !== matchup) permanentRedirect(`/compare/${canonical}`)

  // After redirect: firmA / firmB are in URL order, which IS canonical here.
  // The data-driven helpers all assume alphabetical (firmA before firmB).
  const overlay = getOverlay(canonical)
  const rows = buildSpecTable(firmA, firmB)
  const tlDr = overlay?.tlDr || computeFallbackTlDr(firmA, firmB, rows)
  const comparisonCheckedAt =
    overlay?.reviewedAt ||
    [firmA.lastUpdated, firmB.lastUpdated]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)

  const matchupLabel = `${firmA.name} vs ${firmB.name}`
  // For ItemList, surface the winner side first when overlay supplies one.
  // If no overlay: data-side leader (more spec wins) goes first; ties keep alphabetical.
  const aWins = rows.filter(r => r.winner === 'a').length
  const bWins = rows.filter(r => r.winner === 'b').length
  const [firstFirm, secondFirm] = bWins > aWins ? [firmB, firmA] : [firmA, firmB]

  const itemLd = comparisonItemListSchema(firstFirm, secondFirm, matchupLabel)
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
              </>
            ) : (
              <>
                <span className="hero-eyebrow-dot" />
                Data-driven · firm specs · live
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
                {firmB.name}
              </>
            )}
          </h1>

          <p className="blog-hero-sub">
            A side-by-side breakdown of {firmA.name} and {firmB.name} — profit
            splits, payout speed, drawdown rules, platforms, and a clear
            verdict on which firm wins for which trader profile.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════ BODY ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '2.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
          <AffiliateDisclosure />

          <ComparisonHero firmA={firmA} firmB={firmB} />

          <ComparisonInfographic firmA={firmA} firmB={firmB} rows={rows} />

          <ComparisonVerdict
            firmA={firmA}
            firmB={firmB}
            tlDr={tlDr}
            categoryCalls={overlay?.verdictByCategory}
            caption={`${overlay ? 'Editorial verdict' : 'Data-driven comparison'} · checked ${formatCheckedDate(comparisonCheckedAt)}`}
          />

          <section aria-label="Side-by-side specifications">
            <h2 style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
              Side-by-side: {firmA.name} vs {firmB.name}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
              Winning value on each row is marked. Ties are flagged. Empty cells mean we don&apos;t have that data point yet.
            </p>
            <ComparisonTable firmA={firmA} firmB={firmB} rows={rows} />
          </section>

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
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
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
        </div>
      </section>
    </div>
  )
}
