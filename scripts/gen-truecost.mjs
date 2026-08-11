/**
 * Emit the Reviews v2 "True cost to break even" table(s) for a firm,
 * straight from content/data/challenges/<firm>.json.
 *
 * _template.md requires these tables to use computeTrueCost() output and
 * forbids hand-calculation. Hand-authoring them anyway is what produced
 * three separate reviews quoting an identical placeholder $180/$280/$480
 * that matched no firm's real pricing. Generating the HTML removes the
 * opportunity.
 *
 *   node scripts/gen-truecost.mjs city-traders-imperium
 *   node scripts/gen-truecost.mjs crypto-fund-trader --product "Break Challenge"
 *
 * Output goes to stdout; paste it under the section's H2. Column headers
 * are written in the exact shape scripts/audit-reviews.mjs parses, so a
 * generated table always passes its own math audit.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { challengeCurrency, challengeTierEconomics } from '../lib/firms.ts'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const firmSlug = argv.find(a => !a.startsWith('--'))
const productFlag = argv.indexOf('--product')
const onlyProduct = productFlag >= 0 ? argv[productFlag + 1] : null

if (!firmSlug) {
  console.error('usage: node scripts/gen-truecost.mjs <firm-slug> [--product "Name"]')
  process.exit(1)
}

const file = path.join(ROOT, 'content/data/challenges', `${firmSlug}.json`)
if (!fs.existsSync(file)) {
  console.error(`no challenges file: ${path.relative(ROOT, file)}`)
  process.exit(1)
}

const TABLE = 'width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem;'
const TH = 'padding: 8px 12px; text-align: left;'
const TD = 'padding: 8px 12px; border-bottom: 1px solid var(--border);'
const TD_LAST = 'padding: 8px 12px;'

const money = (n, currency = 'USD') =>
  (currency === 'EUR' ? '€' : '$') + Math.round(n).toLocaleString('en-US')

const sizeLabel = n =>
  n % 1000 === 0 ? `$${n / 1000}K` : `$${n.toLocaleString('en-US')}`

const challenges = JSON.parse(fs.readFileSync(file, 'utf-8'))
const products = challenges.filter(c => {
  if (onlyProduct && c.productName !== onlyProduct) return false
  return (c.accountSizes ?? []).some(t => t.priceUsd != null || t.priceEur != null)
})

if (!products.length) {
  console.error(
    `no priced tiers for ${firmSlug}${onlyProduct ? ` / ${onlyProduct}` : ''} — ` +
      `capture pricing first (scripts/merge-capture.mjs)`
  )
  process.exit(1)
}

for (const c of products) {
  const accountSizes = c.accountSizes ?? []
  const currency = challengeCurrency(c)
  const tiers = accountSizes.filter(t =>
    currency === 'USD' ? t.priceUsd != null : t.priceEur != null
  )
  const split = c.profitSplitPct
  const ddPct = c.maxLossPct
  const dailyPct = c.dailyLossPct

  // Subscription products bill monthly until you pass, so the fee column
  // has to state a total, not a rate. We use the cheapest honest path —
  // one month plus any activation fee — and say so in the header, which
  // is also what keeps the audit's fee-vs-JSON check from comparing a
  // composite against a single tier price.
  const subscription = c.pricingModel === 'monthly-subscription'
  const splitPayment = c.pricingModel === 'split-payment'
  const activation = c.activationFeeUsd ?? 0
  const hasTierActivation = tiers.some(t => t.activationFeeUsd != null)
  const feeHeader =
    currency === 'EUR'
      ? 'Fee (EUR)'
      : subscription
        ? `Cost to funded (1 mo${activation ? ` + $${activation} activation` : ''})`
        : splitPayment
          ? 'Cost to funded (upfront + after pass)'
          : hasTierActivation
            ? 'Cost to funded (fee + tier activation)'
          : 'Fee'

  if (split == null) {
    console.error(`\n<!-- SKIPPED ${c.productName}: profitSplitPct is null, break-even is undefined -->`)
    continue
  }

  // Mirror the drawdown wording so a reader can see which cap the
  // R-multiple is measured against — "vs 10% max DD" vs "vs 6% trailing
  // max DD" are different claims.
  // A EUR fee against a USD account has no honest R-multiple or day count
  // until an EUR/USD rate is captured. The fee / split break-even remains
  // valid in EUR-equivalent profit, so emit that and omit the mixed-currency
  // columns instead of baking in an exchange rate that immediately rots.
  const hasTierDollarDrawdown =
    currency === 'USD' && tiers.some(t => t.maxLossUsd != null && t.maxLossUsd > 0)
  const hasTierDollarDailyLoss =
    currency === 'USD' && tiers.some(t => t.dailyLossUsd != null && t.dailyLossUsd > 0)
  const ddLabel =
    currency === 'EUR'
      ? null
      : hasTierDollarDrawdown
        ? 'R-multiple vs tier max loss'
        : ddPct == null
          ? null
          : `R-multiple vs ${ddPct}%${c.drawdownType === 'trailing' ? ' trailing' : ''} max DD`
  const daysLabel =
    currency === 'EUR'
      ? null
      : dailyPct != null
        ? `Days @ 1%/day (${dailyPct}% daily cap)`
        : 'Days @ 1%/day'

  const headers = [
    'Tier',
    feeHeader,
    `Break-even profit (${split}% split${currency === 'EUR' ? ', EUR' : ''})`,
  ]
  if (hasTierDollarDailyLoss) headers.push('Daily loss')
  if (hasTierDollarDrawdown) headers.push('Max loss')
  if (ddLabel) headers.push(ddLabel)
  if (daysLabel) headers.push(daysLabel)

  const rows = tiers.map((t, i) => {
    const economics = challengeTierEconomics(c, t)
    if (!economics) return ''
    const { minimumCost, breakEvenProfit, rMultiple, dayCount } = economics
    const td = i === tiers.length - 1 ? TD_LAST : TD
    const cells = [
      sizeLabel(t.sizeUsd),
      money(minimumCost, currency),
      money(breakEvenProfit, currency),
      ...(hasTierDollarDailyLoss
        ? [t.dailyLossUsd != null ? money(t.dailyLossUsd) : '—']
        : []),
      ...(hasTierDollarDrawdown
        ? [t.maxLossUsd != null ? money(t.maxLossUsd) : '—']
        : []),
      ...(ddLabel ? [rMultiple != null ? rMultiple.toFixed(2) : '—'] : []),
      ...(daysLabel ? [dayCount != null ? String(dayCount) : '—'] : []),
    ]
    return `    <tr>${cells.map(v => `<td style="${td}">${v}</td>`).join('')}</tr>`
  })

  console.log(`\n<!-- ${c.productName} — generated by scripts/gen-truecost.mjs -->`)
  console.log(`<table style="${TABLE}">`)
  console.log(`  <caption class="hidden-caption">${c.productName} true-cost projection</caption>`)
  console.log(
    `  <thead><tr style="background: var(--bg3);">` +
      headers.map(h => `<th style="${TH}">${h}</th>`).join('') +
      `</tr></thead>`
  )
  console.log('  <tbody>')
  console.log(rows.join('\n'))
  console.log('  </tbody>')
  console.log('</table>')
}

console.error(
  `\n[generated ${products.length} table(s) for ${firmSlug} — ` +
    `sourceCapturedAt ${products[0].sourceCapturedAt}]`
)
