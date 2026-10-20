import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllFirms, getAllChallenges, isChallengeFresh } from '@/lib/firms'
import { jsonLd } from '@/lib/schema'
import NewsletterForm from '@/components/NewsletterForm'
import EnglishFinderEntry from '@/components/EnglishFinderEntry'
import { buildChallengeComparisonRows } from '@/lib/challengeComparisonData'
import { isNewsletterConfigured } from '@/lib/brevo'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { ArrowRight } from 'lucide-react'
import { faqPageSchema } from '@/lib/schema'
import HeroBlock from '@/components/home/HeroBlock'
import TrustBar from '@/components/home/TrustBar'
import ComparisonTable from '@/components/home/ComparisonTable'
import FeaturedOfferCard from '@/components/home/FeaturedOfferCard'
import DisclosureNote from '@/components/home/DisclosureNote'
import Guides from '@/components/home/Guides'
import HomeFaq from '@/components/home/HomeFaq'
import { getHomeComparisonRows, getHomeCounters, getVerifiedCode } from '@/components/home/homeData'

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

const faqs = [
  { q: 'What is a prop firm?', a: 'A company that sells access to a simulated evaluation. If you meet its profit target without breaking the loss limits, it may offer a funded stage and a share of the profit under its own contract.' },
  { q: 'Is the cheapest fee the best deal?', a: 'Not always. Compare the loss limits, profit target, activation fees and payout rules too. The fee is only part of the cost of reaching a payout.' },
  { q: 'How current is this data?', a: 'Every programme shows the date its source was last checked. Programmes whose sources are too old are dropped from the comparison until they are rechecked.' },
]

export default function Home() {
  const newsletterEnabled = isNewsletterConfigured()
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const watchEntries = getChallengeWatchEntries()
  const rows = buildChallengeComparisonRows(challenges, firms, watchEntries)
  const tableRows = getHomeComparisonRows('en')
  const counters = getHomeCounters()
  const partners = primaryPartners.flatMap(partner => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === partner.slug)
    if (!firm?.affiliateUrl) return []
    const products = challenges.filter(product => product.firmSlug === partner.slug)
    const fresh = products.length > 0 && products.every(product => isChallengeFresh(product))
    const cheapest = tableRows.find(row => row.firmSlug === partner.slug)
    return [{
      ...partner,
      firm,
      fresh,
      cheapest,
      productCount: products.length,
      // The oldest supporting capture must not be masked by a newer one.
      capturedAt: fresh ? products.map(product => product.sourceCapturedAt).sort()[0] : null,
    }]
  })

  return (
    <div className="th-home home--product-led home--focused" data-english-home-layout="focused">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <HeroBlock
        id="home-heading"
        eyebrow="Independent · source-dated prop-firm comparisons"
        title={<>Prop firms. <em>Rules you can compare.</em></>}
        lead="Compare participation fees, loss limits, profit split and payout rules for every firm we track. Each value links back to a dated source."
        actions={[{ href: '#home-compare', label: 'Compare firms' }, { href: '/prop-firm-discount-codes', label: 'Discount codes', variant: 'secondary' }]}
        counters={[
          { value: String(counters.firms), label: 'firms tracked' },
          { value: String(counters.freshProducts), label: 'programmes with fresh sources' },
          { value: String(watchEntries.length), label: 'dated rule notes' },
          { value: counters.latestCheck ?? '—', label: 'latest source check' },
        ]}
        aside={
          <div className="home-finder-panel" id="home-programmes">
            <h2>Compare programmes</h2>
            <EnglishFinderEntry rows={rows} />
            <p className="home-finder-note">Account size is not the purchase price. Check country eligibility before paying.</p>
          </div>
        }
      />

      <TrustBar
        label="Why trust this comparison"
        items={[
          { label: 'How we score firms', href: '/methodology' },
          { label: 'Every number has a source date', href: '/prop-firm-challenge-changes' },
          { label: 'Placement is never sold as a ranking' },
          { label: 'Affiliate links are labelled' },
          { label: 'Читать по-русски', href: '/ru', hrefLang: 'ru' },
        ]}
      />

      <section className="th-section" id="home-compare" aria-labelledby="home-compare-heading" data-english-home-comparison="cheapest-per-firm">
        <div className="th-wrap">
          <div className="th-section__head">
            <div>
              <h2 id="home-compare-heading">Compare programmes</h2>
              <p>$50,000 account · cheapest source-fresh programme per firm · sorted by our score. Currencies are not converted.</p>
            </div>
            <span className="th-row-actions"><Link href="/prop-firms" className="th-link">Firm directory</Link><Link href="/prop-firm-challenges" className="th-link">Full challenge comparison <ArrowRight size={14} aria-hidden="true" /></Link></span>
          </div>
          <ComparisonTable rows={tableRows} locale="en" placement="home-comparison" />
          <DisclosureNote summary={<>Some links earn us a commission. Order is by score, not payment. Account size is not the price. <Link href="/methodology">Method</Link></>} />
        </div>
      </section>

      {partners.length > 0 && (
        <section className="th-section th-section--alt" aria-labelledby="home-partners-heading" data-english-home-partners="single-section">
          <div className="th-wrap">
            <div className="th-section__head">
              <div>
                <h2 id="home-partners-heading">Our commercial partners</h2>
                <p data-english-home-affiliate-disclosure="primary-partners">
                  We may earn a commission through these links. This placement is commercial,
                  not a ranking or a recommendation for every trader.
                </p>
              </div>
              <Link href="/methodology" className="th-link">How we review <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <div className="th-offers">
              {partners.map(partner => (
                <FeaturedOfferCard
                  key={partner.slug}
                  locale="en"
                  firmSlug={partner.slug}
                  firmName={partner.firm.name}
                  logo={partner.firm.logo}
                  score={partner.firm.score}
                  placement="home-partners"
                  code={getVerifiedCode(partner.slug)}
                  data={{ 'data-english-home-partner': partner.slug, 'data-source-status': partner.fresh ? 'fresh' : 'recapture-required' }}
                  facts={[
                    ...(partner.cheapest ? [{ label: 'Fee from ($50k)', value: partner.cheapest.priceBreakdown ?? new Intl.NumberFormat('en-US', { style: 'currency', currency: partner.cheapest.currency, maximumFractionDigits: 0 }).format(partner.cheapest.price) }] : []),
                    ...(partner.firm.maxAllocation ? [{ label: 'Max allocation', value: partner.firm.maxAllocation.split(/[;(]| per /)[0].trim() }] : []),
                  ]}
                  primary={<Link href={partner.href} prefetch={false} rel="sponsored nofollow noopener" target="_blank" className="th-btn th-btn--amber">Check {partner.firm.name} terms</Link>}
                  secondary={<Link href={partner.firm.reviewUrl} className="th-btn th-btn--ghost">Read {partner.firm.name} review</Link>}
                >
                  <p className="home-evidence-note">
                    {partner.fresh
                      ? <><span data-english-home-partner-products={partner.productCount}>{partner.productCount} programmes with current source checks</span> · Oldest check: <time dateTime={partner.capturedAt!}>{partner.capturedAt}</time></>
                      : 'Programme sources need rechecking. The review is dated material, not confirmation of current terms.'}
                  </p>
                </FeaturedOfferCard>
              ))}
            </div>
          </div>
        </section>
      )}

      <Guides
        id="home-guides-heading"
        title="Understand the challenge"
        more={<Link href="/blog" className="th-link">All reviews and guides <ArrowRight size={14} aria-hidden="true" /></Link>}
        data={{ 'data-english-home-guides': 'selected-three' }}
        items={selectedGuides.map(guide => ({ ...guide, data: { 'data-english-home-guide': 'selected' } }))}
        links={[
          { href: '/compare', title: 'Compare two firms', description: 'Read the differences between their programmes and rules.' },
          { href: '/prop-firm-challenge-changes', title: 'Check recent rule notes', description: `${watchEntries.length} dated notes, including verified changes and source conflicts.` },
          { href: '/best-prop-firms-in-india', title: 'Trading from India?', description: 'Start with the country-specific evidence screen.' },
        ]}
      />
      {newsletterEnabled && (
        <div className="th-wrap"><div className="home-digest">
          <div><h3>Rule-change email digest</h3><p>Receive updates without checking the change feed yourself.</p></div>
          <NewsletterForm placement="home-digest" />
        </div></div>
      )}

      <HomeFaq id="home-faq-heading" title="Questions" items={faqs} />
    </div>
  )
}
