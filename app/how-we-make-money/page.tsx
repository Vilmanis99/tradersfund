import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import { getAllFirms } from '@/lib/firms'
import { firmSlug } from '@/lib/firmSlug'
import { REVIEWED_OUTBOUND_DESTINATIONS } from '@/lib/outboundDestinations'

import { HOW_WE_MAKE_MONEY_UPDATED as PAGE_UPDATED, PARTNERSHIP_POLICY } from '@/lib/trustPages'

// Partner lists below are read from content/data/firms.json and
// lib/outboundDestinations.ts at build time.
const PATH = '/how-we-make-money'

export const metadata: Metadata = {
  title: 'How We Make Money: Affiliate Links and Partners',
  description:
    'Which prop firms pay Traders Fund Hub a commission, how our /go links work, and why a partnership never changes a firm’s score.',
  alternates: { canonical: PATH },
  openGraph: { title: 'How We Make Money', url: PATH, type: 'article' },
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function HowWeMakeMoneyPage() {
  const firms = getAllFirms()
  const partners = firms
    .filter(firm => Boolean(firm.affiliateUrl) && firm.affiliateStatus === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
  // Data-consistency guard: an affiliate URL without "active" status (or the
  // reverse) is shown separately instead of silently counted either way.
  const inconsistent = firms.filter(firm => Boolean(firm.affiliateUrl) !== (firm.affiliateStatus === 'active'))
  const nonPartners = firms.filter(firm => !firm.affiliateUrl)
  const tools = Object.entries(REVIEWED_OUTBOUND_DESTINATIONS)
  const paidTools = tools.filter(([, destination]) => destination.affiliateUrl)
  const ranked = [...firms].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'How we make money' }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>Last updated {formatDate(PAGE_UPDATED)}</div>
          <h1 className="blog-hero-title">How we make money</h1>
          <p className="blog-hero-sub">
            Some firm links on this site are affiliate links. If you buy a challenge through one, the firm may pay us a commission. You pay the same price.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="tf-trust" data-trust-page="how-we-make-money">
          <h2>Firms that pay us</h2>
          <p>
            We track {firms.length} prop firms. {partners.length === 0 ? 'None of them currently pays us.' : `${partners.length} of them ${partners.length === 1 ? 'has' : 'have'} an active affiliate link with us:`}
          </p>
          {partners.length > 0 && (
            <table className="tf-trust__table" data-affiliate-partners={partners.length}>
              <caption className="hidden-caption">Prop firms with an active Traders Fund Hub affiliate link</caption>
              <thead><tr><th scope="col">Firm</th><th scope="col">Relationship</th><th scope="col">Our review</th></tr></thead>
              <tbody>
                {partners.map(firm => (
                  <tr key={firm.name} data-affiliate-partner={firmSlug(firm.name)}>
                    <td>{firm.name}</td>
                    <td>Affiliate link: we may earn a commission on a purchase</td>
                    <td><Link href={firm.reviewUrl}>{firm.name} review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {inconsistent.length > 0 && (
            <p data-affiliate-status-mismatch>
              Our records for {inconsistent.map(firm => firm.name).join(', ')} are being rechecked: the affiliate link and the partner status do not agree.
            </p>
          )}
          <p>
            The other {nonPartners.length} firms do not pay us. Links to them go to the firm’s own website with no tracking code.
            {paidTools.length === 0
              ? ` None of the ${tools.length} trading tools we review pays us either.`
              : ` ${paidTools.length} of the ${tools.length} trading tools we review also ${paidTools.length === 1 ? 'pays' : 'pay'} us.`}
          </p>

          <h2>How our links work</h2>
          <ul>
            <li>Firm sign-up links go through one redirect, <code>/go/&lt;firm&gt;</code>. For a partner it opens our affiliate link, tagged <code>utm_source=tradersfundhub</code>, <code>utm_medium=affiliate</code> and the page placement, so the firm can credit the click. For every other firm it opens the official website without any tracking code. A few tables also link straight to a non-partner’s official site; those links are not tracked either.</li>
            <li>Partner links carry <code>rel=&quot;sponsored&quot;</code>, and pages that contain them carry an affiliate disclosure. Links to non-partners are not marked as sponsored.</li>
            <li>For each click we record only the firm, the page placement and the language. That click record contains no IP address, browser details or referrer.</li>
            <li>The <code>/go</code> redirects are excluded from search indexing.</li>
          </ul>

          <h2>What a partnership can and can’t buy</h2>
          <p data-partnership-policy>{PARTNERSHIP_POLICY.en}</p>
          <ul>
            <li><strong>Scores.</strong> An affiliate link adds 0 points to a firm’s 0–10 score. The score is based on published rules, payout terms, operating history and rule transparency. <Link href="/methodology">See how we score firms</Link>.</li>
            <li><strong>Product data.</strong> Prices, drawdown limits, profit splits and payout rules come from each firm’s own public pages, with the capture date shown. Partners and non-partners go through the same 30-day freshness check.</li>
            <li><strong>Placement, labelled.</strong> A partner can appear in a highlighted slot, such as a partner spotlight or a partner shortlist, and its sign-up button can be more prominent. Those slots are labelled as partner placements, and they don’t change any score.</li>
            <li><strong>Discount codes.</strong> We only show a code that appears on the firm’s own material or that we have checked, with the date. We never make up codes.</li>
          </ul>

          <h2>Partner status next to score</h2>
          <p>All {firms.length} tracked firms by current editorial score, so you can check for yourself whether partners score higher:</p>
          <table className="tf-trust__table" data-score-vs-partner>
            <caption className="hidden-caption">Tracked prop firms by editorial score with affiliate status</caption>
            <thead><tr><th scope="col">Firm</th><th scope="col">Score</th><th scope="col">Pays us?</th></tr></thead>
            <tbody>
              {ranked.map(firm => (
                <tr key={firm.name}>
                  <td><Link href={firm.reviewUrl}>{firm.name}</Link></td>
                  <td>{firm.score.toFixed(1)}</td>
                  <td>{firm.affiliateUrl ? 'Yes (affiliate)' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Mistakes and questions</h2>
          <p>
            We publish every factual correction in the <Link href="/corrections">corrections log</Link>. The legal risk and affiliate wording is on the <Link href="/disclaimers">disclaimers page</Link>. To report an error or ask about a partnership, use the <Link href="/contact">contact page</Link>.
          </p>
        </div>
      </section>
    </div>
  )
}
