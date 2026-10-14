import type { RussiaStatus } from '@/lib/russiaAvailability'

export interface ComparisonRow {
  firmSlug: string
  firmName: string
  logo: string
  reviewUrl: string
  score: number
  trustpilot: number | null
  product: string
  phases: number
  assetClass: string
  price: number
  currency: 'USD' | 'EUR'
  pricingModel: string
  profitTarget: number | null
  dailyLossPct: number | null
  maxLossPct: number | null
  profitSplitPct: number | null
  payoutFrequency: string | null
  checkedOn: string
  /** /go/<slug> without campaign; the table appends ?from=<placement>-table|-cards. */
  goHref: string | null
  /** First-party site, shown as a non-sponsored link when there is no affiliate link. */
  officialUrl: string | null
  russiaStatus: RussiaStatus | null
}
