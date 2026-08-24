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
import rawCryptoMarketEvidence from '@/content/data/crypto-market-evidence.json'
import rawUkAccessEvidence from '@/content/data/uk-access-evidence.json'

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

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

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

interface CryptoMarketEvidence {
  firmSlug: string
  firmName: string
  marketModel: 'crypto-native' | 'multi-asset-cfd'
  productSlugs: string[]
  sourceUrl: string
  sourceCapturedAt: string
  evidence: string
  evidenceRu?: string
  scopeNote: string
  scopeNoteRu?: string
}

interface CryptoMarketWatch {
  firmSlug: string
  firmName: string
  status: 'product-capture-needed'
  sourceUrl: string
  sourceCapturedAt: string
  evidence: string
  nextStep: string
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

const CRYPTO_MARKET_EVIDENCE = rawCryptoMarketEvidence.ranked as CryptoMarketEvidence[]
const CRYPTO_MARKET_EVIDENCE_BY_SLUG = new Map(
  CRYPTO_MARKET_EVIDENCE.map(evidence => [evidence.firmSlug, evidence]),
)
const CRYPTO_MARKET_WATCH = rawCryptoMarketEvidence.watch as CryptoMarketWatch[]

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
  const products = freshProductsForFirm(firm)
  return products.length ? [{ firm, products }] : []
})
const CURRENT_OVERALL_FIRM_COUNT = CURRENT_OVERALL_SNAPSHOT.length
const CURRENT_OVERALL_PRODUCT_COUNT = CURRENT_OVERALL_SNAPSHOT.reduce(
  (total, entry) => total + entry.products.length,
  0,
)

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
    h1: `Best Prop Firms for UK Traders (2026): ${CURRENT_UK_FIRM_COUNT} Policy-Checked`,
    metaTitle: `Best Prop Firms for UK Traders (2026): ${CURRENT_UK_FIRM_COUNT} Checked`,
    metaDescription:
      `Compare ${CURRENT_UK_FIRM_COUNT} prop firms with current first-party UK-access policies across ${CURRENT_UK_PRODUCT_COUNT} product paths, plus FCA checks, fees, rules, reviews, and dated sources.`,
    intro:
      `These ${CURRENT_UK_FIRM_COUNT} firms publish a current global or country-based service policy that does not restrict United Kingdom residents or nationals, and all ${CURRENT_UK_PRODUCT_COUNT} mapped product rows remain inside the 30-day freshness window. That is policy-supported access, not a completed UK checkout, KYC approval, payout test, legal opinion, or FCA-authorisation finding. Editorial score sets the order; partnership status contributes 0 points.`,
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
        title: 'Does the policy cover every product and platform forever?',
        body: `No. This snapshot maps ${CURRENT_UK_PRODUCT_COUNT} exact products while their records and the country sources remain current. Platforms, payment providers, KYC vendors, sanctions screening, and product availability can change before the 30-day source gate expires.`,
      },
    ],
    lastReviewed: '2026-08-17',
  },
  {
    slug: 'best-prop-firms-in-us',
    h1: `Best Prop Firms for U.S. Traders (2026): ${CURRENT_US_FIRM_COUNT} Policy-Checked`,
    metaTitle: `Best Prop Firms for US Traders (2026): ${CURRENT_US_FIRM_COUNT} Checked`,
    metaDescription:
      `Compare ${CURRENT_US_FIRM_COUNT} policy-checked prop firms for U.S. traders across ${CURRENT_US_PRODUCT_COUNT} exact futures and CFD products, with platform limits, CFTC/NFA checks, reviews, and sources.`,
    intro:
      `These ${CURRENT_US_FIRM_COUNT} firms publish current first-party evidence supporting ${CURRENT_US_PRODUCT_COUNT} explicitly mapped product paths for U.S. residents. Access evidence is not legal advice, CFTC or NFA registration, or a guarantee that every state, platform, KYC route, payout method, and product configuration is available. Editorial score sets the order; partnership status contributes 0 points.`,
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
          }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm appears only when a first-party U.S.-access policy was captured within 30 days and every explicitly mapped product record is also current. A missing restriction is not enough. Editorial score sets the order; affiliate status, coupon size, product count, asset class and platform add 0 points. Access evidence does not establish CFTC or NFA registration, legal status, payout approval, or availability in every state.',
    decisionGuide: [
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
        body: `No. This snapshot maps ${CURRENT_US_PRODUCT_COUNT} exact products: futures paths use exchange-listed contracts and product-specific market hours, while FundedNext’s 4 U.S. CFD paths use Match-Trader and cannot be treated as MT4, MT5, or CME futures accounts.`,
      },
      {
        title: 'What must match before a U.S. payout?',
        body: 'Check legal name, residency, KYC, tax form and bank-country rules. Apex publishes U.S.-residency-matched ACH requirements, while Topstep lists W-9 handling for U.S. persons.',
      },
    ],
    lastReviewed: '2026-08-17',
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
        if (!challenges.length || !challenges.every(challenge => isChallengeFresh(challenge))) {
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
    h1: 'Cheapest Prop Firm Challenges (2026): USD & EUR',
    metaTitle: 'Cheapest Prop Firm Challenges (2026) — By Currency',
    metaDescription:
      'Compare the lowest verified path to funded for 19 prop firms, ranked separately in USD and EUR with billing model, loss limits, reviews, and dated sources.',
    intro:
      'The lowest checkout price is not always the lowest path to funded. We add any known after-pass or activation charge, keep recurring plans labelled, and rank USD and EUR products separately so a hidden exchange-rate assumption cannot reorder the list. Every included price comes from a product capture inside the 30-day freshness window.',
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
    lastReviewed: '2026-08-17',
  },
  {
    slug: 'best-instant-funding-prop-firms',
    h1: `Best Instant Funding Prop Firms (2026): ${CURRENT_INSTANT_FIRM_COUNT} Verified`,
    metaTitle: `Best Instant Funding Prop Firms (2026): ${CURRENT_INSTANT_FIRM_COUNT} Verified`,
    metaDescription:
      `Compare ${CURRENT_INSTANT_FIRM_COUNT} instant-funding prop firms across ${CURRENT_INSTANT_PRODUCT_COUNT} phase-0 products with entry costs, drawdown, starting splits, payout gates, reviews, and dated sources.`,
    intro:
      `These ${CURRENT_INSTANT_FIRM_COUNT} firms have ${CURRENT_INSTANT_PRODUCT_COUNT} products captured within 30 days whose structured phase count is 0. That means the product skips an evaluation target; it does not prove that the account uses live firm capital. Every card names each qualifying path and links its distinct first-party sources before comparing the loss line, total known cost, starting split, and payout gate.`,
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
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A firm qualifies only when at least 1 structured product captured within 30 days sets phases to 0. Every qualifying product contributes to the ${CURRENT_INSTANT_FIRM_COUNT}-firm, ${CURRENT_INSTANT_PRODUCT_COUNT}-product snapshot; missing prices or starting splits stay visibly unverified. The order uses our editorial score, while affiliate status, product count, price, profit split, drawdown type, and payout speed add 0 points. “Instant” describes the missing evaluation phase, not verified live-capital execution.`,
    decisionGuide: [
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
    lastReviewed: '2026-08-17',
  },
  {
    slug: 'best-futures-prop-firms',
    h1: `Best Futures Prop Firms (2026): ${CURRENT_FUTURES_FIRM_COUNT} Verified`,
    metaTitle: `Best Futures Prop Firms (2026): ${CURRENT_FUTURES_FIRM_COUNT} Verified`,
    metaDescription:
      `Compare ${CURRENT_FUTURES_FIRM_COUNT} futures prop firms across ${CURRENT_FUTURES_PRODUCT_COUNT} current products with fees, billing, drawdown, payout rules, platforms, reviews, and dated first-party sources.`,
    intro:
      `These ${CURRENT_FUTURES_FIRM_COUNT} firms have ${CURRENT_FUTURES_PRODUCT_COUNT} current products whose structured asset class is futures. Every card names each path and links its distinct first-party sources. Some evaluations rebill monthly; others use a one-time fee, and drawdown can trail intraday or update at the end of the session. CFTC oversight of a designated futures exchange does not automatically make the evaluation provider, software platform, or data connection CFTC-registered.`,
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
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A firm qualifies only when at least 1 structured product captured within 30 days explicitly sets assetClass to futures. A firm-level Futures label without a fresh product does not qualify. The order across ${CURRENT_FUTURES_FIRM_COUNT} firms uses our editorial score; affiliate status, coupon size, the ${CURRENT_FUTURES_PRODUCT_COUNT}-product count, billing model, platform, and drawdown type add 0 points. Each card names every current product and links each distinct first-party source.`,
    decisionGuide: [
      {
        title: 'Is the evaluation fee one-time or recurring?',
        body: 'Read pricingModel before comparing headline prices. A monthly subscription can rebill until the trader passes or cancels, while a one-time evaluation can still add a funded-account activation payment.',
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
    lastReviewed: '2026-08-17',
  },
  {
    slug: 'best-crypto-prop-firms',
    h1: `Best Crypto Prop Firms (2026): ${CURRENT_CRYPTO_FIRM_COUNT} Verified`,
    metaTitle: `Best Crypto Prop Firms (2026): ${CURRENT_CRYPTO_FIRM_COUNT} Verified`,
    metaDescription:
      `Compare ${CURRENT_CRYPTO_FIRM_COUNT} crypto prop firms across ${CURRENT_CRYPTO_PRODUCT_COUNT} mapped products using current rules, market-specific evidence, source dates, and reviews.`,
    intro:
      `Trading crypto is not the same as paying or withdrawing in crypto. These ${CURRENT_CRYPTO_FIRM_COUNT} firms have a current first-party source that explicitly names crypto as a tradable market plus ${CURRENT_CRYPTO_PRODUCT_COUNT} exact product records inside the 30-day freshness window. Crypto-native products rank before multi-asset CFD products, then editorial score breaks ties. E8 Markets and FXIFY remain visible below as product-capture gaps rather than borrowing forex prices or rules.`,
    sortDir: 'desc',
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
    ],
    evidenceGaps: CRYPTO_MARKET_WATCH.map(item => ({
      firmName: item.firmName,
      statusLabel: 'Product capture needed',
      summary: item.evidence,
      nextStep: item.nextStep,
      sourceUrl: item.sourceUrl,
      sourceCapturedAt: item.sourceCapturedAt,
    })),
    lastReviewed: '2026-08-17',
  },
  {
    slug: 'best-swing-trading-prop-firms',
    h1: `Best Prop Firms for Swing Trading (2026): ${CURRENT_SWING_FIRM_COUNT} Verified`,
    metaTitle: `Best Swing Trading Prop Firms (2026): ${CURRENT_SWING_FIRM_COUNT} Verified`,
    metaDescription:
      `Compare ${CURRENT_SWING_FIRM_COUNT} swing-trading prop firms across ${CURRENT_SWING_PRODUCT_COUNT} exact products with verified overnight and weekend holding, drawdown rules, dated sources, and reviews.`,
    intro:
      `These ${CURRENT_SWING_FIRM_COUNT} firms have ${CURRENT_SWING_PRODUCT_COUNT} current products whose first-party captures explicitly allow both weekday overnight and weekend holding on the same path. That does not mean every product qualifies: each card names every matching product, its drawdown types, capture dates, and direct rule sources. Static drawdown is not assumed, and permission to hold does not remove gap, swap, or loss-limit risk.`,
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
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      `A firm qualifies only when at least 1 product captured within 30 days sets both overnight and weekend holding to allowed on that same product. Restricted, blocked, missing, and stale fields do not qualify. The order across ${CURRENT_SWING_FIRM_COUNT} firms uses our editorial score; affiliate status, coupon size, the ${CURRENT_SWING_PRODUCT_COUNT}-product coverage count, and drawdown type add 0 points. Each card reports exact product coverage because another product from the same firm can use different holding rules.`,
    decisionGuide: [
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
    lastReviewed: '2026-08-17',
  },
]

export function getLandingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find(l => l.slug === slug)
}

export function buildLandingPayload(landing: Landing) {
  const firms = getAllFirms()
  const ranked = landing.rank(firms)
  const count = new Set(ranked.map(item => item.firm.name)).size
  return { ranked, count, allFirms: firms }
}
