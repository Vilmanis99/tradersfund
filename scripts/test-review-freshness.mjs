import assert from 'node:assert/strict'
import { hasNoListedPrice, reviewFreshnessBlockers } from '../lib/reviewFreshness.ts'

const now = new Date('2026-10-20T12:00:00Z')
const tier = (sizeUsd, priceUsd, extra = {}) => ({ sizeUsd, priceUsd, ...extra })
const fresh = { productSlug: 'fresh', sourceCapturedAt: '2026-10-20', accountSizes: [tier(10000, 87)] }
const notOnSaleStale = { productSlug: 'not-on-sale', sourceCapturedAt: '2026-09-14', activationFeeUsd: null, accountSizes: [tier(10000, null), tier(25000, null)] }
const pricedStale = { productSlug: 'priced-stale', sourceCapturedAt: '2026-09-14', accountSizes: [tier(10000, null), tier(25000, 199)] }

// An all-null product does not block the gate…
assert.equal(hasNoListedPrice(notOnSaleStale), true)
assert.deepEqual(reviewFreshnessBlockers([fresh, notOnSaleStale], now), [], 'a stale product with no listed price does not block the FAQ')
// …but a stale product that still shows any price does.
assert.equal(hasNoListedPrice(pricedStale), false)
assert.deepEqual(reviewFreshnessBlockers([fresh, notOnSaleStale, pricedStale], now).map(product => product.productSlug), ['priced-stale'])
for (const shown of [{ priceEur: 79 }, { payLaterUsd: 99 }, { activationFeeUsd: 149 }]) {
  const product = { ...notOnSaleStale, accountSizes: [tier(10000, null, shown)] }
  assert.equal(hasNoListedPrice(product), false, `a tier fee ${Object.keys(shown)[0]} is still a shown price`)
  assert.equal(reviewFreshnessBlockers([product], now).length, 1)
}
assert.equal(hasNoListedPrice({ ...notOnSaleStale, activationFeeUsd: 149 }), false, 'a product-level activation fee is a shown price')
assert.equal(hasNoListedPrice({ accountSizes: [], activationFeeUsd: null }), false, 'no tiers is not evidence of "not on sale"')
// A fresh priced product never blocks; a future-dated or malformed capture still does.
assert.deepEqual(reviewFreshnessBlockers([fresh], now), [])
assert.equal(reviewFreshnessBlockers([{ ...fresh, sourceCapturedAt: 'unknown' }], now).length, 1)
console.log('review freshness gate: ok')
