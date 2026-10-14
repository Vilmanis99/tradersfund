import { getAllChallenges, getAllFirms } from '@/lib/firms'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'

/**
 * Newest firm/product/watch date behind the Russian ranking. Shared by the
 * sitemap and /ru/luchshie-prop-firmy so the visible "Обновлено" date and
 * sitemap lastmod always agree.
 */
export function russianRankingDataDate(): string {
  const firmsLast = getAllFirms().map(firm => firm.lastUpdated).filter((d): d is string => !!d).sort().at(-1)
  const challengeLast = [
    ...getAllChallenges().map(challenge => challenge.sourceCapturedAt),
    ...getChallengeWatchEntries().map(entry => entry.lastCheckedAt),
  ].filter(Boolean).sort().at(-1)
  return [firmsLast, challengeLast].filter((d): d is string => !!d).sort().at(-1) ?? new Date().toISOString().slice(0, 10)
}
