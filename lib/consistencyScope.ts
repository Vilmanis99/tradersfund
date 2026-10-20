import type { Challenge, ConsistencyRule, ConsistencyScope } from '@/lib/firms'

/**
 * Stage scope for consistency rules. The plain consistencyRulePct field says
 * nothing about where a rule applies (evaluation, funded stage, one payout
 * route), so generated copy names a rule only when a scope is recorded:
 * consistencyRules[] first, otherwise consistencyRulePct + consistencyScope.
 * Without either, the templates stay silent; writer overrides still win.
 */
export const CONSISTENCY_SCOPES: readonly ConsistencyScope[] = ['evaluation', 'funded', 'both']

const SCOPE_PHRASE: Record<ConsistencyScope, string> = {
  evaluation: 'during evaluation',
  funded: 'on the funded account',
  both: 'in evaluation and on the funded account',
}

const validPercent = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100
const validScope = (value: unknown): value is ConsistencyScope => typeof value === 'string' && (CONSISTENCY_SCOPES as readonly string[]).includes(value)

type ConsistencyFields = Pick<Challenge, 'consistencyRulePct' | 'consistencyScope' | 'consistencyRules' | 'sourceUrl'>

/** Scoped rules for a product: consistencyRules when present, else the legacy pct with its scope; [] when unscoped. */
export function scopedConsistencyRules(product: ConsistencyFields): ConsistencyRule[] {
  if (Array.isArray(product.consistencyRules) && product.consistencyRules.length) {
    return product.consistencyRules.filter(rule => validPercent(rule?.percent) && validScope(rule?.scope))
  }
  if (validPercent(product.consistencyRulePct) && validScope(product.consistencyScope)) {
    return [{ percent: product.consistencyRulePct, scope: product.consistencyScope, sourceUrl: product.sourceUrl }]
  }
  return []
}

/** "50% consistency rule during evaluation" or "35% consistency rule on On-Demand payouts". */
export function consistencyRulePhrase(rule: ConsistencyRule) {
  const appliesTo = rule.appliesTo?.trim()
  return appliesTo ? `${rule.percent}% consistency rule on ${appliesTo}` : `${rule.percent}% consistency rule ${SCOPE_PHRASE[rule.scope]}`
}

/** Field names behind a product's scoped rules, for the copy-drafts source list. */
export function consistencyFields(product: Pick<Challenge, 'productSlug' | 'consistencyRules'>) {
  return Array.isArray(product.consistencyRules) && product.consistencyRules.length
    ? [`${product.productSlug}.consistencyRules[]`]
    : [`${product.productSlug}.consistencyRulePct`, `${product.productSlug}.consistencyScope`]
}

/** Validation for the optional scope fields; absent fields are always valid. Mirrors scripts/merge-capture.mjs. */
export function consistencyFieldProblems(product: Record<string, unknown>, where = 'product') {
  const problems: string[] = []
  if (product.consistencyScope != null && !validScope(product.consistencyScope)) {
    problems.push(`${where}: consistencyScope must be one of ${CONSISTENCY_SCOPES.join(', ')}`)
  }
  if (product.consistencyRules !== undefined && product.consistencyRules !== null) {
    if (!Array.isArray(product.consistencyRules)) problems.push(`${where}: consistencyRules must be an array`)
    else product.consistencyRules.forEach((rule: unknown, index: number) => {
      const r = (rule ?? {}) as Record<string, unknown>
      if (!validPercent(r.percent)) problems.push(`${where}: consistencyRules[${index}].percent must be above 0 and at most 100`)
      if (!validScope(r.scope)) problems.push(`${where}: consistencyRules[${index}].scope must be one of ${CONSISTENCY_SCOPES.join(', ')}`)
      if (r.appliesTo !== undefined && (typeof r.appliesTo !== 'string' || !r.appliesTo.trim())) problems.push(`${where}: consistencyRules[${index}].appliesTo must be a non-empty string when present`)
      if (typeof r.sourceUrl !== 'string' || !/^https?:\/\//.test(r.sourceUrl)) problems.push(`${where}: consistencyRules[${index}].sourceUrl must be an http(s) URL`)
    })
    if (product.consistencyRuleApplies === false && Array.isArray(product.consistencyRules) && product.consistencyRules.length) {
      problems.push(`${where}: no consistency rule cannot also list consistencyRules`)
    }
  }
  return problems
}
