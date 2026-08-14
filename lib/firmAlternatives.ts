/**
 * The non-commercial fields used to select relevant review alternatives.
 * Keep partnership data out of this contract so selection cannot depend on it.
 */
export interface AlternativeCandidate {
  name: string
  assets: string[]
  platforms: string[]
  score: number
}

function normalizedValues(values: readonly string[] = []) {
  return new Set(
    values
      .map(value => value.trim().toLocaleLowerCase('en-US'))
      .filter(Boolean),
  )
}

/** Jaccard similarity over normalized string arrays. */
export function alternativeOverlapScore(
  left: readonly string[] = [],
  right: readonly string[] = [],
) {
  const leftValues = normalizedValues(left)
  const rightValues = normalizedValues(right)
  if (!leftValues.size || !rightValues.size) return 0

  let intersectionSize = 0
  for (const value of leftValues) {
    if (rightValues.has(value)) intersectionSize += 1
  }

  return intersectionSize / (leftValues.size + rightValues.size - intersectionSize)
}

function compareNames(left: string, right: string) {
  const normalizedLeft = left.trim().toLocaleLowerCase('en-US')
  const normalizedRight = right.trim().toLocaleLowerCase('en-US')

  if (normalizedLeft < normalizedRight) return -1
  if (normalizedLeft > normalizedRight) return 1
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

/**
 * Selects review alternatives by product relevance only:
 * 1. asset-class overlap;
 * 2. platform overlap;
 * 3. editorial score;
 * 4. firm name as a stable final tie-breaker.
 *
 * The result is deterministic even when the input array arrives in a different
 * order. Commercial fields are deliberately absent from AlternativeCandidate.
 */
export function rankFirmAlternatives<T extends AlternativeCandidate>(
  current: AlternativeCandidate,
  allFirms: readonly T[],
  limit = 3,
) {
  const resultLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0

  return allFirms
    .filter(firm => firm.name !== current.name)
    .map(firm => ({
      firm,
      assetOverlap: alternativeOverlapScore(current.assets, firm.assets),
      platformOverlap: alternativeOverlapScore(current.platforms, firm.platforms),
    }))
    .sort(
      (left, right) =>
        right.assetOverlap - left.assetOverlap ||
        right.platformOverlap - left.platformOverlap ||
        right.firm.score - left.firm.score ||
        compareNames(left.firm.name, right.firm.name),
    )
    .slice(0, resultLimit)
    .map(entry => entry.firm)
}
