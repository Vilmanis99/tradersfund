import { getAllChallenges, getAllFirms } from '@/lib/firms'
import { buildChallengeComparisonRows } from '@/lib/challengeComparisonData'
import { getChallengeWatchEntries, type ChallengeWatchEntry } from '@/lib/challengeWatch'
import { canonicalMatchupSlug, firmSlug, getAllCanonicalPairs, getCurrentCanonicalPairs } from '@/lib/comparisons'
import { RUSSIAN_ROUTE_EDITORIAL_DATES } from '@/lib/localizedRoutes'

/**
 * Facts for the homepage "Understand the challenge" section (EN "/" and RU "/ru").
 * Every value is computed at build time from content/data/firms.json,
 * content/data/challenges/*.json and content/data/challenge-watch.json, using
 * only source-fresh programmes (the same set the homepage table uses). A value
 * that cannot be computed is null and its line is not rendered.
 */

/** Account size used for the cheapest-challenge fact. */
export const COST_FACT_SIZE = 100_000

export interface DateSpan { oldest: string; latest: string }

export interface RuleFacts {
  /** Source-fresh programmes with at least one evaluation phase. */
  programmes: number
  firms: number
  target1: { median: number; n: number } | null
  target2: { median: number; n: number } | null
  daily: { median: number; n: number } | null
  max: { median: number; n: number } | null
  split: { median: number; n: number } | null
  firstPayoutDays: { median: number; n: number } | null
  /** Trailing or end-of-day trailing drawdown, out of programmes with a captured drawdown type. */
  trailing: { count: number; of: number } | null
  /** Programmes publishing a consistency cap, out of all evaluation programmes. */
  consistency: { count: number; of: number } | null
  /** Minimum trading days (0 = none) among programmes that publish one. */
  minDays: { median: number; n: number } | null
  /** News trading banned or conditional, out of programmes with a captured news rule. */
  newsLimited: { count: number; of: number } | null
  checked: DateSpan | null
}

export interface CostFacts {
  cheapest: {
    firmSlug: string
    firmName: string
    product: string
    reviewUrl: string
    upfrontUsd: number
    /** Minimum cash to reach funded (fee + pay-later + activation). */
    costToFundedUsd: number
    refundable: boolean | null
    capturedAt: string
  } | null
  cheapestEur: { firmName: string; product: string; priceEur: number; capturedAt: string } | null
  /** $100K evaluation tiers whose fee is refundable, out of tiers with a verified refund field. */
  refundable: { count: number; of: number } | null
  /** Source-fresh programmes billed as a monthly subscription. */
  subscriptions: { programmes: number; firms: number } | null
  checked: DateSpan | null
}

export interface RuleNote {
  id: string
  firmName: string
  title: string
  kind: ChallengeWatchEntry['kind']
  status: ChallengeWatchEntry['status']
  observedAt: string
}

export interface PickerFirm { slug: string; name: string }

export interface ChallengeSectionFacts {
  rules: RuleFacts
  cost: CostFacts
  notes: RuleNote[]
  notesTotal: number
  picker: { firms: PickerFirm[]; pairHrefs: Record<string, string> }
}

function median(values: number[]): { median: number; n: number } | null {
  const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return null
  const mid = Math.floor(n / 2)
  const value = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return { median: Math.round(value * 10) / 10, n }
}

function span(dates: string[]): DateSpan | null {
  const sorted = dates.filter(Boolean).sort()
  return sorted.length ? { oldest: sorted[0], latest: sorted.at(-1)! } : null
}

function share(count: number, of: number) {
  return of > 0 ? { count, of } : null
}

/** "2026-10-19" → "19.10" (the label the section shows). */
export function dayMonth(iso: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[2]}.${match[1]}` : iso
}

/** Russian comparison routes whose slug is exactly two tracked firms, keyed by canonical pair. */
function russianMatchupRoutes(knownSlugs: Set<string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const route of Object.keys(RUSSIAN_ROUTE_EDITORIAL_DATES)) {
    const match = /^\/ru\/([a-z0-9-]+)-vs-([a-z0-9-]+)$/.exec(route)
    if (!match || !knownSlugs.has(match[1]) || !knownSlugs.has(match[2])) continue
    out[canonicalMatchupSlug(match[1], match[2])] = route
  }
  return out
}

export function getChallengeSectionFacts(locale: 'en' | 'ru', now = new Date()): ChallengeSectionFacts {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const watch = getChallengeWatchEntries()
  const rows = buildChallengeComparisonRows(challenges, firms, watch, now)
  const evaluation = rows.filter(row => row.product.phases >= 1)

  const trailingKnown = evaluation.filter(row => row.product.drawdownType != null)
  const rules: RuleFacts = {
    programmes: evaluation.length,
    firms: new Set(evaluation.map(row => row.firm.slug)).size,
    target1: median(evaluation.flatMap(row => row.product.profitTargets?.phase1 ?? [])),
    target2: median(evaluation.filter(row => row.product.phases >= 2).flatMap(row => row.product.profitTargets?.phase2 ?? [])),
    daily: median(evaluation.flatMap(row => row.product.dailyLossPct ?? [])),
    max: median(evaluation.flatMap(row => row.product.maxLossPct ?? [])),
    split: median(evaluation.flatMap(row => row.product.profitSplitPct ?? [])),
    firstPayoutDays: median(evaluation.flatMap(row => row.product.payoutFirstDays ?? [])),
    trailing: share(trailingKnown.filter(row => row.product.drawdownType === 'trailing' || row.product.drawdownType === 'eod-trailing').length, trailingKnown.length),
    consistency: share(evaluation.filter(row => row.product.consistencyRulePct != null).length, evaluation.length),
    minDays: median(evaluation.flatMap(row => row.product.minTradingDays ?? [])),
    newsLimited: share(
      evaluation.filter(row => row.product.rules.news === false || row.product.rules.news === 'restricted').length,
      evaluation.filter(row => row.product.rules.news != null).length,
    ),
    checked: span(evaluation.map(row => row.product.capturedAt)),
  }

  // Cheapest one-off $100K evaluation. Monthly subscriptions are a rate, not a
  // total, and products under an open source watch have unsettled prices.
  const rawTier = (slug: string, product: string) => challenges
    .find(challenge => challenge.firmSlug === slug && challenge.productSlug === product)
    ?.accountSizes.find(tier => tier.sizeUsd === COST_FACT_SIZE)
  const priced = evaluation.filter(row => row.product.pricingModel !== 'monthly-subscription'
    && !row.product.changeSignals.some(signal => signal.status === 'watch'))
  const usd = priced.flatMap(row => {
    const tier = row.product.tiers.find(t => t.sizeUsd === COST_FACT_SIZE)
    return tier?.priceUsd != null && tier.priceUsd > 0 && tier.costToFundedUsd != null ? [{ row, tier }] : []
  }).sort((a, b) => a.tier.costToFundedUsd! - b.tier.costToFundedUsd! || a.row.firm.name.localeCompare(b.row.firm.name))
  const eur = priced.flatMap(row => {
    const tier = row.product.tiers.find(t => t.sizeUsd === COST_FACT_SIZE)
    return tier?.costToFundedEur != null ? [{ row, price: tier.costToFundedEur }] : []
  }).sort((a, b) => a.price - b.price || a.row.firm.name.localeCompare(b.row.firm.name))
  const top = usd[0]
  const refundFields = evaluation.flatMap(row => {
    const tier = rawTier(row.firm.slug, row.product.slug)
    return tier && tier.refundable != null ? [tier.refundable] : []
  })
  const subscriptionRows = rows.filter(row => row.product.pricingModel === 'monthly-subscription')
  const cost: CostFacts = {
    cheapest: top ? {
      firmSlug: top.row.firm.slug,
      firmName: top.row.firm.name,
      product: top.row.product.name,
      reviewUrl: top.row.firm.reviewUrl,
      upfrontUsd: top.tier.priceUsd!,
      costToFundedUsd: top.tier.costToFundedUsd!,
      refundable: rawTier(top.row.firm.slug, top.row.product.slug)?.refundable ?? null,
      capturedAt: top.row.product.capturedAt,
    } : null,
    cheapestEur: eur[0] ? { firmName: eur[0].row.firm.name, product: eur[0].row.product.name, priceEur: eur[0].price, capturedAt: eur[0].row.product.capturedAt } : null,
    refundable: share(refundFields.filter(Boolean).length, refundFields.length),
    subscriptions: subscriptionRows.length ? { programmes: subscriptionRows.length, firms: new Set(subscriptionRows.map(row => row.firm.slug)).size } : null,
    checked: span([top?.row.product.capturedAt, eur[0]?.row.product.capturedAt].filter((d): d is string => Boolean(d))),
  }

  // Latest dated public rule notes: newest observation first. Within one
  // observation date, spread the three slots across firms before repeating one.
  const sortedNotes = [...watch].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt) || b.lastCheckedAt.localeCompare(a.lastCheckedAt) || a.title.localeCompare(b.title))
  const seenPerDate = new Map<string, number>()
  const ranked = sortedNotes.map((entry, index) => {
    const key = `${entry.observedAt}|${entry.firmSlug}`
    const rank = seenPerDate.get(key) ?? 0
    seenPerDate.set(key, rank + 1)
    return { entry, rank, index }
  }).sort((a, b) => b.entry.observedAt.localeCompare(a.entry.observedAt) || a.rank - b.rank || a.index - b.index)
  const notes = ranked.slice(0, 3).map(({ entry }) => ({
    id: entry.id, firmName: entry.firmName, title: entry.title, kind: entry.kind, status: entry.status, observedAt: entry.observedAt,
  }))

  // Firm picker: firms with current evidence on both sides of a matchup.
  const current = getCurrentCanonicalPairs(now)
  const pickerSlugs = new Set(current.flatMap(pair => [firmSlug(pair.firmA.name), firmSlug(pair.firmB.name)]))
  const pickerFirms = firms
    .filter(firm => pickerSlugs.has(firmSlug(firm.name)))
    .map(firm => ({ slug: firmSlug(firm.name), name: firm.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const existing = new Set(getAllCanonicalPairs().map(pair => pair.matchup))
  const russian = locale === 'ru' ? russianMatchupRoutes(new Set(firms.map(firm => firmSlug(firm.name)))) : {}
  const pairHrefs: Record<string, string> = {}
  for (let i = 0; i < pickerFirms.length; i++) {
    for (let j = i + 1; j < pickerFirms.length; j++) {
      const key = canonicalMatchupSlug(pickerFirms[i].slug, pickerFirms[j].slug)
      const href = russian[key] ?? (existing.has(key) ? `/compare/${key}` : null)
      if (href) pairHrefs[key] = href
    }
  }

  return { rules, cost, notes, notesTotal: watch.length, picker: { firms: pickerFirms, pairHrefs } }
}
