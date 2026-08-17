export interface TradingToolReviewConfig {
  slug: string
  name: string
  useCase: string
}

export interface TradingToolPost {
  slug: string
  title: string
  excerpt: string
  date: string
  modified: string
}

export const TRADING_TOOL_REVIEWS: readonly TradingToolReviewConfig[] = [
  { slug: 'fx-replay-review', name: 'FX Replay', useCase: 'Manual strategy backtesting' },
  { slug: 'traders-connect-trade-copier', name: 'Traders Connect', useCase: 'Multi-account trade copying' },
  { slug: '3commas-review', name: '3Commas', useCase: 'Crypto bot automation' },
  { slug: 'zulutrade-review', name: 'ZuluTrade', useCase: 'Social copy trading' },
  { slug: 'copyfx-review', name: 'CopyFX', useCase: 'Broker-native copy trading' },
] as const

export function getTradingToolReview(slug: string) {
  return TRADING_TOOL_REVIEWS.find(review => review.slug === slug)
}

/** Stable reciprocal cluster: every configured tool review links to the other four. */
export function getTradingToolReviewLinks<T extends TradingToolPost>(
  currentSlug: string,
  posts: readonly T[],
) {
  if (!getTradingToolReview(currentSlug)) return []
  const postBySlug = new Map(posts.map(post => [post.slug, post]))

  return TRADING_TOOL_REVIEWS.flatMap(review => {
    if (review.slug === currentSlug) return []
    const post = postBySlug.get(review.slug)
    return post ? [{ ...review, post }] : []
  })
}
