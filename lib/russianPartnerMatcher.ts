export const RUSSIAN_MATCHER_ACCESS_VALUES = [
  'unchecked',
  'confirmed',
  'unclear',
] as const

export type RussianMatcherAccess = typeof RUSSIAN_MATCHER_ACCESS_VALUES[number]

export const RUSSIAN_MATCHER_PRIORITY_VALUES = [
  'compare',
  'instant',
  'eur-tradelocker',
  'broader-choice',
] as const

export type RussianMatcherPriority = typeof RUSSIAN_MATCHER_PRIORITY_VALUES[number]
export type RussianMatcherPartnerSlug = 'fundednext' | 'bright-funded'

export interface RussianMatcherCapability {
  slug: RussianMatcherPartnerSlug
  hasInstant: boolean
  currencies: Array<'USD' | 'EUR'>
  platforms: string[]
  productCount: number
}

export interface RussianPartnerMatcherDecision {
  kind: 'blocked' | 'single' | 'compare'
  partnerSlugs: RussianMatcherPartnerSlug[]
  outcome: 'eligibility-unchecked' | 'eligibility-unclear' | 'no-current-match' | RussianMatcherPartnerSlug | 'compare-both'
}

const PRIMARY_PARTNER_ORDER: RussianMatcherPartnerSlug[] = ['fundednext', 'bright-funded']

function matchedDecision(
  partnerSlugs: RussianMatcherPartnerSlug[],
): RussianPartnerMatcherDecision {
  if (partnerSlugs.length === 0) {
    return { kind: 'blocked', partnerSlugs: [], outcome: 'no-current-match' }
  }
  if (partnerSlugs.length === 1) {
    return { kind: 'single', partnerSlugs, outcome: partnerSlugs[0] }
  }
  return { kind: 'compare', partnerSlugs, outcome: 'compare-both' }
}

export function russianPartnerMatcherDecision(
  access: RussianMatcherAccess,
  priority: RussianMatcherPriority,
  capabilities: RussianMatcherCapability[],
): RussianPartnerMatcherDecision {
  if (access !== 'confirmed') {
    return {
      kind: 'blocked',
      partnerSlugs: [],
      outcome: access === 'unclear' ? 'eligibility-unclear' : 'eligibility-unchecked',
    }
  }

  const current = PRIMARY_PARTNER_ORDER.flatMap(slug => {
    const profile = capabilities.find(candidate => candidate.slug === slug)
    return profile && profile.productCount > 0 ? [profile] : []
  })

  // Both primary profiles must have current product evidence before the
  // matcher is allowed to return any commercial route.
  if (current.length !== PRIMARY_PARTNER_ORDER.length) {
    return matchedDecision([])
  }

  if (priority === 'compare') return matchedDecision(PRIMARY_PARTNER_ORDER)

  if (priority === 'instant') {
    return matchedDecision(current.filter(profile => profile.hasInstant).map(profile => profile.slug))
  }
  if (priority === 'eur-tradelocker') {
    return matchedDecision(current.filter(profile =>
      profile.currencies.includes('EUR') && profile.platforms.includes('TradeLocker'),
    ).map(profile => profile.slug))
  }

  const largestProductCount = Math.max(...current.map(profile => profile.productCount))
  return matchedDecision(current.filter(profile =>
    profile.productCount === largestProductCount,
  ).map(profile => profile.slug))
}
