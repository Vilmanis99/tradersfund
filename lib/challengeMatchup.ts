/**
 * Product-level data for a `/compare/<a>-vs-<b>` page.
 *
 * The firm aggregate in `firms.json` carries one profit split, one drawdown
 * type and one answer per trading rule. Real firms don't work that way:
 * Topstep's two Combine paths disagree on whether EAs are allowed, and
 * FTMO's 1-Step and 2-Step differ on both split and drawdown. A comparison
 * built only on the aggregate silently picks one product's terms and
 * presents them as the firm's.
 *
 * This module reads `content/data/challenges/<firm>.json` for both sides and
 * exposes three things the aggregate cannot:
 *
 *   1. Cost to funded at account sizes both firms actually sell, using the
 *      same `challengeTierEconomics()` the review tables are generated from.
 *   2. A rule-by-rule diff that names the products behind each value, so
 *      intra-firm disagreement is visible rather than averaged away.
 *   3. The dated change-watch entries covering either firm.
 *
 * Nothing here invents a figure. Where a firm publishes no value the row
 * says so; where two firms can't be compared honestly (different currency,
 * different billing model) the "cheaper" call is withheld with a reason.
 */

import {
  challengeCurrency,
  challengeTierEconomics,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
  type ChallengeCurrency,
  type DrawdownType,
  type PayoutFrequency,
  type RuleAvailability,
} from './firms'
import { getChallengeWatchEntries, type ChallengeWatchEntry } from './challengeWatch'

export type MatchupSide = 'a' | 'b'

/* ── Loading ───────────────────────────────────────────────────── */

// 120 compare pages × 2 firms would otherwise re-read and re-parse the same
// JSON 240 times per build. The data is static for the life of the process.
const freshCache = new Map<string, Challenge[]>()

/**
 * Every product for a firm that passes the 30-day capture gate.
 *
 * Exported so the feature pages qualify firms against the same product set
 * a comparison shows. Two different freshness paths would let a firm appear
 * on "prop firms that allow EAs" using a product the compare page has
 * already dropped as stale.
 */
export function freshChallenges(slug: string): Challenge[] {
  const cached = freshCache.get(slug)
  if (cached) return cached
  const rows = getChallengesByFirm(slug).filter(c => isChallengeFresh(c))
  freshCache.set(slug, rows)
  return rows
}

/* ── Formatting ────────────────────────────────────────────────── */

export function formatMoney(value: number, currency: ChallengeCurrency = 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : '$'
  const rounded = Math.round(value)
  return `${symbol}${rounded.toLocaleString('en-US')}`
}

export function formatSize(sizeUsd: number): string {
  return sizeUsd % 1000 === 0
    ? `$${sizeUsd / 1000}K`
    : `$${sizeUsd.toLocaleString('en-US')}`
}

function titleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatPhases(phases: Challenge['phases']): string {
  if (phases === 0) return 'Instant funding'
  return `${phases}-step`
}

function formatRule(value: RuleAvailability): string {
  if (value === true) return 'Allowed'
  if (value === false) return 'Not allowed'
  if (value === 'restricted') return 'Conditional'
  return 'Not published'
}

function formatPct(value: number | null): string {
  return value == null ? 'Not published' : `${value}%`
}

/**
 * Loss caps come in two shapes. Futures firms publish a fixed dollar limit
 * per tier ("$2,000 on the $50K") instead of a percentage, so a null
 * percentage there means "expressed differently", not "unpublished" — and
 * saying the latter would understate what the firm actually discloses.
 */
function formatCap(pct: number | null, hasTierDollarCap: boolean): string {
  if (pct != null) return `${pct}%`
  return hasTierDollarCap ? 'Fixed $ per tier' : 'Not published'
}

function formatDrawdown(value: DrawdownType | null): string {
  if (value == null) return 'Not published'
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'Balance-based'
  return titleCase(value)
}

function formatFrequency(value: PayoutFrequency | null): string {
  if (value == null) return 'Not published'
  if (value === 'on-demand') return 'On demand'
  if (value === 'bi-weekly') return 'Bi-weekly'
  return titleCase(value)
}

function formatAssetClass(assetClass: Challenge['assetClass']): string {
  if (assetClass === 'cfd') return 'CFD'
  if (assetClass === 'prediction-markets') return 'prediction-market'
  return assetClass
}

export function formatBillingModel(model: Challenge['pricingModel']): string {
  if (model === 'monthly-subscription') return 'Monthly'
  if (model === 'split-payment') return 'Split payment'
  return 'One-time'
}

/* ── Cost comparison ───────────────────────────────────────────── */

export interface MatchupCostRow {
  side: MatchupSide
  firmName: string
  firmSlug: string
  productName: string
  productSlug: string
  phases: Challenge['phases']
  pricingModel: NonNullable<Challenge['pricingModel']>
  assetClass: Challenge['assetClass']
  currency: ChallengeCurrency
  /** Minimum cash to reach funded, in `currency`. */
  minimumCost: number
  /** What `minimumCost` is made of — never left implicit. */
  costBasis: string
  profitSplitPct: number
  breakEvenProfit: number
  /** Null on EUR rows and where no loss cap is published. */
  rMultiple: number | null
  dayCount: number | null
  /** What the R-multiple is measured against. Null when suppressed. */
  rBasis: string | null
  drawdownType: DrawdownType | null
  sourceUrl: string
  capturedAt: string
}

export interface MatchupCostTie {
  currency: ChallengeCurrency
  pricingModel: NonNullable<Challenge['pricingModel']>
  minimumCost: number
}

export interface MatchupCostGroup {
  sizeUsd: number
  rows: MatchupCostRow[]
  /** Cheapest verified route, only when the rows are honestly comparable. */
  cheapest: MatchupCostRow | null
  /** An equal minimum on both sides of the one compatible comparison class. */
  tie: MatchupCostTie | null
  /** Why no comparison class could produce an outcome. */
  blockedReason: string | null
}

/** Human description of what a product's minimum cost includes. */
function costBasisLabel(challenge: Challenge, currency: ChallengeCurrency): string {
  if (currency === 'EUR') return 'Published fee (EUR)'
  const model = challenge.pricingModel ?? 'one-off'
  const activation = challenge.activationFeeUsd ?? 0
  if (model === 'monthly-subscription') {
    return activation > 0
      ? `1 month + ${formatMoney(activation)} activation`
      : '1 month, no activation fee'
  }
  if (model === 'split-payment') return 'Upfront + due after passing'
  const hasTierActivation = challenge.accountSizes.some(t => t.activationFeeUsd != null)
  return hasTierActivation ? 'Fee + tier activation' : 'One-time fee'
}

/** What the R-multiple divides by, mirroring the review tables' wording. */
function rBasisLabel(
  challenge: Challenge,
  tierMaxLossUsd: number | null | undefined,
): string | null {
  if (tierMaxLossUsd != null && tierMaxLossUsd > 0) {
    return `vs ${formatMoney(tierMaxLossUsd)} tier max loss`
  }
  if (challenge.maxLossPct == null) return null
  const trailing = challenge.drawdownType === 'trailing' ? ' trailing' : ''
  return `vs ${challenge.maxLossPct}%${trailing} max DD`
}

function buildCostRows(
  side: MatchupSide,
  firmName: string,
  firmSlug: string,
  challenges: Challenge[],
  sizeUsd: number,
): MatchupCostRow[] {
  const rows: MatchupCostRow[] = []
  for (const challenge of challenges) {
    const tier = challenge.accountSizes.find(t => t.sizeUsd === sizeUsd)
    if (!tier) continue
    const economics = challengeTierEconomics(challenge, tier)
    if (!economics) continue
    rows.push({
      side,
      firmName,
      firmSlug,
      productName: challenge.productName,
      productSlug: challenge.productSlug,
      phases: challenge.phases,
      pricingModel: challenge.pricingModel ?? 'one-off',
      assetClass: challenge.assetClass,
      currency: economics.currency,
      minimumCost: economics.minimumCost,
      costBasis: costBasisLabel(challenge, economics.currency),
      // Non-null by construction: challengeTierEconomics() returns null
      // when the split is missing, so any row reaching here has one.
      profitSplitPct: challenge.profitSplitPct as number,
      breakEvenProfit: economics.breakEvenProfit,
      rMultiple: economics.rMultiple,
      dayCount: economics.dayCount,
      rBasis: economics.rMultiple == null ? null : rBasisLabel(challenge, tier.maxLossUsd),
      drawdownType: challenge.drawdownType,
      sourceUrl: challenge.sourceUrl,
      capturedAt: challenge.sourceCapturedAt,
    })
  }
  return rows
}

interface ComparableCostClass {
  currency: ChallengeCurrency
  pricingModel: NonNullable<Challenge['pricingModel']>
  rows: MatchupCostRow[]
}

function costClassKey(row: MatchupCostRow): string {
  return `${row.currency}:${row.pricingModel}`
}

function costClassLabel(costClass: Pick<ComparableCostClass, 'currency' | 'pricingModel'>): string {
  return `${costClass.currency} ${formatBillingModel(costClass.pricingModel).toLowerCase()}`
}

/**
 * Decide whether a "cheapest" call is defensible for one account size.
 *
 * Products that do not share a currency and billing model remain visible in
 * the table, but do not poison a valid shared class. This matters for firms
 * such as Maven, which sells both one-off and split-payment products: its
 * split-payment row should not suppress an otherwise like-for-like one-off
 * comparison. When both firms share more than one class, the current single
 * winner shape cannot merge those classes honestly, so it fails closed.
 */
function resolveCheapest(rows: MatchupCostRow[], sizeUsd: number): {
  cheapest: MatchupCostRow | null
  tie: MatchupCostTie | null
  blockedReason: string | null
} {
  const sides = new Set(rows.map(r => r.side))
  if (rows.length < 2 || sides.size < 2) {
    return { cheapest: null, tie: null, blockedReason: null }
  }

  const classes = new Map<string, ComparableCostClass>()
  for (const row of rows) {
    const key = costClassKey(row)
    const existing = classes.get(key)
    if (existing) existing.rows.push(row)
    else {
      classes.set(key, {
        currency: row.currency,
        pricingModel: row.pricingModel,
        rows: [row],
      })
    }
  }

  const sharedClasses = [...classes.values()]
    .filter(costClass => new Set(costClass.rows.map(row => row.side)).size === 2)

  if (!sharedClasses.length) {
    const bySide = (side: MatchupSide) => [...classes.values()]
      .filter(costClass => costClass.rows.some(row => row.side === side))
      .map(costClassLabel)
      .join(' or ')
    const aName = rows.find(row => row.side === 'a')?.firmName ?? 'The first firm'
    const bName = rows.find(row => row.side === 'b')?.firmName ?? 'the second firm'
    return {
      cheapest: null,
      tie: null,
      blockedReason: `${aName} offers ${bySide('a')}; ${bName} offers ${bySide('b')} at this tier. `
        + `No currency-and-billing class appears on both sides, so we neither convert currencies nor rank a recurring floor against a fixed total.`,
    }
  }

  if (sharedClasses.length > 1) {
    return {
      cheapest: null,
      tie: null,
      blockedReason: `Both firms share ${sharedClasses.length} comparison classes at ${formatSize(sizeUsd)} `
        + `(${sharedClasses.map(costClassLabel).join(' and ')}). A single winner would merge different payment structures, so compare the rows within each class.`,
    }
  }

  const comparable = sharedClasses[0]
  const bestA = comparable.rows
    .filter(row => row.side === 'a')
    .sort((x, y) => x.minimumCost - y.minimumCost)[0]
  const bestB = comparable.rows
    .filter(row => row.side === 'b')
    .sort((x, y) => x.minimumCost - y.minimumCost)[0]

  if (bestA.minimumCost === bestB.minimumCost) {
    return {
      cheapest: null,
      tie: {
        currency: comparable.currency,
        pricingModel: comparable.pricingModel,
        minimumCost: bestA.minimumCost,
      },
      blockedReason: null,
    }
  }

  return {
    cheapest: bestA.minimumCost < bestB.minimumCost ? bestA : bestB,
    tie: null,
    blockedReason: null,
  }
}

/* ── Rule diff ─────────────────────────────────────────────────── */

export interface RuleValueGroup {
  display: string
  /** Products holding this value — named so intra-firm splits are visible. */
  products: string[]
}

export interface MatchupRuleRow {
  label: string
  a: RuleValueGroup[]
  b: RuleValueGroup[]
  /** False when a firm's own products disagree on this row. */
  aUniform: boolean
  bUniform: boolean
  /** True when both firms land on the same single value. */
  same: boolean
}

interface RuleDef {
  label: string
  get: (c: Challenge) => string
  /** Skip the row when every product on both sides is unpublished. */
  omitWhenAllUnpublished?: boolean
}

const RULE_DEFS: RuleDef[] = [
  { label: 'Evaluation steps', get: c => formatPhases(c.phases) },
  { label: 'Profit split', get: c => formatPct(c.profitSplitPct) },
  { label: 'Drawdown method', get: c => formatDrawdown(c.drawdownType) },
  {
    label: 'Daily loss cap',
    get: c => formatCap(c.dailyLossPct, c.accountSizes.some(t => t.dailyLossUsd != null)),
  },
  {
    label: 'Max loss cap',
    get: c => formatCap(c.maxLossPct, c.accountSizes.some(t => t.maxLossUsd != null)),
  },
  {
    label: 'Funded drawdown',
    get: c => formatDrawdown(c.fundedDrawdownType ?? c.drawdownType),
    omitWhenAllUnpublished: true,
  },
  // Schema semantics: null min = no requirement, null max = unlimited.
  { label: 'Min trading days', get: c => (c.minTradingDays == null ? 'None' : String(c.minTradingDays)) },
  { label: 'Max trading days', get: c => (c.maxTradingDays == null ? 'Unlimited' : String(c.maxTradingDays)) },
  { label: 'Consistency rule', get: c => (c.consistencyRulePct == null ? 'None published' : `${c.consistencyRulePct}%`) },
  { label: 'First payout after', get: c => (c.payoutFirstDays == null ? 'Not published' : `${c.payoutFirstDays} days`) },
  { label: 'Payout frequency', get: c => formatFrequency(c.payoutFrequency) },
  { label: 'News trading', get: c => formatRule(c.rules.news) },
  { label: 'Weekend holding', get: c => formatRule(c.rules.weekend) },
  { label: 'Overnight holding', get: c => formatRule(c.rules.overnight) },
  { label: 'EAs / algos', get: c => formatRule(c.rules.ea) },
  { label: 'Copy trading', get: c => formatRule(c.rules.copyTrading) },
]

function groupValues(challenges: Challenge[], get: (c: Challenge) => string): RuleValueGroup[] {
  const byValue = new Map<string, string[]>()
  for (const challenge of challenges) {
    const value = get(challenge)
    const list = byValue.get(value)
    if (list) list.push(challenge.productName)
    else byValue.set(value, [challenge.productName])
  }
  return [...byValue.entries()]
    .map(([display, products]) => ({ display, products }))
    .sort((x, y) => y.products.length - x.products.length || x.display.localeCompare(y.display))
}

function buildRuleRows(a: Challenge[], b: Challenge[]): MatchupRuleRow[] {
  const rows: MatchupRuleRow[] = []
  for (const def of RULE_DEFS) {
    const groupsA = groupValues(a, def.get)
    const groupsB = groupValues(b, def.get)
    if (!groupsA.length && !groupsB.length) continue

    const unpublished = (groups: RuleValueGroup[]) =>
      groups.every(g => g.display === 'Not published' || g.display === 'None published')
    if (def.omitWhenAllUnpublished && unpublished(groupsA) && unpublished(groupsB)) continue

    const same =
      groupsA.length === 1 && groupsB.length === 1 && groupsA[0].display === groupsB[0].display
    rows.push({
      label: def.label,
      a: groupsA,
      b: groupsB,
      aUniform: groupsA.length <= 1,
      bUniform: groupsB.length <= 1,
      same,
    })
  }
  return rows
}

/* ── Public shape ──────────────────────────────────────────────── */

export interface MatchupFirmSummary {
  slug: string
  name: string
  /** Products passing the 30-day freshness gate. */
  productCount: number
  /** Distinct starting profit splits across those products. */
  profitSplits: number[]
  /** Distinct drawdown methods across those products. */
  drawdownTypes: string[]
  /** Account sizes with at least one verified price. */
  pricedSizes: number[]
  assetClasses: string[]
  currencies: ChallengeCurrency[]
  billingModels: string[]
}

export interface MatchupSource {
  firmName: string
  /** Every fresh product supported by this first-party page. */
  productNames: string[]
  url: string
  capturedAt: string
}

export interface ChallengeMatchup {
  /** False when either firm has no fresh product data — caller skips the section. */
  hasData: boolean
  a: MatchupFirmSummary
  b: MatchupFirmSummary
  costGroups: MatchupCostGroup[]
  /** Set when the firms share no priced account size. */
  noSharedSizeNote: string | null
  ruleRows: MatchupRuleRow[]
  /** Rows where the two firms differ, or where one firm differs from itself. */
  divergentCount: number
  /** Rows where a single firm's own products disagree. */
  intraFirmSplits: MatchupRuleRow[]
  watch: ChallengeWatchEntry[]
  sources: MatchupSource[]
  latestCapture: string | null
}

function summarise(slug: string, name: string, challenges: Challenge[]): MatchupFirmSummary {
  const pricedSizes = new Set<number>()
  for (const challenge of challenges) {
    for (const tier of challenge.accountSizes) {
      if (challengeTierEconomics(challenge, tier)) pricedSizes.add(tier.sizeUsd)
    }
  }
  return {
    slug,
    name,
    productCount: challenges.length,
    profitSplits: [...new Set(challenges.flatMap(challenge =>
      challenge.profitSplitPct == null ? [] : [challenge.profitSplitPct],
    ))].sort((x, y) => x - y),
    drawdownTypes: [...new Set(challenges.map(challenge =>
      formatDrawdown(challenge.drawdownType),
    ))],
    pricedSizes: [...pricedSizes].sort((x, y) => x - y),
    assetClasses: [...new Set(challenges.map(c => c.assetClass))],
    currencies: [...new Set(challenges.map(c => challengeCurrency(c)))],
    billingModels: [...new Set(challenges.map(c => formatBillingModel(c.pricingModel)))],
  }
}

export function buildChallengeMatchup(
  firmA: { name: string; slug: string },
  firmB: { name: string; slug: string },
): ChallengeMatchup {
  const challengesA = freshChallenges(firmA.slug)
  const challengesB = freshChallenges(firmB.slug)

  const a = summarise(firmA.slug, firmA.name, challengesA)
  const b = summarise(firmB.slug, firmB.name, challengesB)

  const sharedSizes = a.pricedSizes.filter(size => b.pricedSizes.includes(size))
  const costGroups: MatchupCostGroup[] = sharedSizes.map(sizeUsd => {
    const rows = [
      ...buildCostRows('a', firmA.name, firmA.slug, challengesA, sizeUsd),
      ...buildCostRows('b', firmB.name, firmB.slug, challengesB, sizeUsd),
    ].sort((x, y) =>
      x.currency.localeCompare(y.currency)
      || x.minimumCost - y.minimumCost
      || x.firmName.localeCompare(y.firmName))
    const { cheapest, tie, blockedReason } = resolveCheapest(rows, sizeUsd)
    return { sizeUsd, rows, cheapest, tie, blockedReason }
  })

  // Two different reasons the cost table can be empty, and conflating them
  // would misreport the data: either we hold no verified price for one firm
  // at all, or both are priced but sell no tier in common.
  const unpriced = [a, b].filter(f => !f.pricedSizes.length)
  const noSharedSizeNote =
    sharedSizes.length || !challengesA.length || !challengesB.length
      ? null
      : unpriced.length
        ? `We hold no verified entry price for ${unpriced.map(f => f.name).join(' or ')}. `
          + `The figures either weren't exposed on a first-party page or the firm's own pages conflicted, and we don't fill that gap with a competitor's number. `
          + `The cost table stays out until a capture confirms it; the rule diff below carries the comparison.`
        : `${firmA.name} and ${firmB.name} sell no account size in common. `
          + `${firmA.name} publishes verified tiers at ${a.pricedSizes.map(formatSize).join(', ')}; `
          + `${firmB.name} at ${b.pricedSizes.map(formatSize).join(', ')}. `
          + `Matching a ${formatSize(a.pricedSizes[0])} account against a ${formatSize(b.pricedSizes[0])} one would compare different products, so the rule diff below carries the comparison instead.`

  const ruleRows = buildRuleRows(challengesA, challengesB)
  const intraFirmSplits = ruleRows.filter(r => !r.aUniform || !r.bUniform)

  const watch = getChallengeWatchEntries()
    .filter(entry => entry.firmSlug === firmA.slug || entry.firmSlug === firmB.slug)

  const sourceMap = new Map<string, MatchupSource>()
  for (const [name, list] of [[firmA.name, challengesA], [firmB.name, challengesB]] as const) {
    for (const challenge of list) {
      const existing = sourceMap.get(challenge.sourceUrl)
      if (!existing) {
        sourceMap.set(challenge.sourceUrl, {
          firmName: name,
          productNames: [challenge.productName],
          url: challenge.sourceUrl,
          capturedAt: challenge.sourceCapturedAt,
        })
      } else {
        if (!existing.productNames.includes(challenge.productName)) {
          existing.productNames.push(challenge.productName)
        }
        if (existing.capturedAt < challenge.sourceCapturedAt) {
          existing.capturedAt = challenge.sourceCapturedAt
        }
      }
    }
  }
  const sources = [...sourceMap.values()]
    .map(source => ({
      ...source,
      productNames: source.productNames.sort((x, y) => x.localeCompare(y)),
    }))
    .sort((x, y) =>
      x.firmName.localeCompare(y.firmName)
      || x.productNames.join(', ').localeCompare(y.productNames.join(', ')))

  return {
    hasData: challengesA.length > 0 && challengesB.length > 0,
    a,
    b,
    costGroups,
    noSharedSizeNote,
    ruleRows,
    divergentCount: ruleRows.filter(r => !r.same).length,
    intraFirmSplits,
    watch,
    sources,
    latestCapture: [...challengesA, ...challengesB]
      .map(c => c.sourceCapturedAt)
      .sort()
      .at(-1) ?? null,
  }
}

/* ── Generated prose ───────────────────────────────────────────── */

/**
 * A pair-specific opening paragraph built from the data above.
 *
 * This exists because the fallback verdict on a page with no editorial
 * overlay was a single 43-word sentence about firm aggregates. Everything
 * asserted here is read off the challenge files, so it stays true as the
 * captures change instead of rotting the way hand-written copy does.
 */
export function describeMatchup(matchup: ChallengeMatchup): string[] {
  const { a, b } = matchup
  const paragraphs: string[] = []

  const productLine =
    `We track ${a.productCount} ${a.name} product${a.productCount === 1 ? '' : 's'} and `
    + `${b.productCount} from ${b.name} that pass the 30-day source-freshness gate`
    + (matchup.latestCapture ? `, last verified ${matchup.latestCapture}.` : '.')

  const assetLine =
    a.assetClasses.length === 1 && b.assetClasses.length === 1 && a.assetClasses[0] !== b.assetClasses[0]
      ? ` These firms sell different instruments — ${a.name} runs ${formatAssetClass(a.assetClasses[0] as Challenge['assetClass'])} products and `
        + `${b.name} runs ${formatAssetClass(b.assetClasses[0] as Challenge['assetClass'])} — so treat the tables below as a fit comparison, not a like-for-like price race.`
      : ''
  paragraphs.push(productLine + assetLine)

  const priced = matchup.costGroups.filter(g => g.cheapest)
  const tied = matchup.costGroups.filter(g => g.tie)
  const comparableCount = priced.length + tied.length
  if (priced.length) {
    const wins = new Map<string, number>()
    for (const group of priced) {
      const name = group.cheapest!.firmName
      wins.set(name, (wins.get(name) ?? 0) + 1)
    }
    const ranked = [...wins.entries()].sort((x, y) => y[1] - x[1])
    const sample = priced[0]
    const tiedLeaders = ranked.length > 1 && ranked[0][1] === ranked[1][1]
    const tieClause = tied.length
      ? `; ${tied.length} ${tied.length === 1 ? 'tier is' : 'tiers are'} tied`
      : ''
    // Don't dress a single tier up as a sweep — "1 of 1" reads as a
    // stronger finding than it is.
    const lead = comparableCount === 1
      ? `${ranked[0][0]} is the cheaper route at the one tier both firms sell on the same currency and billing model.`
      : tiedLeaders
        ? `${a.name} and ${b.name} are each cheaper to funded at ${ranked[0][1]} of the ${comparableCount} directly comparable tiers${tieClause}.`
        : `${ranked[0][0]} is cheaper to funded at ${ranked[0][1]} of the ${comparableCount} directly comparable tiers${tieClause}.`
    paragraphs.push(
      `${lead} At ${formatSize(sample.sizeUsd)}, the cheapest verified route is `
      + `${sample.cheapest!.productName} at ${formatMoney(sample.cheapest!.minimumCost, sample.cheapest!.currency)} `
      + `(${sample.cheapest!.costBasis}), which needs `
      + `${formatMoney(sample.cheapest!.breakEvenProfit, sample.cheapest!.currency)} of profit at a `
      + `${sample.cheapest!.profitSplitPct}% split before the fee is back in your pocket.`,
    )
  } else if (tied.length) {
    const sample = tied[0]
    const tie = sample.tie!
    const scope = tied.length === 1
      ? 'the one directly comparable tier'
      : `all ${tied.length} directly comparable tiers`
    paragraphs.push(
      `Both firms tie on minimum funded cost at ${scope}. At ${formatSize(sample.sizeUsd)}, `
      + `each starts at ${formatMoney(tie.minimumCost, tie.currency)} within the shared `
      + `${costClassLabel(tie)} class.`,
    )
  } else if (matchup.costGroups.length) {
    const blocked = matchup.costGroups.find(g => g.blockedReason)
    if (blocked?.blockedReason) paragraphs.push(blocked.blockedReason)
  }

  if (matchup.intraFirmSplits.length) {
    const row = matchup.intraFirmSplits[0]
    const side = !row.aUniform ? a : b
    const groups = !row.aUniform ? row.a : row.b
    const detail = groups
      .map(g => `${g.display.toLowerCase()} on ${g.products.join(' and ')}`)
      .join(', versus ')
    paragraphs.push(
      `${side.name}'s own products disagree on ${matchup.intraFirmSplits.length} `
      + `${matchup.intraFirmSplits.length === 1 ? 'term' : 'terms'}. On ${row.label.toLowerCase()} it is ${detail}. `
      + `Which product you buy decides that rule, not which firm you sign with — a firm-level table cannot show this.`,
    )
  }

  return paragraphs
}
