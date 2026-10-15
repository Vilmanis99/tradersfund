/** Search-intent consolidations that should never re-enter public content lists. */
export const RETIRED_POST_REDIRECTS = {
  'forex-prop-firms-in-the-us': '/best-prop-firms-in-us',
  // The Funded Trader delisted 2026-10-14: official sites return HTTP 402
  // (deployment disabled); send review traffic to the current shortlist.
  'the-funded-trader-review': '/best-prop-firms-2026',
} as const

export type RetiredPostSlug = keyof typeof RETIRED_POST_REDIRECTS

export function isRetiredPostSlug(slug: string): slug is RetiredPostSlug {
  return Object.prototype.hasOwnProperty.call(RETIRED_POST_REDIRECTS, slug)
}
