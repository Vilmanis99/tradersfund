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
/**
 * Stellar Lite first payout (Prop Firm Tracker decision 2026-10-20): help articles 10701585 and 17253939, checked 2026-10-20,
 * give 10 business days for accounts bought from 12.10.2026 (older accounts: 21 days, then every 14 days). The product FAQ
 * and help article 9428077 still show 21 days and are treated as outdated. Shown only while the stored value is 10.
 */
export const FUNDEDNEXT_LITE_PAYOUT_CHECKED = '20.10.2026'
export function fundedNextLitePayoutLabel(product: PayoutProduct): string | null {
  if (product.firmSlug !== 'fundednext' || product.productSlug !== 'stellar-lite' || product.payoutFirstDays !== 10) return null
  return `первая выплата через 10 рабочих дней (для счетов, купленных с 12.10.2026; у более старых — 21 день), проверено ${FUNDEDNEXT_LITE_PAYOUT_CHECKED}; далее — каждые 10 рабочих дней (у более старых счетов — каждые 14 дней)`
}

/** Also returns the dated Stellar Lite label, so every caller of this helper shows business days for Lite. */
export function fundedNextOneStepPayoutLabel(product: PayoutProduct, now = new Date()): string | null {
  const lite = fundedNextLitePayoutLabel(product)
  if (lite) return lite
  if (product.firmSlug !== 'fundednext' || product.productSlug !== 'stellar-1-step') return null
  if (!isFundedNextPayoutSourceFresh(now) || product.payoutFirstDays !== fundedNextPayoutSource.oneStepCycleBusinessDays) {
    return 'срок запроса Stellar 1-Step требует проверки; рабочие и календарные дни не приравниваем'
  }
  return `${product.payoutFirstDays} раб. дн. после начала торговли на счёте после оценки; последующие циклы — ${fundedNextPayoutSource.oneStepCycleBusinessDays} раб. дн.`
}
