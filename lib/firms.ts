import fs from 'fs'
import path from 'path'

/** Trailing = runs behind equity high-water mark. Static = fixed floor. */
export type DrawdownType = 'static' | 'trailing' | 'eod-trailing' | 'balance-based'
export type PayoutFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'on-demand'
export type RuleAvailability = boolean | 'restricted' | null

/** Optional 0–10 editorial sub-ratings. Null means the axis is not yet rated. */
export interface FirmRatings {
  conditions?: number | null
  support?: number | null
  payouts?: number | null
  platform?: number | null
}

export interface Firm {
  // ── Core identity ──
  name: string
  founded: string
  assets: string[]
  maxAllocation: string
  platforms: string[]
  score: number
  logo: string
  /** Internal editorial review page. */
  reviewUrl: string
  /** Firm-owned public website used when no affiliate partnership is configured. */
  officialUrl: string
  /** External affiliate partner URL — empty string if not yet partnered. */
  affiliateUrl?: string
  /**
   * Discount code paired with the affiliate partnership. Surfaced on the
   * FirmCtaCard so traders see the savings before they click — measurable
   * conversion lift. Always paired with `discountPct` for clean copy.
   */
  discountCode?: string
  /** Discount as an integer % off the challenge fee (e.g. 10 for 10%). */
  discountPct?: number

  // ── Financial terms ──
  profitSplitPct?: number | null
  payoutFrequency?: PayoutFrequency | null
  payoutMethods?: string[]
  drawdownType?: DrawdownType | null
  minTradingDays?: number | null
  consistencyRule?: string | null
  scalingPlan?: boolean | null

  // ── Trading rules (true = allowed, restricted = conditional/product-dependent) ──
  newsTradingAllowed?: RuleAvailability
  eaAllowed?: RuleAvailability
  overnightAllowed?: RuleAvailability
  weekendAllowed?: RuleAvailability
  copyTradingAllowed?: RuleAvailability

  // ── Availability ──
  countriesRestricted?: string[]

  // ── Social proof ──
  ratings?: FirmRatings
  trustpilotScore?: number | null
  trustpilotCount?: number | null
  /** Canonical Trustpilot profile URL, so a reader can check our figure. */
  trustpilotUrl?: string
  /**
   * True when Trustpilot itself has removed the aggregate score —
   * "This company's rating is unavailable due to a breach of our
   * guidelines." Verified for E8 Markets, BrightFunded and OFP Funding on
   * 2026-07-27.
   *
   * This is NOT the same state as `trustpilotScore: null` meaning "not yet
   * captured", and the difference matters editorially: a suppressed rating
   * is a stronger signal about a firm than any number would have been, and
   * any score quoted for these firms elsewhere is stale or invented. Render
   * the suppression, never a blank.
   */
  trustpilotRatingSuppressed?: boolean
  /** ISO date the Trustpilot figures above were last verified. */
  trustpilotCapturedAt?: string
  verifiedPayoutBadge?: boolean

  // ── Metadata ──
  lastUpdated?: string
}

/* ── Per-challenge product schema ──────────────────────────────────
 *
 * One firm has multiple challenge *products* (FTMO 1-Step vs 2-Step,
 * FundedNext Stellar 1-Step vs Lite vs Instant, FXIFY One-Phase vs
 * Lightning vs Instant, ...). The `Firm` aggregate is too coarse for
 * honest comparison — reviewers and the True-Cost helper need per-
 * product specifics: price by tier, profit target per phase, daily DD,
 * news/EA rules, etc.
 *
 * Storage: one JSON file per firm at content/data/challenges/<slug>.json
 * containing an array of `Challenge`.
 */

export interface ChallengeAccountSize {
  /** Notional account capital in USD (e.g. 10000, 100000). */
  sizeUsd: number
  /** Challenge fee in USD for this tier. Null when the firm does not publish it. */
  priceUsd: number | null
  /**
   * Challenge fee in EUR, when the firm denominates the fee in euros even
   * though the account is sized in dollars. FTMO does exactly this: the
   * $100K tier's own tooltip reads "$100,000 FTMO Challenge for €439".
   *
   * Kept as a separate field rather than converted, because an FX rate
   * applied at capture time would silently rot and would violate the
   * "never invent numbers" rule in AGENTS.md. A review quoting a
   * EUR-priced tier must say so and must not present a converted figure
   * as the firm's price. computeTrueCost() works in a single currency —
   * feed it priceEur to get a EUR-denominated break-even.
   */
  priceEur?: number | null
  /**
   * Additional amount due after the evaluation is passed. Maven's Buy Now,
   * Pay Later product charges $5 up front and a tier-specific $40-$589 after
   * passing; dropping this field makes the apparent cost wrong by up to 118x.
   */
  payLaterUsd?: number | null
  /**
   * One-time funded-account activation fee for this specific tier. Use this
   * when a firm varies the fee by account size; it takes precedence over the
   * product-wide Challenge.activationFeeUsd fallback.
   */
  activationFeeUsd?: number | null
  /**
   * Daily loss limit in USD when the firm publishes a different fixed cap
   * for each tier. A null value means no verified dollar cap, not zero.
   */
  dailyLossUsd?: number | null
  /**
   * Lifetime loss limit in USD when the firm publishes a different fixed
   * dollar cap for each tier. Futures firms commonly quote "$2,000 on the
   * $50K account" instead of one product-wide percentage. Keeping the
   * dollar value on the tier prevents us from inventing a percentage and
   * still lets computeTrueCost() produce an auditable R-multiple.
   */
  maxLossUsd?: number | null
  /** True = refundable, false = not refundable, null = not verified. */
  refundable: boolean | null
}

export interface ChallengeProfitTargets {
  /** Phase 1 profit target as a %. e.g. 8 means 8%. */
  phase1?: number
  /** Phase 2 profit target as a %. Only relevant for 2- and 3-step challenges. */
  phase2?: number
  /** Phase 3 profit target as a %. Only relevant for 3-step challenges. */
  phase3?: number
}

export interface ChallengeRules {
  /** true = allowed without penalty; false = banned; 'restricted' = allowed with conditions (see notes) */
  news: RuleAvailability
  /** Hold positions over the weekend? */
  weekend: RuleAvailability
  /** Hold positions overnight (cash-session close to next-day open)? */
  overnight: RuleAvailability
  /** Expert Advisors / algorithmic trading allowed? */
  ea: RuleAvailability
  /** Mirror/copy-trade other traders' positions allowed? */
  copyTrading: RuleAvailability
}

export interface Challenge {
  /** Foreign key to Firm — same slug as elsewhere on the site. */
  firmSlug: string
  /** Human-readable product name, e.g. "Stellar 1-Step", "Lightning". */
  productName: string
  /** URL-safe variant of productName. */
  productSlug: string
  /**
   * Number of evaluation phases before the trader reaches a funded account.
   * 0 = instant funding (no evaluation), 1 = single-phase, 2 = standard
   * two-step, 3 = three-step (FXIFY-style).
   */
  phases: 0 | 1 | 2 | 3
  /** Available account-size tiers and their pricing. */
  accountSizes: ChallengeAccountSize[]
  /**
   * How `priceUsd` should be read. Futures firms (Topstep, Take Profit
   * Trader, My Funded Futures) bill the evaluation as a recurring monthly
   * subscription that rebills until you pass or cancel — so `priceUsd` is
   * a *rate*, not a total, and dividing it by the profit split produces a
   * break-even figure that understates the real cost of getting funded.
   *
   * Defaults to 'one-off' when absent (the CFD-firm norm).
   */
  pricingModel?: 'one-off' | 'monthly-subscription' | 'split-payment'
  /**
   * One-time fee charged on passing, before the account goes live —
   * Topstep's XFA activation is $149 on its Standard Path and $0 on its
   * No Activation Fee Path. Null when the firm charges none or doesn't
   * publish one. Must be added to the subscription spend to get a true
   * cost to funded.
   */
  activationFeeUsd?: number | null
  /** Profit target per phase as a %. Null when the firm doesn't publish it. */
  profitTargets: ChallengeProfitTargets | null
  /** Maximum loss per day as a % of starting balance. Null when unpublished. */
  dailyLossPct: number | null
  /** Maximum lifetime loss as a % of starting balance. */
  maxLossPct: number | null
  /** static / trailing / eod-trailing / balance-based. */
  drawdownType: DrawdownType | null
  /** Funded-stage daily loss cap when it differs from the evaluation. */
  fundedDailyLossPct?: number | null
  /** Funded-stage maximum loss cap when it differs from the evaluation. */
  fundedMaxLossPct?: number | null
  /** Funded-stage drawdown method when it differs from the evaluation. */
  fundedDrawdownType?: DrawdownType | null
  /** Minimum trading days to be eligible for funding/payout. Null = none. */
  minTradingDays: number | null
  /** Hard maximum trading days. Null = unlimited. */
  maxTradingDays: number | null
  /** Consistency rule as a % cap on a single day's contribution to total profit. */
  consistencyRulePct: number | null
  /** Profit split this product pays the trader (0–100). */
  profitSplitPct: number | null
  /** Days until the first payout request can be raised on this product. */
  payoutFirstDays: number | null
  payoutFrequency: PayoutFrequency | null
  rules: ChallengeRules
  assetClass: 'cfd' | 'futures' | 'crypto' | 'prediction-markets'
  /** Public URL we sourced this data from. */
  sourceUrl: string
  /** ISO date when we last verified the data against `sourceUrl`. */
  sourceCapturedAt: string
  /** Free-form notes — gotchas, fine print, scaling specifics, promo codes. */
  notes?: string[]
}

/* ── Loaders ───────────────────────────────────────────────────── */

export function getAllFirms(): Firm[] {
  const filePath = path.join(process.cwd(), 'content/data/firms.json')
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as Firm[]
}

/**
 * Read the challenge file for a single firm. Returns [] if no file exists yet
 * (we ship per-firm JSON incrementally).
 */
export function getChallengesByFirm(firmSlug: string): Challenge[] {
  const filePath = path.join(process.cwd(), 'content/data/challenges', `${firmSlug}.json`)
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as Challenge[]
}

/**
 * Load every challenge across every firm — used by the home page to compute
 * cross-firm superlatives (cheapest entry, best split, etc.). Safe at build
 * time: silently skips firms with no challenge file yet.
 */
export function getAllChallenges(): Challenge[] {
  const dir = path.join(process.cwd(), 'content/data/challenges')
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.flatMap(file => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    return JSON.parse(raw) as Challenge[]
  })
}

/* ── True-cost helper ──────────────────────────────────────────── */

/**
 * True when a challenge was verified within the editorial freshness window.
 * Invalid or future-dated captures fail closed instead of looking fresh.
 */
export function isChallengeFresh(
  challenge: Pick<Challenge, 'sourceCapturedAt'>,
  now = new Date(),
  maxAgeDays = 30,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(challenge.sourceCapturedAt)) return false
  const captured = new Date(`${challenge.sourceCapturedAt}T00:00:00Z`)
  if (Number.isNaN(captured.getTime())) return false
  const ageDays = Math.floor((now.getTime() - captured.getTime()) / 86_400_000)
  return ageDays >= 0 && ageDays <= maxAgeDays
}

/**
 * Minimum known cash outlay to reach the funded stage.
 *
 * For a monthly subscription this assumes a first-cycle pass and adds the
 * activation fee. It is a floor, not an average: extra billing cycles and
 * resets must be modelled separately. Split-payment products include both
 * the checkout payment and the amount contractually due after passing.
 */
export function minimumCostToFundedUsd(
  challenge: Pick<Challenge, 'pricingModel' | 'activationFeeUsd'>,
  tier: Pick<ChallengeAccountSize, 'priceUsd' | 'payLaterUsd' | 'activationFeeUsd'>,
): number | null {
  if (tier.priceUsd == null || tier.priceUsd <= 0) return null
  const activationFee = tier.activationFeeUsd ?? challenge.activationFeeUsd ?? 0
  return tier.priceUsd + (tier.payLaterUsd ?? 0) + activationFee
}

export interface TrueCostInput {
  /** Challenge fee at the tier in question. */
  priceUsd: number
  /** Notional account size at that tier. */
  sizeUsd: number
  /** Profit split as a number 0–100 (e.g. 90 = 90%). */
  profitSplitPct: number
  /** Daily DD cap as a %, or null when unknown. */
  dailyLossPct: number | null
  /** Lifetime max DD cap as a %, or null when unknown. */
  maxLossPct: number | null
  /**
   * Tier-specific lifetime max loss in USD. When present this is the
   * authoritative denominator for R-multiple math and takes precedence
   * over a product-wide percentage.
   */
  maxLossUsd?: number | null
}

export interface TrueCostBreakdown {
  /**
   * Trader profit needed at the firm's gross PnL to net the fee back —
   * i.e. priceUsd / (profitSplitPct / 100). This is what the trader has to
   * generate before the first payout pays the fee back.
   */
  breakEvenProfit: number
  /**
   * R-multiple: break-even profit / max permissible loss in dollars.
   * R < 1 means the trader can lose more than they need to make to break
   * even (favorable risk math). R > 1 means the math is against them.
   */
  rMultiple: number | null
  /**
   * Number of trading days to break even at 1% daily account growth,
   * capped by the firm's daily-loss limit (i.e. capped at 1× the daily
   * cap so a single bad day still leaves slack). Null when the inputs
   * lack daily DD data.
   */
  dayCount: number | null
}

/**
 * Compute the trader-facing economics of a challenge tier. Used both by
 * v2 review markdown (hand-rendered into tables) and any future
 * <TrueCost> component.
 *
 * Worked example — FXIFY $5K One-Phase ($59 fee, 80% split, 4% daily,
 * 10% max DD):
 *   breakEvenProfit = 59 / 0.80 = $73.75
 *   rMultiple      = 73.75 / (5000 × 0.10) = 0.15  (very favorable)
 *   dayCount       = ceil(log(1 + 73.75 / 5000) / log(1 + 0.01)) ≈ 2 days
 */
export function computeTrueCost(input: TrueCostInput): TrueCostBreakdown {
  const { priceUsd, sizeUsd, profitSplitPct, dailyLossPct, maxLossPct } = input
  const splitFrac = profitSplitPct / 100
  const breakEvenProfit = splitFrac > 0 ? priceUsd / splitFrac : 0

  const effectiveMaxLossUsd =
    input.maxLossUsd != null
      ? input.maxLossUsd
      : maxLossPct != null
        ? sizeUsd * (maxLossPct / 100)
        : null
  const rMultiple =
    effectiveMaxLossUsd && effectiveMaxLossUsd > 0
      ? breakEvenProfit / effectiveMaxLossUsd
      : null

  let dayCount: number | null = null
  if (dailyLossPct != null && sizeUsd > 0 && breakEvenProfit > 0) {
    // Required gross PnL on the account to net `breakEvenProfit` to the
    // trader is `breakEvenProfit` itself — the split applies after the
    // firm releases payout, not on the running PnL.
    const targetGrowth = breakEvenProfit / sizeUsd
    // Cap daily growth at the daily-loss limit (a realistic worst-case
    // shows what *can* be made on a green day without tripping risk).
    const dailyCapFrac = dailyLossPct / 100
    const dailyGrowth = Math.min(0.01, dailyCapFrac)
    if (dailyGrowth > 0) {
      dayCount = Math.ceil(Math.log(1 + targetGrowth) / Math.log(1 + dailyGrowth))
    }
  }

  return { breakEvenProfit, rMultiple, dayCount }
}
