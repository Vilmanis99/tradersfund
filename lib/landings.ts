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
  /** ISO date of editorial review. Drives the visible freshness pill. */
  lastReviewed: string
}

const REVIEW_DATE = '2026-07-27'
const ACCESS_EVIDENCE_MAX_AGE_DAYS = 30

interface UsAccessEvidence {
  firmSlug: string
  firmName: string
  accessStatus: 'explicit' | 'policy-supported'
  assetClass: 'cfd' | 'futures'
  platformConstraint: string
  sourceUrl: string
  secondarySourceUrl?: string
  sourcePublishedAt?: string
  sourceCapturedAt: string
  evidenceLabel: string
  decisionNote: string
}

const US_ACCESS_EVIDENCE_BY_SLUG = new Map(
  (rawUsAccessEvidence.firms as UsAccessEvidence[]).map(evidence => [
    evidence.firmSlug,
    evidence,
  ]),
)

function isAccessEvidenceFresh(sourceCapturedAt: string) {
  const captured = new Date(`${sourceCapturedAt}T00:00:00Z`)
  if (Number.isNaN(captured.getTime())) return false
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const ageDays = Math.floor((todayUtc - captured.getTime()) / 86400000)
  return ageDays >= 0 && ageDays <= ACCESS_EVIDENCE_MAX_AGE_DAYS
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

/**
 * Landing-card evidence must age with the challenge captures. This deliberately
 * avoids hand-written superlatives: each number and rule is calculated from
 * products that are still inside the 30-day source window.
 */
function productEvidenceNote(firm: Firm): string {
  const challenges = getChallengesByFirm(firmSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge),
  )
  if (!challenges.length) {
    return 'No product capture is currently inside the 30-day freshness window; verify the firm before paying.'
  }

  const splits = [...new Set(challenges.flatMap(challenge =>
    challenge.profitSplitPct == null ? [] : [challenge.profitSplitPct],
  ))].sort((a, b) => a - b)
  const payouts = [...new Set(challenges.flatMap(challenge =>
    challenge.payoutFrequency == null ? [] : [challenge.payoutFrequency],
  ))].sort()
  const drawdowns = [...new Set(challenges.flatMap(challenge =>
    challenge.drawdownType == null ? [] : [challenge.drawdownType],
  ))].sort()

  const splitText = splits.length === 0
    ? 'split not published'
    : splits.length === 1
      ? `${splits[0]}% published split`
      : `${splits[0]}–${splits.at(-1)}% published splits`
  const payoutText = payouts.length
    ? `${joinNatural(payouts)} payout timing`
    : 'payout timing not published'
  const drawdownText = drawdowns.length
    ? `${joinNatural(drawdowns)} drawdown`
    : 'drawdown method not published'

  return `${challenges.length} source-checked ${challenges.length === 1 ? 'product' : 'products'}; ${splitText}; ${payoutText}. Product rules include ${drawdownText}.`
}

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
    h1: 'The Best Prop Firms in 2026 (Ranked)',
    metaTitle: 'Best Prop Firms in 2026 — Ranked & Reviewed',
    metaDescription:
      'Every major prop firm ranked on our editorial score — profit split, payout speed, drawdown rules, and track record. Who each firm is actually for, in 2026.',
    intro:
      "There is no single best prop firm — only the best fit for how you trade. The tracked firms below are ordered by our directional editorial score, then paired with source-dated product facts. Use the score to shortlist; use the product rules and total cost to decide.",
    sortDir: 'desc',
    rank: firms =>
      firms
        .map(firm => ({
          firm,
          sortKey: firm.score,
          highlight: `${firm.profitSplitPct ?? '—'}% split · ${firm.payoutFrequency ?? '—'} payouts`,
          note: productEvidenceNote(firm),
        }))
        .sort((a, b) => b.sortKey - a.sortKey),
    methodology:
      "We rank by our editorial score, not the firm's marketing. The score weighs profit split, payout speed and reliability, drawdown type (static beats trailing for most traders), rule transparency, and operating history. Affiliate partners are marked and never ranked higher for it — the order is the same one we'd give a friend.",
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-prop-firms-in-uk',
    h1: 'Best Prop Firms for UK Traders (2026)',
    metaTitle: 'Best Prop Firms for UK Traders in 2026 — Ranked',
    metaDescription:
      'Prop firms ranked for UK-based traders: profit split, payout speed, GBP/SEPA bank wire support, and challenge price. Verified 2026.',
    intro:
      'Every firm below accepts UK-based traders, supports either bank wire or crypto payouts (the two settlement methods that work reliably from the UK), and has a published profit split. Ranked by our editorial score.',
    sortDir: 'desc',
    rank: firms => {
      // UK-friendly = not in countriesRestricted, has a usable payout method.
      const eligible = firms.filter(f => {
        const restricted = f.countriesRestricted || []
        if (restricted.includes('UK') || restricted.includes('United Kingdom')) return false
        const methods = f.payoutMethods || []
        return methods.some(m => /wire|crypto|skrill|rise/i.test(m))
      })
      return eligible
        .map(firm => ({
          firm,
          sortKey: firm.score,
          highlight: `${firm.profitSplitPct ?? '—'}% split · ${(firm.payoutMethods || []).slice(0, 2).join(' / ')}`,
        }))
        .sort((a, b) => b.sortKey - a.sortKey)
    },
    methodology:
      'A firm is "UK-friendly" if it does not list the United Kingdom in its countries-restricted list and offers at least one payout method that settles reliably from the UK (bank wire, crypto, Skrill, or Rise). Rankings use our editorial score — not the firm\'s marketing.',
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-prop-firms-in-us',
    h1: 'Best Prop Firms for US Traders (2026): 4 Verified',
    metaTitle: 'Best Prop Firms for US Traders (2026)',
    metaDescription:
      'Compare 4 prop firms with current first-party US-access evidence, including futures and CFD paths, platform limits, reviews, and dated eligibility sources.',
    intro:
      'These 4 firms publish current first-party evidence supporting at least 1 path for U.S. residents. Access evidence is not legal advice, CFTC or NFA registration, or a guarantee that every state, platform, product, KYC route, and payout method is available. Recheck the linked policy and final checkout before paying.',
    sortDir: 'desc',
    rank: firms => {
      return firms
        .flatMap(firm => {
          const slug = firmSlug(firm.name)
          const evidence = US_ACCESS_EVIDENCE_BY_SLUG.get(slug)
          const challenges = getChallengesByFirm(slug)
          if (
            !evidence ||
            !isAccessEvidenceFresh(evidence.sourceCapturedAt) ||
            !challenges.length ||
            !challenges.every(challenge => isChallengeFresh(challenge))
          ) {
            return []
          }
          const assetLabel = evidence.assetClass === 'futures' ? 'Futures' : 'CFD'
          const platformLabel = evidence.assetClass === 'cfd'
            ? ' · Match-Trader only'
            : ''
          return [{
            firm,
            sortKey: firm.score,
            highlight: `${assetLabel} · ${challenges.length} current product paths${platformLabel}`,
            note: evidence.decisionNote,
            metricLabel: 'US evidence',
            metricValue: evidence.accessStatus === 'explicit' ? 'Direct' : 'Policy',
            evidence: {
              label: evidence.evidenceLabel,
              url: evidence.sourceUrl,
              capturedAt: evidence.sourceCapturedAt,
            },
          }]
        })
        .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name))
    },
    methodology:
      'A firm appears only when a first-party U.S.-access policy was captured within 30 days and every structured product record is also within the 30-day freshness gate. A missing restriction is not enough. The order uses our editorial score; affiliate status, coupon size and asset class add 0 points. Access evidence does not establish CFTC or NFA registration, legal status, payout approval, or availability in every state.',
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
        body: 'No. Futures products use exchange-listed contracts and product-specific market hours. FundedNext’s captured U.S. CFD path uses Match-Trader and cannot be treated as an MT4, MT5, or CME futures account.',
      },
      {
        title: 'What must match before a U.S. payout?',
        body: 'Check legal name, residency, KYC, tax form and bank-country rules. Apex publishes U.S.-residency-matched ACH requirements, while Topstep lists W-9 handling for U.S. persons.',
      },
    ],
    lastReviewed: '2026-08-15',
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
    h1: 'Best Instant Funding Prop Firms (2026)',
    metaTitle: 'Best Instant Funding Prop Firms (2026) — Compared',
    metaDescription:
      'Compare fresh phase-0 prop-firm products by entry cost, drawdown, profit split, payout gates, account stage, reviews, and dated first-party sources.',
    intro:
      'Every ranked firm has at least 1 product captured within 30 days whose structured phase count is 0. That means the product skips an evaluation target; it does not prove that the account uses live firm capital. Compare the loss line, total known cost, starting split, and payout gate on the exact product before paying.',
    sortDir: 'desc',
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
        const shownProducts = products.slice(0, 3).map(product => product.productName)
        const moreCount = products.length - shownProducts.length
        const evidenceProduct = cheapest?.product ?? products[0]

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${products.length} current phase-0 ${products.length === 1 ? 'product' : 'products'} · ${cheapest ? `minimum known cost ${formatUsd(cheapest.minimumCostUsd)}` : 'price unverified'}`,
          metricLabel: 'Products',
          metricValue: products.length.toString(),
          note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''}. Captured drawdown: ${joinNatural(drawdowns)}; published ${splits.length === 1 ? 'split' : 'splits'}: ${splits.length ? `${splits.join('–')}%` : 'unverified'}; ${joinNatural(payoutGates)}.`,
          evidence: {
            label: `${evidenceProduct.productName} source`,
            url: evidenceProduct.sourceUrl,
            capturedAt: evidenceProduct.sourceCapturedAt,
          },
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm qualifies only when at least 1 structured product captured within 30 days sets phases to 0. Every qualifying product contributes to the card; missing prices or starting splits stay visibly unverified. The order uses our editorial score, while affiliate status, product count, price, profit split, drawdown type, and payout speed add 0 points. “Instant” describes the missing evaluation phase, not verified live-capital execution.',
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
    h1: 'Best Futures Prop Firms (2026)',
    metaTitle: 'Best Futures Prop Firms (2026) — By Product',
    metaDescription:
      'Compare futures prop firms using current product-level fees, billing, drawdown, payout rules, platforms, reviews, and dated first-party sources.',
    intro:
      'Every ranked firm has at least 1 fresh challenge record whose asset class is futures. Some evaluations rebill monthly; others use a one-time fee, and drawdown can trail intraday or update at the end of the session. CFTC oversight of a designated futures exchange does not automatically make the evaluation provider, software platform, or data connection CFTC-registered.',
    sortDir: 'desc',
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
        const shownProducts = products.slice(0, 3).map(product => product.productName)
        const moreCount = products.length - shownProducts.length
        const evidenceProduct = products[0]

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${products.length} current ${products.length === 1 ? 'product' : 'products'} · ${joinNatural(billing)}`,
          metricLabel: 'Products',
          metricValue: products.length.toString(),
          note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''}. Captured drawdown: ${joinNatural(drawdowns)}; published starting ${splits.length === 1 ? 'split' : 'splits'}: ${splits.length ? `${splits.join('–')}%` : 'unverified'}.`,
          evidence: {
            label: `${evidenceProduct.productName} source`,
            url: evidenceProduct.sourceUrl,
            capturedAt: evidenceProduct.sourceCapturedAt,
          },
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm qualifies only when at least 1 structured product captured within 30 days explicitly sets assetClass to futures. A firm-level Futures label without a fresh product does not qualify. The order uses our editorial score; affiliate status, coupon size, product count, billing model, platform, and drawdown type add 0 points. Each card names current products and links a dated first-party source.',
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
    h1: 'Best Crypto Prop Firms (2026)',
    metaTitle: 'Best Crypto Prop Firms in 2026 — Ranked',
    metaDescription:
      'Prop firms that let you trade crypto — ranked by profit split, payout speed, and rules. Plus which firm is built crypto-first versus crypto as an afterthought.',
    intro:
      "Two questions hide inside “best crypto prop firm”: can you trade crypto, and can you get paid in it? This page answers the first — every firm below lists crypto among its tradeable markets. Only one, Crypto Fund Trader, is built crypto-first; the rest treat it as one CFD market among several. If what you want is to be paid in crypto, that's a different cut — check the rule filters.",
    sortDir: 'desc',
    rank: firms =>
      firms
        .filter(f => f.assets?.includes('Crypto'))
        .map(firm => ({
          firm,
          sortKey: firm.score,
          highlight: `${firm.profitSplitPct ?? '—'}% split · ${firm.payoutFrequency ?? '—'} payouts`,
          note: productEvidenceNote(firm),
        }))
        .sort((a, b) => b.sortKey - a.sortKey),
    methodology:
      'A firm is included if it lists Crypto in its assets array — i.e. you can trade crypto pairs on a funded account. We rank by editorial score; the per-firm notes flag whether crypto is a first-class market or one of several. This is distinct from paying out in crypto, which is a payout-method question covered by our rule filters.',
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-swing-trading-prop-firms',
    h1: 'Best Prop Firms for Swing Trading (2026)',
    metaTitle: 'Best Swing Trading Prop Firms (2026) — By Product',
    metaDescription:
      'Compare swing-trading prop-firm products with verified overnight and weekend holding, drawdown type, source dates, reviews, and exact rule links.',
    intro:
      'Every ranked firm has at least 1 current product whose first-party capture explicitly allows both weekday overnight and weekend holding. That does not mean every product qualifies: each card shows the matching-product count, named paths, drawdown types, capture date, and a direct rule source. Static drawdown is not assumed, and permission to hold does not remove gap, swap, or loss-limit risk.',
    sortDir: 'desc',
    rank: firms => firms
      .flatMap(firm => {
        const freshProducts = getChallengesByFirm(firmSlug(firm.name))
          .filter(challenge => isChallengeFresh(challenge))
        const qualifying = swingCompatibleProducts(firm)
        if (!qualifying.length) return []

        const drawdowns = [...new Set(qualifying.map(challenge =>
          drawdownLabel(challenge.drawdownType),
        ))].sort()
        const shownProducts = qualifying.slice(0, 3).map(challenge => challenge.productName)
        const moreCount = qualifying.length - shownProducts.length
        const evidenceProduct = qualifying[0]

        return [{
          firm,
          sortKey: firm.score,
          highlight: `${qualifying.length} swing-qualified ${qualifying.length === 1 ? 'product' : 'products'} · ${joinNatural(drawdowns)}`,
          metricLabel: 'Product fit',
          metricValue: `${qualifying.length}/${freshProducts.length}`,
          note: `${joinNatural(shownProducts)}${moreCount > 0 ? `, plus ${moreCount} more` : ''} meet both holding rules. Other products from the same firm may differ.`,
          evidence: {
            label: `${evidenceProduct.productName} rule source`,
            url: evidenceProduct.sourceUrl,
            capturedAt: evidenceProduct.sourceCapturedAt,
          },
        }]
      })
      .sort((a, b) => b.sortKey - a.sortKey || a.firm.name.localeCompare(b.firm.name)),
    methodology:
      'A firm qualifies only when at least 1 product captured within 30 days sets both overnight and weekend holding to allowed on that same product. Restricted, blocked, missing, and stale fields do not qualify. The order uses our editorial score; affiliate status, coupon size, qualifying-product count, and drawdown type add 0 points. Each card reports exact product coverage because another product from the same firm can use different holding rules.',
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
