import type { OutboundRelationship } from './outboundDestinations'

export type JourneyStage =
  | 'home'
  | 'india_hub'
  | 'india_payout'
  | 'india_comparison'
  | 'india_matchup_directory'
  | 'india_matchup'
  | 'india_updates'
  | 'challenge_comparison'
  | 'challenge_updates'
  | 'firm_directory'
  | 'comparison_directory'
  | 'head_to_head'
  | 'firm_review'
  | 'russian_home'
  | 'russian_ranking'
  | 'russian_review'
  | 'russian_local_research'
  | 'russian_education'
  | 'editorial'
  | 'information'

const HIGH_INTENT_STAGES = new Set<JourneyStage>([
  'india_hub',
  'india_payout',
  'india_comparison',
  'india_matchup_directory',
  'india_matchup',
  'india_updates',
  'challenge_comparison',
  'challenge_updates',
  'comparison_directory',
  'firm_review',
  'russian_ranking',
  'russian_review',
  'head_to_head',
])

function normalizedPath(pathname: string) {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '') || '/'
}

export function journeyStage(pathname: string): JourneyStage {
  const path = normalizedPath(pathname)
  const indiaRoot = '/best-prop-firms-in-india'

  if (path === '/') return 'home'
  if (path === indiaRoot) return 'india_hub'
  if (path === `${indiaRoot}/payout-methods`) return 'india_payout'
  if (path === `${indiaRoot}/compare`) return 'india_matchup_directory'
  if (path === `${indiaRoot}/challenge-comparison`) return 'india_comparison'
  if (/^\/best-prop-firms-in-india\/[^/]+-vs-[^/]+$/.test(path)) return 'india_matchup'
  if (path === `${indiaRoot}/challenge-changes`) return 'india_updates'
  if (path === '/prop-firm-challenges') return 'challenge_comparison'
  if (path === '/prop-firm-challenge-changes') return 'challenge_updates'
  if (path === '/prop-firms') return 'firm_directory'
  if (path === '/compare') return 'comparison_directory'
  if (path.includes('-vs-') || path.includes('/compare/')) return 'head_to_head'
  if (path === '/ru') return 'russian_home'
  if (path === '/ru/luchshie-prop-firmy') return 'russian_ranking'
  if (
    path === '/ru/obzor-fundednext'
    || path === '/ru/obzor-fundingpips'
    || path === '/ru/obzor-bright-funded'
  ) return 'russian_review'
  if (path === '/ru/luchshie-kripto-prop-firmy') return 'russian_ranking'
  if (path === '/ru/dlya-russkoyazychnykh-treyderov') return 'russian_ranking'
  if (path === '/ru/rossiyskie-prop-kompanii') return 'russian_local_research'
  if (path.startsWith('/ru/')) return 'russian_education'
  if (/^\/blog\/(?:[^/]+-review|bright-funded-prop-firm|my-funded-futures)$/.test(path)) {
    return 'firm_review'
  }
  if (path.startsWith('/blog')) return 'editorial'
  return 'information'
}

export function isHighIntentJourneyStage(stage: JourneyStage) {
  return HIGH_INTENT_STAGES.has(stage)
}

export function goClickEventName(
  firmSlug: string,
  outboundRelationships: Readonly<Record<string, OutboundRelationship>>,
) {
  const relationship = outboundRelationships[firmSlug]
  if (relationship === 'affiliate') return 'affiliate_click'
  if (relationship === 'official') return 'official_site_click'
  return null
}
