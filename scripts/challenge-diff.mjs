/**
 * Semantic diff for normalized Challenge[] records.
 *
 * Capture dates and provenance notes intentionally do not appear here: they
 * change on every refresh without changing what a trader buys. Product terms,
 * tier availability, prices, risk controls, payouts, rules, and source URLs do.
 */

const PRODUCT_FIELDS = [
  ['productName', 'structure'],
  ['phases', 'structure'],
  ['pricingModel', 'pricing', 'one-off'],
  ['activationFeeUsd', 'pricing'],
  ['profitTargets.phase1', 'risk'],
  ['profitTargets.phase2', 'risk'],
  ['profitTargets.phase3', 'risk'],
  ['dailyLossPct', 'risk'],
  ['maxLossPct', 'risk'],
  ['drawdownType', 'risk'],
  ['fundedDailyLossPct', 'risk'],
  ['fundedMaxLossPct', 'risk'],
  ['fundedDrawdownType', 'risk'],
  ['minTradingDays', 'risk'],
  ['maxTradingDays', 'risk'],
  ['consistencyRulePct', 'risk'],
  ['profitSplitPct', 'payout'],
  ['payoutFirstDays', 'payout'],
  ['payoutFrequency', 'payout'],
  ['rules.news', 'rules'],
  ['rules.weekend', 'rules'],
  ['rules.overnight', 'rules'],
  ['rules.ea', 'rules'],
  ['rules.copyTrading', 'rules'],
  ['assetClass', 'structure'],
  ['sourceUrl', 'source'],
]

const TIER_FIELDS = [
  ['priceUsd', 'pricing'],
  ['priceEur', 'pricing'],
  ['payLaterUsd', 'pricing'],
  ['activationFeeUsd', 'pricing'],
  ['dailyLossUsd', 'risk'],
  ['maxLossUsd', 'risk'],
  ['refundable', 'pricing'],
]

const comparable = value => value === undefined ? null : value

function atPath(object, path, fallback = null) {
  const value = path.split('.').reduce(
    (current, key) => current == null ? undefined : current[key],
    object,
  )
  return value === undefined || value === null ? fallback : value
}

function equal(a, b) {
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b))
}

function severityFor(category, path, before, after) {
  if (category === 'source') return 'low'
  if (category === 'structure') return 'high'

  if (category === 'rules' && before === true && after !== true) return 'critical'
  if (
    category === 'risk'
    && typeof before === 'number'
    && typeof after === 'number'
  ) {
    if (/profitTargets\./.test(path) && after > before) return 'critical'
    if (/(?:dailyLoss|maxLoss)(?:Pct|Usd)$/.test(path) && after < before) return 'critical'
    if (path.endsWith('payoutFirstDays') && after > before) return 'critical'
  }
  if (
    category === 'payout'
    && path.endsWith('profitSplitPct')
    && typeof before === 'number'
    && typeof after === 'number'
    && after < before
  ) {
    return 'critical'
  }
  if (
    category === 'payout'
    && path.endsWith('payoutFirstDays')
    && typeof before === 'number'
    && typeof after === 'number'
    && after > before
  ) {
    return 'critical'
  }
  return 'high'
}

function change({
  firmSlug,
  product,
  category,
  path,
  before,
  after,
}) {
  return {
    firmSlug,
    productSlug: product.productSlug,
    productName: product.productName,
    category,
    severity: severityFor(category, path, before, after),
    path,
    before: comparable(before),
    after: comparable(after),
  }
}

function productMap(products) {
  return new Map((products ?? []).map(product => [product.productSlug, product]))
}

function tierMap(product) {
  return new Map((product.accountSizes ?? []).map(tier => [Number(tier.sizeUsd), tier]))
}

export function diffChallengeProducts(previous, next) {
  const changes = []
  const beforeProducts = productMap(previous)
  const afterProducts = productMap(next)
  const firmSlug = next?.[0]?.firmSlug ?? previous?.[0]?.firmSlug ?? null
  const slugs = [...new Set([...beforeProducts.keys(), ...afterProducts.keys()])].sort()

  for (const slug of slugs) {
    const before = beforeProducts.get(slug)
    const after = afterProducts.get(slug)

    if (!before && after) {
      changes.push(change({
        firmSlug,
        product: after,
        category: 'structure',
        path: 'product',
        before: null,
        after: 'added',
      }))
      continue
    }
    if (before && !after) {
      changes.push(change({
        firmSlug,
        product: before,
        category: 'structure',
        path: 'product',
        before: 'present',
        after: 'removed',
      }))
      continue
    }

    for (const [path, category, fallback = null] of PRODUCT_FIELDS) {
      const beforeValue = atPath(before, path, fallback)
      const afterValue = atPath(after, path, fallback)
      if (!equal(beforeValue, afterValue)) {
        changes.push(change({
          firmSlug,
          product: after,
          category,
          path,
          before: beforeValue,
          after: afterValue,
        }))
      }
    }

    const beforeTiers = tierMap(before)
    const afterTiers = tierMap(after)
    const sizes = [...new Set([...beforeTiers.keys(), ...afterTiers.keys()])].sort((a, b) => a - b)

    for (const sizeUsd of sizes) {
      const beforeTier = beforeTiers.get(sizeUsd)
      const afterTier = afterTiers.get(sizeUsd)
      const tierPath = `accountSizes[${sizeUsd}]`

      if (!beforeTier && afterTier) {
        changes.push(change({
          firmSlug,
          product: after,
          category: 'availability',
          path: tierPath,
          before: null,
          after: 'added',
        }))
        continue
      }
      if (beforeTier && !afterTier) {
        changes.push(change({
          firmSlug,
          product: after,
          category: 'availability',
          path: tierPath,
          before: 'present',
          after: 'removed',
        }))
        continue
      }

      for (const [field, category] of TIER_FIELDS) {
        const beforeValue = comparable(beforeTier[field])
        const afterValue = comparable(afterTier[field])
        if (!equal(beforeValue, afterValue)) {
          changes.push(change({
            firmSlug,
            product: after,
            category,
            path: `${tierPath}.${field}`,
            before: beforeValue,
            after: afterValue,
          }))
        }
      }
    }
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return changes.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
    || a.productName.localeCompare(b.productName)
    || a.path.localeCompare(b.path))
}

export function formatChallengeValue(value) {
  if (value === null || value === undefined) return 'unverified'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function summarizeChallengeChanges(changes) {
  const counts = new Map()
  for (const item of changes) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => `${category} ${count}`)
    .join(', ')
}
