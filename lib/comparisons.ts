import type { Firm } from './firms.ts'
import { getAllFirms, getChallengesByFirm } from './firms.ts'

/* ── Slug helpers ─────────────────────────────────────────────── */

/** Same slug rule as `/go/[firm]` and `FirmCtaCard`. */
export function firmSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

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
 * Every unordered pair of firms in firms.json, canonicalised alphabetically.
 * Used by `generateStaticParams` so we ship one static page per pair (not two).
 */
export function getAllCanonicalPairs(): Array<{ matchup: string; firmA: Firm; firmB: Firm }> {
  const firms = getAllFirms()
  const out: Array<{ matchup: string; firmA: Firm; firmB: Firm }> = []
  for (let i = 0; i < firms.length; i++) {
    for (let j = i + 1; j < firms.length; j++) {
      const a = firmSlug(firms[i].name)
      const b = firmSlug(firms[j].name)
      const [sa, sb] = [a, b].sort()
      // firmA/firmB stays in canonical (alphabetical) order so downstream
      // code can rely on it.
      const firmA = firmSlug(firms[i].name) === sa ? firms[i] : firms[j]
      const firmB = firmA === firms[i] ? firms[j] : firms[i]
      out.push({ matchup: `${sa}-vs-${sb}`, firmA, firmB })
    }
  }
  return out
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
export const COMPARISON_OVERLAYS: Record<string, ComparisonOverlay> = {
  'apex-trader-funding-vs-topstep': {
    matchupSlug: 'apex-trader-funding-vs-topstep',
    reviewedAt: '2026-07-28',
    h1: 'Apex Trader Funding vs Topstep (2026): Speed vs Structure',
    metaDescription:
      'Apex Trader Funding vs Topstep on evaluation speed, drawdown, payout gates, profit split, automation and total cost using July 2026 first-party terms.',
    tlDr:
      'Apex wins on evaluation speed, choice and headline split: its new products can pass in 1 day, offer Intraday or EOD trailing drawdown, apply no evaluation consistency rule and pay 100% of approved Sim Funded requests. Topstep wins on payout access, pricing clarity and longevity: its shortest XFA route begins at 3 trading days with a $125 minimum, all 6 current price paths are verified, and the firm has operated since 2012. The hard Apex trade-off is the PA lifecycle — 5 qualifying days, a $500 request minimum and closure after 6 approved payouts.',
    verdictByCategory: [
      // Matchup is alphabetical, so "a" = Apex Trader Funding and "b" = Topstep.
      { category: 'Evaluation Speed', winner: 'a', reason: 'Apex permits a 1-day pass with no evaluation consistency rule. Topstep requires at least 2 days and keeps the best day below a 50% Consistency Target.' },
      { category: 'Approved Profit Split', winner: 'a', reason: 'Apex publishes a 100% split on approved Sim Funded PA payouts. Topstep’s standard XFA split is 90%, aside from a legacy-dashboard first-$10,000 exception.' },
      { category: 'Drawdown Choice', winner: 'a', reason: 'Apex sells both real-time Intraday Trail and End-of-Day Trail evaluations at 4 sizes. Topstep’s current Trading Combine uses end-of-day trailing Maximum Loss Limit mechanics.' },
      { category: 'First Payout Gate', winner: 'b', reason: 'Topstep’s shortest consistency path starts after 3 trading days with a $125 minimum request. Apex requires 5 qualifying profit days and a $500 minimum.' },
      { category: 'Funded Account Longevity', winner: 'b', reason: 'Every new Apex PA closes after 6 approved payouts. Topstep has no equivalent fixed 6-request XFA lifecycle and can progress selected traders toward Live Funded.' },
      { category: 'Automation', winner: 'b', reason: 'Apex prohibits bots, scripts and algorithmic execution. Topstep allows EAs and personal copy trading on its No Activation Fee path, subject to its trading rules.' },
      { category: 'Pricing Transparency', winner: 'b', reason: 'Topstep’s 6 current monthly prices and $149/$0 activation paths were verified. Apex’s dynamic selector exposed only the $25K Intraday Standard list fee and activation total during this capture.' },
      { category: 'Track Record', winner: 'b', reason: 'Topstep was founded in 2012, giving it a 9-year head start over Apex Trader Funding’s 2021 launch.' },
      { category: 'Holding Rules', winner: 'tie', reason: 'Both are day-trading programs: Apex requires flat positions before 4:59 PM ET, and Topstep also prohibits overnight and weekend holding.' },
    ],
    whenToPickA:
      'Pick Apex if you are a manual futures day trader who wants a 1-day evaluation, no evaluation consistency rule and a choice between intraday and end-of-day trailing risk. The $50K EOD path is the most balanced rule set on paper: a $3,000 target, $2,000 maximum loss and $1,000 session DLL. Confirm the live fee first because Apex’s selector and coupon prices change dynamically.',
    whenToPickB:
      'Pick Topstep if a $125 payout minimum, a 3-day shortest payout path, transparent pricing and no fixed 6-payout account closure matter more than Apex’s 100% headline split. Topstep is also the clear fit for approved automation users and traders who value a firm operating since 2012 over Apex’s faster 2026 product path.',
    faqs: [
      { q: 'Is Apex cheaper than Topstep?', a: 'Not enough Apex prices were independently verified for a full like-for-like answer. The captured $25K Intraday Standard Apex path was $199 list plus $59 activation, while Topstep’s verified current plans start at $49/month plus $149 activation or $95/month with $0 activation.' },
      { q: 'Which firm can I pass faster?', a: 'Apex. Its new Intraday and EOD evaluations can pass after 1 trading day and have no evaluation consistency rule; Topstep requires at least 2 days and a 50% Consistency Target.' },
      { q: 'Which firm lets me request less money sooner?', a: 'Topstep. Its shortest XFA route begins after 3 trading days with a $125 minimum, compared with Apex’s 5 qualifying days and $500 minimum.' },
      { q: 'Can I run an automated futures strategy at Apex or Topstep?', a: 'Not at Apex, which bans bots and algorithmic execution. Topstep’s No Activation Fee path records EAs and personal copy trading as allowed, subject to current platform and conduct rules.' },
    ],
  },

  'ftmo-vs-fundednext': {
    matchupSlug: 'ftmo-vs-fundednext',
    reviewedAt: '2026-08-28',
    challengeReviewedAt: '2026-08-28',
    h1: 'FTMO vs FundedNext (2026): 2 Products vs 4 Paths',
    metaDescription:
      'FTMO vs FundedNext using current 2026 fees, base splits, drawdowns, refund timing, payout gates, platforms and 6 captured challenge products.',
    tlDr:
      'FTMO offers 2 evaluation products: a refundable 80% 2-Step with a 10% static maximum loss, and a non-refundable 90% 1-Step with a 10% end-of-day trailing line and 50% Best Day rule. FundedNext offers 3 evaluations at an 80% base split plus a 70% Stellar Instant path; its advertised 95% is a paid add-on, not the starting rate. Pick FTMO for the verified 90% base option, euro pricing and a 2015 operating history. Pick FundedNext for 4 product paths, a static 1-Step, or its 5-day first-payout gate on Stellar 1-Step.',
    verdictByCategory: [
      { category: 'Highest Verified Base Split', winner: 'a', reason: 'FTMO 1-Step starts at 90%. FundedNext starts its 3 evaluations at 80% and Stellar Instant at 70%; 95% is sold as an add-on.' },
      { category: 'Product Choice', winner: 'b', reason: 'FundedNext has 4 captured paths—2-Step, 1-Step, Lite and phase-0 Instant—against FTMO’s 2 evaluation products.' },
      { category: 'Fastest First-Payout Gate', winner: 'b', reason: 'FundedNext Stellar 1-Step records 5 days before first eligibility. Both FTMO products record 14 days; FundedNext’s other paths use different gates.' },
      { category: 'Static 1-Step Option', winner: 'b', reason: 'FundedNext Stellar 1-Step uses a 6% static maximum loss. FTMO 1-Step uses a 10% end-of-day trailing line plus a 50% Best Day rule.' },
      { category: 'Platform Coverage', winner: 'tie', reason: 'Both publish MT4, MT5 and cTrader. FTMO additionally lists DXTrade, while FundedNext lists Match-Trader.' },
      { category: 'Operating History', winner: 'a', reason: 'FTMO was founded in 2015; FundedNext was founded in 2022. This is an age comparison, not a payout guarantee.' },
      { category: 'Aggregate Allocation Field', winner: 'a', reason: 'The current firm records list $2,000,000 for FTMO and $300,000 for FundedNext; scaling milestones still require separate verification.' },
    ],
    whenToPickA:
      'Pick FTMO if the exact product trade-off fits: 2-Step gives a refundable €540 $100K route at an 80% base split, 5% daily loss and 10% static maximum loss; 1-Step costs €499 at $100K, starts at 90%, and exchanges the refund for a 3% daily cap, end-of-day trailing loss and 50% Best Day rule. FTMO also fits a trader who needs DXTrade or individual-stock CFDs. Verify the storefront for your country because the captured euro terms do not cover FTMO’s separate US routing.',
    whenToPickB:
      'Pick FundedNext if product choice matters more than a universal 90% base split. At $100K, Lite lists $399.99 with an 8% static maximum loss, Stellar 2-Step lists $549.99 with 10% static loss, and Stellar 1-Step lists $569.99 with 6% static loss and a 5-day first-payout gate. All 3 evaluations start at 80%; the 95% share is a paid option. Model the funded-stage 40% news-profit credit and the third-reward refund on new 1-Step and Lite purchases before checkout.',
    faqs: [
      { q: 'Is FundedNext cheaper than FTMO at $100K?', a: 'The currencies differ, so a percentage comparison needs a live FX rate. Captured list fees are €540 for FTMO 2-Step and €499 for FTMO 1-Step, versus $549.99 for FundedNext Stellar 2-Step, $569.99 for Stellar 1-Step and $399.99 for Stellar Lite.' },
      { q: 'Which has the higher starting profit split?', a: 'FTMO 1-Step starts at 90%. FTMO 2-Step and all 3 FundedNext evaluations start at 80%, while FundedNext Stellar Instant starts at 70%. FundedNext’s 95% figure is a paid add-on, not the base split.' },
      { q: 'Which has the faster captured first-payout gate?', a: 'FundedNext Stellar 1-Step records 5 days and weekly later payouts. FTMO 1-Step and 2-Step both record 14 days with on-demand requests after eligibility. FundedNext Stellar 2-Step and Lite record 21 days and bi-weekly payouts.' },
      { q: 'When are the fees refunded?', a: 'FTMO 2-Step and FundedNext Stellar 2-Step attach the registration-fee refund to the first approved reward. FTMO 1-Step and FundedNext Stellar Instant are non-refundable; new FundedNext 1-Step and Lite purchases wait until the third approved reward.' },
      { q: 'Does the FundedNext partnership change this verdict?', a: 'No. FundedNext outbound links are disclosed affiliate links; FTMO is not configured as a partner. The category calls use the same captured product fields, and the overlay automatically disappears when either firm or challenge capture becomes newer than this review.' },
    ],
  },

  'ftmo-vs-fundingpips': {
    matchupSlug: 'ftmo-vs-fundingpips',
    h1: 'FTMO vs FundingPips (2026): Established Standard vs Cheaper Challenger',
    metaDescription:
      'FTMO vs FundingPips: 90% bi-weekly vs up to 100% scaling. We break down splits, platforms, rules and which firm wins for cost-conscious vs reliability-first traders.',
    tlDr:
      'FundingPips wins on price and headline split — scaling to a 100% take and undercutting FTMO’s challenge fees materially. FTMO wins on platform breadth, rule simplicity (no minimum trading days), and a payout history that predates the entire FundingPips company. If you’re testing the prop-firm model for the first time, FundingPips lowers the cost of failure; if you’re sizing up to a real income stream, FTMO is the lower-risk home.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'b', reason: 'FundingPips scales to 100% versus FTMO’s 90% ceiling — once you hit the scaling threshold, every dollar of profit goes to you.' },
      { category: 'Challenge Pricing', winner: 'b', reason: 'FundingPips’s $10K challenge starts around $66 versus FTMO’s $155, and the gap holds across account sizes.' },
      { category: 'Payout Speed', winner: 'tie', reason: 'Both firms run a bi-weekly payout cycle, and both process within 1–2 business days once a request is approved.' },
      { category: 'Payout Reliability', winner: 'a', reason: 'FTMO has paid traders since 2015 without major disruption. FundingPips launched in 2022 with a clean record so far, but its track record is shorter.' },
      { category: 'Rule Simplicity', winner: 'a', reason: 'FTMO requires zero minimum trading days on funded accounts; FundingPips imposes 5 minimum trading days, which constrains intraday scalpers.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'FTMO covers MT4, MT5, cTrader and DXTrade; FundingPips is MT5, cTrader and DXTrade only — no MT4 for legacy EAs.' },
      { category: 'Tradable Assets', winner: 'a', reason: 'FTMO offers five asset classes including Stocks; FundingPips offers four with no single-stock exposure.' },
    ],
    whenToPickA:
      'Pick FTMO if you want the most established CFD prop firm in the market, need MT4 or single-stock CFDs, or value zero minimum trading days on the funded phase. FTMO is also the better choice if your edge is event-driven — the rule surface is simpler and the firm has never retroactively tightened drawdown rules on existing funded traders.',
    whenToPickB:
      'Pick FundingPips if you’re cost-conscious, can live with a 5-day minimum trading-day requirement, and want a path to a 100% profit split through their scaling plan. It’s the better firm for testing whether the prop-firm model works for your strategy at all — lower entry cost means a failed challenge stings less.',
    faqs: [
      { q: 'Does FundingPips really pay out 100% of profits?', a: 'The 100% split is the ceiling under their scaling plan, not the starting rate. Most funded traders begin at 80–90% and unlock the higher tier by hitting consecutive payout milestones.' },
      { q: 'Why does FundingPips require minimum trading days when FTMO doesn’t?', a: 'It’s a risk-management tool: minimum trading days prevent a single lucky trade from triggering a payout. FTMO removed the requirement on funded accounts as a competitive differentiator. For scalpers, FTMO’s zero-day rule is materially more flexible.' },
      { q: 'Is FundingPips a "scam alternative" to FTMO?', a: 'No. FundingPips is a legitimate firm with a clean payout record since 2022, based in Dubai, and is one of the larger CFD prop firms by volume. The lower price reflects newer infrastructure, not lower legitimacy.' },
    ],
  },

  'my-funded-futures-vs-topstep': {
    matchupSlug: 'my-funded-futures-vs-topstep',
    reviewedAt: '2026-07-27',
    h1: 'Topstep vs My Funded Futures (2026): Futures Pioneer vs the New Standard',
    metaDescription:
      'Topstep vs My Funded Futures compared on profit split, payouts, platforms and account sizes. Our 2026 verdict on the two leading US futures prop firms.',
    tlDr:
      'Topstep wins on track record — founded 2012, it’s the firm that defined the futures prop model and still sets the bar for trader development resources. My Funded Futures wins on platform flexibility and account ceiling: Tradovate support, a $600K max allocation, and a cleaner fee structure. Both are 90% on-demand on trailing drawdown — the choice comes down to ecosystem, not economics.',
    verdictByCategory: [
      // NOTE: matchup is alphabetised so "a" = My Funded Futures, "b" = Topstep.
      { category: 'Profit Split', winner: 'tie', reason: 'Both firms pay 90% on funded accounts, processed on-demand. Genuine parity on the headline number.' },
      { category: 'Payout Speed', winner: 'tie', reason: 'Both support on-demand payouts via ACH or bank wire; MFF additionally supports crypto. Day-to-day speed is effectively identical.' },
      { category: 'Track Record', winner: 'b', reason: 'Topstep has been operating since 2012 — the longest history in futures prop trading. MFF launched November 2023 and hasn’t had a full bear-market test yet.' },
      { category: 'Max Allocation', winner: 'a', reason: 'MFF scales to $600K in total account size; Topstep caps at $500K. Real headroom for traders who consistently pass and stack accounts.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'MFF supports NinjaTrader, Tradovate and TradingView; Topstep supports NinjaTrader, Quantower and TradingView. Tradovate access is the differentiator.' },
      { category: 'Trader Development', winner: 'b', reason: 'Topstep’s Trading Combine, consistency coaching and educational ecosystem are deeper and more established. Worth real money to traders still building discipline.' },
      { category: 'Fee Structure', winner: 'a', reason: 'MFF’s newer plan structure (Core, Scale, Pro) is more flexible on daily loss limits and total post-eval cost is lower for traders who pass on the first try.' },
    ],
    whenToPickA:
      'Pick My Funded Futures if you’re an experienced futures trader who wants Tradovate access, a higher allocation ceiling ($600K vs $500K), and a more flexible plan structure. MFF’s newer plans are also more accommodating on daily loss limits than Topstep’s combine. The risk is that MFF is two years old — strong fundamentals, but untested through a real industry contraction.',
    whenToPickB:
      'Pick Topstep if you’re newer to futures and want the most structured path to funded — the Trading Combine, consistency rule and TopstepX platform are explicitly designed to build habits, not just gate funding. Topstep is also the better choice if you want institutional-grade longevity: 14 years in business and a clear payout history.',
    faqs: [
      { q: 'Can I trade overnight or hold weekend positions on either firm?', a: 'No — both firms prohibit overnight and weekend positions on funded accounts, which is standard for US futures props due to overnight margin requirements.' },
      { q: 'Which firm is better for a brand-new futures trader?', a: 'Topstep. The Trading Combine is structured around building consistency before payout, and the trader development resources (coaching, journals, daily videos) are unmatched in the futures prop space.' },
      { q: 'What’s the catch with the trailing drawdown on both firms?', a: 'Both Topstep and MFF use trailing max drawdown — your loss limit tightens as your account grows but doesn’t loosen when you give back profit. A single bad day after a good run can blow the account even if you’re still net positive.' },
    ],
  },

  'topstep-vs-tradeday': {
    matchupSlug: 'topstep-vs-tradeday',
    reviewedAt: '2026-08-11',
    h1: 'Topstep vs TradeDay (2026): Structure vs Day-One Payout Access',
    metaDescription:
      'Topstep vs TradeDay compared on evaluation cost, drawdown, profit split, payout eligibility and rules using first-party data captured through August 11, 2026.',
    tlDr:
      'Topstep is the cleaner default for traders who prioritize a 90% funded split, a $125 payout minimum and a 2-day minimum evaluation. TradeDay is the more configurable route: Quick Pay offers day-one funded requests, while Fast Pass keeps end-of-day drawdown and starts at an 80% split. The important catch is product selection — a full Quick Pay 80/20 request requires current profit above $4,000 before the withdrawal and more than $4,000 left afterward; requests made while current profit is below $4,000 are 50/50, and threshold-crossing requests are blended. Its End-of-Day evaluation also switches to intraday trailing after funding.',
    verdictByCategory: [
      // Matchup is alphabetised, so "a" = Topstep and "b" = TradeDay.
      { category: 'Starting Profit Split', winner: 'a', reason: 'Topstep pays a 90% funded split. Quick Pay is 50/50 below $4,000 of current profit and reaches full 80/20 only when a request leaves more than $4,000; Fast Pass starts at 80%, while Funded Live pays 90%.' },
      { category: 'First Payout Eligibility', winner: 'b', reason: 'TradeDay Quick Pay lists a day-one funded request with no payout buffer. Topstep’s shortest published payout path requires 3 trading days under its consistency option.' },
      { category: 'Minimum Payout', winner: 'a', reason: 'Topstep publishes a $125 minimum payout request; TradeDay publishes a $250 minimum on both Quick Pay and Fast Pass.' },
      { category: 'Evaluation Speed', winner: 'a', reason: 'Topstep says a Trading Combine can pass in as few as 2 days. TradeDay requires 5 days on Quick Pay; its Fast Pass cards say 3 days, while current help articles say no formal minimum and its 45% consistency rule still creates a 3-profitable-day mathematical floor.' },
      { category: 'Evaluation Drawdown Choice', winner: 'b', reason: 'TradeDay offers intraday trailing and end-of-day trailing evaluation paths. Topstep’s current Combine uses one end-of-day trailing Maximum Loss Limit across its account paths.' },
      { category: 'Funded Drawdown Continuity', winner: 'a', reason: 'Topstep keeps its end-of-day trailing Maximum Loss Limit logic into the XFA. TradeDay Quick Pay End of Day switches to intraday trailing after the evaluation; only Fast Pass keeps EOD mechanics.' },
      { category: 'Activation Fee Choice', winner: 'tie', reason: 'TradeDay’s 9 unique product-size combinations across 18 platform cards state no activation fee. Topstep offers a no-activation path but charges a higher monthly subscription; its lower-monthly Standard path adds $149 after passing.' },
      { category: 'News Trading', winner: 'tie', reason: 'Both are restricted rather than fully open: TradeDay requires a 2-minute buffer on each side of tier-1 releases, while Topstep prohibits purposefully entering full size into scheduled major news.' },
    ],
    whenToPickA:
      'Pick Topstep if a 90% split from the funded stage, a $125 minimum payout and a 2-day evaluation floor matter more than withdrawing on the first funded day. It is also the simpler choice for a trader who does not want TradeDay’s Quick Pay split ladder or an EOD-to-intraday drawdown change after passing.',
    whenToPickB:
      'Pick TradeDay if you want to choose between intraday and end-of-day evaluation drawdown and value Quick Pay’s day-one request more than its 50% low-profit payout tier. Fast Pass is the better TradeDay route for traders who want an 80% Funded Sim split and EOD drawdown continuity, but it requires 5 profitable payout days and caps requests by tier.',
    faqs: [
      { q: 'Is TradeDay cheaper than Topstep?', a: 'At the prices recaptured August 11, 2026, TradeDay’s promotional monthly range was $59–$225. Topstep’s current paths were $49–$199 per month plus $149 activation, or $95–$229 per month with no activation. The cheaper first-month path depends on account size and whether you include Topstep’s after-pass fee.' },
      { q: 'Which firm lets me request a payout sooner?', a: 'TradeDay Quick Pay lists a day-one funded request with no buffer and a $250 minimum. Topstep’s shortest published consistency path requires 3 trading days but lowers the request minimum to $125.' },
      { q: 'Which drawdown is easier to manage?', a: 'For evaluation, both offer an end-of-day trailing route; TradeDay also offers intraday trailing. After passing, Topstep keeps EOD trailing, TradeDay Fast Pass keeps EOD trailing, and TradeDay Quick Pay uses intraday trailing — the exact product matters more than the firm name.' },
      { q: 'Do Topstep and TradeDay allow overnight futures positions?', a: 'No. Both require day trading and positions closed by the session cutoff, so neither fits an overnight or weekend futures strategy.' },
    ],
  },

  'take-profit-trader-vs-topstep': {
    matchupSlug: 'take-profit-trader-vs-topstep',
    reviewedAt: '2026-07-27',
    h1: 'Take Profit Trader vs Topstep (2026): No Daily Limit vs the Futures Veteran',
    metaDescription:
      'Take Profit Trader vs Topstep compared on profit split, drawdown, payouts, and track record. Our 2026 verdict on which futures prop firm wins for which trader.',
    tlDr:
      'Take Profit Trader is the more forgiving structure: no daily loss limit on any phase, end-of-day trailing on the evaluation, and a payout you can request on day one. Topstep is the veteran — funding futures traders since 2012, with a deeper trader-development ecosystem and a 90% split from the first funded dollar (Take Profit Trader starts at 80%, reaching 90% only on PRO+). Pick Take Profit Trader if daily-loss breaches keep ending your evaluations; pick Topstep for track record and structure.',
    verdictByCategory: [
      // NOTE: matchup is alphabetised so "a" = Take Profit Trader, "b" = Topstep.
      { category: 'Profit Split', winner: 'b', reason: 'Topstep pays 90% on funded accounts from the start; Take Profit Trader starts at 80% on PRO and reaches 90% only on PRO+ after the first cleared payout.' },
      { category: 'Daily Loss Limit', winner: 'a', reason: 'Take Profit Trader removed the daily loss limit on every phase in January 2025 — only the trailing line constrains you. That is its single biggest edge for traders who keep failing on daily breaches.' },
      { category: 'Drawdown Style', winner: 'a', reason: 'Take Profit Trader’s Test uses end-of-day trailing — the loss line moves on the closing balance, so intraday give-back is forgiven. Topstep’s trailing max loss tracks the intraday high, which is harsher on a retrace.' },
      { category: 'Payout Terms', winner: 'a', reason: 'On a funded PRO account, Take Profit Trader lets you request a payout on day one with no minimum-day rule and no cap, once past the buffer. Topstep gates early withdrawals behind more structured payout rules.' },
      { category: 'Track Record', winner: 'b', reason: 'Topstep has funded futures traders since 2012 — the longest history in the category. Take Profit Trader launched in 2021 with a strong record but a shorter one.' },
      { category: 'Trader Development', winner: 'b', reason: 'Topstep’s Trading Combine, coaching, and journaling tools are the deepest in futures prop. Take Profit Trader is leaner — fine for a self-directed trader, less so for someone still building discipline.' },
      { category: 'Platform Coverage', winner: 'tie', reason: 'Both cover the futures mainstays — NinjaTrader and TradingView — across CQG/Rithmic/Tradovate feeds. Take Profit Trader adds Tradovate and Quantower; Topstep has its own TopstepX. Effective parity.' },
    ],
    whenToPickA:
      'Pick Take Profit Trader if you scalp or day-trade index futures and have been knocked out of a Topstep or Apex evaluation by a daily-loss breach rather than a real drawdown. No daily limit, end-of-day trailing on the Test, and same-day payouts once funded make it the more forgiving path. Start on the $50K Test ($170/month, $2,000 trailing) — enough room for ES/NQ without overpaying while you prove the process.',
    whenToPickB:
      'Pick Topstep if you’re newer to futures and want structure: the Trading Combine, consistency coaching, and TopstepX are built to develop habits, not just gate funding. Topstep also pays the full 90% from your first funded dollar and carries 14 years of payout history — the lower-risk home if track record matters more to you than the no-daily-limit freedom Take Profit Trader offers.',
    faqs: [
      { q: 'Take Profit Trader vs Topstep — which is cheaper?', a: 'Both are monthly evaluation subscriptions. Take Profit Trader runs $150–$360/month plus a one-time $130 activation on passing; Topstep’s Trading Combine is priced similarly per tier. Take Profit Trader frequently runs a lifetime fee-discount code that can waive the activation — check our discount codes page for the current one.' },
      { q: 'Does Take Profit Trader have a daily loss limit like Topstep?', a: 'No. Take Profit Trader removed the daily loss limit across all phases in January 2025; your only loss boundary is the end-of-day trailing drawdown. This is the clearest structural difference between the two firms.' },
      { q: 'Which pays out faster, Take Profit Trader or Topstep?', a: 'Take Profit Trader lets you request a payout on the first funded day (once past the buffer) with no minimum-day requirement, typically clearing in ~1 business day. Topstep’s payout process is more structured. For getting cash out quickly, Take Profit Trader has the edge.' },
    ],
  },

  'fundednext-vs-fundingpips': {
    matchupSlug: 'fundednext-vs-fundingpips',
    reviewedAt: '2026-08-14',
    challengeReviewedAt: '2026-08-14',
    h1: 'FundedNext vs FundingPips (2026): 4 Paths vs 5 Models',
    metaDescription:
      'FundedNext vs FundingPips using 2026 prices, 9 captured products, base or selectable splits, payout gates, drawdowns, platforms and refund timing.',
    tlDr:
      'FundedNext’s 4 paths use an 80% base split on 3 evaluations and 70% on Instant; its 95% share is a paid add-on. FundingPips has 5 models: fixed captured splits of 85% on 1 Step Flex, 80% on 2 Step Pro and 95% on Zero, plus buyer-selected split-and-payout structures on 2 Step Flex and Standard. At $100K, FundedNext Lite lists $399.99 against FundingPips 2 Step Pro at $422, while FundingPips offers the wider 12% static cap on its Flex products. Choose the exact product, not one firm-wide split or payout label.',
    verdictByCategory: [
      { category: 'Highest Captured Split Option', winner: 'b', reason: 'FundingPips Standard publishes a 100% monthly choice and Zero records 95%. FundedNext evaluations start at 80%; 95% is a paid add-on.' },
      { category: 'Cheapest $100K List Fee', winner: 'a', reason: 'FundedNext Stellar Lite lists $399.99. FundingPips 2 Step Pro is its cheapest verified $100K route at $422; the products carry different targets and loss caps.' },
      { category: 'Shortest Numeric First-Payout Gate', winner: 'a', reason: 'FundedNext Stellar 1-Step records 5 days. FundingPips 2 Step Pro records 7 days; its other fixed cycles start at 14 days.' },
      { category: 'Widest Static Maximum Loss', winner: 'b', reason: 'FundingPips 1 Step Flex and 2 Step Flex record 12% static caps. FundedNext’s widest captured static cap is 10% on Stellar 2-Step.' },
      { category: 'Product Choice', winner: 'b', reason: 'FundingPips has 5 captured models against FundedNext’s 4 paths, including selectable payout structures that cannot be flattened into one firm-wide rate.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'Both list MT5, cTrader and Match-Trader; FundedNext additionally lists MT4.' },
      { category: 'Refund Coverage', winner: 'a', reason: 'FundedNext’s 3 evaluation fees are refundable at the first or third approved reward. FundingPips Standard waits for the fourth reward, 3 products are non-refundable, and 1 Step Flex remains unresolved.' },
    ],
    whenToPickA:
      'Pick FundedNext if a lower $100K list fee, MT4, or an earlier numeric payout gate matters. Stellar Lite is $399.99 at $100K with an 8% static cap; Stellar 1-Step is $569.99 with a 6% static cap, 2 minimum evaluation days and first payout eligibility after 5 days. All evaluations start at 80%, and new 1-Step or Lite fees wait until the third approved reward. Avoid treating the paid 95% add-on or funded-stage 40% news-profit credit as a default term.',
    whenToPickB:
      'Pick FundingPips if the chosen split-and-payout structure fits the strategy. 2 Step Pro lists $422 at $100K with 6% and 6% targets, a 6% static cap, 1 minimum day, an 80% split and a 7-day weekly reward cycle. Standard instead offers 60% weekly, 80% bi-weekly, 90% on demand or 100% monthly, each with its own gate. The 12% Flex caps provide more starting room, but their split choices, profitable-day conditions and refund treatment must be read separately.',
    faqs: [
      { q: 'Which is cheaper at the $100K tier?', a: 'FundedNext Stellar Lite is the lowest captured list fee at $399.99. FundingPips 2 Step Pro is $422, Zero is $444, Standard is $544, 2 Step Flex is $555 and 1 Step Flex is $566. Compare targets, split and drawdown before using fee alone.' },
      { q: 'Which has the higher profit split?', a: 'It depends on the product. FundedNext evaluations start at 80% and Instant at 70%. FundingPips records fixed splits of 85% on 1 Step Flex, 80% on 2 Step Pro and 95% on Zero; Flex and Standard use selectable structures, including Standard’s 100% monthly choice.' },
      { q: 'Which gets to a first payout sooner?', a: 'The shortest numeric capture is FundedNext Stellar 1-Step at 5 days, followed by FundingPips 2 Step Pro at 7 days. FundedNext 2-Step and Lite record 21 days; FundingPips Flex and Zero products record 14 days.' },
      { q: 'Do both refund the challenge fee?', a: 'No. FundedNext 2-Step refunds with the first approved reward, while new 1-Step and Lite purchases wait until the third; Instant is non-refundable. FundingPips Standard waits until the fourth reward, 2 Step Flex, Pro and Zero are non-refundable, and 1 Step Flex remains unresolved.' },
      { q: 'Both are affiliate partners—does that decide the winner?', a: 'No. Both outbound routes are disclosed affiliate links. The verdict names product-level trade-offs instead of one overall winner, and it automatically disappears when either firm or product capture becomes newer than this review.' },
    ],
  },

  'ftmo-vs-fxify': {
    matchupSlug: 'ftmo-vs-fxify',
    h1: 'FTMO vs FXIFY (2026): The Safe Default vs the Flexible Challenger',
    metaDescription:
      'FTMO vs FXIFY: same 90% split, very different firms. We compare payout speed, allocation, platforms, country access, and track record to pick a winner.',
    tlDr:
      'Both run a 90% split on static drawdown, so the headline number is a tie — the difference is everything around it. FTMO brings a 2015 track record, four platforms (including cTrader and DXTrade), single-stock CFDs, and no country restrictions. FXIFY counters with on-demand payouts, a $4M ceiling (double FTMO’s), and a customizable multi-product lineup — but it blocks the US, Russia, Iran, and North Korea. FTMO is the lower-risk default; FXIFY is the faster, bigger-ceiling pick if you’re outside its restricted regions.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'tie', reason: 'Both pay a 90% split on the funded account — a genuine wash on the headline economics.' },
      { category: 'Payout Speed', winner: 'b', reason: 'FXIFY supports on-demand payouts from day one of funding; FTMO runs a bi-weekly cycle. FXIFY gets cash to a winner sooner.' },
      { category: 'Max Allocation', winner: 'b', reason: 'FXIFY scales to $4M versus FTMO’s $2M ceiling — more room for traders who consistently pass and scale.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'FTMO covers MT4, MT5, cTrader and DXTrade; FXIFY is MT4 and MT5 only. cTrader and DXTrade traders need FTMO.' },
      { category: 'Tradable Assets', winner: 'a', reason: 'FTMO adds single-stock CFDs to Forex, Crypto, Indices and Commodities; FXIFY’s list is narrower.' },
      { category: 'Country Access', winner: 'a', reason: 'FTMO carries no published country restrictions; FXIFY blocks the US, Russia, Iran and North Korea. A dealbreaker if you’re in one of them.' },
      { category: 'Track Record', winner: 'a', reason: 'FTMO has paid traders since 2015 through multiple industry shakeouts; FXIFY launched in 2022 with a clean but shorter record.' },
    ],
    whenToPickA:
      'Pick FTMO if you trade cTrader or DXTrade, want single-stock CFDs, are in a region FXIFY restricts, or simply weight a decade-long payout history above a faster cycle. It remains the lowest-friction safe default in CFD prop trading — the firm has never retroactively tightened drawdown on existing funded traders.',
    whenToPickB:
      'Pick FXIFY if you want on-demand payouts, a $4M ceiling, and a customizable product lineup (One-Phase, Two-Phase, Lightning, Instant), and you’re outside its restricted countries. It’s the more flexible, faster-paying firm — the trade-offs are a shorter track record and an MT-only platform list.',
    faqs: [
      { q: 'Do FTMO and FXIFY have the same drawdown rules?', a: 'Both use static drawdown on their flagship plans, which is the forgiving variant — your loss floor is fixed and doesn’t trail your equity high. FXIFY’s Lightning product is the exception, using a trailing rule with a 7-day window, so check the specific product you buy.' },
      { q: 'Can US traders use either firm?', a: 'No. FXIFY explicitly restricts US residents, and FTMO does not accept US clients either. US traders should look at futures firms like Topstep or My Funded Futures.' },
      { q: 'Which is better value at the $100K tier?', a: 'They price similarly at $100K, and both refund the fee on first payout. FXIFY frequently runs discounts that undercut FTMO at checkout, so the live promo usually decides it — verify the current price before buying.' },
    ],
  },

  'ftmo-vs-topstep': {
    matchupSlug: 'ftmo-vs-topstep',
    h1: 'FTMO vs Topstep (2026): CFD Forex vs Futures — Not the Same Decision',
    metaDescription:
      'FTMO vs Topstep is a CFD-vs-futures choice, not a like-for-like comparison. We break down who each firm is for, US access, drawdown rules, and holding rules.',
    tlDr:
      'These two don’t actually compete for the same trader. FTMO funds CFD/forex traders; Topstep funds futures traders on CME products. If you’re a US resident, the decision is nearly made for you: FTMO doesn’t accept US clients, and Topstep does. For everyone else it comes down to instrument and rules — FTMO uses forgiving static drawdown and allows overnight and weekend holds, while Topstep uses trailing drawdown and forces every position flat at session close. Choose by asset class first, then by rules.',
    verdictByCategory: [
      // matchup is alphabetised so "a" = FTMO, "b" = Topstep.
      { category: 'Profit Split', winner: 'tie', reason: 'Both pay 90% on funded accounts. The split is identical — it’s not the deciding factor here.' },
      { category: 'Drawdown Type', winner: 'a', reason: 'FTMO uses static drawdown (fixed loss floor); Topstep uses trailing drawdown that tightens as you profit. Static is materially easier to manage.' },
      { category: 'Payout Speed', winner: 'b', reason: 'Topstep supports on-demand payouts; FTMO runs a bi-weekly cycle. Topstep gets cash out faster once eligible.' },
      { category: 'Holding Rules', winner: 'a', reason: 'FTMO allows overnight and weekend holding; Topstep forces all positions flat at session close — standard for futures, but a hard stop for swing traders.' },
      { category: 'US Access', winner: 'b', reason: 'Topstep accepts US-resident traders (CFTC-regulated futures path); FTMO does not accept US clients at all.' },
      { category: 'Track Record', winner: 'b', reason: 'Topstep has operated since 2012 — slightly longer than FTMO’s 2015 start, and the pioneer of the futures-prop model.' },
      { category: 'Max Allocation', winner: 'a', reason: 'FTMO scales to $2M total allocation; Topstep caps at $500K. More headroom on the CFD side.' },
    ],
    whenToPickA:
      'Pick FTMO if you trade forex, indices, crypto, commodities or stock CFDs, want forgiving static drawdown, or need to hold positions overnight or across the weekend. It’s the wrong firm only if you trade futures or live in the US — both of which point you to Topstep instead.',
    whenToPickB:
      'Pick Topstep if you trade futures (ES, NQ, CL, GC and the rest) or you’re a US resident with no CFD option. The trade-offs are real: a trailing drawdown that punishes giving back profit, and a force-flat-at-close rule that rules out swing trades. In return you get the most structured path to funded in the futures world and a 2012 track record.',
    faqs: [
      { q: 'Can I compare FTMO and Topstep on price directly?', a: 'Not cleanly — they sell different products. FTMO prices CFD challenges by account size; Topstep prices a futures Trading Combine by contract limit. Compare them on fit (asset class, drawdown, holding rules), not headline fee.' },
      { q: 'I’m a US trader — which should I pick?', a: 'Topstep. FTMO doesn’t accept US-resident clients, while Topstep is built around the CFTC-regulated futures route that’s the cleanest legal path for US funded traders.' },
      { q: 'Which has easier drawdown rules?', a: 'FTMO. Its static drawdown fixes your loss floor at the starting balance, while Topstep’s trailing drawdown follows your equity high and can end the account on a normal retrace after a winning run.' },
    ],
  },

  'fundednext-vs-fxify': {
    matchupSlug: 'fundednext-vs-fxify',
    reviewedAt: '2026-08-14',
    challengeReviewedAt: '2026-08-14',
    h1: 'FundedNext vs FXIFY (2026): 4 Paths vs 8 Products',
    metaDescription:
      'FundedNext vs FXIFY using 2026 prices, 12 captured products, verified base splits, payout gates, drawdowns, platforms, automation and refund rules.',
    tlDr:
      'FundedNext has 4 paths with every base split quantified: 80% on 3 evaluations and 70% on Stellar Instant. FXIFY has 8 products; its 5 phase products record an 80% base split, while both Instant variants and Lightning publish only “up to 90%” and remain null in structured data. At $100K, FXIFY Three Phase and Lightning list $399 versus FundedNext Lite at $399.99, but Lightning lacks a verified base split. Pick FundedNext for a fully quantified 4-product set and static evaluation drawdowns; pick FXIFY for broader product, platform and phase-product rule choice.',
    verdictByCategory: [
      { category: 'Base-Split Completeness', winner: 'a', reason: 'All 4 FundedNext products have captured base splits. FXIFY leaves 3 of 8 products null because “up to 90%” does not establish a starting percentage.' },
      { category: 'Product Choice', winner: 'b', reason: 'FXIFY has 8 captured products across 0-, 1-, 2- and 3-phase paths. FundedNext has 4.' },
      { category: 'Cheapest $100K List Fee', winner: 'b', reason: 'FXIFY Three Phase and Lightning list $399, compared with FundedNext Stellar Lite at $399.99. Lightning’s base split remains unverified.' },
      { category: 'Shortest Numeric First-Payout Gate', winner: 'a', reason: 'FundedNext Stellar 1-Step records 5 days. FXIFY Lightning records 7 days; several FXIFY products use different or unresolved first-payout fields.' },
      { category: 'Drawdown-Field Completeness', winner: 'a', reason: 'FundedNext captures drawdown type and cap for all 4 paths. FXIFY has static, trailing and unresolved drawdown fields across its 8 products.' },
      { category: 'Phase-Product News and EA Permission', winner: 'b', reason: 'FXIFY’s 5 phase products record news trading and EAs as allowed. FundedNext funded accounts reduce eligible Tier-1-window profit to 40%, and EA access is a paid, platform-limited option.' },
      { category: 'Platform Choice', winner: 'tie', reason: 'Both list MT4 and MT5. FundedNext adds cTrader and Match-Trader; FXIFY adds DXTrade and TradingView.' },
    ],
    whenToPickA:
      'Pick FundedNext if you want every starting split and drawdown field quantified before checkout. Stellar Lite is $399.99 at $100K with an 80% split and 8% static cap; Stellar 1-Step is $569.99 with an 80% split, 6% static cap and 5-day first-payout gate. The costs are the funded-stage 40% news-profit credit, paid EA access and delayed third-reward fee refunds on new 1-Step and Lite purchases. Do not price the 95% add-on as the base product.',
    whenToPickB:
      'Pick FXIFY if 8-product choice, DXTrade or TradingView, or phase-product news and EA permission outweighs data gaps on 3 base splits. At $100K, Three Phase costs $399 with 5% targets in 3 stages, a 5% static cap and 80% split; Lightning also costs $399 but has a 5% target, 4% trailing cap, hard 5-day maximum and no verified base split. Both Instant products likewise require a split check before exact fee-recovery math.',
    faqs: [
      { q: 'Which is cheaper at $100K?', a: 'FXIFY Three Phase and Lightning are $399; FundedNext Stellar Lite is $399.99. The 99-cent gap is less important than the rules: Three Phase has 3 stages and an 80% split, Lightning trails at 4% with no verified base split, and Lite uses 2 stages with an 8% static cap.' },
      { q: 'Which has the higher base profit split?', a: 'FundedNext evaluations and FXIFY’s 5 phase products all record 80%. FundedNext Instant records 70%. FXIFY’s 2 Instant variants and Lightning publish only “up to 90%,” so an exact starting split is not verified.' },
      { q: 'Which has the faster first-payout gate?', a: 'FundedNext Stellar 1-Step has the shortest numeric capture at 5 days. FXIFY Lightning records 7 days, Two Phase Pro and Instant Lite 10 days, and Instant Standard 14 days; other phase-product first-payout fields are blank or use later monthly cycles.' },
      { q: 'Which is better for EAs or news trading?', a: 'FXIFY’s 5 phase products record both as allowed. FundedNext requires paid EA permission on MT4 or MT5, prohibits it on cTrader and Match-Trader, and credits only 40% of eligible funded-stage profit inside its Tier-1 news window.' },
      { q: 'Is FundedNext an affiliate while FXIFY is not?', a: 'Yes. FundedNext outbound links are disclosed affiliate links; FXIFY uses its public first-party destination. Commercial status contributes 0 points, and this overlay fails closed when either product capture becomes newer than its review date.' },
    ],
  },

  'fundingpips-vs-fxify': {
    matchupSlug: 'fundingpips-vs-fxify',
    h1: 'FundingPips vs FXIFY (2026): Top Split vs Speed and Ceiling',
    metaDescription:
      'FundingPips vs FXIFY compared on profit split, payout speed, allocation, platforms, and country access. Which 2022 CFD firm wins for your strategy?',
    tlDr:
      'Both are strong 2022 CFD firms on static drawdown, and the trade-off is clean. FundingPips leads on the take — a 100% scaling ceiling — and adds cTrader and DXTrade. FXIFY leads on the mechanics: on-demand payouts (versus bi-weekly), a $4M ceiling (double FundingPips’ $2M), and zero minimum trading days against FundingPips’ five. If you’re chasing the highest split and trade cTrader, FundingPips. If you want faster cash, a bigger ceiling, and no minimum-days rule, FXIFY — provided you’re outside its restricted countries.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'a', reason: 'FundingPips scales to 100% versus FXIFY’s 90%. The highest possible take in this matchup belongs to FundingPips.' },
      { category: 'Payout Speed', winner: 'b', reason: 'FXIFY supports on-demand payouts; FundingPips runs a bi-weekly cycle. FXIFY recycles capital faster.' },
      { category: 'Max Allocation', winner: 'b', reason: 'FXIFY scales to $4M against FundingPips’ $2M ceiling — double the headroom.' },
      { category: 'Minimum Trading Days', winner: 'b', reason: 'FXIFY requires zero minimum trading days; FundingPips imposes 5 before a payout. Scalpers will prefer FXIFY.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'FundingPips runs MT5, cTrader and DXTrade; FXIFY is MT4 and MT5 only. cTrader traders need FundingPips.' },
      { category: 'Country Access', winner: 'a', reason: 'FundingPips carries no published country restrictions; FXIFY blocks the US, Russia, Iran and North Korea.' },
    ],
    whenToPickA:
      'Pick FundingPips if you want the highest split (100% under the scaling plan), trade on cTrader or DXTrade, or live in a region FXIFY restricts. You accept a bi-weekly payout cycle and a 5-day minimum trading requirement in exchange for the top take and broader platforms.',
    whenToPickB:
      'Pick FXIFY if you want on-demand payouts, a $4M ceiling, and no minimum-trading-day rule, and you’re outside its restricted countries. You trade 10 points of split ceiling for faster cash, double the allocation, and more flexibility on how fast you can withdraw.',
    faqs: [
      { q: 'Does FundingPips really pay 100%?', a: 'The 100% figure is the scaling-plan ceiling, not the starting rate. Most funded traders begin at 80–90% and unlock the top tier by hitting consecutive payout milestones. FXIFY’s 90% is its standard funded rate.' },
      { q: 'Which gets me paid faster?', a: 'FXIFY. It supports on-demand payouts from day one of funding, while FundingPips runs a bi-weekly cycle and requires 5 minimum trading days before a first payout. For fast capital recycling, FXIFY wins.' },
      { q: 'Can US traders use either firm?', a: 'FXIFY explicitly restricts US residents; FundingPips does not accept US clients either. US traders should look at futures firms such as Topstep or My Funded Futures.' },
    ],
  },

}

export function getOverlay(matchupSlug: string): ComparisonOverlay | undefined {
  const overlay = COMPARISON_OVERLAYS[matchupSlug]
  if (!overlay?.reviewedAt || !overlay.challengeReviewedAt) return undefined

  const parsed = parseMatchup(matchupSlug)
  if (!parsed) return undefined

  const firmA = findFirmBySlug(parsed.a)
  const firmB = findFirmBySlug(parsed.b)
  const latestFirmUpdate = [firmA?.lastUpdated, firmB?.lastUpdated]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
  const latestProductCapture = [
    ...getChallengesByFirm(parsed.a),
    ...getChallengesByFirm(parsed.b),
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
export function getActiveOverlays(): ComparisonOverlay[] {
  return Object.keys(COMPARISON_OVERLAYS)
    .map(matchupSlug => getOverlay(matchupSlug))
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
