import reviewEvidence from '../content/data/russian-fundednext-review-evidence.json' with { type: 'json' }

export const fundedNextPayoutSource = reviewEvidence.sources.payoutGeneral

export function isFundedNextPayoutSourceFresh(now = new Date()): boolean {
  const source = fundedNextPayoutSource
  const date = source.sourceCapturedAt
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const captured = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(captured.getTime()) || captured.toISOString().slice(0, 10) !== date) return false
  const age = Math.floor((now.getTime() - captured.getTime()) / 86_400_000)
  return age >= 0 && age <= 30 && reviewEvidence.firmSlug === 'fundednext'
    && source.productSlugs.includes('stellar-1-step') && source.oneStepDayUnit === 'business-days'
    && Number.isInteger(source.oneStepCycleBusinessDays) && source.oneStepCycleBusinessDays > 0
}

type PayoutProduct = { firmSlug?: string; productSlug?: string; payoutFirstDays: number | null }

/** Narrow rule evidence cannot refresh prices or turn a request window into receipt time. */
export function fundedNextOneStepPayoutLabel(product: PayoutProduct, now = new Date()): string | null {
  if (product.firmSlug !== 'fundednext' || product.productSlug !== 'stellar-1-step') return null
  if (!isFundedNextPayoutSourceFresh(now) || product.payoutFirstDays !== fundedNextPayoutSource.oneStepCycleBusinessDays) {
    return 'срок запроса Stellar 1-Step требует проверки; рабочие и календарные дни не приравниваем'
  }
  return `${product.payoutFirstDays} раб. дн. после начала торговли на счёте после оценки; последующие циклы — ${fundedNextPayoutSource.oneStepCycleBusinessDays} раб. дн.`
}
