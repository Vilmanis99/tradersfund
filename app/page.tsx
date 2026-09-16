import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getAllFirms, getAllChallenges, isChallengeFresh } from '@/lib/firms'
import { organizationSchema, websiteSchema, jsonLd } from '@/lib/schema'
import NewsletterForm from '@/components/NewsletterForm'
import EnglishFinderEntry from '@/components/EnglishFinderEntry'
import { buildChallengeComparisonRows } from '@/lib/challengeComparisonData'
import { isNewsletterConfigured } from '@/lib/brevo'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { ArrowRight, ArrowUpRight, ExternalLink } from 'lucide-react'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Best Prop Firm Reviews & Comparisons',
  description: 'Independent prop-firm reviews, side-by-side comparisons, and rule-change alerts. Every firm reviewed against the same rubric.',
  alternates: { canonical: '/', languages: getLanguageAlternates('/') },
  openGraph: {
    title: 'Traders Fund Hub | Best Prop Firm Reviews & Comparisons',
    description: 'Independent prop-firm reviews, side-by-side comparisons, and rule-change alerts. Same rubric, every firm.',
    url: '/',
    type: 'website',
  },
}

// Commercial placement is explicit and separate from the alphabetical finder.
// Retain the existing campaigns so this redesign does not reset attribution.
const primaryPartners = [
  { slug: 'fundednext', href: '/go/fundednext?from=home-fundednext-spotlight' },
  { slug: 'bright-funded', href: '/go/bright-funded?from=home-partners' },
] as const

const selectedGuides = [
  {
    href: '/how-prop-firm-challenges-work',
    label: 'Start here',
    title: 'How prop-firm challenges work',
    description: 'Understand the evaluation, the funded stage, and what you are paying for.',
  },
  {
    href: '/true-cost-of-prop-firm-challenges',
    label: 'Understand the cost',
    title: 'The fee is only part of the comparison',
    description: 'Separate checkout fees, recurring costs and fee-recovery assumptions.',
  },
  {
    href: '/how-to-pass-a-prop-firm-challenge',
    label: 'Before trading',
    title: 'Build a plan around the challenge rules',
    description: 'Check loss limits and trading restrictions before placing the first trade.',
  },
] as const

export default function Home() {
  const newsletterEnabled = isNewsletterConfigured()
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const watchEntries = getChallengeWatchEntries()
  const rows = buildChallengeComparisonRows(challenges, firms, watchEntries)
  const partners = primaryPartners.flatMap(partner => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === partner.slug)
    if (!firm?.affiliateUrl) return []
    const products = challenges.filter(product => product.firmSlug === partner.slug)
    const fresh = products.length > 0 && products.every(product => isChallengeFresh(product))
    return [{
      ...partner,
      firm,
      fresh,
      productCount: products.length,
      // The oldest supporting capture must not be masked by a newer one.
      capturedAt: fresh ? products.map(product => product.sourceCapturedAt).sort()[0] : null,
    }]
  })

  return (
    <div className="home--product-led home--focused" data-english-home-layout="focused">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }} />

      <section className="hero-aurora" aria-labelledby="home-heading">
        <div className="hero-shell hero-shell--split">
          <div className="hero-copy">
            <span className="hero-eyebrow">Source-dated prop-firm comparisons</span>
            <h1 className="hero-title" id="home-heading">
              Prop firms.<br /><span className="gradient-text">Rules you can compare.</span>
            </h1>
            <p className="hero-sub">
              Compare participation fees, loss limits and payout rules.
              Choose your account requirements and start with programmes
              backed by dated sources.
            </p>
            <Link href="/prop-firms" className="section-link">
              Browse the firm directory <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-finder-panel" id="home-programmes">
            <h2>Compare programmes</h2>
            <EnglishFinderEntry rows={rows} />
            <p className="home-finder-note">
              Account size is not the purchase price. Check country eligibility before paying.
            </p>
          </div>
        </div>
      </section>

      <div className="home-category-section" role="navigation" aria-label="Browse the evidence library" data-english-home-category-rail="decision-first">
        <div className="home-shell">
          <div className="home-category-rail">
            <span className="home-category-rail__label">Browse by decision</span>
            <nav className="home-category-rail__links" aria-label="Decision shortcuts">
              <Link href="/prop-firms">Firm directory <ArrowUpRight size={14} aria-hidden="true" /></Link>
              <Link href="/compare">Compare two firms <ArrowUpRight size={14} aria-hidden="true" /></Link>
              <Link href="/prop-firm-challenge-changes">Rule changes <ArrowUpRight size={14} aria-hidden="true" /></Link>
              <Link href="/ru" hrefLang="ru">Russian edition <ArrowUpRight size={14} aria-hidden="true" /></Link>
              <Link href="/methodology">Our method <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </nav>
          </div>
        </div>
      </div>

      {partners.length > 0 && (
        <section className="home-section" aria-labelledby="home-partners-heading" data-english-home-partners="single-section">
          <div className="home-shell">
            <div className="section-head">
              <div>
                <h2 className="section-title" id="home-partners-heading">Our commercial partners</h2>
                <p className="section-sub-text" data-english-home-affiliate-disclosure="primary-partners">
                  We may earn a commission through these links. This placement is commercial,
                  not a ranking or a recommendation for every trader.
                </p>
              </div>
              <Link href="/methodology" className="section-link">How we review <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="home-partner-grid">
              {partners.map(partner => (
                <article key={partner.slug} className="home-partner" data-english-home-partner={partner.slug} data-source-status={partner.fresh ? 'fresh' : 'recapture-required'}>
                  <div className="home-partner-brand">
                    {partner.firm.logo && <Image src={partner.firm.logo} alt="" width={48} height={48} className="home-partner-logo" />}
                    <h3>{partner.firm.name}</h3>
                  </div>
                  <p>
                    Read the programme-by-programme review before choosing an account.
                    Compare evaluation stages, drawdown rules and payout conditions.
                  </p>
                  <p className="home-evidence-note">
                    {partner.fresh
                      ? <><span data-english-home-partner-products={partner.productCount}>{partner.productCount} programmes with current source checks</span> · Oldest check: <time dateTime={partner.capturedAt!}>{partner.capturedAt}</time></>
                      : 'Programme sources need rechecking. The review is dated material, not confirmation of current terms.'}
                  </p>
                  <div className="home-partner-actions">
                    <Link href={partner.firm.reviewUrl} className="btn-outline">Read {partner.firm.name} review</Link>
                    <Link href={partner.href} prefetch={false} rel="sponsored nofollow noopener" target="_blank" className="section-link">
                      Check {partner.firm.name} terms <ExternalLink size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-section home-section--alt" aria-labelledby="home-tools-heading" data-english-home-tools="decision-links">
        <div className="home-shell home-decision-layout">
          <div className="home-decision-intro">
            <h2 className="section-title" id="home-tools-heading">Before you pay</h2>
            <p>A shortlist is a starting point. Confirm the rules, your country eligibility and the terms at checkout.</p>
            <Link href="/ru" className="section-link" hrefLang="ru" lang="ru">Читать по-русски <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="home-decision-links">
            <Link href="/compare">
              <span><strong>Compare two firms</strong><span>Read the differences between their programmes and rules.</span></span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <Link href="/prop-firm-challenge-changes">
              <span><strong>Check recent rule notes</strong><span>{watchEntries.length} dated notes, including verified changes and unresolved source conflicts.</span></span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <Link href="/best-prop-firms-in-india">
              <span><strong>Trading from India?</strong><span>Start with the country-specific evidence screen and challenge comparison.</span></span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-guides-heading" data-english-home-guides="selected-three">
        <div className="home-shell">
          <div className="section-head">
            <h2 className="section-title" id="home-guides-heading">Understand the challenge</h2>
            <Link href="/blog" className="section-link">All reviews and guides <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="home-guide-grid">
            {selectedGuides.map(guide => (
              <Link key={guide.href} href={guide.href} className="home-guide" data-english-home-guide="selected">
                <span className="home-guide-label">{guide.label}</span>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {newsletterEnabled && (
            <div className="home-digest">
              <div><h3>Rule-change email digest</h3><p>Receive updates without checking the change feed yourself.</p></div>
              <NewsletterForm placement="home-digest" />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
