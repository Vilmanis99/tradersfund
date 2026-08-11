import type { IndiaPayoutRail } from '@/lib/india'

export const INDIA_MATCHER_STRATEGIES = ['manual', 'ea', 'news', 'swing'] as const
export const INDIA_MATCHER_PROGRAMS = ['any', 'instant', 'one-step', 'multi-step'] as const
export const INDIA_MATCHER_DRAWDOWNS = ['any', 'static', 'trailing'] as const
export const INDIA_MATCHER_PAYOUTS = [
  'any',
  'bank',
  'card',
  'crypto',
  'rise',
  'skrill',
  'wise',
] as const satisfies readonly ('any' | IndiaPayoutRail)[]

export type IndiaMatcherStrategy = typeof INDIA_MATCHER_STRATEGIES[number]
export type IndiaMatcherProgram = typeof INDIA_MATCHER_PROGRAMS[number]
export type IndiaMatcherDrawdown = typeof INDIA_MATCHER_DRAWDOWNS[number]
export type IndiaMatcherPayout = typeof INDIA_MATCHER_PAYOUTS[number]
export type IndiaMatcherChangedControl = keyof IndiaMatcherFilters | 'reset'

export interface IndiaMatcherFilters {
  strategy: IndiaMatcherStrategy
  program: IndiaMatcherProgram
  drawdown: IndiaMatcherDrawdown
  payout: IndiaMatcherPayout
}

export const DEFAULT_INDIA_MATCHER_FILTERS: IndiaMatcherFilters = {
  strategy: 'manual',
  program: 'any',
  drawdown: 'any',
  payout: 'any',
}

export function indiaMatcherStateKey(filters: IndiaMatcherFilters) {
  return [filters.strategy, filters.program, filters.drawdown, filters.payout].join(':')
}

export function indiaMatcherResultProperties(
  filters: IndiaMatcherFilters,
  changedControl: IndiaMatcherChangedControl,
  matchingFirms: number,
  matchingProducts: number,
) {
  return {
    surface: 'india' as const,
    changed_control: changedControl,
    strategy: filters.strategy,
    program: filters.program,
    drawdown: filters.drawdown,
    payout: filters.payout,
    matching_firms: matchingFirms,
    matching_products: matchingProducts,
  }
}
