import type { GlobalChallengeRow } from './challengeComparison'

/** The number is a request condition, never a promised receipt date. */
export function russianPayoutRequestLabel(product: Pick<GlobalChallengeRow['product'], 'phases' | 'payoutFirstDays'>): string {
  const days = product.payoutFirstDays
  if (days == null) return 'Уточните условия запроса'
  if (days === 0) return 'По условиям программы'
  return product.phases === 0
    ? `Через ${days} дн. по правилам программы без оценки`
    : `Через ${days} дн. на счёте после оценки`
}
