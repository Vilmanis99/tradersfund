/**
 * Reviews whose product data is intentionally retained as a dated archive
 * while the firm's first-party source is unavailable or contradictory.
 *
 * These are not current recommendations: they stay reachable for continuity,
 * but are excluded from the sitemap, current comparison discovery and
 * alternative cards until a complete source recapture clears the hold.
 */
export const SOURCE_HOLD_REVIEW_SLUGS = new Set([
  'ofp-funding-review',
  'the-funded-trader-review',
])

export const SOURCE_HOLD_FIRM_SLUGS = new Set([
  'ofp-funding',
  'the-funded-trader',
])

export function isSourceHoldReview(slug: string): boolean {
  return SOURCE_HOLD_REVIEW_SLUGS.has(slug)
}

export function isSourceHoldFirm(slug: string): boolean {
  return SOURCE_HOLD_FIRM_SLUGS.has(slug)
}
