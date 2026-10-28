import { firmSlug } from './firmSlug.ts'
export { firmSlug }
import type { Firm } from './firms.ts'
import type { RuleEvidence } from './firms.ts'
import { getAllFirms, getAllChallenges, getChallengesByFirm, isChallengeFresh, minimumCostToFundedUsd } from './firms.ts'
import { COMPARE_PAIRS } from './compareAllowlist.ts'
import { isPostFreezeFirm } from './postFreezeFirms.ts'

export const COMPARISON_EDITORIAL_DATE = '2026-09-08'

/* ── Slug helpers ─────────────────────────────────────────────── */

/** Same slug rule as `/go/[firm]` and `FirmCtaCard`. */

/** Always-alphabetical canonical pair slug. */
export function canonicalMatchupSlug(slugA: string, slugB: string): string {
  return [slugA, slugB].sort().join('-vs-')
}

/** Parse a matchup URL → two firm slugs (in URL order, not canonical). */
export function parseMatchup(matchup: string): { a: string; b: string } | null {
  const m = matchup.split('-vs-')
  if (m.length !== 2 || !m[0] || !m[1]) return null
  return { a: m[0], b: m[1] }
}

/* ── Pair enumeration ─────────────────────────────────────────── */

/**
 * Explicit allowlist of canonical /compare pairs (lib/compareAllowlist.ts).
 * New firms in firms.json do not get auto-generated matchups: a pair only
 * exists (static params, sitemap, hub, compare links) once it is listed here.
 */
const COMPARE_PAIR_ALLOWLIST: ReadonlySet<string> = new Set(COMPARE_PAIRS)

/** True when the canonical pair for these two firm slugs is an allowlisted /compare page. */
export function isComparePairAllowed(slugA: string, slugB: string): boolean {
  return slugA !== slugB
    && !isPostFreezeFirm(slugA)
    && !isPostFreezeFirm(slugB)
    && COMPARE_PAIR_ALLOWLIST.has(canonicalMatchupSlug(slugA, slugB))
}

/** Canonical pairs among these firm slugs that have no /compare page. */
export function getUnlistedComparePairs(slugs: readonly string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      if (!isComparePairAllowed(slugs[i], slugs[j])) out.push(canonicalMatchupSlug(slugs[i], slugs[j]))
    }
  }
  return out
}

/**
 * Every allowlisted unordered pair of firms in firms.json, canonicalised
 * alphabetically. Used by `generateStaticParams` so we ship one static page
 * per pair (not two).
 */
export function getAllCanonicalPairs(): Array<{ matchup: string; firmA: Firm; firmB: Firm }> {
  const firms = getAllFirms()
  const out: Array<{ matchup: string; firmA: Firm; firmB: Firm }> = []
  for (let i = 0; i < firms.length; i++) {
    for (let j = i + 1; j < firms.length; j++) {
      const a = firmSlug(firms[i].name)
      const b = firmSlug(firms[j].name)
      const [sa, sb] = [a, b].sort()
      if (!isComparePairAllowed(sa, sb)) continue
      // firmA/firmB stays in canonical (alphabetical) order so downstream
      // code can rely on it.
      const firmA = firmSlug(firms[i].name) === sa ? firms[i] : firms[j]
      const firmB = firmA === firms[i] ? firms[j] : firms[i]
      out.push({ matchup: `${sa}-vs-${sb}`, firmA, firmB })
    }
  }
  return out
}

/** Discovery requires current evidence on both sides; historic URLs still resolve. */
export function getCurrentCanonicalPairs(now = new Date()) {
  const eligible = new Set(getAllChallenges().filter(product => isChallengeFresh(product, now)).map(product => product.firmSlug))
  return getAllCanonicalPairs().filter(pair => eligible.has(firmSlug(pair.firmA.name)) && eligible.has(firmSlug(pair.firmB.name)))
}

/** Lookup a single firm by its slug. */
export function findFirmBySlug(slug: string): Firm | undefined {
  return getAllFirms().find(f => firmSlug(f.name) === slug)
}

/* ── Editorial overlays (hand-curated verdicts) ───────────────── */

export type WinnerSide = 'a' | 'b' | 'tie'

export interface CategoryCall {
  category: string
  winner: WinnerSide
  reason: string
}

export interface Faq { q: string; a: string }

export interface ComparisonOverlay {
  /** Always alphabetical: e.g. "ftmo-vs-fundednext" */
  matchupSlug: string
  /** ISO date when every hand-written claim was checked against both firms' current captures. */
  reviewedAt?: string
  /**
   * ISO date when the overlay was checked product-by-product against the
   * challenge captures. Legacy overlays omit this and therefore fail closed.
   */
  challengeReviewedAt?: string
  h1: string
  metaDescription: string
  tlDr: string
  verdictByCategory: CategoryCall[]
  whenToPickA: string
  whenToPickB: string
  faqs: Faq[]
}

/**
 * Hand-curated editorial overlays. The matchup slug must be the canonical
 * alphabetical pair (no need to special-case order; the route normalises).
 *
 * Pages without an entry here render a fully data-driven layout.
 */

/* ── Data-driven overlay facts ─────────────────────────────────── */

const listNames = (names: string[]) => names.length <= 1 ? names.join('')
  : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

/**
 * Product-specific fee-refund sentence from the captured tier `refundable`
 * flags: a product counts as refundable (or not) only when every tier agrees;
 * anything else is reported as unverified rather than guessed.
 */
/**
 * Products whose official sources contradict each other on the fee refund. The
 * challenge file may still carry a refundable flag (or null once Tracker
 * rechecks it), but copy must not state the refund as fact either way.
 * FundingPips 2 Step Standard: content/data/challenges/_captures/fundingpips-2026-10-20.json
 * → refundTerms (Get Started help article updated 2026-09-24 vs Terms effective 2026-05-15).
 */
export const REFUND_SOURCE_CONFLICTS: Record<string, readonly string[]> = {
  fundingpips: ['2 Step Standard'],
}

export const FUNDINGPIPS_STANDARD_REFUND_CONFLICT =
  'FundingPips’ own sources conflict on a 2 Step Standard fee refund: its help centre (Get Started, updated 24 Sep 2026) says the fee is refunded at the fourth Master reward, while its Terms (effective 15 May 2026) say “The Customer is not entitled to a refund of the registration fees”. Treat that refund as unconfirmed.'

export function feeRefundSummary(firmSlugValue: string, firmName: string): string {
  const conflicted = REFUND_SOURCE_CONFLICTS[firmSlugValue] ?? []
  const products = getChallengesByFirm(firmSlugValue).filter(product => !conflicted.includes(product.productName))
  const all = (value: boolean) => products
    .filter(product => product.accountSizes.length > 0 && product.accountSizes.every(tier => tier.refundable === value))
    .map(product => product.productName)
  const yes = all(true)
  const no = all(false)
  const unverified = products.map(product => product.productName).filter(name => !yes.includes(name) && !no.includes(name))
  const parts = [
    yes.length ? `${firmName} lists the fee as refundable on ${listNames(yes)}` : `${firmName} lists no product with a confirmed refundable fee`,
    no.length ? `not on ${listNames(no)}` : '',
    unverified.length ? `refund terms for ${listNames(unverified)} are unverified` : '',
    conflicted.length ? `its sources conflict on ${listNames([...conflicted])}` : '',
  ].filter(Boolean)
  return `${parts.join('; ')}.`
}

const usd = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const dayMonthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/**
 * One account size of one firm, read from the challenge captures: products with a
 * captured cost to funded at that size, and products that list sizes but no price at
 * all (null means "price not shown", never $0).
 */
export function sizeFees(firmSlugValue: string, sizeUsd: number) {
  const products = getChallengesByFirm(firmSlugValue)
  const priced = products.flatMap(product => {
    const tier = product.accountSizes.find(item => item.sizeUsd === sizeUsd)
    const total = tier ? minimumCostToFundedUsd(product, tier) : null
    return tier && total != null ? [{
      name: product.productName, pricingModel: product.pricingModel ?? 'one-off', priceUsd: tier.priceUsd as number,
      activationUsd: tier.activationFeeUsd ?? product.activationFeeUsd ?? 0, total, capturedAt: product.sourceCapturedAt,
    }] : []
  })
  const unpriced = products
    .filter(product => product.accountSizes.length > 0 && product.accountSizes.every(tier => tier.priceUsd == null && tier.priceEur == null))
    .map(product => ({ name: product.productName, capturedAt: product.sourceCapturedAt }))
  return { priced, unpriced }
}

const apex100k = sizeFees('apex-trader-funding', 100000)
const topstep100k = sizeFees('topstep', 100000)
// My Funded Futures one-off $100K evaluations, cheapest first, read from the challenge file so a
// new tier (e.g. a Builder $100K capture) is listed without a copy edit.
const mffSplits = new Map(getChallengesByFirm('my-funded-futures').map(product => [product.productName, product.profitSplitPct]))
const mffOneOff100k = sizeFees('my-funded-futures', 100000).priced
  .filter(item => item.pricingModel === 'one-off')
  .sort((x, y) => x.priceUsd - y.priceUsd)
const mffOneOff100kPrices = listNames(mffOneOff100k.map(item => `${item.name} ${usd(item.priceUsd)}`))
const mffOneOff100kPick = listNames(mffOneOff100k.map(item => {
  const split = mffSplits.get(item.name)
  return `${item.name} is a ${usd(item.priceUsd)} one-off fee${split ? ` with ${/^(8|11|18)/.test(String(split)) ? 'an' : 'a'} ${split}% split` : ''}`
}))
const apexOneTime100k = listNames(apex100k.priced.map(item => `${usd(item.total)} for ${item.name}`))
const apexUnpriced = listNames(apex100k.unpriced.map(item => item.name))
const apexUnpricedDate = apex100k.unpriced.map(item => item.capturedAt).sort().at(-1)
const apexUnpricedNote = apex100k.unpriced.length && apexUnpricedDate
  ? `${apexUnpriced} ${apex100k.unpriced.length === 1 ? 'has' : 'have'} no captured total because the ${dayMonthYear(apexUnpricedDate)} capture did not show ${apex100k.unpriced.length === 1 ? 'its' : 'their'} PA activation fee.`
  : ''
const topstepMonthly100k = topstep100k.priced
  .filter(item => item.pricingModel === 'monthly-subscription')
  .sort((x, y) => y.activationUsd - x.activationUsd)
  .map(item => `${usd(item.priceUsd)} a month ${item.activationUsd > 0 ? `plus a ${usd(item.activationUsd)} activation fee` : 'with no activation fee'}`)
  .join(', or ')

/**
 * FundedNext's News Reward Share Rule from the firms.json rules.newsTrading evidence
 * (help.fundednext.com articles 10701447 and 11641410). Scoped to funded Stellar
 * 1-Step, 2-Step and Lite accounts and Stellar Instant; challenge accounts are exempt.
 * Returns '' (the claim is dropped) unless every scope quote is still recorded and
 * both articles give the same percentage.
 */
export function fundedNextNewsCreditSentence(
  evidence: RuleEvidence[] = findFirmBySlug('fundednext')?.rules?.newsTrading?.evidence ?? [],
): string {
  const quote = (pattern: RegExp) => evidence.find(item => item.quoteKind === 'verbatim' && pattern.test(item.quote))
  const funded = quote(/(\d+)% of the profit from these profitable trade/)
  const instant = quote(/Only (\d+)% of the profit from trades placed during this window/)
  const scope = quote(/applies only to Stellar 1-Step, Stellar 2-Step, and Stellar Lite FundedNext Accounts/)
  const challengeExempt = quote(/Challenge Accounts are not subject to this rule/)
  const window = quote(/total (\d+)-minute window/)
  if (!funded || !instant || !scope || !challengeExempt || !window) return ''
  const pct = funded.quote.match(/(\d+)%/)?.[1]
  if (!pct || instant.quote.match(/(\d+)%/)?.[1] !== pct) return ''
  const minutes = window.quote.match(/total (\d+)-minute window/)?.[1]
  const readOn = [funded, instant, scope, challengeExempt, window].map(item => item.capturedAt).sort()[0]
  return `On funded Stellar 1-Step, 2-Step and Lite accounts and on Stellar Instant, only ${pct}% of the profit from trades in the ${minutes}-minute window around a listed high-impact news event counts; challenge accounts are not subject to this rule (FundedNext help centre, read ${dayMonthYear(readOn)}).`
}

const FUNDEDNEXT_NEWS_CREDIT = fundedNextNewsCreditSentence()
const withSentence = (text: string, sentence: string) => sentence ? `${text} ${sentence}` : text

/*
 * Rewrite 2026-10-21: every claim below was checked against content/data/firms.json and
 * content/data/challenges/*.json (captures up to 2026-10-20). Claims the data does not
 * carry (payout-record narratives, coaching quality, country lists not in firms.json,
 * unrecorded minimum-payout or platform details) were dropped rather than kept as copy.
 * Overlays stay off (COMPARISON_OVERLAYS_ENABLED) and still fail closed on newer captures.
 */
export const COMPARISON_OVERLAYS: Record<string, ComparisonOverlay> = {
  'apex-trader-funding-vs-topstep': {
    matchupSlug: 'apex-trader-funding-vs-topstep',
    // Re-checked 2026-10-22 against Tracker's Apex capture (93bd53d): $100K fees read from data.
    reviewedAt: '2026-10-22',
    challengeReviewedAt: '2026-10-22',
    h1: 'Apex Trader Funding vs Topstep (2026): Speed vs Structure',
    metaDescription:
      'Apex Trader Funding vs Topstep on recorded profit split, drawdown type, consistency rules, payout cadence, automation and operating history.',
    tlDr:
      `Apex Trader Funding’s 4 captured products record a 100% split, no evaluation consistency rule, 0 minimum trading days and weekly payouts with a 5-day first-payout field, sold with either intraday or end-of-day trailing drawdown. Topstep’s 2 Trading Combine paths record a 90% split, end-of-day trailing drawdown, a 55% evaluation consistency rule and payout requests after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request. At $100K, Apex’s captured one-time fees are ${apexOneTime100k}; ${apexUnpricedNote} Topstep bills monthly, so this overlay does not rank the two on cost.`,
    verdictByCategory: [
      // Matchup is alphabetical, so "a" = Apex Trader Funding and "b" = Topstep.
      { category: 'Recorded Profit Split', winner: 'a', reason: 'All 4 captured Apex products record 100%. Both Topstep paths record 90%.' },
      { category: 'Evaluation Consistency Rule', winner: 'a', reason: 'Apex records no evaluation consistency rule. Topstep applies a 55% consistency rule in the Trading Combine.' },
      { category: 'Drawdown Choice', winner: 'a', reason: 'Apex sells Intraday Trail and EOD Trail versions. Both Topstep paths record end-of-day trailing drawdown.' },
      { category: 'Payout Cadence', winner: 'tie', reason: 'Topstep opens a payout request after 5 winning days of $150+ or 3 trading days within a 40% consistency target, and daily after 30 winning days in a Live Funded Account. Apex records a weekly cycle with a 5-day first-payout field. One gate is set by trading results and the other by the calendar, so neither is ranked.' },
      { category: 'Automation', winner: 'b', reason: 'Apex’s firm record lists EAs as not allowed. Topstep permits automated strategies subject to conditions.' },
      { category: 'Operating History', winner: 'b', reason: 'Topstep was founded in 2012 and Apex Trader Funding in 2021. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      `Pick Apex if a 100% recorded split, no evaluation consistency rule and the choice between intraday and end-of-day trailing drawdown matter most. Confirm the checkout total first: ${apexUnpricedNote || 'Apex’s selector prices change.'}`,
    whenToPickB:
      'Pick Topstep if payout requests after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request, conditional permission for automated strategies and a firm operating since 2012 matter more than Apex’s 100% split. Both Topstep paths use end-of-day trailing drawdown and a 55% evaluation consistency rule.',
    faqs: [
      { q: 'Is Apex cheaper than Topstep?', a: `The billing differs, so this comparison does not rank cost. At $100K, Apex lists one-time fees of ${apexOneTime100k}. ${apexUnpricedNote} Topstep’s $100K paths are ${topstep100k.priced.length ? topstepMonthly100k : 'not priced in the current capture'}.` },
      { q: 'Which firm has fewer evaluation rules?', a: 'Apex records 0 minimum trading days and no evaluation consistency rule. Topstep applies a 55% consistency rule in the Trading Combine.' },
      { q: 'Can I run an automated futures strategy at Apex or Topstep?', a: 'Apex’s firm record lists EAs as not allowed. Topstep’s Trading Combine parameters permit automated strategies subject to conditions.' },
    ],
  },

  'ftmo-vs-fundednext': {
    matchupSlug: 'ftmo-vs-fundednext',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FTMO vs FundedNext (2026): 2 Products vs 4 Paths',
    metaDescription:
      'FTMO vs FundedNext using current 2026 fees, base splits, drawdowns, refund timing, payout gates, platforms and 6 captured challenge products.',
    tlDr:
      'FTMO 1-Step has the higher captured base split at 90%; FundedNext Stellar 1-Step offers a 6% static maximum loss and a 5-business-day first reward cycle. FTMO 2-Step and FundedNext Stellar 2-Step both start at 80% with a 10% static maximum loss, while their fees use different currencies. FundedNext Stellar Instant starts at 70% with a 6% trailing loss; FundedNext add-ons can raise the share to 95%. Choose the product whose loss mechanics, refund timing and payout gates fit the strategy, then compare checkout totals in the same currency.',
    verdictByCategory: [
      { category: 'Highest Captured Base Split', winner: 'a', reason: 'FTMO 1-Step starts at 90%. FundedNext starts its 3 evaluations at 80% and Stellar Instant at 70%; add-ons can raise the share to 95%.' },
      { category: 'Product Choice', winner: 'b', reason: 'FundedNext has 4 captured paths (Stellar 2-Step, 1-Step, Lite and phase-0 Instant) against FTMO’s 2 evaluation products.' },
      { category: 'First-Payout Gate on Evaluations', winner: 'b', reason: 'FundedNext Stellar 1-Step records a 5-business-day first reward cycle and Stellar Lite 10 business days. Both FTMO products allow on-demand requests after a minimum of 14 days from the first trade; approval and transfer time are separate.' },
      { category: 'Static 1-Step Option', winner: 'b', reason: 'FundedNext Stellar 1-Step uses a 6% static maximum loss. FTMO 1-Step uses a 10% end-of-day trailing line plus a 50% Best Day consistency rule.' },
      { category: 'Platform Coverage', winner: 'tie', reason: 'Both list MT4, MT5 and cTrader. FTMO additionally lists TradingView, while FundedNext lists Match-Trader.' },
      { category: 'Operating History', winner: 'a', reason: 'FTMO was founded in 2015; FundedNext was founded in 2022. This is an age comparison, not a payout guarantee.' },
      { category: 'Aggregate Allocation Field', winner: 'a', reason: 'The current firm records list $2,000,000 for FTMO and $300,000 for FundedNext; scaling milestones still require separate verification.' },
    ],
    whenToPickA:
      'Pick FTMO if the exact product trade-off fits: 2-Step is a refundable €540 $100K route at an 80% base split, 5% daily loss and 10% static maximum loss; 1-Step costs €499 at $100K, starts at 90%, and exchanges the refund for a 3% daily cap, a 10% end-of-day trailing loss and a 50% Best Day consistency rule. FTMO also fits a trader who needs TradingView.',
    whenToPickB:
      withSentence('Pick FundedNext if 4 product paths matter more than a 90% base split. At $100K, Stellar Lite lists $399.99 with an 8% static maximum loss and a 10-business-day first reward, Stellar 2-Step lists $549.99 with a 10% static loss, and Stellar 1-Step lists $569.99 with a 6% static loss and a 5-business-day reward cycle. All 3 evaluations start at 80%; the 95% share needs a paid add-on. New 1-Step fees are refunded with the third reward.', FUNDEDNEXT_NEWS_CREDIT),
    faqs: [
      { q: 'Is FundedNext cheaper than FTMO at $100K?', a: 'The currencies differ, so a percentage comparison needs a live FX rate. Captured list fees are €540 for FTMO 2-Step and €499 for FTMO 1-Step, versus $549.99 for FundedNext Stellar 2-Step, $569.99 for Stellar 1-Step and $399.99 for Stellar Lite.' },
      { q: 'Which has the higher starting profit split?', a: 'FTMO 1-Step starts at 90%. FTMO 2-Step and all 3 FundedNext evaluations start at 80%, while FundedNext Stellar Instant starts at 70%. FundedNext’s 95% figure needs a paid add-on and is not the base split.' },
      { q: 'Which has the faster captured first-payout gate?', a: 'FundedNext Stellar 1-Step uses a 5-business-day first reward cycle and Stellar Lite 10 business days. Both FTMO products allow an on-demand request after a minimum of 14 days from the first trade; FundedNext Stellar 2-Step records 21 days. These are eligibility gates, not settlement times.' },
      { q: 'When are the fees refunded?', a: `${feeRefundSummary('ftmo', 'FTMO')} ${feeRefundSummary('fundednext', 'FundedNext')} FundedNext Stellar 2-Step refunds with the first reward; new Stellar 1-Step accounts wait for the third.` },
      { q: 'Which products have static rather than trailing maximum loss?', a: 'FTMO 2-Step has a 10% static maximum loss; FTMO 1-Step has a 10% end-of-day trailing line. FundedNext Stellar 2-Step, 1-Step and Lite have static maximum losses of 10%, 6% and 8%; Stellar Instant has a 6% trailing line. FTMO has no single firm-wide drawdown type, so compare the exact product.' },
      { q: 'Which platforms does each firm list?', a: 'FTMO lists MT5, MT4, TradingView and cTrader. FundedNext lists MT4, MT5, cTrader and Match-Trader. Platform access can vary by product and account type, so confirm it at checkout.' },
      { q: 'Does the FundedNext partnership change this verdict?', a: 'No. FundedNext outbound links are disclosed affiliate links; FTMO is not configured as a partner. The category calls use the same captured product fields, and the overlay disappears when either firm or challenge capture becomes newer than this review.' },
    ],
  },

  'ftmo-vs-fundingpips': {
    matchupSlug: 'ftmo-vs-fundingpips',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FTMO vs FundingPips (2026): Established Standard vs Cheaper Challenger',
    metaDescription:
      'FTMO vs FundingPips on 8 captured products: base splits, $100K fees, maximum loss, first-payout gates, refunds, platforms and operating history.',
    tlDr:
      'FTMO has 3 captured products: the 2-Step evaluation at 80% with a 10% static maximum loss, the 1-Step evaluation at 90% with a 10% end-of-day trailing line (both with on-demand requests from day 14 after the first trade), and the Instant Account, with no evaluation, at 90% with a 10% trailing limit and a 30% consistency rule. FundingPips has 5 models: 2 Step Pro records the shortest first-payout gate at 7 days, Zero records a 95% split, and the two Flex products allow a 12% static maximum loss. FTMO prices in EUR and FundingPips in USD, so compare checkout totals in one currency.',
    verdictByCategory: [
      // Matchup is alphabetical, so "a" = FTMO and "b" = FundingPips.
      { category: 'Highest Captured Base Split', winner: 'b', reason: 'FundingPips Zero records 95%. FTMO’s highest base split is 90% on 1-Step and the Instant Account; 2-Step starts at 80%.' },
      { category: 'Shortest Numeric First-Payout Gate', winner: 'b', reason: 'FundingPips 2 Step Pro records 7 days. FTMO 2-Step and 1-Step allow requests from the 14th day after the first trade; the Instant Account capture records no numeric first-payout gate.' },
      { category: 'Widest Maximum Loss', winner: 'b', reason: 'FundingPips 1 Step Flex and 2 Step Flex record a 12% static maximum loss. FTMO records 10% on all 3 products: static on 2-Step, end-of-day trailing on 1-Step and trailing on the Instant Account.' },
      { category: 'Product Choice', winner: 'b', reason: 'FundingPips has 5 captured models against FTMO’s 3 (2-Step, 1-Step and Instant Account).' },
      { category: 'Platform Coverage', winner: 'a', reason: 'Both list MT5 and cTrader. FTMO adds MT4 and TradingView; FundingPips adds Match-Trader.' },
      { category: 'Operating History', winner: 'a', reason: 'FTMO was founded in 2015 and FundingPips in 2022. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      'Pick FTMO if you need MT4 or TradingView, or want a 90% base split on 1-Step or the Instant Account. 2-Step costs €540 at $100K with a refundable fee, an 80% split and a 10% static maximum loss; 1-Step costs €499, is non-refundable and uses a 10% end-of-day trailing line with a 50% consistency rule. The Instant Account skips the evaluation for €2,999 at $100K, with a non-refundable fee and a 10% trailing limit.',
    whenToPickB:
      'Pick FundingPips if a 7-day first-payout gate, a 95% split or a 12% maximum loss matters. At $100K, 2 Step Pro lists $422 with a weekly 80% route, Zero $444 with a 95% split, Standard $544, 2 Step Flex $555 and 1 Step Flex $566. A 2 Step Standard fee refund is unconfirmed: the help centre (updated 24 Sep 2026) promises it at the fourth reward, but the Terms (effective 15 May 2026) rule out registration-fee refunds.',
    faqs: [
      { q: 'Does FundingPips pay 100%?', a: 'Only on conditional On Demand routes. 1 Step Flex, 2 Step Flex, 2 Step Pro and 2 Step Standard list an On Demand 100% option with extra eligibility conditions; the stored routes are 80% (1 Step Flex, 2 Step Pro) and 95% (Zero), while 2 Step Flex and Standard have no single split.' },
      { q: 'Which is cheaper at $100K?', a: 'FTMO lists €540 (2-Step) and €499 (1-Step); the Instant Account, which has no evaluation, is €2,999. FundingPips lists $422 to $566 across its 5 models. The currencies differ, so convert at a dated rate before comparing.' },
      { q: 'Are the fees refundable?', a: `${feeRefundSummary('ftmo', 'FTMO')} ${feeRefundSummary('fundingpips', 'FundingPips')} ${FUNDINGPIPS_STANDARD_REFUND_CONFLICT}` },
    ],
  },

  'my-funded-futures-vs-topstep': {
    matchupSlug: 'my-funded-futures-vs-topstep',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'Topstep vs My Funded Futures (2026): Futures Pioneer vs the New Standard',
    metaDescription:
      'Topstep vs My Funded Futures compared on recorded profit split, allocation, platforms, product choice and operating history.',
    tlDr:
      'My Funded Futures has 5 captured products, lists 8 platforms and records a $600,000 maximum allocation; its Rapid and Rapid EOD products pay 90%, while Flex, Pro and Builder pay 80%. Topstep has 2 Trading Combine paths at 90%, both with end-of-day trailing drawdown and payout requests after qualifying trading days, a $500,000 maximum allocation and an operating history from 2012.',
    verdictByCategory: [
      // NOTE: matchup is alphabetised so "a" = My Funded Futures, "b" = Topstep.
      { category: 'Recorded Profit Split', winner: 'b', reason: 'Both Topstep paths record 90%. My Funded Futures records 90% on Rapid and Rapid EOD and 80% on Flex, Pro and Builder.' },
      { category: 'Max Allocation', winner: 'a', reason: 'The firm records list $600,000 for My Funded Futures and $500,000 for Topstep.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'My Funded Futures lists NinjaTrader, Tradovate, TradingView, Quantower and 4 more platforms. Topstep lists TopstepX and Quantower.' },
      { category: 'Product Choice', winner: 'a', reason: 'My Funded Futures has 5 captured products against Topstep’s 2 Trading Combine paths.' },
      { category: 'Operating History', winner: 'b', reason: 'Topstep was founded in 2012 and My Funded Futures in 2023. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      `Pick My Funded Futures if you want Tradovate, NinjaTrader or TradingView access, a choice of 5 products and the higher recorded $600,000 allocation. At $100K, ${mffOneOff100kPick}.`,
    whenToPickB:
      'Pick Topstep if a 90% split on every path, payout requests after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request, and a firm operating since 2012 matter more than platform choice. At $100K, the Standard path is $99 a month plus a $149 activation fee, and the No Activation Fee path is $149 a month.',
    faqs: [
      { q: 'Which firm has the larger maximum allocation?', a: 'My Funded Futures: its firm record lists $600,000 against Topstep’s $500,000.' },
      { q: 'How do the $100K prices compare?', a: `My Funded Futures sells one-off evaluations (${mffOneOff100kPrices} at $100K). Topstep sells monthly subscriptions: $99 a month plus $149 activation, or $149 a month with no activation fee. The cheaper route depends on how many months the evaluation takes.` },
      { q: 'What drawdown do they use?', a: 'Both firms record end-of-day trailing drawdown in the evaluation. My Funded Futures Rapid switches to intraday trailing in the funded stage; Rapid EOD, Pro and Builder keep end-of-day trailing.' },
    ],
  },

  'topstep-vs-tradeday': {
    matchupSlug: 'topstep-vs-tradeday',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'Topstep vs TradeDay (2026): Structure vs Day-One Payout Access',
    metaDescription:
      'Topstep vs TradeDay compared on evaluation cost, drawdown, profit split, payout eligibility, activation fees and platforms using first-party captures.',
    tlDr:
      'Topstep records a 90% split on both Trading Combine paths, end-of-day trailing drawdown and payout requests after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request. TradeDay has 3 captured products with no activation fee: Quick Pay (Intraday or End of Day) records a 1-day first-payout field and a tiered Funded Sim split (50% below $4,000 current profit, 80% above it, 90% on Funded Live), while Fast Pass End of Day records 80%, a 5-day first-payout field and end-of-day drawdown in the funded stage.',
    verdictByCategory: [
      // Matchup is alphabetised, so "a" = Topstep and "b" = TradeDay.
      { category: 'Starting Profit Split', winner: 'a', reason: 'Both Topstep paths record 90%. TradeDay Quick Pay starts at 50% on Funded Sim (80% above $4,000 current profit, 90% on Funded Live) and Fast Pass records 80%.' },
      { category: 'First Payout Field', winner: 'b', reason: 'TradeDay Quick Pay records a 1-day first-payout field and Fast Pass 5 days. Topstep’s captures carry no numeric first-payout field.' },
      { category: 'Evaluation Drawdown Choice', winner: 'b', reason: 'TradeDay offers intraday trailing and end-of-day trailing evaluation paths. Both Topstep paths record end-of-day trailing.' },
      { category: 'Activation Fee', winner: 'b', reason: 'TradeDay’s 3 products record no activation fee. Topstep’s Standard path adds $149 after passing; its No Activation Fee path costs more per month.' },
      { category: 'Lowest $100K Monthly Fee', winner: 'a', reason: 'Topstep’s Standard path is $99 a month (plus $149 activation) and its No Activation Fee path $149. TradeDay lists $240, $285 and $350 a month.' },
      { category: 'Operating History', winner: 'a', reason: 'Topstep was founded in 2012 and TradeDay in 2020. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      'Pick Topstep if a 90% split, the lowest $100K monthly fee and payout requests after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request matter more than an early first request. Both paths use end-of-day trailing drawdown and a 55% evaluation consistency rule.',
    whenToPickB:
      'Pick TradeDay if you want a choice of intraday or end-of-day evaluation drawdown, no activation fee, or Quick Pay’s 1-day first-payout field and can accept its 50% split below $4,000 current profit (80% above it, 90% on Funded Live). Fast Pass End of Day records 80% and keeps end-of-day drawdown after passing; Quick Pay switches to intraday trailing in the funded stage.',
    faqs: [
      { q: 'Is TradeDay cheaper than Topstep?', a: 'At $100K, Topstep lists $99 a month plus a $149 activation fee, or $149 a month with no activation fee. TradeDay lists $240 (Quick Pay Intraday), $285 (Quick Pay End of Day) and $350 (Fast Pass End of Day) a month with no activation fee.' },
      { q: 'Which firm lets me request a payout sooner?', a: 'TradeDay Quick Pay records a 1-day first-payout field and Fast Pass 5 days. Topstep opens a request after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request; its captures carry no numeric first-payout field.' },
      { q: 'Which drawdown is easier to manage?', a: 'For evaluation, both offer an end-of-day trailing route; TradeDay also offers intraday trailing. After passing, TradeDay Fast Pass keeps end-of-day trailing and Quick Pay uses intraday trailing, so the exact product matters more than the firm name.' },
    ],
  },

  'take-profit-trader-vs-topstep': {
    matchupSlug: 'take-profit-trader-vs-topstep',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'Take Profit Trader vs Topstep (2026): No Daily Limit vs the Futures Veteran',
    metaDescription:
      'Take Profit Trader vs Topstep compared on profit split, $100K cost, first-payout timing, platforms, automation and operating history.',
    tlDr:
      'Take Profit Trader’s Test records an 80% split, end-of-day trailing drawdown, 3 minimum trading days, a 50% evaluation consistency rule and payouts from the first funded day; it costs $330 a month at $100K plus a $130 activation fee. Topstep records 90% on both paths, end-of-day trailing drawdown, a 55% evaluation consistency rule and a lower $100K monthly fee, with a $500,000 maximum allocation against Take Profit Trader’s $150,000.',
    verdictByCategory: [
      // NOTE: matchup is alphabetised so "a" = Take Profit Trader, "b" = Topstep.
      { category: 'Profit Split', winner: 'b', reason: 'Both Topstep paths record 90%. Take Profit Trader’s Test records 80%.' },
      { category: 'First Payout Field', winner: 'a', reason: 'Take Profit Trader records payouts from day 0 of the funded stage. Topstep’s captures carry no numeric first-payout field.' },
      { category: '$100K Cost', winner: 'b', reason: 'Topstep is $99 a month plus $149 activation, or $149 a month with none. Take Profit Trader is $330 a month plus $130 activation.' },
      { category: 'Max Allocation', winner: 'b', reason: 'The firm records list $500,000 for Topstep and $150,000 for Take Profit Trader.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'Take Profit Trader lists 14 platforms including NinjaTrader, Tradovate and TradingView. Topstep lists TopstepX and Quantower.' },
      { category: 'Automation', winner: 'b', reason: 'Take Profit Trader’s firm record lists EAs as not allowed. Topstep permits automated strategies subject to conditions.' },
      { category: 'Operating History', winner: 'b', reason: 'Topstep was founded in 2012 and Take Profit Trader in 2021. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      'Pick Take Profit Trader if a payout from the first funded day and a wide platform list matter more than the split. The $100K Test costs $330 a month plus a $130 activation fee, records 3 minimum trading days and a 50% evaluation consistency rule, and pays 80%.',
    whenToPickB:
      'Pick Topstep if a 90% split, a lower $100K monthly fee, the larger $500,000 allocation and conditional permission for automated strategies matter more. Both paths use end-of-day trailing drawdown and a 55% evaluation consistency rule.',
    faqs: [
      { q: 'Take Profit Trader vs Topstep: which is cheaper?', a: 'At $100K, Take Profit Trader lists $330 a month plus a $130 activation fee. Topstep lists $99 a month plus $149 activation, or $149 a month with no activation fee.' },
      { q: 'Which pays out sooner?', a: 'Take Profit Trader records payouts from the first funded day. Topstep opens a request after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request; its captures carry no numeric first-payout field.' },
      { q: 'Do both use the same drawdown?', a: 'Both record end-of-day trailing drawdown in the evaluation. Neither capture records a daily loss percentage.' },
    ],
  },

  'fundednext-vs-fundingpips': {
    matchupSlug: 'fundednext-vs-fundingpips',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FundedNext vs FundingPips (2026): 4 Paths vs 5 Models',
    metaDescription:
      'FundedNext vs FundingPips using 2026 prices, 9 captured products, base or selectable splits, payout gates, drawdowns, platforms and refund timing.',
    tlDr:
      'FundedNext’s 4 paths use an 80% base split on 3 evaluations and 70% on Instant; add-ons can raise the share to 95%. FundingPips has 5 models: captured base splits of 80% on 1 Step Flex and 2 Step Pro and 95% on Zero, plus buyer-selected split-and-payout structures on 2 Step Flex and Standard. At $100K, FundedNext Lite lists $399.99 against FundingPips 2 Step Pro at $422, while FundingPips offers the wider 12% static cap on its Flex products. Choose the exact product, not one firm-wide split or payout label.',
    verdictByCategory: [
      { category: 'Highest Captured Split Option', winner: 'b', reason: 'FundingPips lists a conditional On Demand 100% route on 4 models and Zero records 95%. FundedNext evaluations start at 80%; 95% needs a paid add-on.' },
      { category: 'Cheapest $100K List Fee', winner: 'a', reason: 'FundedNext Stellar Lite lists $399.99. FundingPips 2 Step Pro is its cheapest $100K route at $422; the products carry different targets and loss caps.' },
      { category: 'Shortest Numeric First-Payout Gate', winner: 'a', reason: 'FundedNext Stellar 1-Step records 5 business days. FundingPips 2 Step Pro records 7 days; its other numeric gates are 14 days.' },
      { category: 'Widest Static Maximum Loss', winner: 'b', reason: 'FundingPips 1 Step Flex and 2 Step Flex record 12% static caps. FundedNext’s widest captured static cap is 10% on Stellar 2-Step.' },
      { category: 'Product Choice', winner: 'b', reason: 'FundingPips has 5 captured models against FundedNext’s 4 paths, including selectable payout structures that cannot be flattened into one firm-wide rate.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'Both list MT5, cTrader and Match-Trader; FundedNext additionally lists MT4.' },
      { category: 'Refund Coverage', winner: 'a', reason: 'FundedNext’s 3 evaluation fees are refundable. FundingPips’ 2 Step Standard refund is unconfirmed (help centre, updated 24 Sep 2026: refunded at the fourth reward; Terms, effective 15 May 2026: no refund of registration fees), and its other products list no refund.' },
    ],
    whenToPickA:
      withSentence('Pick FundedNext if a lower $100K list fee, MT4 or an earlier numeric payout gate matters. Stellar Lite is $399.99 at $100K with an 8% static cap and a 10-business-day first reward; Stellar 1-Step is $569.99 with a 6% static cap, 2 minimum evaluation days and a 5-business-day first reward. All evaluations start at 80%, and new 1-Step fees are refunded with the third reward. Do not price the paid 95% add-on as the base product.', FUNDEDNEXT_NEWS_CREDIT),
    whenToPickB:
      'Pick FundingPips if the chosen split-and-payout structure fits the strategy. 2 Step Pro lists $422 at $100K with 6% and 6% targets, a 6% static cap, 0 minimum days, an 80% split and a 7-day weekly reward cycle. Standard instead offers Weekly 60%, Bi-Weekly 80% or On Demand 100%, each with its own conditions. The 12% Flex caps provide more starting room. Do not count on a Standard fee refund: the help centre and the Terms conflict on it.',
    faqs: [
      { q: 'Which is cheaper at the $100K tier?', a: 'FundedNext Stellar Lite is the lowest captured list fee at $399.99. FundingPips 2 Step Pro is $422, Zero is $444, Standard is $544, 2 Step Flex is $555 and 1 Step Flex is $566. Compare targets, split and drawdown before using fee alone.' },
      { q: 'Which has the higher profit split?', a: 'It depends on the product. FundedNext evaluations start at 80% and Instant at 70%. FundingPips records base splits of 80% on 1 Step Flex and 2 Step Pro (each with a conditional On Demand 100% route) and 95% on Zero; 2 Step Flex and Standard use selectable structures, including an On Demand 100% choice.' },
      { q: 'Which gets to a first payout sooner?', a: 'The shortest numeric capture is FundedNext Stellar 1-Step at 5 business days, followed by FundingPips 2 Step Pro at 7 days. FundedNext Lite records 10 business days and 2-Step 21 days; FundingPips 1 Step Flex, 2 Step Flex and Zero record 14 days.' },
      { q: 'Do both refund the challenge fee?', a: `${feeRefundSummary('fundednext', 'FundedNext')} ${feeRefundSummary('fundingpips', 'FundingPips')} ${FUNDINGPIPS_STANDARD_REFUND_CONFLICT}` },
      { q: 'Both are affiliate partners—does that decide the winner?', a: 'No. Both outbound routes are disclosed affiliate links. The verdict names product-level trade-offs instead of one overall winner, and it disappears when either firm or product capture becomes newer than this review.' },
    ],
  },

  'ftmo-vs-fxify': {
    matchupSlug: 'ftmo-vs-fxify',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FTMO vs FXIFY (2026): The Safe Default vs the Flexible Challenger',
    metaDescription:
      'FTMO vs FXIFY on captured splits, $100K fees, drawdown, payout cadence, allocation, platforms, automation and operating history.',
    tlDr:
      'FTMO has 2 evaluations: 2-Step at 80% with a 10% static maximum loss and 1-Step at 90% with a 10% end-of-day trailing line, both with on-demand requests from the 14th day after the first trade. FXIFY has 10 captured products; its phase products record an 80% standard split, and One Phase, Two Phase Classic, Two Phase Standard and Three Phase pay on a monthly cycle. FXIFY records a $4,000,000 allocation against FTMO’s $2,000,000 and lists DXTrade, while FTMO lists cTrader.',
    verdictByCategory: [
      // Matchup is alphabetical, so "a" = FTMO and "b" = FXIFY.
      { category: 'Highest Captured Base Split', winner: 'a', reason: 'FTMO 1-Step starts at 90%. FXIFY’s phase products record an 80% standard split; One Phase and the Two Phase products sell 90% as a checkout upgrade.' },
      { category: 'Payout Cadence', winner: 'a', reason: 'Both FTMO products allow on-demand requests from day 14. FXIFY records a monthly cycle on One Phase, Two Phase Classic, Two Phase Standard and Three Phase.' },
      { category: 'Max Allocation', winner: 'b', reason: 'The firm records list $4,000,000 for FXIFY and $2,000,000 for FTMO.' },
      { category: 'Platform Coverage', winner: 'tie', reason: 'Both list MT4, MT5 and TradingView. FTMO adds cTrader; FXIFY adds DXTrade.' },
      { category: 'Cheapest $100K List Fee', winner: 'b', reason: 'FXIFY Three Phase and Lightning list $399 at $100K. FTMO lists €499 (1-Step) and €540 (2-Step), so compare in one currency before paying.' },
      { category: 'Operating History', winner: 'a', reason: 'FTMO was founded in 2015 and FXIFY in 2022. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      'Pick FTMO if you trade on cTrader, want a 90% base split on 1-Step, or prefer on-demand requests after day 14 to a monthly cycle. 2-Step costs €540 at $100K with a refundable fee and a 10% static maximum loss; 1-Step costs €499 and uses a 10% end-of-day trailing line.',
    whenToPickB:
      'Pick FXIFY if a $399 $100K entry (Three Phase or Lightning), DXTrade or the larger $4,000,000 allocation matters. EAs are allowed on the 1, 2 and 3 Phase products only with pre-approval and never on DXTrade. Lightning and both Instant Funding products publish only an “up to 90%” split, so check the base split first.',
    faqs: [
      { q: 'Do FTMO and FXIFY have the same drawdown rules?', a: 'No single rule covers either firm. FTMO 2-Step is static at 10% and FTMO 1-Step trails at end of day. FXIFY Two Phase Classic, Two Phase Pro and Three Phase are static, while One Phase, Two Phase Standard, Lightning and the Instant products trail. Check the product you buy.' },
      { q: 'Can I run an EA at FXIFY?', a: 'Only with pre-approval. FXIFY allows EAs on its 1, 2 and 3 Phase challenges and their funded stage after review by support, and prohibits them on DXTrade. FTMO’s firm record also lists EAs as restricted.' },
      { q: 'Which is better value at the $100K tier?', a: `FXIFY Three Phase and Lightning list $399; FTMO lists €499 and €540. Refunds depend on the product: ${feeRefundSummary('ftmo', 'FTMO')} ${feeRefundSummary('fxify', 'FXIFY')}` },
    ],
  },

  'ftmo-vs-topstep': {
    matchupSlug: 'ftmo-vs-topstep',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FTMO vs Topstep (2026): CFD Forex vs Futures — Not the Same Decision',
    metaDescription:
      'FTMO vs Topstep is a CFD-vs-futures choice, not a like-for-like comparison. We compare splits, drawdown, payout cadence, allocation and operating history.',
    tlDr:
      'These two do not compete for the same trader: FTMO’s 2 products are CFD evaluations and Topstep’s 2 Trading Combine paths are futures. Both reach a 90% split (FTMO only on 1-Step), both gate payout requests (FTMO from day 14 after the first trade, Topstep after qualifying trading days), and their drawdown differs by product: FTMO 2-Step is static, FTMO 1-Step and both Topstep paths trail at end of day. Choose by asset class first, then by rules.',
    verdictByCategory: [
      // matchup is alphabetised so "a" = FTMO, "b" = Topstep.
      { category: 'Profit Split', winner: 'b', reason: 'Both Topstep paths record 90%. FTMO records 90% on 1-Step and 80% on 2-Step.' },
      { category: 'Static Drawdown Option', winner: 'a', reason: 'FTMO 2-Step has a 10% static maximum loss. FTMO 1-Step and both Topstep paths use end-of-day trailing drawdown.' },
      { category: 'First Payout Request', winner: 'tie', reason: 'FTMO opens requests from the 14th day after the first trade. Topstep opens a request after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request; its captures carry no numeric first-payout field.' },
      { category: 'Max Allocation', winner: 'a', reason: 'The firm records list $2,000,000 for FTMO and $500,000 for Topstep.' },
      { category: 'Operating History', winner: 'b', reason: 'Topstep was founded in 2012 and FTMO in 2015. This is an age comparison, not a payout guarantee.' },
    ],
    whenToPickA:
      'Pick FTMO if you trade CFDs and want a static-drawdown route (2-Step, 10% static maximum loss) or a 90% split on 1-Step. Both FTMO products allow on-demand requests from day 14 after the first trade.',
    whenToPickB:
      'Pick Topstep if you trade futures. Both Trading Combine paths record a 90% split, end-of-day trailing drawdown, a 55% evaluation consistency rule and payout requests after 5 winning days of $150+ or 3 trading days within a 40% consistency target, with a $125 minimum request.',
    faqs: [
      { q: 'Can I compare FTMO and Topstep on price directly?', a: 'Not cleanly. FTMO sells one-off CFD evaluations (€540 for 2-Step and €499 for 1-Step at $100K). Topstep sells monthly futures subscriptions ($99 a month plus $149 activation, or $149 a month with none, at $100K).' },
      { q: 'Which has easier drawdown rules?', a: 'FTMO 2-Step is the only static option here: its 10% maximum loss does not trail. FTMO 1-Step and both Topstep paths trail at end of day.' },
      { q: 'Does FTMO have a firm-wide drawdown type?', a: 'No. FTMO’s firm record leaves drawdown type empty because its 2 products differ: 2-Step is static and 1-Step trails at end of day.' },
    ],
  },

  'fundednext-vs-fxify': {
    matchupSlug: 'fundednext-vs-fxify',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FundedNext vs FXIFY (2026): 4 Paths vs 10 Products',
    metaDescription:
      'FundedNext vs FXIFY using 2026 prices, 14 captured products, verified base splits, payout gates, drawdowns, platforms, automation and refund rules.',
    tlDr:
      'FundedNext has 4 paths with every base split quantified: 80% on 3 evaluations and 70% on Stellar Instant. FXIFY has 10 captured products; its phase products record an 80% standard split, while both Instant Funding products and Lightning publish only “up to 90%” and remain null in structured data. At $100K, FXIFY Three Phase and Lightning list $399 versus FundedNext Lite at $399.99. Pick FundedNext for fully quantified splits and static evaluation drawdowns; pick FXIFY for broader product and platform choice.',
    verdictByCategory: [
      { category: 'Base-Split Completeness', winner: 'a', reason: 'All 4 FundedNext products have captured base splits. FXIFY leaves 3 products null because “up to 90%” does not establish a starting percentage.' },
      { category: 'Product Choice', winner: 'b', reason: 'FXIFY has 10 captured products across 0-, 1-, 2- and 3-phase paths, including 2 crypto products. FundedNext has 4.' },
      { category: 'Cheapest $100K List Fee', winner: 'b', reason: 'FXIFY Three Phase and Lightning list $399, compared with FundedNext Stellar Lite at $399.99. Lightning’s base split remains unverified.' },
      { category: 'Shortest Numeric First-Payout Gate', winner: 'a', reason: 'FundedNext Stellar 1-Step records 5 business days. FXIFY Lightning records 7 days; several FXIFY products have no numeric first-payout field.' },
      { category: 'Static Evaluation Drawdown', winner: 'a', reason: 'All 3 FundedNext evaluations record static maximum loss. FXIFY mixes static (Two Phase Classic, Two Phase Pro, Three Phase) and trailing products.' },
      { category: 'Automation', winner: 'tie', reason: 'Both firm records list EAs as restricted. FXIFY allows them on 1, 2 and 3 Phase products only with pre-approval and never on DXTrade.' },
      { category: 'Platform Choice', winner: 'tie', reason: 'Both list MT4 and MT5. FundedNext adds cTrader and Match-Trader; FXIFY adds DXTrade and TradingView.' },
    ],
    whenToPickA:
      withSentence('Pick FundedNext if you want every starting split and drawdown field quantified before checkout. Stellar Lite is $399.99 at $100K with an 80% split, an 8% static cap and a 10-business-day first reward; Stellar 1-Step is $569.99 with an 80% split, a 6% static cap and a 5-business-day first reward. Do not price the paid 95% add-on as the base product.', FUNDEDNEXT_NEWS_CREDIT),
    whenToPickB:
      'Pick FXIFY if product choice, DXTrade or TradingView matters more than the gaps in 3 base splits. At $100K, Three Phase costs $399 with 5% targets in 3 stages, a 5% static cap and an 80% split; Lightning also costs $399 with a 5% target, a 4% trailing cap and a 5-day maximum, but no verified base split. EAs need pre-approval and are prohibited on DXTrade.',
    faqs: [
      { q: 'Which is cheaper at $100K?', a: 'FXIFY Three Phase and Lightning are $399; FundedNext Stellar Lite is $399.99. The rules matter more than the 99-cent gap: Three Phase has 3 stages and an 80% split, Lightning trails at 4% with no verified base split, and Lite uses 2 stages with an 8% static cap.' },
      { q: 'Which has the higher base profit split?', a: 'FundedNext evaluations and FXIFY’s phase products all record 80%. FundedNext Instant records 70%. FXIFY’s 2 Instant Funding products and Lightning publish only “up to 90%,” so an exact starting split is not verified.' },
      { q: 'Which has the faster first-payout gate?', a: 'FundedNext Stellar 1-Step has the shortest numeric capture at 5 business days. FXIFY Lightning records 7 days, Two Phase Pro and Instant Funding Lite 10 days, and Instant Funding Standard 14 days; other FXIFY products have no numeric field.' },
      { q: 'Which is better for EAs?', a: 'Neither is unrestricted. FXIFY allows EAs on its 1, 2 and 3 Phase products and their funded stage after support review and pre-approval, and prohibits them on DXTrade. FundedNext’s firm record lists EAs as restricted.' },
      { q: 'Is FundedNext an affiliate while FXIFY is not?', a: 'Yes. FundedNext outbound links are disclosed affiliate links; FXIFY uses its public first-party destination. Commercial status contributes 0 points, and this overlay fails closed when either product capture becomes newer than its review date.' },
    ],
  },

  'fundingpips-vs-fxify': {
    matchupSlug: 'fundingpips-vs-fxify',
    reviewedAt: '2026-10-21',
    challengeReviewedAt: '2026-10-21',
    h1: 'FundingPips vs FXIFY (2026): Top Split vs Speed and Ceiling',
    metaDescription:
      'FundingPips vs FXIFY compared on captured splits, $100K fees, maximum loss, payout gates, allocation, platforms and automation.',
    tlDr:
      'FundingPips has 5 models: Zero records a 95% split, 2 Step Pro a 7-day first-payout gate, and the Flex products a 12% static maximum loss. FXIFY has 10 captured products with an 80% standard split on its phase products, the cheaper $399 $100K entry on Three Phase and Lightning, and a $4,000,000 allocation against FundingPips’ $2,000,000.',
    verdictByCategory: [
      // Matchup is alphabetical, so "a" = FundingPips and "b" = FXIFY.
      { category: 'Highest Captured Base Split', winner: 'a', reason: 'FundingPips Zero records 95%. FXIFY’s phase products record an 80% standard split.' },
      { category: 'Cheapest $100K List Fee', winner: 'b', reason: 'FXIFY Three Phase and Lightning list $399. FundingPips’ cheapest $100K route is 2 Step Pro at $422.' },
      { category: 'Widest Maximum Loss', winner: 'a', reason: 'FundingPips 1 Step Flex and 2 Step Flex record a 12% static cap. FXIFY’s widest is 10% (Two Phase Classic and Two Phase Standard).' },
      { category: 'Shortest Numeric First-Payout Gate', winner: 'tie', reason: 'FundingPips 2 Step Pro and FXIFY Lightning both record 7 days.' },
      { category: 'Max Allocation', winner: 'b', reason: 'The firm records list $4,000,000 for FXIFY and $2,000,000 for FundingPips.' },
      { category: 'Platform Coverage', winner: 'tie', reason: 'Both list MT5. FundingPips adds cTrader and Match-Trader; FXIFY adds MT4, DXTrade and TradingView.' },
    ],
    whenToPickA:
      'Pick FundingPips if a 95% split (Zero), a 12% static maximum loss (Flex) or cTrader matters. 2 Step Pro lists $422 at $100K with a weekly 80% route and a 7-day first-payout gate. A 2 Step Standard fee refund is unconfirmed because the help centre and the Terms conflict on it.',
    whenToPickB:
      'Pick FXIFY if the $399 $100K entry, the larger $4,000,000 allocation, MT4, DXTrade or TradingView matters. Its phase products record 80% as standard; EAs need pre-approval and are prohibited on DXTrade.',
    faqs: [
      { q: 'Does FundingPips pay 100%?', a: 'Only on conditional On Demand routes, which need extra eligibility conditions. The stored splits are 80% on 1 Step Flex and 2 Step Pro and 95% on Zero; 2 Step Flex and Standard have no single split.' },
      { q: 'Which is cheaper at $100K?', a: 'FXIFY Three Phase and Lightning list $399. FundingPips lists $422 (2 Step Pro), $444 (Zero), $544 (Standard), $555 (2 Step Flex) and $566 (1 Step Flex).' },
      { q: 'Are the fees refundable?', a: `${feeRefundSummary('fundingpips', 'FundingPips')} ${feeRefundSummary('fxify', 'FXIFY')} ${FUNDINGPIPS_STANDARD_REFUND_CONFLICT}` },
    ],
  },

}

/**
 * Hard off-switch for the hand-written overlays (Phase 1 rollout, 2026-10-20).
 * Their text contradicts current captures in several places (platform lists,
 * payout cadence, consistency targets), and the Phase 1 pick block replaces
 * whenToPickA/B. Re-dating an overlay must not bring it back; it needs a
 * rewrite and an explicit change here first.
 */
export const COMPARISON_OVERLAYS_ENABLED = false

export function getOverlay(matchupSlug: string, now = new Date()): ComparisonOverlay | undefined {
  if (!COMPARISON_OVERLAYS_ENABLED) return undefined
  return getOverlayIfCurrent(matchupSlug, now)
}

/**
 * The freshness gates alone, ignoring the off-switch: the overlay is returned only when both
 * firms and all their products are fresh and none was updated after the overlay's review dates.
 * Exported so tests can check the gates while COMPARISON_OVERLAYS_ENABLED is false.
 */
export function getOverlayIfCurrent(matchupSlug: string, now = new Date()): ComparisonOverlay | undefined {
  const overlay = COMPARISON_OVERLAYS[matchupSlug]
  if (!overlay?.reviewedAt || !overlay.challengeReviewedAt) return undefined

  const parsed = parseMatchup(matchupSlug)
  if (!parsed) return undefined

  const firmA = findFirmBySlug(parsed.a)
  const firmB = findFirmBySlug(parsed.b)
  const productsA = getChallengesByFirm(parsed.a)
  const productsB = getChallengesByFirm(parsed.b)
  if (!productsA.length || !productsB.length
    || [...productsA, ...productsB].some(product => !isChallengeFresh(product, now))
    || !isChallengeFresh({ sourceCapturedAt: overlay.reviewedAt }, now)
    || !isChallengeFresh({ sourceCapturedAt: overlay.challengeReviewedAt }, now)) return undefined
  const latestFirmUpdate = [firmA?.lastUpdated, firmB?.lastUpdated]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
  const latestProductCapture = [
    ...productsA,
    ...productsB,
  ]
    .map(challenge => challenge.sourceCapturedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  // Hand-written copy fails closed when either the aggregate or any product
  // capture is newer. The page remains useful through its data-driven tables
  // and generated product-level summary.
  if (
    !firmA ||
    !firmB ||
    !latestFirmUpdate ||
    !latestProductCapture ||
    overlay.reviewedAt < latestFirmUpdate ||
    overlay.challengeReviewedAt < latestProductCapture
  ) {
    return undefined
  }

  return overlay
}

/**
 * Only expose editorial overlays that have passed the aggregate and
 * product-capture freshness gate. Hub pages must use this projection rather
 * than reading COMPARISON_OVERLAYS directly, otherwise stale copy can leak
 * even while the individual matchup route correctly fails closed.
 */
export function getActiveOverlays(now = new Date()): ComparisonOverlay[] {
  return Object.keys(COMPARISON_OVERLAYS)
    .map(matchupSlug => getOverlay(matchupSlug, now))
    .filter((overlay): overlay is ComparisonOverlay => Boolean(overlay))
}

/* ── Per-row comparison + winner algorithm ────────────────────── */

export type SpecKind =
  | 'numeric-higher'      // higher is better (profit split, score, max allocation $)
  | 'numeric-lower'       // lower is better (min trading days)
  | 'enum-payout-freq'    // on-demand > weekly > bi-weekly > monthly
  | 'drawdown'            // static beats trailing/eod-trailing/balance-based
  | 'boolean-true'        // true beats false
  | 'list-overlap'        // larger set wins (platforms, assets, payout methods)
  | 'display-only'        // no winner — just show values (founded, name)

export interface SpecRow {
  label: string
  kind: SpecKind
  valueA: unknown
  valueB: unknown
  winner: WinnerSide | null
  /** Optional formatter for display — defaults sensible per kind. */
  format?: (v: unknown) => string
}

function fmtList(v: unknown): string {
  if (Array.isArray(v)) return v.join(' · ')
  if (v == null) return '—'
  return String(v)
}

function fmtBool(v: unknown): string {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v === 'restricted') return 'Restricted'
  return '—'
}

function fmtTitleCase(v: unknown): string {
  if (v == null) return '—'
  return String(v).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtPct(v: unknown): string {
  return v == null ? '—' : `${v}%`
}

function parseAllocation(v: unknown): number {
  if (typeof v !== 'string') return 0
  const firstAmount = v.match(/\$?\s*([\d,]+(?:\.\d+)?)/)?.[1]
  const cleaned = firstAmount?.replace(/,/g, '') ?? ''
  return parseFloat(cleaned) || 0
}

function rankPayout(freq: unknown): number {
  switch (freq) {
    case 'on-demand': return 4
    case 'weekly': return 3
    case 'bi-weekly': return 2
    case 'monthly': return 1
    default: return 0
  }
}

function rankDrawdown(dd: unknown): number {
  switch (dd) {
    case 'static': return 3
    case 'balance-based': return 3
    case 'eod-trailing': return 2
    case 'trailing': return 1
    default: return 0
  }
}

function compareWinner(kind: SpecKind, a: unknown, b: unknown): WinnerSide | null {
  if (kind === 'display-only') return null
  // If either side is missing data, refuse to declare a winner. The
  // pre-fix behaviour treated null as "loses by default" which produced
  // misleading rows like "Min Trading Days (0 vs —) — Firm A wins" — but
  // we don't know what the null side's value actually is. Honest absence
  // beats a false call.
  if (a == null || b == null) return null

  switch (kind) {
    case 'numeric-higher':
      return (a as number) > (b as number) ? 'a' : (b as number) > (a as number) ? 'b' : 'tie'
    case 'numeric-lower':
      return (a as number) < (b as number) ? 'a' : (b as number) < (a as number) ? 'b' : 'tie'
    case 'enum-payout-freq': {
      // 'after-qualifying-days' depends on trading results, not the calendar,
      // so it cannot be ranked against a fixed cycle: never pick a winner.
      if (a === 'after-qualifying-days' || b === 'after-qualifying-days') return 'tie'
      const ra = rankPayout(a), rb = rankPayout(b)
      return ra > rb ? 'a' : rb > ra ? 'b' : 'tie'
    }
    case 'drawdown': {
      const ra = rankDrawdown(a), rb = rankDrawdown(b)
      return ra > rb ? 'a' : rb > ra ? 'b' : 'tie'
    }
    case 'boolean-true':
      if (a === b) return 'tie'
      {
        const rank = (value: unknown) =>
          value === true ? 2 : value === 'restricted' ? 1 : value === false ? 0 : -1
        const ra = rank(a), rb = rank(b)
        return ra > rb ? 'a' : rb > ra ? 'b' : 'tie'
      }
    case 'list-overlap': {
      const la = Array.isArray(a) ? a.length : 0
      const lb = Array.isArray(b) ? b.length : 0
      return la > lb ? 'a' : lb > la ? 'b' : 'tie'
    }
  }
}

/** Build the table of spec rows for a matchup, skipping rows where both sides are null. */
export function buildSpecTable(firmA: Firm, firmB: Firm): SpecRow[] {
  const defs: Array<Omit<SpecRow, 'winner' | 'valueA' | 'valueB'> & {
    getA: (f: Firm) => unknown
    getB: (f: Firm) => unknown
  }> = [
    // Score is our own editorial rating, not a firm-published spec — show it
    // for context but don't decorate either side as "winner" on it.
    { label: 'Score', kind: 'display-only', getA: f => f.score, getB: f => f.score, format: v => `${v} / 10` },
    { label: 'Profit Split', kind: 'numeric-higher', getA: f => f.profitSplitPct, getB: f => f.profitSplitPct, format: fmtPct },
    { label: 'Payout Frequency', kind: 'enum-payout-freq', getA: f => f.payoutFrequency, getB: f => f.payoutFrequency, format: fmtTitleCase },
    { label: 'Drawdown Type', kind: 'drawdown', getA: f => f.drawdownType, getB: f => f.drawdownType, format: fmtTitleCase },
    {
      label: 'Max Allocation',
      kind: 'numeric-higher',
      getA: f => parseAllocation(f.maxAllocation),
      getB: f => parseAllocation(f.maxAllocation),
      format: v => {
        if (typeof v !== 'number' || !v) return '—'
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`
        return `$${v.toLocaleString()}`
      },
    },
    { label: 'Min Trading Days', kind: 'numeric-lower', getA: f => f.minTradingDays, getB: f => f.minTradingDays, format: v => v == null ? '—' : String(v) },
    { label: 'Founded', kind: 'display-only', getA: f => f.founded, getB: f => f.founded },
    { label: 'Platforms', kind: 'list-overlap', getA: f => f.platforms, getB: f => f.platforms, format: fmtList },
    { label: 'Assets', kind: 'list-overlap', getA: f => f.assets, getB: f => f.assets, format: fmtList },
    // Preserve unknown as unknown. Coercing a missing payout-method capture
    // to [] made the other firm "win" by default even though the comparison
    // had no evidence for one side.
    { label: 'Payout Methods', kind: 'list-overlap', getA: f => f.payoutMethods, getB: f => f.payoutMethods, format: fmtList },
    { label: 'EAs Allowed', kind: 'boolean-true', getA: f => f.eaAllowed, getB: f => f.eaAllowed, format: fmtBool },
    { label: 'News Trading', kind: 'boolean-true', getA: f => f.newsTradingAllowed, getB: f => f.newsTradingAllowed, format: fmtBool },
    { label: 'Overnight Holding', kind: 'boolean-true', getA: f => f.overnightAllowed, getB: f => f.overnightAllowed, format: fmtBool },
    { label: 'Weekend Holding', kind: 'boolean-true', getA: f => f.weekendAllowed, getB: f => f.weekendAllowed, format: fmtBool },
    { label: 'Copy Trading', kind: 'boolean-true', getA: f => f.copyTradingAllowed, getB: f => f.copyTradingAllowed, format: fmtBool },
    { label: 'Scaling Plan', kind: 'boolean-true', getA: f => f.scalingPlan, getB: f => f.scalingPlan, format: fmtBool },
  ]

  const rows: SpecRow[] = []
  for (const d of defs) {
    const valueA = d.getA(firmA)
    const valueB = d.getB(firmB)
    // Skip rows where both sides are null/undefined/empty array.
    const aEmpty = valueA == null || (Array.isArray(valueA) && valueA.length === 0)
    const bEmpty = valueB == null || (Array.isArray(valueB) && valueB.length === 0)
    if (aEmpty && bEmpty) continue
    rows.push({
      label: d.label,
      kind: d.kind,
      valueA,
      valueB,
      winner: compareWinner(d.kind, valueA, valueB),
      format: d.format,
    })
  }
  return rows
}
