import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Clock,
  Database,
  Flame,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import IndiaCheckoutPlanner from '@/components/IndiaCheckoutPlanner'
import IndiaEvidenceMatrix from '@/components/IndiaEvidenceMatrix'
import IndiaEvidenceSubmissionForm from '@/components/IndiaEvidenceSubmissionForm'
import IndiaFirmMatcher from '@/components/IndiaFirmMatcher'
import IndiaRbiNotice from '@/components/IndiaRbiNotice'
import LandingFirmList from '@/components/LandingFirmList'
import { INDIA_EVIDENCE } from '@/lib/india'
import { buildIndiaMatcherFirms } from '@/lib/indiaMatcher'
import { buildLandingPayload, type Landing } from '@/lib/landings'
import { isContactDeliveryConfigured } from '@/lib/brevo'

export default function LandingPage({ landing }: { landing: Landing }) {
  const { ranked, count, allFirms } = buildLandingPayload(landing)
  const firms = ranked.map(r => r.firm)
  const isIndia = landing.slug === 'best-prop-firms-in-india'
  const isUs = landing.slug === 'best-prop-firms-in-us'
  const indiaMatcherFirms = isIndia
    ? buildIndiaMatcherFirms(firms)
    : []
  const indiaProducts = indiaMatcherFirms.flatMap(firm => firm.products)
  const indiaChangeCount = new Set(
    indiaProducts.flatMap(product => product.changeSignals.map(signal => signal.id)),
  ).size
  const indiaEntryFloor = (['USD', 'EUR'] as const).flatMap(currency => {
    const prices = indiaProducts
      .map(product => product.entryPrice)
      .filter(price => price?.currency === currency)
      .map(price => price!.amount)
    if (!prices.length) return []
    const amount = Math.min(...prices).toLocaleString('en-US', { maximumFractionDigits: 2 })
    return [currency === 'USD' ? `$${amount}` : `€${amount}`]
  }).join(' / ')

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: landing.h1 },
  ])
  const itemList = firms.length
    ? itemListSchema(firms, landing.h1)
    : null
  const faq = landing.decisionGuide?.length
    ? faqPageSchema(landing.decisionGuide.map(item => ({ q: item.title, a: item.body })))
    : null

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {itemList && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      )}
      {faq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />
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

          {isIndia && (
            <>
              <div
                className="challenge-change-stat-grid"
                style={{ marginTop: '1.5rem' }}
                aria-label="Current India screening snapshot"
              >
                <article className="post-sidebar-card challenge-change-stat">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <strong>{`${count}/${allFirms.length}`}</strong>
                  <span>tracked firms pass every India publication gate</span>
                </article>
                <article className="post-sidebar-card challenge-change-stat">
                  <Database size={16} aria-hidden="true" />
                  <strong>{indiaProducts.length}</strong>
                  <span>fresh India-eligible products with first-party sources</span>
                </article>
                <article className="post-sidebar-card challenge-change-stat">
                  <WalletCards size={16} aria-hidden="true" />
                  <strong>{indiaEntryFloor || 'Source needed'}</strong>
                  <span>lowest published entry, keeping USD and EUR separate</span>
                </article>
                <article className="post-sidebar-card challenge-change-stat">
                  <BellRing size={16} aria-hidden="true" />
                  <strong>{indiaChangeCount}</strong>
                  <span>current verified changes and open source watches</span>
                </article>
              </div>
              <div className="challenge-change-hero-actions">
                <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-primary btn-glow">
                  Compare {indiaProducts.length} products <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="#india-matcher-heading" className="btn-outline">
                  Find my rules fit
                </Link>
                <Link href="/best-prop-firms-in-india/challenge-changes" className="btn-outline">
                  Check {indiaChangeCount} live notes
                </Link>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.76rem', lineHeight: 1.55, margin: '0.85rem 0 0' }}>
                Ranking order uses India evidence completeness first and editorial score second.
                Affiliate status and coupon size add 0 points.{' '}
                <Link href="#india-evidence-heading" style={{ color: 'var(--accent-light)' }}>
                  Inspect every source and open gap.
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      {isUs && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div
              className="post-sidebar-card"
              style={{ borderLeft: '3px solid var(--gold)', padding: '1.15rem 1.3rem' }}
            >
              <strong style={{ color: '#fff' }}>U.S. access is not a regulatory badge.</strong>{' '}
              <span style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                Each ranked firm has a dated first-party access source, but the CFTC says
                registration and disciplinary history should be checked separately in NFA BASIC.{' '}
                <a
                  href="https://www.cftc.gov/check"
                  target="_blank"
                  rel="nofollow noopener"
                  style={{ color: 'var(--accent-light)', fontWeight: 700 }}
                >
                  Open the CFTC registration checklist.
                </a>
              </span>
            </div>
          </div>
        </section>
      )}

      {isIndia && (
        <IndiaRbiNotice evidence={INDIA_EVIDENCE} />
      )}

      {isIndia && (
        <section className="home-section" style={{ paddingTop: '0.5rem', paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '0.85rem',
            }}>
              <Link
                href="/best-prop-firms-in-india/challenge-comparison"
                className="post-sidebar-card"
                style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
              >
                <span className="bento-tile-eyebrow">India challenge comparison</span>
                <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                  Filter every sourced product rule
                </strong>
                <span style={{
                  display: 'block',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  marginTop: '0.35rem',
                }}>
                  Compare steps, targets, loss limits, drawdown, timing and trading rules after the RBI screen.
                </span>
              </Link>
              <Link
                href="/best-prop-firms-in-india/challenge-changes"
                className="post-sidebar-card"
                style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
              >
                <span className="bento-tile-eyebrow">India challenge changes</span>
                <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                  Follow material rule and price updates
                </strong>
                <span style={{
                  display: 'block',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  marginTop: '0.35rem',
                }}>
                  Verified changes and open watches affecting exact products that still pass the India gate.
                </span>
              </Link>
              <Link
                href="/best-prop-firms-in-india/payout-methods"
                className="post-sidebar-card"
                style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
              >
                <span className="bento-tile-eyebrow">India payout guide</span>
                <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                  Compare Bank, Wise, Rise and Crypto
                </strong>
                <span style={{
                  display: 'block',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  marginTop: '0.35rem',
                }}>
                  Published rails, fee disclosures and the Indian verification gap for every screened firm.
                </span>
              </Link>
              <Link
                href="/best-prop-firms-in-india/compare"
                className="post-sidebar-card"
                style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
              >
                <span className="bento-tile-eyebrow">India matchup library</span>
                <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                  Start with the decision, then choose the pair
                </strong>
                <span style={{
                  display: 'block',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  marginTop: '0.35rem',
                }}>
                  Browse curated comparisons built around India eligibility, KYC, payout and exact product evidence.
                </span>
              </Link>
              <Link
                href="/blog/are-prop-firms-legal-in-india"
                className="post-sidebar-card"
                style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
              >
                <span className="bento-tile-eyebrow">RBI &amp; FEMA guide</span>
                <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                  Check the legal and remittance questions
                </strong>
                <span style={{
                  display: 'block',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  marginTop: '0.35rem',
                }}>
                  Alert List status, LRS margin restrictions, contract checks and tax-record guidance.
                </span>
              </Link>
              <Link
                href="/blog/prop-firm-payout-tax-india"
                className="post-sidebar-card"
                style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
              >
                <span className="bento-tile-eyebrow">India tax-record guide</span>
                <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                  Reconcile every payout before filing
                </strong>
                <span style={{
                  display: 'block',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  marginTop: '0.35rem',
                }}>
                  Official ITR boundaries, foreign-schedule questions and a free 24-column payout ledger.
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ RANKED LIST ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '1rem' }}>
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2
                id={isIndia ? 'india-ranked-firms-heading' : undefined}
                className="section-title"
              >
                <Flame size={18} style={{ color: 'var(--accent-light)' }} />
                Ranked &amp; source-checked
              </h2>
              <p className="section-sub-text">
                Partners marked. Numbers come from dated first-party captures under{' '}
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

      {isIndia && (
        <IndiaFirmMatcher firms={indiaMatcherFirms} />
      )}

      {isIndia && (
        <IndiaCheckoutPlanner firms={indiaMatcherFirms} />
      )}

      {isIndia && (
        <IndiaEvidenceMatrix evidence={INDIA_EVIDENCE} firms={allFirms} />
      )}

      {isIndia && isContactDeliveryConfigured() && (
        <IndiaEvidenceSubmissionForm
          firms={INDIA_EVIDENCE.map(entry => ({ slug: entry.firmSlug, name: entry.firmName }))}
        />
      )}

      {landing.decisionGuide && landing.decisionGuide.length > 0 && (
        <section className="home-section">
          <div className="home-shell" style={{ maxWidth: 900 }}>
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  {isUs ? 'What U.S. traders should verify' : 'What Indian traders should verify'}
                </h2>
                <p className="section-sub-text">
                  {isUs
                    ? 'Four access, contract and payout checks to complete before paying.'
                    : 'Four checks to complete before paying for any evaluation.'}
                </p>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}>
              {landing.decisionGuide.map(item => (
                <article key={item.title} className="post-sidebar-card" style={{ padding: '1.35rem' }}>
                  <h3 style={{
                    color: '#fff',
                    fontSize: '1rem',
                    lineHeight: 1.35,
                    margin: '0 0 0.65rem',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    margin: 0,
                  }}>
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

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
            {isIndia ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Move from a screened firm to the exact product
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Compare current rules, verify the payout route, then recheck any live change before paying.
                </p>
                <div className="cta-final-row">
                  <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-primary btn-glow">
                    Compare India products <ArrowRight size={16} />
                  </Link>
                  <Link href="/best-prop-firms-in-india/payout-methods" className="btn-outline">
                    Check payout rails
                  </Link>
                  <Link href="/best-prop-firms-in-india/challenge-changes" className="btn-outline">
                    Review live changes
                  </Link>
                </div>
              </>
            ) : isUs ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Choose the product, not a U.S. badge
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Compare current rules first, then recheck the firm’s U.S. policy and your exact checkout configuration.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges" className="btn-primary btn-glow">
                    Compare current products <ArrowRight size={16} />
                  </Link>
                  <Link href="/best-futures-prop-firms" className="btn-outline">
                    Compare futures firms
                  </Link>
                  <Link href="/blog/fundednext-review" className="btn-outline">
                    Check FundedNext CFD
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Need a different cut of the data?
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Filter every firm in the full directory by asset, platform, profit split, and payout speed.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firms" className="btn-primary btn-glow">
                    Open the comparison table <ArrowRight size={16} />
                  </Link>
                  <Link href="/prop-firms" className="btn-outline">
                    Browse by rule
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
