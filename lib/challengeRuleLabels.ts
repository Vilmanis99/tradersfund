/** Shared, client-safe labels. Missing evidence is never a permission or a zero. */
type Locale = 'en' | 'ru'
type DayLimit = { maxTradingDays: number | null; maxTradingDaysUnlimited?: boolean | null }
type Consistency = { consistencyRulePct: number | null; consistencyRuleApplies?: boolean | null }
const unknown = (locale: Locale) => locale === 'ru' ? 'Не подтверждено' : 'Unverified'

export function minimumTradingDaysLabel(value: number | null, locale: Locale = 'en'): string {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? String(value) : unknown(locale)
}

export function maximumTradingDaysLabel(product: DayLimit, locale: Locale = 'en'): string {
  if (product.maxTradingDaysUnlimited != null && typeof product.maxTradingDaysUnlimited !== 'boolean') return unknown(locale)
  if (product.maxTradingDaysUnlimited === true) {
    // Contradictory records must not silently discard a finite limit.
    return product.maxTradingDays == null
      ? locale === 'ru' ? 'Без ограничения срока' : 'Unlimited'
      : unknown(locale)
  }
  return typeof product.maxTradingDays === 'number' && Number.isInteger(product.maxTradingDays) && product.maxTradingDays > 0
    ? String(product.maxTradingDays) : unknown(locale)
}

export function consistencyRuleLabel(product: Consistency, locale: Locale = 'en'): string {
  if (product.consistencyRuleApplies != null && typeof product.consistencyRuleApplies !== 'boolean') return unknown(locale)
  if (product.consistencyRuleApplies === false) {
    return product.consistencyRulePct == null
      ? locale === 'ru' ? 'Правило не применяется' : 'No rule'
      : unknown(locale)
  }
  if (typeof product.consistencyRulePct === 'number' && Number.isFinite(product.consistencyRulePct)
    && product.consistencyRulePct > 0 && product.consistencyRulePct <= 100) return `${product.consistencyRulePct}%`
  if (product.consistencyRuleApplies === true && product.consistencyRulePct == null) {
    return locale === 'ru' ? 'Применяется; процент не подтверждён' : 'Applies; percentage unverified'
  }
  return unknown(locale)
}
