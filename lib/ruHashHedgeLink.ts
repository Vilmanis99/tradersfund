import { getAllFirms, type Firm } from '@/lib/firms'
import { russianPublishedHref } from '@/lib/localizedRoutes'

/** Terms date of the Hash Hedge conditions we cite ('Last Updated: October 8, 2026'; same as TERMS_DATED on /ru/obzor-hash-hedge). */
export const HASH_HEDGE_TERMS_DATE_RU = '08.10.2026'

/**
 * Shared gate for every Hash Hedge mention on RU pages other than the review itself (RU SEO Lead, 23.10.2026):
 * returns the review href only when a 'Hash Hedge' entry exists in firms.json AND /ru/obzor-hash-hedge is registered
 * in lib/localizedRoutes.ts; otherwise null, and the caller renders nothing (no text, no link).
 * Callers pass the review path literally so audit-reviews.mjs (static scan of '/ru/...' literals in page sources) still sees the link.
 */
export function ruHashHedgeReviewHref(
  reviewPath: '/ru/obzor-hash-hedge',
  firms: Pick<Firm, 'name'>[] = getAllFirms(),
): string | null {
  return firms.some(firm => firm.name === 'Hash Hedge') ? russianPublishedHref(reviewPath) : null
}
