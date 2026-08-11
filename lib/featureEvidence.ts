/**
 * Product-level qualification for `/prop-firms/<feature>` pages.
 *
 * The feature filters in `lib/features.ts` test the firm aggregate — one
 * boolean per rule per firm. Firms don't work that way, and the aggregate
 * was actively misreporting:
 *
 *   - FXIFY carries `eaAllowed: true` while its products split [true, false].
 *     The EA page told traders the firm allows EAs; one of its products bans
 *     them, and the page never said which.
 *   - FXIFY carries `overnightAllowed: true` while no fresh product publishes
 *     an overnight rule at all — an assertion no captured source supports.
 *   - Topstep is `ea: 'restricted'` at firm level, so it was excluded — yet
 *     its No Activation Fee Path records EAs as allowed outright.
 *   - E8 Markets, City Traders Imperium and The Funded Trader were excluded
 *     on a null firm field while their products record `true`.
 *
 * So the aggregate both over- and under-reports on the one question these
 * pages exist to answer. This module answers it per product instead, and
 * keeps the products named so a reader knows which one to buy.
 */

import { freshChallenges } from './challengeMatchup'
import type { Challenge, Firm, RuleAvailability } from './firms'
import { getAllFirms } from './firms'

/** How one product answers the feature question. */
export type ProductVerdict = 'allows' | 'conditional' | 'blocks' | 'unverified'

/**
 * How a firm answers it across its whole current lineup.
 * `all` — every fresh product qualifies.
 * `some` — at least one qualifies, while at least one is conditional, blocked,
 *          or unpublished. The case the firm aggregate cannot express.
 * `conditional` — none qualifies outright and at least one is conditional;
 *                 other products may be blocked or unpublished.
 * `none` — none qualifies or is conditional; at least one blocks it and any
 *          remaining products are unpublished.
 * `unverified` — every product answer is unpublished.
 */
export type FirmLevel = 'all' | 'some' | 'conditional' | 'none' | 'unverified'

export interface FeatureProductRow {
  productName: string
  productSlug: string
  verdict: ProductVerdict
  /** Extra context for mechanic features, e.g. the actual drawdown type. */
  detail: string | null
  sourceUrl: string
  capturedAt: string
}

export interface FeatureFirmEvidence {
  firm: Firm
  slug: string
  level: FirmLevel
  products: FeatureProductRow[]
  allowCount: number
  conditionalCount: number
  blockCount: number
  unverifiedCount: number
}

export interface FeatureEvidence {
  /**
   * False when the feature has no per-product field (payout methods live on
   * the firm, not the challenge). Those pages stay firm-level and say so.
   */
  productLevel: boolean
  /** Every product qualifies — the clean answer. */
  full: FeatureFirmEvidence[]
  /** Some products qualify. Named, because buying the wrong one loses the rule. */
  partial: FeatureFirmEvidence[]
  /** No outright qualifier; at least one conditional product. */
  conditional: FeatureFirmEvidence[]
  /** No qualifying/conditional product; at least one block. */
  excluded: FeatureFirmEvidence[]
  /** Every product answer is unpublished. */
  unverified: FeatureFirmEvidence[]
  latestCapture: string | null
}

/* ── Predicates ────────────────────────────────────────────────── */

type ProductTest = (challenge: Challenge) => ProductVerdict
type DetailFn = (challenge: Challenge) => string | null

function fromRule(get: (c: Challenge) => RuleAvailability): ProductTest {
  return challenge => {
    const value = get(challenge)
    if (value === true) return 'allows'
    if (value === 'restricted') return 'conditional'
    if (value === false) return 'blocks'
    return 'unverified'
  }
}

function drawdownLabel(challenge: Challenge): string | null {
  const value = challenge.drawdownType
  if (value == null) return null
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'Balance-based'
  return value === 'static' ? 'Static' : 'Trailing'
}

interface FeatureTest {
  test: ProductTest
  detail?: DetailFn
  /** Positive verb phrase, e.g. "allow EAs". */
  claim: string
}

/*
 * Every feature here shares one property: buying the wrong product from a
 * qualifying firm loses you the thing you came for. That is what makes the
 * full/partial split worth rendering.
 *
 * Deliberately excluded are "does this firm offer X" questions — a 1-step
 * challenge, a futures product — where partial coverage is normal rather
 * than a trap. Those are already served by the filters on
 * /prop-firm-challenges and would read as a false warning in this template.
 */

/**
 * Keyed by feature slug. A feature with no entry here has no per-product
 * field and falls back to the firm aggregate.
 */
const FEATURE_TESTS: Record<string, FeatureTest> = {
  'ea-allowed': {
    test: fromRule(c => c.rules.ea),
    claim: 'allow EAs',
  },
  'news-trading': {
    test: fromRule(c => c.rules.news),
    claim: 'allow news trading',
  },
  'weekend-holding': {
    test: fromRule(c => c.rules.weekend),
    claim: 'allow weekend holding',
  },
  'overnight-holding': {
    test: fromRule(c => c.rules.overnight),
    claim: 'allow overnight holding',
  },
  'copy-trading': {
    test: fromRule(c => c.rules.copyTrading),
    claim: 'allow copy trading',
  },
  'static-drawdown': {
    claim: 'use static drawdown',
    detail: drawdownLabel,
    test: c => {
      if (c.drawdownType == null) return 'unverified'
      if (c.drawdownType === 'static') return 'allows'
      // Balance-based never trails an equity high either, so it clears the
      // trader-facing bar this page is about — but it is not the same rule,
      // and saying "static" would misname it.
      if (c.drawdownType === 'balance-based') return 'conditional'
      return 'blocks'
    },
  },
  'high-profit-split': {
    claim: 'pay 90% or more',
    detail: c => (c.profitSplitPct == null ? null : `${c.profitSplitPct}% split`),
    test: c => {
      if (c.profitSplitPct == null) return 'unverified'
      return c.profitSplitPct >= 90 ? 'allows' : 'blocks'
    },
  },
}

/*
 * Deliberately absent: "no consistency rule" and "no minimum trading days".
 *
 * The current numeric fields use `null` for more than one editorial state:
 * an explicitly confirmed absence, a rule the source does not publish, and a
 * conflict we refused to guess through. A negative claim cannot be recovered
 * safely from that value. These features must stay unpublished until the
 * Challenge schema records confirmed-none separately from unknown/conflicted.
 */

/*
 * Deliberately absent: a "no activation fee" feature.
 *
 * `Challenge.activationFeeUsd` is documented as null when the firm charges
 * none *or* does not publish one, and 68 of 89 current products leave it
 * null — every one of them a one-off CFD product where the field is simply
 * never mentioned. Qualifying those as "charges no activation fee" would
 * read a confirmed zero out of silence across 76% of the dataset, which is
 * the same class of error as the fabricated $180/$280/$480 the True-Cost
 * generator exists to prevent.
 *
 * The 21 products where the question is live (subscription evaluations) do
 * carry explicit values, so the figure is already rendered per product in
 * the cost tables on /compare and /prop-firm-challenges. Reviving this as a
 * page needs a capture field that separates "confirmed none" from "not
 * published" — not a looser predicate.
 */

export function featureClaim(slug: string): string | null {
  return FEATURE_TESTS[slug]?.claim ?? null
}

export function featureCopy(slug: string): FeatureTest | undefined {
  return FEATURE_TESTS[slug]
}

export function isProductLevelFeature(slug: string): boolean {
  return slug in FEATURE_TESTS
}

/* ── Evaluation ────────────────────────────────────────────────── */

function levelFor(counts: {
  allow: number
  conditional: number
  block: number
  unverified: number
  total: number
}): FirmLevel {
  if (!counts.total) return 'unverified'
  if (counts.allow === counts.total) return 'all'
  if (counts.allow > 0) return 'some'
  if (counts.conditional === counts.total) return 'conditional'
  if (counts.conditional > 0) return 'conditional'
  if (counts.block === counts.total) return 'none'
  if (counts.block > 0) return 'none'
  return 'unverified'
}

const LEVEL_RANK: Record<FirmLevel, number> = {
  all: 0,
  some: 1,
  conditional: 2,
  none: 3,
  unverified: 4,
}

export function firmSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function buildFeatureEvidence(slug: string): FeatureEvidence {
  const spec = FEATURE_TESTS[slug]
  const empty: FeatureEvidence = {
    productLevel: false,
    full: [],
    partial: [],
    conditional: [],
    excluded: [],
    unverified: [],
    latestCapture: null,
  }
  if (!spec) return empty

  const rows: FeatureFirmEvidence[] = []
  let latestCapture: string | null = null

  for (const firm of getAllFirms()) {
    const slugged = firmSlug(firm.name)
    const challenges = freshChallenges(slugged)
    if (!challenges.length) continue

    const products: FeatureProductRow[] = challenges.map(challenge => {
      if (!latestCapture || challenge.sourceCapturedAt > latestCapture) {
        latestCapture = challenge.sourceCapturedAt
      }
      return {
        productName: challenge.productName,
        productSlug: challenge.productSlug,
        verdict: spec.test(challenge),
        detail: spec.detail?.(challenge) ?? null,
        sourceUrl: challenge.sourceUrl,
        capturedAt: challenge.sourceCapturedAt,
      }
    })

    const allowCount = products.filter(p => p.verdict === 'allows').length
    const conditionalCount = products.filter(p => p.verdict === 'conditional').length
    const blockCount = products.filter(p => p.verdict === 'blocks').length
    const unverifiedCount = products.filter(p => p.verdict === 'unverified').length

    rows.push({
      firm,
      slug: slugged,
      level: levelFor({
        allow: allowCount,
        conditional: conditionalCount,
        block: blockCount,
        unverified: unverifiedCount,
        total: products.length,
      }),
      // Qualifying products first so the useful ones read at the top.
      products: [...products].sort((x, y) => {
        const rank = (v: ProductVerdict) =>
          v === 'allows' ? 0 : v === 'conditional' ? 1 : v === 'blocks' ? 2 : 3
        return rank(x.verdict) - rank(y.verdict) || x.productName.localeCompare(y.productName)
      }),
      allowCount,
      conditionalCount,
      blockCount,
      unverifiedCount,
    })
  }

  rows.sort((x, y) =>
    LEVEL_RANK[x.level] - LEVEL_RANK[y.level]
    || y.firm.score - x.firm.score
    || x.firm.name.localeCompare(y.firm.name))

  return {
    productLevel: true,
    full: rows.filter(r => r.level === 'all'),
    partial: rows.filter(r => r.level === 'some'),
    conditional: rows.filter(r => r.level === 'conditional'),
    excluded: rows.filter(r => r.level === 'none'),
    unverified: rows.filter(r => r.level === 'unverified'),
    latestCapture,
  }
}

/**
 * Firms to rank in the main list: every product qualifies, or some do.
 * Partial firms belong here — excluding them would repeat the aggregate's
 * under-reporting — but the page must name which products qualify.
 */
export function qualifyingFirms(evidence: FeatureEvidence): Firm[] {
  return [...evidence.full, ...evidence.partial].map(r => r.firm)
}

/** Agree the leading verb with its count, including publish → publishes. */
function agree(phrase: string, count: number): string {
  if (count === 1) {
    const [verb, ...rest] = phrase.split(' ')
    const singular = /(?:s|sh|ch|x|z|o)$/.test(verb)
      ? `${verb}es`
      : /[^aeiou]y$/.test(verb)
        ? `${verb.slice(0, -1)}ies`
        : `${verb}s`
    return [singular, ...rest].join(' ')
  }
  return phrase
}

/** Count every rendered product state so mixed firms are never generalized. */
export function describeFeature(evidence: FeatureEvidence, slug: string): string {
  const copy = FEATURE_TESTS[slug]
  if (!copy) return ''
  const full = evidence.full.length
  const partial = evidence.partial.length
  const rows = [
    ...evidence.full,
    ...evidence.partial,
    ...evidence.conditional,
    ...evidence.excluded,
    ...evidence.unverified,
  ]
  const tracked = rows.length
  const productCount = rows.reduce((sum, row) => sum + row.products.length, 0)
  const allowCount = rows.reduce((sum, row) => sum + row.allowCount, 0)
  const conditionalCount = rows.reduce((sum, row) => sum + row.conditionalCount, 0)
  const blockCount = rows.reduce((sum, row) => sum + row.blockCount, 0)
  const unverifiedCount = rows.reduce((sum, row) => sum + row.unverifiedCount, 0)

  const firmSentence = [
    `Of ${tracked} firms with current product data, ${full} ${agree(copy.claim, full)} on every captured product`,
    `${partial} ${partial === 1 ? 'has' : 'have'} at least one outright qualifying product and at least one product with a different or unpublished verdict`,
  ].join('; ')

  const productSentence = [
    `Across ${productCount} captured products, ${allowCount} qualify`,
    `${conditionalCount} are conditional`,
    `${blockCount} do not qualify`,
    `${unverifiedCount} ${unverifiedCount === 1 ? 'has' : 'have'} no published answer we could verify`,
  ].join(', ')

  return `${firmSentence}. ${productSentence}.`
}
