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
  | 'russian_comparison'
  | 'russian_deals'
  | 'russian_review'
  | 'russian_product'
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
  'russian_comparison',
  'russian_deals',
  'russian_review',
  'russian_product',
  'russian_local_research',
  'head_to_head',
])

export type ContentLocale = 'en' | 'ru'
export type CampaignLocale = ContentLocale | 'unknown'

const RUSSIAN_COMPARISON_PATHS = new Set([
  '/ru/fundednext-vs-bright-funded',
  '/ru/fundednext-vs-fundingpips',
  '/ru/prop-firmy-s-ctrader',
])

const RUSSIAN_REVIEW_PATHS = new Set([
  '/ru/obzor-ftmo',
  '/ru/obzor-fundednext',
  '/ru/obzor-fundingpips',
  '/ru/obzor-bright-funded',
])

const RUSSIAN_PRODUCT_PATHS = new Set([
  '/ru/fundednext-mt5',
  '/ru/fundednext-stellar-instant',
])

const RUSSIAN_LOCAL_RESEARCH_PATHS = new Set([
  '/ru/rossiyskie-prop-kompanii',
  '/ru/obzor-proplive',
  '/ru/obzor-eratrade',
  '/ru/obzor-kascapital',
  '/ru/obzor-teamtraders',
])

const RUSSIAN_RANKING_PATHS = new Set([
  '/ru/luchshie-prop-firmy',
  '/ru/luchshie-kripto-prop-firmy',
  '/ru/prop-firmy-bez-chelendzha',
  '/ru/dlya-russkoyazychnykh-treyderov',
  '/ru/forex-prop-firmy',
  '/ru/vyplaty-prop-firm',
  '/ru/prop-firmy-bez-kyc',
])

function normalizedPath(pathname: string) {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '') || '/'
}

export function contentLocale(pathname: string): ContentLocale {
  const path = normalizedPath(pathname)
  return path === '/ru' || path.startsWith('/ru/') ? 'ru' : 'en'
}

export function campaignLocale(placement: string): CampaignLocale {
  if (placement === 'unknown') return 'unknown'
  return placement.startsWith('ru-') ? 'ru' : 'en'
}

export function journeyStage(pathname: string): JourneyStage {
  const path = normalizedPath(pathname)
  const indiaRoot = '/best-prop-firms-in-india'

  if (path === '/') return 'home'
  // Resolve the complete Russian route family before generic `-vs-` and
  // review patterns so Russian acquisition never disappears into an English
  // content group.
  if (path === '/ru') return 'russian_home'
  if (RUSSIAN_COMPARISON_PATHS.has(path)) return 'russian_comparison'
  if (path === '/ru/promokody-prop-firm') return 'russian_deals'
  if (RUSSIAN_REVIEW_PATHS.has(path)) return 'russian_review'
  if (RUSSIAN_PRODUCT_PATHS.has(path)) return 'russian_product'
  if (RUSSIAN_LOCAL_RESEARCH_PATHS.has(path)) return 'russian_local_research'
  if (RUSSIAN_RANKING_PATHS.has(path)) return 'russian_ranking'
  if (path.startsWith('/ru/')) return 'russian_education'
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
