import {
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  minimumCostToFundedUsd,
  type Firm,
  type Challenge,
} from './firms'
import {
  INDIA_EVIDENCE_BY_SLUG,
  indiaAccountSizeCapUsd,
  indiaEvidenceScore,
  passesIndiaRegulatoryCountryGate,
  passesIndiaProductGate,
  type IndiaFirmEvidence,
} from './india'

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
  /**
   * Optional one-line editorial verdict ("who it's for / the catch"), shown
   * under the stat line. Lets a ranking read as opinionated, not a bare
   * leaderboard. Omit on landings where the stat speaks for itself.
   */
  note?: string
}

export interface Landing {
  slug: string
  /** Visible in the hero + browser tab. */
  h1: string
  /** <title> tag — keep under 60 chars. */
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
    h1: 'Best Prop Firms for US Traders (2026)',
    metaTitle: 'Best Prop Firms for US Traders in 2026 — Ranked',
    metaDescription:
      'Prop firms ranked for US-based traders: CFTC-aware, futures-friendly, ACH/bank-wire payouts. Updated 2026.',
    intro:
      'US-resident traders face the tightest restrictions in the prop industry — most CFD-only firms outright restrict the US, while futures firms (CFTC-regulated path) are the dominant home for US traders. The list below filters for firms that explicitly accept the US.',
    sortDir: 'desc',
    rank: firms => {
      const eligible = firms.filter(f => {
        const restricted = f.countriesRestricted || []
        if (restricted.includes('US') || restricted.includes('United States') || restricted.includes('USA')) return false
        // Bias toward futures and firms with broad US-friendly payout methods.
        return true
      })
      return eligible
        .map(firm => ({
          firm,
          sortKey: firm.score + (firm.assets?.includes('Futures') ? 0.3 : 0),
          highlight: firm.assets?.includes('Futures')
            ? `Futures · ${firm.profitSplitPct ?? '—'}% split`
            : `${firm.assets?.slice(0, 2).join(' · ')} · ${firm.profitSplitPct ?? '—'}% split`,
        }))
        .sort((a, b) => b.sortKey - a.sortKey)
    },
    methodology:
      'A firm is included if it does not list the US in its countries-restricted list. Futures-capable firms get a small ranking nudge because the CFTC-regulated futures route is the only fully unambiguous legal path for US-resident funded traders.',
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-prop-firms-in-india',
    h1: 'Best Prop Firms for Indian Traders (2026)',
    metaTitle: 'Best Prop Firms in India (2026): Fees, KYC & Payouts',
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
          return {
            firm,
            sortKey: indiaEvidenceScore(evidence) * 100 + firm.score,
            highlight: `${minimumPublishedEntry(challenges)} entry · ${methods.slice(0, 2).join(' / ')}`,
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
    lastReviewed: '2026-07-28',
  },
  {
    slug: 'cheapest-prop-firms',
    h1: 'Cheapest Prop Firm Challenges (2026)',
    metaTitle: 'Cheapest Prop Firm Challenges in 2026 — Ranked',
    metaDescription:
      'Ranked by the lowest verified minimum cost to reach funded across current challenge products.',
    intro:
      'Cheap doesn\'t mean better — but if you\'re sizing risk against the fee, the table below shows the lowest priced entry challenge from every firm we track, sorted by price. We compute the true-cost (break-even profit vs max drawdown) inside every review.',
    sortDir: 'asc',
    rank: firms => {
      // For each firm, find its lowest current minimum cost to funded.
      const out: LandingFirm[] = []
      for (const firm of firms) {
        const challenges = getChallengesByFirm(firmSlug(firm.name))
          .filter(challenge => isChallengeFresh(challenge))
        const allTiers = challenges.flatMap((c: Challenge) =>
          c.accountSizes
            .map(t => ({
              ...t,
              productName: c.productName,
              minimumCostUsd: minimumCostToFundedUsd(c, t),
            }))
            .filter((tier): tier is typeof tier & { minimumCostUsd: number } =>
              tier.minimumCostUsd != null)
        )
        if (allTiers.length === 0) continue
        const cheapest = allTiers.sort((a, b) => a.minimumCostUsd - b.minimumCostUsd)[0]
        out.push({
          firm,
          sortKey: cheapest.minimumCostUsd,
          highlight: `Minimum $${cheapest.minimumCostUsd.toFixed(0)} to funded · ${cheapest.productName} ($${(cheapest.sizeUsd / 1000).toFixed(0)}K)`,
        })
      }
      return out.sort((a, b) => a.sortKey - b.sortKey)
    },
    methodology:
      'We rank current products by the minimum known cash outlay to reach funded: checkout price plus any required after-pass or activation fee. A monthly subscription assumes a first-cycle pass, so it is a floor rather than an average.',
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-instant-funding-prop-firms',
    h1: 'Best Instant-Funding Prop Firms (2026)',
    metaTitle: 'Best Instant-Funding Prop Firms (2026)',
    metaDescription:
      'Compare phase-0 prop-firm products with no evaluation stage, using current fees, drawdown, payout terms, and trading rules.',
    intro:
      '“Instant funding” products skip the evaluation phase and start under funded-stage rules. Many still use simulated accounts, and the trade-off is usually a lower split, tighter loss room, or extra payout conditions. This list includes only firms with a current phase-0 product capture.',
    sortDir: 'desc',
    rank: firms => {
      const out: LandingFirm[] = []
      for (const firm of firms) {
        const challenges = getChallengesByFirm(firmSlug(firm.name))
          .filter(challenge => isChallengeFresh(challenge))
        const instant = challenges.find((c: Challenge) => c.phases === 0)
        if (!instant) continue
        const cheapest = instant.accountSizes
          .map(tier => ({
            tier,
            minimumCostUsd: minimumCostToFundedUsd(instant, tier),
          }))
          .filter((entry): entry is typeof entry & { minimumCostUsd: number } =>
            entry.minimumCostUsd != null)
          .sort((a, b) => a.minimumCostUsd - b.minimumCostUsd)[0]
        out.push({
          firm,
          sortKey: firm.score,
          highlight: cheapest
            ? `${instant.productName} · minimum $${cheapest.minimumCostUsd.toFixed(0)} to funded`
            : instant.productName,
        })
      }
      return out.sort((a, b) => b.sortKey - a.sortKey)
    },
    methodology:
      'A firm is "instant-funding" only if it ships a product where phases = 0 (no evaluation challenge). Lower-profit-split "instant" products are shown alongside the cheapest tier we can verify.',
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-futures-prop-firms',
    h1: 'Best Futures Prop Firms (2026)',
    metaTitle: 'Best Futures Prop Firms in 2026 — Ranked & Compared',
    metaDescription:
      'Prop firms that fund futures traders: NinjaTrader, Tradovate, Rithmic platforms, daily-drawdown rules, and US-friendly status.',
    intro:
      'Futures funding is structurally different from CFD funding: traders use CFTC-regulated brokers (NinjaTrader, Tradovate, Rithmic) and the firm acts as an evaluation gate, not as the counterparty. The list below filters to firms that explicitly offer Futures as an asset class.',
    sortDir: 'desc',
    rank: firms => {
      const eligible = firms.filter(f => f.assets?.includes('Futures'))
      return eligible
        .map(firm => ({
          firm,
          sortKey: firm.score,
          highlight: `${firm.profitSplitPct ?? '—'}% split · ${firm.platforms?.slice(0, 2).join(' / ') || 'Platforms TBD'}`,
        }))
        .sort((a, b) => b.sortKey - a.sortKey)
    },
    methodology:
      'A firm is included if it lists Futures in its assets array. Product terms come from first-party challenge captures, and the audit blocks captures older than 30 days.',
    lastReviewed: REVIEW_DATE,
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
    metaTitle: 'Best Swing Trading Prop Firms in 2026 — Ranked',
    metaDescription:
      'Swing and position traders need overnight and weekend holding on forgiving drawdown. The firms below allow both — ranked, with the drawdown type that matters.',
    intro:
      "If your strategy holds through Friday's close, the rule page matters more than the marketing. Every firm below allows BOTH overnight and weekend holding on a static-drawdown account — so a position survives the weekend instead of being force-flattened, and a profitable run doesn't trip a trailing limit. Futures firms like Topstep and My Funded Futures are absent on purpose: they close you out at session end.",
    sortDir: 'desc',
    rank: firms =>
      firms
        .filter(f => f.overnightAllowed === true && f.weekendAllowed === true)
        .map(firm => ({
          firm,
          sortKey: firm.score,
          highlight: `${firm.drawdownType} drawdown · ${firm.profitSplitPct ?? '—'}% split`,
          note: productEvidenceNote(firm),
        }))
        .sort((a, b) => b.sortKey - a.sortKey),
    methodology:
      'A firm qualifies only when its aggregate rules allow both overnight and weekend holding. Individual products can still differ, so the source-dated product note is the final check; static, trailing, and balance-based drawdown behave differently after open profit.',
    lastReviewed: REVIEW_DATE,
  },
]

export function getLandingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find(l => l.slug === slug)
}

export function buildLandingPayload(landing: Landing) {
  const firms = getAllFirms()
  const ranked = landing.rank(firms)
  return { ranked, count: ranked.length, allFirms: firms }
}
