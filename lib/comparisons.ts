import type { Firm } from './firms'
import { getAllFirms } from './firms'

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
  'ftmo-vs-fundednext': {
    matchupSlug: 'ftmo-vs-fundednext',
    h1: 'FTMO vs FundedNext (2026): Which Prop Firm Should You Pick?',
    metaDescription:
      'FTMO vs FundedNext compared on profit split, payout speed, platforms, and rules. Our 2026 verdict on which prop firm wins for which trader profile.',
    tlDr:
      'FTMO is the choice when payout reliability and a decade-long track record matter more than headline percentages — its 90% split is paid bi-weekly with a payout history that has survived multiple industry shakeouts. FundedNext wins on the numbers: a 95% split, on-demand payouts, and a $4M scaling ceiling that doubles FTMO’s. Pick FundedNext if you want flexibility and faster cash; pick FTMO if you want the lowest probability of a payout dispute.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'b', reason: 'FundedNext’s 95% standard split beats FTMO’s 90% ceiling outright, and is reachable without a scaling milestone on the right plan.' },
      { category: 'Payout Speed', winner: 'b', reason: 'FundedNext supports on-demand payouts versus FTMO’s bi-weekly cycle, which matters if you trade size and want capital recycled fast.' },
      { category: 'Payout Reliability', winner: 'a', reason: 'FTMO has paid traders consistently since 2015 with no major rule-change controversies; FundedNext is solid but has a shorter track record.' },
      { category: 'Platform Coverage', winner: 'a', reason: 'FTMO supports MT4, MT5, cTrader and DXTrade; FundedNext is limited to MT4 and MT5, which boxes out cTrader-native traders.' },
      { category: 'Tradable Assets', winner: 'a', reason: 'FTMO offers Forex, Crypto, Indices, Commodities and Stocks; FundedNext drops Stocks from the list.' },
      { category: 'Max Allocation', winner: 'b', reason: 'FundedNext scales to $4M in total allocation versus FTMO’s $2M ceiling, giving more headroom for size traders.' },
      { category: 'Rule Flexibility', winner: 'tie', reason: 'Both firms allow EAs, news trading, overnight holds and weekend positions on static drawdown — a genuine wash on the day-to-day rule surface.' },
    ],
    whenToPickA:
      'Pick FTMO if you trade cTrader or DXTrade, want exposure to individual stocks alongside Forex, or simply care more about a multi-year payout track record than a 5-point split difference. UK and EU traders looking for the lowest-friction safe default still default to FTMO for a reason — the firm has weathered multiple industry cleanups without disrupting funded traders.',
    whenToPickB:
      'Pick FundedNext if you want a higher headline split, on-demand withdrawals, and a path to a $4M allocation. Its Stellar 1-step model is also more forgiving on profit targets than the FTMO two-step Challenge, so it’s the better pick for traders who’ve washed out of an FTMO verification phase. The trade-off is a shorter track record and a narrower platform list.',
    faqs: [
      { q: 'Is FundedNext cheaper than FTMO?', a: 'At equivalent account sizes, FundedNext’s challenges generally undercut FTMO by 10–20%, and the Stellar Lite model is cheaper still. The fee is refunded with your first payout on both firms.' },
      { q: 'Can US traders use FTMO or FundedNext?', a: 'Neither firm accepts US-resident clients due to CFD regulations. US traders should look at futures-only firms like Topstep or My Funded Futures, or US-facing CFD firms (verify residency rules before purchasing).' },
      { q: 'Which firm pays out faster after a winning trade?', a: 'FundedNext supports on-demand payouts after the initial waiting period, processed in 1–3 business days. FTMO runs a bi-weekly cycle but processes within 1–2 business days once requested. In practice, FundedNext gets cash to a winning trader 7–10 days sooner on average.' },
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

  'fundednext-vs-fundingpips': {
    matchupSlug: 'fundednext-vs-fundingpips',
    h1: 'FundedNext vs FundingPips (2026): Split-and-Speed vs the 100% Ceiling',
    metaDescription:
      'FundedNext vs FundingPips compared on profit split, payout speed, platforms, and rules. Two of the strongest 2022 CFD firms — here’s which wins for your strategy.',
    tlDr:
      'These are two of the best CFD firms launched in 2022, and the split is close to a coin-flip. FundingPips dangles a 100% scaling ceiling and adds cTrader; FundedNext answers with a 95% standard split, on-demand payouts, a $4M allocation, and zero minimum trading days. The deciding factors are speed and the small print: FundedNext pays faster but taxes news-window profit 40%, while FundingPips makes you trade at least 5 days before a payout. Pick FundedNext for fast cash and a big ceiling; pick FundingPips for the top split and cTrader.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'b', reason: 'FundingPips scales to 100% versus FundedNext’s 95% standard split — the highest ceiling in this matchup, once you clear the scaling milestones.' },
      { category: 'Payout Speed', winner: 'a', reason: 'FundedNext supports on-demand payouts; FundingPips runs a bi-weekly cycle. If you want capital recycled fast, FundedNext wins clearly.' },
      { category: 'Max Allocation', winner: 'a', reason: 'FundedNext scales to $4M against FundingPips’ $2M ceiling — double the headroom for traders who stack accounts.' },
      { category: 'Minimum Trading Days', winner: 'a', reason: 'FundedNext requires zero minimum trading days; FundingPips imposes 5 before a payout, which constrains fast scalpers.' },
      { category: 'Platform Coverage', winner: 'b', reason: 'FundingPips runs MT5, cTrader and DXTrade; FundedNext is MT4 and MT5 only. cTrader-native traders should lean FundingPips.' },
      { category: 'News-Window Rule', winner: 'b', reason: 'FundingPips allows news trading cleanly, while FundedNext retains 40% of any profit made inside a Tier-1 news window even on a 95% account.' },
    ],
    whenToPickA:
      'Pick FundedNext if you want on-demand payouts, a path to a $4M allocation, and no minimum-trading-day requirement — the combination that suits an active trader who wants cash out fast. The 95% split is excellent and reachable. The one thing to model first: if your edge involves trading the NFP/CPI/FOMC window, the 40% news-window retention quietly erases the split advantage during those events.',
    whenToPickB:
      'Pick FundingPips if you want the highest possible take (100% under the scaling plan), trade on cTrader, or trade through news without a retention penalty. You’ll accept a bi-weekly payout cycle and a 5-day minimum trading requirement in exchange. It’s the stronger pick for a patient, news-active trader chasing the top split.',
    faqs: [
      { q: 'Both are your affiliate partners — is this verdict biased?', a: 'No. We rank on the same editorial criteria we’d use for any firm, and the call goes whichever way the data points — here FundingPips genuinely wins the split and platforms while FundedNext wins speed and allocation. Partnerships affect prominence, never the verdict.' },
      { q: 'Which is cheaper to start?', a: 'Entry fees are close at equivalent tiers, and both refund the challenge fee with your first payout. FundingPips often edges slightly cheaper at the smallest sizes; confirm the live price (and any active discount) before buying.' },
      { q: 'Can I trade news on both?', a: 'Both allow news trading, but the economics differ: FundingPips treats news-window profit normally, whereas FundedNext retains 40% of profit generated inside a Tier-1 release window. For a news-driven strategy, that gap matters more than the headline split.' },
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
    h1: 'FundedNext vs FXIFY (2026): Near-Twins, Split by the Small Print',
    metaDescription:
      'FundedNext vs FXIFY: both 2022 firms, both on-demand payouts to a $4M ceiling on static drawdown. We compare the split, news rules, and country access that separate them.',
    tlDr:
      'On paper these two are near-twins: both launched in 2022, both pay on-demand to a $4M ceiling, both run static drawdown on MT4/MT5 with no minimum trading days. The separators are narrow but real. FundedNext carries a higher 95% split and no country restrictions; FXIFY counters with a cleaner news rule and a more customizable product lineup. For most traders the higher split wins — but a news trader should weigh FXIFY harder.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'a', reason: 'FundedNext’s 95% standard split beats FXIFY’s 90%. On identical-feeling accounts, that 5 points is the clearest edge.' },
      { category: 'Payout Speed', winner: 'tie', reason: 'Both support on-demand payouts after the initial waiting period — a genuine tie on speed.' },
      { category: 'Max Allocation', winner: 'tie', reason: 'Both scale to a $4M total allocation ceiling. No advantage either way for size traders.' },
      { category: 'Country Access', winner: 'a', reason: 'FundedNext carries no published country restrictions; FXIFY blocks the US, Russia, Iran and North Korea.' },
      { category: 'News-Window Rule', winner: 'b', reason: 'FXIFY treats news-window profit normally, while FundedNext retains 40% of profit made inside a Tier-1 release window. Advantage FXIFY for news traders.' },
      { category: 'Product Range', winner: 'b', reason: 'FXIFY ships a wider, more customizable lineup (One-Phase, Two-Phase, Lightning, Instant) versus FundedNext’s Stellar family — more ways to tune the challenge to your style.' },
    ],
    whenToPickA:
      'Pick FundedNext if you want the higher 95% split, trade from a region FXIFY restricts, or just want the simpler decision — it’s the same on-demand, $4M, static-drawdown structure with a better headline take. The caveat is the 40% news-window retention; if you don’t trade releases, it never bites.',
    whenToPickB:
      'Pick FXIFY if your edge involves news (no retention penalty), you want to fine-tune the challenge across its broader product range, and you’re outside its restricted countries. You give up 5 points of split for cleaner news economics and more product flexibility.',
    faqs: [
      { q: 'Are FundedNext and FXIFY really that similar?', a: 'On the core structure, yes — both are 2022 firms offering on-demand payouts, a $4M ceiling, static drawdown, MT4/MT5, and zero minimum trading days. The meaningful differences are the split (95% vs 90%), the news rule, country access, and product range.' },
      { q: 'Which is better for a news trader?', a: 'FXIFY. FundedNext retains 40% of any profit earned inside a Tier-1 news window, which erodes its split advantage exactly when a news trader makes money. FXIFY treats that profit normally.' },
      { q: 'Can US traders use either?', a: 'FXIFY explicitly restricts US residents. FundedNext does not accept US clients either. US traders should look at futures firms like Topstep or My Funded Futures.' },
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

  'bright-funded-vs-maven': {
    matchupSlug: 'bright-funded-vs-maven',
    h1: 'Bright Funded vs Maven (2026): Two Budget-Tier Firms, Compared',
    metaDescription:
      'Bright Funded vs Maven: both 2023 entry-tier firms on 80% splits, MT5 and TradeLocker, static drawdown. We compare payout cadence, allocation, and scaling.',
    tlDr:
      'These are two 2023 entry-tier firms with a lot in common: an 80% split, MT5 and TradeLocker support, and static drawdown. Maven pays bi-weekly and doubles the allocation ceiling ($800K vs $400K). Bright Funded answers with a published scaling plan and a standing 10% discount, but pays monthly. It’s a close call at the budget end — Maven for faster payouts and a bigger ceiling, Bright Funded for the scaling path and the discount.',
    verdictByCategory: [
      { category: 'Profit Split', winner: 'tie', reason: 'Both pay an 80% split on the funded account — identical headline economics at the entry tier.' },
      { category: 'Payout Frequency', winner: 'b', reason: 'Maven pays bi-weekly; Bright Funded pays monthly. Maven gets you to cash twice as often.' },
      { category: 'Max Allocation', winner: 'b', reason: 'Maven scales to $800K versus Bright Funded’s $400K ceiling — double the headroom for traders who stack.' },
      { category: 'Scaling Plan', winner: 'a', reason: 'Bright Funded publishes a scaling plan; Maven has none listed. If a clear growth path matters, Bright Funded has it.' },
      { category: 'Platforms', winner: 'tie', reason: 'Both run MT5 and TradeLocker — the same platform pairing, with TradeLocker’s browser-based access on each.' },
    ],
    whenToPickA:
      'Pick Bright Funded if you want a defined scaling path from a budget-tier firm and want to use a standing 10% discount to lower the entry cost further. You accept a monthly payout cadence and a lower $400K ceiling in exchange. It suits a trader testing a strategy at small stakes who wants a clear route to a bigger account.',
    whenToPickB:
      'Pick Maven if you want faster (bi-weekly) payouts and a higher $800K allocation ceiling at the same 80% split. The trade-off is no published scaling plan, so the long-term growth path is less defined. It’s the better pick if cadence and ceiling matter more than a structured scaling program.',
    faqs: [
      { q: 'Bright Funded is your affiliate partner — does that change the verdict?', a: 'No. On the data, Maven genuinely wins payout cadence and allocation, and we say so. Bright Funded earns its edge on scaling and the discount, not on the partnership. We mark partners but don’t tilt the call.' },
      { q: 'Are these firms safe at the budget tier?', a: 'Both are 2023 firms with shorter track records than the established names — normal for the entry tier. Treat either as a place to test a strategy at low stakes, and read the current rules page before paying. Use the discount where available to lower the cost of a failed attempt.' },
      { q: 'Which is cheaper to start?', a: 'Both sit at the budget end. Bright Funded’s standing 10% discount can make it the cheaper entry once applied; confirm the live price on each before buying, since entry fees and promos shift.' },
    ],
  },
}

export function getOverlay(matchupSlug: string): ComparisonOverlay | undefined {
  return COMPARISON_OVERLAYS[matchupSlug]
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
  const cleaned = v.replace(/[^0-9.]/g, '')
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
      return a ? 'a' : 'b'
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
    { label: 'Payout Methods', kind: 'list-overlap', getA: f => f.payoutMethods ?? [], getB: f => f.payoutMethods ?? [], format: fmtList },
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

/**
 * If no editorial overlay exists, generate a short data-driven verdict
 * sentence so the page still reads like prose, not a spec dump. Names the
 * two specific spec rows where the leader's lead is biggest so the sentence
 * is grounded in fact, not a generic "edges by N categories" boilerplate.
 */
export function computeFallbackTlDr(firmA: Firm, firmB: Firm, rows: SpecRow[]): string {
  const aWins = rows.filter(r => r.winner === 'a')
  const bWins = rows.filter(r => r.winner === 'b')
  const ties = rows.filter(r => r.winner === 'tie').length

  if (aWins.length === bWins.length) {
    return `${firmA.name} and ${firmB.name} are evenly matched across the spec sheet, with ${ties} categories tied. The deciding factors come down to the specific rules that matter most to your strategy — drill into the table below.`
  }

  const leader = aWins.length > bWins.length ? firmA : firmB
  const leaderSide: WinnerSide = aWins.length > bWins.length ? 'a' : 'b'
  const winningRows = leaderSide === 'a' ? aWins : bWins

  // Surface the two most-tangible wins (skip booleans first, they're least
  // distinguishing; prefer numeric/list-overlap categories).
  const ranked = [...winningRows].sort((x, y) => {
    const score = (r: SpecRow) =>
      r.kind === 'numeric-higher' || r.kind === 'numeric-lower' ? 3
      : r.kind === 'list-overlap' || r.kind === 'enum-payout-freq' || r.kind === 'drawdown' ? 2
      : 1
    return score(y) - score(x)
  })
  const top = ranked.slice(0, 2)

  function describe(row: SpecRow): string {
    const fmt = row.format ?? ((v: unknown) => String(v ?? '—'))
    return `${row.label} (${fmt(row.valueA)} vs ${fmt(row.valueB)})`
  }

  const headline =
    top.length === 2
      ? `${leader.name} leads on ${describe(top[0])} and ${describe(top[1])}`
      : top.length === 1
        ? `${leader.name} leads on ${describe(top[0])}`
        : `${leader.name} edges ahead on ${winningRows.length} categories`

  return `${headline}. Across the full spec sheet, ${leader.name} wins ${winningRows.length} of ${rows.length} categories with ${ties} ties — see the table below for the matchup-relevant rules.`
}
