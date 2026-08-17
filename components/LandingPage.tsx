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
  const isUk = landing.slug === 'best-prop-firms-in-uk'
  const isUs = landing.slug === 'best-prop-firms-in-us'
  const isSwing = landing.slug === 'best-swing-trading-prop-firms'
  const isFutures = landing.slug === 'best-futures-prop-firms'
  const isInstant = landing.slug === 'best-instant-funding-prop-firms'
  const isCheapest = landing.slug === 'cheapest-prop-firms'
  const isOverall = landing.slug === 'best-prop-firms-2026'
  const isCrypto = landing.slug === 'best-crypto-prop-firms'
  const decisionHeading = isUs
    ? 'What U.S. traders should verify'
    : isUk
      ? 'What UK traders should verify'
      : isSwing
      ? 'What swing traders should verify'
      : isFutures
        ? 'What futures traders should verify'
        : isInstant
          ? 'What instant-funding buyers should verify'
          : isCheapest
            ? 'What price-first buyers should verify'
            : isOverall
              ? 'How to use an overall ranking'
              : isCrypto
                ? 'What crypto traders should verify'
                : 'What Indian traders should verify'
  const decisionSub = isUs
    ? 'Four access, product, contract and payout checks to complete before paying.'
    : isUk
      ? 'Four policy, FCA, currency and product checks before paying.'
      : isSwing
      ? 'Four product-level checks before carrying a position across sessions.'
      : isFutures
        ? 'Four product, billing, account-stage and registration checks before paying.'
        : isInstant
          ? 'Four account-stage, loss-line, cost and payout checks before paying.'
          : isCheapest
            ? 'Four currency, billing and loss-room checks before comparing the lowest number.'
            : isOverall
              ? 'Four checks that turn an editorial shortlist into a product-level decision.'
              : isCrypto
                ? 'Four market, product and risk checks before paying for a crypto trading path.'
                : 'Four checks to complete before paying for any evaluation.'
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
  const rankedGroups = new Map<string, typeof firms>()
  for (const item of ranked) {
    const label = item.groupLabel ?? landing.h1
    rankedGroups.set(label, [...(rankedGroups.get(label) ?? []), item.firm])
  }
  const itemLists = [...rankedGroups.entries()].map(([label, groupedFirms]) =>
    itemListSchema(
      groupedFirms,
      label === landing.h1 ? landing.h1 : `${landing.h1}: ${label}`,
    ),
  )
  const faq = landing.decisionGuide?.length
    ? faqPageSchema(landing.decisionGuide.map(item => ({ q: item.title, a: item.body })))
    : null

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {itemLists.map(itemList => (
        <script
          key={itemList.name}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }}
        />
      ))}
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

      {isOverall && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges',
                  eyebrow: 'Exact products',
                  title: 'Filter every current product',
                  body: 'Move from firm score to phases, fees, targets, loss limits, account stages and trading rules.',
                },
                {
                  href: '/compare/ftmo-vs-fundednext',
                  eyebrow: 'Top-two decision',
                  title: 'Compare FTMO and FundedNext',
                  body: 'Use a product-level matchup after the overall score narrows the first two firms.',
                },
                {
                  href: '/cheapest-prop-firms',
                  eyebrow: 'Cost floor',
                  title: 'Separate USD and EUR prices',
                  body: 'Compare minimum paths by published currency, including known activation and after-pass charges.',
                },
                {
                  href: '/prop-firm-challenge-changes',
                  eyebrow: 'Freshness',
                  title: 'Check what changed after capture',
                  body: 'Review material product updates and unresolved first-party evidence conflicts before checkout.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {isUk && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div
              className="post-sidebar-card"
              style={{ borderLeft: '3px solid var(--gold)', padding: '1.15rem 1.3rem' }}
            >
              <strong style={{ color: '#fff' }}>
                Policy-supported UK access is not an FCA status.
              </strong>{' '}
              <span style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                The FCA says its Firm Checker shows authorisation and permissions, while its
                Warning List records published concerns and is not proof that every absent firm
                is authorised or safe.{' '}
                <a
                  href="https://www.fca.org.uk/consumers/fca-firm-checker"
                  target="_blank"
                  rel="nofollow noopener"
                  style={{ color: 'var(--accent-light)', fontWeight: 700 }}
                >
                  Open the FCA Firm Checker
                </a>{' '}
                and{' '}
                <a
                  href="https://www.fca.org.uk/consumers/warning-list-unauthorised-firms"
                  target="_blank"
                  rel="nofollow noopener"
                  style={{ color: 'var(--accent-light)', fontWeight: 700 }}
                >
                  search the Warning List.
                </a>
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
              marginTop: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges',
                  eyebrow: 'Exact products',
                  title: 'Compare all 34 mapped paths',
                  body: 'Move from country policy to phases, fees, targets, loss limits, account stages and trading rules.',
                },
                {
                  href: '/compare/ftmo-vs-fundednext',
                  eyebrow: 'Top-two decision',
                  title: 'Compare FTMO and FundedNext',
                  body: 'Keep FTMO’s EUR products separate from FundedNext’s USD paths while comparing rules and fee recovery.',
                },
                {
                  href: '/blog/fundednext-review',
                  eyebrow: 'Partner deep dive',
                  title: 'Inspect FundedNext’s 4 paths',
                  body: 'Check global CFD prices, platform charges, reward timing, news treatment, KYC and payout gates.',
                },
                {
                  href: '/cheapest-prop-firms',
                  eyebrow: 'Currency-safe cost',
                  title: 'Separate USD and EUR entry fees',
                  body: 'Compare published currencies first, then apply the live GBP card rate and provider charges at checkout.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {isCheapest && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges',
                  eyebrow: 'Exact tiers',
                  title: 'Compare every current product',
                  body: 'Move beyond each firm’s cheapest tier to compare account size, phases, targets and loss limits.',
                },
                {
                  href: '/true-cost-of-prop-firm-challenges',
                  eyebrow: 'Fee recovery',
                  title: 'Calculate the true cost',
                  body: 'Convert the fee and starting split into gross profit needed to earn the purchase price back.',
                },
                {
                  href: '/prop-firm-discount-codes',
                  eyebrow: 'Promotions',
                  title: 'Verify discounts separately',
                  body: 'Check current codes after choosing the product; coupon size contributes 0 points to this ranking.',
                },
                {
                  href: '/prop-firm-challenge-changes',
                  eyebrow: 'Freshness',
                  title: 'Recheck price and rule changes',
                  body: 'Review material product changes and open first-party evidence conflicts before checkout.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {isCrypto && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges',
                  eyebrow: 'Exact products',
                  title: 'Compare the mapped rule sets',
                  body: 'Move from market eligibility to phases, fees, targets, loss limits, account stages and trading permissions.',
                },
                {
                  href: '/blog/crypto-fund-trader-review',
                  eyebrow: 'Crypto-native review',
                  title: 'Inspect all 5 CFT products',
                  body: 'Compare its 24 priced tiers, static and trailing drawdown, pair coverage and product-level true cost.',
                },
                {
                  href: '/blog/fundednext-review',
                  eyebrow: 'Multi-asset review',
                  title: 'Check FundedNext’s 4 paths',
                  body: 'Read the separate 1-Step, 2-Step, Lite and Instant rules before using its published crypto contract sizes.',
                },
                {
                  href: '/prop-firm-challenge-changes',
                  eyebrow: 'Freshness',
                  title: 'Recheck product changes',
                  body: 'Review dated rule changes and open first-party evidence conflicts before checkout.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {landing.evidenceGaps && landing.evidenceGaps.length > 0 && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  <Database size={18} style={{ color: 'var(--accent-light)' }} />
                  Not ranked yet: {landing.evidenceGaps.length} product-capture gaps
                </h2>
                <p className="section-sub-text">
                  First-party market evidence exists, but the exact products still need structured prices and rules.
                </p>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '0.85rem',
            }}>
              {landing.evidenceGaps.map(gap => (
                <article key={gap.firmName} className="post-sidebar-card" style={{ padding: '1.25rem' }}>
                  <span className="bento-tile-eyebrow">{gap.statusLabel}</span>
                  <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0.5rem 0' }}>
                    {gap.firmName}
                  </h3>
                  <p style={{ color: 'var(--text)', fontSize: '0.86rem', lineHeight: 1.6, margin: 0 }}>
                    {gap.summary} {gap.nextStep}
                  </p>
                  <a
                    href={gap.sourceUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: '0.7rem',
                      color: 'var(--accent-light)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                    }}
                  >
                    First-party source · checked {gap.sourceCapturedAt}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

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
                  Open the CFTC registration checklist
                </a>{' '}
                and{' '}
                <a
                  href="https://www.nfa.futures.org/basicnet/"
                  target="_blank"
                  rel="nofollow noopener"
                  style={{ color: 'var(--accent-light)', fontWeight: 700 }}
                >
                  search NFA BASIC directly.
                </a>
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
              marginTop: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges?market=futures',
                  eyebrow: '10 futures paths',
                  title: 'Compare the mapped futures products',
                  body: 'Filter the current product table to Tradeify, Topstep, Apex and other captured futures paths.',
                },
                {
                  href: '/blog/fundednext-review',
                  eyebrow: '4 CFD paths',
                  title: 'Review FundedNext before checkout',
                  body: 'Compare the 4 rule sets, then use the separate U.S. price schedule and Match-Trader constraint.',
                },
                {
                  href: '/prop-firm-discount-codes',
                  eyebrow: 'Conditional offer',
                  title: 'Verify the FundedNext 5% coupon',
                  body: 'The checked offer is earned through the Free Trial; it is not a public checkout code.',
                },
                {
                  href: '/prop-firm-challenge-changes',
                  eyebrow: 'Change watch',
                  title: 'Recheck current product changes',
                  body: 'Review dated rule changes and unresolved first-party conflicts before paying.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {isFutures && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div
              className="post-sidebar-card"
              style={{ borderLeft: '3px solid var(--gold)', padding: '1.15rem 1.3rem' }}
            >
              <strong style={{ color: '#fff' }}>
                Exchange oversight is not a prop-firm registration badge.
              </strong>{' '}
              <span style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                The CFTC describes designated contract markets as exchanges under its oversight,
                while registration and disciplinary history are separate checks for firms and
                individuals.{' '}
                <a
                  href="https://www.cftc.gov/IndustryOversight/TradingOrganizations/DCMs/index.htm"
                  target="_blank"
                  rel="nofollow noopener"
                  style={{ color: 'var(--accent-light)', fontWeight: 700 }}
                >
                  Read the DCM overview
                </a>{' '}
                and{' '}
                <a
                  href="https://www.cftc.gov/check"
                  target="_blank"
                  rel="nofollow noopener"
                  style={{ color: 'var(--accent-light)', fontWeight: 700 }}
                >
                  check registration in NFA BASIC.
                </a>
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
              marginTop: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges?market=futures',
                  eyebrow: 'Exact products',
                  title: 'Compare current futures products',
                  body: 'Open the full product table with the futures market filter already selected.',
                },
                {
                  href: '/best-prop-firms-in-us',
                  eyebrow: 'Access evidence',
                  title: 'Check U.S. access separately',
                  body: 'Treat documented customer access and regulatory registration as different questions.',
                },
                {
                  href: '/blog/balance-based-drawdown-vs-equity-based-drawdown',
                  eyebrow: 'Risk mechanics',
                  title: 'Understand drawdown mechanics',
                  body: 'Compare how balance, equity and trailing reference points move a breach line.',
                },
                {
                  href: '/prop-firm-challenge-changes',
                  eyebrow: 'Change watch',
                  title: 'Recheck current rule changes',
                  body: 'Review dated product changes and unresolved first-party source conflicts before checkout.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {isInstant && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firm-challenges?program=instant',
                  eyebrow: 'Exact products',
                  title: 'Compare every phase-0 product',
                  body: 'Open the full product table with the instant-funding filter already selected.',
                },
                {
                  href: '/how-prop-firm-challenges-work',
                  eyebrow: 'Account stage',
                  title: 'Separate funded from live capital',
                  body: 'Map checkout, evaluation, funded rules and payout eligibility without assuming the execution environment.',
                },
                {
                  href: '/true-cost-of-prop-firm-challenges',
                  eyebrow: 'Fee economics',
                  title: 'Measure cost against loss room',
                  body: 'Convert the fee and starting split into gross break-even, then compare it with verified maximum loss.',
                },
                {
                  href: '/blog/what-is-prop-firm-consistency-rule',
                  eyebrow: 'Payout gates',
                  title: 'Check consistency formulas',
                  body: 'A phase-0 product can still delay payout through profitable-day, cushion, growth or consistency conditions.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {isSwing && (
        <section className="home-section" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="home-shell">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
            }}>
              {[
                {
                  href: '/prop-firms/overnight-holding',
                  eyebrow: 'Weekday carry',
                  title: 'Check overnight rules by product',
                  body: 'Separate ordinary session-to-session holding from the stricter Friday-close question.',
                },
                {
                  href: '/prop-firms/weekend-holding',
                  eyebrow: 'Weekend carry',
                  title: 'Check Friday-to-Sunday rules',
                  body: 'See which exact products publish weekend permission and which remain conditional.',
                },
                {
                  href: '/blog/balance-based-drawdown-vs-equity-based-drawdown',
                  eyebrow: 'Risk mechanics',
                  title: 'Compare drawdown calculations',
                  body: 'Understand how a floating peak, closing balance, or fixed floor changes a multi-day trade.',
                },
                {
                  href: '/prop-firm-discount-codes',
                  eyebrow: 'Conditional offer',
                  title: 'Verify the FundedNext 5% coupon',
                  body: 'FundedNext ranks first here with 4 qualifying products; its checked coupon is earned through the Free Trial.',
                },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="post-sidebar-card"
                  style={{ padding: '1.15rem 1.25rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">{item.eyebrow}</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.45rem' }}>
                    {item.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    marginTop: '0.35rem',
                  }}>
                    {item.body}
                  </span>
                </Link>
              ))}
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
                {isCheapest
                  ? 'Lowest published path by currency'
                  : isOverall
                    ? 'Editorial ranking with current product evidence'
                    : isUk
                      ? '8 policy-checked firms across 34 mapped products'
                      : isUs
                        ? '4 policy-checked firms across 14 mapped products'
                        : isSwing
                          ? `${count} verified firms across ${landing.snapshotProductCount ?? 0} swing-qualified products`
                          : isCrypto
                            ? '7 evidence-backed firms across 32 mapped products'
                          : 'Ranked & source-checked'}
              </h2>
              <p className="section-sub-text">
                {isCheapest ? (
                  <>
                    USD and EUR lists restart at 01 and are not ranked against each other. Partners are marked;
                    every amount links to a dated first-party source.
                  </>
                ) : isOverall ? (
                  <>
                    Score sets the order; each card shows the current product coverage and a dated source.
                    Partnership status, coupon size and product count add 0 points.
                  </>
                ) : isUk ? (
                  <>
                    Editorial score sets the order; every card links the current country policy.
                    Partnership, headquarters, company registration and payout rails add 0 points.
                  </>
                ) : isUs ? (
                  <>
                    Editorial score sets the order; every card names current product coverage and links its access source.
                    Partnership, coupon size, product count, asset class and platform add 0 points.
                  </>
                ) : isSwing ? (
                  <>
                    Editorial score sets the order; every card names every qualifying product and links each distinct rule source.
                    Partnership, coupon size, product count and drawdown type add 0 points.
                  </>
                ) : isCrypto ? (
                  <>
                    Crypto-native ranks before multi-asset CFD, then editorial score breaks ties.
                    Partnership status, coupon size and payment rails add 0 points.
                  </>
                ) : (
                  <>
                    Partners marked. Numbers come from dated first-party captures under{' '}
                    <Link href="/methodology" style={{ color: 'var(--accent-light)' }}>
                      our methodology
                    </Link>
                    {' '}— no marketing reprints.
                  </>
                )}
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
                  {decisionHeading}
                </h2>
                <p className="section-sub-text">
                  {decisionSub}
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
                  <Link href="/prop-firm-discount-codes" className="btn-outline">
                    Check current offers
                  </Link>
                </div>
              </>
            ) : isSwing ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Verify the exact product before carrying
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Match both holding permissions, then test the drawdown and carrying-cost rules against the strategy.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges" className="btn-primary btn-glow">
                    Compare current products <ArrowRight size={16} />
                  </Link>
                  <Link href="/blog/fundednext-review" className="btn-outline">
                    Review FundedNext
                  </Link>
                  <Link href="/prop-firm-discount-codes" className="btn-outline">
                    Check current offers
                  </Link>
                </div>
              </>
            ) : isFutures ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Compare the exact futures product
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Filter current products first, then verify access and revisit any dated rule change before paying.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges?market=futures" className="btn-primary btn-glow">
                    Compare futures products <ArrowRight size={16} />
                  </Link>
                  <Link href="/best-prop-firms-in-us" className="btn-outline">
                    Check U.S. access
                  </Link>
                  <Link href="/prop-firm-challenge-changes" className="btn-outline">
                    Review current changes
                  </Link>
                </div>
              </>
            ) : isInstant ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Compare the exact phase-0 product
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Filter all current products first, then test the fee, loss line and payout gates against the strategy.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges?program=instant" className="btn-primary btn-glow">
                    Compare instant products <ArrowRight size={16} />
                  </Link>
                  <Link href="/true-cost-of-prop-firm-challenges" className="btn-outline">
                    Check true cost
                  </Link>
                  <Link href="/how-prop-firm-challenges-work" className="btn-outline">
                    Check account stages
                  </Link>
                </div>
              </>
            ) : isOverall ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Move from firm rank to the exact product
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Filter the current rules, compare the leading matchup, and check fee recovery before paying.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges" className="btn-primary btn-glow">
                    Compare current products <ArrowRight size={16} />
                  </Link>
                  <Link href="/compare/ftmo-vs-fundednext" className="btn-outline">
                    Compare the top two
                  </Link>
                  <Link href="/true-cost-of-prop-firm-challenges" className="btn-outline">
                    Calculate true cost
                  </Link>
                </div>
              </>
            ) : isCheapest ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Price the exact path, then test the rules
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Start with the currency-safe minimum, then compare loss room, billing and fee recovery before checkout.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges" className="btn-primary btn-glow">
                    Compare current products <ArrowRight size={16} />
                  </Link>
                  <Link href="/true-cost-of-prop-firm-challenges" className="btn-outline">
                    Calculate true cost
                  </Link>
                  <Link href="/prop-firm-discount-codes" className="btn-outline">
                    Check current codes
                  </Link>
                </div>
              </>
            ) : isUk ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Choose the product, then verify the UK route
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Compare exact rules and currencies, then recheck country policy, KYC, checkout and FCA permissions.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges" className="btn-primary btn-glow">
                    Compare current products <ArrowRight size={16} />
                  </Link>
                  <Link href="/compare/ftmo-vs-fundednext" className="btn-outline">
                    Compare the top two
                  </Link>
                  <a
                    href="https://www.fca.org.uk/consumers/fca-firm-checker"
                    target="_blank"
                    rel="nofollow noopener"
                    className="btn-outline"
                  >
                    Open FCA Firm Checker
                  </a>
                </div>
              </>
            ) : isCrypto ? (
              <>
                <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                  Choose the crypto product, not the payment badge
                </h2>
                <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                  Verify the market source, then compare exact fees, loss rules, trading access and payout gates.
                </p>
                <div className="cta-final-row">
                  <Link href="/prop-firm-challenges" className="btn-primary btn-glow">
                    Compare current products <ArrowRight size={16} />
                  </Link>
                  <Link href="/blog/crypto-fund-trader-review" className="btn-outline">
                    Review the crypto-native option
                  </Link>
                  <Link href="/prop-firm-challenge-changes" className="btn-outline">
                    Review current changes
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
