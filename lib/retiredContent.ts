/** Search-intent consolidations that should never re-enter public content lists. */
export const RETIRED_POST_REDIRECTS = {
  'forex-prop-firms-in-the-us': '/best-prop-firms-in-us',
} as const

export type RetiredPostSlug = keyof typeof RETIRED_POST_REDIRECTS

export function isRetiredPostSlug(slug: string): slug is RetiredPostSlug {
  return Object.prototype.hasOwnProperty.call(RETIRED_POST_REDIRECTS, slug)
}
