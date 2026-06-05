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
