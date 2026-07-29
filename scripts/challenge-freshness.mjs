/**
 * Editorial recapture queue for challenge datasets.
 *
 * Default:
 *   node scripts/challenge-freshness.mjs
 *
 * Useful variants:
 *   node scripts/challenge-freshness.mjs --window 30
 *   node scripts/challenge-freshness.mjs --json
 *   node scripts/challenge-freshness.mjs --strict
 *   node scripts/challenge-freshness.mjs --as-of 2026-08-25
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHALLENGES = path.join(ROOT, 'content/data/challenges')
const FIRMS = path.join(ROOT, 'content/data/firms.json')
const WATCH = path.join(ROOT, 'content/data/challenge-watch.json')
const MAX_AGE_DAYS = 30
const DAY_MS = 86_400_000

const argv = process.argv.slice(2)
const json = argv.includes('--json')
const strict = argv.includes('--strict')
const windowIndex = argv.indexOf('--window')
const windowDays = windowIndex >= 0 ? Number(argv[windowIndex + 1]) : 7
const asOfIndex = argv.indexOf('--as-of')
const asOfValue = asOfIndex >= 0 ? argv[asOfIndex + 1] : new Date().toISOString().slice(0, 10)

if (!Number.isInteger(windowDays) || windowDays < 0 || windowDays > 365) {
  console.error('--window must be an integer from 0 to 365')
  process.exit(1)
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfValue)) {
  console.error('--as-of must be YYYY-MM-DD')
  process.exit(1)
}

const asOf = new Date(`${asOfValue}T00:00:00Z`)
if (Number.isNaN(asOf.getTime())) {
  console.error('--as-of is not a real date')
  process.exit(1)
}

const slugify = value =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const firms = JSON.parse(fs.readFileSync(FIRMS, 'utf-8'))
const firmNameBySlug = new Map(firms.map(firm => [slugify(firm.name), firm.name]))
const watchEntries = fs.existsSync(WATCH)
  ? JSON.parse(fs.readFileSync(WATCH, 'utf-8'))
  : []

const files = fs.readdirSync(CHALLENGES)
  .filter(file => file.endsWith('.json'))
  .sort()

const datasets = files.map(file => {
  const firmSlug = file.replace(/\.json$/, '')
  const products = JSON.parse(fs.readFileSync(path.join(CHALLENGES, file), 'utf-8'))
  const captureDates = products
    .map(product => product.sourceCapturedAt)
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()
  const oldestCapture = captureDates[0] ?? null
  const newestCapture = captureDates.at(-1) ?? null
  const oldestDate = oldestCapture ? new Date(`${oldestCapture}T00:00:00Z`) : null
  const ageDays = oldestDate && !Number.isNaN(oldestDate.getTime())
    ? Math.floor((asOf.getTime() - oldestDate.getTime()) / DAY_MS)
    : null
  const daysRemaining = ageDays == null ? null : MAX_AGE_DAYS - ageDays
  const stale = ageDays == null || ageDays < 0 || ageDays > MAX_AGE_DAYS
  const dueSoon = !stale && daysRemaining <= windowDays
  const failureDate = oldestDate
    ? new Date(oldestDate.getTime() + (MAX_AGE_DAYS + 1) * DAY_MS)
        .toISOString().slice(0, 10)
    : null
  const tiers = products.flatMap(product => product.accountSizes ?? [])
  const pricedTiers = tiers.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0)).length
  const watches = watchEntries.filter(entry => entry.firmSlug === firmSlug)

  return {
    firmSlug,
    firmName: firmNameBySlug.get(firmSlug) ?? firmSlug,
    status: stale ? 'stale' : dueSoon ? 'due-soon' : 'current',
    oldestCapture,
    newestCapture,
    ageDays,
    daysRemaining,
    failsFreshnessOn: failureDate,
    products: products.length,
    tiers: tiers.length,
    pricedTiers,
    firstPartySources: new Set(products.map(product => product.sourceUrl)).size,
    watchEntries: watches.length,
    openWatches: watches.filter(entry => entry.status === 'watch').length,
  }
}).sort((a, b) =>
  (b.ageDays ?? Number.POSITIVE_INFINITY) - (a.ageDays ?? Number.POSITIVE_INFINITY)
  || a.firmName.localeCompare(b.firmName))

const stale = datasets.filter(dataset => dataset.status === 'stale')
const dueSoon = datasets.filter(dataset => dataset.status === 'due-soon')
const current = datasets.filter(dataset => dataset.status === 'current')
const nextFailure = datasets
  .filter(dataset => dataset.failsFreshnessOn && dataset.status !== 'stale')
  .map(dataset => dataset.failsFreshnessOn)
  .sort()
  .at(0) ?? null

const report = {
  asOf: asOfValue,
  maxAgeDays: MAX_AGE_DAYS,
  windowDays,
  summary: {
    datasets: datasets.length,
    fresh: datasets.length - stale.length,
    outsideQueue: current.length,
    dueSoon: dueSoon.length,
    stale: stale.length,
    nextFailure,
  },
  queue: datasets.filter(dataset => dataset.status !== 'current' || dataset.daysRemaining <= windowDays),
  datasets,
}

if (json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`Challenge freshness queue — ${asOfValue} (${MAX_AGE_DAYS}-day gate)`)
  console.log(
    `${datasets.length} dataset(s): ${datasets.length - stale.length} fresh, ` +
    `${dueSoon.length} queued within ${windowDays} day(s), ${stale.length} stale`,
  )
  console.log(`Next freshness failure: ${nextFailure ?? 'none scheduled'}`)

  if (!report.queue.length) {
    console.log(`\nNo dataset needs recapture inside the next ${windowDays} day(s).`)
  } else {
    console.log('')
    for (const dataset of report.queue) {
      const status = dataset.status.toUpperCase()
      const remaining = dataset.daysRemaining == null
        ? 'invalid capture date'
        : dataset.daysRemaining < 0
          ? `${Math.abs(dataset.daysRemaining)} day(s) overdue`
          : `${dataset.daysRemaining} day(s) remaining`
      console.log(
        `[${status}] ${dataset.firmName} — captured ${dataset.oldestCapture ?? 'invalid'}; ` +
        `${remaining}; ${dataset.products} product(s), ${dataset.pricedTiers}/${dataset.tiers} priced tier(s)` +
        `${dataset.openWatches ? `; ${dataset.openWatches} open watch(es)` : ''}`,
      )
    }
  }
}

process.exit(strict && stale.length ? 1 : 0)
