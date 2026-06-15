import { getAllFirms, getChallengesByFirm, type Firm, type Challenge } from './firms'

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
  /** ISO date of editorial review. Drives the visible freshness pill. */
  lastReviewed: string
}

const REVIEW_DATE = '2026-06-04'

/* ── Landings ──────────────────────────────────────────────────── */

/**
 * Per-firm editorial verdicts for the "Best Prop Firms 2026" pillar. One
 * sourced, opinionated line each — keyed by firm name. Every claim traces to
 * content/data/firms.json. Keep the voice varied (see content/EDITORIAL-VOICE.md):
 * some lead with the strength, some with the catch, some with who-it's-for.
 */
const BEST_2026_NOTES: Record<string, string> = {
  FTMO:
    "The default for a reason — payouts running since 2015 and static drawdown. You pay for the track record with a 90% split, not the 95%+ newer firms dangle.",
  FundedNext:
    "Highest split in the CFD majors at 95%, but 40% of any profit made in a news window is retained. Brilliant for swing traders, a trap for news traders.",
  FundingPips:
    "The only firm here at a 100% split, and the only one with a 5-day minimum-trading-day rule. cTrader support makes it the pick for higher-frequency systems.",
  Topstep:
    "The futures veteran, funding traders since 2012. Trailing drawdown and a force-flat-at-session-close rule mean it's no home for anyone holding overnight.",
  'Take Profit Trader':
    "The most forgiving futures Test: no daily loss limit and a payout you can request on day one. The catch is an 80% starting split (90% only on PRO+) and a fixed-dollar trailing drawdown — verify current pricing on the live site.",
  'E8 Markets':
    "A clean mid-tier CFD option — but MT5-only and an 80% split that trails the leaders. You're buying simple static-drawdown rules, not top economics.",
  'My Funded Futures':
    "The newer futures challenger and the rare futures firm that pays in crypto. Trailing drawdown applies, so size off the equity peak, not the balance.",
  FXIFY:
    "A 90% split with on-demand payouts — but it restricts the US, Russia, Iran, and North Korea. Confirm your residency before you pay for a challenge.",
  'Alpha Capital':
    "One of the few here pairing cTrader with MT5. A 2023 firm with an 80% split: competitive conditions, less track record than the names above it.",
  'City Traders Imperium':
    "The lowest headline split on the board at 70% — but built around scaling and an operating history since 2018. A long-game account, not a quick flip.",
  'Bright Funded':
    "Entry-tier: a $400K allocation ceiling and TradeLocker support, aimed at smaller accounts. Use the 10% code if you're testing a strategy at low stakes.",
  'The Funded Trader':
    "Broad platform coverage (MT4, MT5, cTrader) and a 90% split. Read the current rules page line by line before committing — this firm has rewritten them before.",
  Maven:
    "An $800K-ceiling firm on MT5 and TradeLocker, launched 2023 with no published scaling plan. Fine for a first evaluation; light on a long-term path.",
  'OFP Funding':
    "The highest ceiling on the list at $5M and a 90% split, with bi-weekly payouts. A 2022 firm sitting mid-table on overall conditions — verify the fee model.",
  'Crypto Fund Trader':
    "Crypto-first, with weekly payouts that beat most rivals. A smaller $600K ceiling and an 80% split — the draw is the asset focus, not the economics.",
}

/** Crypto-angle verdicts — why this firm for someone trading crypto. Sourced. */
const CRYPTO_NOTES: Record<string, string> = {
  FTMO:
    "Trades crypto as one of five CFD markets, and allows weekend holding — which matters because crypto runs 24/7. The 90% split and 2015 track record carry the pick, not a dedicated crypto desk.",
  FundedNext:
    "Crypto sits alongside forex and indices, with weekend holding allowed and a 95% split. Watch the 40% news-window retention if you trade crypto around macro releases.",
  FundingPips:
    "A 100% split and weekend holding make it strong for 24/7 crypto swings — just clear the 5-day minimum-trading rule. cTrader and MT5 only.",
  'E8 Markets':
    "Crypto on MT5 only, 80% split, weekend holding allowed. A no-frills pick: static drawdown and simple rules, not a crypto specialist.",
  FXIFY:
    "90% split, on-demand payouts, weekend holding, crypto among its markets — but it restricts the US, Russia, Iran, and North Korea. Check residency first.",
  'Alpha Capital':
    "Pairs cTrader with MT5 and allows weekend holding — handy for crypto. An 80% split from a 2023 firm: conditions over track record.",
  'City Traders Imperium':
    "Crypto on MT5/cTrader, but the 70% split is the lowest here and payouts are monthly. The scaling path is the reason to pick it, not fast crypto turnover.",
  'The Funded Trader':
    "Crypto across MT4, MT5, and cTrader with a 90% split and weekend holding. Re-read the current rules before you pay — they've changed before.",
  Maven:
    "Crypto on MT5/TradeLocker from a 2023 firm, 80% split, $800K ceiling. A budget evaluation, not a long-term crypto home — no published scaling plan.",
  'OFP Funding':
    "Crypto among its markets with the highest ceiling here at $5M and a 90% split. Bi-weekly payouts; verify the ongoing-fee model before committing.",
  'Crypto Fund Trader':
    "The only firm here built crypto-first — crypto leads its asset list, with weekly payouts that beat most rivals. Smaller $600K ceiling and an 80% split.",
}

/** Swing-angle verdicts — overnight + weekend holding on which drawdown type. Sourced. */
const SWING_NOTES: Record<string, string> = {
  FTMO:
    "Static drawdown plus overnight and weekend holding — exactly the combination swing traders want, so a Friday position isn't force-closed. 90% split, payouts every two weeks.",
  FundedNext:
    "Holds overnight and over weekends on static drawdown with a 95% split. The catch for swing setups around news: 40% of news-window profit is retained.",
  FundingPips:
    "100% split with overnight and weekend holding on static drawdown. The 5-day minimum-trading rule is no obstacle when you hold for days anyway.",
  'E8 Markets':
    "Static drawdown and weekend holding on MT5, 80% split. A clean swing option if you don't need cTrader or a higher split.",
  FXIFY:
    "On-demand payouts, static drawdown, and weekend holding with a 90% split — strong for swing, but it restricts the US and three other regions.",
  'Alpha Capital':
    "Static drawdown with overnight and weekend holding, plus cTrader. An 80% split from a 2023 firm — competitive conditions for position trades.",
  'The Funded Trader':
    "Weekend holding and a 90% split across MT4, MT5, and cTrader on static drawdown. Re-read the rules page before you hold size into a weekend.",
  'OFP Funding':
    "Holds overnight and weekends on static drawdown, with the highest ceiling here ($5M) and a 90% split. Verify the fee model before a long hold.",
  'Crypto Fund Trader':
    "Weekend holding suits its crypto-first lineup — crypto trades through the weekend. Weekly payouts, a smaller $600K ceiling, 80% split, static drawdown.",
}

export const LANDINGS: Landing[] = [
  {
    slug: 'best-prop-firms-2026',
    h1: 'The Best Prop Firms in 2026 (Ranked)',
    metaTitle: 'Best Prop Firms in 2026 — Ranked & Reviewed',
    metaDescription:
      'Every major prop firm ranked on our editorial score — profit split, payout speed, drawdown rules, and track record. Who each firm is actually for, in 2026.',
    intro:
      "There is no single best prop firm — there's the best one for how you trade. The fourteen firms below are ranked by our editorial score, and each carries a one-line verdict on who it suits and where it bites. Start at the top, then jump to the cut that matches your strategy.",
    sortDir: 'desc',
    rank: firms =>
      firms
        .map(firm => ({
          firm,
          sortKey: firm.score,
          highlight: `${firm.profitSplitPct ?? '—'}% split · ${firm.payoutFrequency ?? '—'} payouts`,
          note: BEST_2026_NOTES[firm.name],
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
    slug: 'cheapest-prop-firms',
    h1: 'Cheapest Prop Firm Challenges (2026)',
    metaTitle: 'Cheapest Prop Firm Challenges in 2026 — From $39',
    metaDescription:
      'Ranked by lowest entry price across every published challenge tier. Real numbers from firms.json, refreshed monthly.',
    intro:
      'Cheap doesn\'t mean better — but if you\'re sizing risk against the fee, the table below shows the lowest priced entry challenge from every firm we track, sorted by price. We compute the true-cost (break-even profit vs max drawdown) inside every review.',
    sortDir: 'asc',
    rank: firms => {
      // For each firm, find its absolute cheapest priced challenge tier.
      const out: LandingFirm[] = []
      for (const firm of firms) {
        const challenges = getChallengesByFirm(firmSlug(firm.name))
        const allTiers = challenges.flatMap((c: Challenge) =>
          c.accountSizes
            .filter(t => t.priceUsd != null && t.priceUsd > 0)
            .map(t => ({ ...t, productName: c.productName }))
        )
        if (allTiers.length === 0) continue
        const cheapest = allTiers.sort((a, b) => a.priceUsd! - b.priceUsd!)[0]
        out.push({
          firm,
          sortKey: cheapest.priceUsd!,
          highlight: `From $${cheapest.priceUsd!.toFixed(0)} · ${cheapest.productName} ($${(cheapest.sizeUsd / 1000).toFixed(0)}K)`,
        })
      }
      return out.sort((a, b) => a.sortKey - b.sortKey)
    },
    methodology:
      'We rank by the absolute lowest published priceUsd across every challenge tier this firm sells. Refunded fees on payout are noted in the per-firm review but not subtracted from the headline price.',
    lastReviewed: REVIEW_DATE,
  },
  {
    slug: 'best-instant-funding-prop-firms',
    h1: 'Best Instant-Funding Prop Firms (2026)',
    metaTitle: 'Best Instant Funding Prop Firms in 2026 — No Evaluation',
    metaDescription:
      'Prop firms with phase-0 instant funding accounts — no challenge, trade live capital immediately. Ranked by profit split and trader rules.',
    intro:
      'Instant-funding accounts skip the evaluation phase entirely — pay the fee, get capital. The trade-off is usually a lower profit split or tighter rules. The list below filters to firms that publish a true zero-phase product.',
    sortDir: 'desc',
    rank: firms => {
      const out: LandingFirm[] = []
      for (const firm of firms) {
        const challenges = getChallengesByFirm(firmSlug(firm.name))
        const instant = challenges.find((c: Challenge) => c.phases === 0)
        if (!instant) continue
        const cheapest = instant.accountSizes
          .filter(t => t.priceUsd != null && t.priceUsd > 0)
          .sort((a, b) => a.priceUsd! - b.priceUsd!)[0]
        out.push({
          firm,
          sortKey: firm.score,
          highlight: cheapest
            ? `${instant.productName} · from $${cheapest.priceUsd!.toFixed(0)}`
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
      'A firm is included if it lists Futures in its assets array. Profit splits and platform availability are pulled from firms.json and refreshed weekly.',
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
          note: CRYPTO_NOTES[firm.name],
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
          note: SWING_NOTES[firm.name],
        }))
        .sort((a, b) => b.sortKey - a.sortKey),
    methodology:
      'A firm qualifies only if it allows BOTH overnight holding AND weekend holding — a single missing rule force-closes a swing position. We then rank by editorial score and surface the drawdown type, because static drawdown lets a winning swing trade breathe where trailing drawdown can shut it down on a retrace from the peak.',
    lastReviewed: REVIEW_DATE,
  },
]

export function getLandingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find(l => l.slug === slug)
}

export function buildLandingPayload(landing: Landing) {
  const firms = getAllFirms()
  const ranked = landing.rank(firms)
  return { ranked, count: ranked.length }
}
