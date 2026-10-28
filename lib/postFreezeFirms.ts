/**
 * Firms added to firms.json after the 805b715 freeze (2026-10-27).
 *
 * Until the freeze lifts (~10 Nov 2026, after the GSC read), these firms keep
 * their own review, firm, rules and challenge pages and stay in /prop-firms,
 * but they are left out of:
 *   - /compare pairs (see lib/compareAllowlist.ts), the /compare hub counts,
 *   - the /best-prop-firms-2026 and /best-swing-trading-prop-firms rankings
 *     and the counts in their titles, H1s and copy,
 * so no existing URL's title, H1 or matchup count moves.
 */
export const POST_FREEZE_FIRMS: ReadonlySet<string> = new Set([
  'hash-hedge',
])

export function isPostFreezeFirm(slug: string): boolean {
  return POST_FREEZE_FIRMS.has(slug)
}

/** Landings whose ranking and counts are frozen to the pre-freeze firm set. */
export const FROZEN_COUNT_LANDINGS: ReadonlySet<string> = new Set([
  'best-prop-firms-2026',
  'best-swing-trading-prop-firms',
])
