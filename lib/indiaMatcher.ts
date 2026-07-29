import 'server-only'

import {
  getChallengeWatchEntries,
  productChangeSignals,
  type ChallengeProductSignal,
} from '@/lib/challengeWatch'
import {
  getChallengesByFirm,
  isChallengeFresh,
  minimumCostToFundedUsd,
  type Challenge,
  type ChallengeProfitTargets,
  type ChallengeRules,
  type DrawdownType,
  type Firm,
  type PayoutFrequency,
} from '@/lib/firms'
import {
  INDIA_EVIDENCE_BY_SLUG,
  indiaAccountSizeCapUsd,
  indiaEvidenceScore,
  passesIndiaRegulatoryCountryGate,
  passesIndiaProductGate,
  type IndiaEvidenceStatus,
  type IndiaPayoutRail,
} from '@/lib/india'

export interface IndiaMatcherEntryPrice {
  amount: number
  currency: 'USD' | 'EUR'
}

export interface IndiaMatcherTier {
  sizeUsd: number
  price: IndiaMatcherEntryPrice
  costToFundedUsd: number | null
  costToFundedEur: number | null
  refundable: boolean | null
}

export interface IndiaMatcherProduct {
  name: string
  slug: string
  phases: 0 | 1 | 2 | 3
  assetClass: Challenge['assetClass']
  drawdownType: DrawdownType | null
  profitTargets: ChallengeProfitTargets | null
  dailyLossPct: number | null
  maxLossPct: number | null
  maxTradingDays: number | null
  consistencyRulePct: number | null
  entryPrice: IndiaMatcherEntryPrice | null
  accountSizesUsd: number[]
  payoutFirstDays: number | null
  payoutFrequency: PayoutFrequency | null
  profitSplitPct: number | null
  minTradingDays: number | null
  pricingModel: 'one-off' | 'monthly-subscription' | 'split-payment'
  capturedAt: string
  sourceUrl: string
  pricedTiers: IndiaMatcherTier[]
  changeSignals: ChallengeProductSignal[]
  rules: ChallengeRules
  allows: {
    ea: boolean
    news: boolean
    weekend: boolean
    overnight: boolean
  }
}

export interface IndiaMatcherEvidenceField {
  status: IndiaEvidenceStatus
  summary: string
  sourceUrls: string[]
}

export interface IndiaMatcherFirm {
  slug: string
  name: string
  logo: string
  reviewUrl: string
  isPartner: boolean
  editorialScore: number
  evidenceScore: number
  evidenceCapturedAt: string
  countrySummary: string
  payoutSummary: string
  payoutRails: IndiaPayoutRail[]
  rbiAlert: {
    status: 'not-found'
    sourceListUpdatedAt: string
    summary: string
    sourceUrl: string
  }
  country: IndiaMatcherEvidenceField
  kyc: IndiaMatcherEvidenceField
  payout: IndiaMatcherEvidenceField
  unresolved: string
  products: IndiaMatcherProduct[]
}

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function publishedEntry(challenge: Challenge): IndiaMatcherEntryPrice | null {
  const usd = challenge.accountSizes
    .map(tier => tier.priceUsd)
    .filter((price): price is number => price != null && price > 0)
  if (usd.length) return { amount: Math.min(...usd), currency: 'USD' }

  const eur = challenge.accountSizes
    .map(tier => tier.priceEur)
    .filter((price): price is number => price != null && price > 0)
  if (eur.length) return { amount: Math.min(...eur), currency: 'EUR' }

  return null
}

export function buildIndiaMatcherFirms(firms: Firm[]): IndiaMatcherFirm[] {
  const watchEntries = getChallengeWatchEntries()
  return firms.flatMap(firm => {
    const slug = firmSlug(firm.name)
    const evidence = INDIA_EVIDENCE_BY_SLUG[slug]
    if (!evidence || !passesIndiaRegulatoryCountryGate(evidence)) return []

    const products = getChallengesByFirm(slug)
      .filter(challenge => isChallengeFresh(challenge))
      .filter(challenge => passesIndiaProductGate(evidence, challenge.productSlug))
      .map(challenge => {
        const sizeCap = indiaAccountSizeCapUsd(evidence, challenge.productSlug)
        const accountSizes = challenge.accountSizes.filter(
          tier => sizeCap == null || tier.sizeUsd <= sizeCap,
        )
        const eligibleChallenge = { ...challenge, accountSizes }

        return {
          name: challenge.productName,
          slug: challenge.productSlug,
          phases: challenge.phases,
          assetClass: challenge.assetClass,
          drawdownType: challenge.drawdownType,
          profitTargets: challenge.profitTargets,
          dailyLossPct: challenge.dailyLossPct,
          maxLossPct: challenge.maxLossPct,
          maxTradingDays: challenge.maxTradingDays,
          consistencyRulePct: challenge.consistencyRulePct,
          entryPrice: publishedEntry(eligibleChallenge),
          accountSizesUsd: accountSizes.map(tier => tier.sizeUsd),
          payoutFirstDays: challenge.payoutFirstDays,
          payoutFrequency: challenge.payoutFrequency,
          profitSplitPct: challenge.profitSplitPct,
          minTradingDays: challenge.minTradingDays,
          pricingModel: challenge.pricingModel ?? 'one-off',
          capturedAt: challenge.sourceCapturedAt,
          sourceUrl: challenge.sourceUrl,
          changeSignals: productChangeSignals(
            watchEntries,
            challenge.firmSlug,
            challenge.productSlug,
          ),
          pricedTiers: accountSizes.flatMap<IndiaMatcherTier>(tier => {
            if (tier.priceUsd != null && tier.priceUsd > 0) {
              return [{
                sizeUsd: tier.sizeUsd,
                price: { amount: tier.priceUsd, currency: 'USD' as const },
                costToFundedUsd: minimumCostToFundedUsd(challenge, tier),
                costToFundedEur: null,
                refundable: tier.refundable,
              }]
            }
            if (tier.priceEur != null && tier.priceEur > 0) {
              return [{
                sizeUsd: tier.sizeUsd,
                price: { amount: tier.priceEur, currency: 'EUR' as const },
                costToFundedUsd: null,
                costToFundedEur:
                  (tier.payLaterUsd ?? 0) === 0
                  && (tier.activationFeeUsd ?? challenge.activationFeeUsd ?? 0) === 0
                    ? tier.priceEur
                    : null,
                refundable: tier.refundable,
              }]
            }
            return []
          }),
          rules: challenge.rules,
          allows: {
            ea: challenge.rules.ea === true,
            news: challenge.rules.news === true,
            weekend: challenge.rules.weekend === true,
            overnight: challenge.rules.overnight === true,
          },
        }
      })

    if (!products.length) return []

    return [{
      slug,
      name: firm.name,
      logo: firm.logo,
      reviewUrl: firm.reviewUrl,
      isPartner: Boolean(firm.affiliateUrl),
      editorialScore: firm.score,
      evidenceScore: indiaEvidenceScore(evidence),
      evidenceCapturedAt: evidence.capturedAt,
      countrySummary: evidence.country.summary,
      payoutSummary: evidence.payout.summary,
      payoutRails: evidence.payoutRails,
      rbiAlert: {
        status: 'not-found',
        sourceListUpdatedAt: evidence.rbiAlert.sourceListUpdatedAt,
        summary: evidence.rbiAlert.summary,
        sourceUrl: evidence.rbiAlert.sourceUrl,
      },
      country: evidence.country,
      kyc: evidence.kyc,
      payout: evidence.payout,
      unresolved: evidence.unresolved,
      products,
    }]
  })
}
