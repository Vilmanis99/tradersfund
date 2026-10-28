import type { RussiaStatus } from '@/lib/russiaAvailability'

export interface ComparisonRow {
  firmSlug: string
  firmName: string
  logo: string
  reviewUrl: string
  score: number
  trustpilot: number | null
  product: string
  /** Precomposed "firmSlug:productSlug" for data-split-product (avoids serialising productSlug). */
  splitProductKey: string
  phases: number
  assetClass: string
  price: number
  currency: 'USD' | 'EUR'
  /** Checkout plus mandatory extras, e.g. "$5 now + $589 after passing"; null when the price is the whole entry cost. */
  priceBreakdown: string | null
  pricingModel: string
  profitTarget: number | null
  dailyLossPct: number | null
  maxLossPct: number | null
  profitSplitPct: number | null
  /** Lang-resolved display rows for the tier disclosure; omit when flat. */
  splitTierRows?: import('@/lib/profitSplitDisplay').SplitTierDisplayRow[]
  payoutFrequency: string | null
  checkedOn: string
  /** /go/<slug> without campaign; the table appends ?from=<placement>-table|-cards. */
  goHref: string | null
  /** First-party site, shown as a non-sponsored link when there is no affiliate link. */
  officialUrl: string | null
  russiaStatus: RussiaStatus | null
  /** russiaBasis evidence date (YYYY-MM-DD) for 'not-on-restricted-list' firms, else null. */
  russiaBasisDate: string | null
}
