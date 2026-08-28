import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BellRing,
  CircleAlert,
  Database,
  ExternalLink,
  FileCheck2,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import GlobalChallengeComparison, {
  type GlobalChallengeRow,
} from '@/components/GlobalChallengeComparison'
import {
  getChallengeWatchEntries,
  productChangeSignals,
  type ChallengeWatchKind,
} from '@/lib/challengeWatch'
import {
  getAllChallenges,
  getAllFirms,
  isChallengeFresh,
  minimumCostToFundedUsd,
} from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/prop-firm-challenges'
const SITE = 'https://tradersfundhub.com'
// Keep the build-time social-card check aligned with the current 30-day
// freshness-filtered dataset. Stale counts should not block every deployment.
const SOCIAL_CARD_PRODUCT_COUNT = 53
const SOCIAL_CARD_FIRM_COUNT = 11

export const metadata: Metadata = {
  title: 'Prop Firm Challenge Comparison (2026): Prices & Rules',
  description:
    'Compare source-dated prop-firm challenge products by price, account size, steps, targets, loss limits, drawdown, payout timing and trading rules.',
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Prop Firm Challenge Comparison: Prices, Rules & Changes',
    description:
      'Product-level challenge data with first-party sources, funded-cost floors and a dated rule-change watch.',
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop Firm Challenge Comparison (2026)',
    description:
      'Filter product-level prices, targets, drawdown, payouts and trading rules without hiding missing data.',
  },
}

function firmSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function watchLabel(kind: ChallengeWatchKind) {
  if (kind === 'lineup-change') return 'Product lineup'
  if (kind === 'price-watch') return 'Price watch'
  if (kind === 'rule-change') return 'Rule change'
  return 'Source conflict'
}

function watchColor(kind: ChallengeWatchKind) {
  if (kind === 'lineup-change') return '#6ee7b7'
  if (kind === 'rule-change') return '#93c5fd'
  if (kind === 'price-watch') return '#fcd34d'
  return '#fca5a5'
}

export default function Page() {
  const firms = getAllFirms()
  const firmBySlug = new Map(firms.map(firm => [firmSlug(firm.name), firm]))
  const challenges = getAllChallenges().filter(challenge => isChallengeFresh(challenge))
  const watchEntries = getChallengeWatchEntries()
  const rows: GlobalChallengeRow[] = challenges.flatMap(challenge => {
    const firm = firmBySlug.get(challenge.firmSlug)
    if (!firm) return []
    return [{
      firm: {
        slug: challenge.firmSlug,
        name: firm.name,
        logo: firm.logo,
        reviewUrl: firm.reviewUrl,
        isPartner: Boolean(firm.affiliateUrl),
        score: firm.score,
      },
      product: {
        name: challenge.productName,
        slug: challenge.productSlug,
        phases: challenge.phases,
        tiers: challenge.accountSizes.map(tier => ({
          sizeUsd: tier.sizeUsd,
          priceUsd: tier.priceUsd,
          priceEur: tier.priceEur ?? null,
          costToFundedUsd: minimumCostToFundedUsd(challenge, tier),
          costToFundedEur:
            tier.priceEur != null
            && tier.priceEur > 0
            && (tier.payLaterUsd ?? 0) === 0
            && (tier.activationFeeUsd ?? challenge.activationFeeUsd ?? 0) === 0
              ? tier.priceEur
              : null,
          dailyLossUsd: tier.dailyLossUsd ?? null,
          maxLossUsd: tier.maxLossUsd ?? null,
        })),
        pricingModel: challenge.pricingModel ?? 'one-off',
        profitTargets: challenge.profitTargets,
        dailyLossPct: challenge.dailyLossPct,
        maxLossPct: challenge.maxLossPct,
        drawdownType: challenge.drawdownType,
        minTradingDays: challenge.minTradingDays,
        maxTradingDays: challenge.maxTradingDays,
        consistencyRulePct: challenge.consistencyRulePct,
        profitSplitPct: challenge.profitSplitPct,
        payoutFirstDays: challenge.payoutFirstDays,
        payoutFrequency: challenge.payoutFrequency,
        rules: challenge.rules,
        assetClass: challenge.assetClass,
        sourceUrl: challenge.sourceUrl,
        capturedAt: challenge.sourceCapturedAt,
        changeSignals: productChangeSignals(
          watchEntries,
          challenge.firmSlug,
          challenge.productSlug,
        ),
      },
    }]
  })
  const trackedFirmCount = new Set(rows.map(row => row.firm.slug)).size
  const pricedProductCount = rows.filter(row =>
    row.product.tiers.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)),
  ).length
  const pricedTierCount = rows.reduce(
    (count, row) => count + row.product.tiers.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)).length,
    0,
  )
  const latestCapture = rows.map(row => row.product.capturedAt).sort().at(-1)
  if (
    rows.length !== SOCIAL_CARD_PRODUCT_COUNT
    || trackedFirmCount !== SOCIAL_CARD_FIRM_COUNT
  ) {
    throw new Error(
      `Refresh the global challenge-comparison social card: expected `
      + `${SOCIAL_CARD_PRODUCT_COUNT} products/${SOCIAL_CARD_FIRM_COUNT} firms, `
      + `received ${rows.length}/${trackedFirmCount}`,
    )
  }
  const stats: Array<{ value: string; label: string; Icon: LucideIcon }> = [
    { value: rows.length.toString(), label: 'fresh products', Icon: Scale },
    { value: trackedFirmCount.toString(), label: 'firms covered', Icon: Database },
    { value: pricedTierCount.toString(), label: 'priced account tiers', Icon: FileCheck2 },
    { value: watchEntries.length.toString(), label: 'active change notes', Icon: BellRing },
  ]
  const faqs = [
    {
      q: 'How many prop-firm challenge products are compared?',
      a: `${rows.length} products across ${trackedFirmCount} firms pass the current 30-day source-freshness gate. ${pricedProductCount} products have at least 1 verified entry fee and the remaining products keep price fields unverified.`,
    },
    {
      q: 'How current are the challenge prices and rules?',
      a: 'Every published row carries a first-party source and capture date. Product data older than 30 days is removed from the comparison until it is recaptured.',
    },
    {
      q: 'Why do some prices or rules say unverified?',
      a: 'A null value means the firm did not expose a figure that could be independently captured, or its own public pages conflicted. Traders Fund Hub does not copy a competitor number to fill the gap.',
    },
    {
      q: 'How is a monthly challenge compared with a one-time evaluation?',
      a: 'The entry column labels the billing model. A monthly funded-cost floor assumes a first-cycle pass and adds any verified activation fee; later rebills and resets are not hidden inside a one-time-looking number.',
    },
    {
      q: 'Does the lowest challenge price mean the product is best?',
      a: 'No. Price is one filter. Drawdown mechanics, loss room, payout eligibility, consistency rules, platform fit and country availability can matter more than the checkout fee.',
    },
    {
      q: 'Can I save or share a challenge shortlist?',
      a: 'Yes. Select 2 to 4 product rows and copy the generated URL. It preserves the product keys, decision priority and selected account size without an account, cookie or saved profile, while the canonical remains the clean comparison page.',
    },
    {
      q: 'Does this global table confirm that a product is available in India?',
      a: 'No. The global table compares published product terms. Indian residents should use the separate India challenge comparison, which applies the RBI Alert List and dated country-availability gates before showing a firm.',
    },
  ]
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firms', url: '/prop-firms' },
    { name: 'Challenge Comparison' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Source-dated prop firm challenge products',
    numberOfItems: rows.length,
    itemListElement: rows.map((row, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE}${PATH}#challenge-product-${row.firm.slug}-${row.product.slug}`,
      name: `${row.firm.name} ${row.product.name}`,
    })),
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />

      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            {rows.length} products · {trackedFirmCount} firms
            {latestCapture ? ` · verified through ${dateLabel(latestCapture)}` : ''}
          </div>
          <h1 className="blog-hero-title">
            Compare prop-firm challenges, <span className="gradient-text">not slogans.</span>
          </h1>
          <p className="blog-hero-sub">
            Filter product-level fees, funded-cost floors, targets, drawdown, payouts and trading
            rules, then share a 2–4 product shortlist. Every result keeps its first-party source
            and capture date attached.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '1.4rem' }}>
            <Link href="#global-challenge-table-heading" className="btn-primary btn-glow">
              Compare and shortlist {rows.length} products <ArrowRight size={15} />
            </Link>
            <Link href="#challenge-change-watch" className="btn-outline">
              See rule and price watches
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-outline">
              India-screened challenges
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem', paddingBottom: 0 }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '1.25rem', paddingBottom: '1rem' }}>
        <div className="home-shell">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.8rem',
          }}>
            {stats.map(({ value, label, Icon }) => (
              <article key={label} className="post-sidebar-card" style={{ padding: '1.05rem' }}>
                <Icon size={15} style={{ color: 'var(--accent-light)' }} />
                <strong style={{ display: 'block', color: '#fff', fontSize: '1.25rem', marginTop: '0.45rem' }}>
                  {value}
                </strong>
                <span style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>{label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '0.5rem', paddingBottom: '1.25rem' }}>
        <div className="home-shell">
          <div className="post-sidebar-card" style={{
            padding: '1.15rem',
            borderColor: 'rgba(96, 165, 250, 0.32)',
            background: 'rgba(30, 64, 175, 0.09)',
          }}>
            <span className="bento-tile-eyebrow" style={{ color: '#93c5fd' }}>
              <ShieldCheck size={12} /> Global product data is not country approval
            </span>
            <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.65, margin: '0.6rem 0 0' }}>
              This table compares public product terms worldwide. It does not claim that every firm accepts
              every country. India users should apply the separate RBI and availability screen before price
              or editorial score.
            </p>
          </div>
        </div>
      </section>

      <GlobalChallengeComparison rows={rows} />

      <section
        id="challenge-change-watch"
        className="home-section"
        aria-labelledby="challenge-change-watch-heading"
      >
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="challenge-change-watch-heading" className="section-title">
                <BellRing size={18} style={{ color: 'var(--accent-light)' }} />
                Challenge change watch
              </h2>
              <p className="section-sub-text">
                Confirmed product changes and unresolved first-party conflicts that can alter a purchase decision.
              </p>
            </div>
            <span className="section-sub">
              <FileCheck2 size={13} /> Dated observations, not rumours
            </span>
          </div>

          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {watchEntries.slice(0, 3).map(entry => {
              const color = watchColor(entry.kind)
              return (
                <article key={entry.id} className="post-sidebar-card" style={{
                  padding: '1.2rem',
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '0.8rem',
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color,
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        {entry.status === 'watch' ? <CircleAlert size={11} /> : <FileCheck2 size={11} />}
                        {watchLabel(entry.kind)} · {entry.status === 'watch' ? 'Watch' : 'Verified'}
                      </span>
                      <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0.45rem 0 0' }}>
                        {entry.title}
                      </h3>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 700 }}>
                      Observed {dateLabel(entry.observedAt)}
                      {` · checked ${dateLabel(entry.lastCheckedAt)}`}
                      {entry.effectiveAt ? ` · effective ${dateLabel(entry.effectiveAt)}` : ''}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.65, margin: '0.65rem 0 0' }}>
                    {entry.summary}
                  </p>
                  <p style={{ color: '#cbd5e1', fontSize: '0.76rem', lineHeight: 1.6, margin: '0.5rem 0 0' }}>
                    <strong style={{ color: '#fff' }}>Trader impact:</strong> {entry.traderImpact}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.7rem' }}>
                    {entry.sourceUrls.map((sourceUrl, index) => (
                      <a
                        key={sourceUrl}
                        href={sourceUrl}
                        target="_blank"
                        rel="nofollow noopener"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: 'var(--accent-light)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        First-party source{entry.sourceUrls.length > 1 ? ` ${index + 1}` : ''}
                        <ExternalLink size={10} />
                      </a>
                    ))}
                    <Link
                      href={firmBySlug.get(entry.firmSlug)?.reviewUrl || '/prop-firms'}
                      style={{ color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 800 }}
                    >
                      {entry.firmName} review <ArrowRight size={10} style={{ verticalAlign: '-1px' }} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.8rem',
            flexWrap: 'wrap',
            marginTop: '1rem',
          }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>
              Showing the latest 3 of {watchEntries.length} dated updates.
            </span>
            <Link href="/prop-firm-challenge-changes" className="btn-outline">
              Open the full change ledger <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="challenge-method-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="challenge-method-heading" className="section-title">
                <SlidersHorizontal size={18} style={{ color: 'var(--accent-light)' }} />
                Why this comparison is stricter
              </h2>
              <p className="section-sub-text">
                A larger row count is useful only when price, product and evidence quality remain visible.
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '0.9rem',
          }}>
            {[
              ['1. Product rows', 'One firm can sell multiple challenges with different targets, splits, drawdown and activation costs. Each product stays separate.'],
              ['2. True billing labels', 'Monthly subscriptions, one-time evaluations and split-payment products are never presented as the same kind of fee.'],
              ['3. Unknown stays unknown', 'A blocked checkout, missing price or conflicting official page remains unverified instead of being filled from another comparison site.'],
              ['4. Sources expire', 'Every product needs a first-party source captured within 30 days. Stale rows disappear until the editorial capture is refreshed.'],
            ].map(([title, body]) => (
              <article key={title} className="post-sidebar-card" style={{ padding: '1.2rem' }}>
                <h3 style={{ color: '#fff', fontSize: '0.94rem', margin: 0 }}>{title}</h3>
                <p style={{ color: 'var(--text)', fontSize: '0.79rem', lineHeight: 1.65, margin: '0.55rem 0 0' }}>
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="challenge-comparison-faq-heading">
        <div className="home-shell" style={{ maxWidth: 900 }}>
          <div className="section-head">
            <div>
              <h2 id="challenge-comparison-faq-heading" className="section-title">
                Prop-firm challenge comparison FAQ
              </h2>
              <p className="section-sub-text">{faqs.length} answers tied to the same product and source gates.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {faqs.map(item => (
              <article key={item.q} className="post-sidebar-card" style={{ padding: '1.2rem' }}>
                <h3 style={{ color: '#fff', fontSize: '0.94rem', margin: 0 }}>{item.q}</h3>
                <p style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.65, margin: '0.5rem 0 0' }}>
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 680 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.45rem, 3vw, 2rem)' }}>
              Shortlist the product, then compare the firms
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.9rem' }}>
              Product rules answer “can I trade this?” Firm comparisons answer “which provider fits better?”
            </p>
            <div className="cta-final-row">
              <Link href="/compare" className="btn-primary btn-glow">
                Compare 2 firms <ArrowRight size={15} />
              </Link>
              <Link href="/prop-firms" className="btn-outline">
                Browse firm directory
              </Link>
              <Link href="/true-cost-of-prop-firm-challenges" className="btn-outline">
                Understand true-cost math
              </Link>
              <Link href="/how-prop-firm-challenges-work" className="btn-outline">
                How challenges work
              </Link>
              <Link href="/how-to-pass-a-prop-firm-challenge" className="btn-outline">
                Risk-first passing guide
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
