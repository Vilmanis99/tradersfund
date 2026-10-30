import type { Challenge, ChallengeAccountSize, ChallengeRules } from './firms'

/** The product fields the directory filters read (full Challenge or lib/publicFirm's PublicChallenge). */
type DirectoryProduct = Pick<Challenge, 'phases' | 'drawdownType' | 'profitSplitPct'> & {
  rules: Pick<ChallengeRules, 'news' | 'ea' | 'overnight' | 'weekend'>
  accountSizes: Pick<ChallengeAccountSize, 'sizeUsd'>[]
}

export const DIRECTORY_PHASES = ['All', 'Instant', '1-step', '2-step', '3-step'] as const
export const DIRECTORY_DRAWDOWNS = ['All', 'static', 'trailing', 'eod-trailing', 'balance-based'] as const
export const DIRECTORY_SIZES = [5_000, 10_000, 25_000, 50_000, 100_000, 200_000]
export const DIRECTORY_SORTS = ['score', 'name', 'founded', 'profitSplitPct', 'trustpilotScore'] as const
export type DirectoryState = {
  q: string; asset: string; platform: string; score: number; size: number
  phase: typeof DIRECTORY_PHASES[number]; drawdown: typeof DIRECTORY_DRAWDOWNS[number]
  news: boolean; ea: boolean; overnight: boolean; weekend: boolean
  selected: string[]; sort: typeof DIRECTORY_SORTS[number]; direction: 'asc' | 'desc'
}
export const DIRECTORY_DEFAULTS: DirectoryState = {
  q: '', asset: 'All', platform: 'All', score: 0, size: 0, phase: 'All', drawdown: 'All',
  news: false, ea: false, overnight: false, weekend: false, selected: [], sort: 'score', direction: 'desc',
}
const keys = Object.keys(DIRECTORY_DEFAULTS) as (keyof DirectoryState)[]

export function parseDirectoryQuery(query: { get(key: string): string | null }, options: {
  assets: string[]; platforms: string[]; slugs: string[]
}): DirectoryState {
  const rawPhase = query.get('phase')?.toLowerCase()
  const phase = ({ instant: 'Instant', '0': 'Instant', 'one-step': '1-step', '1': '1-step',
    'two-step': '2-step', '2': '2-step', 'three-step': '3-step', '3': '3-step' } as Record<string, string>)[rawPhase || ''] || rawPhase
  const score = Number(query.get('score'))
  const size = Number(query.get('size'))
  const valid = <T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? value as T : fallback
  return {
    q: (query.get('q') || '').slice(0, 100),
    asset: valid(query.get('asset'), options.assets, 'All'),
    platform: valid(query.get('platform'), options.platforms, 'All'),
    score: Number.isFinite(score) && score >= 0 && score <= 10 && score % 0.5 === 0 ? score : 0,
    size: DIRECTORY_SIZES.includes(size) ? size : 0,
    phase: valid(phase, DIRECTORY_PHASES, 'All'),
    drawdown: valid(query.get('drawdown'), DIRECTORY_DRAWDOWNS, 'All'),
    news: query.get('news') === 'allowed', ea: query.get('ea') === 'allowed',
    overnight: query.get('overnight') === 'allowed', weekend: query.get('weekend') === 'allowed',
    selected: [...new Set((query.get('selected') || '').split(','))].filter(slug => options.slugs.includes(slug)).slice(0, 2),
    sort: valid(query.get('sort'), DIRECTORY_SORTS, 'score'),
    direction: valid(query.get('direction'), ['asc', 'desc'], 'desc'),
  }
}

/** Preserve campaign parameters; only replace state owned by the directory. */
export function writeDirectoryQuery(existing: string, state: DirectoryState) {
  const query = new URLSearchParams(existing)
  for (const key of keys) {
    query.delete(key)
    const value = state[key]
    if (Array.isArray(value)) { if (value.length) query.set(key, value.join(',')) }
    else if (typeof value === 'boolean') { if (value) query.set(key, 'allowed') }
    else if (value !== DIRECTORY_DEFAULTS[key]) query.set(key, String(value))
  }
  return query.toString()
}

export function hasProductFilters(state: DirectoryState) {
  return state.size > 0 || state.phase !== 'All' || state.drawdown !== 'All'
    || state.news || state.ea || state.overnight || state.weekend
}

/** The same projected offerings drive both eligibility and every displayed product term. */
export function matchingDirectoryProducts<T extends DirectoryProduct>(products: T[], state: DirectoryState): T[] {
  return products.filter(product =>
    (state.phase === 'All' || (product.phases === 0 ? 'Instant' : `${product.phases}-step`) === state.phase)
    && (state.drawdown === 'All' || product.drawdownType === state.drawdown)
    && (!state.news || product.rules.news === true) && (!state.ea || product.rules.ea === true)
    && (!state.overnight || product.rules.overnight === true) && (!state.weekend || product.rules.weekend === true),
  ).map(product => ({ ...product, accountSizes: product.accountSizes.filter(tier =>
    state.size === 0 || (state.size >= 200_000 ? tier.sizeUsd >= state.size : tier.sizeUsd === state.size)),
  })).filter(product => state.size === 0 || product.accountSizes.length > 0)
}

export function directorySplit(products: Pick<Challenge, 'profitSplitPct'>[]) {
  const values = products.flatMap(product => product.profitSplitPct == null ? [] : [product.profitSplitPct])
  const hasUnknown = values.length < products.length
  const min = values.length ? Math.min(...values) : null
  const max = values.length ? Math.max(...values) : null
  return { min, max, hasUnknown }
}
