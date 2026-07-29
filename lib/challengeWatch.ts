import fs from 'fs'
import path from 'path'

export type ChallengeWatchKind =
  | 'lineup-change'
  | 'price-watch'
  | 'rule-change'
  | 'source-conflict'

export type ChallengeWatchStatus = 'verified' | 'watch'

export interface ChallengeWatchEntry {
  id: string
  firmSlug: string
  firmName: string
  productSlugs: string[]
  kind: ChallengeWatchKind
  status: ChallengeWatchStatus
  observedAt: string
  /** Most recent first-party recheck; routine checks must not rewrite observedAt. */
  lastCheckedAt: string
  effectiveAt?: string
  title: string
  summary: string
  traderImpact: string
  sourceUrls: string[]
}

export interface ChallengeProductSignal {
  id: string
  kind: ChallengeWatchKind
  status: ChallengeWatchStatus
  lastCheckedAt: string
  title: string
  traderImpact: string
  sourceUrl: string
}

export function productChangeSignals(
  entries: ChallengeWatchEntry[],
  firmSlug: string,
  productSlug: string,
): ChallengeProductSignal[] {
  return entries
    .filter(entry =>
      entry.firmSlug === firmSlug
      && entry.productSlugs.includes(productSlug))
    .map(entry => ({
      id: entry.id,
      kind: entry.kind,
      status: entry.status,
      lastCheckedAt: entry.lastCheckedAt,
      title: entry.title,
      traderImpact: entry.traderImpact,
      sourceUrl: entry.sourceUrls[0],
    }))
}

export function getChallengeWatchEntries(): ChallengeWatchEntry[] {
  const filePath = path.join(process.cwd(), 'content/data/challenge-watch.json')
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8')
  return (JSON.parse(raw) as ChallengeWatchEntry[])
    .sort((a, b) =>
      b.lastCheckedAt.localeCompare(a.lastCheckedAt) ||
      b.observedAt.localeCompare(a.observedAt) ||
      a.title.localeCompare(b.title))
}
