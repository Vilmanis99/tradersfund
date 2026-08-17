// Explicit extensions keep this shared module executable from the Node release
// scripts as well as from the Next.js bundle.
import type { Firm } from './firms.ts'
import { getChallengesByFirm, isChallengeFresh } from './firms.ts'
import { canonicalMatchupSlug, firmSlug } from './comparisons.ts'
import { rankFirmAlternatives } from './firmAlternatives.ts'

export interface FreshFirmEvidence {
  productCount: number
  sourceCount: number
  latestCapture: string | null
}

export interface RelatedComparison extends FreshFirmEvidence {
  matchup: string
  href: string
  label: string
  anchorName: string
}

/** Current first-party evidence behind one firm, with duplicate source pages collapsed. */
export function getFreshFirmEvidence(firm: Pick<Firm, 'name'>): FreshFirmEvidence {
  const products = getChallengesByFirm(firmSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge),
  )

  return {
    productCount: products.length,
    sourceCount: new Set(products.map(product => product.sourceUrl)).size,
    latestCapture: products
      .map(product => product.sourceCapturedAt)
      .sort()
      .at(-1) ?? null,
  }
}

/** Current combined evidence for an exact firm pair. */
export function getFreshComparisonEvidence(
  left: Pick<Firm, 'name'>,
  right: Pick<Firm, 'name'>,
): FreshFirmEvidence {
  const products = [left, right].flatMap(firm =>
    getChallengesByFirm(firmSlug(firm.name)).filter(challenge => isChallengeFresh(challenge)),
  )

  return {
    productCount: products.length,
    sourceCount: new Set(products.map(product => product.sourceUrl)).size,
    latestCapture: products
      .map(product => product.sourceCapturedAt)
      .sort()
      .at(-1) ?? null,
  }
}

export function comparisonHref(left: Pick<Firm, 'name'>, right: Pick<Firm, 'name'>) {
  return `/compare/${canonicalMatchupSlug(firmSlug(left.name), firmSlug(right.name))}`
}

/**
 * Builds a balanced set of fresh comparison links around both firms.
 * Candidate relevance comes from the existing asset/platform alternative ranker;
 * partnership fields never enter selection or order.
 */
export function buildRelatedComparisons(
  firmA: Firm,
  firmB: Firm,
  allFirms: readonly Firm[],
  perFirm = 2,
): RelatedComparison[] {
  const resultLimit = Number.isFinite(perFirm) ? Math.max(0, Math.trunc(perFirm)) : 0
  if (!resultLimit) return []

  const evidence = new Map(
    allFirms.map(firm => [firm.name, getFreshFirmEvidence(firm)]),
  )
  const currentMatchup = canonicalMatchupSlug(firmSlug(firmA.name), firmSlug(firmB.name))
  const seen = new Set([currentMatchup])
  const rows: RelatedComparison[] = []

  for (const [anchor, currentOpponent] of [[firmA, firmB], [firmB, firmA]] as const) {
    const anchorEvidence = evidence.get(anchor.name)
    if (!anchorEvidence?.productCount) continue

    const candidates = rankFirmAlternatives(
      anchor,
      allFirms.filter(firm =>
        firm.name !== currentOpponent.name
        && Boolean(evidence.get(firm.name)?.productCount),
      ),
      allFirms.length,
    )

    let addedForAnchor = 0
    for (const candidate of candidates) {
      if (addedForAnchor >= resultLimit) break

      const matchup = canonicalMatchupSlug(firmSlug(anchor.name), firmSlug(candidate.name))
      if (seen.has(matchup)) continue

      const candidateEvidence = evidence.get(candidate.name)
      if (!candidateEvidence?.productCount) continue

      const [left, right] = firmSlug(anchor.name) < firmSlug(candidate.name)
        ? [anchor, candidate]
        : [candidate, anchor]
      const pairEvidence = getFreshComparisonEvidence(anchor, candidate)

      seen.add(matchup)
      rows.push({
        matchup,
        href: `/compare/${matchup}`,
        label: `${left.name} vs ${right.name}`,
        anchorName: anchor.name,
        ...pairEvidence,
      })
      addedForAnchor += 1
    }
  }

  return rows
}
