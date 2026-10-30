import { firmSlug } from './firmSlug.ts'
import {
  challengeCurrency,
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  minimumCostToFundedUsd,
  type Firm,
  type Challenge,
  type ChallengeAccountSize,
  type ChallengeCurrency,
} from './firms'
import {
  INDIA_EVIDENCE_BY_SLUG,
  indiaAccountSizeCapUsd,
  indiaEvidenceScore,
  passesIndiaRegulatoryCountryGate,
  passesIndiaProductGate,
  type IndiaFirmEvidence,
} from './india'
import rawUsAccessEvidence from '@/content/data/us-access-evidence.json'
import {
  cryptoMarketEvidence as typedCryptoMarketEvidence,
  type CryptoMarketEvidence,
  type CryptoMarketWatch,
} from '@/lib/cryptoMarketEvidence'
import rawUkAccessEvidence from '@/content/data/uk-access-evidence.json'
import { isProductSetFresh } from './reviewFreshness.ts'
import { FROZEN_COUNT_LANDINGS, isPostFreezeFirm } from './postFreezeFirms.ts'

/**
 * Long-tail landing pages — "best prop firms in UK", "cheapest", "best
 * futures", etc. These are pure SEO/affiliate funnels: every ranking
 * derives from `firms.json` + challenge JSON, no hand-coded firm lists.
 *
 * Adding a landing:
 *   1. Append a Landing entry below.
 *   2. Create app/<slug>/page.tsx that calls renderLanding(slug).
 *   3. The sitemap loop picks them up via LANDINGS.
 *
 * Versus /prop-firms/[feature]:
 *   - /prop-firms/[feature] = rule-based slices (EA allowed, news trading)
 *   - LANDINGS = geographic + commercial slices (UK, US, cheapest, futures)
 */


export interface LandingFirm {
  firm: Firm
  /** A single number we sort the landing by (lower or higher = better). */
  sortKey: number
  /** A short stat displayed under the firm name on the landing card. */
  highlight: string
  /** Optional independent ranking group, used when values cannot be compared directly. */
  groupLabel?: string
  /** One explanation shown above every row in the same independent ranking group. */
  groupDescription?: string
  /** Optional landing-specific metric shown in place of the generic score. */
  metricLabel?: string
  metricValue?: string
  /** Optional product-specific replacement for the generic payout stat. */
  trailingMetricLabel?: string
  trailingMetricValue?: string
  /**
   * Optional one-line editorial verdict ("who it's for / the catch"), shown
   * under the stat line. Lets a ranking read as opinionated, not a bare
   * leaderboard. Omit on landings where the stat speaks for itself.
   */
  note?: string
  /** Dated first-party support for a geographic or product-access claim. */
  evidence?: {
    label: string
    url: string
    capturedAt: string
  }
  /** Multiple product-rule sources when one card represents several qualifying products. */
  evidenceLinks?: {
    label: string
    url: string
    capturedAt: string
  }[]
  /**
   * Product slugs this card actually names. Sitemap lastmod hashes only these rows
   * (challenges:product:firm:slug) so sibling products on the same firm — e.g. The5ers
   * Summer CFD on a futures card — do not redate the page.
   */
  lastmodProductSlugs?: string[]
}

export interface LandingEvidenceGap {
  firmName: string
  statusLabel: string
  summary: string
  nextStep: string
  sourceUrl: string
  sourceCapturedAt: string
}

export interface Landing {
  slug: string
  /** Visible in the hero + browser tab. */
  h1: string
  /** Page-title portion — keep under 54 chars so the root ` | TFH` template stays under 60. */
  metaTitle: string
  /** <meta description> — keep under 160 chars. */
  metaDescription: string
  /** One-paragraph intro under the hero headline. */
  intro: string
  /** Sort direction: 'asc' = lowest first (cheap), 'desc' = highest first (score). */
  sortDir: 'asc' | 'desc'
  /** Build the ranked list. Has access to all firms + their challenges. */
  rank: (firms: Firm[]) => LandingFirm[]
  /** Footer copy explaining what the page does and doesn't measure. */
  methodology: string
  /** Optional market-specific questions shown above methodology. */
  decisionGuide?: { title: string; body: string }[]
  /** Dated first-party leads that are visible but deliberately excluded from ranking. */
  evidenceGaps?: LandingEvidenceGap[]
  /** Current product count for a landing whose eligibility is computed at product level. */
  snapshotProductCount?: number
  /** ISO date of editorial review. Drives the visible freshness pill. */
  lastReviewed: string
}

const ACCESS_EVIDENCE_MAX_AGE_DAYS = 30

interface UsAccessEvidence {
  firmSlug: string
  firmName: string
  accessStatus: 'explicit' | 'policy-supported'
  assetClass: 'cfd' | 'futures'
  productSlugs: string[]
  platformConstraint: string
  sourceUrl: string
  secondarySourceUrl?: string
  sourcePublishedAt?: string
  sourceCapturedAt: string
  evidenceLabel: string
  decisionNote: string
}

interface UkAccessEvidence {
  firmSlug: string
  firmName: string
  accessStatus: 'policy-supported'
  productSlugs: string[]
  sourceUrl: string
  sourcePublishedAt?: string
  sourceCapturedAt: string
  evidenceLabel: string
  evidenceSummary: string
  decisionNote: string
}

const US_ACCESS_EVIDENCE = rawUsAccessEvidence.firms as UsAccessEvidence[]
const US_ACCESS_EVIDENCE_BY_SLUG = new Map(
  US_ACCESS_EVIDENCE.map(evidence => [
    evidence.firmSlug,
    evidence,
  ]),
)

const UK_ACCESS_EVIDENCE = rawUkAccessEvidence.firms as UkAccessEvidence[]
const UK_ACCESS_EVIDENCE_BY_SLUG = new Map(
  UK_ACCESS_EVIDENCE.map(evidence => [evidence.firmSlug, evidence]),
)

const CRYPTO_MARKET_EVIDENCE: CryptoMarketEvidence[] = typedCryptoMarketEvidence.ranked
const CRYPTO_MARKET_EVIDENCE_BY_SLUG = new Map(
  CRYPTO_MARKET_EVIDENCE.map(evidence => [evidence.firmSlug, evidence]),
)
const CRYPTO_MARKET_WATCH: CryptoMarketWatch[] = typedCryptoMarketEvidence.watch

function isAccessEvidenceFresh(sourceCapturedAt: string) {
  const captured = new Date(`${sourceCapturedAt}T00:00:00Z`)
  if (Number.isNaN(captured.getTime())) return false
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const ageDays = Math.floor((todayUtc - captured.getTime()) / 86400000)
  return ageDays >= 0 && ageDays <= ACCESS_EVIDENCE_MAX_AGE_DAYS
}

function isCryptoMarketEvidenceFresh(sourceCapturedAt: string) {
  return isAccessEvidenceFresh(sourceCapturedAt)
}

function minimumPublishedEntry(challenges: Challenge[]) {
  const usd = challenges.flatMap(challenge =>
    challenge.accountSizes.flatMap(tier =>
      tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : [],
    ),
  )
  const eur = challenges.flatMap(challenge =>
    challenge.accountSizes.flatMap(tier =>
      tier.priceEur != null && tier.priceEur > 0 ? [tier.priceEur] : [],
    ),
  )

  if (usd.length) return `$${Math.min(...usd).toLocaleString('en-US')}`
  if (eur.length) return `€${Math.min(...eur).toLocaleString('en-US')}`
  return 'Price unverified'
}

function indiaEligibleChallenges(
  firmSlugValue: string,
  evidence: IndiaFirmEvidence,
): Challenge[] {
  return getChallengesByFirm(firmSlugValue)
    .filter(challenge => passesIndiaProductGate(evidence, challenge.productSlug))
    .flatMap(challenge => {
      const cap = indiaAccountSizeCapUsd(evidence, challenge.productSlug)
      const accountSizes = challenge.accountSizes.filter(
        tier => cap == null || tier.sizeUsd <= cap,
      )
      return accountSizes.length ? [{ ...challenge, accountSizes }] : []
    })
}

/* ── Landings ──────────────────────────────────────────────────── */

function joinNatural(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`
}

function evidenceLinksForProducts(
  products: Challenge[],
): NonNullable<LandingFirm['evidenceLinks']> {
  const evidenceBySource = new Map<string, { productNames: string[]; capturedAt: string }>()
  for (const product of products) {
    const current = evidenceBySource.get(product.sourceUrl)
    evidenceBySource.set(product.sourceUrl, {
      productNames: [...(current?.productNames ?? []), product.productName],
      capturedAt: product.sourceCapturedAt,
    })
  }

  return [...evidenceBySource.entries()].map(([url, source]) => ({
    label: `${joinNatural(source.productNames)} rule source`,
    url,
    capturedAt: source.capturedAt,
  }))
}

function freshProductsForFirm(firm: Firm): Challenge[] {
  return getChallengesByFirm(firmSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge),
  )
}

function freshMappedProducts(firmSlugValue: string, productSlugs: string[]): Challenge[] {
  const productsBySlug = new Map(
    getChallengesByFirm(firmSlugValue).map(product => [product.productSlug, product]),
  )
  const products = productSlugs.flatMap(productSlug => {
    const product = productsBySlug.get(productSlug)
    return product && isChallengeFresh(product) ? [product] : []
  })

  // A partial mapping could silently borrow a firm-wide rule for an uncaptured
  // product. Exclude the firm until every explicitly mapped row is current.
  return products.length === productSlugs.length ? products : []
}

function cryptoProductsForEvidence(evidence: CryptoMarketEvidence): Challenge[] {
  if (!isCryptoMarketEvidenceFresh(evidence.sourceCapturedAt)) return []
  return freshMappedProducts(evidence.firmSlug, evidence.productSlugs)
}

function ukProductsForEvidence(evidence: UkAccessEvidence): Challenge[] {
  if (!isAccessEvidenceFresh(evidence.sourceCapturedAt)) return []
  return freshMappedProducts(evidence.firmSlug, evidence.productSlugs)
}

function usProductsForEvidence(evidence: UsAccessEvidence): Challenge[] {
  if (!isAccessEvidenceFresh(evidence.sourceCapturedAt)) return []
  return freshMappedProducts(evidence.firmSlug, evidence.productSlugs)
}

export interface AccessLandingSnapshot {
  firmCount: number
  productCount: number
  latestSourceDate: string
}

function buildAccessLandingSnapshot<T extends { sourceCapturedAt: string }>(
  evidence: readonly T[],
  productsForEvidence: (entry: T) => Challenge[],
): AccessLandingSnapshot {
  const current = evidence.flatMap(entry => {
    const products = productsForEvidence(entry)
    return products.length ? [{ entry, products }] : []
  })
  const sourceDates = evidence.flatMap(entry => [
    entry.sourceCapturedAt,
    ...productsForEvidence(entry).map(product => product.sourceCapturedAt),
  ]).filter(Boolean).sort()

  return {
    firmCount: current.length,
    productCount: current.reduce((total, item) => total + item.products.length, 0),
    latestSourceDate: sourceDates.at(-1) ?? '',
  }
}

/**
 * Country-access landing counts must be evaluated when the page renders, not
 * only when the module is first loaded. Otherwise a statically built page can
 * continue showing an expired country-policy snapshot after the 30-day gate.
 */
export function getAccessLandingSnapshot(slug: string): AccessLandingSnapshot | null {
  if (slug === 'best-prop-firms-in-uk') {
    return buildAccessLandingSnapshot(UK_ACCESS_EVIDENCE, ukProductsForEvidence)
  }
  if (slug === 'best-prop-firms-in-us') {
    return buildAccessLandingSnapshot(US_ACCESS_EVIDENCE, usProductsForEvidence)
  }
  return null
}

const CURRENT_CRYPTO_SNAPSHOT = CRYPTO_MARKET_EVIDENCE.flatMap(evidence => {
  const products = cryptoProductsForEvidence(evidence)
  return products.length ? [{ evidence, products }] : []
})
const CURRENT_CRYPTO_FIRM_COUNT = CURRENT_CRYPTO_SNAPSHOT.length
const CURRENT_CRYPTO_PRODUCT_COUNT = CURRENT_CRYPTO_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

const CURRENT_UK_SNAPSHOT = UK_ACCESS_EVIDENCE.flatMap(evidence => {
  const products = ukProductsForEvidence(evidence)
  return products.length ? [{ evidence, products }] : []
})
const CURRENT_UK_FIRM_COUNT = CURRENT_UK_SNAPSHOT.length
const CURRENT_UK_PRODUCT_COUNT = CURRENT_UK_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

const CURRENT_US_SNAPSHOT = US_ACCESS_EVIDENCE.flatMap(evidence => {
  const products = usProductsForEvidence(evidence)
  return products.length ? [{ evidence, products }] : []
})
const CURRENT_US_FIRM_COUNT = CURRENT_US_SNAPSHOT.length
const CURRENT_US_PRODUCT_COUNT = CURRENT_US_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

const CURRENT_OVERALL_SNAPSHOT = getAllFirms().flatMap(firm => {
  if (isPostFreezeFirm(firmSlug(firm.name))) return []
  const products = freshProductsForFirm(firm)
  return products.length ? [{ firm, products }] : []
})
const CURRENT_OVERALL_FIRM_COUNT = CURRENT_OVERALL_SNAPSHOT.length
const CURRENT_OVERALL_PRODUCT_COUNT = CURRENT_OVERALL_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

const CURRENT_CHEAPEST_FIRM_COUNT = getAllFirms().filter(firm =>
  getChallengesByFirm(firmSlug(firm.name)).some(challenge =>
    isChallengeFresh(challenge)
    && challenge.accountSizes.some(tier => publishedMinimumCost(challenge, tier) != null),
  ),
).length

const CURRENT_INSTANT_SNAPSHOT = getAllFirms().flatMap(firm => {
  const products = freshInstantProducts(firm)
  return products.length ? [{ firm, products }] : []
})
const CURRENT_INSTANT_FIRM_COUNT = CURRENT_INSTANT_SNAPSHOT.length
const CURRENT_INSTANT_PRODUCT_COUNT = CURRENT_INSTANT_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

const CURRENT_FUTURES_SNAPSHOT = getAllFirms().flatMap(firm => {
  const products = freshFuturesProducts(firm)
  return products.length ? [{ firm, products }] : []
})
const CURRENT_FUTURES_FIRM_COUNT = CURRENT_FUTURES_SNAPSHOT.length
const CURRENT_FUTURES_PRODUCT_COUNT = CURRENT_FUTURES_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

const CURRENT_SWING_SNAPSHOT = getAllFirms().flatMap(firm => {
  if (isPostFreezeFirm(firmSlug(firm.name))) return []
  const products = swingCompatibleProducts(firm)
  return products.length ? [{ firm, products }] : []
})
const CURRENT_SWING_FIRM_COUNT = CURRENT_SWING_SNAPSHOT.length
const CURRENT_SWING_PRODUCT_COUNT = CURRENT_SWING_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

function swingCompatibleProducts(firm: Firm): Challenge[] {
  return getChallengesByFirm(firmSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge)
    && challenge.rules.overnight === true
    && challenge.rules.weekend === true,
  )
}

function freshFuturesProducts(firm: Firm): Challenge[] {
  return getChallengesByFirm(firmSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge) && challenge.assetClass === 'futures',
  )
}

function freshInstantProducts(firm: Firm): Challenge[] {
  return getChallengesByFirm(firmSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge) && challenge.phases === 0,
  )
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPublishedMoney(amount: number, currency: ChallengeCurrency): string {
  const symbol = currency === 'USD' ? '$' : '€'
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function formatAccountSize(sizeUsd: number): string {
  if (sizeUsd >= 1_000_000) {
    return `$${(sizeUsd / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`
  }
  return `$${(sizeUsd / 1_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}K`
}

function publishedMinimumCost(
  challenge: Challenge,
  tier: ChallengeAccountSize,
): { amount: number; currency: ChallengeCurrency } | null {
  const currency = challengeCurrency(challenge)
  if (currency === 'USD') {
    const amount = minimumCostToFundedUsd(challenge, tier)
    return amount == null ? null : { amount, currency }
  }

  // A EUR checkout cannot be added to a USD after-pass charge without an FX
  // assumption. Fail closed if a future product mixes the two currencies.
  const usdSurcharge = (tier.payLaterUsd ?? 0)
    + (tier.activationFeeUsd ?? challenge.activationFeeUsd ?? 0)
  if (usdSurcharge > 0 || tier.priceEur == null || tier.priceEur <= 0) return null
  return { amount: tier.priceEur, currency }
}

function drawdownLabel(value: Challenge['drawdownType']): string {
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'balance-based'
  return value ?? 'drawdown unpublished'
}

function pricingModelLabel(value: Challenge['pricingModel']): string {
  if (value === 'monthly-subscription') return 'monthly subscription'
  if (value === 'split-payment') return 'split payment'
  return 'one-time fee'
}

export const LANDINGS: Landing[] = [
  {
    slug: 'best-prop-firms-2026',
    h1: `Best Prop Firms (2026): ${CURRENT_OVERALL_FIRM_COUNT} Ranked & Reviewed`,
    metaTitle: `Best Prop Firms (2026): ${CURRENT_OVERALL_FIRM_COUNT} Ranked & Reviewed`,
    metaDescription:
      `Compare ${CURRENT_OVERALL_FIRM_COUNT} prop firms using editorial rankings plus ${CURRENT_OVERALL_PRODUCT_COUNT} current products, fees, splits, drawdowns, reviews, account stages, and dated first-party sources.`,
    intro:
      `There is no universal best prop firm. These ${CURRENT_OVERALL_FIRM_COUNT} firms each have at least 1 product capture inside the 30-day freshness window, covering ${CURRENT_OVERALL_PRODUCT_COUNT} current products in total. Editorial score sets the shortlist order; every card then shows the product count, tier count, split range, drawdown types, review, and a dated first-party source needed for the actual decision.`,
    sortDir: 'desc',
    rank: firms => firms
      .flatMap(firm => {
        const products = freshProductsForFirm(firm)
        if (!products.length) return []

        const tierCount = products.reduce(
          (total, product) => total + product.accountSizes.length,
          0,
        )
        const splits = [...new Set(products.flatMap(product =>
          product.profitSplitPct == null ? [] : [product.profitSplitPct],
        ))].sort((a, b) => a - b)
        const drawdowns = [...new Set(products.map(product =>
          drawdownLabel(product.drawdownType),
        ))].sort()
        const shownProducts = products.slice(0, 2).map(product => product.productName)
        const moreCount = products.length - shownProducts.length
        const evidenceProduct = [...products].sort((a, b) =>
          b.sourceCapturedAt.localeCompare(a.sourceCapturedAt),
        )[0]
        const splitText = splits.length === 0
          ? 'starting split unpublished'
          : splits.length === 1
            ? `${splits[0]}% published starting split`
            : `${splits[0]}–${splits.at(-1)}% published starting splits`

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${products.length} current ${products.length === 1 ? 'product' : 'products'} · ${tierCount} account tiers`,
          note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''}. ${splitText}; ${joinNatural(drawdowns)} drawdown.`,
          evidence: {
            label: `${evidenceProduct.productName} source`,
            url: evidenceProduct.sourceUrl,
            capturedAt: evidenceProduct.sourceCapturedAt,
          },
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm qualifies only while at least 1 structured product capture remains inside the 30-day freshness window. The order uses our directional editorial score, which considers verified rules, payout terms, transparency, operating record, and unresolved evidence gaps. It is not a promise of suitability or future payout. Affiliate status, coupon size, product count, tier count, account headline, and maximum advertised split add 0 points.',
    decisionGuide: [
      {
        title: 'Does rank 1 mean best for every strategy?',
        body: `No. The score is a shortlist signal across ${CURRENT_OVERALL_FIRM_COUNT} firms, while fit is product-specific. A swing, news, automated, futures, CFD, or phase-0 strategy can eliminate a higher-ranked firm once its exact rules are applied.`,
      },
      {
        title: 'Are the editorial score and product facts the same measure?',
        body: `No. Score sets the order; the ${CURRENT_OVERALL_PRODUCT_COUNT}-product snapshot supplies current fees, tiers, splits, drawdown and source dates. Product count, account size, and a high advertised maximum split do not increase the score.`,
      },
      {
        title: 'How should USD, EUR, and recurring prices be compared?',
        body: 'Keep USD and EUR prices separate unless using a live payment-provider rate, and treat a monthly plan as a first-cycle floor. Add required activation or after-pass charges before calling one path cheaper.',
      },
      {
        title: 'What should be rechecked immediately before purchase?',
        body: 'Open the dated product source and verify country access, legal entity, account environment, platform, total fee, loss calculation, payout gates, refund conditions, and any material change logged after capture.',
      },
    ],
    lastReviewed: '2026-08-17',
  },
  {
    slug: 'best-prop-firms-in-uk',
    h1: `Best Prop Firms UK (2026): ${CURRENT_UK_FIRM_COUNT} Prop Trading Firms That Accept UK Traders`,
    metaTitle: `Best Prop Firms UK 2026: ${CURRENT_UK_FIRM_COUNT} That Accept UK Traders`,
    metaDescription:
      `Prop firms that accept UK traders in 2026: ${CURRENT_UK_FIRM_COUNT} firms whose own policy does not exclude UK residents, compared on fees, FCA status, UK tax and payouts.`,
    intro:
      `Looking for a prop firm in the UK? These ${CURRENT_UK_FIRM_COUNT} prop trading firms currently publish a first-party country policy that does not exclude UK residents or nationals, across ${CURRENT_UK_PRODUCT_COUNT} current product paths. None of them is an FCA-authorised broker for funded accounts: most UK-facing prop firms sell evaluations and pay a share of simulated-account profits, so check FCA status, pricing currency, and the payout route yourself before paying. The table ranks by editorial score; affiliate status adds 0 points. Policy access is not a completed UK checkout, KYC approval, payout test, or legal opinion.`,
    sortDir: 'desc',
    rank: firms => firms
      .flatMap(firm => {
        const slug = firmSlug(firm.name)
        const evidence = UK_ACCESS_EVIDENCE_BY_SLUG.get(slug)
        if (!evidence) return []
        const products = ukProductsForEvidence(evidence)
        if (!products.length) return []
        const shownProducts = products.slice(0, 2).map(product => product.productName)
        const moreCount = products.length - shownProducts.length

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${products.length} current ${products.length === 1 ? 'product' : 'products'} · entry from ${minimumPublishedEntry(products)}`,
          trailingMetricLabel: 'UK access',
          trailingMetricValue: 'Policy',
          note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''}. ${evidence.decisionNote}`,
          evidence: {
            label: evidence.evidenceLabel,
            url: evidence.sourceUrl,
            capturedAt: evidence.sourceCapturedAt,
          },
          lastmodProductSlugs: products.map(product => product.productSlug),
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm appears only when a first-party global or country policy captured within 30 days supports UK access and every explicitly mapped product record is also current. A blank aggregate restriction list, UK address, .uk domain, payout method, or payment rail does not qualify by itself. Editorial score sets the order; affiliate status, coupon size, headquarters, company registration, maximum split, and payout method add 0 points. FCA authorisation and permissions remain a separate check.',
    decisionGuide: [
      {
        title: 'Does UK access mean the firm is FCA-authorised?',
        body: 'No. A country policy shows what the firm currently says it offers. The FCA says to use its Firm Checker for authorisation and permissions and its Warning List for published concerns; a UK address, company number, or .uk domain is not a substitute.',
      },
      {
        title: 'What should match before checkout and KYC?',
        body: 'Recheck nationality, residence, legal name, address document, platform, account currency, payment card, and payout-country rules. A policy-supported firm can still reject an account whose identity, sanctions, provider, or product checks fail.',
      },
      {
        title: 'How should USD and EUR fees be compared in GBP?',
        body: 'Keep each list price in its published currency, then use the live card or payment-provider GBP rate and disclosed fees at checkout. A stored conversion would age independently of the challenge price and can reverse a close comparison.',
      },
      {
        title: 'Are there FCA-regulated prop firms in the UK?',
        body: 'Retail evaluation-style prop firms generally sell a challenge and pay a profit share from a simulated or firm-controlled account, which is a different business from an FCA-authorised broker, and this page does not rank on FCA status. A London history, UK company number, payment agent, or .uk domain (Alpha Capital, City Traders Imperium and FXIFY each have a UK link) is not FCA authorisation. Search the firm and its payment entity on the FCA Register and Warning List before paying.',
      },
      {
        title: 'Do UK traders pay tax on prop firm payouts?',
        body: 'Usually yes. Payouts are commonly treated as trading or miscellaneous income rather than capital gains, and the spread-betting exemption does not obviously apply to a profit share. GOV.UK says gross trading income over £1,000 in a tax year means registering for Self Assessment by 5 October after that tax year; you can claim either the £1,000 trading allowance or actual expenses such as challenge fees, not both. Keep every fee and payout record and confirm your position with a UK accountant.',
      },
      {
        title: 'Can I pay and get paid in GBP?',
        body: 'Most firms here price challenges in USD or EUR (FTMO and Bright Funded checkouts are in EUR), so a UK card is charged after conversion and may add a non-sterling fee. Payouts are typically sent by bank transfer, crypto or a payments provider; check the receiving currency and fees for your chosen route before your first payout request.',
      },
      {
        title: 'Which prop firms are based in the UK?',
        body: 'Alpha Capital uses a .uk domain and UK company presence, City Traders Imperium has a London history, and FXIFY lists a UK-registered payment agent or office address, but none of those links makes the funded account a UK-regulated product. Rank on rules, payout record, cost, and platform fit first; location is secondary.',
      },
      {
        title: 'Does the policy cover every product and platform forever?',
        body: `No. This snapshot maps ${CURRENT_UK_PRODUCT_COUNT} exact products while their records and the country sources remain current. Platforms, payment providers, KYC vendors, sanctions screening, and product availability can change before the 30-day source gate expires.`,
      },
    ],
    snapshotProductCount: CURRENT_UK_PRODUCT_COUNT,
    lastReviewed: '2026-10-14',
  },
  {
    slug: 'best-prop-firms-in-us',
    h1: `Best Prop Firms for US Traders (2026): ${CURRENT_US_FIRM_COUNT} Prop Trading Firms in the USA`,
    metaTitle: `Best Prop Firms for US Traders 2026: ${CURRENT_US_FIRM_COUNT} Firms Checked`,
    metaDescription:
      `Prop firms that accept US traders in 2026: ${CURRENT_US_FIRM_COUNT} firms with first-party evidence for ${CURRENT_US_PRODUCT_COUNT} US-resident products, mostly futures, plus CFTC and NFA checks.`,
    intro:
      `Looking for a prop firm that accepts US traders? Most forex and CFD prop firms exclude U.S. residents, so this list only includes the ${CURRENT_US_FIRM_COUNT} firms that publish current first-party evidence supporting ${CURRENT_US_PRODUCT_COUNT} explicitly mapped product paths for U.S. residents, mostly futures evaluations plus a small number of Match-Trader CFD paths. Access evidence is not legal advice, CFTC or NFA registration, or a guarantee that every state, platform, KYC route, payout method, and product configuration is available. Editorial score sets the order; partnership status contributes 0 points.`,
    sortDir: 'desc',
    rank: firms => firms
      .flatMap(firm => {
          const slug = firmSlug(firm.name)
          const evidence = US_ACCESS_EVIDENCE_BY_SLUG.get(slug)
          if (!evidence) return []
          const products = usProductsForEvidence(evidence)
          if (!products.length) return []
          const shownProducts = products.slice(0, 2).map(product => product.productName)
          const moreCount = products.length - shownProducts.length
          const assetLabel = evidence.assetClass === 'futures' ? 'Futures' : 'CFD'
          const platformLabel = evidence.assetClass === 'cfd'
            ? ' · Match-Trader only'
            : ''
          return [{
            firm,
            sortKey: firm.score,
            highlight: `${products.length} U.S.-mapped ${products.length === 1 ? 'product' : 'products'} · ${assetLabel}${platformLabel}`,
            note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''}. ${evidence.decisionNote}`,
            trailingMetricLabel: 'US access',
            trailingMetricValue: evidence.accessStatus === 'explicit' ? 'Direct' : 'Policy',
            evidence: {
              label: evidence.evidenceLabel,
              url: evidence.sourceUrl,
              capturedAt: evidence.sourceCapturedAt,
            },
            lastmodProductSlugs: products.map(product => product.productSlug),
          }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm appears only when a first-party U.S.-access policy was captured within 30 days and every explicitly mapped product record is also current. A missing restriction is not enough. Editorial score sets the order; affiliate status, coupon size, product count, asset class and platform add 0 points. Access evidence does not establish CFTC or NFA registration, legal status, payout approval, or availability in every state.',
    decisionGuide: [
      {
        title: 'Are forex prop firms legal in the US?',
        body: 'For live retail forex, the NFA says only certain regulated entities, including CFTC-registered FCMs and RFEDs that are NFA members, may act as the counterparty to off-exchange forex trades with U.S. retail customers. Evaluation-style prop firms sell simulated accounts instead, which is why most CFD-based firms exclude U.S. residents. This page lists firms that say they accept U.S. residents; it is not a legal opinion on any firm.',
      },
      {
        title: 'Can US traders trade forex with a prop firm?',
        body: 'Yes, but the options are narrower. FundedNext publishes a U.S. CFD route on Match-Trader for its mapped Stellar evaluations. Futures firms trade exchange-listed contracts, which can include currency futures where the product lists them. Check the product\'s tradable-instrument list before buying.',
      },
      {
        title: 'Why are most US-friendly prop firms futures firms?',
        body: 'Futures trade on regulated exchanges, so futures prop firms can offer U.S. residents simulated evaluations on exchange-listed contracts without the forex and CFD counterparty limits above. Each futures firm still sets its own data fees, activation fees, drawdown and payout rules, so compare the exact product.',
      },
      {
        title: 'Does access mean the firm is CFTC-registered?',
        body: 'No. The CFTC says certain derivatives businesses and individuals must register and recommends checking NFA BASIC. A firm’s U.S.-access page proves only what the firm currently says it offers.',
      },
      {
        title: 'Is the first funded stage simulated or live?',
        body: 'Read the named contract. Topstep describes its Express Funded Account as simulated before a possible Live Funded Account, while each firm publishes a different transition and payout structure.',
      },
      {
        title: 'Are futures and CFD paths interchangeable?',
        body: `No. This snapshot maps ${CURRENT_US_PRODUCT_COUNT} exact products: futures paths use exchange-listed contracts and product-specific market hours, while FundedNext’s 3 mapped U.S. CFD evaluations use Match-Trader. Stellar Instant is excluded because FundedNext's official U.S. pages conflict on its availability.`,
      },
      {
        title: 'What must match before a U.S. payout?',
        body: 'Check legal name, residency, KYC, tax form and bank-country rules. Apex publishes U.S.-residency-matched ACH requirements, while Topstep lists W-9 handling for U.S. persons.',
      },
    ],
    snapshotProductCount: CURRENT_US_PRODUCT_COUNT,
    lastReviewed: '2026-10-22',
  },
  {
    slug: 'best-prop-firms-in-india',
    h1: 'Best Prop Firms for Indian Traders (2026)',
    metaTitle: 'Best Prop Firms in India 2026: RBI Alert-List Checked',
    metaDescription:
      'Compare India-screened prop firms using dated country, KYC and payout evidence, product-level rules, and a bank-rate INR checkout estimator.',
    intro:
      'India is our primary market. This shortlist excludes firms named on the RBI Alert List, then requires dated first-party country evidence, product data captured inside 30 days, and at least 1 published international payout rail. Absence from the RBI list is not authorisation, and prices stay in USD or EUR until you enter your own payment-provider rate.',
    sortDir: 'desc',
    rank: firms => {
      const eligible = firms.filter(firm => {
        const slug = firmSlug(firm.name)
        const evidence = INDIA_EVIDENCE_BY_SLUG[slug]
        if (!evidence || !passesIndiaRegulatoryCountryGate(evidence)) return false
        const challenges = indiaEligibleChallenges(slug, evidence)
        if (!isProductSetFresh(challenges)) {
          return false
        }
        return (firm.payoutMethods || []).some(method =>
          /wire|crypto|skrill|rise/i.test(method))
      })
      return eligible
        .map(firm => {
          const slug = firmSlug(firm.name)
          const evidence = INDIA_EVIDENCE_BY_SLUG[slug]
          const challenges = indiaEligibleChallenges(slug, evidence)
          const methods = (firm.payoutMethods || [])
            .filter(method => /wire|crypto|skrill|rise/i.test(method))
          const evidenceScore = indiaEvidenceScore(evidence)
          return {
            firm,
            sortKey: evidenceScore * 100 + firm.score,
            highlight: `${minimumPublishedEntry(challenges)} entry · ${methods.slice(0, 2).join(' / ')}`,
            metricLabel: 'India evidence',
            metricValue: `${evidenceScore}/12`,
            note: `${evidence.country.summary} ${evidence.payout.summary}`,
            lastmodProductSlugs: challenges.map(challenge => challenge.productSlug),
          }
        })
        .sort((a, b) => b.sortKey - a.sortKey)
    },
    methodology:
      'Inclusion first excludes any firm named on the RBI Alert List, then requires a dated India availability check, fresh product captures for every listed challenge, and at least 1 published international payout rail. A firm missing from the non-exhaustive RBI list is not treated as authorised. Ranking weights India evidence completeness first; affiliate status and coupon size contribute 0 points.',
    decisionGuide: [
      {
        title: 'Can an Indian resident buy the challenge today?',
        body: 'Treat our inclusion as a screening result, not a guarantee. Before payment, open the firm’s current country and KYC terms, confirm India is accepted, and verify that the checkout method works with your own card or payment account.',
      },
      {
        title: 'What will the challenge really cost in INR?',
        body: 'Firm fees remain in their published USD or EUR denomination because a fixed INR conversion would go stale. Your final rupee cost can also include the card issuer’s FX spread, taxes, and any after-pass or activation fee shown in our minimum-cost figure.',
      },
      {
        title: 'Which payout route is practical from India?',
        body: 'We show only payout methods the firm publishes, such as bank wire, Rise, Skrill, or crypto. Availability, processing time, fees, and tax treatment can differ by trader, so verify the withdrawal route before purchasing—not after passing.',
      },
      {
        title: 'Does inclusion mean the firm is regulated or legally approved in India?',
        body: 'No. We exclude firms named on the RBI Alert List, but RBI says the list is non-exhaustive and absence is not authorisation. A simulated account can still raise contract, remittance, tax, or regulatory questions that require qualified local advice.',
      },
    ],
    lastReviewed: '2026-08-11',
  },
  {
    slug: 'cheapest-prop-firms',
    h1: 'Cheapest Prop Firms (2026): Prop Firm Fees Compared in USD & EUR',
    metaTitle: 'Cheapest Prop Firms 2026: Challenge Fees Compared',
    metaDescription:
      `Cheapest prop firms in 2026: a prop firm fees comparison of ${CURRENT_CHEAPEST_FIRM_COUNT} prop firms, with true cost to funded in USD and EUR, loss limits and dated sources.`,
    intro:
      'Looking for a cheap prop firm? The lowest checkout price is not always the lowest path to funded. We add any known after-pass or activation charge, keep recurring plans labelled, and rank USD and EUR products separately so a hidden exchange-rate assumption cannot reorder the list. Every included price comes from a product capture inside the 30-day freshness window.',
    sortDir: 'asc',
    rank: firms => {
      const byCurrency: Record<ChallengeCurrency, LandingFirm[]> = {
        USD: [],
        EUR: [],
      }
      for (const firm of firms) {
        const challenges = getChallengesByFirm(firmSlug(firm.name))
          .filter(challenge => isChallengeFresh(challenge))
        const allTiers = challenges.flatMap(challenge =>
          challenge.accountSizes.flatMap(tier => {
            const cost = publishedMinimumCost(challenge, tier)
            return cost ? [{ challenge, tier, ...cost }] : []
          }),
        )

        for (const currency of ['USD', 'EUR'] as const) {
          const cheapest = allTiers
            .filter(tier => tier.currency === currency)
            .sort((a, b) => a.amount - b.amount)[0]
          if (!cheapest) continue

          const { challenge, tier, amount } = cheapest
          const split = challenge.profitSplitPct == null
            ? 'starting split unpublished'
            : `${challenge.profitSplitPct}% published starting split`
          const lossRoom = tier.maxLossUsd != null
            ? `${formatUsd(tier.maxLossUsd)} published maximum-loss amount`
            : challenge.maxLossPct == null
              ? 'maximum loss unpublished'
              : `${challenge.maxLossPct}% published maximum loss`
          const groupLabel = currency === 'USD'
            ? 'USD-denominated products'
            : 'EUR-denominated products'

          byCurrency[currency].push({
            firm,
            sortKey: amount,
            groupLabel,
            groupDescription: currency === 'USD'
              ? 'Ranked by the minimum known U.S.-dollar cash outlay to reach the funded stage.'
              : 'Ranked independently in euros; no USD conversion or cross-currency rank is implied.',
            highlight: `${challenge.productName} · ${formatAccountSize(tier.sizeUsd)} account`,
            metricLabel: 'Minimum cost',
            metricValue: formatPublishedMoney(amount, currency),
            note: `${pricingModelLabel(challenge.pricingModel)}; ${split}; ${lossRoom}; ${drawdownLabel(challenge.drawdownType)} drawdown.`,
            evidence: {
              label: `${challenge.productName} price source`,
              url: challenge.sourceUrl,
              capturedAt: challenge.sourceCapturedAt,
            },
            lastmodProductSlugs: [challenge.productSlug],
          })
        }
      }
      const byMinimumCost = (a: LandingFirm, b: LandingFirm) =>
        a.sortKey - b.sortKey || a.firm.name.localeCompare(b.firm.name)
      return [
        ...byCurrency.USD.sort(byMinimumCost),
        ...byCurrency.EUR.sort(byMinimumCost),
      ]
    },
    methodology:
      'A firm qualifies when at least 1 product price was captured from its own site within 30 days. Each currency group ranks the minimum known cash outlay to reach funded: checkout plus any same-currency after-pass or activation fee. A monthly subscription assumes a first-cycle pass, so it is a floor rather than an average. USD and EUR are never converted or ranked against each other; affiliate status, coupons, account headline, and editorial score add 0 points.',
    decisionGuide: [
      {
        title: 'Which fees should a prop firm fees comparison include?',
        body: 'Start with the challenge or account price, then add any activation or after-pass fee, monthly subscription cycles, resets, platform or market-data fees, and payout costs. Payout costs vary: OFP Funding, for example, says payouts over $500 go through Rise with a fixed $50 fee. This table adds only charges the product record publishes in the same currency.',
      },
      {
        title: 'What is the cheapest crypto prop firm?',
        body: 'This table ranks every priced product, not only crypto ones, so a cheap row may not let you trade BTC or ETH. Use the crypto prop firm ranking, which shows entry prices only for products with current first-party crypto-market evidence, then compare crypto leverage and commission on that exact product.',
      },
      {
        title: 'What is the cheapest instant funding prop firm?',
        body: 'Instant accounts skip the evaluation but usually cost more per dollar of account size. The instant funding ranking shows the minimum known cost of every phase-0 product, which is the fair comparison for instant accounts.',
      },
      {
        title: 'Are USD and EUR prices directly ranked together?',
        body: 'No. The 2 currency groups are independent because a live exchange rate, card spread, and tax can change the converted checkout amount. Compare prices in the currency your payment provider will actually settle.',
      },
      {
        title: 'Does the number include activation or pay-later charges?',
        body: 'Yes when the structured product record publishes a same-currency after-pass or activation amount. A missing fee remains missing rather than being assumed to be zero, and mixed-currency charges fail closed.',
      },
      {
        title: 'What does a monthly minimum mean?',
        body: 'It assumes a first-cycle pass. Every additional billing cycle, reset, data fee, tax, or optional add-on raises the trader’s actual cash outlay, so the displayed number is a floor rather than an average.',
      },
      {
        title: 'Why can the smallest fee still be expensive?',
        body: 'A low-notional tier can pair a small fee with less dollar loss room, a lower starting split, or stricter payout gates. Compare fee recovery against the exact maximum-loss amount instead of the account headline.',
      },
    ],
    lastReviewed: '2026-10-14',
  },
  {
    slug: 'best-instant-funding-prop-firms',
    h1: `Best Instant Funding Prop Firms (2026): ${CURRENT_INSTANT_FIRM_COUNT} Firms With No Evaluation`,
    metaTitle: `Instant Funding Prop Firms 2026: ${CURRENT_INSTANT_FIRM_COUNT} With No Challenge`,
    metaDescription:
      `Instant funding prop firms with no challenge: ${CURRENT_INSTANT_FIRM_COUNT} firms and ${CURRENT_INSTANT_PRODUCT_COUNT} no-evaluation accounts compared on total cost, loss limit, starting split and payout gates.`,
    intro:
      `Want a prop firm with instant funding, so you can skip the challenge? These ${CURRENT_INSTANT_FIRM_COUNT} firms have ${CURRENT_INSTANT_PRODUCT_COUNT} products captured within 30 days whose structured phase count is 0. That means the product skips an evaluation target; it does not prove that the account uses live firm capital. Every card names each qualifying path and links its distinct first-party sources before comparing the loss line, total known cost, starting split, and payout gate.`,
    sortDir: 'desc',
    snapshotProductCount: CURRENT_INSTANT_PRODUCT_COUNT,
    rank: firms => firms
      .flatMap(firm => {
        const products = freshInstantProducts(firm)
        if (!products.length) return []

        const priced = products.flatMap(product => product.accountSizes.flatMap(tier => {
          const minimumCostUsd = minimumCostToFundedUsd(product, tier)
          return minimumCostUsd == null ? [] : [{ product, tier, minimumCostUsd }]
        })).sort((a, b) => a.minimumCostUsd - b.minimumCostUsd)
        const cheapest = priced[0]
        const drawdowns = [...new Set(products.map(product =>
          drawdownLabel(product.drawdownType),
        ))].sort()
        const splits = [...new Set(products.flatMap(product =>
          product.profitSplitPct == null ? [] : [product.profitSplitPct],
        ))].sort((a, b) => a - b)
        const payoutGates = [...new Set(products.map(product =>
          product.payoutFirstDays == null
            ? 'first-payout gate unverified'
            : product.payoutFirstDays === 0
              ? 'on-demand eligibility'
              : `${product.payoutFirstDays}-day first-payout gate`,
        ))].sort()
        const productNames = products.map(product => product.productName)

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${products.length} current phase-0 ${products.length === 1 ? 'product' : 'products'} · ${cheapest ? `minimum known cost ${formatUsd(cheapest.minimumCostUsd)}` : 'price unverified'}`,
          trailingMetricLabel: 'Products',
          trailingMetricValue: products.length.toString(),
          note: `${joinNatural(productNames)}. Captured drawdown: ${joinNatural(drawdowns)}; published ${splits.length === 1 ? 'split' : 'splits'}: ${splits.length ? `${splits.join('–')}%` : 'unverified'}; ${joinNatural(payoutGates)}.`,
          evidenceLinks: evidenceLinksForProducts(products),
          lastmodProductSlugs: products.map(product => product.productSlug),
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A firm qualifies only when at least 1 structured product captured within 30 days sets phases to 0. Every qualifying product contributes to the ${CURRENT_INSTANT_FIRM_COUNT}-firm, ${CURRENT_INSTANT_PRODUCT_COUNT}-product snapshot; missing prices or starting splits stay visibly unverified. The order uses our editorial score, while affiliate status, product count, price, profit split, drawdown type, and payout speed add 0 points. “Instant” describes the missing evaluation phase, not verified live-capital execution.`,
    decisionGuide: [
      {
        title: 'What is an instant funding prop firm?',
        body: 'An instant funding prop firm sells an account with no evaluation phase: you pay once and trade toward a payout straight away instead of first hitting a profit target. The trade-off is usually a higher price for the same account size and tighter drawdown or payout gates.',
      },
      {
        title: 'What is the cheapest instant funding prop firm?',
        body: 'Sort by the minimum known cost on each card, which includes any published activation charge, then check the loss room you get for that price. For entry prices across every challenge type, see the cheapest prop firms comparison.',
      },
      {
        title: 'Is instant funding better than a 1-step challenge?',
        body: 'Only if paying more to skip the evaluation suits you. A 1-step challenge usually costs less for the same account size but needs a profit target first; an instant account starts earning toward a payout immediately but often has stricter drawdown, consistency or payout rules. Compare both on total cost and maximum loss.',
      },
      {
        title: 'Does phase 0 mean the account trades live capital?',
        body: 'No. Phase 0 proves only that the structured product has no evaluation target. Treat funded, simulated-funded, and live-capital execution as separate account-stage claims, then verify the agreement for the selected product.',
      },
      {
        title: 'How does the maximum-loss line move?',
        body: 'Static, balance-based, real-time trailing, and end-of-day trailing rules create different risk. Model the initial floor, what raises it, whether it locks, and whether a payout resets it before comparing headline account sizes.',
      },
      {
        title: 'How much loss room repays the one-time fee?',
        body: 'Use minimum known cost and starting profit split to calculate gross break-even, then divide by the product’s verified maximum loss. A low checkout price can still consume a large share of the available loss room.',
      },
      {
        title: 'What unlocks the first payout?',
        body: 'A phase-0 purchase can still require profitable days, a consistency score, a safety cushion, minimum growth, or a waiting period. Verify every payout gate and whether the purchase fee is refundable before checkout.',
      },
    ],
    lastReviewed: '2026-10-14',
  },
  {
    slug: 'best-futures-prop-firms',
    h1: `Best Futures Prop Firms (2026): ${CURRENT_FUTURES_FIRM_COUNT} Futures Prop Firms Ranked`,
    metaTitle: `Best Futures Prop Firms 2026: ${CURRENT_FUTURES_FIRM_COUNT} Ranked and Compared`,
    metaDescription:
      `Best futures prop firms 2026: ${CURRENT_FUTURES_FIRM_COUNT} futures prop firms ranked across ${CURRENT_FUTURES_PRODUCT_COUNT} products on fees, billing, drawdown, payout rules and platforms.`,
    intro:
      `Looking for the best futures prop firm? These ${CURRENT_FUTURES_FIRM_COUNT} firms have ${CURRENT_FUTURES_PRODUCT_COUNT} current products whose structured asset class is futures. Every card names each path and links its distinct first-party sources. Some evaluations rebill monthly; others use a one-time fee, and drawdown can trail intraday or update at the end of the session. CFTC oversight of a designated futures exchange does not automatically make the evaluation provider, software platform, or data connection CFTC-registered.`,
    sortDir: 'desc',
    snapshotProductCount: CURRENT_FUTURES_PRODUCT_COUNT,
    rank: firms => firms
      .flatMap(firm => {
        const products = freshFuturesProducts(firm)
        if (!products.length) return []

        const billing = [...new Set(products.map(product =>
          pricingModelLabel(product.pricingModel),
        ))].sort()
        const drawdowns = [...new Set(products.map(product =>
          drawdownLabel(product.drawdownType),
        ))].sort()
        const splits = [...new Set(products.flatMap(product =>
          product.profitSplitPct == null ? [] : [product.profitSplitPct],
        ))].sort((a, b) => a - b)
        const productNames = products.map(product => product.productName)

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${products.length} current ${products.length === 1 ? 'product' : 'products'} · ${joinNatural(billing)}`,
          trailingMetricLabel: 'Products',
          trailingMetricValue: products.length.toString(),
          note: `${joinNatural(productNames)}. Captured drawdown: ${joinNatural(drawdowns)}; published starting ${splits.length === 1 ? 'split' : 'splits'}: ${splits.length ? `${splits.join('–')}%` : 'unverified'}.`,
          evidenceLinks: evidenceLinksForProducts(products),
          lastmodProductSlugs: products.map(product => product.productSlug),
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A firm qualifies only when at least 1 structured product captured within 30 days explicitly sets assetClass to futures. A firm-level Futures label without a fresh product does not qualify. The order across ${CURRENT_FUTURES_FIRM_COUNT} firms uses our editorial score; affiliate status, coupon size, the ${CURRENT_FUTURES_PRODUCT_COUNT}-product count, billing model, platform, and drawdown type add 0 points. Each card names every current product and links each distinct first-party source.`,
    decisionGuide: [
      {
        title: 'What is a futures prop firm?',
        body: 'A futures prop firm sells an evaluation on exchange-listed futures contracts, such as equity-index, energy, metals or currency futures, usually on a simulated account, and pays a share of profits once you pass and meet its payout rules. Pricing is often a monthly subscription plus an activation fee rather than a one-time CFD challenge fee.',
      },
      {
        title: 'How should I compare futures prop firms?',
        body: 'Compare the total cost to funded (every monthly rebill plus activation), whether drawdown trails intraday or at end of day, payout gates such as winning days or consistency, and which platforms and data feeds the product supports. Headline account size matters less than the dollar loss room you get for that cost.',
      },
      {
        title: 'Is the evaluation fee one-time or recurring?',
        body: 'Check whether the fee is one-time or monthly before comparing headline prices. A monthly subscription can rebill until the trader passes or cancels, while a one-time evaluation can still add a funded-account activation payment.',
      },
      {
        title: 'Does drawdown trail intraday or at session end?',
        body: 'Intraday trailing can tighten from an unrealised equity peak. EOD-trailing normally recalculates from a closing balance, but the exact lock, reset, and funded-stage rule still varies by product.',
      },
      {
        title: 'Is the funded stage simulated or live?',
        body: 'Do not infer live capital from a funded label. Read the named agreement for the evaluation, simulated-funded, and any later live-account stage, including the conditions for moving between them.',
      },
      {
        title: 'Which entity is actually regulated?',
        body: 'The CFTC oversees designated contract markets and requires certain derivatives intermediaries to register. Exchange oversight does not by itself establish the registration status of an evaluation provider or software platform; check NFA BASIC separately.',
      },
    ],
    lastReviewed: '2026-10-14',
  },
  {
    slug: 'best-crypto-prop-firms',
    h1: `Best Crypto Prop Firms (2026): ${CURRENT_CRYPTO_FIRM_COUNT} Crypto Prop Trading Firms Compared`,
    metaTitle: `Best Crypto Prop Firms 2026: ${CURRENT_CRYPTO_FIRM_COUNT} Firms Compared`,
    metaDescription:
      `Best crypto prop firms for 2026: ${CURRENT_CRYPTO_FIRM_COUNT} crypto prop trading firms compared on BTC/ETH access, leverage, commission, entry price and payout rules.`,
    intro:
      `Looking for the best crypto prop firm? Start with one question: can you actually trade BTC and ETH on the product you buy? Paying or withdrawing in crypto does not count. These ${CURRENT_CRYPTO_FIRM_COUNT} firms have a current first-party source that explicitly names crypto as a tradable market plus ${CURRENT_CRYPTO_PRODUCT_COUNT} exact product records inside the 30-day freshness window. Crypto-native products rank before multi-asset CFD products, then editorial score breaks ties. ${CRYPTO_MARKET_WATCH.length ? `The ${CRYPTO_MARKET_WATCH.length} excluded firms remain visible below as evidence gaps rather than borrowing stale or forex-only prices and rules.` : 'No checked firm is waiting on missing crypto evidence right now; a firm whose sources lapse drops out rather than borrowing stale or forex-only prices and rules.'}`,
    sortDir: 'desc',
    snapshotProductCount: CURRENT_CRYPTO_PRODUCT_COUNT,
    rank: firms => firms
      .flatMap(firm => {
        const slug = firmSlug(firm.name)
        const evidence = CRYPTO_MARKET_EVIDENCE_BY_SLUG.get(slug)
        if (!evidence) return []
        const products = cryptoProductsForEvidence(evidence)
        if (!products.length) return []

        const marketLabel = evidence.marketModel === 'crypto-native'
          ? 'Crypto-native'
          : 'Multi-asset CFD'
        const splits = [...new Set(products.flatMap(product =>
          product.profitSplitPct == null ? [] : [product.profitSplitPct],
        ))].sort((a, b) => a - b)
        const drawdowns = [...new Set(products.map(product =>
          drawdownLabel(product.drawdownType),
        ))].sort()
        const shownProducts = products.slice(0, 3).map(product => product.productName)
        const moreCount = products.length - shownProducts.length
        const splitText = splits.length === 0
          ? 'starting split unpublished'
          : splits.length === 1
            ? `${splits[0]}% starting split`
            : `${splits[0]}–${splits.at(-1)}% starting splits`

        return [{
          firm,
          sortKey: (evidence.marketModel === 'crypto-native' ? 100 : 0) + firm.score,
          highlight: `${products.length} crypto-mapped ${products.length === 1 ? 'product' : 'products'} · ${marketLabel}`,
          metricLabel: 'Products',
          metricValue: products.length.toString(),
          trailingMetricLabel: 'Market model',
          trailingMetricValue: marketLabel,
          note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''}. ${splitText}; ${joinNatural(drawdowns)} drawdown. ${evidence.scopeNote}`,
          evidence: {
            label: `${marketLabel} evidence`,
            url: evidence.sourceUrl,
            capturedAt: evidence.sourceCapturedAt,
          },
          lastmodProductSlugs: products.map(product => product.productSlug),
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A ranked firm needs a first-party source that explicitly names crypto as a tradable market and fresh structured records for every mapped product. Paying or receiving a payout in crypto adds 0 eligibility. Dedicated crypto products rank before multi-asset CFD products, then editorial score sets the order within each model. Affiliate status, coupon size, advertised pair count, maximum split, and payment method add 0 points. The ${CURRENT_CRYPTO_PRODUCT_COUNT} mapped products are an evidence boundary, not a claim that every product a firm sells supports crypto.`,
    decisionGuide: [
      {
        title: 'Can I trade crypto, or only pay and withdraw with it?',
        body: 'A crypto checkout or payout rail does not prove that BTC, ETH, or another digital-asset market is tradable. Require an instrument, contract-size, commission, leverage, or crypto-account source before treating the product as eligible.',
      },
      {
        title: 'Is it a dedicated crypto account or a multi-asset CFD product?',
        body: 'A crypto-native account can publish a broader symbol set and crypto-specific platform rules. A multi-asset CFD product may expose fewer symbols, different hours, or contract sizes that vary by platform and region.',
      },
      {
        title: 'Does weekend or 24/7 access actually apply?',
        body: 'The underlying crypto market may trade continuously while a prop platform still applies maintenance windows, product-level weekend restrictions, spread changes, or a server-time loss reset. Verify all 4 before carrying a position.',
      },
      {
        title: 'What do leverage, commission, consistency, and payout rules do?',
        body: 'A large symbol list does not offset low leverage, percentage commission, a moving loss floor, or a consistency gate. Compare those rules on the exact product rather than importing a firm-wide headline.',
      },
      {
        title: 'What is a crypto prop firm?',
        body: 'A crypto prop firm sells an evaluation, or instant funding, in which you trade crypto instruments such as BTCUSD or ETHUSD on a simulated account and are paid a share of the profits once you meet its rules. Some firms offer dedicated crypto accounts; most listed here are multi-asset CFD firms whose products include a few crypto pairs alongside forex, indices and metals.',
      },
      {
        title: 'Which crypto pairs can I trade?',
        body: 'It depends on the firm and the product, and the lists are often short. On the dates captured here, all five FundingPips product pages list BTCUSD and ETHUSD, and Maven listed BTCEUR, BTCUSD, ETHBTC and ETHUSD. If you need altcoins, confirm the symbol in the platform specification before you pay.',
      },
      {
        title: 'What is the cheapest crypto prop firm?',
        body: 'Compare the entry price shown on each card above for the exact crypto-mapped product, not a firm-wide starting price for a forex-only plan. A low entry fee can come with 1:1 or 1:2 crypto leverage, percentage commission or a one-lot-per-click limit, so judge the cost together with the rules. For entry prices across every product, see the cheapest prop firms ranking.',
      },
      {
        title: 'Are there crypto futures prop firms?',
        body: 'The firms currently ranked here offer crypto through multi-asset CFD products on simulated accounts, not exchange-listed crypto futures. Futures prop firms trade CME-style contracts with their own product rules; see the futures prop firm ranking and check whether a specific crypto contract is enabled before buying.',
      },
    ],
    evidenceGaps: CRYPTO_MARKET_WATCH.map(item => ({
      firmName: item.firmName,
      statusLabel: item.status === 'product-capture-needed'
        ? 'Product capture needed'
        : 'Market and product refresh needed',
      summary: item.evidence,
      nextStep: item.nextStep,
      sourceUrl: item.sourceUrl,
      sourceCapturedAt: item.sourceCapturedAt,
    })),
    lastReviewed: '2026-10-14',
  },
  {
    slug: 'best-swing-trading-prop-firms',
    h1: `Best Prop Firms for Swing Trading (2026): ${CURRENT_SWING_FIRM_COUNT} Allow Overnight and Weekend Holds`,
    metaTitle: `Best Prop Firms for Swing Trading 2026: ${CURRENT_SWING_FIRM_COUNT} Compared`,
    metaDescription:
      `Best prop firms for swing traders: ${CURRENT_SWING_FIRM_COUNT} swing-trading prop firms across ${CURRENT_SWING_PRODUCT_COUNT} exact products with verified overnight and weekend holding.`,
    intro:
      `Need a prop firm that allows swing trading? These ${CURRENT_SWING_FIRM_COUNT} firms have ${CURRENT_SWING_PRODUCT_COUNT} current products whose first-party captures explicitly allow both weekday overnight and weekend holding on the same path. That does not mean every product qualifies: each card names every matching product, its drawdown types, capture dates, and direct rule sources. Static drawdown is not assumed, and permission to hold does not remove gap, swap, or loss-limit risk.`,
    sortDir: 'desc',
    snapshotProductCount: CURRENT_SWING_PRODUCT_COUNT,
    rank: firms => firms
      .flatMap(firm => {
        const freshProducts = getChallengesByFirm(firmSlug(firm.name))
          .filter(challenge => isChallengeFresh(challenge))
        const qualifying = swingCompatibleProducts(firm)
        if (!qualifying.length) return []

        const drawdowns = [...new Set(qualifying.map(challenge =>
          drawdownLabel(challenge.drawdownType),
        ))].sort()
        const productNames = qualifying.map(challenge => challenge.productName)
        return [{
          firm,
          sortKey: firm.score,
          highlight: `${qualifying.length} swing-qualified ${qualifying.length === 1 ? 'product' : 'products'} · ${joinNatural(drawdowns)}`,
          trailingMetricLabel: 'Product fit',
          trailingMetricValue: `${qualifying.length}/${freshProducts.length}`,
          note: `${joinNatural(productNames)} meet both holding rules. Other products from the same firm may differ.`,
          evidenceLinks: evidenceLinksForProducts(qualifying),
          lastmodProductSlugs: qualifying.map(challenge => challenge.productSlug),
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A firm qualifies only when at least 1 product captured within 30 days sets both overnight and weekend holding to allowed on that same product. Restricted, blocked, missing, and stale fields do not qualify. The order across ${CURRENT_SWING_FIRM_COUNT} firms uses our editorial score; affiliate status, coupon size, the ${CURRENT_SWING_PRODUCT_COUNT}-product coverage count, and drawdown type add 0 points. Each card reports exact product coverage because another product from the same firm can use different holding rules.`,
    decisionGuide: [
      {
        title: 'What makes a prop firm good for swing trading?',
        body: 'A swing trader needs to hold positions overnight and over the weekend on the same product, a drawdown rule that does not punish open-profit swings, and costs such as swaps that the profit split can absorb. Many firms allow overnight holds but close or restrict weekend positions, so check both permissions on the exact product.',
      },
      {
        title: 'Which prop firms allow swing trading?',
        body: 'Only the products listed above currently have first-party captures that explicitly allow both weekday overnight and weekend holding on the same path. Some firms offer weekend holding only through a separate swing account or a paid add-on, so match the permission to the product you actually buy.',
      },
      {
        title: 'Do both permissions belong to the same product?',
        body: 'They must. A firm-wide overnight flag and a different product’s weekend permission do not prove that either account supports a multi-day trade through Friday’s close.',
      },
      {
        title: 'Is weekday overnight the same as weekend holding?',
        body: 'No. Some products allow positions across a weekday session reset but require every position to close before the weekend. Verify both named rules for the exact product and stage.',
      },
      {
        title: 'What happens to the loss floor after open profit?',
        body: 'Static, trailing, EOD-trailing, and balance-based drawdown react differently to an unrealised high and later pullback. Holding permission does not stop the loss rule from closing the account.',
      },
      {
        title: 'Which carrying costs remain?',
        body: 'Check swap or rollover charges, triple-swap day, weekend gaps, instrument hours, news restrictions, and whether the funded stage changes any rule shown during evaluation.',
      },
    ],
    lastReviewed: '2026-10-14',
  },
]

export function getLandingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find(l => l.slug === slug)
}

function withCurrentAccessCopy(
  landing: Landing,
  snapshot: AccessLandingSnapshot,
): Landing {
  if (landing.slug === 'best-prop-firms-in-uk') {
    return {
      ...landing,
      h1: `Best Prop Firms UK (2026): ${snapshot.firmCount} Prop Trading Firms That Accept UK Traders`,
      metaTitle: `Best Prop Firms UK 2026: ${snapshot.firmCount} That Accept UK Traders`,
      metaDescription:
        `Prop firms that accept UK traders in 2026: ${snapshot.firmCount} firms whose own policy does not exclude UK residents, compared on fees, FCA status, UK tax and payouts.`,
      intro:
        `Looking for a prop firm in the UK? These ${snapshot.firmCount} prop trading firms currently publish a first-party country policy that does not exclude UK residents or nationals, across ${snapshot.productCount} current product paths. None of them is an FCA-authorised broker for funded accounts: most UK-facing prop firms sell evaluations and pay a share of simulated-account profits, so check FCA status, pricing currency, and the payout route yourself before paying. The table ranks by editorial score; affiliate status adds 0 points. Policy access is not a completed UK checkout, KYC approval, payout test, or legal opinion.`,
      decisionGuide: landing.decisionGuide?.map(item => item.title === 'Does the policy cover every product and platform forever?'
        ? {
            ...item,
            body: `No. This snapshot maps ${snapshot.productCount} exact products while their records and the country sources remain current. Platforms, payment providers, KYC vendors, sanctions screening, and product availability can change before the 30-day source gate expires.`,
          }
        : item),
      snapshotProductCount: snapshot.productCount,
    }
  }

  return {
    ...landing,
    h1: `Best Prop Firms for US Traders (2026): ${snapshot.firmCount} Prop Trading Firms in the USA`,
    metaTitle: `Best Prop Firms for US Traders 2026: ${snapshot.firmCount} Firms Checked`,
    metaDescription:
      `Prop firms that accept US traders in 2026: ${snapshot.firmCount} firms with first-party evidence for ${snapshot.productCount} US-resident products, mostly futures, plus CFTC and NFA checks.`,
    intro:
      `Looking for a prop firm that accepts US traders? Most forex and CFD prop firms exclude U.S. residents, so this list only includes the ${snapshot.firmCount} firms that publish current first-party evidence supporting ${snapshot.productCount} explicitly mapped product paths for U.S. residents, mostly futures evaluations plus a small number of Match-Trader CFD paths. Access evidence is not legal advice, CFTC or NFA registration, or a guarantee that every state, platform, KYC route, payout method, and product configuration is available. Editorial score sets the order; partnership status contributes 0 points.`,
    decisionGuide: landing.decisionGuide?.map(item => item.title === 'Are futures and CFD paths interchangeable?'
      ? {
          ...item,
          body: `No. This snapshot maps ${snapshot.productCount} exact products: futures paths use exchange-listed contracts and product-specific market hours, while FundedNext’s 3 mapped U.S. CFD evaluations use Match-Trader. Stellar Instant is excluded because FundedNext's official U.S. pages conflict on its availability.`,
        }
      : item),
    snapshotProductCount: snapshot.productCount,
  }
}

/**
 * Resolve a landing's current copy for render-time use. Most landings are
 * static editorial snapshots; UK and U.S. access pages have a 30-day source
 * gate and therefore need their counts, copy, and metadata refreshed together.
 */
export function getLandingForRender(slug: string): Landing | undefined {
  const landing = getLandingBySlug(slug)
  if (!landing) return undefined
  const snapshot = getAccessLandingSnapshot(slug)
  return snapshot ? withCurrentAccessCopy(landing, snapshot) : landing
}

/**
 * Return a source-based sitemap date for access landings. Do not use the
 * newest firm-wide capture: unrelated firm updates must not make an expired
 * country-policy page look freshly reviewed.
 */
export function getLandingSourceLastModified(slug: string): Date | undefined {
  const landing = getLandingBySlug(slug)
  const snapshot = getAccessLandingSnapshot(slug)
  if (!landing || !snapshot) return undefined
  const dates = [landing.lastReviewed, snapshot.latestSourceDate].filter(Boolean).sort()
  const latest = dates.at(-1)
  return latest ? new Date(`${latest}T00:00:00Z`) : undefined
}

export function buildLandingPayload(landing: Landing) {
  const firms = FROZEN_COUNT_LANDINGS.has(landing.slug)
    ? getAllFirms().filter(firm => !isPostFreezeFirm(firmSlug(firm.name)))
    : getAllFirms()
  const ranked = landing.rank(firms)
  const count = new Set(ranked.map(item => item.firm.name)).size
  return { ranked, count, allFirms: firms }
}
