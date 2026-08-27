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
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import {
  INDIA_EVIDENCE,
  passesIndiaRegulatoryCountryGate,
} from '@/lib/india'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const SITE = 'https://tradersfundhub.com'
const PATH = '/prop-firm-challenge-changes'
// These counts are a build-time consistency check for the social-card copy.
// Keep them aligned with the current dated watch ledger so a new verified
// change cannot strand the whole site on an older deployment.
const SOCIAL_CARD_ENTRY_COUNT = 16
const SOCIAL_CARD_FIRM_COUNT = 9
const SOCIAL_CARD_VERIFIED_COUNT = 5
const SOCIAL_CARD_WATCH_COUNT = 11

const TITLE = 'Prop Firm Challenge Changes & Rule Updates (2026)'
const DESCRIPTION =
  'Track dated prop-firm challenge price, rule and product-lineup changes with first-party sources, verification status and a plain-English trader impact.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Prop Firm Challenge Changes: Verified Rules & Price Watches',
    description:
      'A source-dated ledger of challenge rule, pricing and lineup changes — separated from promotions and rumours.',
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop Firm Challenge Changes & Rule Updates',
    description:
      'Verified changes, unresolved source conflicts and the practical impact on traders.',
  },
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function firmSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function affectedComparisonUrl(firm: string, productSlugs: string[]) {
  const path = '/prop-firm-challenges'
  if (!productSlugs.length) return `${path}#challenge-shortlist-heading`

  const params = new URLSearchParams({
    shortlist: productSlugs
      .slice(0, 4)
      .map(productSlug => `${firm}:${productSlug}`)
      .join(','),
  })
  return `${path}?${params.toString()}#challenge-shortlist-heading`
}

const FAQS = [
  {
    q: 'What counts as a prop-firm challenge change?',
    a: 'A dated change to a product lineup, entry price, billing model, profit target, loss limit, drawdown method, payout condition or other rule that can change a trader’s purchase decision.',
  },
  {
    q: 'What is the difference between Verified and Watch?',
    a: 'Verified means the firm’s own current material confirms the change. Watch means a promotion can move, first-party pages conflict, or a figure remains too unstable to publish as a permanent fact.',
  },
  {
    q: 'Are temporary prop-firm discounts treated as permanent prices?',
    a: 'No. A temporary code or rotating promotion is labelled as a price watch. The challenge comparison keeps a dated base or captured price and tells the trader to confirm the final checkout total.',
  },
  {
    q: 'How current is this change ledger?',
    a: 'Every entry is linked to a current challenge capture. Product datasets older than 30 days fail the editorial freshness gate and must be recaptured before they can remain current.',
  },
  {
    q: 'Does an India-screened badge mean the firm is RBI authorised?',
    a: 'No. It means only that the firm passed the separate dated country and RBI Alert List screen used by Traders Fund Hub. RBI says absence from its non-exhaustive Alert List is not authorisation.',
  },
  {
    q: 'What should I do when a rule changes?',
    a: 'Match the exact product name in your dashboard or checkout, save the applicable terms, and verify the new target, loss limit, drawdown, payout gate and fee before trading or resetting.',
  },
]

export default function Page() {
  const entries = getChallengeWatchEntries()
  const firms = getAllFirms()
  const challenges = getAllChallenges().filter(challenge => isChallengeFresh(challenge))
  const firmBySlug = new Map(firms.map(firm => [firmSlug(firm.name), firm]))
  const challengeByKey = new Map(challenges.map(challenge => [
    `${challenge.firmSlug}:${challenge.productSlug}`,
    challenge,
  ]))
  const validProductKeys = validateChallengeProductKeys(challenges.map(challenge =>
    `${challenge.firmSlug}:${challenge.productSlug}`))
  const indiaScreenedSlugs = new Set(
    INDIA_EVIDENCE
      .filter(passesIndiaRegulatoryCountryGate)
      .map(entry => entry.firmSlug),
  )

  const feedEntries: ChallengeChangeCardData[] = entries.map(entry => {
    const affectedProducts = entry.productSlugs.flatMap(productSlug => {
      const challenge = challengeByKey.get(`${entry.firmSlug}:${productSlug}`)
      return challenge ? [challenge] : []
    })
    const affectedProductSlugs = affectedProducts.map(product => product.productSlug)
    const completeProductMap = affectedProducts.length === entry.productSlugs.length
    return {
      ...entry,
      reviewUrl: firmBySlug.get(entry.firmSlug)?.reviewUrl || '/prop-firms',
      indiaScreened: indiaScreenedSlugs.has(entry.firmSlug),
      productKeys: affectedProductSlugs.map(productSlug => `${entry.firmSlug}:${productSlug}`),
      ...(completeProductMap ? {
        productNames: affectedProducts.map(product => product.productName),
        comparisonUrl: affectedComparisonUrl(entry.firmSlug, affectedProductSlugs),
        comparisonLabel: affectedProducts.length === 1
          ? `Open ${affectedProducts[0].productName}`
          : `Compare ${affectedProducts.length} affected products`,
      } : {}),
    }
  })

  const trackedFirmCount = new Set(entries.map(entry => entry.firmSlug)).size
  const verifiedCount = entries.filter(entry => entry.status === 'verified').length
  const watchCount = entries.filter(entry => entry.status === 'watch').length
  const indiaScreenedCount = entries.filter(entry =>
    indiaScreenedSlugs.has(entry.firmSlug)).length
  const latestCheckedAt = entries.map(entry => entry.lastCheckedAt).sort().at(-1)

  if (
    entries.length !== SOCIAL_CARD_ENTRY_COUNT
    || trackedFirmCount !== SOCIAL_CARD_FIRM_COUNT
    || verifiedCount !== SOCIAL_CARD_VERIFIED_COUNT
    || watchCount !== SOCIAL_CARD_WATCH_COUNT
  ) {
    throw new Error(
      `Refresh the challenge-changes social card: expected `
      + `${SOCIAL_CARD_ENTRY_COUNT} entries/${SOCIAL_CARD_FIRM_COUNT} firms/`
      + `${SOCIAL_CARD_VERIFIED_COUNT} verified/${SOCIAL_CARD_WATCH_COUNT} watches, `
      + `received ${entries.length}/${trackedFirmCount}/${verifiedCount}/${watchCount}`,
    )
  }

  const stats: Array<{ value: string; label: string; Icon: LucideIcon }> = [
    { value: entries.length.toString(), label: 'dated change notes', Icon: BellRing },
    { value: trackedFirmCount.toString(), label: 'firms affected', Icon: Database },
    { value: verifiedCount.toString(), label: 'verified changes', Icon: BadgeCheck },
    { value: watchCount.toString(), label: 'open watches', Icon: CircleAlert },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firms', url: '/prop-firms' },
    { name: 'Challenge Changes' },
  ])
  const faq = faqPageSchema(FAQS)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Prop Firm Challenge Changes and Rule Updates',
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
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            {entries.length} dated updates · {trackedFirmCount} firms
            {latestCheckedAt ? ` · checked through ${dateLabel(latestCheckedAt)}` : ''}
          </div>
          <h1 className="blog-hero-title">
            Prop firm challenge changes, <span className="gradient-text">with receipts.</span>
          </h1>
          <p className="blog-hero-sub">
            Follow pricing, rule and product-lineup changes that can alter a purchase or payout
            decision. Every note separates verified facts from open watches and links to the
            firm&apos;s own published material.
          </p>
          <div className="challenge-change-hero-actions">
            <Link href="#change-ledger" className="btn-primary btn-glow">
              See the latest changes <ArrowRight size={15} />
            </Link>
            <Link href="/prop-firm-challenges" className="btn-outline">
              Compare current challenges
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-outline">
              India-screened challenges
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-changes" className="btn-outline">
              India change newsroom
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
                Editorial rule
              </span>
              <h2>Announcements are not automatically evidence.</h2>
            </div>
            <p>
              A launch post or discount can signal what to investigate, but it does not become a
              verified change here until the exact product, rule or price is traceable to current
              first-party material. Unresolved conflicts stay labelled as watches.
            </p>
          </div>
        </div>
      </section>

      <section
        id="change-ledger"
        className="home-section"
        aria-labelledby="change-ledger-heading"
      >
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="change-ledger-heading" className="section-title">
                <ScanSearch size={18} aria-hidden="true" />
                Challenge change ledger
              </h2>
              <p className="section-sub-text">
                Search by firm or rule, then filter verified changes, price watches, product
                lineups and source conflicts.
              </p>
            </div>
            <span className="section-sub">
              <FileCheck2 size={13} aria-hidden="true" />
              First-party sources only
            </span>
          </div>
          <ChallengeChangeFeed entries={feedEntries} surface="global" validProductKeys={validProductKeys} />
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="challenge-change-india">
            <div className="challenge-change-india-icon" aria-hidden="true">
              <IndianRupee size={20} />
            </div>
            <div>
              <span className="bento-tile-eyebrow">India decision layer</span>
              <h2>{indiaScreenedCount} current updates involve India-screened firms.</h2>
              <p>
                The badge applies our separate country and RBI Alert List gate. It does not prove
                RBI authorisation, successful Indian checkout, KYC or payout completion.
              </p>
            </div>
            <Link href="/best-prop-firms-in-india/challenge-changes" className="btn-outline">
              Open the India change feed <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="change-method-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="change-method-heading" className="section-title">
                <ShieldCheck size={18} aria-hidden="true" />
                How a change reaches this page
              </h2>
              <p className="section-sub-text">
                The monitoring pipeline detects differences; an editor decides what the evidence supports.
              </p>
            </div>
          </div>
          <div className="challenge-change-method-grid">
            {[
              ['1. Recapture', 'The firm’s current pricing and rule pages are captured with dated field-level evidence.'],
              ['2. Compare', 'A semantic diff ignores capture-date churn and flags material price, target, loss, payout or lineup changes.'],
              ['3. Verify', 'The new value must be supported on the firm’s own domain; conflicts remain unresolved instead of being averaged.'],
              ['4. Publish impact', 'The ledger explains what changed, what remains uncertain and what the trader should confirm before acting.'],
            ].map(([title, copy]) => (
              <article key={title} className="post-sidebar-card">
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="change-faq-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="change-faq-heading" className="section-title">
                Challenge-change questions
              </h2>
            </div>
          </div>
          <div className="challenge-change-faq">
            {FAQS.map(item => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
