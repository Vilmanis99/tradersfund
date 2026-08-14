import type { PostData, PostMeta } from './mdx'

const GENERIC_TITLE_TOKENS = new Set([
  'a',
  'an',
  'and',
  'are',
  'best',
  'explained',
  'firm',
  'firms',
  'for',
  'full',
  'guide',
  'how',
  'in',
  'is',
  'it',
  'new',
  'of',
  'prop',
  'review',
  'still',
  'the',
  'to',
  'trader',
  'traders',
  'trading',
  'what',
  'with',
  'worth',
])

const GENERIC_TAGS = new Set(['prop firm'])
const GENERIC_CATEGORIES = new Set(['educational', 'prop firms'])

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function titleTokens(title: string): Set<string> {
  return new Set(
    normalized(title)
      .split(/\s+/)
      .filter(token =>
        token.length > 1 &&
        !/^\d+(?:\.\d+)?$/.test(token) &&
        !GENERIC_TITLE_TOKENS.has(token),
      ),
  )
}

function normalizedSet(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map(normalized).filter(Boolean))
}

function overlapSize(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const value of a) {
    if (b.has(value)) count += 1
  }
  return count
}

function blogLinks(content: string): Set<string> {
  const slugs = new Set<string>()
  const expression = /href=["']\/blog\/([a-z0-9-]+)(?:[?#][^"']*)?["']/gi
  for (const match of content.matchAll(expression)) {
    slugs.add(match[1].toLowerCase())
  }
  return slugs
}

function updatedAt(post: PostMeta): number {
  const parsed = Date.parse(post.modified || post.date)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Relevance score for the existing related-article rail.
 *
 * Explicit editorial links and backlinks are useful signals, but neither can
 * overpower a genuinely shared topic by itself. Broad category membership is
 * a fallback; publication date only breaks equal-score ties in the ranker.
 */
export function relatedPostScore(current: PostData, candidate: PostData): number {
  if (current.slug === candidate.slug) return Number.NEGATIVE_INFINITY

  const currentCategories = normalizedSet(current.categories)
  const candidateCategories = normalizedSet(candidate.categories)
  const currentTags = normalizedSet(current.tags)
  const candidateTags = normalizedSet(candidate.tags)
  for (const tag of GENERIC_TAGS) {
    currentTags.delete(tag)
    candidateTags.delete(tag)
  }
  for (const category of GENERIC_CATEGORIES) {
    currentCategories.delete(category)
    candidateCategories.delete(category)
  }

  const sharedCategoryCount = overlapSize(currentCategories, candidateCategories)
  let score = 0
  score += sharedCategoryCount * 20
  score += overlapSize(currentTags, candidateTags) * 40
  score += overlapSize(titleTokens(current.title), titleTokens(candidate.title)) * 12

  if (blogLinks(current.content).has(candidate.slug)) {
    score += sharedCategoryCount > 0 ? 35 : 15
  }
  if (blogLinks(candidate.content).has(current.slug)) score += 35

  return score
}

/** Return up to `limit` relevant posts, excluding zero-signal filler links. */
export function rankRelatedPosts(
  current: PostData,
  candidates: PostData[],
  limit = 3,
): PostMeta[] {
  return candidates
    .filter(candidate => candidate.slug !== current.slug)
    .map(candidate => ({
      candidate,
      score: relatedPostScore(current, candidate),
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      updatedAt(b.candidate) - updatedAt(a.candidate) ||
      a.candidate.slug.localeCompare(b.candidate.slug),
    )
    .slice(0, Math.max(0, limit))
    .map(entry => entry.candidate)
}
