import type { Challenge, ChallengeAccountSize, ChallengeRules, Firm } from './firms'

/*
 * Public-field projections for firm and challenge records that cross into client
 * components. A client component's props are serialised into the page's HTML and RSC
 * flight payload, so passing a whole Firm or Challenge publishes every field in
 * content/data, including Tracker notes, capture/evidence records, previous and
 * regional discount codes and box paths. Server code must pass these projections
 * instead (see app/prop-firms/(index)/page.tsx -> components/FirmTable).
 *
 * The allowlists below are exactly the fields the client directory reads
 * (components/FirmTable.tsx, components/TrustpilotRating.tsx, lib/firmPlatforms.ts,
 * lib/firmDirectory.ts, lib/discountDisplay.ts, lib/trustpilot.ts). Adding a field here
 * publishes it on every page that uses the projection; it must be page-safe.
 * scripts/test-no-firm-internals-html.mjs fails if any other lib/firms.ts field name, or
 * an internal value, appears in a sitemap page's HTML or RSC payload.
 */

export const PUBLIC_FIRM_FIELDS = [
  'name', 'logo', 'score', 'founded', 'assets', 'maxAllocation', 'platforms',
  'officialUrl', 'reviewUrl', 'affiliateUrl',
  'discountCode', 'discountPct', 'discountCodeCheckoutVerified',
  'trustpilotScore', 'trustpilotCount', 'trustpilotUrl', 'trustpilotCapturedAt', 'trustpilotRatingSuppressed',
] as const satisfies readonly (keyof Firm)[]

/** platformEvidence without its notes; the note the directory renders is `platformNote`. */
export const PUBLIC_PLATFORM_EVIDENCE_FIELDS = ['sourceUrl', 'sourceCapturedAt', 'sourceQuote'] as const satisfies readonly (keyof NonNullable<Firm['platformEvidence']>)[]

export const PUBLIC_CHALLENGE_FIELDS = [
  'firmSlug', 'phases', 'pricingModel', 'activationFeeUsd', 'drawdownType',
  'profitSplitPct', 'payoutFrequency', 'sourceUrl', 'sourceCapturedAt',
] as const satisfies readonly (keyof Challenge)[]
export const PUBLIC_ACCOUNT_SIZE_FIELDS = ['sizeUsd', 'priceUsd', 'priceEur', 'payLaterUsd', 'activationFeeUsd'] as const satisfies readonly (keyof ChallengeAccountSize)[]
export const PUBLIC_CHALLENGE_RULE_FIELDS = ['news', 'weekend', 'overnight', 'ea'] as const satisfies readonly (keyof ChallengeRules)[]

export type PublicPlatformEvidence = Pick<NonNullable<Firm['platformEvidence']>, typeof PUBLIC_PLATFORM_EVIDENCE_FIELDS[number]>
export type PublicFirm = Pick<Firm, typeof PUBLIC_FIRM_FIELDS[number]> & {
  platformEvidence?: PublicPlatformEvidence
  /** platformEvidence.notes: rendered as the directory's platform-check note. */
  platformNote?: string
}
export type PublicChallenge = Pick<Challenge, typeof PUBLIC_CHALLENGE_FIELDS[number]> & {
  accountSizes: Pick<ChallengeAccountSize, typeof PUBLIC_ACCOUNT_SIZE_FIELDS[number]>[]
  rules: Pick<ChallengeRules, typeof PUBLIC_CHALLENGE_RULE_FIELDS[number]>
}

/** Copies only the listed keys the source actually has (absent stays absent, null stays null). */
function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key]
  return out
}

export function toPublicFirm(firm: Firm): PublicFirm {
  const out: PublicFirm = pick(firm, PUBLIC_FIRM_FIELDS)
  if (firm.platformEvidence) {
    out.platformEvidence = pick(firm.platformEvidence, PUBLIC_PLATFORM_EVIDENCE_FIELDS)
    out.platformNote = firm.platformEvidence.notes
  }
  return out
}

export function toPublicChallenge(challenge: Challenge): PublicChallenge {
  return {
    ...pick(challenge, PUBLIC_CHALLENGE_FIELDS),
    accountSizes: challenge.accountSizes.map(tier => pick(tier, PUBLIC_ACCOUNT_SIZE_FIELDS)),
    rules: pick(challenge.rules, PUBLIC_CHALLENGE_RULE_FIELDS),
  }
}

/**
 * Firm/challenge field names that other pages' view models already pass to client
 * components with published values (rule tables, cost calculators, comparison rows,
 * RU status badges). Each is a figure or label the site prints; none carries notes or
 * evidence. Adding a name here is a review decision.
 */
export const PUBLISHED_VIEW_MODEL_KEYS = [
  'assetClass', 'capturedAt', 'consistencyRuleApplies', 'consistencyRulePct', 'copyTrading', 'country',
  'dailyLossPct', 'dailyLossUsd', 'maxLossPct', 'maxLossUsd', 'fundedDailyLossPct', 'fundedMaxLossPct',
  'fundedDrawdownType', 'minTradingDays', 'maxTradingDays', 'maxTradingDaysUnlimited', 'payoutFirstDays',
  'profitTargets', 'phase1', 'phase2', 'phase3', 'refundable', 'russiaStatus',
] as const

/** Every firm/challenge field name allowed in a page's HTML or RSC payload; all other lib/firms.ts names are internal. */
export const CLIENT_PAYLOAD_FIRM_KEYS: ReadonlySet<string> = new Set<string>([
  ...PUBLIC_FIRM_FIELDS, ...PUBLIC_PLATFORM_EVIDENCE_FIELDS, 'platformEvidence',
  ...PUBLIC_CHALLENGE_FIELDS, ...PUBLIC_ACCOUNT_SIZE_FIELDS, ...PUBLIC_CHALLENGE_RULE_FIELDS, 'accountSizes', 'rules',
  ...PUBLISHED_VIEW_MODEL_KEYS,
])
