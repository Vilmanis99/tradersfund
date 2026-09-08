import { getAllChallenges, getAllFirms, isChallengeFresh, minimumCostToFundedUsd, type Challenge, type Firm } from './firms.ts'
import { getChallengeWatchEntries, productChangeSignals, type ChallengeWatchEntry } from './challengeWatch.ts'
import { challengeKey, DEFAULT_FINDER_FILTERS, serializeFinderState, type GlobalChallengeRow } from './challengeComparison.ts'

/** One projection for the English comparison and the Russian finder. */
export function buildChallengeComparisonRows(
  challenges: Challenge[], firms: Firm[], watch: ChallengeWatchEntry[], now = new Date(),
): GlobalChallengeRow[] {
  const firmBySlug = new Map(firms.map(firm => [firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), firm]))
  return challenges.filter(challenge => isChallengeFresh(challenge, now)).flatMap(challenge => {
    const firm = firmBySlug.get(challenge.firmSlug)
    if (!firm) return []
    return [{
      firm: { slug: challenge.firmSlug, name: firm.name, logo: firm.logo, reviewUrl: firm.reviewUrl, isPartner: Boolean(firm.affiliateUrl), score: firm.score },
      product: {
        name: challenge.productName, slug: challenge.productSlug, phases: challenge.phases,
        tiers: challenge.accountSizes.map(tier => ({
          sizeUsd: tier.sizeUsd, priceUsd: tier.priceUsd, priceEur: tier.priceEur ?? null,
          costToFundedUsd: minimumCostToFundedUsd(challenge, tier),
          costToFundedEur: tier.priceEur != null && tier.priceEur > 0 && (tier.payLaterUsd ?? 0) === 0 && (tier.activationFeeUsd ?? challenge.activationFeeUsd ?? 0) === 0 ? tier.priceEur : null,
          dailyLossUsd: tier.dailyLossUsd ?? null, maxLossUsd: tier.maxLossUsd ?? null,
        })),
        pricingModel: challenge.pricingModel ?? 'one-off', profitTargets: challenge.profitTargets,
        dailyLossPct: challenge.dailyLossPct, maxLossPct: challenge.maxLossPct, drawdownType: challenge.drawdownType,
        fundedDailyLossPct: challenge.fundedDailyLossPct ?? null,
        fundedMaxLossPct: challenge.fundedMaxLossPct ?? null,
        fundedDrawdownType: challenge.fundedDrawdownType ?? null,
        minTradingDays: challenge.minTradingDays, maxTradingDays: challenge.maxTradingDays,
        consistencyRulePct: challenge.consistencyRulePct, profitSplitPct: challenge.profitSplitPct,
        payoutFirstDays: challenge.payoutFirstDays, payoutFrequency: challenge.payoutFrequency,
        rules: challenge.rules, assetClass: challenge.assetClass,
        sourceUrl: challenge.sourceUrl, capturedAt: challenge.sourceCapturedAt,
        changeSignals: productChangeSignals(watch, challenge.firmSlug, challenge.productSlug),
      },
    }]
  })
}

export const RUSSIAN_FINDER_REVIEWS: Record<string, string> = {
  fundednext: '/ru/obzor-fundednext', 'bright-funded': '/ru/obzor-bright-funded',
  fundingpips: '/ru/obzor-fundingpips', ftmo: '/ru/obzor-ftmo',
}

export function getRussianFinderRows(now = new Date()): GlobalChallengeRow[] {
  return buildChallengeComparisonRows(getAllChallenges(), getAllFirms(), getChallengeWatchEntries(), now)
    .filter(row => row.firm.slug in RUSSIAN_FINDER_REVIEWS)
    .map(row => ({ ...row, firm: { ...row.firm, reviewUrl: RUSSIAN_FINDER_REVIEWS[row.firm.slug] } }))
}

/** Editorial starting pairs, not a ranking. Matching phases/size do not make other rules equal. */
export function getRussianReviewFinderHref(firmSlug: string, now = new Date()): string {
  const presets: Record<string, string[]> = {
    fundednext: ['fundednext:stellar-2-step', 'bright-funded:bright-funded-2-step-classic'],
    'bright-funded': ['bright-funded:bright-funded-2-step-classic', 'fundednext:stellar-2-step'],
    fundingpips: ['fundingpips:2-step-pro', 'fundednext:stellar-2-step'],
    ftmo: ['ftmo:ftmo-challenge-2-step', 'fundednext:stellar-2-step', 'bright-funded:bright-funded-2-step-classic'],
  }
  const available = new Set(getRussianFinderRows(now)
    .filter(row => row.product.phases === 2 && row.product.tiers.some(tier => tier.sizeUsd === 50000))
    .map(challengeKey))
  const selected = (presets[firmSlug] ?? []).filter(key => available.has(key))
  if (selected.length < 2) return '/ru/luchshie-prop-firmy#podbor'
  return `/ru/luchshie-prop-firmy#${serializeFinderState({ ...DEFAULT_FINDER_FILTERS, size: 50000, phases: '2' }, selected)}`
}

/** Same-size instant comparison; Bright Funded is not a phase-0 product. */
export function getRussianInstantFinderHref(now = new Date()): string {
  const available = new Set(getRussianFinderRows(now)
    .filter(row => row.product.phases === 0 && row.product.tiers.some(tier => tier.sizeUsd === 10000))
    .map(challengeKey))
  const selected = ['fundednext:stellar-instant', 'fundingpips:zero'].filter(key => available.has(key))
  if (selected.length < 2) return '/ru/luchshie-prop-firmy#podbor'
  return `/ru/luchshie-prop-firmy#${serializeFinderState({ ...DEFAULT_FINDER_FILTERS, size: 10000, phases: '0' }, selected)}`
}
