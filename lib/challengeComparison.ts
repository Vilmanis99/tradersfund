import type { ChallengeProfitTargets, ChallengeRules, DrawdownType, PayoutFrequency } from './firms'
import type { ChallengeProductSignal } from './challengeWatch'

/** Serializable, shared view model. No filesystem or live firm lookups in clients. */
export interface GlobalChallengeTier {
  sizeUsd: number
  priceUsd: number | null
  priceEur: number | null
  costToFundedUsd: number | null
  costToFundedEur: number | null
  dailyLossUsd: number | null
  maxLossUsd: number | null
}

export interface GlobalChallengeRow {
  firm: { slug: string; name: string; logo: string; reviewUrl: string; isPartner: boolean; score: number }
  product: {
    name: string
    slug: string
    phases: 0 | 1 | 2 | 3
    tiers: GlobalChallengeTier[]
    pricingModel: 'one-off' | 'monthly-subscription' | 'split-payment'
    profitTargets: ChallengeProfitTargets | null
    dailyLossPct: number | null
    maxLossPct: number | null
    drawdownType: DrawdownType | null
    fundedDailyLossPct: number | null
    fundedMaxLossPct: number | null
    fundedDrawdownType: DrawdownType | null
    minTradingDays: number | null
    maxTradingDays: number | null
    consistencyRulePct: number | null
    profitSplitPct: number | null
    payoutFirstDays: number | null
    payoutFrequency: PayoutFrequency | null
    rules: ChallengeRules
    assetClass: 'cfd' | 'futures' | 'crypto' | 'prediction-markets'
    sourceUrl: string
    capturedAt: string
    changeSignals: ChallengeProductSignal[]
  }
}

export type FinderCurrency = 'USD' | 'EUR'
export type FinderSort = 'name' | 'fee' | 'payout'
export interface ChallengeFinderFilters {
  size: number
  phases: 'all' | '0' | '1' | '2' | '3'
  currency: 'all' | FinderCurrency
  budget: number | null
  drawdown: 'all' | DrawdownType
  sort: FinderSort
}
export const DEFAULT_FINDER_FILTERS: ChallengeFinderFilters = {
  size: 50000, phases: 'all', currency: 'all', budget: null, drawdown: 'all', sort: 'name',
}
export const challengeKey = (row: GlobalChallengeRow) => `${row.firm.slug}:${row.product.slug}`
export const finderTier = (row: GlobalChallengeRow, size: number) => row.product.tiers.find(tier => tier.sizeUsd === size)
export function tierPrice(tier: GlobalChallengeTier, currency: FinderCurrency): number | null {
  return currency === 'USD' ? tier.priceUsd : tier.priceEur
}
export function tierCurrency(tier: GlobalChallengeTier): FinderCurrency | null {
  if (tier.priceUsd != null && tier.priceUsd > 0) return 'USD'
  if (tier.priceEur != null && tier.priceEur > 0) return 'EUR'
  return null
}

/** Never order or budget-filter EUR amounts against USD amounts without an FX source. */
export function filterChallengeRows(rows: GlobalChallengeRow[], filters: ChallengeFinderFilters): GlobalChallengeRow[] {
  return rows.filter(row => {
    const tier = finderTier(row, filters.size)
    if (!tier) return false
    if (filters.phases !== 'all' && row.product.phases !== Number(filters.phases)) return false
    if (filters.drawdown !== 'all' && row.product.drawdownType !== filters.drawdown) return false
    if (filters.currency !== 'all') {
      const price = tierPrice(tier, filters.currency)
      if (price == null || price <= 0) return false
      if (filters.budget != null && price > filters.budget) return false
    }
    return true
  }).sort((a, b) => {
    if (filters.sort === 'fee' && filters.currency !== 'all') {
      const left = tierPrice(finderTier(a, filters.size)!, filters.currency)
      const right = tierPrice(finderTier(b, filters.size)!, filters.currency)
      if (left !== right) return (left ?? Infinity) - (right ?? Infinity)
    }
    if (filters.sort === 'payout') {
      const left = a.product.payoutFirstDays
      const right = b.product.payoutFirstDays
      if (left !== right) return (left ?? Infinity) - (right ?? Infinity)
    }
    return a.firm.name.localeCompare(b.firm.name, 'en') || a.product.name.localeCompare(b.product.name, 'en')
  })
}

/** Fragment state is shareable without producing an indexable URL per combination. */
export function parseFinderState(hash: string, rows: GlobalChallengeRow[]) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const filters = { ...DEFAULT_FINDER_FILTERS }
  const size = Number(params.get('size'))
  if (rows.some(row => row.product.tiers.some(tier => tier.sizeUsd === size))) filters.size = size
  const phases = params.get('steps')
  if (['0', '1', '2', '3'].includes(phases ?? '')) filters.phases = phases as ChallengeFinderFilters['phases']
  const currency = params.get('currency')
  if (currency === 'USD' || currency === 'EUR') filters.currency = currency
  const budget = Number(params.get('budget'))
  if (filters.currency !== 'all' && Number.isFinite(budget) && budget > 0) filters.budget = budget
  const drawdown = params.get('drawdown')
  if (['static', 'trailing', 'eod-trailing', 'balance-based'].includes(drawdown ?? '')) filters.drawdown = drawdown as ChallengeFinderFilters['drawdown']
  const sort = params.get('sort')
  if (sort === 'payout' || (sort === 'fee' && filters.currency !== 'all')) filters.sort = sort
  const valid = new Set(rows.map(challengeKey))
  const selected = [...new Set((params.get('compare') ?? '').split(','))].filter(key => valid.has(key)).slice(0, 3)
  return { filters, selected }
}

export function serializeFinderState(filters: ChallengeFinderFilters, selected: string[]): string {
  const params = new URLSearchParams({ size: String(filters.size) })
  if (filters.phases !== 'all') params.set('steps', filters.phases)
  if (filters.currency !== 'all') {
    params.set('currency', filters.currency)
    if (filters.budget != null) params.set('budget', String(filters.budget))
  }
  if (filters.drawdown !== 'all') params.set('drawdown', filters.drawdown)
  if (filters.sort !== 'name' && (filters.sort !== 'fee' || filters.currency !== 'all')) params.set('sort', filters.sort)
  if (selected.length) params.set('compare', selected.slice(0, 3).join(','))
  return params.toString()
}

/** The crawler validates app-state fragments separately from real section anchors. */
export function isFinderStateFragment(hash: string, rows: GlobalChallengeRow[]): boolean {
  const supplied = new URLSearchParams(hash.replace(/^#/, ''))
  if (!supplied.has('size')) return false
  const parsed = parseFinderState(hash, rows)
  const normalized = new URLSearchParams(serializeFinderState(parsed.filters, parsed.selected))
  supplied.sort()
  normalized.sort()
  return supplied.toString() === normalized.toString()
}
