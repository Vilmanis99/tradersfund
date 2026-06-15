import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllFirms } from '@/lib/firms'
import { getAllDeals } from '@/lib/deals'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import DealsFilter from '@/components/DealsFilter'
import type { DealCardData } from '@/components/DealCard'

const SITE = 'https://tradersfundhub.com'
const SLUG = 'prop-firm-discount-codes'

// Rebuild daily so an expired code drops within a day without a redeploy.
export const revalidate = 86400

const TITLE = 'Prop Firm Discount Codes & Deals (2026) — Verified'
const DESCRIPTION =
  'Verified prop firm discount codes and deals, each with the date we last checked it. Expired codes are removed, not greyed out. Updated for 2026.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `/${SLUG}` },
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
    a: "Every card shows the date we last checked the offer — that's the “Checked” line. We only print a code you can type at checkout when we've confirmed it applies; when a saving comes off automatically through our link, we say so instead of inventing a code. If a code expires, we remove it — you won't find a dead coupon greyed out here.",
  },
  {
    q: "Why does a firm show 'Visit for current offers' instead of a code?",
    a: "That firm's discount either rotates or applies automatically through our link, so there's no single code worth pinning to a date — click through and it's applied at checkout. Firms marked “Listed” aren't affiliate partners; we still track them so you can compare, but the link goes to our review, not a referral.",
  },
  {
    q: 'Do I pay more by using your link or code?',
    a: 'No. The price is the same or lower — the firm pays us a referral fee, not you. That fee is what keeps the reviews free, which is exactly why the disclosure sits at the top of this page (FTC §255).',
  },
  {
    q: 'How often is this page updated?',
    a: 'Codes are re-checked on a rolling basis and the page rebuilds daily, so an expired offer falls off within a day. The “Checked” date on each card is the real one — not a sitewide stamp we never touch.',
  },
]

export default function Page() {
  const firms = getAllFirms()
  const deals = getAllDeals()
  const dealBySlug = new Map(deals.map(d => [d.firmSlug, d]))

  const rows: DealCardData[] = firms.map(firm => {
    const slug = slugify(firm.name)
    const deal = dealBySlug.get(slug)
    const isPartner = Boolean(firm.affiliateUrl)
    const defaultLabel = isPartner ? 'Visit for current offers' : 'See review for pricing'
    return {
      firmName: firm.name,
      firmSlug: slug,
      logo: firm.logo,
      score: firm.score,
      reviewUrl: firm.reviewUrl,
      isPartner,
      markets: marketsOf(firm.assets),
      code: deal?.code,
      pct: deal?.pct,
      amountLabel: deal?.amountLabel ?? defaultLabel,
      scope: deal?.scope,
      verifiedOn: deal?.verifiedOn,
      expiresOn: deal?.expiresOn,
      note: deal?.note,
    }
  })

  // Order: a real discount first, then affiliate partners, then by score.
  rows.sort((a, b) => {
    const disc = (b.pct != null ? 1 : 0) - (a.pct != null ? 1 : 0)
    if (disc) return disc
    const partner = (b.isPartner ? 1 : 0) - (a.isPartner ? 1 : 0)
    if (partner) return partner
    return b.score - a.score
  })

  const liveCount = rows.filter(r => r.pct != null || r.isPartner).length

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firm Discount Codes' },
  ])
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Prop Firm Discount Codes & Deals',
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
          Prop Firm Discount Codes & Deals
        </h1>
        <p style={{ color: 'var(--text)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '64ch', margin: '0 0 0.5rem' }}>
          Every code below carries the date we last checked it works. When a discount applies
          automatically through our link, we say so rather than printing a code that doesn&apos;t exist.
          And when an offer expires, we pull it — you won&apos;t scroll past dead coupons here.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
          Tracking <strong style={{ color: 'var(--accent-light)' }}>{rows.length} firms</strong> ·{' '}
          {liveCount} with a live offer or partner link · the rest link straight to our review.
        </p>
      </header>

      <AffiliateDisclosure />

      <DealsFilter rows={rows} />

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
        <Link href="/best-prop-firms-2026" className="deal-crosslink">Best prop firms 2026 →</Link>
        <Link href="/how-to-pass-a-prop-firm-challenge" className="deal-crosslink">How to pass a challenge →</Link>
      </section>
    </main>
  )
}
