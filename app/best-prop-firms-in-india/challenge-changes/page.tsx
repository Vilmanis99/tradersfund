import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CircleAlert,
  Database,
  FileCheck2,
  IndianRupee,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react'
import ChallengeChangeFeed, {
  type ChallengeChangeCardData,
} from '@/components/ChallengeChangeFeed'
import { validateChallengeProductKeys } from '@/lib/challengeChangeFocus'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { buildIndiaMatcherFirms } from '@/lib/indiaMatcher'
import { buildLandingPayload, getLandingBySlug } from '@/lib/landings'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const SITE = 'https://tradersfundhub.com'
const PATH = '/best-prop-firms-in-india/challenge-changes'
const SOCIAL_CARD_ENTRY_COUNT = 12
const SOCIAL_CARD_FIRM_COUNT = 6
const SOCIAL_CARD_PRODUCT_COUNT = 16
const SOCIAL_CARD_VERIFIED_COUNT = 2
const SOCIAL_CARD_WATCH_COUNT = 10

export const metadata: Metadata = {
  title: { absolute: 'Prop Firm Challenge Changes India (2026)' },
  description:
    'Track verified price, rule and lineup changes affecting India-screened prop firms, with first-party sources, RBI screening and exact products.',
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Prop Firm Challenge Changes for India',
    description:
      'A source-dated India newsroom for material challenge changes, open watches and exact affected products.',
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop Firm Challenge Changes India',
    description:
      'Verified changes and open watches after India eligibility, RBI and product-freshness screening.',
  },
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function affectedComparisonUrl(firmSlug: string, productSlugs: string[]) {
  const path = '/best-prop-firms-in-india/challenge-comparison'
  if (!productSlugs.length) return `${path}#india-challenge-shortlist-heading`

  const params = new URLSearchParams({
    shortlist: productSlugs
      .slice(0, 4)
      .map(productSlug => `${firmSlug}:${productSlug}`)
      .join(','),
    priority: 'evidence',
  })
  return `${path}?${params.toString()}#india-challenge-shortlist-heading`
}

export default function Page() {
  const landing = getLandingBySlug('best-prop-firms-in-india')
  if (!landing) throw new Error('India landing configuration is missing')

  const { ranked } = buildLandingPayload(landing)
  const indiaFirms = buildIndiaMatcherFirms(ranked.map(entry => entry.firm))
  const firmBySlug = new Map(indiaFirms.map(firm => [firm.slug, firm]))
  const validProductKeys = validateChallengeProductKeys(indiaFirms.flatMap(firm =>
    firm.products.map(product => `${firm.slug}:${product.slug}`)))
  const globalEntries = getChallengeWatchEntries()

  const entries = globalEntries.flatMap<ChallengeChangeCardData>(entry => {
    const firm = firmBySlug.get(entry.firmSlug)
    if (!firm) return []

    const affectedProducts = firm.products.filter(product =>
      entry.productSlugs.includes(product.slug))
    if (!affectedProducts.length) return []

    return [{
      ...entry,
      reviewUrl: firm.reviewUrl,
      indiaScreened: true,
      productKeys: affectedProducts.map(product => `${firm.slug}:${product.slug}`),
      productNames: affectedProducts.map(product => product.name),
      comparisonUrl: affectedComparisonUrl(
        firm.slug,
        affectedProducts.map(product => product.slug),
      ),
      comparisonLabel:
        affectedProducts.length === 1
          ? `Open ${affectedProducts[0].name}`
          : `Compare ${affectedProducts.length} affected products`,
    }]
  })

  const trackedFirmCount = new Set(entries.map(entry => entry.firmSlug)).size
  const affectedProductKeys = new Set(entries.flatMap(entry => entry.productKeys))
  const affectedProductCount = affectedProductKeys.size
  const verifiedCount = entries.filter(entry => entry.status === 'verified').length
  const watchCount = entries.filter(entry => entry.status === 'watch').length
  const excludedGlobalCount = globalEntries.length - entries.length
  const latestCheckedAt = entries.map(entry => entry.lastCheckedAt).sort().at(-1)
  const rbiListUpdatedAt = indiaFirms
    .map(firm => firm.rbiAlert.sourceListUpdatedAt)
    .sort()
    .at(-1)

  if (
    entries.length !== SOCIAL_CARD_ENTRY_COUNT
    || trackedFirmCount !== SOCIAL_CARD_FIRM_COUNT
    || affectedProductCount !== SOCIAL_CARD_PRODUCT_COUNT
    || verifiedCount !== SOCIAL_CARD_VERIFIED_COUNT
    || watchCount !== SOCIAL_CARD_WATCH_COUNT
  ) {
    throw new Error(
      `Refresh the India challenge-changes social card: expected `
      + `${SOCIAL_CARD_ENTRY_COUNT} entries/${SOCIAL_CARD_FIRM_COUNT} firms/`
      + `${SOCIAL_CARD_PRODUCT_COUNT} products/${SOCIAL_CARD_VERIFIED_COUNT} verified/`
      + `${SOCIAL_CARD_WATCH_COUNT} watches, received `
      + `${entries.length}/${trackedFirmCount}/${affectedProductCount}/`
      + `${verifiedCount}/${watchCount}`,
    )
  }

  const stats: Array<{ value: string; label: string; Icon: LucideIcon }> = [
    { value: entries.length.toString(), label: 'India-screened updates', Icon: BellRing },
    { value: trackedFirmCount.toString(), label: 'eligible firms affected', Icon: Database },
    { value: affectedProductCount.toString(), label: 'current products affected', Icon: IndianRupee },
    { value: watchCount.toString(), label: 'open watches', Icon: CircleAlert },
  ]

  const faqs = [
    {
      q: 'What qualifies for the India challenge-change page?',
      a: `A change must appear in the source-dated global ledger, involve a firm that passes the current India country and RBI Alert List gate, and still map to at least 1 product inside the 30-day capture window. ${entries.length} updates currently pass all 3 tests.`,
    },
    {
      q: 'Why are some global prop-firm changes excluded?',
      a: `${excludedGlobalCount} global change notes are currently excluded because the affected firm or product does not pass the same India eligibility and freshness gate used by the India ranking and comparison.`,
    },
    {
      q: 'What is the difference between Verified and Watch?',
      a: `Verified means the firm’s current first-party material confirms the material change. Watch means a price can move, official pages conflict, or a figure remains too unstable to publish as a settled fact. The current India feed contains ${verifiedCount} verified change and ${watchCount} open watches.`,
    },
    {
      q: 'Does India-screened mean RBI authorised?',
      a: `No. The screen excludes firms named on the RBI Alert List dated ${rbiListUpdatedAt ? dateLabel(rbiListUpdatedAt) : 'the latest captured update'}, but RBI says absence from its non-exhaustive list is not authorisation.`,
    },
    {
      q: 'Are changed challenge prices converted to Indian rupees?',
      a: 'No. USD and EUR prices remain in their published currency. A rupee amount depends on the payment provider’s live rate, spread, taxes and fees, so a permanent INR claim would become misleading.',
    },
    {
      q: 'How often should traders recheck a watched rule?',
      a: 'Recheck the exact product and checkout immediately before purchase, reset or payout request. The weekly freshness queue flags old captures, while the 30-day gate removes stale products from this India projection.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Best Prop Firms in India', url: '/best-prop-firms-in-india' },
    { name: 'Challenge Changes India' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Prop Firm Challenge Changes for India',
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE}${PATH}#${entry.id}`,
      name: entry.title,
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
          <Link href="/best-prop-firms-in-india" className="post-back">
            ← Best prop firms in India
          </Link>
          <div className="hero-eyebrow" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            {entries.length} India-screened updates · {affectedProductCount} products
            {latestCheckedAt ? ` · checked through ${dateLabel(latestCheckedAt)}` : ''}
          </div>
          <h1 className="blog-hero-title">
            Challenge changes that still <span className="gradient-text">matter in India.</span>
          </h1>
          <p className="blog-hero-sub">
            Follow material price, rule and lineup changes only after the affected firm passes
            the current India gate. Every note names the exact products, separates verified
            changes from open watches, and links to first-party evidence.
          </p>
          <div className="challenge-change-hero-actions">
            <Link href="#india-change-ledger" className="btn-primary btn-glow">
              See India updates <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-outline">
              Compare current products
            </Link>
            <Link href="/prop-firm-challenge-changes" className="btn-outline">
              Open the global ledger
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section challenge-change-stats">
        <div className="home-shell">
          <div className="challenge-change-stat-grid">
            {stats.map(({ value, label, Icon }) => (
              <article key={label} className="post-sidebar-card challenge-change-stat">
                <Icon size={16} aria-hidden="true" />
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section challenge-change-principle">
        <div className="home-shell">
          <div className="challenge-change-principle-card">
            <div>
              <span className="bento-tile-eyebrow">
                <ShieldCheck size={12} aria-hidden="true" />
                India publication gate
              </span>
              <h2>Global news does not automatically become India guidance.</h2>
            </div>
            <p>
              {excludedGlobalCount} of {globalEntries.length} current global notes are excluded.
              Inclusion requires current country evidence, no RBI Alert List match, a fresh
              affected product and a first-party source. Affiliate status contributes 0 points.
            </p>
          </div>
        </div>
      </section>

      <section
        id="india-change-ledger"
        className="home-section"
        aria-labelledby="india-change-ledger-heading"
      >
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-change-ledger-heading" className="section-title">
                <ScanSearch size={18} aria-hidden="true" />
                India challenge-change ledger
              </h2>
              <p className="section-sub-text">
                Search the {entries.length} current updates, then open the exact affected products
                in the India comparison without losing Verified or Watch context.
              </p>
            </div>
            <span className="section-sub">
              <FileCheck2 size={13} aria-hidden="true" />
              First-party sources only
            </span>
          </div>
          <ChallengeChangeFeed entries={entries} surface="india" validProductKeys={validProductKeys} />
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="india-change-impact-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-change-impact-heading" className="section-title">
                How each signal changes the decision
              </h2>
              <p className="section-sub-text">
                A changed rule, price and source conflict require different action before checkout.
              </p>
            </div>
          </div>
          <div className="india-matchup-decision-grid">
            {[
              ['Price watch', 'Keep the published USD or EUR denomination, then calculate INR from the final checkout rate and fees—not a promotional headline.'],
              ['Rule change', 'Match the dashboard product name after a reset or migration; a legacy account can follow a different target or loss rule.'],
              ['Source conflict', 'Do not average 2 official figures. Keep the product-specific value only when its label is explicit, then verify checkout.'],
              ['Lineup change', 'Treat different phases, drawdown methods and billing models as separate products; a generic firm-level fee is not enough.'],
            ].map(([title, copy]) => (
              <article key={title} className="india-matchup-decision-card">
                <strong>{title}</strong>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="india-change-method-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-change-method-heading" className="section-title">
                <ShieldCheck size={18} aria-hidden="true" />
                From source change to India alert
              </h2>
            </div>
          </div>
          <div className="challenge-change-method-grid">
            {[
              ['1. Recapture', 'Capture the firm’s current pricing and rule pages with dated field-level evidence.'],
              ['2. Diff', 'Ignore routine date churn and surface material price, target, loss, payout or lineup changes.'],
              ['3. Apply India gate', 'Require current country evidence, no RBI Alert List match and at least 1 fresh affected product.'],
              ['4. Publish impact', 'Label Verified or Watch, name the products and state what the trader should recheck before acting.'],
            ].map(([title, copy]) => (
              <article key={title} className="post-sidebar-card">
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="india-change-faq-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-change-faq-heading" className="section-title">
                India challenge-change questions
              </h2>
            </div>
          </div>
          <div className="challenge-change-faq">
            {faqs.map(item => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 760 }}>
            <span className="bento-tile-eyebrow">
              <BadgeCheck size={12} aria-hidden="true" /> Recheck before acting
            </span>
            <h2 className="cta-final-title">
              Move from the alert to the exact product
            </h2>
            <p className="cta-final-sub">
              Use the source link to verify the change, then compare the affected product’s
              current cost, drawdown, payout and trading rules before purchase or reset.
            </p>
            <div className="cta-final-row">
              <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-primary btn-glow">
                Compare India products <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/best-prop-firms-in-india/compare" className="btn-outline">
                Browse curated matchups
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
