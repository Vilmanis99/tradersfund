import { getAllChallenges, getAllFirms, isChallengeFresh, minimumCostToFundedUsd, type Challenge, type Firm } from './firms.ts'
import { getChallengeWatchEntries, productChangeSignals, type ChallengeWatchEntry } from './challengeWatch.ts'
import type { GlobalChallengeRow } from './challengeComparison.ts'

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
