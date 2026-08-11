import {
  buildFeatureEvidence,
  isProductLevelFeature,
  qualifyingFirms,
} from './featureEvidence'
import type { Firm } from './firms'
import { getAllFirms } from './firms'

export interface FeatureFaq {
  q: string
  a: string
}

export interface FeatureWhyBullet {
  icon: 'shield' | 'zap' | 'clock' | 'trending' | 'bot' | 'newspaper' | 'calendar' | 'wallet'
  title: string
  body: string
}

export interface Feature {
  /** URL slug under /prop-firms/ */
  slug: string
  /** Short label used in nav chips, breadcrumbs */
  label: string
  /** Page H1 */
  h1: string
  /** <title> tag */
  metaTitle: string
  /** <meta description> */
  metaDescription: string
  /** One-paragraph intro under the H1 */
  intro: string
  /** 3–4 bullets for the "Why this matters" section */
  whyItMatters: FeatureWhyBullet[]
  /**
   * Firm-level predicate. Only used by features with no per-product field
   * (payout methods live on the firm, not the challenge). Product-level
   * features resolve through lib/featureEvidence.ts instead and omit this.
   */
  filter?: (f: Firm) => boolean
  /** 2–4 FAQ entries — rendered as visible HTML + JSON-LD FAQPage */
  faqs: FeatureFaq[]
  /** ISO date string of last editorial review — drives the visible freshness pill. */
  lastReviewed: string
}

/**
 * All feature pages, in nav order.
 *
 * Adding a feature: append an entry here. generateStaticParams in the
 * route, the /prop-firms hub, and the sitemap all read from this array.
 */
export const FEATURES: Feature[] = [
  {
    slug: 'ea-allowed',
    label: 'EA Allowed',
    h1: 'Best Prop Firms That Allow Expert Advisors (EAs)',
    metaTitle: 'Best Prop Firms That Allow EAs in 2026 — Ranked & Compared',
    metaDescription:
      'Compare prop firms that explicitly allow EAs and algorithmic trading, including profit splits, payout terms, drawdown rules, and platforms.',
    intro:
      'Looking for a prop firm that lets you run an EA or algorithmic system? The firms below explicitly permit Expert Advisors in their rules — not just market that they do. Each entry shows the profit split, payout schedule, and platform support that matters for algo traders.',
    whyItMatters: [
      {
        icon: 'bot',
        title: 'Rules vary widely',
        body: 'Some firms ban any automation outright; some allow it only post-funding; some restrict to specific EAs. The wording matters.',
      },
      {
        icon: 'shield',
        title: 'Latency & broker fit',
        body: 'EA performance depends on execution. MT4 and MT5 are still the dominant platforms; cTrader and DXTrade are growing.',
      },
      {
        icon: 'zap',
        title: 'Watch the news-trading clause',
        body: 'Many "EA allowed" firms still ban news trading. If your strategy holds through releases, double-check both rules.',
      },
    ],
    filter: f => f.eaAllowed === true,
    faqs: [
      {
        q: 'Are EAs allowed at every prop firm?',
        a: 'No. Many firms ban automated trading outright to prevent latency-arbitrage abuse. Always check the firm\'s rules page before buying a challenge — and confirm the EA-allowed wording also covers the evaluation phase, not only the funded account.',
      },
      {
        q: 'Which prop firm is best for algo traders?',
        a: 'It depends on your platform and strategy frequency. FTMO and FundedNext are the most established EA-friendly options with broad platform support. For higher-frequency systems, look at cTrader-supporting firms (FundingPips, FXIFY).',
      },
      {
        q: 'Do I need to disclose my EA to the firm?',
        a: 'Usually no — but some firms reserve the right to inspect your trading log. Avoid HFT-style scalping and copy-trading-bot setups; these are commonly flagged even on "EA allowed" accounts.',
      },
    ],
    lastReviewed: "2026-04-24",
  },
  {
    slug: 'news-trading',
    label: 'News Trading',
    h1: 'Best Prop Firms That Allow News Trading',
    metaTitle: 'Best Prop Firms That Allow News Trading in 2026',
    metaDescription:
      'Trade NFP, FOMC, and CPI without violating prop firm rules. Compare the firms that explicitly permit news trading, with payout terms and drawdown rules.',
    intro:
      'Most prop firms restrict trading around high-impact news events to manage spread and slippage risk. The firms below allow news trading on the funded account — and most also allow it during evaluation. Compare their splits and rules below.',
    whyItMatters: [
      {
        icon: 'newspaper',
        title: 'News restrictions are common',
        body: 'Many firms block trades within 2–5 minutes of high-impact releases like NFP, CPI, and FOMC. Violating the window can void the account.',
      },
      {
        icon: 'shield',
        title: 'Spread widening risk',
        body: 'Even when news trading is allowed, spreads can blow out by 5–20× normal. Position-sizing matters more than at any other time.',
      },
      {
        icon: 'zap',
        title: 'Read the small print',
        body: 'Some firms allow news trading but restrict the strategy (no straddles, no holding into the release). Check both rules and the FAQ.',
      },
    ],
    filter: f => f.newsTradingAllowed === true,
    faqs: [
      {
        q: 'Can I trade NFP at every prop firm?',
        a: 'No. Many firms automatically void trades that open within ±2 minutes of NFP or other Tier-1 releases. Always check the news-trading section of the rules — not just the marketing copy.',
      },
      {
        q: 'Is news trading more profitable at a prop firm?',
        a: 'Not necessarily. The wider spreads and slippage often eat the move. The advantage is firm capital, not the news itself. Treat the leverage as the edge, not the event.',
      },
      {
        q: 'Will my trades count if I violate the news rule?',
        a: 'Most firms void the trade and may close the account on repeat violations. Read the consequences section carefully — the punishment is usually stricter than the warning suggests.',
      },
    ],
    lastReviewed: "2026-04-24",
  },
  {
    slug: 'weekend-holding',
    label: 'Weekend Holding',
    h1: 'Best Prop Firms That Allow Weekend Holding',
    metaTitle: 'Best Prop Firms That Allow Holding Over the Weekend (2026)',
    metaDescription:
      'Swing traders and position traders need a prop firm that won\'t force-close on Friday. Compare the firms that allow weekend holding without penalty.',
    intro:
      'If your strategy needs to hold through Friday\'s close into Sunday\'s open, you need a prop firm whose rules explicitly allow it. The firms below permit weekend holding — useful for swing setups, position trades, and anyone who doesn\'t want to babysit price action.',
    whyItMatters: [
      {
        icon: 'calendar',
        title: 'Weekend gaps are real risk',
        body: 'Markets gap on Sunday open in response to news that broke after Friday close. Many firms restrict weekend holding to limit this exposure.',
      },
      {
        icon: 'shield',
        title: 'Futures firms usually ban it',
        body: 'CME futures sessions span the week, but most futures prop firms force-flat at session end. This page focuses on forex and CFD firms that don\'t.',
      },
      {
        icon: 'clock',
        title: 'Different rule for crypto',
        body: 'Crypto pairs run 24/7 — weekend holding is often allowed even at firms that restrict forex pairs. Check per-asset rules.',
      },
    ],
    filter: f => f.weekendAllowed === true,
    faqs: [
      {
        q: 'Why do some prop firms ban weekend holding?',
        a: 'Sunday gaps can blow through stop-losses and exceed daily drawdown limits without giving the trader (or firm) a chance to react. Banning weekend positions is a risk-control measure, not a punishment.',
      },
      {
        q: 'Does "weekend holding allowed" mean all assets?',
        a: 'Not always. Some firms allow weekend holding on crypto (24/7 markets) but force-close forex and CFD positions on Friday. Confirm per-asset.',
      },
      {
        q: 'Are weekend gaps factored into max drawdown?',
        a: 'Yes. Even if weekend holding is allowed, a gap that triggers your max drawdown ends the account — your stop-loss won\'t fire over the weekend. Position-size accordingly.',
      },
    ],
    lastReviewed: "2026-04-24",
  },
  {
    slug: 'crypto-payouts',
    label: 'Crypto Payouts',
    h1: 'Best Prop Firms That Pay Out in Crypto',
    metaTitle: 'Prop Firms That Pay Out in Crypto (USDT, BTC) — 2026',
    metaDescription:
      'Compare prop firms with published crypto payout rails, including USDT and BTC options, payout timing, fees, and account rules.',
    intro:
      'Crypto payouts have become standard for prop firms catering to international traders. The firms below pay out in stablecoins (USDT, USDC) or BTC alongside traditional bank rails — typically faster, lower-fee, and available in jurisdictions where bank wires aren\'t.',
    whyItMatters: [
      {
        icon: 'wallet',
        title: 'Faster settlement',
        body: 'Crypto payouts usually clear in minutes versus 1–3 business days for international wires. Useful for traders in time-zones that fall outside US banking hours.',
      },
      {
        icon: 'shield',
        title: 'Broader availability',
        body: 'Some firms can\'t wire to certain countries. Crypto rails (USDT, USDC) reach almost any jurisdiction that supports a centralised exchange.',
      },
      {
        icon: 'zap',
        title: 'Watch the spread',
        body: 'A few firms convert your USD payout at a worse-than-market FX rate when sending crypto. Confirm the conversion rate and any fees in writing.',
      },
    ],
    filter: f => (f.payoutMethods ?? []).some(m => /crypto|usdt|btc/i.test(m)),
    faqs: [
      {
        q: 'Which stablecoins do prop firms support?',
        a: 'USDT (TRC-20 or ERC-20) is the most common. USDC is offered by some. A few firms also send BTC, though it\'s rare for routine payouts because of volatility and fees.',
      },
      {
        q: 'Are crypto payouts more expensive?',
        a: 'Usually no — TRC-20 USDT transfers cost ~$1 versus $25+ for an international SWIFT wire. But check whether the firm passes through the network fee or absorbs it.',
      },
      {
        q: 'Are crypto payouts taxable?',
        a: 'In most jurisdictions, yes — the same as receiving USD. Document the exchange rate at the time of the payout. We aren\'t tax advisors; check with a local accountant.',
      },
    ],
    lastReviewed: "2026-04-24",
  },
  {
    slug: 'static-drawdown',
    label: 'Static Drawdown',
    h1: 'Best Prop Firms With Static (Non-Trailing) Drawdown',
    metaTitle: 'Best Prop Firms With Static Drawdown in 2026',
    metaDescription:
      'Static drawdown is fixed — it doesn\'t follow your equity high. Compare the prop firms whose max drawdown locks at the starting balance, not the peak.',
    intro:
      'Static drawdown means your maximum loss is a fixed floor — usually 10% below your starting balance — and it doesn\'t move as your equity grows. Compare this with trailing drawdown, which follows your equity high and tightens as you profit. The firms below use static drawdown on their flagship plans.',
    whyItMatters: [
      {
        icon: 'shield',
        title: 'Predictable risk',
        body: 'Static drawdown gives you a fixed floor regardless of how much you\'ve made. No surprise tightening as your equity grows.',
      },
      {
        icon: 'trending',
        title: 'Better for trend traders',
        body: 'If you ride winners for weeks, trailing drawdown can shut you down on a 30% retrace from peak. Static lets the position breathe.',
      },
      {
        icon: 'clock',
        title: 'Not always available across plans',
        body: 'Many firms offer both static and trailing variants. Confirm which plan you\'re buying — the "Pro" or "Stellar" plan often switches to trailing.',
      },
    ],
    filter: f => f.drawdownType === 'static',
    faqs: [
      {
        q: 'What\'s the difference between static and trailing drawdown?',
        a: 'Static drawdown locks at a fixed dollar floor (e.g. 10% below starting balance) and never moves. Trailing drawdown follows your equity high and tightens as you profit — once you hit a peak, your max loss is measured from there.',
      },
      {
        q: 'Is static drawdown easier to pass?',
        a: 'For most traders, yes — especially if you\'re scaling positions as the account grows. Static gives more room above the floor as you profit. Trailing punishes profit-taking pullbacks.',
      },
      {
        q: 'Which prop firms use trailing drawdown?',
        a: 'Most futures prop firms (Topstep, My Funded Futures, Apex) use trailing drawdown. Forex/CFD firms are split — FTMO, FundedNext, and FundingPips run static on their flagship plans.',
      },
    ],
    lastReviewed: "2026-04-24",
  },
  {
    slug: 'overnight-holding',
    label: 'Overnight Holding',
    h1: 'Best Prop Firms That Allow Overnight Holding',
    metaTitle: 'Best Prop Firms That Allow Overnight Holding (2026)',
    metaDescription:
      'Compare prop firms that permit overnight positions, including their drawdown, payout, swap, and separate weekend-holding rules.',
    intro:
      'Plenty of firms happily let you hold a position overnight — and plenty quietly force you flat at the session close. That single rule decides whether a multi-day trend trade is even possible. Every firm below allows overnight holding; mind the swap policy on forex and CFD, and confirm weekend rules separately if you carry into Friday.',
    whyItMatters: [
      {
        icon: 'trending',
        title: 'Trend trades need time',
        body: 'A setup that plays out over three or four days dies instantly under a force-flat-at-close rule. Overnight holding is the baseline requirement for any swing or position strategy.',
      },
      {
        icon: 'shield',
        title: 'Most futures firms force you flat',
        body: 'Futures prop firms like Topstep and My Funded Futures typically close all positions at session end. This list is the forex and CFD firms that let you carry — see the weekend-holding filter if you also hold through Friday.',
      },
      {
        icon: 'clock',
        title: 'Swap fees accrue while you sleep',
        body: 'Holding forex or CFD positions overnight incurs swap/rollover charges. Over a multi-day hold these add up — check the firm\'s swap table before you assume "allowed" means "free".',
      },
    ],
    filter: f => f.overnightAllowed === true,
    faqs: [
      {
        q: 'Do all prop firms allow overnight holding?',
        a: 'No. Most futures firms force every position flat at session close, and a few CFD firms restrict overnight holding on specific instruments. Always confirm in the rules before you carry a trade.',
      },
      {
        q: 'Is overnight holding the same as weekend holding?',
        a: 'No — and the distinction trips swing traders. A firm can allow overnight holding on weekdays but still force-close every position on Friday. If you hold into the weekend, check both rules separately.',
      },
      {
        q: 'Are there fees for holding positions overnight?',
        a: 'On forex and CFD accounts, yes — swap/rollover is charged (or occasionally credited) per night held. Crypto and some swap-free accounts differ. Read the firm\'s swap policy, not just its "overnight allowed" marketing line.',
      },
    ],
    lastReviewed: "2026-06-04",
  },

  /* ── Product-level features ──────────────────────────────────────
   * The entries below carry no `filter`: they resolve through
   * lib/featureEvidence.ts against the challenge captures. Their prose
   * deliberately explains mechanics rather than quoting firm figures —
   * a hand-written number here would rot the moment a capture changes,
   * and the generated section already carries every specific.
   * ─────────────────────────────────────────────────────────────── */

  {
    slug: 'copy-trading',
    label: 'Copy Trading',
    h1: 'Prop Firms That Allow Copy Trading',
    metaTitle: 'Prop Firms That Allow Copy Trading (2026) — By Product',
    metaDescription:
      'Which prop firms permit copy trading, product by product. Every verdict is read from that challenge product\'s own published terms, with capture dates.',
    intro:
      'Copy trading covers three different things — mirroring your own accounts, following a third-party signal, and having someone else trade for you — and firms rarely treat them the same way. The verdicts below come from each product\'s published rules rather than a single firm-wide setting, because the permission often changes between a firm\'s own plans.',
    whyItMatters: [
      {
        icon: 'bot',
        title: 'Copying yourself is not copying others',
        body: 'Most firms separate mirroring between your own accounts from following an external signal. The first is frequently allowed, the second frequently is not, and the two are rarely stated in the same place.',
      },
      {
        icon: 'shield',
        title: 'Correlated flow is the real concern',
        body: 'Firms manage risk across their funded book. Identical positions arriving from many accounts at once breaks that model, which is why copy restrictions tighten on instant-funding and one-step products first.',
      },
      {
        icon: 'zap',
        title: 'A breach is usually caught at withdrawal',
        body: 'Copy-trading rules tend to be enforced during payout review, once the profit already exists. Confirming the rule before you trade costs nothing; confirming it after does.',
      },
    ],
    faqs: [
      {
        q: 'Can I copy trades between my own funded accounts?',
        a: 'Often yes, where both accounts are registered to the same person, though firms that allow it usually cap total correlated exposure. Firms banning all mirroring make no self-copying exception. Because this varies between products at the same firm, check the specific plan rather than the firm\'s marketing page.',
      },
      {
        q: 'Does copy trading include following a signal provider?',
        a: 'Usually yes, and it is the stricter case. A third-party signal means the firm cannot attribute the edge to you, which is what it is underwriting. Several firms allow Expert Advisors while still prohibiting signal copying, so an "EA allowed" line is not permission to copy.',
      },
      {
        q: 'Why do rules differ between one firm\'s own products?',
        a: 'Instant-funding and single-phase products expose the firm to more risk than a two-phase evaluation, so restrictions land there first. That is exactly why this page rates products rather than firms — a firm-level yes or no hides which plan carries the restriction.',
      },
    ],
    lastReviewed: "2026-08-07",
  },

  /*
   * Intentionally unpublished: `no-consistency-rule` and
   * `no-minimum-trading-days`. The current Challenge fields cannot
   * distinguish an explicitly confirmed absence from an unknown, omitted,
   * or conflicted rule. Adding either slug to FEATURES would turn silence
   * into a negative factual claim. Publish only after the schema gains a
   * separate confirmed-none state and the captures are migrated.
   */

  {
    slug: 'high-profit-split',
    label: '90%+ Profit Split',
    h1: 'Prop Firms Paying a 90% Profit Split or Higher',
    metaTitle: 'Prop Firms With a 90%+ Profit Split (2026) — Per Product',
    metaDescription:
      'Challenge products publishing a 90% or higher profit split, read per product from the firm\'s own terms rather than from a best-case headline.',
    intro:
      'Profit splits are advertised per firm and paid per product. A firm promoting 90% commonly reaches it on one plan while its remaining plans pay less, and scaling-plan ceilings are quoted as though they were starting rates. Every figure below is the split the individual product publishes.',
    whyItMatters: [
      {
        icon: 'wallet',
        title: 'The split sets your break-even',
        body: 'Your fee returns at fee divided by split. A $500 challenge on a 90% split needs $556 of profit to repay itself; the same fee at 70% needs $714. Every reset repeats the gap.',
      },
      {
        icon: 'trending',
        title: 'A ceiling is not a starting rate',
        body: 'Scaling plans advertise the maximum reachable after milestones. What you are paid on your first withdrawal is the product rate at purchase, which is what this page records.',
      },
      {
        icon: 'shield',
        title: 'A high split is often funded by a harder rule',
        body: 'Products at the top of a firm\'s split range frequently carry tighter drawdown or a consistency cap. Read the split beside the risk rules rather than on its own.',
      },
    ],
    faqs: [
      {
        q: 'Is a higher profit split always better?',
        a: 'No. The split applies only to profit you are permitted to keep and withdraw. A 95% product with trailing drawdown and a tight consistency cap can pay less in practice than an 80% product with static drawdown and no cap. Compare the split against the rule set that governs it.',
      },
      {
        q: 'Why does this page disagree with a firm\'s advertised split?',
        a: 'We record what each product publishes rather than the firm\'s best case. Where a firm\'s own pages conflict with each other we mark the figure unverified instead of selecting the higher number, and note the conflict on our change watch.',
      },
      {
        q: 'Do any firms pay a 100% split?',
        a: 'Some publish a 100% rate on specific products or as a scaling ceiling. Where a product publishes it we record it. Where it is only reachable after milestones, the milestone terms — not the headline — decide what you are actually paid.',
      },
    ],
    lastReviewed: "2026-08-07",
  },

]

export function getFeatureBySlug(slug: string): Feature | undefined {
  return FEATURES.find(f => f.slug === slug)
}

/**
 * Firms qualifying for a feature.
 *
 * Product-level features resolve against the challenge captures, because the
 * `filter` predicates below test the firm aggregate and that aggregate was
 * demonstrably wrong in both directions — admitting FXIFY to the EA list
 * while one of its products bans EAs, and excluding Topstep whose No
 * Activation Fee Path allows them. `filter` survives only for features with
 * no per-product field (payout methods live on the firm).
 */
export function getFirmsForFeature(slug: string): Firm[] {
  const feature = getFeatureBySlug(slug)
  if (!feature) return []
  if (isProductLevelFeature(slug)) {
    // buildFeatureEvidence orders full coverage before partial coverage and
    // score-sorts inside each group. Preserve that safety signal in the CTA
    // list instead of letting a high generic score outrank complete coverage.
    return qualifyingFirms(buildFeatureEvidence(slug))
  }
  if (!feature.filter) return []
  return getAllFirms()
    .filter(feature.filter)
    .sort((a, b) => b.score - a.score)
}

export function getFeatureCounts(): Array<{ feature: Feature; count: number }> {
  const all = getAllFirms()
  return FEATURES.map(feature => ({
    feature,
    // Same source as the page itself, so the hub can never advertise a count
    // the list does not contain.
    count: isProductLevelFeature(feature.slug)
      ? qualifyingFirms(buildFeatureEvidence(feature.slug)).length
      : feature.filter ? all.filter(feature.filter).length : 0,
  }))
}
