import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildChallengeComparisonRows, getRussianFinderRows, getRussianReviewFinderHref, getRussianInstantFinderHref } from '../lib/challengeComparisonData.ts'
import { getAllChallenges, getAllFirms, minimumCostToFundedUsd } from '../lib/firms.ts'
import { challengeKey, DEFAULT_FINDER_FILTERS, filterChallengeRows, finderTier, isFinderStateFragment, parseFinderState, serializeFinderState, tierPrice } from '../lib/challengeComparison.ts'
import { russianPayoutRequestLabel } from '../lib/russianProgrammeLabels.ts'
import { fundedNextOneStepPayoutLabel, fundedNextPayoutSource, isFundedNextPayoutSourceFresh } from '../lib/fundedNextPayout.ts'
import { minimumTradingDaysLabel, maximumTradingDaysLabel, consistencyRuleLabel } from '../lib/challengeRuleLabels.ts'

for (const [locale, unknown, unlimited, absent] of [['en', 'Unverified', 'Unlimited', 'No rule'], ['ru', 'Не подтверждено', 'Без ограничения срока', 'Правило не применяется']]) {
  for (const invalid of [null, undefined, -1, 1.5, NaN, Infinity, '0']) assert.equal(minimumTradingDaysLabel(invalid, locale), unknown)
  assert.equal(minimumTradingDaysLabel(0, locale), '0', 'a verified zero stays distinct from unknown')
  assert.equal(minimumTradingDaysLabel(5, locale), '5')
  for (const value of [null, undefined, 0, -1, 2.5, NaN, '30']) assert.equal(maximumTradingDaysLabel({ maxTradingDays: value }, locale), unknown)
  assert.equal(maximumTradingDaysLabel({ maxTradingDays: null, maxTradingDaysUnlimited: true }, locale), unlimited)
  assert.equal(maximumTradingDaysLabel({ maxTradingDays: 30, maxTradingDaysUnlimited: true }, locale), unknown, 'conflicting finite/unlimited data fails closed')
  assert.equal(maximumTradingDaysLabel({ maxTradingDays: 30, maxTradingDaysUnlimited: false }, locale), '30')
  assert.equal(maximumTradingDaysLabel({ maxTradingDays: null, maxTradingDaysUnlimited: false }, locale), unknown)
  assert.equal(maximumTradingDaysLabel({ maxTradingDays: 30, maxTradingDaysUnlimited: 'false' }, locale), unknown)
  for (const value of [null, undefined, 0, -1, 101, NaN, Infinity, '50']) assert.equal(consistencyRuleLabel({ consistencyRulePct: value }, locale), unknown)
  assert.equal(consistencyRuleLabel({ consistencyRulePct: 50 }, locale), '50%')
  assert.equal(consistencyRuleLabel({ consistencyRulePct: null, consistencyRuleApplies: false }, locale), absent)
  assert.equal(consistencyRuleLabel({ consistencyRulePct: 50, consistencyRuleApplies: false }, locale), unknown)
  assert.equal(consistencyRuleLabel({ consistencyRulePct: 50, consistencyRuleApplies: 'false' }, locale), unknown)
  assert.notEqual(consistencyRuleLabel({ consistencyRulePct: null, consistencyRuleApplies: true }, locale), absent)
}

for (const phases of [0, 1, 2, 3]) {
  assert.equal(russianPayoutRequestLabel({ phases, payoutFirstDays: null }), 'Уточните условия запроса')
  assert.equal(russianPayoutRequestLabel({ phases, payoutFirstDays: 0 }), 'По условиям программы')
  const label = russianPayoutRequestLabel({ phases, payoutFirstDays: 14 })
  assert(label.includes('14'))
  assert.equal(label.includes('после оценки'), phases > 0, 'instant accounts must not imply an evaluation')
  assert.equal(label.includes('без оценки'), phases === 0)
}

const now = new Date('2026-09-08T12:00:00Z')
const products = getAllChallenges()
const firms = getAllFirms()
const rows = getRussianFinderRows(now)
const oneStepTiming = { firmSlug: 'fundednext', productSlug: 'stellar-1-step', payoutFirstDays: 5 }
assert(fundedNextOneStepPayoutLabel(oneStepTiming, now).includes('5 раб. дн.'))
assert(!fundedNextOneStepPayoutLabel(oneStepTiming, now).includes('еженедельно'))
for (const payoutFirstDays of [null, 0, 7, NaN, Infinity, -1]) assert(fundedNextOneStepPayoutLabel({ ...oneStepTiming, payoutFirstDays }, now).includes('требует проверки'), 'conflicting or missing first-window data does not inherit a sourced cycle')
assert.equal(fundedNextOneStepPayoutLabel({ ...oneStepTiming, firmSlug: 'other' }, now), null)
assert.equal(fundedNextOneStepPayoutLabel({ ...oneStepTiming, productSlug: 'stellar-instant' }, now), null)
const timingCapture = fundedNextPayoutSource.sourceCapturedAt
try {
  for (const sourceCapturedAt of ['', 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
    fundedNextPayoutSource.sourceCapturedAt = sourceCapturedAt
    assert(!isFundedNextPayoutSourceFresh(now))
    assert(fundedNextOneStepPayoutLabel(oneStepTiming, now).includes('требует проверки'))
  }
  fundedNextPayoutSource.sourceCapturedAt = '2026-08-09'
  assert(isFundedNextPayoutSourceFresh(now), 'day 30 inclusive')
} finally { fundedNextPayoutSource.sourceCapturedAt = timingCapture }
const payoutFixtures = [
  ['conditional', 0], ['short', 7], ['long', 30], ['unknown', null], ['business', 5],
].map(([name, payoutFirstDays]) => ({ ...rows[0], firm: { ...rows[0].firm, slug: name === 'business' ? 'fundednext' : name, name }, product: { ...rows[0].product, slug: name === 'business' ? 'stellar-1-step' : name, payoutFirstDays, tiers: [{ ...rows[0].product.tiers[0], sizeUsd: 50000 }] } }))
assert.deepEqual(filterChallengeRows(payoutFixtures, { ...DEFAULT_FINDER_FILTERS, sort: 'payout' }).map(row => row.firm.name), ['conditional', 'short', 'long', 'business', 'unknown'], 'business days are grouped separately, not ranked as fewer calendar days')
const ruleFixture = { ...products.find(product => product.firmSlug === 'fundednext'), maxTradingDays: null, maxTradingDaysUnlimited: true, consistencyRulePct: null, consistencyRuleApplies: false }
const projectedRuleFixture = buildChallengeComparisonRows([ruleFixture], firms, [], now)[0].product
assert.equal(projectedRuleFixture.maxTradingDaysUnlimited, true, 'unlimited confirmation survives the shared EN/RU projection')
assert.equal(projectedRuleFixture.consistencyRuleApplies, false, 'explicit rule absence survives the shared EN/RU projection')
assert.deepEqual([...new Set(rows.map(row => row.firm.slug))].sort(), ['bright-funded', 'ftmo', 'fundednext', 'fundingpips'])
assert(rows.every(row => row.firm.reviewUrl.startsWith('/ru/obzor-')))

for (const firm of ['fundednext', 'bright-funded', 'fundingpips', 'ftmo']) {
  const href = getRussianReviewFinderHref(firm, now)
  const hash = new URL(href, 'https://tradersfundhub.com').hash
  assert(isFinderStateFragment(hash, rows), `${firm}: valid, crawl-safe review handoff`)
  const state = parseFinderState(hash, rows)
  assert.equal(state.filters.size, 50000)
  assert.equal(state.filters.phases, '2')
  assert.equal(state.filters.currency, 'all', 'do not hide EUR or imply currency conversion')
  assert(state.selected.length >= 2 && state.selected.length <= 3)
  assert(state.selected.some(key => key.startsWith(`${firm}:`)), 'the reviewed firm is in its starting comparison')
  for (const key of state.selected) {
    const row = rows.find(row => challengeKey(row) === key)
    assert.equal(row.product.phases, 2)
    assert(finderTier(row, 50000))
  }
  assert.equal(getRussianReviewFinderHref(firm, new Date('2030-01-01')), '/ru/luchshie-prop-firmy#podbor', 'expired presets retain a safe generic handoff')
}
assert.equal(getRussianReviewFinderHref('unknown', now), '/ru/luchshie-prop-firmy#podbor')

const instantHash = new URL(getRussianInstantFinderHref(now), 'https://tradersfundhub.com').hash
assert(isFinderStateFragment(instantHash, rows), 'instant guide handoff is a valid finder fragment')
const instantState = parseFinderState(instantHash, rows)
assert.equal(instantState.filters.size, 10000)
assert.equal(instantState.filters.phases, '0')
assert.equal(instantState.filters.currency, 'all')
assert.deepEqual(instantState.selected, ['fundednext:stellar-instant', 'fundingpips:zero'])
for (const key of instantState.selected) {
  const row = rows.find(row => challengeKey(row) === key)
  assert.equal(row.product.phases, 0, 'do not present Bright Funded evaluation as an instant alternative')
  assert(finderTier(row, 10000), 'compare the same real account size')
}
assert.equal(getRussianInstantFinderHref(new Date('2030-01-01')), '/ru/luchshie-prop-firmy#podbor', 'expired instant pairs retain a safe handoff')
assert.equal(getRussianInstantFinderHref(new Date('2020-01-01')), '/ru/luchshie-prop-firmy#podbor', 'future captures cannot create a comparison')

for (const row of rows) {
  const original = products.find(product => product.firmSlug === row.firm.slug && product.productSlug === row.product.slug)
  assert(original)
  assert.equal(row.product.capturedAt, original.sourceCapturedAt)
  assert.equal(row.product.sourceUrl, original.sourceUrl)
  for (const tier of row.product.tiers) {
    const sourceTier = original.accountSizes.find(source => source.sizeUsd === tier.sizeUsd)
    assert.equal(tier.priceUsd, sourceTier.priceUsd)
    assert.equal(tier.priceEur, sourceTier.priceEur ?? null)
    assert.equal(tier.costToFundedUsd, minimumCostToFundedUsd(original, sourceTier))
  }
}
const defaults = filterChallengeRows(rows, DEFAULT_FINDER_FILTERS)
assert(defaults.length > 3)
assert(defaults.every(row => finderTier(row, 50000)))
assert.equal(defaults[0].firm.slug, 'bright-funded')
const reversedPartnerFlags = rows.map(row => ({ ...row, firm: { ...row.firm, isPartner: !row.firm.isPartner, score: 100 - row.firm.score } }))
assert.deepEqual(defaults.map(challengeKey), filterChallengeRows(reversedPartnerFlags, DEFAULT_FINDER_FILTERS).map(challengeKey), 'Commercial status and editorial scores must not change finder sorting')
const euroFilters = { ...DEFAULT_FINDER_FILTERS, currency: 'EUR', budget: 300, sort: 'fee' }
const euros = filterChallengeRows(rows, euroFilters)
assert(euros.length > 0)
assert(euros.every(row => tierPrice(finderTier(row, 50000), 'EUR') <= 300))
assert(euros.every(row => !['fundednext', 'fundingpips'].includes(row.firm.slug)))
assert.deepEqual(filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, budget: 1, sort: 'fee' }).map(challengeKey), defaults.map(challengeKey), 'All-currency mode must not compare nominal USD/EUR amounts')
assert.equal(filterChallengeRows(rows, { ...euroFilters, budget: 1 }).length, 0)
assert.equal(filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, size: 987654321 }).length, 0)
assert(filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, size: 10000, phases: '0' }).every(row => row.product.phases === 0))
assert(filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, drawdown: 'static' }).every(row => row.product.drawdownType === 'static'))

const selected = rows.slice(0, 3).map(challengeKey)
const saved = serializeFinderState(euroFilters, selected)
assert(isFinderStateFragment(saved, rows))
assert(!isFinderStateFragment('podbor', rows))
assert(!isFinderStateFragment('size=not-a-size', rows))
assert(!isFinderStateFragment('size=50000&unknown=1', rows))
assert(!isFinderStateFragment('size=50000&compare=missing-product', rows))
assert.deepEqual(parseFinderState(saved, rows), { filters: euroFilters, selected })
const forged = parseFinderState('#size=bad&currency=BTC&budget=NaN&steps=99&sort=fee&compare=not-a-product,' + [...selected, selected[0]].join(','), rows)
assert.deepEqual(forged.filters, DEFAULT_FINDER_FILTERS)
assert.deepEqual(forged.selected, selected)

const sample = products.find(product => product.firmSlug === 'fundednext')
for (const sourceCapturedAt of ['2026-07-01', '2026-10-01', 'not-a-date']) {
  assert.equal(buildChallengeComparisonRows([{ ...sample, sourceCapturedAt }], firms, [], now).length, 0)
}
assert.equal(buildChallengeComparisonRows([{ ...sample, sourceCapturedAt: '2026-08-09' }], firms, [], now).length, 1, 'Day 30 remains within the current editorial gate')
assert.equal(buildChallengeComparisonRows([{ ...sample, sourceCapturedAt: '2026-08-08' }], firms, [], now).length, 0, 'Day 31 expires')
const unknown = buildChallengeComparisonRows([{ ...sample, profitSplitPct: null, dailyLossPct: null, accountSizes: [{ sizeUsd: 50000, priceUsd: null, refundable: null }] }], firms, [], now)[0]
assert.equal(unknown.product.profitSplitPct, null)
assert.equal(unknown.product.tiers[0].costToFundedUsd, null)
assert.equal(filterChallengeRows([unknown], { ...DEFAULT_FINDER_FILTERS, currency: 'USD' }).length, 0)
assert.equal(filterChallengeRows([unknown], DEFAULT_FINDER_FILTERS).length, 1, 'Unknown price is explicit, not silently replaced by zero')

for (const file of ['app/ru/page.tsx', 'app/ru/luchshie-prop-firmy/page.tsx', 'app/prop-firm-challenges/page.tsx']) {
  assert.match(readFileSync(file, 'utf8'), /export const revalidate = 3600/, `${file} must re-evaluate capture age`)
}
assert(!readFileSync('app/prop-firm-challenges/page.tsx', 'utf8').includes('Refresh the global challenge-comparison social card'), 'Changing source counts must not throw during ISR and leave stale rows cached')
console.log(`Challenge finder: data projection, currencies, ordering, filters, sharing, missing data and freshness passed (${rows.length} Russian programmes).`)
