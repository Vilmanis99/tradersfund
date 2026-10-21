import { isChallengeFresh, type Challenge } from './firms.ts'

type PricedProduct = Pick<Challenge, 'accountSizes' | 'activationFeeUsd'>

/**
 * True when a product lists account sizes but carries no fee at all: every
 * tier's priceUsd, priceEur, payLaterUsd and activationFeeUsd is null, and so
 * is the product-level activationFeeUsd. Such a product is not on sale, so no
 * captured price of it is presented as current. A single non-null fee means
 * it still shows a price and is not exempt.
 */
export function hasNoListedPrice(product: PricedProduct): boolean {
  return product.accountSizes.length > 0
    && product.activationFeeUsd == null
    && product.accountSizes.every(tier => tier.priceUsd == null && tier.priceEur == null
      && tier.payLaterUsd == null && tier.activationFeeUsd == null)
}

/**
 * Products whose stale capture blocks a review's FAQ JSON-LD. A product with
 * no listed price is left out (it shows no price to go stale); any product
 * that still shows a price must be inside the 30-day window. The product
 * stays in the review's product list and freshness notice either way.
 */
export function reviewFreshnessBlockers<T extends PricedProduct & Pick<Challenge, 'sourceCapturedAt'>>(products: T[], now = new Date()): T[] {
  return products.filter(product => !hasNoListedPrice(product) && !isChallengeFresh(product, now))
}

/** Same rule for one product: fresh, or not on sale (no listed fee to go stale). */
export function isFreshOrNotOnSale(product: PricedProduct & Pick<Challenge, 'sourceCapturedAt'>, now = new Date()): boolean {
  return hasNoListedPrice(product) || isChallengeFresh(product, now)
}

/**
 * Shared firm/product-set freshness gate: at least one product, and no
 * product that still shows a price is outside the 30-day window. Used by the
 * review FAQ, the India shortlist and challenge-changes counts, and the other
 * "every product fresh" gates.
 */
export function isProductSetFresh(products: Array<PricedProduct & Pick<Challenge, 'sourceCapturedAt'>>, now = new Date()): boolean {
  return products.length > 0 && reviewFreshnessBlockers(products, now).length === 0
}
