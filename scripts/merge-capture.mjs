/**
 * Merge a capture pass into content/data/challenges/<firm>.json.
 *
 * Capture files are gathered by research agents against firms' live pricing
 * pages and carry per-field `evidence` quotes. Those quotes are review
 * scaffolding, not part of the shipped schema — this script projects a
 * capture down to the `Challenge` shape in lib/firms.ts, validates it, and
 * refuses to write anything that would violate the data-model rules in
 * AGENTS.md ("Always cite sourceUrl + sourceCapturedAt"; "Never invent
 * numbers — use null").
 *
 * Dry-run by default. Nothing touches the repo without --write.
 *
 *   node scripts/merge-capture.mjs                 # preview every capture
 *   node scripts/merge-capture.mjs --write         # apply
 *   node scripts/merge-capture.mjs maven --write --accept-changes
 *   node scripts/merge-capture.mjs --dir <path>    # alternate capture dir
 *
 * A write containing material product, price, risk, payout, or rule changes
 * requires --accept-changes after the editor reviews the field-level diff.
 * Capture dates and provenance notes do not count as material changes.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  diffChallengeProducts,
  formatChallengeValue,
  summarizeChallengeChanges,
} from './challenge-diff.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHALLENGES = path.join(ROOT, 'content/data/challenges')
const DEFAULT_CAPTURE_DIR = path.join(os.tmpdir(), 'tradersfundhub-captures')

const DRAWDOWN_TYPES = ['static', 'trailing', 'eod-trailing', 'balance-based']
const PAYOUT_FREQUENCIES = ['weekly', 'bi-weekly', 'monthly', 'on-demand']
const ASSET_CLASSES = ['cfd', 'futures', 'crypto', 'prediction-markets']
const PRICING_MODELS = ['one-off', 'monthly-subscription', 'split-payment']

const argv = process.argv.slice(2)
const write = argv.includes('--write')
const acceptChanges = argv.includes('--accept-changes')
const dirFlag = argv.indexOf('--dir')
const captureDir = dirFlag >= 0 ? argv[dirFlag + 1] : DEFAULT_CAPTURE_DIR
const only = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--dir')

/** Normalise "" / "null" / undefined to a real null. Agents serialise the
 *  string "null" for enum fields more often than you'd hope. */
const nn = v => (v === undefined || v === '' || v === 'null' ? null : v)

const validCaptureDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() <= Date.now()
}

const num = v => {
  const x = nn(v)
  if (x === null) return null
  const n = typeof x === 'number' ? x : parseFloat(String(x).replace(/[$,%\s,]/g, ''))
  return Number.isFinite(n) ? n : null
}

const bool = v => {
  const x = nn(v)
  if (x === null) return null
  if (typeof x === 'boolean') return x
  const s = String(x).trim().toLowerCase()
  if (['true', 'yes', 'allowed'].includes(s)) return true
  if (['false', 'no', 'banned', 'prohibited'].includes(s)) return false
  if (/^(not allowed|not permitted|prohibited|banned|disallowed)\b/.test(s)) return false
  return null
}

const projectRule = (where, field, value, problems) => {
  const x = nn(value)
  if (x === null || typeof x === 'boolean') return x
  const s = String(x).trim().toLowerCase()
  if (s === 'restricted') return 'restricted'

  const exact = bool(x)
  if (exact !== null) return exact
  if (/^(restricted|partially allowed)\b/.test(s)) return 'restricted'
  // Weekend holding has its own field. A sentence such as "overnight is
  // allowed on weekdays, but weekend holds are prohibited" therefore means
  // overnight=true and weekend=false, not a restricted overnight policy.
  if (field === 'overnight' && /\ballowed on weekdays?\b/.test(s)) return true
  if (/\bpersonal .+ only\b|\bno third-party\b/.test(s)) return 'restricted'
  if (/\brestriction\b/.test(s)) return 'restricted'
  if (field === 'copyTrading' && /\b(immediate account closure|violation consequence)\b/.test(s)) {
    return false
  }

  const allows = /\b(allowed|permitted|free to|no restrictions?|no news rule)\b/.test(s)
  const bans = /\b(not allowed|not permitted|prohibited|banned|disallowed|cannot|can't|must be (?:out|flat|closed)|close all|no positions?)\b/.test(s)
  const qualified = /\b(only|except|but|however|subject|restriction|window|third-party|publicly|commercially|evaluation|funded|master account|pro or pro\+|affected currencies?)\b/.test(s)

  let projected = null
  if (allows && (bans || qualified)) projected = 'restricted'
  else if (allows) projected = true
  else if (bans && qualified && field !== 'weekend') projected = 'restricted'
  else if (bans) projected = false

  if (nn(value) !== null && projected === null) {
    problems.push(`${where}: rules.${field} is non-null but cannot be normalised: ${JSON.stringify(value)}`)
  }
  return projected
}

const enumOrNull = (v, allowed) => {
  const x = nn(v)
  return x !== null && allowed.includes(x) ? x : null
}

function projectProduct(firmSlug, p, capturedAt, problems) {
  const where = `${firmSlug} / ${p.productName ?? '(unnamed)'}`

  const sourceUrl = nn(p.sourceUrl)
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    problems.push(`${where}: sourceUrl must be the firm's public URL, got ${JSON.stringify(sourceUrl)}`)
  } else if (/tradersfundhub\.com/i.test(sourceUrl)) {
    problems.push(`${where}: sourceUrl points at our own site — circular citation`)
  }

  const accountSizes = (p.accountSizes ?? [])
    .map(t => ({
      sizeUsd: num(t.sizeUsd),
      priceUsd: num(t.priceUsd),
      // Firms that price in euros (FTMO) keep the figure in its own
      // currency — converting at capture time would bake in a stale FX rate.
      ...(num(t.priceEur) !== null ? { priceEur: num(t.priceEur) } : {}),
      ...(num(t.payLaterUsd) !== null ? { payLaterUsd: num(t.payLaterUsd) } : {}),
      ...(num(t.activationFeeUsd) !== null
        ? { activationFeeUsd: num(t.activationFeeUsd) }
        : {}),
      ...(num(t.dailyLossUsd) !== null ? { dailyLossUsd: num(t.dailyLossUsd) } : {}),
      // Futures firms commonly publish a fixed dollar drawdown per tier
      // rather than one percentage shared by every account size.
      ...(num(t.maxLossUsd) !== null ? { maxLossUsd: num(t.maxLossUsd) } : {}),
      // An unstated refund policy is not a refund promise. Preserve null.
      refundable: bool(t.refundable),
    }))
    .filter(t => {
      if (t.sizeUsd == null) problems.push(`${where}: dropped a tier with no sizeUsd`)
      return t.sizeUsd != null
    })

  if (!accountSizes.length) problems.push(`${where}: no usable account tiers`)

  const phases = num(p.phases)
  if (phases === null || ![0, 1, 2, 3].includes(phases)) {
    problems.push(`${where}: phases must be 0-3, got ${JSON.stringify(p.phases)}`)
  }

  const assetClass = enumOrNull(p.assetClass, ASSET_CLASSES)
  if (!assetClass) problems.push(`${where}: assetClass must be one of ${ASSET_CLASSES.join('/')}`)

  const targets = p.profitTargets ?? {}
  const profitTargets =
    [targets.phase1, targets.phase2, targets.phase3].every(v => num(v) === null)
      ? null
      : {
          ...(num(targets.phase1) !== null ? { phase1: num(targets.phase1) } : {}),
          ...(num(targets.phase2) !== null ? { phase2: num(targets.phase2) } : {}),
          ...(num(targets.phase3) !== null ? { phase3: num(targets.phase3) } : {}),
        }

  const rules = p.rules ?? {}
  const notes = Array.isArray(p.notes) ? [...p.notes] : []

  return {
    firmSlug,
    productName: nn(p.productName) ?? '(unnamed)',
    productSlug: nn(p.productSlug) ?? String(nn(p.productName) ?? 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    phases: phases ?? null,
    accountSizes,
    profitTargets,
    dailyLossPct: num(p.dailyLossPct),
    maxLossPct: num(p.maxLossPct),
    drawdownType: enumOrNull(p.drawdownType, DRAWDOWN_TYPES),
    ...(p.fundedDailyLossPct !== undefined
      ? { fundedDailyLossPct: num(p.fundedDailyLossPct) }
      : {}),
    ...(p.fundedMaxLossPct !== undefined
      ? { fundedMaxLossPct: num(p.fundedMaxLossPct) }
      : {}),
    ...(p.fundedDrawdownType !== undefined
      ? { fundedDrawdownType: enumOrNull(p.fundedDrawdownType, DRAWDOWN_TYPES) }
      : {}),
    minTradingDays: num(p.minTradingDays),
    maxTradingDays: num(p.maxTradingDays),
    consistencyRulePct: num(p.consistencyRulePct),
    profitSplitPct: num(p.profitSplitPct),
    payoutFirstDays: num(p.payoutFirstDays),
    payoutFrequency: enumOrNull(p.payoutFrequency, PAYOUT_FREQUENCIES),
    rules: {
      news: projectRule(where, 'news', rules.news, problems),
      weekend: projectRule(where, 'weekend', rules.weekend, problems),
      overnight: projectRule(where, 'overnight', rules.overnight, problems),
      ea: projectRule(where, 'ea', rules.ea, problems),
      copyTrading: projectRule(where, 'copyTrading', rules.copyTrading, problems),
    },
    // Futures firms bill the evaluation monthly rather than once. Carrying
    // this through matters: gen-truecost.mjs uses it to print a cost-to-
    // funded total instead of quoting a monthly rate as if it were the
    // whole price.
    ...(enumOrNull(p.pricingModel, PRICING_MODELS)
      ? { pricingModel: enumOrNull(p.pricingModel, PRICING_MODELS) }
      : {}),
    ...(num(p.activationFeeUsd) !== null ? { activationFeeUsd: num(p.activationFeeUsd) } : {}),
    assetClass,
    sourceUrl,
    sourceCapturedAt: capturedAt,
    ...(notes.length ? { notes } : {}),
  }
}

/* ── run ────────────────────────────────────────────────────────── */

if (!fs.existsSync(captureDir)) {
  console.error(`capture dir not found: ${captureDir}`)
  process.exit(1)
}

const files = fs
  .readdirSync(captureDir)
  .filter(f =>
    /^(?:capture-.+|[a-z0-9-]+-\d{4}-\d{2}-\d{2})\.json$/.test(f))
  .filter(f => !only || f.includes(only))

if (!files.length) {
  console.log(`no capture JSON files in ${captureDir}${only ? ` matching "${only}"` : ''}`)
  process.exit(0)
}

let blocked = 0
for (const file of files) {
  let capture
  try {
    capture = JSON.parse(fs.readFileSync(path.join(captureDir, file), 'utf-8'))
  } catch (e) {
    console.log(`\n✗ ${file}\n  · unparseable JSON: ${e.message}`)
    blocked++
    continue
  }

  const firmSlug = nn(capture.firmSlug)
  const capturedAt = nn(capture.capturedAt)
  const problems = []
  if (!firmSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(firmSlug)) {
    problems.push(`invalid or missing firmSlug: ${JSON.stringify(firmSlug)}`)
  }
  if (!validCaptureDate(capturedAt)) {
    problems.push(`capturedAt must be a real, non-future YYYY-MM-DD date; got ${JSON.stringify(capturedAt)}`)
  }
  if (problems.length) {
    console.log(`\n✗ ${file}`)
    for (const problem of problems) console.log(`  · ${problem}`)
    blocked++
    continue
  }

  const products = (capture.products ?? []).map(p =>
    projectProduct(firmSlug, p, capturedAt, problems)
  )

  const target = path.join(CHALLENGES, `${firmSlug}.json`)
  const prior = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf-8')) : []
  const priorTiers = prior.flatMap(c => c.accountSizes ?? [])
  const newTiers = products.flatMap(c => c.accountSizes ?? [])
  const priced = newTiers.filter(t => t.priceUsd != null).length
  const changes = diffChallengeProducts(prior, products)

  console.log(`\n${problems.length ? '⚠' : '✓'} ${firmSlug}  (${file})`)
  console.log(
    `  products ${prior.length} → ${products.length}   ` +
      `tiers ${priorTiers.length} → ${newTiers.length}   ` +
      `priced ${priorTiers.filter(t => t.priceUsd != null).length} → ${priced}`
  )
  console.log(
    `  material changes ${changes.length}` +
      (changes.length
        ? ` (${summarizeChallengeChanges(changes)})`
        : ' (capture date/provenance ignored)'),
  )
  for (const item of changes.slice(0, 60)) {
    console.log(
      `  [${item.severity.toUpperCase()}][${item.category}] ` +
      `${item.productName} · ${item.path}: ` +
      `${formatChallengeValue(item.before)} → ${formatChallengeValue(item.after)}`,
    )
  }
  if (changes.length > 60) {
    console.log(`  · ${changes.length - 60} additional change(s) omitted from console output`)
  }
  if (capture.accessNotes) console.log(`  access: ${capture.accessNotes}`)
  for (const p of problems) console.log(`  · ${p}`)
  if (problems.length) {
    console.log('  → SKIPPED: capture validation failed')
    blocked++
    continue
  }

  // Guard against regression, not against unpriced captures as such.
  // Overwriting priced data with nulls loses real information. But when
  // the existing file was already unpriced, an unpriced capture is still a
  // clear gain: it swaps a circular /blog/... sourceUrl for the firm's own
  // URL and brings corrected rules. FTMO and FundingPips both land here —
  // one prices in EUR, the other sits behind a bot wall.
  const priorPriced = priorTiers.filter(t => t.priceUsd != null).length
  if (!priced && priorPriced) {
    console.log(`  → SKIPPED: capture has no prices but the existing file has ${priorPriced}; refusing to regress`)
    blocked++
    continue
  }
  if (!priced) {
    const eur = newTiers.filter(t => t.priceEur != null).length
    console.log(
      `  → note: no USD prices resolved${eur ? ` (${eur} tier(s) priced in EUR)` : ''} — ` +
        `merging for the corrected rules and real sourceUrl; pricing gap stays visible`
    )
  }

  if (write && changes.length && !acceptChanges) {
    console.log(
      '  → SKIPPED: material changes require editorial review; ' +
      're-run with --accept-changes after checking the diff and challenge-watch draft',
    )
    blocked++
    continue
  }
  if (write && changes.length) {
    console.log(
      '  → change review acknowledged; update content/data/challenge-watch.json ' +
      'when the change affects a trader purchase decision',
    )
  }

  // The capture carries per-field evidence quotes, unresolved price
  // conflicts, and JS-gating caveats that the Challenge schema has nowhere
  // to put — but which an editor re-verifying these numbers in 30 days
  // badly needs. Archive the raw capture and point the shipped data at it.
  // `_captures/` is a directory, so getAllChallenges()'s .json filter skips it.
  const archiveDir = path.join(CHALLENGES, '_captures')
  const archiveName = `${firmSlug}-${capturedAt}.json`
  const provenance = `Capture provenance, per-field evidence quotes, and unresolved conflicts: content/data/challenges/_captures/${archiveName}`
  for (const product of products) {
    product.notes = [...(product.notes ?? []), provenance]
  }

  if (write) {
    fs.mkdirSync(archiveDir, { recursive: true })
    fs.writeFileSync(path.join(archiveDir, archiveName), JSON.stringify(capture, null, 2) + '\n')
    fs.writeFileSync(target, JSON.stringify(products, null, 2) + '\n')
    console.log(`  → wrote ${path.relative(ROOT, target)} + _captures/${archiveName}`)
  } else {
    console.log(`  → dry-run (pass --write to apply)`)
  }
}

console.log(
  `\n${files.length} capture(s), ${blocked} skipped.` +
    (write ? '' : ' Dry run — nothing written.')
)
