import type { Challenge, DrawdownType, PayoutFrequency } from '@/lib/firms'

/**
 * C15 "path to funded" data (design/article-format-spec.md §4 C15 / §6 P3): the
 * evaluation stages, loss limits and first payout of each product as published
 * in content/data/challenges, grouped so products with identical terms share one
 * diagram. Values are copied from the challenge record, never derived or
 * defaulted: a field the firm has not published is `null` and the renderer says
 * "not published" (AGENTS.md "never invent numbers"). Callers pass only products
 * that passed their own freshness gate; this module never decides freshness.
 */

export type ChallengePathLimits = {
  dailyLossPct: number | null
  maxLossPct: number | null
  drawdownType: DrawdownType | null
}

export type ChallengePathStage = {
  /** 1-based evaluation phase number. */
  phase: number
  /** Profit target in %, or null when the firm has not published it. */
  targetPct: number | null
}

export type ChallengePathGroup = {
  /** Stable key: identical terms give the same key. */
  key: string
  products: Challenge[]
  /** 0 = instant funding (no evaluation stage). */
  phases: 0 | 1 | 2 | 3
  stages: ChallengePathStage[]
  /** Minimum trading days per stage: 0 = no minimum, null = not verified. */
  minTradingDays: number | null
  maxTradingDays: number | null
  maxTradingDaysUnlimited: boolean
  /** Evaluation-stage limits. */
  limits: ChallengePathLimits
  /** Funded-stage limits, only when the firm publishes a different value. */
  fundedLimits: Partial<ChallengePathLimits> | null
  profitSplitPct: number | null
  payoutFirstDays: number | null
  payoutFrequency: PayoutFrequency | null
  capturedAt: string[]
}

function fundedLimitsOf(product: Challenge): Partial<ChallengePathLimits> | null {
  const out: Partial<ChallengePathLimits> = {}
  if (product.fundedDailyLossPct != null && product.fundedDailyLossPct !== product.dailyLossPct) out.dailyLossPct = product.fundedDailyLossPct
  if (product.fundedMaxLossPct != null && product.fundedMaxLossPct !== product.maxLossPct) out.maxLossPct = product.fundedMaxLossPct
  if (product.fundedDrawdownType != null && product.fundedDrawdownType !== product.drawdownType) out.drawdownType = product.fundedDrawdownType
  return Object.keys(out).length ? out : null
}

function stagesOf(product: Challenge): ChallengePathStage[] {
  const targets = product.profitTargets
  return Array.from({ length: product.phases }, (_, index) => {
    const phase = index + 1
    const value = targets?.[`phase${phase}` as 'phase1' | 'phase2' | 'phase3']
    return { phase, targetPct: typeof value === 'number' && Number.isFinite(value) ? value : null }
  })
}

/** Group products with identical published terms, keeping the input order. */
export function buildChallengePaths(products: Challenge[]): ChallengePathGroup[] {
  const groups = new Map<string, ChallengePathGroup>()
  for (const product of products) {
    const stages = stagesOf(product)
    const group: Omit<ChallengePathGroup, 'key' | 'products' | 'capturedAt'> = {
      phases: product.phases,
      stages,
      minTradingDays: product.minTradingDays ?? null,
      maxTradingDays: product.maxTradingDays ?? null,
      maxTradingDaysUnlimited: product.maxTradingDaysUnlimited === true,
      limits: {
        dailyLossPct: product.dailyLossPct ?? null,
        maxLossPct: product.maxLossPct ?? null,
        drawdownType: product.drawdownType ?? null,
      },
      fundedLimits: fundedLimitsOf(product),
      profitSplitPct: product.profitSplitPct ?? null,
      payoutFirstDays: product.payoutFirstDays ?? null,
      payoutFrequency: product.payoutFrequency ?? null,
    }
    const key = JSON.stringify(group)
    const existing = groups.get(key)
    if (existing) {
      existing.products.push(product)
      if (!existing.capturedAt.includes(product.sourceCapturedAt)) existing.capturedAt.push(product.sourceCapturedAt)
    } else {
      groups.set(key, { ...group, key, products: [product], capturedAt: [product.sourceCapturedAt] })
    }
  }
  return [...groups.values()].map(group => ({ ...group, capturedAt: [...group.capturedAt].sort() }))
}
