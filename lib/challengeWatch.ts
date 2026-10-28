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
  /** Rule-only rechecks may cite specific evidence sections without refreshing prices. */
  ruleEvidenceRefs?: { file: string; section: string }[]
  /** Unresolved conflicts have their own dated observations, not a refreshed product capture. */
  sourceConflictEvidenceRefs?: { file: string; section: string }[]
  effectiveAt?: string
  title: string
  summary: string
  traderImpact: string
  sourceUrls: string[]
}

/**
 * The watch-entry fields the client change feed renders. Evidence references name internal
 * evidence files and sections; the feed only shows whether a rule-only or conflict path was
 * used, so it receives booleans, not the references (props are serialised into the page).
 */
export interface ChallengeChangeCardEntry {
  id: string
  firmSlug: string
  firmName: string
  kind: ChallengeWatchKind
  status: ChallengeWatchStatus
  observedAt: string
  lastCheckedAt: string
  ruleSourcesCheckedSeparately?: true
  conflictObservedSeparately?: true
  effectiveAt?: string
  title: string
  summary: string
  traderImpact: string
  sourceUrls: string[]
}

export function challengeChangeCardEntry(entry: ChallengeWatchEntry): ChallengeChangeCardEntry {
  return {
    id: entry.id,
    firmSlug: entry.firmSlug,
    firmName: entry.firmName,
    kind: entry.kind,
    status: entry.status,
    observedAt: entry.observedAt,
    lastCheckedAt: entry.lastCheckedAt,
    ...(entry.ruleEvidenceRefs?.length ? { ruleSourcesCheckedSeparately: true as const } : {}),
    ...(entry.sourceConflictEvidenceRefs?.length ? { conflictObservedSeparately: true as const } : {}),
    ...(entry.effectiveAt ? { effectiveAt: entry.effectiveAt } : {}),
    title: entry.title,
    summary: entry.summary,
    traderImpact: entry.traderImpact,
    sourceUrls: entry.sourceUrls,
  }
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
