import type { Challenge, Firm } from '@/lib/firms'
import Link from 'next/link'
import { isChallengeFresh } from '@/lib/firms'
import { challengeSourceDestination, challengeSourceLink } from '@/lib/challengeSources'
import type { ChallengeWatchEntry } from '@/lib/challengeWatch'
import { TrustpilotPanel } from './TrustpilotRating'

export const PRODUCT_SUMMARY_REVIEWS = new Set([
  'ftmo-review', 'fundednext-review', 'topstep-review',
  'funding-pips-review', 'fxify-review', 'e8-markets-review',
  'alpha-capital-review',
])

const money = (value: number, currency: 'USD' | 'EUR') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)

/** The amount and account label must come from the same captured tier. */
export function capturedEntryFees(product: Challenge) {
  return (['USD', 'EUR'] as const).flatMap(currency => {
    const key = currency === 'USD' ? 'priceUsd' : 'priceEur'
    const tiers = product.accountSizes.filter(tier => tier[key] != null && tier[key]! > 0)
    const cheapest = [...tiers].sort((a, b) => a[key]! - b[key]!)[0]
    if (!cheapest) return []
    const billing = product.pricingModel === 'monthly-subscription' ? '/month' : product.pricingModel === 'split-payment' ? ' upfront' : ''
    const activation = cheapest.activationFeeUsd ?? product.activationFeeUsd
    return [{ currency, text: `${money(cheapest[key]!, currency)}${billing} for a $${cheapest.sizeUsd.toLocaleString('en-US')} account`,
      extra: [
        activation != null ? `${money(activation, 'USD')} activation${product.phases === 0 ? ' fee' : ' after passing'}` : '',
        cheapest.payLaterUsd != null ? `${money(cheapest.payLaterUsd, 'USD')} after passing` : '',
        tiers.length < product.accountSizes.length ? 'Other tier fees unverified' : '',
      ].filter(Boolean).join(' · '),
    }]
  })
}

function lossTerms(product: Challenge) {
  const caps = product.accountSizes.map(tier => tier.maxLossUsd).filter((value): value is number => value != null)
  const maxLoss = product.maxLossPct != null ? `${product.maxLossPct}% maximum` : caps.length ? `${money(Math.min(...caps), 'USD')}–${money(Math.max(...caps), 'USD')} maximum by tier` : 'Maximum loss unverified'
  const method = product.drawdownType?.replaceAll('-', ' ') ?? 'method unverified'
  return `${maxLoss} · ${method}`
}

export default function ReviewProductSummary({ firm, products, watchEntries = [] }: {
  firm: Firm; products: Challenge[]; watchEntries?: ChallengeWatchEntry[]
}) {
  const visibleProducts = products.length > 4 ? products.slice(0, 2) : products
  const moreProducts = products.length > 4 ? products.slice(2) : []
  const productCard = (product: Challenge) => {
    const fees = capturedEntryFees(product)
    const source = challengeSourceDestination(firm, product.productSlug, products)
    const watches = watchEntries.filter(entry => entry.status === 'watch' && entry.firmSlug === product.firmSlug && entry.productSlugs.includes(product.productSlug))
    return (
      <div className="review-product-summary-card" key={product.productSlug} data-review-product={product.productSlug}>
        <strong>{product.productName}</strong>
        <p className="review-product-summary-date">Captured <time dateTime={product.sourceCapturedAt}>{product.sourceCapturedAt}</time></p>
        {watches.map(watch => <p className="review-product-source-watch" key={watch.id}>
          <Link href={`/prop-firm-challenge-changes#${watch.id}`}>Open watch: {watch.title}</Link>
          <small>Last checked <time dateTime={watch.lastCheckedAt}>{watch.lastCheckedAt}</time>. Confirm the applicable terms.</small>
        </p>)}
        {isChallengeFresh(product) ? (
          <dl>
            <dt>Lowest captured list fee</dt>
            <dd>{fees.length ? fees.map(fee => <span key={fee.currency}>{fee.text}{fee.extra && <small>{fee.extra}</small>}</span>) : 'Fee unverified'}</dd>
            <dt>Base funded profit split</dt>
            <dd>{product.profitSplitPct != null ? `${product.profitSplitPct}%` : 'Unverified'}</dd>
            <dt>{product.phases === 0 ? 'Instant-account loss rule' : 'Evaluation loss rule'}</dt>
            <dd>{lossTerms(product)}</dd>
            <dt>Minimum trading days</dt>
            <dd>{product.minTradingDays != null ? <>{product.minTradingDays}<small>{product.phases === 0 ? 'No evaluation phase; reward gates are separate' : 'See the phase rules below'}</small></> : 'Unverified'}</dd>
          </dl>
        ) : <p>Source recheck required. This capture is outside the 30-day window; current fees and rules are not summarized here.</p>}
        {source && <p className="review-product-source">
          <a href={challengeSourceLink(product)} target="_blank" rel="nofollow noopener">Read first-party source<span className="sr-only"> for {product.productName}</span></a>
          <small>{new URL(source).hostname}</small>
        </p>}
      </div>
    )
  }
  return (
    <aside className="review-product-summary" aria-label={`${firm.name} product terms at a glance`}>
      <p className="review-product-summary-title">{firm.name}: captured product terms at a glance</p>
      <p className="review-product-summary-scope">Published programme terms, with a separate capture date for each product. This review does not establish an independently verified account purchase or payout. <Link href="/methodology">How we check terms</Link>.</p>
      <div className="review-product-summary-grid">
        {visibleProducts.map(productCard)}
      </div>
      {moreProducts.length > 0 && <details className="review-product-summary-more">
        <summary>See {moreProducts.length} more captured products</summary>
        <div className="review-product-summary-grid">{moreProducts.map(productCard)}</div>
      </details>}
      <p className="review-product-summary-scope">Fees are shown in their published currency; account sizes are USD labels. Add-ons and later billing cycles can increase cost. Read the <a href="#challenges-available">full product tables</a>, <a href="#faq">payout and refund answers</a>, and <Link href="/prop-firm-challenges">dated first-party source links</Link> before paying.</p>
      <TrustpilotPanel firm={firm} />
    </aside>
  )
}
