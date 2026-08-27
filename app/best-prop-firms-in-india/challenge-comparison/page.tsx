import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  CircleAlert,
  FileCheck2,
  IndianRupee,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import IndiaChallengeComparison from '@/components/IndiaChallengeComparison'
import IndiaMatchupLinks from '@/components/IndiaMatchupLinks'
import { INDIA_EVIDENCE, passesIndiaRegulatoryCountryGate } from '@/lib/india'
import { buildIndiaMatcherFirms } from '@/lib/indiaMatcher'
import { buildLandingPayload, getLandingBySlug } from '@/lib/landings'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/best-prop-firms-in-india/challenge-comparison'
const SITE = 'https://tradersfundhub.com'
// Keep the social-card copy aligned with the current screened dataset. The
// India gate can remove firms/products as evidence ages or RBI status changes;
// stale hard-coded counts should not make an otherwise valid production build
// fail and leave every route on the previous deployment.
const SOCIAL_CARD_PRODUCT_COUNT = 40
const SOCIAL_CARD_FIRM_COUNT = 8

export const metadata: Metadata = {
  title: { absolute: 'India Prop Firm Challenge Comparison (2026)' },
  description:
    'Filter source-dated prop-firm challenges available to Indian traders by steps, drawdown, account size, trading rules, profit split and payout timing.',
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Prop Firm Challenge Comparison India (2026)',
    description:
      'Compare India-screened challenge rules with first-party sources, capture dates and RBI Alert List exclusions.',
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop Firm Challenge Comparison India (2026)',
    description:
      'Filter 40 sourced products across 8 India-screened firms.',
  },
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? 'No firm'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export default function Page() {
  const landing = getLandingBySlug('best-prop-firms-in-india')
  if (!landing) throw new Error('India landing configuration is missing')

  const { ranked } = buildLandingPayload(landing)
  const firms = buildIndiaMatcherFirms(ranked.map(entry => entry.firm))
  const products = firms.flatMap(firm => firm.products)
  const eligibleEvidence = INDIA_EVIDENCE.filter(passesIndiaRegulatoryCountryGate)
  const excluded = INDIA_EVIDENCE.filter(entry => entry.rbiAlert.status === 'named')
  const capturedAt = [
    ...products.map(product => product.capturedAt),
    ...eligibleEvidence.map(entry => entry.capturedAt),
  ].sort().at(-1)!
  const pricedCount = products.filter(product => product.entryPrice != null).length
  const stats: Array<{ value: string; label: string; Icon: LucideIcon }> = [
    { value: products.length.toString(), label: 'sourced products', Icon: Scale },
    { value: firms.length.toString(), label: 'India-screened firms', Icon: ShieldCheck },
    { value: pricedCount.toString(), label: 'published entry fees', Icon: IndianRupee },
    { value: '30 days', label: 'maximum source age', Icon: FileCheck2 },
  ]

  if (
    products.length !== SOCIAL_CARD_PRODUCT_COUNT
    || firms.length !== SOCIAL_CARD_FIRM_COUNT
  ) {
    throw new Error(
      `Refresh the India challenge-comparison social card: expected `
      + `${SOCIAL_CARD_PRODUCT_COUNT} products/${SOCIAL_CARD_FIRM_COUNT} firms, `
      + `received ${products.length}/${firms.length}`,
    )
  }

  const faqs = [
    {
      q: 'How many prop-firm challenge products are compared for Indian traders?',
      a: `${products.length} products across ${firms.length} firms pass the current India regulatory and country-availability gates. ${pricedCount} products also have a publicly captured entry fee.`,
    },
    {
      q: 'Why are FTMO and FundedNext excluded from this India comparison?',
      a: 'Both brands remain on the RBI Alert List updated 19 November 2025. Traders Fund Hub excludes named firms from India rankings, rule filters, INR planning and India affiliate placements.',
    },
    {
      q: 'Does appearing in this comparison mean a firm is RBI authorised?',
      a: 'No. RBI says its Alert List is non-exhaustive and absence must not be interpreted as authorisation. Inclusion means only that a firm passed our conservative editorial screen for further due diligence.',
    },
    {
      q: 'Why do some fields say unverified?',
      a: 'A missing or conflicting first-party rule remains unknown. The comparison never converts an unpublished value into zero, unlimited or allowed.',
    },
    {
      q: 'Are challenge prices converted to Indian rupees?',
      a: 'No automatic FX rate is used. Prices remain in the firm’s published currency; traders can enter the current rate shown by their own bank, card or provider in the separate INR checkout planner.',
    },
    {
      q: 'Can I save or share an India challenge shortlist?',
      a: 'Yes. Select 2 to 4 products, choose a decision priority and copy the generated URL. It preserves the exact product keys, priority and account size while keeping the page canonical clean, and stores no identity, KYC document or payment data.',
    },
    {
      q: 'Does the decision memo choose the best prop firm for everyone?',
      a: 'No. It identifies the best fit only among the selected products for one explicit priority, such as verified payout timing, published cost, max-loss percentage, EA rules or India evidence completeness. It refuses cross-currency cost winners and keeps missing values unranked.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Best Prop Firms in India', url: '/best-prop-firms-in-india' },
    { name: 'Challenge Comparison' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'India-screened prop firm challenge products',
    numberOfItems: products.length,
    itemListElement: firms
      .flatMap(firm => firm.products.map(product => ({ firm, product })))
      .map(({ firm, product }, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE}${PATH}#india-challenge-product-${firm.slug}-${product.slug}`,
        name: `${firm.name} ${product.name}`,
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
            {products.length} products · {firms.length} screened firms · updated {dateLabel(capturedAt)}
          </div>
          <h1 className="blog-hero-title">
            Prop Firm Challenge Comparison <span className="gradient-text">for India</span>
          </h1>
          <p className="blog-hero-sub">
            Filter product-level fees, targets, loss limits, drawdown, timing and trading rules.
            Then share a 2–4 product shortlist with RBI, country, KYC, payout and cost evidence
            attached.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '1.4rem' }}>
            <Link href="#india-challenge-table-heading" className="btn-primary btn-glow">
              Compare and shortlist {products.length} products <ArrowRight size={15} />
            </Link>
            <Link href="/best-prop-firms-in-india" className="btn-outline">
              See the India ranking
            </Link>
            <Link href="/best-prop-firms-in-india/payout-methods" className="btn-outline">
              Compare payout methods
            </Link>
            <Link href="/prop-firm-challenge-changes" className="btn-outline">
              Track challenge changes
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem', paddingBottom: 0 }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
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

      <section className="home-section" style={{ paddingTop: '0.5rem', paddingBottom: '1rem' }}>
        <div className="home-shell">
          <div className="post-sidebar-card" style={{
            padding: '1.25rem',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            background: 'rgba(127, 29, 29, 0.12)',
          }}>
            <span className="bento-tile-eyebrow" style={{ color: '#fca5a5' }}>
              <CircleAlert size={12} /> Regulatory gate before commercial sorting
            </span>
            <p style={{ color: 'var(--text)', fontSize: '0.84rem', lineHeight: 1.65, margin: '0.65rem 0 0' }}>
              {joinNames(excluded.map(entry => entry.firmName))} are named on the RBI Alert List and cannot
              appear in these results. An unlisted firm is not described as authorised; it remains subject
              to contract, remittance, KYC and payout due diligence.
            </p>
          </div>
        </div>
      </section>

      <IndiaChallengeComparison firms={firms} />

      <IndiaMatchupLinks
        heading="Turn the product table into a 2-firm decision"
        description="These curated routes compare the 3 recurring India shortlists without dropping country, KYC, payout, currency or product-rule unknowns."
      />

      <section className="home-section" aria-labelledby="india-comparison-method-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-comparison-method-heading" className="section-title">
                <SlidersHorizontal size={18} style={{ color: 'var(--accent-light)' }} />
                What makes this comparison different
              </h2>
              <p className="section-sub-text">
                Breadth is useful only when availability, regulation and source quality remain separate claims.
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '0.9rem',
          }}>
            {[
              ['1. India gate first', 'A firm named on the RBI Alert List is removed before pricing, partner status or editorial score can affect the result.'],
              ['2. Products, not slogans', 'Each programme keeps its own targets, loss caps, drawdown method, timing and trading-rule fields.'],
              ['3. Unknown stays unknown', 'A missing value never becomes zero, unlimited, allowed or “industry standard” just to complete a row.'],
              ['4. Source date attached', 'Every product links to the firm’s own public page and must pass the 30-day freshness audit.'],
            ].map(([title, body]) => (
              <article key={title} className="post-sidebar-card" style={{ padding: '1.2rem' }}>
                <h3 style={{ color: '#fff', fontSize: '0.96rem', margin: 0 }}>{title}</h3>
                <p style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.65, margin: '0.55rem 0 0' }}>
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="india-comparison-gaps-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-comparison-gaps-heading" className="section-title">Open India evidence gaps</h2>
              <p className="section-sub-text">
                Passing the comparison gate does not imply a verified Indian payout receipt.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {firms.map(firm => (
              <article key={firm.slug} className="post-sidebar-card" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1.15rem',
              }}>
                <div style={{ flex: '0 1 170px' }}>
                  <strong style={{ color: '#fff', fontSize: '0.88rem' }}>{firm.name}</strong>
                  <span style={{ display: 'block', color: 'var(--accent-light)', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                    Evidence {firm.evidenceScore}/12
                  </span>
                </div>
                <p style={{ flex: '1 1 300px', color: 'var(--text)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
                  {firm.unresolved}
                </p>
              </article>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.55, margin: '0.85rem 0 0' }}>
            Indian traders can submit redacted checkout, KYC or payout evidence through the evidence form on
            the <Link href="/best-prop-firms-in-india" style={{ color: 'var(--accent-light)' }}>main India page</Link>.
          </p>
        </div>
      </section>

      <section className="home-section" aria-labelledby="india-challenge-faq-heading">
        <div className="home-shell" style={{ maxWidth: 900 }}>
          <div className="section-head">
            <div>
              <h2 id="india-challenge-faq-heading" className="section-title">India challenge-comparison FAQ</h2>
              <p className="section-sub-text">{faqs.length} answers tied to the same regulatory and source gates.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {faqs.map(item => (
              <article key={item.q} className="post-sidebar-card" style={{ padding: '1.2rem' }}>
                <h3 style={{ color: '#fff', fontSize: '0.96rem', margin: 0 }}>{item.q}</h3>
                <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.65, margin: '0.5rem 0 0' }}>
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 650 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.45rem, 3vw, 2rem)' }}>
              Check cost, payout and legal questions separately
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.9rem' }}>
              A favourable rule set does not resolve checkout FX, payout delivery, FEMA or return reporting.
            </p>
            <div className="cta-final-row">
              <Link href="/best-prop-firms-in-india#india-checkout-planner-heading" className="btn-primary btn-glow">
                Estimate INR checkout <ArrowRight size={15} />
              </Link>
              <Link href="/best-prop-firms-in-india/payout-methods" className="btn-outline">
                Compare payout rails
              </Link>
              <Link href="/best-prop-firms-in-india/compare" className="btn-outline">
                Browse India matchups
              </Link>
              <Link href="/best-prop-firms-in-india/challenge-changes" className="btn-outline">
                Check challenge changes
              </Link>
              <Link href="/blog/are-prop-firms-legal-in-india" className="btn-outline">
                Review RBI &amp; FEMA
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
