import type { GlobalChallengeRow } from './challengeComparison'
import { fundedNextOneStepPayoutLabel } from './fundedNextPayout.ts'

/** The number is a request condition, never a promised receipt date. */
export function russianPayoutRequestLabel(product: Pick<GlobalChallengeRow['product'], 'phases' | 'payoutFirstDays'> & { firmSlug?: string; productSlug?: string }): string {
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
  const days = product.payoutFirstDays
  if (days == null || !Number.isInteger(days) || days < 0) return 'Уточните условия запроса'
  if (days === 0) return 'По условиям программы'
  return product.phases === 0
    ? `Через ${days} дн. по правилам программы без оценки`
    : `Через ${days} дн. на счёте после оценки`
}
