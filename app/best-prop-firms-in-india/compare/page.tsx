import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  Database,
  FileCheck2,
  IndianRupee,
  Scale,
  ShieldCheck,
  Swords,
} from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import { buildIndiaMatcherFirms, type IndiaMatcherFirm } from '@/lib/indiaMatcher'
import {
  INDIA_MATCHUPS,
  indiaMatchupPath,
  type IndiaMatchupConfig,
} from '@/lib/indiaMatchups'
import { buildLandingPayload, getLandingBySlug } from '@/lib/landings'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/best-prop-firms-in-india/compare'
const SITE = 'https://tradersfundhub.com'

export const metadata: Metadata = {
  title: { absolute: 'Prop Firm Comparisons India (2026)' },
  description:
    'Browse curated India prop-firm matchups comparing country access, RBI screening, KYC, payout rails, challenge costs and source-dated product rules.',
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Prop Firm Comparisons for India',
    description:
      'Curated head-to-head comparisons built from India evidence and exact challenge products—not mass-generated verdicts.',
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop Firm Comparisons India',
    description:
      'Evidence-first India matchups covering RBI screening, KYC, payouts, costs and product rules.',
  },
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function railLabel(value: string) {
  return value === 'rise' ? 'Rise' : value[0].toUpperCase() + value.slice(1)
}

function matchupPayload(
  config: IndiaMatchupConfig,
  firmBySlug: Map<string, IndiaMatcherFirm>,
) {
  const firms = config.firmSlugs.map(slug => firmBySlug.get(slug))
  if (firms.some(firm => !firm)) {
    throw new Error(`${config.title} includes a firm outside the current India gate`)
  }
  const pair = firms as [IndiaMatcherFirm, IndiaMatcherFirm]
  const productCount = pair.reduce((count, firm) => count + firm.products.length, 0)
  if (productCount !== config.expectedProductCount) {
    throw new Error(
      `Refresh ${config.title}: expected ${config.expectedProductCount} products, `
      + `received ${productCount}`,
    )
  }
  const latestCapture = [
    ...pair.map(firm => firm.evidenceCapturedAt),
    ...pair.flatMap(firm => firm.products.map(product => product.capturedAt)),
  ].sort().at(-1)!
  const payoutRails = pair.map(firm => (
    `${firm.name}: ${firm.payoutRails.map(railLabel).join(', ')}`
  ))
  const changeSignals = pair.reduce(
    (count, firm) => count + firm.products.reduce(
      (productCount, product) => productCount + product.changeSignals.length,
      0,
    ),
    0,
  )
  return {
    config,
    firms: pair,
    productCount,
    latestCapture,
    payoutRails,
    changeSignals,
    partnerCount: pair.filter(firm => firm.isPartner).length,
  }
}

export default function Page() {
  const landing = getLandingBySlug('best-prop-firms-in-india')
  if (!landing) throw new Error('India landing configuration is missing')
  const { ranked } = buildLandingPayload(landing)
  const eligibleFirms = buildIndiaMatcherFirms(ranked.map(entry => entry.firm))
  const firmBySlug = new Map(eligibleFirms.map(firm => [firm.slug, firm]))
  const matchups = Object.values(INDIA_MATCHUPS)
    .map(config => matchupPayload(config, firmBySlug))
  const uniqueFirmSlugs = new Set(matchups.flatMap(matchup =>
    matchup.firms.map(firm => firm.slug)))
  const uniqueFirms = [...uniqueFirmSlugs].map(slug => firmBySlug.get(slug)!)
  const uniqueProductCount = uniqueFirms.reduce(
    (count, firm) => count + firm.products.length,
    0,
  )
  const latestCapture = matchups.map(matchup => matchup.latestCapture).sort().at(-1)!
  const totalSignals = matchups.reduce(
    (count, matchup) => count + matchup.changeSignals,
    0,
  )

  const faqs = [
    {
      q: 'How are India prop-firm matchups selected?',
      a: 'A matchup is published only when both firms pass the current RBI Alert List and country-availability gate, every displayed product passes the 30-day source-freshness gate, and the pair answers a distinct Indian checkout, payout or rule question.',
    },
    {
      q: 'Why are there fewer India comparisons than global comparisons?',
      a: `The library currently contains ${matchups.length} curated matchups across ${uniqueFirms.length} screened firms. Traders Fund Hub does not generate every possible pair because duplicated pages with generic verdicts do not improve a purchase decision.`,
    },
    {
      q: 'Does the library identify one best prop firm for every Indian trader?',
      a: 'No. Each matchup names the constraint being compared and shows which firm leads only for that context. Missing pricing, mixed currencies and incomparable drawdown measures do not produce a winner.',
    },
    {
      q: 'Do affiliate partnerships determine which firms are compared?',
      a: 'No. Partner status contributes zero ranking or evidence points. A non-partner firm can appear when the matchup is useful, but its action links only to first-party terms or an independent review.',
    },
    {
      q: 'Does appearing in this library mean RBI authorisation?',
      a: 'No. RBI says absence from its non-exhaustive Alert List must not be interpreted as authorisation. Every matchup repeats that boundary and links to the dated RBI source.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Best Prop Firms in India', url: '/best-prop-firms-in-india' },
    { name: 'India Prop Firm Comparisons' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Curated Prop Firm Comparisons for India',
    numberOfItems: matchups.length,
    itemListElement: matchups.map((matchup, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE}${indiaMatchupPath(matchup.config)}`,
      name: `${matchup.config.title} for India`,
    })),
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />

      <section className="blog-hero india-matchup-hub-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/best-prop-firms-in-india" className="post-back">
            ← Best prop firms in India
          </Link>
          <div className="hero-eyebrow" style={{ marginBottom: '1.2rem' }}>
            <Swords size={12} aria-hidden="true" />
            {matchups.length} curated matchups · {uniqueProductCount} unique products · checked {dateLabel(latestCapture)}
          </div>
          <h1 className="blog-hero-title">
            Prop firm comparisons <span className="gradient-text">for India</span>
          </h1>
          <p className="blog-hero-sub">
            Start with the decision question—not a generic winner. Every matchup combines
            India-specific evidence with source-dated product rules and explicit unknowns.
          </p>
          <div className="challenge-change-hero-actions">
            <Link href="#curated-india-matchups" className="btn-primary btn-glow">
              Browse curated matchups <ArrowRight size={15} />
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-outline">
              Build a custom product comparison
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section india-matchup-intro">
        <div className="home-shell">
          <AffiliateDisclosure />
          <div className="india-matchup-stat-grid">
            {[
              { value: matchups.length.toString(), label: 'curated matchups', Icon: Swords },
              { value: uniqueFirms.length.toString(), label: 'screened firms covered', Icon: ShieldCheck },
              { value: uniqueProductCount.toString(), label: 'unique eligible products', Icon: Database },
              { value: totalSignals.toString(), label: 'attached change signals', Icon: FileCheck2 },
            ].map(({ value, label, Icon }) => (
              <article key={label} className="post-sidebar-card india-matchup-stat">
                <Icon size={15} aria-hidden="true" />
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="curated-india-matchups"
        className="home-section home-section--alt"
        aria-labelledby="curated-india-matchups-heading"
      >
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="curated-india-matchups-heading" className="section-title">
                <BookOpenCheck size={18} aria-hidden="true" />
                Curated India matchup library
              </h2>
              <p className="section-sub-text">
                Each page must add a distinct payout, checkout or trading-rule decision.
              </p>
            </div>
            <span className="section-sub">
              <Scale size={13} aria-hidden="true" /> Affiliate status contributes 0 points
            </span>
          </div>

          <div className="india-matchup-hub-grid">
            {matchups.map(matchup => (
              <article key={matchup.config.slug} className="india-matchup-hub-card">
                <div className="india-matchup-hub-firms">
                  {matchup.firms.map((firm, index) => (
                    <div key={firm.slug}>
                      <Image src={firm.logo} alt="" width={42} height={42} />
                      <strong>{firm.name}</strong>
                      {index === 0 && <span>vs</span>}
                    </div>
                  ))}
                </div>
                <span className="bento-tile-eyebrow">Decision question</span>
                <h3>{matchup.config.hubQuestion}</h3>
                <p>{matchup.config.hubSummary}</p>
                <div className="india-matchup-hub-tags">
                  {matchup.config.decisionTags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
                <dl>
                  <div>
                    <dt>Eligible products</dt>
                    <dd>{matchup.productCount}</dd>
                  </div>
                  <div>
                    <dt>Payout evidence</dt>
                    <dd>{matchup.payoutRails.join(' · ')}</dd>
                  </div>
                  <div>
                    <dt>India evidence</dt>
                    <dd>
                      {matchup.firms.map(firm =>
                        `${firm.name} ${firm.evidenceScore}/12`).join(' · ')}
                    </dd>
                  </div>
                  <div>
                    <dt>Commercial status</dt>
                    <dd>{matchup.partnerCount}/{matchup.firms.length} approved partner links</dd>
                  </div>
                </dl>
                <div className="india-matchup-hub-card-foot">
                  <span>Checked {dateLabel(matchup.latestCapture)}</span>
                  <Link href={indiaMatchupPath(matchup.config)} className="btn-primary">
                    Compare {matchup.config.title} <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="india-matchup-standard-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-standard-heading" className="section-title">
                The publication gate
              </h2>
              <p className="section-sub-text">
                A pair is not published merely because 2 firm names can be placed in a title.
              </p>
            </div>
          </div>
          <div className="india-matchup-decision-grid">
            {[
              ['1. Distinct decision', 'The page must answer an India-specific checkout, payout, KYC, risk-rule or product-choice question that another matchup does not.'],
              ['2. Current eligibility', 'Both firms must pass the dated RBI Alert List and country gate; every displayed product must pass the 30-day source gate.'],
              ['3. Exact products', 'Portfolio claims are calculated from current product records. Different phases, drawdown types and payout rules remain separate.'],
              ['4. Unknown stays unknown', 'Missing prices, payout dates and trading permissions never become cheap, immediate or allowed just to produce a winner.'],
            ].map(([title, copy]) => (
              <article key={title} className="india-matchup-decision-card">
                <strong>{title}</strong>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="india-matchup-hub-faq-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-hub-faq-heading" className="section-title">
                India comparison FAQ
              </h2>
            </div>
          </div>
          <div className="india-matchup-faq-grid">
            {faqs.map(item => (
              <article key={item.q} className="post-sidebar-card">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 760 }}>
            <span className="bento-tile-eyebrow">
              <IndianRupee size={12} aria-hidden="true" /> Need a different pair?
            </span>
            <h2 className="cta-final-title">
              Build an exact product shortlist
            </h2>
            <p className="cta-final-sub">
              Select 2–4 products and choose the constraint that matters. The decision memo
              remains shareable without creating another indexable thin page.
            </p>
            <div className="cta-final-row">
              <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-primary btn-glow">
                Open the India product comparison <ArrowRight size={15} />
              </Link>
              <Link href="/best-prop-firms-in-india/payout-methods" className="btn-outline">
                Compare payout rails
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
