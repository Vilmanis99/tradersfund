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

export const LANDINGS: Landing[] = [
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
]

export function getLandingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find(l => l.slug === slug)
}

export function buildLandingPayload(landing: Landing) {
  const firms = getAllFirms()
  const ranked = landing.rank(firms)
  return { ranked, count: ranked.length }
}
