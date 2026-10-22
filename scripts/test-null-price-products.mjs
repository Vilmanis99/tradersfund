/**
 * Products that list account sizes but no price (Apex Intraday/EOD Standard since the
 * 2026-10-22 capture: the PA activation fee was not shown, so priceUsd and
 * activationFeeUsd are null on purpose) must read as "price not shown": never $0, NaN,
 * "undefined", a EUR product, a cheapest pick or a total-cost rank. Everything is read
 * from content/data, so the test follows recaptures instead of pinning prices.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:')
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local && local.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

const { getAllChallenges, getAllFirms, getChallengesByFirm, challengeCurrency, challengeTierEconomics, minimumCostToFundedUsd } = require(path.join(root, 'lib/firms.ts'))
const { buildChallengeComparisonRows } = require(path.join(root, 'lib/challengeComparisonData.ts'))
const { getChallengeWatchEntries } = require(path.join(root, 'lib/challengeWatch.ts'))
const { challengeKey, filterChallengeRows, DEFAULT_FINDER_FILTERS, minimumTierTotalUsd, rankByTotalUsd, tierCurrency, tierPriceParts, tierTotalPrice } = require(path.join(root, 'lib/challengeComparison.ts'))
const { buildChallengeMatchup } = require(path.join(root, 'lib/challengeMatchup.ts'))

const challenges = getAllChallenges()
const latest = challenges.map(c => c.sourceCapturedAt).sort().at(-1)
const now = new Date(`${latest}T12:00:00Z`)

// Unit: an all-null product is not a EUR product and has no cost.
const unpriced = { accountSizes: [{ sizeUsd: 25000, priceUsd: null, activationFeeUsd: null, maxLossUsd: 1000, refundable: null }], activationFeeUsd: null, pricingModel: 'one-off', profitSplitPct: 100, dailyLossPct: null, maxLossPct: null }
assert.equal(challengeCurrency(unpriced), 'USD', 'no listed price is not evidence of EUR pricing')
assert.equal(challengeCurrency({ accountSizes: [{ sizeUsd: 10000, priceUsd: null, priceEur: 89 }] }), 'EUR', 'EUR-only pricing stays EUR')
assert.equal(minimumCostToFundedUsd(unpriced, unpriced.accountSizes[0]), null)
assert.equal(challengeTierEconomics(unpriced, unpriced.accountSizes[0]), null)

// Real data: Apex Standard paths (and any other priced-null product).
const apex = getChallengesByFirm('apex-trader-funding')
const nullProducts = challenges.filter(c => c.accountSizes.length > 0 && c.accountSizes.every(t => t.priceUsd == null && t.priceEur == null))
const nullSlugs = new Set(nullProducts.map(c => `${c.firmSlug}:${c.productSlug}`))
const apexNull = apex.filter(c => nullSlugs.has(`${c.firmSlug}:${c.productSlug}`))
assert(apexNull.length >= 1, 'fixture: at least one Apex product has no listed price in content/data (Standard since 2026-10-22)')
for (const product of apexNull) {
  assert.equal(challengeCurrency(product), 'USD', `${product.productSlug}: USD firm, no EUR label`)
  for (const tier of product.accountSizes) {
    assert.equal(minimumCostToFundedUsd(product, tier), null, `${product.productSlug} $${tier.sizeUsd}: no cost-to-funded`)
    assert.equal(challengeTierEconomics(product, tier), null, `${product.productSlug} $${tier.sizeUsd}: no True-Cost row`)
  }
}

const rows = buildChallengeComparisonRows(challenges, getAllFirms(), getChallengeWatchEntries(), now)
const nullKeys = new Set(nullProducts.map(c => `${c.firmSlug}:${c.productSlug}`))
for (const row of rows.filter(row => nullKeys.has(challengeKey(row)))) {
  for (const tier of row.product.tiers) {
    assert.equal(tierTotalPrice(tier, 'USD'), null, `${challengeKey(row)}: unknown total stays unknown`)
    assert.equal(tierTotalPrice(tier, 'EUR'), null)
    assert.equal(tierCurrency(tier), null)
    assert.equal(tierPriceParts(tier), null)
    assert.equal(tier.costToFundedUsd, null)
  }
  assert.equal(minimumTierTotalUsd(row.product), null, `${challengeKey(row)}: no "from" price`)
}
const sizes = [...new Set(rows.flatMap(row => row.product.tiers.map(tier => tier.sizeUsd)))]
for (const size of sizes) {
  const ranked = rankByTotalUsd(rows, size)
  assert(!ranked.some(({ row }) => nullKeys.has(challengeKey(row))), `$${size}: an unpriced product is never ranked on cost`)
  assert(ranked.every(({ totalUsd }) => Number.isFinite(totalUsd) && totalUsd > 0), `$${size}: every ranked total is a positive number`)
  for (const budget of [null, 100, 1000, 100000]) {
    // Budgets and fee sorting apply once a currency is chosen (see filterChallengeRows).
    const filtered = filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, size, currency: 'USD', sort: 'fee', budget })
    assert(!filtered.some(row => nullKeys.has(challengeKey(row))), `$${size} USD budget ${budget}: an unpriced product is not priced, sorted or budget-matched`)
    const totals = filtered.map(row => tierTotalPrice(row.product.tiers.find(t => t.sizeUsd === size), 'USD'))
    assert(totals.every(total => Number.isFinite(total) && total > 0), `$${size}: every fee-sorted total is a positive number`)
    assert.deepEqual(totals, [...totals].sort((x, y) => x - y), `$${size}: fee sort ascends`)
  }
  // With "all currencies" the unpriced product stays listed (it is on sale) rather than vanishing.
  const all = filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, size })
  for (const row of rows.filter(row => nullKeys.has(challengeKey(row)) && row.product.tiers.some(t => t.sizeUsd === size))) {
    assert(all.some(listed => challengeKey(listed) === challengeKey(row)), `$${size}: ${challengeKey(row)} stays listed without a price`)
  }
}

// Apex Standard stays in the comparison as a product, but cost rows and "cheaper" claims
// only use the priced No Activation Fee paths.
const matchup = buildChallengeMatchup({ name: 'Apex Trader Funding', slug: 'apex-trader-funding' }, { name: 'Topstep', slug: 'topstep' }, now)
const apexNames = new Set(apexNull.map(c => c.productName))
for (const group of matchup.costGroups) {
  for (const row of group.rows) {
    assert(!apexNames.has(row.productName ?? row.product), `$${group.sizeUsd}: unpriced Apex product has no cost row`)
  }
}
assert(!matchup.a.currencies.includes('EUR'), 'Apex is not summarised as EUR-priced')
const serialised = JSON.stringify(matchup)
for (const bad of ['NaN', 'undefined', 'Infinity']) assert(!serialised.includes(bad), `matchup data contains ${bad}`)

// Rendered pages: no $0, NaN or "undefined" beside an unpriced Apex product.
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ')
const RealDate = Date
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [now.toISOString()])) }
  static now() { return now.getTime() }
}
const detail = require(path.join(root, 'app/compare/[matchup]/page.tsx'))
const html = renderToStaticMarkup(await detail.default({ params: Promise.resolve({ matchup: 'apex-trader-funding-vs-topstep' }) }))
const text = visible(html)
for (const bad of [/\bNaN\b/, /\bundefined\b/, /\bnull\b/, /\$0(?![\d.,])(?! activation)/, /€/]) {
  assert(!bad.test(text), `/compare/apex-trader-funding-vs-topstep shows ${bad}: …${text.slice(Math.max(0, text.search(bad) - 120), text.search(bad) + 80)}…`)
}
assert(!/\$199 list plus \$59 activation|\$59 activation/.test(text), 'superseded Apex $199 + $59 claim is gone')
console.log(`null-price products: ${[...nullKeys].join(', ')}; ${rows.length} finder rows as of ${latest}; compare page clean`)
assert.deepEqual(matchup.a.unpricedProducts, apexNull.map(c => c.productName).sort((x, y) => x.localeCompare(y, 'en')), 'every unpriced Apex product is named in the cost section')
assert(text.includes(`Not in the cost tables: Apex Trader Funding ${new Intl.ListFormat('en', { type: 'conjunction' }).format(matchup.a.unpricedProducts)}.`), 'compare page labels the unpriced Apex products instead of silently dropping them')
