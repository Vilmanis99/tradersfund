/**
 * Display wording for a product's profit split. Pure (no data imports), so client components
 * can use it on the row data they are given.
 *
 * When a product publishes `profitSplitTiers`, display surfaces show the range of the tiers that
 * apply to the account stage the surface is about, never the flat `profitSplitPct`.
 * `profitSplitPct` stays the lowest tier (the conservative input for cost maths, break-even and
 * sorting); this module never changes it.
 *
 * Stage: tiers whose `appliesTo` starts with "Funded Live" describe a later, live-capital stage
 * (TradeDay: 90% on Funded Live). Challenge and funded-sim surfaces exclude them by default;
 * pass `{ stage: 'all' }` only on a surface about every stage (the rules-page product table
 * lists every tier with its own wording).
 */
export type SplitTier = { traderPct: number; appliesTo: string }
export type SplitProduct = { profitSplitPct: number | null; profitSplitTiers?: SplitTier[] | null }
export type SplitLang = 'en' | 'ru'
export type SplitStage = 'evaluation-and-sim' | 'all'

const FUNDED_LIVE = /^funded live\b/i

export function isFundedLiveTier(tier: SplitTier): boolean {
  return FUNDED_LIVE.test(tier.appliesTo.trim())
}

/** The tiers that apply to the surface's stage. */
export function applicableSplitTiers(product: SplitProduct, stage: SplitStage = 'evaluation-and-sim'): SplitTier[] {
  const tiers = product.profitSplitTiers ?? []
  return stage === 'all' ? tiers : tiers.filter(tier => !isFundedLiveTier(tier))
}

/** True when the product's split is tiered (two or more different applicable tier values). */
export function hasTieredSplit(product: SplitProduct, stage: SplitStage = 'evaluation-and-sim'): boolean {
  return new Set(applicableSplitTiers(product, stage).map(tier => tier.traderPct)).size > 1
}

/** Lowest and highest applicable tier; null when the product has no tiers. */
export function splitTierRange(product: SplitProduct, stage: SplitStage = 'evaluation-and-sim'): { min: number; max: number } | null {
  const values = applicableSplitTiers(product, stage).map(tier => tier.traderPct)
  if (!values.length) return null
  return { min: Math.min(...values), max: Math.max(...values) }
}

export const TIERED_LABEL: Record<SplitLang, string> = { en: 'tiered', ru: 'по уровням' }
export const LOWEST_TIER_LABEL: Record<SplitLang, string> = { en: 'lowest tier', ru: 'нижний уровень' }

/** "50–80%" for a tiered product, "80%" for a flat one, null when unpublished (no suffix). */
export function profitSplitValue(product: SplitProduct, stage: SplitStage = 'evaluation-and-sim'): string | null {
  const range = splitTierRange(product, stage)
  if (range) return range.min === range.max ? `${range.min}%` : `${range.min}–${range.max}%`
  return product.profitSplitPct == null ? null : `${product.profitSplitPct}%`
}

/**
 * "50–80% (tiered)" / «50–80% (по уровням)» for a tiered product, "80%" for a flat one,
 * null when no split is published. The range is derived from the product's own tiers.
 */
export function profitSplitText(product: SplitProduct, lang: SplitLang = 'en', stage: SplitStage = 'evaluation-and-sim'): string | null {
  const value = profitSplitValue(product, stage)
  return value && hasTieredSplit(product, stage) ? `${value} (${TIERED_LABEL[lang]})` : value
}

/** Strip a tier list to the two display fields (no quotes or source URLs reach client props). */
export function displaySplitTiers(tiers: SplitTier[] | null | undefined): SplitTier[] | undefined {
  return tiers?.length ? tiers.map(tier => ({ traderPct: tier.traderPct, appliesTo: tier.appliesTo })) : undefined
}
