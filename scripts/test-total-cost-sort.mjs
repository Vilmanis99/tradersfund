// Price sorts, "lowest" rankings and budget filters must use the total entry
// cost (checkout price + mandatory pay-later + activation fees), never the
// checkout amount alone. Maven Buy Now, Pay Later $100K is $5 now + $589
// after passing = $594, not the cheapest $100K product at $5.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildChallengeComparisonRows } from '../lib/challengeComparisonData.ts'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '../lib/firms.ts'
import { getChallengeWatchEntries } from '../lib/challengeWatch.ts'
import {
  challengeKey, DEFAULT_FINDER_FILTERS, filterChallengeRows, minimumTierTotalUsd, priceBreakdownLabel,
  rankByTotalUsd, tierPriceParts, tierTotalPrice,
} from '../lib/challengeComparison.ts'

const usd = value => `$${value}`
const tier = fields => ({ sizeUsd: 100000, priceUsd: null, priceEur: null, costToFundedUsd: null, costToFundedEur: null, dailyLossUsd: null, maxLossUsd: null, ...fields })

// Helper units.
const bnpl = tier({ priceUsd: 5, payLaterUsd: 589, costToFundedUsd: 594 })
const cft = tier({ priceUsd: 200, activationFeeUsd: 328, costToFundedUsd: 528 })
const plain = tier({ priceUsd: 149, costToFundedUsd: 149 })
const eurWithUsdExtras = tier({ priceEur: 90, activationFeeUsd: 50 })
assert.equal(tierTotalPrice(bnpl, 'USD'), 594)
assert.equal(tierTotalPrice(cft, 'USD'), 528)
assert.equal(tierTotalPrice(plain, 'USD'), 149)
assert.equal(tierTotalPrice(tier({ priceEur: 99, costToFundedEur: 99 }), 'EUR'), 99)
assert.equal(tierTotalPrice(eurWithUsdExtras, 'EUR'), null, 'USD extras are never added to a EUR price')
assert.equal(tierTotalPrice(tier({}), 'USD'), null, 'unknown price stays unknown')
assert.equal(tierPriceParts(plain), null, 'no breakdown when total equals price')
assert.equal(priceBreakdownLabel(tierPriceParts(bnpl), 'en', usd), '$5 now + $589 after passing')
assert.equal(priceBreakdownLabel(tierPriceParts(cft), 'en', usd), '$200 + $328 activation')
assert.equal(priceBreakdownLabel(tierPriceParts(bnpl), 'ru', usd), '$5 сейчас + $589 после прохождения')
assert.equal(priceBreakdownLabel(tierPriceParts(cft), 'ru', usd), '$200 + $328 активация')

// Real data, evaluated as of the newest capture so the check does not rot.
const challenges = getAllChallenges()
const latest = challenges.map(c => c.sourceCapturedAt).sort().at(-1)
const now = new Date(`${latest}T12:00:00Z`)
const rows = buildChallengeComparisonRows(challenges, getAllFirms(), getChallengeWatchEntries(), now)
const SIZE = 100000

// Independent expectation straight from content/data/challenges.
const expected = challenges.filter(c => isChallengeFresh(c, now)).flatMap(c => {
  const t = c.accountSizes.find(t => t.sizeUsd === SIZE && t.priceUsd != null && t.priceUsd > 0)
  return t ? [{ key: `${c.firmSlug}:${c.productSlug}`, total: t.priceUsd + (t.payLaterUsd ?? 0) + (t.activationFeeUsd ?? c.activationFeeUsd ?? 0), price: t.priceUsd }] : []
}).filter(e => rows.some(row => challengeKey(row) === e.key))
const ranked = rankByTotalUsd(rows, SIZE)
assert.deepEqual(ranked.map(r => r.totalUsd), [...expected].map(e => e.total).sort((a, b) => a - b), '$100K ranking is ordered by total, from the data')
for (const { row, totalUsd } of ranked) assert.equal(totalUsd, expected.find(e => e.key === challengeKey(row)).total, `${challengeKey(row)} ranks on its total`)

const top3 = ranked.slice(0, 3).map(r => `${challengeKey(r.row)} $${r.totalUsd}`)
console.log(`$100K by total (data as of ${latest}): ${top3.join(', ')}`)

// Code Reviewer's expected order holds once TradeDay is on list prices (Tracker data/key-facts-2026-10-20).
const tradeDayMin = Math.min(...ranked.filter(r => r.row.firm.slug === 'tradeday').map(r => r.totalUsd))
if (tradeDayMin >= 240) {
  // Topstep $149 and OFP Instant Lite $200 lead. TradeDay Intraday $240 is no longer pinned third: the 2026-10-20
  // capture added LucidDaily ($224 at $100K), so TradeDay keeps its $240 total and its place in the data-sorted order.
  assert.deepEqual(ranked.slice(0, 2).map(r => [r.row.firm.slug, r.totalUsd]), [['topstep', 149], ['ofp-funding', 200]], 'Topstep no-activation $149, OFP Instant Lite $200')
  const tradeDayIndex = ranked.findIndex(r => r.row.firm.slug === 'tradeday' && r.totalUsd === tradeDayMin)
  assert.equal(tradeDayMin, 240, 'TradeDay Intraday $100K totals $240')
  assert(ranked.slice(0, tradeDayIndex).every(r => r.totalUsd <= 240) && ranked.slice(tradeDayIndex + 1).every(r => r.totalUsd >= 240), 'TradeDay $240 sits in total order')
  assert.equal(challengeKey(ranked[0].row), 'topstep:trading-combine-no-activation-fee-path')
  assert.equal(challengeKey(ranked[1].row), 'ofp-funding:instant-lite')
} else {
  console.log(`note: TradeDay $100K is $${tradeDayMin} in this data (promo pricing), so it leads; expected order computed from data`)
}

// Maven Buy Now, Pay Later: ranked at 594, never at 5.
const mavenIndex = ranked.findIndex(r => challengeKey(r.row) === 'maven:buy-now-pay-later')
if (mavenIndex >= 0) {
  assert.equal(ranked[mavenIndex].totalUsd, 594, 'Maven BNPL $100K ranks at $594')
  assert.notEqual(mavenIndex, 0, 'Maven BNPL is not the cheapest $100K product')
  assert(ranked.slice(0, mavenIndex).every(r => r.totalUsd <= 594) && ranked.slice(mavenIndex + 1).every(r => r.totalUsd >= 594))
  assert.equal(minimumTierTotalUsd(ranked[mavenIndex].row.product, SIZE), 594)
  const byPrice = [...expected].sort((a, b) => a.price - b.price)
  assert.equal(byPrice[0].key, 'maven:buy-now-pay-later', 'fixture sanity: a price-only sort would put Maven first')
} else {
  console.log('note: Maven BNPL $100K is not source-fresh in this data')
}

// Finder (EN home preview + RU finder): fee sort and budget use the total.
const finderFilters = { ...DEFAULT_FINDER_FILTERS, size: SIZE, currency: 'USD', sort: 'fee' }
const finder = filterChallengeRows(rows, finderFilters)
assert.deepEqual(finder.slice(0, 3).map(challengeKey), ranked.slice(0, 3).map(r => challengeKey(r.row)), 'finder fee sort matches total ranking')
const underBudget = filterChallengeRows(rows, { ...finderFilters, budget: 100 })
assert(!underBudget.some(row => challengeKey(row) === 'maven:buy-now-pay-later'), 'a $100 budget cannot fit a $594 total')
assert(underBudget.every(row => tierTotalPrice(row.product.tiers.find(t => t.sizeUsd === SIZE), 'USD') <= 100))
for (const [key, total] of [['crypto-fund-trader:break', 528], ['topstep:trading-combine-standard-path', 248], ['take-profit-trader:the-test', 460]]) {
  const hit = ranked.find(r => challengeKey(r.row) === key)
  if (hit) assert.equal(hit.totalUsd, total, `${key} includes its mandatory activation fee`)
}

// The EN comparison's "Lowest entry" sort and memo use the total helper, not priceUsd.
const component = readFileSync(new URL('../components/GlobalChallengeComparison.tsx', import.meta.url), 'utf8')
assert(/minimumTierValue\(a\.product, 'entryTotalUsd'/.test(component), "'Lowest verified USD entry' sorts by total")
assert(!/minimumTierValue\([ab]\.product, 'priceUsd'/.test(component))
assert(/field === 'entry'\s*\n?\s*\? tierTotalPrice/.test(component), "'Lowest entry at selected size' ranks by total")
assert(component.includes("{ value: 'entry-cost', label: 'Lowest entry at selected size' }"), 'default label unchanged')
const india = readFileSync(new URL('../components/IndiaChallengeComparison.tsx', import.meta.url), 'utf8')
assert(/tier\.costToFundedUsd != null && tier\.costToFundedUsd > 0 \? tier\.costToFundedUsd : tier\.price\.amount/.test(india), 'India entry ranking uses total')

console.log('test-total-cost-sort: ok')
