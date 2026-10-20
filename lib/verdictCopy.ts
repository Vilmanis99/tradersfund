import copy from '@/content/data/verdict-copy.json'

/** Writer overrides for generated verdict copy; see content/data/verdict-copy.json. */
type ReviewCopy = { verdict?: string | null; bestFor?: string[]; notFor?: string[] }
type CompareCopy = { pickA?: string[]; pickB?: string[] }

const data = copy as { reviews?: Record<string, ReviewCopy>; compares?: Record<string, CompareCopy> }

const lines = (value: unknown) => Array.isArray(value) ? value.filter((line): line is string => typeof line === 'string' && line.trim().length > 0) : undefined

export function getReviewCopy(slug: string): ReviewCopy {
  const entry = data.reviews?.[slug] ?? {}
  return {
    // null hides the verdict line; a string replaces it; absent uses the review's own sentence.
    verdict: entry.verdict === null ? null : typeof entry.verdict === 'string' && entry.verdict.trim() ? entry.verdict.trim() : undefined,
    bestFor: lines(entry.bestFor),
    notFor: lines(entry.notFor),
  }
}

export function getCompareCopy(matchup: string): CompareCopy {
  const entry = data.compares?.[matchup] ?? {}
  // An empty list is kept: the writer found no honest line for that side, so it stays hidden.
  return { pickA: lines(entry.pickA), pickB: lines(entry.pickB) }
}
