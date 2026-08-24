import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllFirms, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { getAllDeals, rankDeals } from '@/lib/deals'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import DealsFilter from '@/components/DealsFilter'
import type { DealCardData } from '@/components/DealCard'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const SITE = 'https://tradersfundhub.com'
const SLUG = 'prop-firm-discount-codes'

// Rebuild daily so an expired code drops within a day without a redeploy.
export const revalidate = 86400

const TITLE = 'Prop Firm Discount Codes & Offers (2026)'
const DESCRIPTION =
  'Current prop firm discount codes and conditional offers with first-party sources and checked dates. Stale offers automatically disappear after 30 days.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `/${SLUG}`, languages: getLanguageAlternates(`/${SLUG}`) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/${SLUG}`, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function marketsOf(assets: string[]): string[] {
  const m: string[] = []
  if (assets.includes('Forex')) m.push('Forex')
  if (assets.includes('Futures')) m.push('Futures')
  if (assets.includes('Crypto')) m.push('Crypto')
  return m
}

const FAQS = [
  {
    q: 'Are these discount codes verified?',
    a: 'Every active card has a first-party source and the date we checked it. A typeable code, automatic discount, and earned coupon are labeled separately; offers disappear after 30 days without a recheck.',
  },
  {
    q: 'Is there a public FundedNext discount code today?',
    a: 'The current verified FundedNext offer is not a public code. An eligible new user must reach the 5% Free Trial target; FundedNext then generates a personal 5% CFD-plan coupon that lasts 14 days and excludes resets.',
  },
  {
    q: 'Does an affiliate link guarantee a lower price?',
    a: 'No. An affiliate relationship and a discount are separate facts. We call a saving verified only when a firm-owned source states the amount and conditions; always confirm the final checkout total before paying.',
  },
  {
    q: 'How often is this page updated?',
    a: 'Offers are checked on a rolling basis and the page rebuilds daily. Any offer older than 30 days or past its expiry date is removed automatically; the “Checked” date belongs to that offer.',
  },
]

export default function Page() {
  const firms = getAllFirms()
  const deals = getAllDeals()
  const firmBySlug = new Map(firms.map(firm => [slugify(firm.name), firm]))
  const rows: DealCardData[] = rankDeals(deals, firms).flatMap(deal => {
    const firm = firmBySlug.get(deal.firmSlug)
    if (!firm) return []
    return [{
      firmName: firm.name,
      firmSlug: deal.firmSlug,
      logo: firm.logo,
      score: firm.score,
      reviewUrl: firm.reviewUrl,
      isPartner: Boolean(firm.affiliateUrl),
      markets: marketsOf(firm.assets),
      mechanism: deal.mechanism,
      code: deal.code,
      pct: deal.pct,
      amountLabel: deal.amountLabel,
      scope: deal.scope,
      verifiedOn: deal.verifiedOn,
      sourceUrl: deal.sourceUrl,
      sourceLabel: deal.sourceLabel,
      expiresOn: deal.expiresOn,
      ctaLabel: deal.ctaLabel,
      note: deal.note,
    }]
  })
  const liveCount = rows.length
  const codeCount = rows.filter(row => row.mechanism === 'checkout-code').length
  const hasFundedNextOffer = rows.some(row => row.firmSlug === 'fundednext')
  const fundedNextProducts = getChallengesByFirm('fundednext').filter(challenge =>
    isChallengeFresh(challenge),
  )
  const fundedNextTierCount = fundedNextProducts.reduce(
    (total, product) => total + product.accountSizes.filter(
      tier => tier.priceUsd != null || tier.priceEur != null,
    ).length,
    0,
  )

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firm Discount Codes' },
  ])
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Prop Firm Discount Codes & Offers',
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Organization',
        name: r.firmName,
        url: SITE + r.reviewUrl,
        ...(r.logo ? { logo: SITE + r.logo } : {}),
      },
    })),
  }
  const faqSchema = faqPageSchema(FAQS)

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3rem) 1.25rem 4rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />

      <header style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: '#fff',
            margin: '0 0 0.75rem',
            lineHeight: 1.1,
          }}
        >
          Prop Firm Discount Codes & Offers
        </h1>
        <p style={{ color: 'var(--text)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '64ch', margin: '0 0 0.5rem' }}>
          This page separates typeable checkout codes, automatic discounts, and coupons earned
          after a condition. Every active offer links to the firm&apos;s own terms and carries a checked
          date; after 30 days without a recheck, it disappears.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
          <strong style={{ color: 'var(--accent-light)' }}>{liveCount} verified {liveCount === 1 ? 'offer' : 'offers'}</strong> ·{' '}
          {codeCount} typeable {codeCount === 1 ? 'code' : 'codes'} · 30-day freshness gate · partner links marked
        </p>
      </header>

      <AffiliateDisclosure />

      <section aria-labelledby="current-prop-firm-offers" style={{ marginTop: '2rem' }}>
        <h2 id="current-prop-firm-offers" style={{ fontSize: '1.45rem', fontWeight: 850, color: '#fff', margin: '0 0 0.5rem' }}>
          Current verified offers
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '72ch', margin: '0 0 1.25rem' }}>
          A row appears only while its source check is no more than 30 days old. Firms without a
          sourced saving are not padded into the list as empty “deal” cards.
        </p>
        <DealsFilter rows={rows} />
      </section>

      {hasFundedNextOffer && (
        <section
          aria-labelledby="fundednext-offer-steps"
          data-fundednext-offer-steps="earned-coupon"
          style={{ marginTop: '3rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(1.1rem, 3vw, 1.6rem)' }}
        >
          <h2 id="fundednext-offer-steps" style={{ fontSize: '1.45rem', fontWeight: 850, color: '#fff', margin: '0 0 0.55rem' }}>
            How the FundedNext 5% offer works
          </h2>
          <p style={{ color: 'var(--text)', lineHeight: 1.65, margin: '0 0 1.15rem', maxWidth: '76ch' }}>
            There is no public FundedNext code to copy from this page. The current offer creates a
            personal coupon only after an eligible new user completes the Free Trial condition.
          </p>
          <ol className="deal-steps">
            <li><strong>Start 1 Free Trial.</strong> Its 14-day clock begins with the first trade, and at least 3 trading days are required.</li>
            <li><strong>Reach the 5% target.</strong> Stay inside the 5% daily and 10% maximum loss limits; EAs are not permitted on the trial.</li>
            <li><strong>Use the generated code within 14 days.</strong> FundedNext sends it by email and adds it to My Offers; it covers CFD plans for new users and excludes resets.</li>
          </ol>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Link href="/blog/fundednext-review" className="deal-crosslink">
              Compare {fundedNextProducts.length} products and {fundedNextTierCount} prices →
            </Link>
            <Link href="/compare/ftmo-vs-fundednext" className="deal-crosslink">FundedNext vs FTMO →</Link>
            <Link href="/blog/ftmo-free-trial-explained" className="deal-crosslink">Compare both Free Trials →</Link>
          </div>
        </section>
      )}

      <section aria-labelledby="offer-labels" style={{ marginTop: '3rem' }}>
        <h2 id="offer-labels" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0 0 0.65rem' }}>
          What each offer label means
        </h2>
        <div className="deal-label-grid">
          <div><strong>Checkout code</strong><span>An exact string we checked and you can type before payment.</span></div>
          <div><strong>Automatic discount</strong><span>The firm&apos;s source says the saving is applied through the link; no code is invented.</span></div>
          <div><strong>Earned coupon</strong><span>A stated action must be completed before the firm generates a personal code.</span></div>
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0 0 1.25rem' }}>
          Common questions
        </h2>
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          {FAQS.map(f => (
            <details
              key={f.q}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '0.9rem 1.1rem',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text)', listStyle: 'none' }}>
                {f.q}
              </summary>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0.7rem 0 0' }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/cheapest-prop-firms" className="deal-crosslink">Cheapest prop firms →</Link>
        <Link href="/true-cost-of-prop-firm-challenges" className="deal-crosslink">Calculate true cost →</Link>
        <Link href="/best-prop-firms-2026" className="deal-crosslink">Best prop firms 2026 →</Link>
        <Link href="/how-to-pass-a-prop-firm-challenge" className="deal-crosslink">How to pass a challenge →</Link>
      </section>
    </main>
  )
}
