/**
 * Reviews v2 conformance audit.
 *
 * Mechanises the "REVIEW BEFORE MERGE (editor checklist)" at the bottom of
 * content/posts/_template.md. That checklist was manual, which is why every
 * firm's sourceCapturedAt silently aged past the 30-day gate.
 *
 * Run:  npm run audit           (report + non-zero exit on errors)
 *       npm run audit -- --warn (also print warnings)
 *       npm run audit -- ftmo   (single firm)
 *
 * Checks, mapped to the checklist:
 *   [x] All 9 sections present in the order above     → checkSections
 *   [x] Zero banned phrases                           → checkBannedPhrases
 *   [x] Every paragraph has a number/rule/source      → checkFactDensity (warn)
 *   [x] Challenge rows cite sourceCapturedAt <30d     → checkSourceFreshness
 *   [x] Math audit: True-Cost table reproduced        → checkTrueCostMath
 *   [x] Firm URLs in body go through /go/<slug>       → checkOutboundLinks
 *   [ ] npx next build clean                          → not this script's job
 *   [ ] Spot-check 3 numbers against the live firm    → needs a human
 *
 * The True-Cost check reuses computeTrueCost() from lib/firms.ts rather than
 * re-deriving the formula, so the audit can never drift from the renderer.
 * Node >=22.6 strips the TypeScript types on import.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import {
  countFocusedProductsWithUpdates,
  focusChallengeChangeEntries,
  parseChallengeChangeFocus,
  validateChallengeProductKeys,
} from '../lib/challengeChangeFocus.ts'
import { isIndiaCampaign } from '../lib/affiliateCampaign.ts'
import { challengeTierEconomics, computeTrueCost } from '../lib/firms.ts'
import { rankFirmAlternatives } from '../lib/firmAlternatives.ts'
import {
  buildRelatedComparisons,
  comparisonHref,
  getFreshComparisonEvidence,
  getFreshFirmEvidence,
} from '../lib/relatedComparisons.ts'
import {
  goClickEventName,
  isHighIntentJourneyStage,
  journeyStage,
} from '../lib/analyticsTaxonomy.ts'
import {
  INDIA_MATCHER_DRAWDOWNS,
  INDIA_MATCHER_PAYOUTS,
  INDIA_MATCHER_PROGRAMS,
  INDIA_MATCHER_STRATEGIES,
  indiaMatcherResultProperties,
  indiaMatcherStateKey,
} from '../lib/indiaMatcherAnalytics.ts'
import {
  buildOutboundRelationships,
  outboundSlug,
} from '../lib/outboundDestinations.ts'
import {
  decoratePostOutboundLinks,
  postBodyCampaign,
} from '../lib/postOutboundLinks.ts'
import { rankRelatedPosts, relatedPostScore } from '../lib/relatedPosts.ts'
import {
  getTradingToolReviewLinks,
  TRADING_TOOL_REVIEWS,
} from '../lib/tradingToolReviews.ts'
import { diffChallengeProducts } from './challenge-diff.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const POSTS = path.join(ROOT, 'content/posts')
const CHALLENGES = path.join(ROOT, 'content/data/challenges')
const GLOBAL_DIRECTORY_PAGE_FILE = path.join(ROOT, 'app/prop-firms/page.tsx')
const GLOBAL_LEGACY_DIRECTORY_FILE = path.join(ROOT, 'app/main-table/page.tsx')
const GLOBAL_DIRECTORY_COMPONENT_FILE = path.join(ROOT, 'components/FirmTable.tsx')
const GLOBAL_CHALLENGE_PAGE_FILE = path.join(ROOT, 'app/prop-firm-challenges/page.tsx')
const GLOBAL_CHALLENGE_COMPONENT_FILE = path.join(
  ROOT,
  'components/GlobalChallengeComparison.tsx',
)
const GLOBAL_CHALLENGE_SOCIAL_FILE = path.join(
  ROOT,
  'app/prop-firm-challenges/opengraph-image.png',
)
const GLOBAL_CHALLENGE_SOCIAL_ALT_FILE = path.join(
  ROOT,
  'app/prop-firm-challenges/opengraph-image.alt.txt',
)
const CHALLENGE_CHANGES_PAGE_FILE = path.join(
  ROOT,
  'app/prop-firm-challenge-changes/page.tsx',
)
const CHALLENGE_CHANGES_COMPONENT_FILE = path.join(
  ROOT,
  'components/ChallengeChangeFeed.tsx',
)
const CHALLENGE_CHANGES_SOCIAL_FILE = path.join(
  ROOT,
  'app/prop-firm-challenge-changes/opengraph-image.png',
)
const CHALLENGE_CHANGES_SOCIAL_ALT_FILE = path.join(
  ROOT,
  'app/prop-firm-challenge-changes/opengraph-image.alt.txt',
)
const CHALLENGE_WATCH_FILE = path.join(ROOT, 'content/data/challenge-watch.json')
const INDIA_EVIDENCE_FILE = path.join(ROOT, 'content/data/india-evidence.json')
const INDIA_RBI_CAPTURE_FILE = path.join(ROOT, 'content/data/india-rbi-alert-capture.json')
const INDIA_EVIDENCE_CAPTURES_DIR = path.join(
  ROOT,
  'content/data/india-evidence-captures',
)
const INDIA_CAPTURED_EXPANSION_SLUGS = new Set([
  'e8-markets',
  'city-traders-imperium',
  'maven',
  'tradeify',
  'tradeday',
])
const INDIA_PAYOUT_PAGE_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/payout-methods/page.tsx',
)
const INDIA_CHALLENGE_PAGE_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/challenge-comparison/page.tsx',
)
const INDIA_CHALLENGE_COMPONENT_FILE = path.join(
  ROOT,
  'components/IndiaChallengeComparison.tsx',
)
const INDIA_MATCHUP_COMPONENT_FILE = path.join(
  ROOT,
  'components/IndiaCuratedMatchupPage.tsx',
)
const INDIA_MATCHUP_LINKS_FILE = path.join(
  ROOT,
  'components/IndiaMatchupLinks.tsx',
)
const INDIA_MATCHUP_CONFIG_FILE = path.join(
  ROOT,
  'lib/indiaMatchups.ts',
)
const INDIA_MATCHUP_HUB_PAGE_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/compare/page.tsx',
)
const INDIA_MATCHUP_HUB_SOCIAL_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/compare/opengraph-image.png',
)
const INDIA_MATCHUP_SLUGS = [
  'fundingpips-vs-bright-funded',
  'fundingpips-vs-fxify',
  'bright-funded-vs-fxify',
]
const AFFILIATE_REDIRECT_ROUTE_FILE = path.join(ROOT, 'app/go/[firm]/route.ts')
const ANALYTICS_PROVIDER_FILE = path.join(ROOT, 'components/AnalyticsProvider.tsx')
const INDIA_MATCHER_COMPONENT_FILE = path.join(ROOT, 'components/IndiaFirmMatcher.tsx')
const ROOT_LAYOUT_FILE = path.join(ROOT, 'app/layout.tsx')
const BLOG_POST_PAGE_FILE = path.join(ROOT, 'app/blog/[slug]/page.tsx')
const TRADING_TOOL_REVIEW_COMPONENT_FILE = path.join(
  ROOT,
  'components/TradingToolReviewCluster.tsx',
)
const TRADING_TOOL_REVIEW_LIB_FILE = path.join(ROOT, 'lib/tradingToolReviews.ts')
const WYCKOFF_GUIDE_FILE = path.join(POSTS, 'wyckoff-pattern.md')
const PRIVACY_POLICY_FILE = path.join(ROOT, 'content/pages/privacy-policy.md')
const INDIA_CHALLENGE_SOCIAL_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/challenge-comparison/opengraph-image.png',
)
const INDIA_CHALLENGE_CHANGES_PAGE_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/challenge-changes/page.tsx',
)
const INDIA_CHALLENGE_CHANGES_SOCIAL_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/challenge-changes/opengraph-image.png',
)
const INDIA_CHALLENGE_CHANGES_SOCIAL_ALT_FILE = path.join(
  ROOT,
  'app/best-prop-firms-in-india/challenge-changes/opengraph-image.alt.txt',
)
const INDIA_TAX_GUIDE_FILE = path.join(ROOT, 'content/posts/prop-firm-payout-tax-india.md')
const CHALLENGE_LIFECYCLE_PAGE_FILE = path.join(
  ROOT,
  'content/pages/how-prop-firm-challenges-work.md',
)
const CHALLENGE_PASSING_PAGE_FILE = path.join(
  ROOT,
  'content/pages/how-to-pass-a-prop-firm-challenge.md',
)
const TRUE_COST_PILLAR_FILE = path.join(
  ROOT,
  'content/pages/true-cost-of-prop-firm-challenges.md',
)
const SCALING_PLAN_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/prop-firm-scaling-plan.md',
)
const WHAT_IS_PROP_FIRM_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/what-is-a-prop-firm.md',
)
const COPY_TRADING_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/what-is-copy-trading.md',
)
const PASSING_SERVICES_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/are-prop-firm-passing-services-worth-it.md',
)
const DRAWDOWN_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/balance-based-drawdown-vs-equity-based-drawdown.md',
)
const OVERTRADING_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/what-is-overtrading.md',
)
const PROFITABILITY_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/is-prop-firm-trading-profitable.md',
)
const CONSISTENCY_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/what-is-prop-firm-consistency-rule.md',
)
const FUNDINGPIPS_ZERO_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/fundingpips-zero.md',
)
const FTMO_FREE_TRIAL_GUIDE_FILE = path.join(
  ROOT,
  'content/posts/ftmo-free-trial-explained.md',
)
const FREE_TRIAL_DATA_FILE = path.join(ROOT, 'content/data/free-trials.json')
const DISCOUNT_HUB_PAGE_FILE = path.join(
  ROOT,
  'app/prop-firm-discount-codes/page.tsx',
)
const DEALS_DATA_FILE = path.join(ROOT, 'content/data/deals.json')
const DEALS_LIBRARY_FILE = path.join(ROOT, 'lib/deals.ts')
const DEAL_CARD_FILE = path.join(ROOT, 'components/DealCard.tsx')
const DEALS_FILTER_FILE = path.join(ROOT, 'components/DealsFilter.tsx')
const US_ACCESS_EVIDENCE_FILE = path.join(
  ROOT,
  'content/data/us-access-evidence.json',
)
const UK_ACCESS_EVIDENCE_FILE = path.join(
  ROOT,
  'content/data/uk-access-evidence.json',
)
const CRYPTO_MARKET_EVIDENCE_FILE = path.join(
  ROOT,
  'content/data/crypto-market-evidence.json',
)
const LANDINGS_CONFIG_FILE = path.join(ROOT, 'lib/landings.ts')
const LANDING_PAGE_COMPONENT_FILE = path.join(ROOT, 'components/LandingPage.tsx')
const LANDING_FIRM_LIST_FILE = path.join(ROOT, 'components/LandingFirmList.tsx')
const FEATURE_PAGE_ROUTE_FILE = path.join(ROOT, 'app/prop-firms/[feature]/page.tsx')
const RELEASE_CRAWL_FILE = path.join(ROOT, 'scripts/release-crawl.mjs')
const MDX_FILE = path.join(ROOT, 'lib/mdx.ts')
const RETIRED_CONTENT_FILE = path.join(ROOT, 'lib/retiredContent.ts')
const NEXT_CONFIG_FILE = path.join(ROOT, 'next.config.ts')
const ROOT_SLUG_PAGE_FILE = path.join(ROOT, 'app/[slug]/page.tsx')
const SITEMAP_FILE = path.join(ROOT, 'app/sitemap.ts')
const COST_CALCULATOR_FILE = path.join(ROOT, 'components/v4/CostCalculator.tsx')
const HOMEPAGE_FILE = path.join(ROOT, 'app/page.tsx')
const COMPARISON_HERO_FILE = path.join(ROOT, 'components/ComparisonHero.tsx')
const COMPARISON_VERDICT_FILE = path.join(ROOT, 'components/ComparisonVerdict.tsx')
const RELATED_COMPARISONS_FILE = path.join(ROOT, 'components/RelatedComparisons.tsx')
const RELATED_COMPARISONS_LIB_FILE = path.join(ROOT, 'lib/relatedComparisons.ts')
const FIRM_ALTERNATIVES_FILE = path.join(ROOT, 'components/FirmAlternatives.tsx')
const COMPARISON_INFOGRAPHIC_FILE = path.join(ROOT, 'components/ComparisonInfographic.tsx')
const COMPARISON_HUB_FILE = path.join(ROOT, 'app/compare/page.tsx')
const COMPARISON_DIRECTORY_FILE = path.join(ROOT, 'components/ComparisonDirectory.tsx')
const COMPARISON_DIRECTORY_LIB_FILE = path.join(ROOT, 'lib/comparisonDirectory.ts')
const COMPARISON_ROUTE_FILE = path.join(ROOT, 'app/compare/[matchup]/page.tsx')
const CHALLENGE_MATCHUP_COMPONENT_FILE = path.join(ROOT, 'components/ChallengeMatchup.tsx')
const CHALLENGE_MATCHUP_LIB_FILE = path.join(ROOT, 'lib/challengeMatchup.ts')
const COMPARISONS_FILE = path.join(ROOT, 'lib/comparisons.ts')
const SCHEMA_FILE = path.join(ROOT, 'lib/schema.ts')
const INDIA_PAYOUT_TEMPLATE_FILE = path.join(
  ROOT,
  'public/templates/india-prop-firm-payout-records.csv',
)

/** Post filename (no ext) → challenges/<slug>.json. Not every review is
 *  named "<firm>-review": two predate the convention. */
const REVIEW_TO_FIRM = {
  'alpha-capital-review': 'alpha-capital',
  'apex-trader-funding-review': 'apex-trader-funding',
  'bright-funded-prop-firm': 'bright-funded',
  'city-traders-imperium-review': 'city-traders-imperium',
  'crypto-fund-trader-review': 'crypto-fund-trader',
  'e8-markets-review': 'e8-markets',
  'ftmo-review': 'ftmo',
  'fundednext-review': 'fundednext',
  'funding-pips-review': 'fundingpips',
  'fxify-review': 'fxify',
  'lucid-trading-review': 'lucid-trading',
  'maven-prop-firm-review': 'maven',
  'my-funded-futures': 'my-funded-futures',
  'ofp-funding-review': 'ofp-funding',
  'take-profit-trader-review': 'take-profit-trader',
  'the-funded-trader-review': 'the-funded-trader',
  'topstep-review': 'topstep',
  'tradeday-review': 'tradeday',
  'tradeify-review': 'tradeify',
}

/** Section 1–9 of the v2 standard, in required order. Matched against the
 *  H2 text; the firm name is interpolated into 8a/8b so "Who should pick
 *  FTMO" and "Who should pick Topstep" both satisfy the same slot. */
const REQUIRED_SECTIONS = [
  { name: 'Verdict', re: /^verdict$/i },
  { name: 'Quick facts', re: /^quick facts$/i },
  { name: 'Challenges available', re: /^challenges available$/i },
  { name: 'Rule mechanics', re: /^how the rules actually work$/i },
  { name: 'True cost to break even', re: /^true cost to break even$/i },
  { name: 'Payout speed in practice', re: /^payout speed in practice$/i },
  { name: 'Pros', re: /^pros$/i },
  { name: 'Cons', re: /^cons$/i },
  { name: 'Who should pick', re: /^who should pick\b/i },
  { name: 'Who should avoid', re: /^who should avoid\b/i },
  { name: 'FAQ', re: /^faq$/i },
]

const BANNED_PHRASES = [
  'one of the most popular',
  'renowned for',
  'trusted by thousands',
  'industry-leading',
  'user-friendly',
  'boasts',
  'leading provider',
  'huge community',
]

/** Third-party sources we cite directly — these are evidence, not affiliate
 *  traffic, so they legitimately bypass /go/<slug>. */
const CITATION_HOSTS = [
  'trustpilot.com',
  'reddit.com',
  'investopedia.com',
  'tradingview.com',
  'sec.gov',
  'cftc.gov',
  'nfa.futures.org',
  'myfxbook.com',
  'propfirmmatch.com',
]

const STALE_DAYS = 30
const TRUSTPILOT_STALE_DAYS = 90
const WORD_FLOOR = 1200
const WORD_CEILING = 4500
const TODAY = new Date()

/* ── helpers ────────────────────────────────────────────────────── */

const stripTags = html => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ')

const wordCount = html =>
  stripTags(html).split(/\s+/).filter(Boolean).length

/** "$10K" → 10000, "Lightning $5K" → 5000, "$100,000" → 100000. */
function parseSize(text) {
  const k = text.match(/\$\s*([\d.,]+)\s*k\b/i)
  if (k) return Math.round(parseFloat(k[1].replace(/,/g, '')) * 1000)
  const plain = text.match(/\$\s*([\d,]+)/)
  if (plain) return parseFloat(plain[1].replace(/,/g, ''))
  const usd = text.match(/\bUSD\s*([\d,]+)/i)
  if (usd) return parseFloat(usd[1].replace(/,/g, ''))
  return null
}

/** "~$189" → 189, "$1,236" → 1236, "€497" → 497. Leading ~ means
 *  "illustrative", which we still math-check — an illustrative fee must
 *  still produce a consistent illustrative break-even. Currency consistency
 *  is stated by the table header; the fee/split arithmetic is unit-agnostic. */
function parseMoney(text) {
  const m = text.match(/[$€]\s*([\d,]+(?:\.\d+)?)/)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

function parsePct(text) {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%/)
  return m ? parseFloat(m[1]) : null
}

function cellTexts(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m =>
    stripTags(m[1]).replace(/\s+/g, ' ').trim()
  )
}

/** Body HTML of the section whose H2 text matches `re`, up to the next H2. */
function sectionHtml(body, re) {
  const heads = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
  for (let i = 0; i < heads.length; i++) {
    const title = stripTags(heads[i][1]).replace(/\s+/g, ' ').trim()
    if (re.test(title)) {
      const start = heads[i].index + heads[i][0].length
      const end = i + 1 < heads.length ? heads[i + 1].index : body.length
      return body.slice(start, end)
    }
  }
  return null
}

/* ── checks ─────────────────────────────────────────────────────── */

function checkSections(body, errors) {
  const found = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m =>
    stripTags(m[1]).replace(/\s+/g, ' ').trim()
  )
  let cursor = 0
  for (const section of REQUIRED_SECTIONS) {
    const at = found.findIndex((h, i) => i >= cursor && section.re.test(h))
    if (at === -1) {
      const anywhere = found.some(h => section.re.test(h))
      errors.push(
        anywhere
          ? `section "${section.name}" is out of order (v2 requires the 9-section sequence)`
          : `section "${section.name}" missing`
      )
    } else {
      cursor = at + 1
    }
  }
}

function checkBannedPhrases(raw, errors) {
  const lines = raw.split('\n')
  for (const phrase of BANNED_PHRASES) {
    lines.forEach((line, i) => {
      // \b guards "boasts" from matching inside longer words.
      const re = new RegExp(`\\b${phrase.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')}\\b`, 'i')
      if (re.test(line)) errors.push(`banned phrase "${phrase}" at line ${i + 1}`)
    })
  }
}

function checkOutboundLinks(body, errors) {
  for (const m of body.matchAll(/href="(https?:\/\/[^"]+)"/gi)) {
    let host
    try {
      host = new URL(m[1]).hostname.replace(/^www\./, '')
    } catch {
      errors.push(`malformed href: ${m[1]}`)
      continue
    }
    if (CITATION_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) continue
    errors.push(`bare outbound link to ${host} — must route through /go/<firm-slug>`)
  }
}

function loadChallenges(firmSlug) {
  const file = path.join(CHALLENGES, `${firmSlug}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function checkSourceFreshness(challenges, errors) {
  const seen = new Map()
  const badUrls = new Set()
  for (const c of challenges) {
    if (!c.sourceUrl) {
      errors.push(`challenge "${c.productName}" has no sourceUrl`)
    } else if (!/^https?:\/\//i.test(c.sourceUrl) && !badUrls.has(c.sourceUrl)) {
      // A sourceUrl pointing at our own review is a circular citation: the
      // review claims the data file as its source while the data file
      // claims the review. Neither traces to the firm's published terms.
      badUrls.add(c.sourceUrl)
      errors.push(
        `sourceUrl "${c.sourceUrl}" is an internal path — circular citation, must be the firm's public URL`
      )
    }
    if (!c.sourceCapturedAt) {
      errors.push(`challenge "${c.productName}" has no sourceCapturedAt`)
      continue
    }
    const age = Math.floor((TODAY - new Date(c.sourceCapturedAt)) / 86400000)
    if (age > STALE_DAYS && !seen.has(c.sourceCapturedAt)) {
      seen.set(c.sourceCapturedAt, true)
      errors.push(
        `source data stale: sourceCapturedAt ${c.sourceCapturedAt} is ${age} days old (gate: ${STALE_DAYS})`
      )
    }
  }
}

/**
 * AGENTS.md: "Never invent numbers — use null and add an explanatory notes
 * entry when data isn't verifiable." A firm whose every tier is priceUsd:
 * null and priceEur: null has no verified pricing at all, so any fee its
 * review prints was invented downstream of the data layer. EUR-native firms
 * such as FTMO and Bright Funded are priced even though priceUsd stays null.
 * Scoped to fully-unpriced firms so composite fee columns (Topstep's "XFA
 * activation", Take Profit Trader's "1 mo + $130") aren't flagged on firms
 * that do have pricing.
 */
function checkUnsourcedPrices(body, challenges, errors, warnings) {
  const tiers = challenges.flatMap(c => c.accountSizes ?? [])
  if (!tiers.length || tiers.some(t => t.priceUsd != null || t.priceEur != null)) return

  const section = sectionHtml(body, /^true cost to break even$/i)
  if (!section) return

  const rows = []
  for (const table of section.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    for (const row of table[0].matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)) {
      if (!/<td/i.test(row[0])) continue
      const cells = cellTexts(row[0])
      if (cells.some(c => /\$\s*[\d,]/.test(c))) rows.push(cells[0])
    }
  }
  if (!rows.length) return

  // The template tolerates placeholder math when the review says plainly
  // that the figures are unverified ("illustrative", "substitute your
  // actual plan price"). That's a disclosed data gap, not an invented
  // number — worth tracking as capture backlog, not failing the build.
  // An unhedged table presents the same guess as fact, which is the thing
  // AGENTS.md forbids.
  const hedged =
    /\b(illustrative|approx|estimate[sd]?|placeholder|substitute|parameteri[sz]ed|confirm (?:the |your )?current)\b/i.test(
      stripTags(section)
    )
  const detail =
    `every accountSizes[].priceUsd for this firm is null, but the True-Cost table ` +
    `prices ${rows.length} row(s) (${rows.slice(0, 3).join(', ')}${rows.length > 3 ? ', …' : ''})`

  if (hedged) {
    warnings.push(`unsourced pricing (disclosed as illustrative): ${detail}`)
  } else {
    errors.push(`unsourced pricing: ${detail} — no hedge disclosed`)
  }
}

/**
 * Reproduce the True-Cost table with computeTrueCost().
 *
 * Column roles are detected from the header text rather than position,
 * because reviews legitimately differ: Topstep has "XFA activation" where
 * FXIFY has "Fee", and FTMO carries two break-even columns (80% and 90%).
 * The split % and max-DD % are read out of the header labels themselves —
 * that's where the review states its own assumptions, so checking against
 * them catches a header/body mismatch too.
 */
/**
 * The math check proves a table is internally consistent; it cannot tell
 * whether the fee it starts from is the fee the firm actually charges.
 * This one anchors the table to content/data/challenges/<firm>.json, so a
 * capture pass that moves a price surfaces every review still quoting the
 * old one.
 *
 * Deliberately narrow. Only plain "Fee"/"Price" columns are checked —
 * composite columns like Topstep's "XFA activation" or Take Profit
 * Trader's "Cost to funded (1 mo + $130)" are not a challenge tier price
 * and would false-positive.
 */
function checkFeesAgainstData(table, headers, feeIdx, challenges, errors) {
  const header = headers[feeIdx] ?? ''
  if (!/\b(fee|price)\b/i.test(header)) return
  if (/[+]|activation|subscription|cost to|1 mo/i.test(header)) return

  const priced = challenges.flatMap(c =>
    (c.accountSizes ?? [])
      .filter(t => t.priceUsd != null)
      .map(t => ({ product: c.productName ?? '', sizeUsd: t.sizeUsd, priceUsd: t.priceUsd }))
  )
  if (!priced.length) return

  for (const row of table.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)) {
    if (!/<td/i.test(row[0])) continue
    const cells = cellTexts(row[0])
    const label = cells[0] ?? ''
    const size = parseSize(label)
    const stated = parseMoney(cells[feeIdx] ?? '')
    if (size == null || stated == null) continue

    let candidates = priced.filter(t => t.sizeUsd === size)
    if (!candidates.length) continue

    // "$6K Stellar 2-Step" names its product — pin to it so a firm with
    // several products at the same tier size doesn't match loosely.
    const named = candidates.filter(
      t => t.product && label.toLowerCase().includes(t.product.toLowerCase())
    )
    if (named.length) candidates = named

    if (!candidates.some(t => Math.abs(t.priceUsd - stated) <= 1)) {
      errors.push(
        `True-Cost row "${label}": states fee $${stated}, but challenges JSON has ` +
          `${candidates.map(t => `$${t.priceUsd}${t.product ? ` (${t.product})` : ''}`).join(' / ')} ` +
          `for the $${size} tier`
      )
    }
  }
}

function checkTrueCostMath(body, errors, warnings, challenges) {
  const section = sectionHtml(body, /^true cost to break even$/i)
  if (!section) return // section-presence check already reported this

  // A firm whose products carry different splits or DD caps (FundedNext:
  // Stellar 2-Step at 95%/10% vs Stellar Instant at 80%/6%) must use one
  // table per product, so each header's stated assumptions hold for every
  // row beneath it. Audit them all.
  const tables = [...section.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => m[0])
  if (!tables.length) {
    const tiers = challenges?.flatMap(challenge => challenge.accountSizes ?? []) ?? []
    const fullyUnpriced =
      tiers.length > 0 &&
      tiers.every(tier => tier.priceUsd == null && tier.priceEur == null)
    const explicitlyDisclosed =
      /\b(no|0)\s+verified\s+fees?\b|price fields? (?:are|is) null|cannot be generated without inventing/i.test(
        stripTags(section),
      )
    if (fullyUnpriced && explicitlyDisclosed) return
    warnings.push('True-Cost section has no table — cannot math-audit')
    return
  }

  let audited = 0
  for (const table of tables) audited += auditTrueCostTable(table, errors, warnings, challenges)
  if (!audited) warnings.push('True-Cost table parsed but no row yielded checkable numbers')
}

function auditTrueCostTable(table, errors, warnings, challenges) {
  const headerRow = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/i)
  const headers = headerRow ? cellTexts(headerRow[0]) : []
  if (!headers.length) {
    warnings.push('True-Cost table has no header row — cannot math-audit')
    return 0
  }

  const feeIdx = headers.findIndex(h => /\b(fee|cost|activation|price)\b/i.test(h))
  const beIdxs = headers
    .map((h, i) => (/break[- ]?even/i.test(h) && !/days?/i.test(h) ? i : -1))
    .filter(i => i >= 0)
  const maxLossIdx = headers.findIndex(h => /\bmax(?:imum)? loss\b/i.test(h))
  const dailyLossIdx = headers.findIndex(h => /\bdaily loss\b/i.test(h))
  const rIdx = headers.findIndex(h => /r[- ]multiple/i.test(h))
  // Only a column that states a growth assumption ("Days @ 1%/day",
  // "Days to break-even") is a computeTrueCost dayCount. Take Profit
  // Trader's "Min days" column is the firm's minimum-trading-days *rule* —
  // a different quantity that must not be math-checked against dayCount.
  const daysIdx = headers.findIndex(
    h => /\bdays?\b/i.test(h) && /(@|\/\s*day|per\s*day|break[- ]?even)/i.test(h)
  )

  if (feeIdx === -1 || !beIdxs.length) {
    warnings.push(
      `True-Cost table columns unrecognised (headers: ${headers.join(' | ')}) — cannot math-audit`
    )
    return 0
  }

  const ddPct = rIdx >= 0 ? parsePct(headers[rIdx]) : null
  // "Days @ 1%/day (4% cap)" → the 4% daily-loss cap. Strip the 1%/day
  // growth assumption first so it isn't mistaken for the cap. Absent → no
  // cap binds below 1%/day, so pass a large value.
  const dailyCapPct =
    daysIdx >= 0 ? (parsePct(headers[daysIdx].replace(/1\s*%\s*\/?\s*day/i, '')) ?? 100) : 100

  if (challenges) checkFeesAgainstData(table, headers, feeIdx, challenges, errors)

  const rows = [...table.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)]
    .map(m => m[0])
    .filter(r => /<td/i.test(r))

  let audited = 0
  for (const row of rows) {
    const cells = cellTexts(row)
    const size = parseSize(cells[0] ?? '')
    const fee = parseMoney(cells[feeIdx] ?? '')
    const maxLossUsd = maxLossIdx >= 0 ? parseMoney(cells[maxLossIdx] ?? '') : null
    const dailyLossUsd = dailyLossIdx >= 0 ? parseMoney(cells[dailyLossIdx] ?? '') : null
    if (size == null || fee == null) continue

    // A row may override the header's split — FundingPips prices a
    // "$100K @ 100% scaled" row against the same table's 80% baseline.
    // Require the word split/scaled so FXIFY's "(with ~40% promo)" tier
    // label isn't misread as a 40% profit split.
    const rowSplit = (cells[0].match(/(\d+(?:\.\d+)?)\s*%\s*(?:split|scaled|scaling)/i) || [])[1]

    for (const beIdx of beIdxs) {
      const split = rowSplit != null ? parseFloat(rowSplit) : parsePct(headers[beIdx])
      const stated = parseMoney(cells[beIdx] ?? '')
      if (split == null || stated == null) continue

      const { breakEvenProfit, rMultiple, dayCount } = computeTrueCost({
        priceUsd: fee,
        sizeUsd: size,
        profitSplitPct: split,
        dailyLossPct:
          dailyLossUsd != null && size > 0
            ? (dailyLossUsd / size) * 100
            : dailyCapPct,
        maxLossPct: ddPct,
        maxLossUsd,
      })
      audited++

      const expected = Math.round(breakEvenProfit)
      if (Math.abs(expected - stated) > 1) {
        errors.push(
          `True-Cost row "${cells[0]}": break-even at ${split}% split states $${stated}, ` +
            `computeTrueCost() gives $${expected} (fee $${fee} / ${split / 100})`
        )
      }

      // R and days are stated once per row, against the first break-even
      // column's split — don't re-check them for FTMO's second column.
      if (beIdx !== beIdxs[0]) continue

      if (rIdx >= 0 && rMultiple != null) {
        const statedR = parseFloat(cells[rIdx])
        if (Number.isFinite(statedR) && Math.abs(rMultiple - statedR) > 0.011) {
          errors.push(
            `True-Cost row "${cells[0]}": R-multiple states ${statedR}, ` +
            `computeTrueCost() gives ${rMultiple.toFixed(2)} ` +
              (maxLossUsd != null
                ? `($${expected} / $${maxLossUsd} tier max loss)`
                : `($${expected} / ${ddPct}% of $${size})`)
          )
        }
      }

      if (daysIdx >= 0 && dayCount != null) {
        const statedDays = parseInt(cells[daysIdx], 10)
        if (Number.isFinite(statedDays) && statedDays !== dayCount) {
          errors.push(
            `True-Cost row "${cells[0]}": days states ${statedDays}, ` +
              `computeTrueCost() gives ${dayCount}`
          )
        }
      }
    }
  }
  return audited
}

/** Fact-density floor: every paragraph carries a number, a named rule, or a
 *  sourced claim. Heuristic by nature, so this only ever warns. */
function checkFactDensity(body, warnings) {
  const ruleWords =
    /\b(drawdown|consistency|profit split|payout|leverage|phase|trailing|static|scaling|breach|EA|news|weekend|overnight|refund|eligibility|KYC|platform|restricted countries|min(?:imum)? trading days)\b/i
  const paras = [...body.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(m =>
    stripTags(m[1]).replace(/\s+/g, ' ').trim()
  )
  const thin = paras.filter(
    p => p.length > 120 && !/\d/.test(p) && !ruleWords.test(p)
  )
  for (const p of thin) {
    warnings.push(`thin paragraph (no number or named rule): "${p.slice(0, 90)}…"`)
  }
}

/* ── runner ─────────────────────────────────────────────────────── */

const argv = process.argv.slice(2)
const showWarnings = argv.includes('--warn')
const filter = argv.find(a => !a.startsWith('--'))

let totalErrors = 0
let totalWarnings = 0
const clean = []

for (const [postSlug, firmSlug] of Object.entries(REVIEW_TO_FIRM)) {
  if (filter && !postSlug.includes(filter) && !firmSlug.includes(filter)) continue

  const file = path.join(POSTS, `${postSlug}.md`)
  if (!fs.existsSync(file)) {
    console.log(`\n✗ ${postSlug}\n  · post file not found`)
    totalErrors++
    continue
  }

  const raw = fs.readFileSync(file, 'utf-8')
  const { content: body, data: fm } = matter(raw)

  const errors = []
  const warnings = []

  checkSections(body, errors)
  checkBannedPhrases(raw, errors)
  checkOutboundLinks(body, errors)
  checkFactDensity(body, warnings)

  const challenges = loadChallenges(firmSlug)
  checkTrueCostMath(body, errors, warnings, challenges)
  if (!challenges) {
    errors.push(`no challenges file at content/data/challenges/${firmSlug}.json`)
  } else {
    checkSourceFreshness(challenges, errors)
    checkUnsourcedPrices(body, challenges, errors, warnings)
  }

  const words = wordCount(body)
  if (words < WORD_FLOOR) errors.push(`word count ${words} below floor ${WORD_FLOOR}`)
  if (words > WORD_CEILING) errors.push(`word count ${words} above ceiling ${WORD_CEILING}`)
  if (!fm.modified) warnings.push('frontmatter has no `modified` date')

  totalErrors += errors.length
  totalWarnings += warnings.length

  if (errors.length || (showWarnings && warnings.length)) {
    console.log(`\n${errors.length ? '✗' : '⚠'} ${postSlug}  (${words} words)`)
    for (const e of errors) console.log(`  · ${e}`)
    if (showWarnings) for (const w of warnings) console.log(`  ~ ${w}`)
  } else {
    clean.push(`${postSlug} (${words}w${warnings.length ? `, ${warnings.length} warn` : ''})`)
  }
}

/* ── firm aggregate vs per-challenge consistency ────────────────── */

/**
 * firms.json holds the aggregate card shown in tables and comparisons;
 * challenges/<firm>.json holds the per-product truth captured from the
 * firm's own pages. Nothing kept them in sync, so a capture pass silently
 * left the two disagreeing — e.g. Maven's card claiming EAs are allowed
 * while every captured product bans them. The card is what renders in the
 * comparison table, so a stale card misinforms readers on the highest-
 * traffic surfaces.
 *
 * Only fields the challenge data can actually adjudicate are compared, and
 * only against firms whose challenge data is at least as fresh as the card.
 */
function checkFirmAggregates() {
  const firmsPath = path.join(ROOT, 'content/data/firms.json')
  if (!fs.existsSync(firmsPath)) return 0
  const firms = JSON.parse(fs.readFileSync(firmsPath, 'utf-8'))
  const slugify = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const FIELDS = [
    ['drawdownType', c => c.drawdownType],
    ['profitSplitPct', c => c.profitSplitPct],
    ['payoutFrequency', c => c.payoutFrequency],
    ['eaAllowed', c => c.rules?.ea],
    ['newsTradingAllowed', c => c.rules?.news],
    ['weekendAllowed', c => c.rules?.weekend],
    ['overnightAllowed', c => c.rules?.overnight],
    ['copyTradingAllowed', c => c.rules?.copyTrading],
  ]
  const RULE_FIELDS = new Set([
    'eaAllowed',
    'newsTradingAllowed',
    'weekendAllowed',
    'overnightAllowed',
    'copyTradingAllowed',
  ])

  let count = 0
  for (const firm of firms) {
    const slug = slugify(firm.name)
    // Respect the CLI firm filter, so `npm run audit -- e8-markets` reports
    // only that firm rather than every card mismatch on the site.
    if (filter && !slug.includes(filter) && !firm.name.toLowerCase().includes(filter.toLowerCase())) continue
    const challenges = loadChallenges(slug)
    if (!challenges?.length) continue

    const rows = []
    for (const [field, pick] of FIELDS) {
      const declared = firm[field]
      if (declared == null) continue
      const observed = [...new Set(challenges.map(pick).filter(v => v != null))]
      if (!observed.length) continue
      // `restricted` is the aggregate representation for a rule that varies
      // across products, even when the product rows themselves are true/false.
      if (RULE_FIELDS.has(field) && declared === 'restricted' && observed.length > 1) {
        continue
      }
      // Other declared values must be present on at least one product. Mixed
      // financial fields should be nulled when no single value is defensible.
      if (!observed.includes(declared)) {
        rows.push(`${field}: card says ${JSON.stringify(declared)}, products say ${observed.map(v => JSON.stringify(v)).join(' / ')}`)
      }
    }
    // Trustpilot figures rot like challenge pricing does. A wider gate than
    // the 30-day pricing one: scores drift slowly, but an undated figure
    // presented as current is the thing to catch.
    const hasFigure = firm.trustpilotScore != null || firm.trustpilotRatingSuppressed
    if (hasFigure && !firm.trustpilotCapturedAt) {
      rows.push('trustpilot figures present but trustpilotCapturedAt is missing — undated')
    } else if (hasFigure) {
      const age = Math.floor((TODAY - new Date(firm.trustpilotCapturedAt)) / 86400000)
      if (age > TRUSTPILOT_STALE_DAYS) {
        rows.push(`trustpilotCapturedAt ${firm.trustpilotCapturedAt} is ${age} days old (gate: ${TRUSTPILOT_STALE_DAYS})`)
      }
    }

    if (rows.length) {
      count += rows.length
      console.log(`
✗ firms.json — ${firm.name}`)
      for (const r of rows) console.log(`  · ${r}`)
    }
  }
  return count
}

/**
 * A directory row is only publishable when it has both fresh product data and
 * a review that is included in this audit. This closes the gap where adding a
 * firms.json object could create 15+ comparison pages while its review stayed
 * missing or escaped Reviews v2 validation.
 */
function checkFirmCoverage() {
  const firmsPath = path.join(ROOT, 'content/data/firms.json')
  if (!fs.existsSync(firmsPath)) return 0

  const rows = []
  const searchTitles = new Map()
  const searchDescriptions = new Map()
  const firms = JSON.parse(fs.readFileSync(firmsPath, 'utf-8'))
  const slugify = name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  for (const firm of firms) {
    const firmSlug = slugify(firm.name)
    if (
      filter &&
      !firmSlug.includes(filter) &&
      !firm.name.toLowerCase().includes(filter.toLowerCase())
    ) {
      continue
    }

    const challengeFile = path.join(CHALLENGES, `${firmSlug}.json`)
    if (!fs.existsSync(challengeFile)) {
      rows.push(`${firm.name}: challenge file content/data/challenges/${firmSlug}.json is missing`)
    } else {
      const challenges = JSON.parse(fs.readFileSync(challengeFile, 'utf-8'))
      if (!Array.isArray(challenges) || challenges.length === 0) {
        rows.push(`${firm.name}: challenge file has no products`)
      } else if (challenges.some(challenge => challenge.firmSlug !== firmSlug)) {
        rows.push(`${firm.name}: one or more challenge rows use the wrong firmSlug`)
      }
    }

    if (!/^\/blog\/[a-z0-9-]+$/.test(firm.reviewUrl ?? '')) {
      rows.push(`${firm.name}: reviewUrl must be a canonical /blog/<slug> path`)
      continue
    }

    const reviewSlug = firm.reviewUrl.slice('/blog/'.length)
    const reviewFile = path.join(POSTS, `${reviewSlug}.md`)
    if (!fs.existsSync(reviewFile)) {
      rows.push(`${firm.name}: review file content/posts/${reviewSlug}.md is missing`)
      continue
    }

    const review = matter(fs.readFileSync(reviewFile, 'utf-8'))
    if (review.data.slug !== reviewSlug) {
      rows.push(
        `${firm.name}: review frontmatter slug ${JSON.stringify(review.data.slug)} ` +
          `does not match reviewUrl ${firm.reviewUrl}`
      )
    }
    if (REVIEW_TO_FIRM[reviewSlug] !== firmSlug) {
      rows.push(
        `${firm.name}: ${reviewSlug} is not mapped to ${firmSlug} in REVIEW_TO_FIRM, ` +
          `so Reviews v2 would not audit it`
      )
    }

    const seoTitle = String(review.data.seoTitle || '')
    const seoDescription = String(review.data.seoDescription || '')
    if (!seoTitle) {
      rows.push(`${firm.name}: review frontmatter is missing seoTitle`)
    } else {
      if (seoTitle.length > 60) {
        rows.push(`${firm.name}: review seoTitle is ${seoTitle.length} characters`)
      }
      if (!seoTitle.startsWith(firm.name) || !seoTitle.includes('Review 2026:')) {
        rows.push(`${firm.name}: review seoTitle must preserve firm-review intent and year`)
      }
      if (seoTitle.endsWith(': Fees & Rules')) {
        rows.push(`${firm.name}: review seoTitle uses the undifferentiated Fees & Rules fallback`)
      }
      const owners = searchTitles.get(seoTitle) || []
      owners.push(firm.name)
      searchTitles.set(seoTitle, owners)
    }
    if (!seoDescription) {
      rows.push(`${firm.name}: review frontmatter is missing seoDescription`)
    } else {
      if (seoDescription.length < 120 || seoDescription.length > 160) {
        rows.push(
          `${firm.name}: review seoDescription is ${seoDescription.length} characters`,
        )
      }
      const descriptionLead = seoDescription.slice(0, firm.name.length + 24).toLowerCase()
      if (
        !descriptionLead.startsWith(firm.name.toLowerCase())
        || !descriptionLead.includes('review')
      ) {
        rows.push(`${firm.name}: review seoDescription must identify the reviewed firm`)
      }
      const owners = searchDescriptions.get(seoDescription) || []
      owners.push(firm.name)
      searchDescriptions.set(seoDescription, owners)
    }
  }

  for (const [title, owners] of searchTitles) {
    if (owners.length > 1) rows.push(`duplicate review seoTitle for ${owners.join(', ')}: ${title}`)
  }
  for (const [description, owners] of searchDescriptions) {
    if (owners.length > 1) {
      rows.push(`duplicate review seoDescription for ${owners.join(', ')}: ${description}`)
    }
  }

  const blogRoute = fs.readFileSync(BLOG_POST_PAGE_FILE, 'utf-8')
  if (
    !blogRoute.includes('const title = post.seoTitle || post.title')
    || !blogRoute.includes(
      'const description = post.seoDescription || post.excerpt || post.title',
    )
    || blogRoute.includes('Review (2026): Fees & Rules')
  ) {
    rows.push('blog metadata fallback must preserve each post\'s editorial title and excerpt')
  }
  const releaseCrawl = fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
  if (
    !releaseCrawl.includes('const firmReviewPostRecords = new Map')
    || !releaseCrawl.includes(
      'firm-review title, description or H1 disagrees with frontmatter',
    )
  ) {
    rows.push('release crawl is missing the rendered firm-review metadata contract')
  }

  if (rows.length) {
    console.log('\nâœ— Global firm coverage')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/**
 * Commercial placement must never alter rankings or masquerade as an organic
 * link. This also protects the deliberately small affiliate allow-list from
 * accidental URL replacement when firm data is refreshed.
 */
function checkTrustAndCommercialSurface() {
  const rows = []
  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const approvedAffiliates = new Map([
    ['fundednext', 'https://fundednext.com/?fpr=karlis56'],
    ['fundingpips', 'https://app.fundingpips.com/register?referral_code=1d94705c'],
    ['bright-funded', 'https://brightfunded.com/a/nIfOFrQBTUK-00O1dIjiSQ'],
  ])
  const slugify = name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const officialRoot = hostname => {
    const parts = hostname.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean)
    const suffix = parts.slice(-2).join('.')
    return ['co.uk', 'org.uk', 'com.au'].includes(suffix)
      ? parts.slice(-3).join('.')
      : suffix
  }

  for (const firm of firms) {
    const slug = slugify(firm.name)
    const approvedAffiliate = approvedAffiliates.get(slug)
    if ((firm.affiliateUrl || undefined) !== approvedAffiliate) {
      rows.push(
        `${firm.name}: affiliateUrl differs from the approved allow-list`,
      )
    }

    let officialHost
    try {
      const official = new URL(firm.officialUrl)
      if (official.protocol !== 'https:') {
        rows.push(`${firm.name}: officialUrl must use HTTPS`)
      }
      officialHost = officialRoot(official.hostname)
    } catch {
      rows.push(`${firm.name}: officialUrl is missing or invalid`)
    }

    const challenges = loadChallenges(slug) ?? []
    try {
      const sourceHost = officialRoot(new URL(challenges[0]?.sourceUrl).hostname)
      if (officialHost && officialHost !== sourceHost) {
        rows.push(`${firm.name}: officialUrl does not match its first-party challenge domain`)
      }
    } catch {
      rows.push(`${firm.name}: cannot validate officialUrl against challenge source`)
    }
  }

  const route = fs.readFileSync(path.join(ROOT, 'app/go/[firm]/route.ts'), 'utf-8')
  if (!route.includes('NextResponse.redirect(match.officialUrl, 302)')) {
    rows.push('/go non-partner fallback must redirect to firm.officialUrl')
  }
  if (route.includes('NextResponse.redirect(new URL(match.reviewUrl')) {
    rows.push('/go must not loop a non-partner click back to its own review')
  }

  const blogPage = fs.readFileSync(path.join(ROOT, 'app/blog/[slug]/page.tsx'), 'utf-8')
  for (const token of ['decoratePostOutboundLinks', 'buildOutboundRelationships']) {
    if (!blogPage.includes(token)) {
      rows.push(`blog outbound-link rel guard is missing ${token}`)
    }
  }
  for (const token of [
    'firmName={matchedFirm.name}',
    'hasAffiliate={Boolean(matchedFirm.affiliateUrl)}',
  ]) {
    if (!blogPage.includes(token)) {
      rows.push(`firm-review disclosure is missing relationship input ${token}`)
    }
  }
  const postLinkDecorator = fs.readFileSync(
    path.join(ROOT, 'lib/postOutboundLinks.ts'),
    'utf-8',
  )
  for (const token of [
    "=== 'affiliate'",
    "'sponsored nofollow noopener'",
    "'nofollow noopener'",
  ]) {
    if (!postLinkDecorator.includes(token)) {
      rows.push(`post outbound-link rel guard is missing ${token}`)
    }
  }

  const firmCta = fs.readFileSync(
    path.join(ROOT, 'components/FirmCtaCard.tsx'),
    'utf-8',
  )
  for (const token of [
    'href={goUrl}',
    "hasAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'",
    "hasAffiliate ? `Visit ${firm.name}` : 'View official plans'",
  ]) {
    if (!firmCta.includes(token)) {
      rows.push(`review CTA is missing outbound safeguard: ${token}`)
    }
  }
  if (firmCta.includes('href={firm.reviewUrl}') || firmCta.includes('Read full review')) {
    rows.push('review CTA must not link back to the current review')
  }

  const affiliateDisclosure = fs.readFileSync(
    path.join(ROOT, 'components/AffiliateDisclosure.tsx'),
    'utf-8',
  )
  for (const token of [
    "const relationship = hasAffiliate ? 'affiliate' : 'official'",
    'data-affiliate-disclosure={relationship}',
    'We may earn a commission if you sign up via eligible links on this page',
    'Traders Fund Hub does not currently record an affiliate relationship with',
    'Links to the firm open its official website without',
    "firmName || 'this firm'",
  ]) {
    if (!affiliateDisclosure.includes(token)) {
      rows.push(`affiliate disclosure is missing relationship safeguard: ${token}`)
    }
  }
  if (affiliateDisclosure.includes('We earn a\n      commission if you sign up via links on this page')) {
    rows.push('affiliate disclosure restored an unconditional commission claim')
  }

  const mobileCta = fs.readFileSync(
    path.join(ROOT, 'components/MobileStickyCTA.tsx'),
    'utf-8',
  )
  for (const token of [
    'const ctaHref = `/go/${affiliateSlug}?from=mobile-sticky`',
    "hasAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'",
    "hasAffiliate ? 'View plans' : 'Official site'",
  ]) {
    if (!mobileCta.includes(token)) {
      rows.push(`mobile review CTA is missing outbound safeguard: ${token}`)
    }
  }
  if (mobileCta.includes('reviewUrl')) {
    rows.push('mobile review CTA must not accept a self-link destination')
  }

  const comparisons = fs.readFileSync(path.join(ROOT, 'lib/comparisons.ts'), 'utf-8')
  if (
    !comparisons.includes('overlay.reviewedAt < latestFirmUpdate') ||
    !comparisons.includes('overlay.challengeReviewedAt < latestProductCapture') ||
    !comparisons.includes('if (!overlay?.reviewedAt || !overlay.challengeReviewedAt) return undefined') ||
    !comparisons.includes('export function getActiveOverlays()')
  ) {
    rows.push('comparison overlays must fail closed unless aggregate and product captures were reviewed')
  }
  const comparisonHub = fs.readFileSync(
    path.join(ROOT, 'app/compare/page.tsx'),
    'utf-8',
  )
  if (
    !comparisonHub.includes('getActiveOverlays()') ||
    comparisonHub.includes('COMPARISON_OVERLAYS[slug]')
  ) {
    rows.push('comparison hub must project editorial copy through the shared freshness gate')
  }
  const comparisonPage = fs.readFileSync(
    path.join(ROOT, 'app/compare/[matchup]/page.tsx'),
    'utf-8',
  )
  if (comparisonPage.includes('Updated May 2026')) {
    rows.push('comparison page contains a frozen May 2026 freshness label')
  }

  const deals = fs.readFileSync(path.join(ROOT, 'lib/deals.ts'), 'utf-8')
  if (!deals.includes('isDealFresh(deal, now)')) {
    rows.push('deal loader must suppress offers outside the 30-day verification window')
  }

  const footer = fs.readFileSync(path.join(ROOT, 'components/Footer.tsx'), 'utf-8')
  if (/href=["']#["']/.test(footer)) {
    rows.push('footer contains placeholder social links')
  }

  const home = fs.readFileSync(path.join(ROOT, 'app/page.tsx'), 'utf-8')
  for (const phrase of ['best for beginners', 'lowest-risk', 'standing 10%']) {
    if (home.toLowerCase().includes(phrase)) {
      rows.push(`homepage contains unsupported promotional phrase: ${phrase}`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Trust and commercial integrity')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Partnership data may change badges and rel values, never recommendations. */
function checkFirmAlternativeNeutrality() {
  const rows = []
  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const selectedNames = (current, candidates) =>
    rankFirmAlternatives(current, candidates).map(firm => firm.name)
  const baseline = new Map(
    firms.map(current => [current.name, selectedNames(current, firms)]),
  )
  const toggled = firms.map(firm => ({
    ...firm,
    affiliateUrl: firm.affiliateUrl
      ? ''
      : `https://affiliate-toggle.invalid/${encodeURIComponent(firm.name)}`,
  }))

  for (const current of firms) {
    const expected = baseline.get(current.name)
    const reversed = selectedNames(current, [...firms].reverse())
    if (JSON.stringify(reversed) !== JSON.stringify(expected)) {
      rows.push(`${current.name}: alternatives depend on input order`)
    }
  }
  for (const current of toggled) {
    const selected = selectedNames(current, toggled)
    if (JSON.stringify(selected) !== JSON.stringify(baseline.get(current.name))) {
      rows.push(`${current.name}: alternatives depend on affiliate configuration`)
    }
  }

  const topstep = firms.find(firm => firm.name === 'Topstep')
  const topstepAlternatives = topstep ? rankFirmAlternatives(topstep, firms) : []
  if (
    topstepAlternatives.length !== 3
    || topstepAlternatives.some(firm =>
      !firm.assets.some(asset => asset.toLowerCase() === 'futures'))
  ) {
    rows.push('Topstep alternatives must be 3 futures-relevant firms')
  }

  for (const firm of firms) {
    const evidence = getFreshFirmEvidence(firm)
    if (!evidence.productCount || !evidence.sourceCount || !evidence.latestCapture) {
      rows.push(`${firm.name}: review alternative evidence is not current and attributable`)
    }
    const comparisonFirms = rankFirmAlternatives(firm, firms, firms.length)
    const comparisonHrefs = comparisonFirms.map(candidate => comparisonHref(firm, candidate))
    if (
      comparisonFirms.length !== firms.length - 1
      || new Set(comparisonHrefs).size !== firms.length - 1
    ) {
      rows.push(`${firm.name}: review comparison index must cover every other firm once`)
    }
    for (const candidate of comparisonFirms) {
      const pairEvidence = getFreshComparisonEvidence(firm, candidate)
      if (!pairEvidence.productCount || !pairEvidence.sourceCount || !pairEvidence.latestCapture) {
        rows.push(`${firm.name} vs ${candidate.name}: comparison-index evidence is incomplete`)
      }
    }
  }

  for (let leftIndex = 0; leftIndex < firms.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < firms.length; rightIndex += 1) {
      const firmA = firms[leftIndex]
      const firmB = firms[rightIndex]
      const label = `${firmA.name} vs ${firmB.name}`
      const selected = buildRelatedComparisons(firmA, firmB, firms)
      const reversed = buildRelatedComparisons(firmA, firmB, [...firms].reverse())
      const toggledA = toggled.find(firm => firm.name === firmA.name)
      const toggledB = toggled.find(firm => firm.name === firmB.name)
      const selectedWithToggledPartnerships = toggledA && toggledB
        ? buildRelatedComparisons(toggledA, toggledB, toggled)
        : []
      const matchupIds = selected.map(item => item.matchup)
      const anchorCounts = new Map(
        [firmA.name, firmB.name].map(name => [
          name,
          selected.filter(item => item.anchorName === name).length,
        ]),
      )

      if (selected.length !== 4 || new Set(matchupIds).size !== 4) {
        rows.push(`${label}: related comparisons must contain 4 unique fresh matchups`)
      }
      if ([...anchorCounts.values()].some(count => count !== 2)) {
        rows.push(`${label}: related comparisons must contribute 2 links per firm`)
      }
      if (selected.some(item =>
        item.href !== `/compare/${item.matchup}`
        || item.href === comparisonHref(firmA, firmB)
        || !item.productCount
        || !item.sourceCount
        || !item.latestCapture
      )) {
        rows.push(`${label}: related comparison link or evidence metadata is invalid`)
      }
      if (JSON.stringify(reversed) !== JSON.stringify(selected)) {
        rows.push(`${label}: related comparisons depend on firm input order`)
      }
      if (
        JSON.stringify(selectedWithToggledPartnerships.map(item => item.matchup))
          !== JSON.stringify(matchupIds)
      ) {
        rows.push(`${label}: related comparisons depend on affiliate configuration`)
      }
    }
  }

  const alternativeComponent = fs.existsSync(FIRM_ALTERNATIVES_FILE)
    ? fs.readFileSync(FIRM_ALTERNATIVES_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'Selected by asset and platform overlap, not partnership.',
    'getFreshFirmEvidence(firm)',
    'data-firm-alternative={firmSlug(firm.name)}',
    'data-alternative-products={evidence.productCount}',
    'data-alternative-sources={evidence.sourceCount}',
    'data-alternative-comparison={compareHref}',
    'data-firm-comparison-index={firmSlug(current.name)}',
    'data-firm-comparison-link={href}',
    'data-comparison-products={evidence.productCount}',
    'data-comparison-sources={evidence.sourceCount}',
    'All {allRanked.length} {current.name} comparisons',
    'Each link opens the exact product-level',
    'first-party',
    'checked {formatCaptureDate(evidence.latestCapture)}',
  ]) {
    if (!alternativeComponent.includes(fragment)) {
      rows.push(`firm alternatives are missing "${fragment}"`)
    }
  }
  for (const stale of ['firm.profitSplitPct', 'firm.payoutFrequency']) {
    if (alternativeComponent.includes(stale)) {
      rows.push(`firm alternatives restored flattened field ${stale}`)
    }
  }

  const relatedComponent = fs.existsSync(RELATED_COMPARISONS_FILE)
    ? fs.readFileSync(RELATED_COMPARISONS_FILE, 'utf-8')
    : ''
  const relatedLibrary = fs.existsSync(RELATED_COMPARISONS_LIB_FILE)
    ? fs.readFileSync(RELATED_COMPARISONS_LIB_FILE, 'utf-8')
    : ''
  const comparisonPage = fs.existsSync(COMPARISON_ROUTE_FILE)
    ? fs.readFileSync(COMPARISON_ROUTE_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'data-related-comparisons="true"',
    'data-related-matchup={comparison.matchup}',
    'selected by asset and platform overlap',
    'current first-party product evidence',
    'first-party source',
    'checked',
  ]) {
    if (!relatedComponent.includes(fragment)) {
      rows.push(`related comparison cards are missing "${fragment}"`)
    }
  }
  for (const fragment of [
    'export function getFreshFirmEvidence',
    'export function getFreshComparisonEvidence',
    'export function comparisonHref',
    'export function buildRelatedComparisons',
    'rankFirmAlternatives(',
    'firm.name !== currentOpponent.name',
  ]) {
    if (!relatedLibrary.includes(fragment)) {
      rows.push(`related comparison selector is missing "${fragment}"`)
    }
  }
  if (
    !comparisonPage.includes("import RelatedComparisons from '@/components/RelatedComparisons'")
    || !comparisonPage.includes('<RelatedComparisons firmA={firmA} firmB={firmB} allFirms={allFirms} />')
  ) {
    rows.push('comparison detail template is missing evidence-led related comparisons')
  }

  const releaseCrawl = fs.existsSync(RELEASE_CRAWL_FILE)
    ? fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'generic comparison related links do not match the shared selector',
    'editorial comparison related links do not match the shared selector',
    'review alternatives do not link to their exact comparisons',
    'review comparison index is incomplete or out of order',
    'comparison page has only ${inlinkCount} unique internal inlinks',
  ]) {
    if (!releaseCrawl.includes(fragment)) {
      rows.push(`release crawl is missing related-link safeguard "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Affiliate-neutral firm alternatives')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Futures firms publish fixed dollar loss limits per tier. Preserve the
 * maxLossUsd path from capture through renderer and audit so R-multiple math
 * never falls back to an invented product-wide percentage.
 */
function checkTierDrawdownMathSurface() {
  const rows = []
  const checks = [
    [
      'lib/firms.ts',
      [
        'maxLossUsd?: number | null',
        'input.maxLossUsd',
        'effectiveMaxLossUsd',
        // challengeTierEconomics() is the single place the tier dollar cap is
        // fed into computeTrueCost. Both the review generator and /compare
        // delegate to it, so this token guards every renderer at once.
        'maxLossUsd: tier.maxLossUsd',
      ],
    ],
    [
      'scripts/merge-capture.mjs',
      ['t.maxLossUsd', 'maxLossUsd: num(t.maxLossUsd)'],
    ],
    [
      'scripts/gen-truecost.mjs',
      ['hasTierDollarDrawdown', "headers.push('Max loss')", 'challengeTierEconomics'],
    ],
    [
      'lib/challengeMatchup.ts',
      ['challengeTierEconomics', 'tier.maxLossUsd'],
    ],
    [
      'scripts/audit-reviews.mjs',
      ['maxLossIdx', 'maxLossUsd,'],
    ],
    [
      'components/v4/CostCalculator.tsx',
      ['maxLossUsd: tier?.maxLossUsd'],
    ],
  ]

  for (const [relativePath, tokens] of checks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    for (const token of tokens) {
      if (!body.includes(token)) {
        rows.push(`${relativePath} is missing tier-drawdown safeguard: ${token}`)
      }
    }
  }

  if (rows.length) {
    console.log('\nâœ— Tier-specific True-Cost math')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/**
 * Futures firms can vary activation and daily-loss amounts by account tier.
 * Keep those dollar fields intact from capture through cost rendering so a
 * $25K fee or DLL can never be silently applied to a $150K account.
 */
function checkTierFeeAndDailyLossSurface() {
  const rows = []
  const checks = [
    [
      'lib/firms.ts',
      [
        'activationFeeUsd?: number | null',
        'dailyLossUsd?: number | null',
        'tier.activationFeeUsd ?? challenge.activationFeeUsd',
        // Tier dollar DLL must keep overriding the product-wide percentage
        // inside the shared economics helper, not just in the generator.
        'tier.dailyLossUsd != null',
      ],
    ],
    [
      'scripts/merge-capture.mjs',
      ['t.activationFeeUsd', 't.dailyLossUsd'],
    ],
    [
      'scripts/gen-truecost.mjs',
      ['hasTierActivation', 'hasTierDollarDailyLoss', 't.dailyLossUsd'],
    ],
    [
      'scripts/audit-reviews.mjs',
      ['dailyLossIdx', 'dailyLossUsd != null && size > 0'],
    ],
    [
      'components/v4/CostCalculator.tsx',
      ['tier?.dailyLossUsd', 'tier?.activationFeeUsd'],
    ],
  ]

  for (const [relativePath, tokens] of checks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    for (const token of tokens) {
      if (!body.includes(token)) {
        rows.push(`${relativePath} is missing tier fee/DLL safeguard: ${token}`)
      }
    }
  }

  if (rows.length) {
    console.log('\n✗ Tier-specific fee and daily-loss math')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Execute the shared tier-economics path against synthetic products.
 *
 * The surface checks above protect wiring, but a source-token check can be
 * satisfied by a comment and cannot prove precedence or arithmetic. These
 * fixtures call the same helper used by scripts/gen-truecost.mjs and the
 * product-level comparison renderer, so a regression must produce a real
 * wrong value before this audit can pass.
 */
function checkTrueCostRuntimeFixtures() {
  const rows = []

  const product = overrides => ({
    accountSizes: [],
    pricingModel: 'one-off',
    activationFeeUsd: null,
    profitSplitPct: 80,
    dailyLossPct: 4,
    maxLossPct: 10,
    ...overrides,
  })
  const tier = overrides => ({
    sizeUsd: 10_000,
    priceUsd: 100,
    priceEur: null,
    payLaterUsd: null,
    activationFeeUsd: null,
    dailyLossUsd: null,
    maxLossUsd: null,
    refundable: null,
    ...overrides,
  })

  const expectNumber = (fixture, field, actual, expected, tolerance = 1e-9) => {
    if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance) {
      rows.push(`${fixture}: ${field} expected ${expected}, received ${String(actual)}`)
    }
  }
  const expectNull = (fixture, field, actual) => {
    if (actual !== null) {
      rows.push(`${fixture}: ${field} expected null, received ${String(actual)}`)
    }
  }
  const run = (name, challenge, accountTier) => {
    const productWithTier = challenge.accountSizes.length
      ? challenge
      : { ...challenge, accountSizes: [accountTier] }
    const result = challengeTierEconomics(productWithTier, accountTier)
    if (!result) rows.push(`${name}: challengeTierEconomics returned null`)
    return result
  }

  const oneOff = run('one-off USD', product(), tier())
  if (oneOff) {
    expectNumber('one-off USD', 'minimumCost', oneOff.minimumCost, 100)
    expectNumber('one-off USD', 'breakEvenProfit', oneOff.breakEvenProfit, 125)
    expectNumber('one-off USD', 'rMultiple', oneOff.rMultiple, 0.125)
    expectNumber('one-off USD', 'dayCount', oneOff.dayCount, 2)
  }

  const productActivation = run(
    'product activation',
    product({ activationFeeUsd: 25 }),
    tier(),
  )
  if (productActivation) {
    expectNumber('product activation', 'minimumCost', productActivation.minimumCost, 125)
  }

  const tierActivation = run(
    'tier activation precedence',
    product({ activationFeeUsd: 25 }),
    tier({ activationFeeUsd: 40 }),
  )
  if (tierActivation) {
    expectNumber('tier activation precedence', 'minimumCost', tierActivation.minimumCost, 140)
  }

  const subscription = run(
    'subscription activation',
    product({ pricingModel: 'monthly-subscription', activationFeeUsd: 149 }),
    tier({ priceUsd: 49 }),
  )
  if (subscription) {
    expectNumber('subscription activation', 'minimumCost', subscription.minimumCost, 198)
  }

  const splitPayment = run(
    'split-payment pay-later',
    product({ pricingModel: 'split-payment' }),
    tier({ priceUsd: 5, payLaterUsd: 40 }),
  )
  if (splitPayment) {
    expectNumber('split-payment pay-later', 'minimumCost', splitPayment.minimumCost, 45)
  }

  const tierRisk = run(
    'tier daily/max-loss override',
    product({ dailyLossPct: 4, maxLossPct: 10 }),
    tier({ priceUsd: 800, dailyLossUsd: 50, maxLossUsd: 200 }),
  )
  if (tierRisk) {
    expectNumber('tier daily/max-loss override', 'breakEvenProfit', tierRisk.breakEvenProfit, 1_000)
    expectNumber('tier daily/max-loss override', 'rMultiple', tierRisk.rMultiple, 5)
    expectNumber('tier daily/max-loss override', 'dayCount', tierRisk.dayCount, 20)
  }

  const unknownDailyLoss = run(
    'unknown daily-loss',
    product({ dailyLossPct: null }),
    tier(),
  )
  if (unknownDailyLoss) {
    expectNull('unknown daily-loss', 'dayCount', unknownDailyLoss.dayCount)
  }

  const euro = run(
    'EUR suppression',
    product(),
    tier({ priceUsd: null, priceEur: 100 }),
  )
  if (euro) {
    if (euro.currency !== 'EUR') {
      rows.push(`EUR suppression: currency expected EUR, received ${String(euro.currency)}`)
    }
    expectNumber('EUR suppression', 'minimumCost', euro.minimumCost, 100)
    expectNumber('EUR suppression', 'breakEvenProfit', euro.breakEvenProfit, 125)
    expectNull('EUR suppression', 'rMultiple', euro.rMultiple)
    expectNull('EUR suppression', 'dayCount', euro.dayCount)
  }

  if (rows.length) {
    console.log('\n✗ Executable True-Cost fixtures')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The global directory is the canonical discovery surface. Keep the searchable
 * product-aware table, first-party source link, quick compare flow, structured
 * data, and legacy URL consolidation together so SEO intent cannot fragment.
 */
function checkGlobalDirectorySurface() {
  const rows = []

  if (!fs.existsSync(GLOBAL_DIRECTORY_PAGE_FILE)) {
    rows.push('app/prop-firms/page.tsx is missing')
  } else {
    const page = fs.readFileSync(GLOBAL_DIRECTORY_PAGE_FILE, 'utf-8')
    const requiredTokens = [
      "alternates: { canonical: '/prop-firms' }",
      'itemListSchema',
      'freshChallenges',
      'challenges={freshChallenges}',
      'initialFilters={initialFilters}',
      'global-prop-firm-directory',
      'focused-rule-lists',
      'Head-to-head comparisons',
    ]
    for (const token of requiredTokens) {
      if (!page.includes(token)) {
        rows.push(`global directory page is missing safeguard: ${token}`)
      }
    }
  }

  if (!fs.existsSync(GLOBAL_LEGACY_DIRECTORY_FILE)) {
    rows.push('app/main-table/page.tsx legacy redirect is missing')
  } else {
    const redirect = fs.readFileSync(GLOBAL_LEGACY_DIRECTORY_FILE, 'utf-8')
    const requiredTokens = [
      'permanentRedirect',
      'URLSearchParams',
      'Object.entries(query)',
      '`/prop-firms${suffix}`',
    ]
    for (const token of requiredTokens) {
      if (!redirect.includes(token)) {
        rows.push(`legacy directory redirect is missing query-preserving safeguard: ${token}`)
      }
    }
  }

  const nextConfigFile = path.join(ROOT, 'next.config.ts')
  const nextConfig = fs.existsSync(nextConfigFile)
    ? fs.readFileSync(nextConfigFile, 'utf-8')
    : ''
  if (
    !nextConfig.includes("source: '/main-table'")
    || !nextConfig.includes("destination: '/prop-firms'")
    || !nextConfig.includes('permanent: true')
  ) {
    rows.push('next.config.ts is missing the edge-level permanent /main-table redirect')
  }

  if (!fs.existsSync(GLOBAL_DIRECTORY_COMPONENT_FILE)) {
    rows.push('components/FirmTable.tsx is missing')
  } else {
    const component = fs.readFileSync(GLOBAL_DIRECTORY_COMPONENT_FILE, 'utf-8')
    const requiredTokens = [
      'minimumPublishedEntry',
      'phaseFilter',
      'drawdownFilter',
      'selectedSlugs',
      'Compare selected',
      'product.accountSizes',
      'latestProduct.sourceUrl',
      'latestProduct.sourceCapturedAt',
      'from=prop-firms-directory',
    ]
    for (const token of requiredTokens) {
      if (!component.includes(token)) {
        rows.push(`global directory component is missing product or comparison safeguard: ${token}`)
      }
    }
  }

  const scanRoots = ['app', 'components', 'content']
  const legacyPath = path.normalize(GLOBAL_LEGACY_DIRECTORY_FILE)
  for (const rootName of scanRoots) {
    const pending = [path.join(ROOT, rootName)]
    while (pending.length) {
      const current = pending.pop()
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const file = path.join(current, entry.name)
        if (entry.isDirectory()) {
          pending.push(file)
          continue
        }
        if (!/\.(?:ts|tsx|md)$/.test(entry.name) || path.normalize(file) === legacyPath) {
          continue
        }
        if (fs.readFileSync(file, 'utf-8').includes('/main-table')) {
          rows.push(
            `${path.relative(ROOT, file)} still links to the retired /main-table URL`
          )
        }
      }
    }
  }

  const sitemapFile = path.join(ROOT, 'app/sitemap.ts')
  const sitemap = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, 'utf-8') : ''
  if (!sitemap.includes('`${BASE_URL}/prop-firms`')) {
    rows.push('sitemap does not include the canonical /prop-firms directory')
  }
  if (sitemap.includes('`${BASE_URL}/main-table`')) {
    rows.push('sitemap still includes the retired /main-table URL')
  }

  if (rows.length) {
    console.log('\n✗ Global directory')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The global challenge page is the product-level shopping surface. Keep stale
 * products out, preserve tier-specific prices and loss caps, and require every
 * public change-watch claim to map back to a current challenge product and the
 * firm's own domain.
 */
function checkGlobalChallengeSurface() {
  const rows = []
  const firms = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'))
  const firmSlugs = new Set(firms.map(firm =>
    firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')))
  const challengeByFirm = new Map()

  for (const firmSlug of firmSlugs) {
    const file = path.join(CHALLENGES, `${firmSlug}.json`)
    if (!fs.existsSync(file)) continue
    challengeByFirm.set(firmSlug, JSON.parse(fs.readFileSync(file, 'utf-8')))
  }

  let entries = []
  if (!fs.existsSync(CHALLENGE_WATCH_FILE)) {
    rows.push('content/data/challenge-watch.json is missing')
  } else {
    try {
      entries = JSON.parse(fs.readFileSync(CHALLENGE_WATCH_FILE, 'utf-8'))
    } catch (error) {
      rows.push(`challenge-watch JSON is invalid: ${error.message}`)
    }
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    rows.push('challenge-watch must contain at least one dated entry')
    entries = []
  }

  const ids = new Set()
  const kinds = new Set(['lineup-change', 'price-watch', 'rule-change', 'source-conflict'])
  const statuses = new Set(['verified', 'watch'])

  function officialRoot(hostname) {
    const parts = hostname.toLowerCase().split('.').filter(Boolean)
    const publicSuffix = parts.slice(-2).join('.')
    if (['co.uk', 'org.uk', 'com.au'].includes(publicSuffix)) {
      return parts.slice(-3).join('.')
    }
    return publicSuffix
  }

  const approvedSupportHosts = new Map([
    ['tradeday', new Set(['tradeday.freshdesk.com'])],
  ])

  for (const entry of entries) {
    if (!entry?.id || ids.has(entry.id)) {
      rows.push(`challenge-watch id is missing or duplicated: ${entry?.id ?? '(missing)'}`)
    } else {
      ids.add(entry.id)
    }
    if (!firmSlugs.has(entry.firmSlug)) {
      rows.push(`${entry.id}: unknown firmSlug ${entry.firmSlug}`)
      continue
    }
    if (!kinds.has(entry.kind)) rows.push(`${entry.id}: invalid kind ${entry.kind}`)
    if (!statuses.has(entry.status)) rows.push(`${entry.id}: invalid status ${entry.status}`)
    if (!entry.title || !entry.summary || !entry.traderImpact) {
      rows.push(`${entry.id}: title, summary and traderImpact are required`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.observedAt || '')) {
      rows.push(`${entry.id}: observedAt must be YYYY-MM-DD`)
    } else {
      const age = Math.floor(
        (TODAY - new Date(`${entry.observedAt}T00:00:00Z`)) / 86400000,
      )
      if (!Number.isFinite(age) || age < 0) {
        rows.push(`${entry.id}: observedAt is invalid or in the future`)
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastCheckedAt || '')) {
      rows.push(`${entry.id}: lastCheckedAt must be YYYY-MM-DD`)
    } else {
      const checkedAge = Math.floor(
        (TODAY - new Date(`${entry.lastCheckedAt}T00:00:00Z`)) / 86400000,
      )
      if (!Number.isFinite(checkedAge) || checkedAge < 0 || checkedAge > STALE_DAYS) {
        rows.push(
          `${entry.id}: lastCheckedAt is ${checkedAge} days old (gate: ${STALE_DAYS})`,
        )
      }
      if (entry.observedAt && entry.lastCheckedAt < entry.observedAt) {
        rows.push(`${entry.id}: lastCheckedAt cannot precede observedAt`)
      }
    }
    if (entry.effectiveAt && !/^\d{4}-\d{2}-\d{2}$/.test(entry.effectiveAt)) {
      rows.push(`${entry.id}: effectiveAt must be YYYY-MM-DD when present`)
    }

    const products = challengeByFirm.get(entry.firmSlug) ?? []
    const productSlugs = new Set(products.map(product => product.productSlug))
    if (!Array.isArray(entry.productSlugs) || entry.productSlugs.length === 0) {
      rows.push(`${entry.id}: at least one productSlug is required`)
    } else {
      for (const productSlug of entry.productSlugs) {
        if (!productSlugs.has(productSlug)) {
          rows.push(`${entry.id}: unknown productSlug ${productSlug}`)
        }
      }
    }
    const affectedProducts = products.filter(product =>
      entry.productSlugs?.includes(product.productSlug))
    if (
      affectedProducts.length > 0 &&
      affectedProducts.some(product => product.sourceCapturedAt !== entry.lastCheckedAt)
    ) {
      rows.push(`${entry.id}: lastCheckedAt does not match every affected product capture`)
    }

    let expectedRoot = null
    try {
      expectedRoot = officialRoot(new URL(products[0]?.sourceUrl).hostname)
    } catch {
      rows.push(`${entry.id}: current challenge sourceUrl is invalid`)
    }
    if (!Array.isArray(entry.sourceUrls) || entry.sourceUrls.length === 0) {
      rows.push(`${entry.id}: sourceUrls must contain a first-party URL`)
    } else {
      for (const sourceUrl of entry.sourceUrls) {
        try {
          const parsed = new URL(sourceUrl)
          const root = officialRoot(parsed.hostname)
          const approvedSupportHost = approvedSupportHosts
            .get(entry.firmSlug)
            ?.has(parsed.hostname.toLowerCase())
          if (
            parsed.protocol !== 'https:'
            || !expectedRoot
            || (root !== expectedRoot && !approvedSupportHost)
          ) {
            rows.push(`${entry.id}: source is not on the firm's first-party domain: ${sourceUrl}`)
          }
        } catch {
          rows.push(`${entry.id}: invalid source URL ${sourceUrl}`)
        }
      }
    }
  }

  if (!fs.existsSync(GLOBAL_CHALLENGE_PAGE_FILE)) {
    rows.push('app/prop-firm-challenges/page.tsx is missing')
  } else {
    const page = fs.readFileSync(GLOBAL_CHALLENGE_PAGE_FILE, 'utf-8')
    const requiredTokens = [
      "const PATH = '/prop-firm-challenges'",
      'alternates: { canonical: PATH }',
      'getAllChallenges().filter(challenge => isChallengeFresh(challenge))',
      'minimumCostToFundedUsd(challenge, tier)',
      'getChallengeWatchEntries',
      'productChangeSignals(',
      'entry.sourceUrls',
      'GlobalChallengeComparison rows={rows}',
      'SOCIAL_CARD_PRODUCT_COUNT = 89',
      'SOCIAL_CARD_FIRM_COUNT = 19',
      'Refresh the global challenge-comparison social card',
      'breadcrumbSchema',
      'faqPageSchema',
    ]
    for (const token of requiredTokens) {
      if (!page.includes(token)) {
        rows.push(`global challenge page is missing safeguard: ${token}`)
      }
    }
  }

  if (!fs.existsSync(GLOBAL_CHALLENGE_COMPONENT_FILE)) {
    rows.push('components/GlobalChallengeComparison.tsx is missing')
  } else {
    const component = fs.readFileSync(GLOBAL_CHALLENGE_COMPONENT_FILE, 'utf-8')
    const requiredTokens = [
      'tier.priceEur',
      'tier.costToFundedUsd',
      'tier.costToFundedEur',
      "'dailyLossUsd' | 'maxLossUsd'",
      "percentageOrTierDollars(product.dailyLossPct, product.tiers, 'dailyLossUsd')",
      "percentageOrTierDollars(product.maxLossPct, product.tiers, 'maxLossUsd')",
      'product.pricingModel',
      'product.sourceUrl',
      'product.capturedAt',
      'ProductChangeSignals signals={product.changeSignals}',
      'shortlistChangeHref(selectedRows)',
      'challenge_change_shortlist_open',
      '/prop-firm-challenge-changes?',
      'product.rules.ea',
      'Affiliate status contributes 0 ranking points',
      'rel="nofollow noopener"',
      'rel="sponsored nofollow noopener"',
    ]
    for (const token of requiredTokens) {
      if (!component.includes(token)) {
        rows.push(`global challenge component is missing data safeguard: ${token}`)
      }
    }
  }

  if (!fs.existsSync(CHALLENGE_CHANGES_PAGE_FILE)) {
    rows.push('app/prop-firm-challenge-changes/page.tsx is missing')
  } else {
    const page = fs.readFileSync(CHALLENGE_CHANGES_PAGE_FILE, 'utf-8')
    const expectedFirmCount = new Set(entries.map(entry => entry.firmSlug)).size
    const expectedVerifiedCount = entries.filter(entry => entry.status === 'verified').length
    const expectedWatchCount = entries.filter(entry => entry.status === 'watch').length
    const requiredTokens = [
      "const PATH = '/prop-firm-challenge-changes'",
      'alternates: { canonical: PATH }',
      'getChallengeWatchEntries()',
      'passesIndiaRegulatoryCountryGate',
      'validateChallengeProductKeys',
      'ChallengeChangeFeed entries={feedEntries}',
      `SOCIAL_CARD_ENTRY_COUNT = ${entries.length}`,
      `SOCIAL_CARD_FIRM_COUNT = ${expectedFirmCount}`,
      `SOCIAL_CARD_VERIFIED_COUNT = ${expectedVerifiedCount}`,
      `SOCIAL_CARD_WATCH_COUNT = ${expectedWatchCount}`,
      'Refresh the challenge-changes social card',
      'breadcrumbSchema',
      'faqPageSchema',
      "'@type': 'ItemList'",
      'numberOfItems: entries.length',
    ]
    for (const token of requiredTokens) {
      if (!page.includes(token)) {
        rows.push(`challenge changes page is missing safeguard: ${token}`)
      }
    }
    if (/href=["'`]\/go\//.test(page)) {
      rows.push('challenge changes page must not contain direct affiliate links')
    }
  }

  if (!fs.existsSync(CHALLENGE_CHANGES_COMPONENT_FILE)) {
    rows.push('components/ChallengeChangeFeed.tsx is missing')
  } else {
    const component = fs.readFileSync(CHALLENGE_CHANGES_COMPONENT_FILE, 'utf-8')
    const requiredTokens = [
      "'use client'",
      "entry.status === 'verified'",
      'entry.kind === filter',
      'aria-live="polite"',
      'entry.indiaScreened',
      'entry.sourceUrls.map',
      'rel="nofollow noopener"',
      'Read {entry.firmName} review',
      'parseChallengeChangeFocus',
      'focusState.requested',
      'challenge_change_shortlist_loaded',
      'challenge_change_shortlist_action',
      'Remove shortlist focus',
      'aria-atomic="true"',
    ]
    for (const token of requiredTokens) {
      if (!component.includes(token)) {
        rows.push(`challenge changes component is missing safeguard: ${token}`)
      }
    }
  }

  const changeLedgerInternalLinks = [
    ['components/navLinks.ts', 'primary navigation'],
    ['components/Footer.tsx', 'footer'],
    ['app/prop-firms/page.tsx', 'global directory'],
    ['app/prop-firm-challenges/page.tsx', 'global challenge page'],
    [
      'app/best-prop-firms-in-india/challenge-comparison/page.tsx',
      'India challenge page',
    ],
    ['app/sitemap.ts', 'sitemap'],
    ['app/llms.txt/route.ts', 'llms.txt'],
  ]
  for (const [relativePath, label] of changeLedgerInternalLinks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes('/prop-firm-challenge-changes')) {
      rows.push(`${label} does not link to /prop-firm-challenge-changes`)
    }
  }

  if (!fs.existsSync(CHALLENGE_CHANGES_SOCIAL_FILE)) {
    rows.push('challenge changes social card is missing')
  } else if (fs.statSync(CHALLENGE_CHANGES_SOCIAL_FILE).size < 100_000) {
    rows.push('challenge changes social card is unexpectedly small')
  }
  if (!fs.existsSync(CHALLENGE_CHANGES_SOCIAL_ALT_FILE)) {
    rows.push('challenge changes social-card alt text is missing')
  }

  const internalLinks = [
    ['components/navLinks.ts', 'primary navigation'],
    ['components/Footer.tsx', 'footer'],
    ['app/prop-firms/page.tsx', 'global directory'],
    ['app/sitemap.ts', 'sitemap'],
    ['app/llms.txt/route.ts', 'llms.txt'],
  ]
  for (const [relativePath, label] of internalLinks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes('/prop-firm-challenges')) {
      rows.push(`${label} does not link to /prop-firm-challenges`)
    }
  }

  if (!fs.existsSync(GLOBAL_CHALLENGE_SOCIAL_FILE)) {
    rows.push('global challenge comparison social card is missing')
  } else if (fs.statSync(GLOBAL_CHALLENGE_SOCIAL_FILE).size < 100_000) {
    rows.push('global challenge comparison social card is unexpectedly small')
  }
  if (!fs.existsSync(GLOBAL_CHALLENGE_SOCIAL_ALT_FILE)) {
    rows.push('global challenge comparison social-card alt text is missing')
  }

  if (rows.length) {
    console.log('\nâœ— Global challenge comparison')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/**
 * Shared shortlist links must never fall back to unrelated change notes when a
 * product is stale, removed or outside the India gate. Exercise the same pure
 * parser and matcher used by the client component so URL behavior cannot drift.
 */
function checkChallengeChangeFocusContract() {
  const rows = []
  const keys = [
    'tradeify:growth-evaluation',
    'alpha-capital:alpha-one',
    'fundingpips:zero-program',
    'maven:classic-challenge',
    'e8-markets:e8-one',
  ]
  const validKeys = new Set(keys)
  const entries = [
    {
      id: 'tradeify-watch',
      productKeys: ['tradeify:growth-evaluation'],
    },
    {
      id: 'fundingpips-watch',
      productKeys: ['fundingpips:zero-program'],
    },
  ]
  const expect = (condition, message) => {
    if (!condition) rows.push(message)
  }
  const ids = focus =>
    focusChallengeChangeEntries(entries, focus).map(entry => entry.id).join(',')

  const watched = parseChallengeChangeFocus(keys[0], true, validKeys)
  expect(ids(watched) === 'tradeify-watch', 'watched product focus does not match exactly')
  expect(
    countFocusedProductsWithUpdates(focusChallengeChangeEntries(entries, watched), watched.products) === 1,
    'watched product coverage count is incorrect',
  )

  const mixed = parseChallengeChangeFocus(`${keys[0]},${keys[1]}`, true, validKeys)
  expect(ids(mixed) === 'tradeify-watch', 'mixed watched/no-watch focus is incorrect')
  expect(
    countFocusedProductsWithUpdates(focusChallengeChangeEntries(entries, mixed), mixed.products) === 1,
    'mixed focus must report one of two products with a dated note',
  )

  const noWatch = parseChallengeChangeFocus(keys[1], true, validKeys)
  expect(ids(noWatch) === '', 'valid product without a watch must show zero notes')

  const stale = parseChallengeChangeFocus('ftmo:ftmo-challenge-2-step', true, validKeys)
  expect(
    stale.requested && stale.unavailableCount === 1 && ids(stale) === '',
    'stale or India-ineligible focus must not fall back to all notes',
  )

  const duplicate = parseChallengeChangeFocus(`${keys[0]},${keys[0]}`, true, validKeys)
  expect(
    duplicate.requestedCount === 1 && duplicate.products.length === 1,
    'duplicate focus keys must be deduplicated',
  )

  const capped = parseChallengeChangeFocus(keys.join(','), true, validKeys)
  expect(
    capped.requestedCount === 4 && capped.products.length === 4,
    'shared focus must be capped at four products',
  )

  const absent = parseChallengeChangeFocus(null, false, validKeys)
  expect(
    !absent.requested && focusChallengeChangeEntries(entries, absent).length === entries.length,
    'an absent focus parameter must preserve the full ledger',
  )

  try {
    validateChallengeProductKeys(['bad:key:with-extra-delimiter'])
    rows.push('invalid product-key delimiters must fail validation')
  } catch {
    // Expected: share parsing depends on one colon between two lowercase slugs.
  }

  if (rows.length) {
    console.log('\n✗ Challenge shortlist-to-change contract')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Challenge monitoring must detect semantic term changes while ignoring the
 * capture-date and provenance churn every refresh creates. The write gate is
 * deliberately editorial: scripts may draft a report, never publish a public
 * change claim automatically.
 */
function checkChallengeMonitoringWorkflow() {
  const rows = []
  const diffFile = path.join(ROOT, 'scripts/challenge-diff.mjs')
  const mergeFile = path.join(ROOT, 'scripts/merge-capture.mjs')
  const freshnessFile = path.join(ROOT, 'scripts/challenge-freshness.mjs')
  const packageFile = path.join(ROOT, 'package.json')
  const agentsFile = path.join(ROOT, 'AGENTS.md')

  const requiredFiles = [
    [diffFile, 'scripts/challenge-diff.mjs'],
    [mergeFile, 'scripts/merge-capture.mjs'],
    [freshnessFile, 'scripts/challenge-freshness.mjs'],
  ]
  for (const [file, label] of requiredFiles) {
    if (!fs.existsSync(file)) rows.push(`${label} is missing`)
  }

  const merge = fs.existsSync(mergeFile) ? fs.readFileSync(mergeFile, 'utf-8') : ''
  for (const token of [
    'diffChallengeProducts(prior, products)',
    '--accept-changes',
    'material changes require editorial review',
    'update content/data/challenge-watch.json',
    "field === 'overnight' && /\\ballowed on weekdays?\\b/.test(s)",
  ]) {
    if (!merge.includes(token)) rows.push(`merge-capture is missing change gate: ${token}`)
  }
  if (/writeFileSync\([^)]*challenge-watch/i.test(merge)) {
    rows.push('merge-capture must never auto-publish content/data/challenge-watch.json')
  }

  const freshness = fs.existsSync(freshnessFile)
    ? fs.readFileSync(freshnessFile, 'utf-8')
    : ''
  for (const token of [
    'MAX_AGE_DAYS = 30',
    '--window',
    '--strict',
    'failsFreshnessOn',
    'openWatches',
    'pricedTiers',
  ]) {
    if (!freshness.includes(token)) rows.push(`challenge-freshness is missing queue safeguard: ${token}`)
  }

  const packageBody = fs.readFileSync(packageFile, 'utf-8')
  for (const token of ['"capture:preview"', '"capture:freshness"']) {
    if (!packageBody.includes(token)) rows.push(`package.json is missing script ${token}`)
  }
  const agents = fs.readFileSync(agentsFile, 'utf-8')
  for (const token of [
    'npm run capture:freshness -- --window 14',
    '--write --accept-changes',
    'Never auto-publish a machine-generated change summary',
  ]) {
    if (!agents.includes(token)) rows.push(`AGENTS.md is missing monitoring rule: ${token}`)
  }

  const baseline = [{
    firmSlug: 'fixture-firm',
    productName: 'Fixture One Step',
    productSlug: 'fixture-one-step',
    phases: 1,
    accountSizes: [{
      sizeUsd: 100000,
      priceUsd: 100,
      refundable: false,
    }],
    profitTargets: { phase1: 8 },
    dailyLossPct: 5,
    maxLossPct: 10,
    drawdownType: 'static',
    minTradingDays: 1,
    maxTradingDays: null,
    consistencyRulePct: null,
    profitSplitPct: 90,
    payoutFirstDays: 7,
    payoutFrequency: 'weekly',
    rules: {
      news: true,
      weekend: true,
      overnight: true,
      ea: true,
      copyTrading: false,
    },
    assetClass: 'cfd',
    sourceUrl: 'https://fixture.example/rules',
    sourceCapturedAt: '2026-07-01',
    notes: ['old provenance'],
  }]
  const captureOnly = JSON.parse(JSON.stringify(baseline))
  captureOnly[0].sourceCapturedAt = '2026-07-28'
  captureOnly[0].notes = ['new provenance']
  if (diffChallengeProducts(baseline, captureOnly).length !== 0) {
    rows.push('semantic diff treats capture date or provenance note churn as material')
  }

  const changed = JSON.parse(JSON.stringify(captureOnly))
  changed[0].accountSizes[0].priceUsd = 120
  changed[0].maxLossPct = 8
  changed[0].profitSplitPct = 80
  changed[0].payoutFirstDays = 14
  changed[0].rules.news = false
  changed[0].accountSizes.push({
    sizeUsd: 200000,
    priceUsd: 200,
    refundable: false,
  })
  const sampleChanges = diffChallengeProducts(baseline, changed)
  const expected = [
    ['pricing', 'accountSizes[100000].priceUsd', 'high'],
    ['risk', 'maxLossPct', 'critical'],
    ['payout', 'profitSplitPct', 'critical'],
    ['payout', 'payoutFirstDays', 'critical'],
    ['rules', 'rules.news', 'critical'],
    ['availability', 'accountSizes[200000]', 'high'],
  ]
  for (const [category, changePath, severity] of expected) {
    if (!sampleChanges.some(item =>
      item.category === category
      && item.path === changePath
      && item.severity === severity)) {
      rows.push(`semantic diff missed ${severity} ${category} change at ${changePath}`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— Challenge monitoring workflow')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/**
 * The India shortlist is a conversion surface, so its availability, checkout,
 * KYC, payout, fee, and currency claims need the same freshness and provenance
 * guarantees as the reviews. This audit also prevents a firm whose aggregate
 * record explicitly restricts India from appearing in the shortlist.
 */
function checkIndiaEvidence() {
  if (!fs.existsSync(INDIA_EVIDENCE_FILE)) {
    console.log('\n✗ India evidence\n  · content/data/india-evidence.json is missing')
    return 1
  }

  let evidence
  try {
    evidence = JSON.parse(fs.readFileSync(INDIA_EVIDENCE_FILE, 'utf-8'))
  } catch (error) {
    console.log(`\n✗ India evidence\n  · invalid JSON: ${error.message}`)
    return 1
  }

  if (!Array.isArray(evidence) || evidence.length === 0) {
    console.log('\n✗ India evidence\n  · evidence file must contain at least one firm')
    return 1
  }

  let rbiCapture
  try {
    rbiCapture = JSON.parse(fs.readFileSync(INDIA_RBI_CAPTURE_FILE, 'utf-8'))
  } catch (error) {
    console.log(`\n✗ India evidence\n  · RBI Alert List capture is missing or invalid: ${error.message}`)
    return 1
  }

  const rbiCapturedAt = new Date(rbiCapture.capturedAt)
  if (Number.isNaN(rbiCapturedAt.valueOf())) {
    console.log('\n✗ India evidence\n  · RBI Alert List capture date is invalid')
    return 1
  }
  const rbiCaptureAge = Math.floor((TODAY - rbiCapturedAt) / 86400000)
  if (rbiCaptureAge > STALE_DAYS || rbiCaptureAge < -1) {
    console.log(
      `\n✗ India evidence\n  · RBI Alert List capture is ${rbiCaptureAge} days old (gate: ${STALE_DAYS})`
    )
    return 1
  }

  const expectedRbiStatus = new Map([
    ...(rbiCapture.namedMatches ?? []).map(entry => [entry.firmSlug, 'named']),
    ...(rbiCapture.notFound ?? []).map(entry => [entry.firmSlug, 'not-found']),
  ])

  const firmsPath = path.join(ROOT, 'content/data/firms.json')
  const firms = JSON.parse(fs.readFileSync(firmsPath, 'utf-8'))
  const slugify = name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const firmsBySlug = new Map(firms.map(firm => [slugify(firm.name), firm]))
  const requiredFields = ['country', 'checkout', 'kyc', 'payout', 'fees', 'currency']
  const statuses = new Set(['verified', 'partial', 'unknown'])
  const payoutRails = new Set(['bank', 'card', 'crypto', 'rise', 'skrill', 'wise'])
  const rbiAlertStatuses = new Set(['named', 'not-found'])
  const allowedDomains = {
    ftmo: ['ftmo.com'],
    fundednext: ['fundednext.com'],
    fundingpips: ['fundingpips.com'],
    'bright-funded': ['brightfunded.com'],
    fxify: ['fxify.com'],
    'alpha-capital': ['alphacapitalgroup.uk'],
    'e8-markets': ['e8markets.com'],
    'city-traders-imperium': ['citytradersimperium.com'],
    maven: ['maventrading.com'],
    tradeify: ['tradeify.co'],
    tradeday: ['tradeday.com', 'tradeday.freshdesk.com'],
  }
  const seen = new Set()
  const rows = []

  for (const entry of evidence) {
    const slug = typeof entry?.firmSlug === 'string' ? entry.firmSlug : '(missing slug)'

    if (seen.has(slug)) rows.push(`${slug}: duplicate firmSlug`)
    seen.add(slug)

    const matchesFilter = !filter ||
      slug.includes(filter.toLowerCase()) ||
      String(entry?.firmName ?? '').toLowerCase().includes(filter.toLowerCase())
    if (!matchesFilter) continue

    const firm = firmsBySlug.get(slug)
    if (!firm) {
      rows.push(`${slug}: no matching firm in content/data/firms.json`)
      continue
    }

    if (entry.firmName !== firm.name) {
      rows.push(`${slug}: firmName "${entry.firmName}" does not match firms.json "${firm.name}"`)
    }

    const capturedAt = new Date(entry.capturedAt)
    if (!entry.capturedAt || Number.isNaN(capturedAt.valueOf())) {
      rows.push(`${slug}: capturedAt is missing or invalid`)
    } else {
      const age = Math.floor((TODAY - capturedAt) / 86400000)
      if (age > STALE_DAYS) {
        rows.push(`${slug}: evidence capturedAt ${entry.capturedAt} is ${age} days old (gate: ${STALE_DAYS})`)
      } else if (age < -1) {
        rows.push(`${slug}: evidence capturedAt ${entry.capturedAt} is in the future`)
      }
    }

    if (entry.country?.status !== 'verified') {
      rows.push(`${slug}: country evidence must be verified for India shortlist inclusion`)
    }

    if (typeof entry.unresolved !== 'string' || !entry.unresolved.trim()) {
      rows.push(`${slug}: unresolved evidence note is required`)
    }

    if (typeof entry.restrictionListComplete !== 'boolean') {
      rows.push(`${slug}: restrictionListComplete must be true or false`)
    } else if (
      entry.restrictionListComplete === false &&
      !/sanction|non-exhaustive|conditional|dynamic|conflict|disagree|incomplete/i.test(
        `${entry.country?.summary ?? ''} ${entry.unresolved ?? ''}`
      )
    ) {
      rows.push(
        `${slug}: a partial restriction list must disclose why its coverage is incomplete`
      )
    }

    if (!Array.isArray(entry.payoutRails) || entry.payoutRails.length === 0) {
      rows.push(`${slug}: payoutRails must contain at least one captured rail`)
    } else {
      if (entry.payoutRails.some(rail => !payoutRails.has(rail))) {
        rows.push(`${slug}: payoutRails contains an unsupported value`)
      }
      if (new Set(entry.payoutRails).size !== entry.payoutRails.length) {
        rows.push(`${slug}: payoutRails contains duplicates`)
      }
    }

    if (!entry.rbiAlert || !rbiAlertStatuses.has(entry.rbiAlert.status)) {
      rows.push(`${slug}: rbiAlert.status must be named or not-found`)
    } else {
      if (entry.rbiAlert.status !== expectedRbiStatus.get(slug)) {
        rows.push(`${slug}: rbiAlert.status does not match the archived RBI capture`)
      }
      if (entry.rbiAlert.sourceListUpdatedAt !== rbiCapture.sourceListUpdatedAt) {
        rows.push(`${slug}: RBI source-list date does not match the archived capture`)
      }
      if (entry.rbiAlert.sourceUrl !== rbiCapture.sourceUrl) {
        rows.push(`${slug}: RBI source URL does not match the archived capture`)
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.rbiAlert.sourceListUpdatedAt ?? '')) {
        rows.push(`${slug}: rbiAlert.sourceListUpdatedAt must be an ISO date`)
      }
      if (typeof entry.rbiAlert.summary !== 'string' || !entry.rbiAlert.summary.trim()) {
        rows.push(`${slug}: rbiAlert.summary is required`)
      }
      if (
        entry.rbiAlert.status === 'not-found' &&
        !/absence.*not.*authori|not.*found.*not.*authori/i.test(entry.rbiAlert.summary)
      ) {
        rows.push(`${slug}: a not-found RBI status must say that absence is not authorisation`)
      }
      try {
        const source = new URL(entry.rbiAlert.sourceUrl)
        if (
          source.protocol !== 'https:' ||
          !(source.hostname === 'rbi.org.in' || source.hostname.endsWith('.rbi.org.in'))
        ) {
          rows.push(`${slug}: rbiAlert.sourceUrl must be an official RBI HTTPS URL`)
        }
      } catch {
        rows.push(`${slug}: rbiAlert.sourceUrl is invalid`)
      }
    }

    if (!Array.isArray(entry.restrictedJurisdictions) || entry.restrictedJurisdictions.length === 0) {
      rows.push(`${slug}: restrictedJurisdictions must contain the captured first-party list`)
    } else {
      const captured = entry.restrictedJurisdictions.map(country => country.toLowerCase()).sort()
      const aggregate = (firm.countriesRestricted ?? []).map(country => country.toLowerCase()).sort()
      if (new Set(captured).size !== captured.length) {
        rows.push(`${slug}: restrictedJurisdictions contains duplicates`)
      }
      if (captured.includes('india')) {
        rows.push(`${slug}: captured restriction list includes India`)
      }
      if (JSON.stringify(captured) !== JSON.stringify(aggregate)) {
        rows.push(
          `${slug}: restrictedJurisdictions (${captured.length}) does not match firms.json (${aggregate.length})`
        )
      }
    }

    if ((firm.countriesRestricted ?? []).some(country => country.toLowerCase() === 'india')) {
      rows.push(`${slug}: firms.json lists India as restricted`)
    }

    for (const fieldName of requiredFields) {
      const field = entry[fieldName]
      if (!field || !statuses.has(field.status)) {
        rows.push(`${slug}.${fieldName}: invalid or missing status`)
        continue
      }
      if (typeof field.summary !== 'string' || !field.summary.trim()) {
        rows.push(`${slug}.${fieldName}: summary is required`)
      }
      if (!Array.isArray(field.sourceUrls)) {
        rows.push(`${slug}.${fieldName}: sourceUrls must be an array`)
        continue
      }
      if (field.status !== 'unknown' && field.sourceUrls.length === 0) {
        rows.push(`${slug}.${fieldName}: non-unknown evidence needs a first-party source`)
      }

      for (const sourceUrl of field.sourceUrls) {
        let parsed
        try {
          parsed = new URL(sourceUrl)
        } catch {
          rows.push(`${slug}.${fieldName}: invalid source URL "${sourceUrl}"`)
          continue
        }
        if (parsed.protocol !== 'https:') {
          rows.push(`${slug}.${fieldName}: source must use HTTPS (${sourceUrl})`)
        }
        const domains = allowedDomains[slug] ?? []
        if (!domains.some(domain =>
          parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) {
          rows.push(`${slug}.${fieldName}: source is not on an approved first-party domain (${parsed.hostname})`)
        }
      }
    }

    const challenges = loadChallenges(slug)
    if (!challenges?.length) {
      rows.push(`${slug}: no challenge data found`)
    } else {
      const challengeSlugs = new Set(challenges.map(challenge => challenge.productSlug))
      const productEligibility = entry.productEligibility
      if (productEligibility != null) {
        if (!['all', 'limited'].includes(productEligibility.mode)) {
          rows.push(`${slug}: productEligibility.mode must be all or limited`)
        }
        if (
          !Array.isArray(productEligibility.includedProductSlugs)
          || productEligibility.includedProductSlugs.length === 0
        ) {
          rows.push(`${slug}: productEligibility.includedProductSlugs must not be empty`)
        } else {
          if (
            new Set(productEligibility.includedProductSlugs).size
            !== productEligibility.includedProductSlugs.length
          ) {
            rows.push(`${slug}: productEligibility.includedProductSlugs contains duplicates`)
          }
          for (const productSlug of productEligibility.includedProductSlugs) {
            if (!challengeSlugs.has(productSlug)) {
              rows.push(`${slug}: productEligibility references unknown product ${productSlug}`)
            }
          }
        }
        for (const [productSlug, cap] of Object.entries(
          productEligibility.accountSizeCapsUsd ?? {},
        )) {
          const challenge = challenges.find(item => item.productSlug === productSlug)
          if (!challenge) {
            rows.push(`${slug}: account-size cap references unknown product ${productSlug}`)
          } else if (!Number.isFinite(cap) || cap <= 0) {
            rows.push(`${slug}: ${productSlug} account-size cap must be positive`)
          } else if (!challenge.accountSizes.some(tier => tier.sizeUsd <= cap)) {
            rows.push(`${slug}: ${productSlug} account-size cap removes every published tier`)
          }
        }
        for (const sourceUrl of productEligibility.sourceUrls ?? []) {
          try {
            const parsed = new URL(sourceUrl)
            const domains = allowedDomains[slug] ?? []
            if (
              parsed.protocol !== 'https:'
              || !domains.some(domain =>
                parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))
            ) {
              rows.push(`${slug}: productEligibility source is not approved first-party HTTPS`)
            }
          } catch {
            rows.push(`${slug}: productEligibility source URL is invalid`)
          }
        }
      }

      if (INDIA_CAPTURED_EXPANSION_SLUGS.has(slug)) {
        const captureFile = path.join(
          INDIA_EVIDENCE_CAPTURES_DIR,
          `${slug}-${entry.capturedAt}.json`,
        )
        if (!fs.existsSync(captureFile)) {
          rows.push(`${slug}: provenance capture archive is missing`)
        } else {
          try {
            const capture = JSON.parse(fs.readFileSync(captureFile, 'utf-8'))
            if (capture.firmSlug !== slug || capture.capturedAt !== entry.capturedAt) {
              rows.push(`${slug}: provenance capture identity/date does not match evidence`)
            }
            if (capture.rbiCheck?.result !== entry.rbiAlert?.status) {
              rows.push(`${slug}: provenance capture RBI result does not match evidence`)
            }
            if (!Array.isArray(capture.sources) || capture.sources.length === 0) {
              rows.push(`${slug}: provenance capture needs at least one source`)
            }
          } catch (error) {
            rows.push(`${slug}: provenance capture is invalid JSON (${error.message})`)
          }
        }
      }

      const freshnessErrors = []
      checkSourceFreshness(challenges, freshnessErrors)
      for (const error of freshnessErrors) rows.push(`${slug}: ${error}`)
    }
  }

  if (rows.length) {
    console.log('\n✗ India evidence')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The payout-methods page is an India conversion and compliance surface.
 * Keep it data-derived, reachable, indexable, and free of direct affiliate
 * redirects so RBI-excluded firms cannot leak back in through hard-coded CTAs.
 */
function checkIndiaAffiliateCampaignGuard() {
  const rows = []
  const indiaPlacements = [
    'best-prop-firms-in-india',
    'india-matcher-manual-any-any-any',
    'india-inr-planner-estimate',
    'india-challenge-product-1-step-flex',
    'india-matchup-fundingpips-fxify',
  ]
  for (const placement of indiaPlacements) {
    if (!isIndiaCampaign(placement)) {
      rows.push(`India affiliate campaign guard misses ${placement}`)
    }
  }
  for (const placement of ['compare', 'review-cta', 'unknown']) {
    if (isIndiaCampaign(placement)) {
      rows.push(`India affiliate campaign guard misclassifies ${placement}`)
    }
  }

  const route = fs.existsSync(AFFILIATE_REDIRECT_ROUTE_FILE)
    ? fs.readFileSync(AFFILIATE_REDIRECT_ROUTE_FILE, 'utf-8')
    : ''
  if (!route) {
    rows.push('app/go/[firm]/route.ts is missing')
  } else {
    for (const token of [
      "import { isIndiaCampaign } from '@/lib/affiliateCampaign'",
      "isIndiaCampaign(from) && indiaEvidence?.rbiAlert.status === 'named'",
      "event: 'india_affiliate_click_blocked'",
    ]) {
      if (!route.includes(token)) {
        rows.push(`India affiliate redirect route is missing safeguard: ${token}`)
      }
    }
  }

  if (rows.length) {
    console.log('\n✗ India affiliate campaign guard')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

function checkAnalyticsMeasurementContract() {
  const rows = []

  const stageFixtures = new Map([
    ['/', 'home'],
    ['/best-prop-firms-in-india/', 'india_hub'],
    ['/best-prop-firms-in-india/payout-methods', 'india_payout'],
    ['/best-prop-firms-in-india/compare/', 'india_matchup_directory'],
    ['/best-prop-firms-in-india/fundingpips-vs-fxify', 'india_matchup'],
    ['/best-prop-firms-in-india/challenge-comparison/', 'india_comparison'],
    ['/best-prop-firms-in-india/challenge-changes', 'india_updates'],
    ['/compare/ftmo-vs-fundingpips', 'head_to_head'],
    ['/blog/ftmo-review/', 'firm_review'],
    ['/ru/', 'russian_home'],
    ['/ru/luchshie-prop-firmy', 'russian_ranking'],
    ['/ru/obzor-fundednext/', 'russian_review'],
    ['/ru/obzor-fundingpips', 'russian_review'],
    ['/ru/obzor-bright-funded/', 'russian_review'],
    ['/ru/luchshie-kripto-prop-firmy', 'russian_ranking'],
    ['/ru/vyplaty-prop-firm', 'russian_ranking'],
    ['/ru/prop-firmy-bez-kyc', 'russian_ranking'],
    ['/ru/prop-firmy-bez-chelendzha', 'russian_ranking'],
    ['/ru/dlya-russkoyazychnykh-treyderov', 'russian_ranking'],
    ['/ru/rossiyskie-prop-kompanii', 'russian_local_research'],
    ['/ru/obzor-proplive', 'russian_local_research'],
    ['/ru/kak-rabotayut-chellendzhi-prop-firm', 'russian_education'],
  ])
  for (const [pathname, expected] of stageFixtures) {
    const actual = journeyStage(pathname)
    if (actual !== expected) {
      rows.push(`journeyStage(${pathname}) expected ${expected}, received ${actual}`)
    }
  }
  if (!isHighIntentJourneyStage('india_hub')) {
    rows.push('India hub must be high intent so payout-to-matcher navigation is measured')
  }
  for (const stage of ['russian_ranking', 'russian_review']) {
    if (!isHighIntentJourneyStage(stage)) {
      rows.push(`Russian ${stage} must be high intent so affiliate journeys are measured`)
    }
  }

  const relationshipFixture = {
    fundingpips: 'affiliate',
    ftmo: 'official',
  }
  if (goClickEventName('fundingpips', relationshipFixture) !== 'affiliate_click') {
    rows.push('Configured affiliate /go clicks must emit affiliate_click')
  }
  if (goClickEventName('ftmo', relationshipFixture) !== 'official_site_click') {
    rows.push('Configured official /go clicks must emit official_site_click')
  }
  if (goClickEventName('unknown-firm', relationshipFixture) !== null) {
    rows.push('Unknown /go slugs must not be classified as affiliate or official clicks')
  }

  const expectedPayloadKeys = [
    'changed_control',
    'drawdown',
    'matching_firms',
    'matching_products',
    'payout',
    'program',
    'strategy',
    'surface',
  ]
  const matcherStateKeys = new Set()
  let matcherFixtureCount = 0
  for (const strategy of INDIA_MATCHER_STRATEGIES) {
    for (const program of INDIA_MATCHER_PROGRAMS) {
      for (const drawdown of INDIA_MATCHER_DRAWDOWNS) {
        for (const payout of INDIA_MATCHER_PAYOUTS) {
          const filters = { strategy, program, drawdown, payout }
          const payload = indiaMatcherResultProperties(
            filters,
            'strategy',
            2,
            7,
          )
          matcherFixtureCount += 1
          matcherStateKeys.add(indiaMatcherStateKey(filters))
          const keys = Object.keys(payload).sort()
          if (keys.join('|') !== expectedPayloadKeys.join('|')) {
            rows.push(`India matcher payload keys drifted for ${indiaMatcherStateKey(filters)}`)
          }
          if (
            payload.surface !== 'india'
            || payload.changed_control !== 'strategy'
            || !Number.isInteger(payload.matching_firms)
            || payload.matching_firms < 0
            || !Number.isInteger(payload.matching_products)
            || payload.matching_products < 0
          ) {
            rows.push(`India matcher payload values are invalid for ${indiaMatcherStateKey(filters)}`)
          }
          if (keys.some(key => /(^|_)(url|query|hash|email|name|kyc|payment|amount|rate|markup|charges?|id)(_|$)/i.test(key))) {
            rows.push(`India matcher payload exposes a privacy-risk key for ${indiaMatcherStateKey(filters)}`)
          }
        }
      }
    }
  }
  if (matcherFixtureCount !== 336 || matcherStateKeys.size !== 336) {
    rows.push(
      `India matcher taxonomy expected 336 bounded states, received ${matcherFixtureCount}/${matcherStateKeys.size}`,
    )
  }

  const fixtureRelationships = {
    fundingpips: 'affiliate',
    ftmo: 'official',
  }
  const decoratedAffiliate = decoratePostOutboundLinks(
    '<p><a href="/go/fundingpips?coupon=SAVE&from=editor-value#terms" rel="nofollow" target="_self">Offer</a></p>',
    fixtureRelationships,
    'funding-pips_review',
  )
  if (
    !decoratedAffiliate.includes(
      'href="/go/fundingpips?coupon=SAVE&from=post-body-funding-pips-review#terms"',
    )
    || !decoratedAffiliate.includes('rel="sponsored nofollow noopener"')
    || !decoratedAffiliate.includes('target="_blank"')
    || decoratedAffiliate.includes('editor-value')
    || new URL(
      decoratedAffiliate.match(/href="([^"]+)"/)?.[1] ?? '/',
      'https://tradersfundhub.com',
    ).searchParams.get('from') !== outboundSlug('post-body-funding-pips_review')
    || (decoratedAffiliate.match(/\srel=/g) ?? []).length !== 1
    || (decoratedAffiliate.match(/\starget=/g) ?? []).length !== 1
  ) {
    rows.push('Post-body affiliate decorator failed its query/hash/from/rel fixture')
  }
  const decoratedPlacement = decoratePostOutboundLinks(
    '<a data-affiliate-placement="Product Fit!" href="/go/fundednext?from=editor-value">Plans</a>',
    { fundednext: 'affiliate' },
    'fundednext-review',
  )
  if (
    !decoratedPlacement.includes(
      'href="/go/fundednext?from=post-body-fundednext-review-product-fit"',
    )
    || !decoratedPlacement.includes('data-affiliate-placement="Product Fit!"')
    || decoratedPlacement.includes('editor-value')
    || !decoratedPlacement.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('Post-body affiliate decorator failed its controlled placement fixture')
  }
  const decoratedOfficial = decoratePostOutboundLinks(
    '<a href="/go/ftmo">Terms</a><a href="/about">About</a>',
    fixtureRelationships,
    'ftmo-review',
  )
  if (
    !decoratedOfficial.includes('href="/go/ftmo?from=post-body-ftmo-review"')
    || !decoratedOfficial.includes('rel="nofollow noopener"')
    || decoratedOfficial.includes('sponsored')
    || !decoratedOfficial.includes('<a href="/about">About</a>')
  ) {
    rows.push('Post-body official decorator failed its attribution/non-/go fixture')
  }

  const firms = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'))
  const outboundRelationships = buildOutboundRelationships(firms)
  let reviewBodyGoLinks = 0
  for (const postSlug of Object.keys(REVIEW_TO_FIRM)) {
    const postFile = path.join(POSTS, `${postSlug}.md`)
    const body = matter(fs.readFileSync(postFile, 'utf-8')).content
    const rendered = decoratePostOutboundLinks(body, outboundRelationships, postSlug)
    for (const match of rendered.matchAll(/<a\b[^>]*\bhref=(["'])(\/go\/[^"']+)\1[^>]*>/gi)) {
      reviewBodyGoLinks += 1
      const tag = match[0]
      const destination = new URL(match[2], 'https://tradersfundhub.com')
      const firmSlug = destination.pathname.split('/')[2]
      const placement = tag.match(
        /\bdata-affiliate-placement=(["'])([^"']+)\1/i,
      )?.[2]
      const expectedCampaign = postBodyCampaign(postSlug, placement)
      if (destination.searchParams.get('from') !== expectedCampaign) {
        rows.push(`${postSlug}: body /go link lacks controlled ${expectedCampaign} attribution`)
      }
      const relationship = outboundRelationships[firmSlug]
      if (!relationship) {
        rows.push(`${postSlug}: body /go link points at unknown destination ${firmSlug}`)
      }
      const sponsored = /\brel=(["'])[^"']*\bsponsored\b[^"']*\1/i.test(tag)
      if (sponsored !== (relationship === 'affiliate')) {
        rows.push(`${postSlug}: ${firmSlug} sponsored rel disagrees with outbound configuration`)
      }
    }
  }
  if (reviewBodyGoLinks === 0) {
    rows.push('Reviews v2 must exercise at least one rendered body /go attribution fixture')
  }

  const analyticsProviderSource = fs.existsSync(ANALYTICS_PROVIDER_FILE)
    ? fs.readFileSync(ANALYTICS_PROVIDER_FILE, 'utf-8')
    : ''
  const optionalScriptBlocks = [
    analyticsProviderSource.match(/id="tfh-google-analytics"[\s\S]*?\/>/)?.[0] ?? '',
    analyticsProviderSource.match(/id="tfh-microsoft-clarity"[\s\S]*?\/>/)?.[0] ?? '',
  ]
  if (optionalScriptBlocks.some((block) => !block.includes('onReady={() => {') || block.includes('onLoad='))) {
    rows.push('Optional analytics scripts must restore readiness with next/script onReady after consent remounts')
  }

  const sourceChecks = [
    [ANALYTICS_PROVIDER_FILE, [
      "trackVercel('journey_view'",
      'send_page_view: false',
      'page_location: sanitizedLocation',
      'goClickEventName(firm, outboundRelationships)',
      'if (!eventName) return',
    ]],
    [INDIA_MATCHER_COMPONENT_FILE, [
      "track('challenge_matcher_started'",
      "track('challenge_matcher_result'",
      'lastResultKeyRef',
      "const campaign = 'india-matcher-result'",
      "timeZone: 'UTC'",
    ]],
    [ROOT_LAYOUT_FILE, ['buildOutboundRelationships(getAllFirms())']],
    [BLOG_POST_PAGE_FILE, ['decoratePostOutboundLinks(', 'outboundRelationships,', 'slug,']],
    [path.join(ROOT, 'components/NewsletterForm.tsx'), [
      "track('newsletter_double_opt_in_started'",
      'data-clarity-mask="true"',
      "data-russian-newsletter={isRussian ? 'global-rule-digest' : undefined}",
      '{ placement, locale }',
    ]],
    [path.join(ROOT, 'components/ContactForm.tsx'), [
      "track('contact_submission_delivered'",
      'data-clarity-mask="true"',
    ]],
    [path.join(ROOT, 'components/IndiaEvidenceSubmissionForm.tsx'), [
      'data-clarity-mask="true"',
    ]],
    [PRIVACY_POLICY_FILE, [
      'An individual controlled firm/product key may be sent',
      'Complete shortlist combinations and shortlist query strings are not sent',
      'This policy was last updated on 10 August 2026',
    ]],
  ]
  for (const [file, tokens] of sourceChecks) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    for (const token of tokens) {
      if (!source.includes(token)) {
        rows.push(`${path.relative(ROOT, file)} is missing analytics safeguard: ${token}`)
      }
    }
  }

  if (rows.length) {
    console.log('\n✗ Analytics measurement contract')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

function checkIndiaPayoutSurface() {
  const rows = []
  if (!fs.existsSync(INDIA_PAYOUT_PAGE_FILE)) {
    rows.push('app/best-prop-firms-in-india/payout-methods/page.tsx is missing')
  } else {
    const page = fs.readFileSync(INDIA_PAYOUT_PAGE_FILE, 'utf-8')
    const requiredTokens = [
      'INDIA_EVIDENCE',
      'passesIndiaRegulatoryCountryGate',
      "entry.rbiAlert.status === 'named'",
      'entry.payout.summary',
      'entry.fees.summary',
      'entry.unresolved',
      'breadcrumbSchema',
      'faqPageSchema',
      'alternates: { canonical: PATH }',
    ]
    for (const token of requiredTokens) {
      if (!page.includes(token)) {
        rows.push(`payout page is missing data-derived safeguard: ${token}`)
      }
    }
    if (/href=["'`]\/go\//.test(page)) {
      rows.push('payout page must not hard-code direct /go/ affiliate links')
    }
  }

  const internalLinks = [
    ['components/LandingPage.tsx', 'India landing'],
    ['components/navLinks.ts', 'primary navigation'],
    ['app/blog/[slug]/page.tsx', 'blog sidebar'],
    ['content/posts/are-prop-firms-legal-in-india.md', 'India legal guide'],
    ['app/sitemap.ts', 'sitemap'],
  ]
  for (const [relativePath, label] of internalLinks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes('/best-prop-firms-in-india/payout-methods')) {
      rows.push(`${label} does not link to /best-prop-firms-in-india/payout-methods`)
    }
  }

  if (rows.length) {
    console.log('\n✗ India payout surface')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The India challenge comparison must be a strict projection of the same
 * regulatory gate and first-party product captures as the main India ranking.
 * It may monetize eligible rows, but an excluded firm or unattributed rule can
 * never re-enter through a hard-coded comparison record.
 */
function checkIndiaChallengeSurface() {
  const rows = []
  const routePath = '/best-prop-firms-in-india/challenge-comparison'

  if (!fs.existsSync(INDIA_CHALLENGE_PAGE_FILE)) {
    rows.push('app/best-prop-firms-in-india/challenge-comparison/page.tsx is missing')
  } else {
    const page = fs.readFileSync(INDIA_CHALLENGE_PAGE_FILE, 'utf-8')
    const requiredTokens = [
      'buildIndiaMatcherFirms',
      "getLandingBySlug('best-prop-firms-in-india')",
      "entry.rbiAlert.status === 'named'",
      'SOCIAL_CARD_PRODUCT_COUNT = 44',
      'SOCIAL_CARD_FIRM_COUNT = 9',
      'Refresh the India challenge-comparison social card',
      'breadcrumbSchema',
      'faqPageSchema',
      'alternates: { canonical: PATH }',
    ]
    for (const token of requiredTokens) {
      if (!page.includes(token)) {
        rows.push(`India challenge page is missing safeguard: ${token}`)
      }
    }
  }

  if (!fs.existsSync(INDIA_CHALLENGE_COMPONENT_FILE)) {
    rows.push('components/IndiaChallengeComparison.tsx is missing')
  } else {
    const component = fs.readFileSync(INDIA_CHALLENGE_COMPONENT_FILE, 'utf-8')
    const requiredTokens = [
      'product.sourceUrl',
      'product.capturedAt',
      'firm.evidenceScore',
      'product.assetClass',
      'india-compare-market',
      'product.entryPrice',
      'product.accountSizesUsd',
      'signals={product.changeSignals}',
      'detailsPath="/best-prop-firms-in-india/challenge-changes"',
      'shortlistChangeHref(selectedRows)',
      'challenge_change_shortlist_open',
      '/best-prop-firms-in-india/challenge-changes?',
      "url.searchParams.set('priority', priority)",
      'Context, not a universal winner',
      'Currency conversion is required',
      'decisionOutcome.winnerKeys',
      'product.rules.ea',
      'product.rules.news',
      'product.rules.weekend',
      'rel="nofollow noopener"',
      'prefetch={false}',
    ]
    for (const token of requiredTokens) {
      if (!component.includes(token)) {
        rows.push(`India challenge component is missing sourced field or link safeguard: ${token}`)
      }
    }
  }

  const matcherFile = path.join(ROOT, 'lib/indiaMatcher.ts')
  const matcher = fs.existsSync(matcherFile) ? fs.readFileSync(matcherFile, 'utf-8') : ''
  const matcherTokens = [
    'passesIndiaRegulatoryCountryGate',
    'isChallengeFresh(challenge)',
    'sourceUrl: challenge.sourceUrl',
    'capturedAt: challenge.sourceCapturedAt',
    'productChangeSignals(',
    'rules: challenge.rules',
  ]
  for (const token of matcherTokens) {
    if (!matcher.includes(token)) {
      rows.push(`India matcher projection is missing challenge evidence: ${token}`)
    }
  }

  const matchupComponent = fs.existsSync(INDIA_MATCHUP_COMPONENT_FILE)
    ? fs.readFileSync(INDIA_MATCHUP_COMPONENT_FILE, 'utf-8')
    : ''
  if (!matchupComponent) {
    rows.push('components/IndiaCuratedMatchupPage.tsx is missing')
  } else {
    const matchupTokens = [
      'buildIndiaMatcherFirms',
      'INDIA_EVIDENCE_BY_SLUG',
      'IndiaChallengeComparison firms={matchupFirms}',
      'contextualWinner(',
      'entryRange(',
      'product.changeSignals',
      'field.sourceUrls[0]',
      'affiliate ranking points',
      'firm.isPartner ?',
      'rel="sponsored nofollow noopener"',
      'href={firm.products[0].sourceUrl}',
      'rel="nofollow noopener"',
      'breadcrumbSchema',
      'faqPageSchema',
      'config.expectedProductCount',
      'representative shortlist is stale',
    ]
    for (const token of matchupTokens) {
      if (!matchupComponent.includes(token)) {
        rows.push(`India matchup renderer is missing safeguard: ${token}`)
      }
    }
    if (/app\.fundingpips\.com|brightfunded\.com\/a\//.test(matchupComponent)) {
      rows.push('India matchup renderer contains a bare affiliate URL')
    }
  }

  const matchupConfig = fs.existsSync(INDIA_MATCHUP_CONFIG_FILE)
    ? fs.readFileSync(INDIA_MATCHUP_CONFIG_FILE, 'utf-8')
    : ''
  if (!matchupConfig) {
    rows.push('lib/indiaMatchups.ts is missing')
  } else if (!matchupConfig.includes('getIndiaMatchupsForFirm')) {
    rows.push('lib/indiaMatchups.ts is missing the firm-to-matchup projection')
  }

  const matchupLinks = fs.existsSync(INDIA_MATCHUP_LINKS_FILE)
    ? fs.readFileSync(INDIA_MATCHUP_LINKS_FILE, 'utf-8')
    : ''
  if (!matchupLinks) {
    rows.push('components/IndiaMatchupLinks.tsx is missing')
  } else {
    for (const token of [
      'getIndiaMatchupsForFirm',
      'matchup.expectedProductCount',
      'matchup.hubQuestion',
      'matchup.decisionTags',
      'data-india-matchup-link={href}',
      'Affiliate status contributes 0 points',
      '/best-prop-firms-in-india/compare',
    ]) {
      if (!matchupLinks.includes(token)) {
        rows.push(`India matchup link cluster is missing safeguard: ${token}`)
      }
    }
    if (matchupLinks.includes('/go/')) {
      rows.push('India matchup link cluster must not contain affiliate actions')
    }
  }

  for (const [file, label, token] of [
    [BLOG_POST_PAGE_FILE, 'firm review template', '<IndiaMatchupLinks firmName={matchedFirm.name} />'],
    [
      path.join(ROOT, 'components/LandingPage.tsx'),
      'India landing',
      '<IndiaMatchupLinks',
    ],
    [INDIA_CHALLENGE_PAGE_FILE, 'India challenge comparison', '<IndiaMatchupLinks'],
  ]) {
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes(token)) {
      rows.push(`${label} is missing the curated India matchup cluster`)
    }
  }

  const matchupHub = fs.existsSync(INDIA_MATCHUP_HUB_PAGE_FILE)
    ? fs.readFileSync(INDIA_MATCHUP_HUB_PAGE_FILE, 'utf-8')
    : ''
  if (!matchupHub) {
    rows.push('app/best-prop-firms-in-india/compare/page.tsx is missing')
  } else {
    for (const token of [
      "const PATH = '/best-prop-firms-in-india/compare'",
      'alternates: { canonical: PATH }',
      'INDIA_MATCHUPS',
      'indiaMatchupPath',
      'buildIndiaMatcherFirms',
      'config.expectedProductCount',
      "'@type': 'ItemList'",
      'Affiliate status contributes 0 points',
      'faqPageSchema',
    ]) {
      if (!matchupHub.includes(token)) {
        rows.push(`India matchup hub is missing safeguard: ${token}`)
      }
    }
    if (matchupHub.includes('/go/')) {
      rows.push('India matchup hub must not contain affiliate actions')
    }
  }

  for (const slug of INDIA_MATCHUP_SLUGS) {
    const routePath = `/best-prop-firms-in-india/${slug}`
    const routeDirectory = path.join(
      ROOT,
      'app/best-prop-firms-in-india',
      slug,
    )
    const pageFile = path.join(routeDirectory, 'page.tsx')
    const socialFile = path.join(routeDirectory, 'opengraph-image.png')
    const socialAltFile = path.join(routeDirectory, 'opengraph-image.alt.txt')
    const page = fs.existsSync(pageFile) ? fs.readFileSync(pageFile, 'utf-8') : ''
    if (!page) {
      rows.push(`${routePath}/page.tsx is missing`)
    } else {
      for (const token of [
        `getIndiaMatchupConfig('${slug}')`,
        'indiaMatchupMetadata(CONFIG)',
        'IndiaCuratedMatchupPage config={CONFIG}',
      ]) {
        if (!page.includes(token)) {
          rows.push(`${routePath} wrapper is missing safeguard: ${token}`)
        }
      }
    }
    if (!matchupConfig.includes(`'${slug}'`)) {
      rows.push(`India matchup config is missing ${slug}`)
    }
    if (!fs.existsSync(socialFile) || fs.statSync(socialFile).size < 100_000) {
      rows.push(`${routePath} social card is missing or unexpectedly small`)
    }
    const socialAlt = fs.existsSync(socialAltFile)
      ? fs.readFileSync(socialAltFile, 'utf-8').trim()
      : ''
    if (
      !socialAlt
      || !/FundingPips vs (Bright Funded|FXIFY)|Bright Funded vs FXIFY/.test(socialAlt)
    ) {
      rows.push(`${routePath} social card alt text is missing the matchup`)
    }
  }

  const matchupHubSocialAltFile = path.join(
    ROOT,
    'app/best-prop-firms-in-india/compare/opengraph-image.alt.txt',
  )
  if (
    !fs.existsSync(INDIA_MATCHUP_HUB_SOCIAL_FILE)
    || fs.statSync(INDIA_MATCHUP_HUB_SOCIAL_FILE).size < 100_000
  ) {
    rows.push('India matchup hub social card is missing or unexpectedly small')
  }
  const matchupHubSocialAlt = fs.existsSync(matchupHubSocialAltFile)
    ? fs.readFileSync(matchupHubSocialAltFile, 'utf-8').trim()
    : ''
  if (!/Prop Firm Comparisons.*Indian Traders/i.test(matchupHubSocialAlt)) {
    rows.push('India matchup hub social card alt text is missing')
  }

  for (const [relativePath, token] of [
    ['app/sitemap.ts', 'INDIA_MATCHUPS'],
    ['app/sitemap.ts', 'indiaMatchupPath'],
    ['app/llms.txt/route.ts', 'INDIA_MATCHUPS'],
    ['app/llms.txt/route.ts', 'indiaMatchupPath'],
  ]) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes(token)) {
      rows.push(`${relativePath} is missing curated matchup discovery token ${token}`)
    }
  }

  const matchupHubPath = '/best-prop-firms-in-india/compare'
  for (const [relativePath, label] of [
    ['components/navLinks.ts', 'primary navigation'],
    ['components/Footer.tsx', 'footer'],
    ['components/LandingPage.tsx', 'India landing'],
    ['components/IndiaCuratedMatchupPage.tsx', 'curated matchup renderer'],
    [
      'app/best-prop-firms-in-india/challenge-comparison/page.tsx',
      'India challenge comparison',
    ],
    ['app/sitemap.ts', 'sitemap'],
    ['app/llms.txt/route.ts', 'AI discovery index'],
  ]) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes(matchupHubPath)) {
      rows.push(`${label} does not link to ${matchupHubPath}`)
    }
  }

  if (!fs.existsSync(INDIA_CHALLENGE_SOCIAL_FILE)) {
    rows.push('India challenge comparison social card is missing')
  } else if (fs.statSync(INDIA_CHALLENGE_SOCIAL_FILE).size < 100_000) {
    rows.push('India challenge comparison social card is unexpectedly small')
  }

  const internalLinks = [
    ['components/LandingPage.tsx', 'India landing'],
    ['app/best-prop-firms-in-india/payout-methods/page.tsx', 'India payout page'],
    ['components/navLinks.ts', 'primary navigation'],
    ['app/blog/[slug]/page.tsx', 'blog sidebar'],
    ['content/posts/are-prop-firms-legal-in-india.md', 'India legal guide'],
    ['content/posts/prop-firm-payout-tax-india.md', 'India tax guide'],
    ['app/sitemap.ts', 'sitemap'],
  ]
  for (const [relativePath, label] of internalLinks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes(routePath)) {
      rows.push(`${label} does not link to ${routePath}`)
    }
  }

  const releaseCrawl = fs.existsSync(RELEASE_CRAWL_FILE)
    ? fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
    : ''
  for (const token of [
    'Object.values(INDIA_MATCHUPS)',
    'inlinkCount < 7',
    'India matchup has only ${inlinkCount} unique internal inlinks',
    'participantReviewPaths',
    'missing required contextual inlink from',
    'data-india-matchup-link="${href}"',
  ]) {
    if (!releaseCrawl.includes(token)) {
      rows.push(`release crawl is missing India matchup link safeguard: ${token}`)
    }
  }

  if (rows.length) {
    console.log('\n✗ India challenge comparison')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The India change newsroom is a projection of the public watch ledger through
 * the same firm, product and freshness gate as the India comparison. It must
 * never become a manually curated affiliate feed.
 */
function checkIndiaChallengeChangesSurface() {
  const rows = []
  const routePath = '/best-prop-firms-in-india/challenge-changes'

  if (!fs.existsSync(INDIA_CHALLENGE_CHANGES_PAGE_FILE)) {
    rows.push('app/best-prop-firms-in-india/challenge-changes/page.tsx is missing')
  } else {
    const page = fs.readFileSync(INDIA_CHALLENGE_CHANGES_PAGE_FILE, 'utf-8')
    const requiredTokens = [
      `const PATH = '${routePath}'`,
      'alternates: { canonical: PATH }',
      "getLandingBySlug('best-prop-firms-in-india')",
      'buildLandingPayload(landing)',
      'buildIndiaMatcherFirms',
      'getChallengeWatchEntries()',
      'entry.productSlugs.includes(product.slug)',
      'affectedComparisonUrl(',
      'validateChallengeProductKeys',
      'SOCIAL_CARD_ENTRY_COUNT = 13',
      'SOCIAL_CARD_FIRM_COUNT = 6',
      'SOCIAL_CARD_PRODUCT_COUNT = 18',
      'SOCIAL_CARD_VERIFIED_COUNT = 3',
      'SOCIAL_CARD_WATCH_COUNT = 10',
      'Refresh the India challenge-changes social card',
      'Affiliate status contributes 0 points',
      'ChallengeChangeFeed entries={entries}',
      'breadcrumbSchema',
      'faqPageSchema',
      "'@type': 'ItemList'",
      'numberOfItems: entries.length',
    ]
    for (const token of requiredTokens) {
      if (!page.includes(token)) {
        rows.push(`India challenge changes page is missing safeguard: ${token}`)
      }
    }
    if (/href=["'`]\/go\//.test(page)) {
      rows.push('India challenge changes page must not contain affiliate actions')
    }
  }

  const changeFeed = fs.existsSync(CHALLENGE_CHANGES_COMPONENT_FILE)
    ? fs.readFileSync(CHALLENGE_CHANGES_COMPONENT_FILE, 'utf-8')
    : ''
  for (const token of [
    'entry.productNames',
    'Affected products',
    'entry.comparisonUrl',
    'entry.comparisonLabel',
    'rel="nofollow noopener"',
  ]) {
    if (!changeFeed.includes(token)) {
      rows.push(`challenge change feed is missing India product safeguard: ${token}`)
    }
  }

  for (const [relativePath, label] of [
    ['components/navLinks.ts', 'primary navigation'],
    ['components/Footer.tsx', 'footer'],
    ['components/LandingPage.tsx', 'India landing'],
    ['components/IndiaCuratedMatchupPage.tsx', 'curated India matchups'],
    [
      'app/best-prop-firms-in-india/challenge-comparison/page.tsx',
      'India challenge comparison',
    ],
    ['app/prop-firm-challenge-changes/page.tsx', 'global change ledger'],
    ['app/sitemap.ts', 'sitemap'],
    ['app/llms.txt/route.ts', 'AI discovery index'],
  ]) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes(routePath)) {
      rows.push(`${label} does not link to ${routePath}`)
    }
  }

  if (
    !fs.existsSync(INDIA_CHALLENGE_CHANGES_SOCIAL_FILE)
    || fs.statSync(INDIA_CHALLENGE_CHANGES_SOCIAL_FILE).size < 100_000
  ) {
    rows.push('India challenge changes social card is missing or unexpectedly small')
  }
  const socialAlt = fs.existsSync(INDIA_CHALLENGE_CHANGES_SOCIAL_ALT_FILE)
    ? fs.readFileSync(INDIA_CHALLENGE_CHANGES_SOCIAL_ALT_FILE, 'utf-8').trim()
    : ''
  if (!/India Challenge Changes|Challenge Changes.*India/i.test(socialAlt)) {
    rows.push('India challenge changes social-card alt text is missing')
  }

  if (rows.length) {
    console.log('\n✗ India challenge changes')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The India tax guide is YMYL content. Keep the return-form language cautious,
 * its external sources on the Income Tax Department domain, and the download
 * template structurally stable so later edits cannot silently turn it into a
 * tax-classification calculator.
 */
function checkIndiaTaxGuide() {
  const rows = []
  const guidePath = '/blog/prop-firm-payout-tax-india'
  const templatePath = '/templates/india-prop-firm-payout-records.csv'

  if (!fs.existsSync(INDIA_TAX_GUIDE_FILE)) {
    rows.push('content/posts/prop-firm-payout-tax-india.md is missing')
  } else {
    const guide = fs.readFileSync(INDIA_TAX_GUIDE_FILE, 'utf-8')
    const requiredTokens = [
      'ITR-1',
      'ITR-2',
      'ITR-3',
      'Schedule FSI',
      'Schedule TR',
      'Schedule FA',
      'Form 67',
      'not tax advice',
      'chartered accountant',
      templatePath,
      'Source check completed 28 July 2026',
    ]
    for (const token of requiredTokens) {
      if (!guide.includes(token)) {
        rows.push(`India tax guide is missing required boundary or disclosure: ${token}`)
      }
    }

    if (/href=["'`]\/go\//.test(guide)) {
      rows.push('India tax guide must not contain direct /go/ affiliate links')
    }

    const externalUrls = [...guide.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(match => match[1])
    if (externalUrls.length < 5) {
      rows.push('India tax guide must cite at least 5 official Income Tax Department sources')
    }
    for (const url of externalUrls) {
      let hostname
      try {
        hostname = new URL(url).hostname.toLowerCase()
      } catch {
        rows.push(`India tax guide contains an invalid external URL: ${url}`)
        continue
      }
      if (hostname !== 'www.incometax.gov.in' && hostname !== 'incometax.gov.in') {
        rows.push(`India tax guide external source is not on incometax.gov.in: ${url}`)
      }
    }
  }

  const expectedColumns = [
    'payout_date',
    'firm_name',
    'payor_legal_entity',
    'payor_country',
    'contract_version',
    'account_product',
    'gross_reward_currency',
    'gross_reward_amount',
    'provider_fee_currency',
    'provider_fee_amount',
    'foreign_tax_withheld_currency',
    'foreign_tax_withheld_amount',
    'net_received_currency',
    'net_received_amount',
    'receipt_fx_rate_to_inr',
    'receipt_fx_rate_source',
    'inr_value_at_receipt',
    'payout_method',
    'payout_provider',
    'provider_transaction_id',
    'bank_reference',
    'invoice_or_statement_filename',
    'contract_filename',
    'notes',
  ]
  if (!fs.existsSync(INDIA_PAYOUT_TEMPLATE_FILE)) {
    rows.push('public/templates/india-prop-firm-payout-records.csv is missing')
  } else {
    const template = fs.readFileSync(INDIA_PAYOUT_TEMPLATE_FILE, 'utf-8')
    const nonEmptyLines = template.split(/\r?\n/).filter(line => line.trim())
    const columns = nonEmptyLines[0]?.split(',') ?? []
    if (columns.length !== 24 || columns.some((column, index) => column !== expectedColumns[index])) {
      rows.push('India payout template must preserve the audited 24-column header')
    }
    if (nonEmptyLines.length !== 1) {
      rows.push('India payout template must ship as a header-only CSV without example personal data')
    }
  }

  const internalLinks = [
    ['components/LandingPage.tsx', 'India landing'],
    ['app/best-prop-firms-in-india/payout-methods/page.tsx', 'India payout page'],
    ['content/posts/are-prop-firms-legal-in-india.md', 'India legal guide'],
    ['app/blog/[slug]/page.tsx', 'blog sidebar'],
  ]
  for (const [relativePath, label] of internalLinks) {
    const file = path.join(ROOT, relativePath)
    const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!body.includes(guidePath)) {
      rows.push(`${label} does not link to ${guidePath}`)
    }
  }

  if (rows.length) {
    console.log('\n✗ India tax guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The challenge-lifecycle pillar deliberately quotes several products instead
 * of restating every firm's catalog. Keep those examples tied to the same
 * structured records that power the comparison pages, so a refreshed capture
 * cannot leave an old fee or payout cadence behind in this high-intent guide.
 */
function checkChallengeLifecyclePillar() {
  const rows = []
  if (!fs.existsSync(CHALLENGE_LIFECYCLE_PAGE_FILE)) {
    console.log('\n✗ Challenge lifecycle pillar')
    console.log('  · content/pages/how-prop-firm-challenges-work.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(CHALLENGE_LIFECYCLE_PAGE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rowText = (attribute, key) => {
    const match = content.match(
      new RegExp(
        `<tr[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/tr>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const product = (firmSlug, productSlug) => {
    const record = loadChallenges(firmSlug)?.find(
      challenge => challenge.productSlug === productSlug,
    )
    if (!record) rows.push(`${firmSlug}:${productSlug} is missing from challenge data`)
    return record
  }
  const formatAmount = value =>
    Number.isInteger(value) ? String(value) : value.toFixed(2)
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} row or section is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.seoTitle !== 'How Prop Firm Challenges Work: 5 Stages (2026)') {
    rows.push('seoTitle must preserve the lifecycle search intent and current year')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }

  const priceExamples = [
    ['ftmo', 'ftmo-challenge-2-step', 100000, 'priceEur', '€'],
    ['fundednext', 'stellar-2-step', 100000, 'priceUsd', '$'],
    ['fxify', 'one-phase', 100000, 'priceUsd', '$'],
    ['fundednext', 'stellar-instant', 10000, 'priceUsd', '$'],
  ]
  for (const [firmSlug, productSlug, sizeUsd, priceField, currency] of priceExamples) {
    const key = `${firmSlug}:${productSlug}`
    const record = product(firmSlug, productSlug)
    if (!record) continue
    const tier = record.accountSizes.find(account => account.sizeUsd === sizeUsd)
    if (!tier || tier[priceField] == null) {
      rows.push(`${key} has no captured ${sizeUsd} ${priceField} tier`)
      continue
    }
    const refund = tier.refundable === true ? 'Yes' : tier.refundable === false ? 'No' : null
    expectFragments(
      `${key} price`,
      rowText('data-lifecycle-price', key),
      [
        `$${sizeUsd / 1000}K`,
        `${currency}${formatAmount(tier[priceField])}`,
        record.sourceCapturedAt,
        ...(refund ? [refund] : []),
      ],
    )
  }

  const payoutExamples = [
    ['ftmo', 'ftmo-challenge-2-step', 'On demand'],
    ['fundednext', 'stellar-2-step', 'Every 14 days'],
    ['fxify', 'lightning-challenge', 'Every 14 days'],
    ['topstep', 'trading-combine-standard-path', 'On demand'],
    ['fundingpips', '2-step-pro', 'Weekly'],
  ]
  for (const [firmSlug, productSlug, cadence] of payoutExamples) {
    const key = `${firmSlug}:${productSlug}`
    const record = product(firmSlug, productSlug)
    if (!record) continue
    expectFragments(
      `${key} payout`,
      rowText('data-lifecycle-payout', key),
      [`${record.payoutFirstDays}`, cadence, record.sourceCapturedAt],
    )
  }

  const topstep = product('topstep', 'trading-combine-standard-path')
  const fundingPipsPro = product('fundingpips', '2-step-pro')
  const topstepPayoutRow = rowText(
    'data-lifecycle-payout',
    'topstep:trading-combine-standard-path',
  )
  const fundingPipsPayoutRow = rowText(
    'data-lifecycle-payout',
    'fundingpips:2-step-pro',
  )
  if (
    !topstep?.notes.some(note => note.includes('Minimum Payout: $125')) ||
    !topstepPayoutRow.includes('$125 minimum')
  ) {
    rows.push('Topstep $125 payout minimum must remain supported by its capture notes')
  }
  if (
    !fundingPipsPro?.notes.some(note => note.includes('Minimum reward request is 1%')) ||
    !fundingPipsPayoutRow.includes('1% minimum reward')
  ) {
    rows.push('FundingPips 1% payout minimum must remain supported by its capture notes')
  }

  const lightning = product('fxify', 'lightning-challenge')
  const lightningStart = content.indexOf('<h3>B. 1-step path on FXIFY Lightning')
  const lightningEnd = content.indexOf('<h3>', lightningStart + 1)
  const lightningSection = lightningStart >= 0
    ? content.slice(lightningStart, lightningEnd > lightningStart ? lightningEnd : undefined)
    : ''
  if (lightning) {
    const tier = [...lightning.accountSizes]
      .filter(account => account.priceUsd != null)
      .sort((a, b) => a.sizeUsd - b.sizeUsd)[0]
    const targetUsd = tier.sizeUsd * lightning.profitTargets.phase1 / 100
    const dailyLossUsd = tier.sizeUsd * lightning.dailyLossPct / 100
    const maxLossUsd = tier.sizeUsd * lightning.maxLossPct / 100
    expectFragments('FXIFY Lightning walkthrough', lightningSection, [
      `$${tier.sizeUsd / 1000}K`,
      `$${formatAmount(tier.priceUsd)}`,
      `$${formatAmount(targetUsd)}`,
      `${lightning.profitTargets.phase1}%`,
      `${lightning.minTradingDays} trading days`,
      `${lightning.maxTradingDays}-day maximum`,
      `$${formatAmount(dailyLossUsd)} daily`,
      `$${formatAmount(maxLossUsd)} trailing`,
      'base split null',
      `${lightning.payoutFirstDays} days`,
      'refundable with the first withdrawal',
    ])
    if (lightning.profitSplitPct !== null) {
      rows.push('FXIFY Lightning walkthrough assumes a null structured base split')
    }
  }

  const requiredLinks = [
    '/prop-firm-challenges',
    '/blog/ftmo-review',
    '/blog/fundednext-review',
    '/blog/fxify-review',
    '/blog/topstep-review',
    '/blog/funding-pips-review',
    '/best-prop-firms-in-india/payout-methods',
    '/prop-firms',
    '/how-to-pass-a-prop-firm-challenge',
    '/true-cost-of-prop-firm-challenges',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const staleClaims = [
    'promo applied',
    '~$330',
    '30 days after activation',
    'FXIFY evaluation products',
    'On-demand payouts from day 1',
    'Lightning $5K',
    '95% profit split',
    'six challenge products',
    '0.71%',
    '~14 days',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`stale claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Challenge lifecycle pillar')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** The passing guide's product examples and arithmetic must move with captures. */
function checkChallengePassingPillar() {
  const rows = []
  if (!fs.existsSync(CHALLENGE_PASSING_PAGE_FILE)) {
    console.log('\n✗ Challenge passing pillar')
    console.log('  · content/pages/how-to-pass-a-prop-firm-challenge.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(CHALLENGE_PASSING_PAGE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedText = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const product = (firmSlug, productSlug) => {
    const record = loadChallenges(firmSlug)?.find(
      challenge => challenge.productSlug === productSlug,
    )
    if (!record) rows.push(`${firmSlug}:${productSlug} is missing from challenge data`)
    return record
  }
  const money = value => `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)}`
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} row or section is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.seoTitle !== 'How to Pass a Prop Firm Challenge: Risk Plan (2026)') {
    rows.push('seoTitle must preserve passing intent, risk-plan distinction, and year')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }

  const planExamples = [
    ['ftmo', 'ftmo-challenge-2-step', 100000],
    ['fundednext', 'stellar-2-step', 100000],
    ['fxify', 'lightning-challenge', 10000],
    ['fundingpips', '2-step-pro', 100000],
  ]
  for (const [firmSlug, productSlug, sizeUsd] of planExamples) {
    const key = `${firmSlug}:${productSlug}`
    const record = product(firmSlug, productSlug)
    if (!record) continue
    if (!record.accountSizes.some(account => account.sizeUsd === sizeUsd)) {
      rows.push(`${key} has no captured ${sizeUsd} tier`)
      continue
    }
    const targets = Object.values(record.profitTargets ?? {})
      .filter(value => value != null)
      .map(value => `${value}%`)
      .join(' then ')
    const dayFragments = record.maxTradingDays == null
      ? [`${record.minTradingDays} minimum`, 'no maximum captured']
      : [`${record.minTradingDays} minimum`, `${record.maxTradingDays} maximum`]
    expectFragments(
      `${key} plan`,
      attributedText('tr', 'data-pass-plan', key),
      [
        `$${sizeUsd / 1000}K`,
        targets,
        `${record.dailyLossPct}% daily`,
        `${record.maxLossPct}% ${record.drawdownType} max`,
        ...dayFragments,
        record.sourceCapturedAt,
      ],
    )
  }

  const fundedNext = product('fundednext', 'stellar-2-step')
  if (fundedNext) {
    const tier = fundedNext.accountSizes.find(account => account.sizeUsd === 100000)
    const dailyThreshold = tier.sizeUsd * fundedNext.dailyLossPct / 100
    const personalStop = dailyThreshold * 0.20
    const perAttempt = personalStop / 2
    expectFragments(
      'FundedNext risk-budget example',
      attributedText('table', 'data-pass-risk-example', 'fundednext:stellar-2-step'),
      [
        `${fundedNext.dailyLossPct}%`,
        '$100K',
        money(dailyThreshold),
        '20%',
        money(personalStop),
        money(perAttempt),
      ],
    )
    const phase1Usd = tier.sizeUsd * fundedNext.profitTargets.phase1 / 100
    const phase2Usd = tier.sizeUsd * fundedNext.profitTargets.phase2 / 100
    expectFragments('FundedNext target math', content, [
      money(phase1Usd),
      money(phase2Usd),
      money(400),
      `${phase1Usd / 400} sessions`,
    ])
    const staticFloor = tier.sizeUsd * (1 - fundedNext.maxLossPct / 100)
    expectFragments('FundedNext static floor', content, [money(staticFloor)])
  }

  const fundingPipsPro = product('fundingpips', '2-step-pro')
  if (fundingPipsPro) {
    const tier = fundingPipsPro.accountSizes.find(account => account.sizeUsd === 100000)
    const staticFloor = tier.sizeUsd * (1 - fundingPipsPro.maxLossPct / 100)
    expectFragments('FundingPips static floor', content, [money(staticFloor)])
  }

  const lightning = product('fxify', 'lightning-challenge')
  if (lightning) {
    if (!content.includes(`${lightning.consistencyRulePct}% consistency rule`)) {
      rows.push('FXIFY Lightning consistency percentage drifted from challenge data')
    }
    if (
      !lightning.notes.some(note => note.includes('Mandatory stop loss')) ||
      !content.includes('requires a stop loss on every trade')
    ) {
      rows.push('FXIFY Lightning mandatory-stop claim lost its capture-note support')
    }
  }

  const topstep = product('topstep', 'trading-combine-standard-path')
  if (
    !topstep?.notes.some(note =>
      note.includes("'$100K' -> '$3,000'"),
    ) ||
    !content.includes('$3,000 maximum-loss amount')
  ) {
    rows.push('Topstep $100K maximum-loss amount must remain supported by capture notes')
  }

  const requiredLinks = [
    '/how-prop-firm-challenges-work',
    '/prop-firm-challenges',
    '/prop-firms/static-drawdown',
    '/prop-firms/news-trading',
    '/prop-firms/overnight-holding',
    '/blog/what-is-prop-firm-consistency-rule',
    '/cheapest-prop-firms',
    '/true-cost-of-prop-firm-challenges',
    '/prop-firm-challenge-changes',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const staleClaims = [
    'almost every failed evaluation',
    'the target is the easy half',
    'daily drawdown is typically 5%',
    'usually UTC midnight',
    'five losers in a row before',
    'FundingPips requires 5 trading days',
    "I've blown one of these",
    'more funded accounts die here',
    '~1%/day',
    'standard two-step evaluation asks for an 8%',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Challenge passing pillar')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** True-cost copy must preserve the calculator's scope and captured inputs. */
function checkTrueCostPillar() {
  const rows = []
  if (!fs.existsSync(TRUE_COST_PILLAR_FILE)) {
    console.log('\n✗ True-cost pillar')
    console.log('  · content/pages/true-cost-of-prop-firm-challenges.md is missing')
    return 1
  }

  const { data, content } = matter(fs.readFileSync(TRUE_COST_PILLAR_FILE, 'utf-8'))
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rowText = key => {
    const match = content.match(
      new RegExp(
        `<tr[^>]*\\bdata-true-cost-example="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/tr>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const product = (firmSlug, productSlug) => {
    const record = loadChallenges(firmSlug)?.find(
      challenge => challenge.productSlug === productSlug,
    )
    if (!record) rows.push(`${firmSlug}:${productSlug} is missing from challenge data`)
    return record
  }
  const amount = value =>
    Number.isInteger(value)
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} row or section is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.seoTitle !== 'Prop Firm Challenge True Cost: Fee-Recovery Math') {
    rows.push('seoTitle must preserve true-cost intent and define fee recovery')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }

  const examples = [
    ['fundednext', 'stellar-2-step', 100000],
    ['fundednext', 'stellar-instant', 10000],
    ['ftmo', 'ftmo-challenge-2-step', 100000],
    ['topstep', 'trading-combine-standard-path', 100000],
  ]
  for (const [firmSlug, productSlug, sizeUsd] of examples) {
    const key = `${firmSlug}:${productSlug}`
    const record = product(firmSlug, productSlug)
    if (!record) continue
    const tier = record.accountSizes.find(account => account.sizeUsd === sizeUsd)
    const economics = tier ? challengeTierEconomics(record, tier) : null
    if (!tier || !economics) {
      rows.push(`${key} has no calculable ${sizeUsd} tier economics`)
      continue
    }
    const symbol = economics.currency === 'EUR' ? '€' : '$'
    const fragments = [
      `$${sizeUsd / 1000}K`,
      `${symbol}${amount(economics.minimumCost)}`,
      `${record.profitSplitPct}%`,
      `${symbol}${amount(economics.breakEvenProfit)}`,
      record.sourceCapturedAt,
    ]
    if (economics.rMultiple != null) fragments.push(economics.rMultiple.toFixed(3))
    if (economics.dayCount != null) fragments.push(String(economics.dayCount))
    expectFragments(`${key} true-cost`, rowText(key), fragments)
  }

  const fundedNext = product('fundednext', 'stellar-2-step')
  if (fundedNext) {
    const tier = fundedNext.accountSizes.find(account => account.sizeUsd === 100000)
    const economics = challengeTierEconomics(fundedNext, tier)
    const attemptCount = 3
    const initialPaid = tier.priceUsd * attemptCount
    const receivedRefund = tier.priceUsd
    const netCost = initialPaid - receivedRefund
    const retryRecoveryProfit = netCost / (fundedNext.profitSplitPct / 100)
    expectFragments('FundedNext retry example', content, [
      `${attemptCount} FundedNext`,
      `$${amount(tier.priceUsd)}`,
      `$${amount(initialPaid)}`,
      `$${amount(receivedRefund)}`,
      `$${amount(netCost)}`,
      `$${amount(retryRecoveryProfit)}`,
    ])
    const traderShare = economics.breakEvenProfit * fundedNext.profitSplitPct / 100
    const cashReceipt = traderShare + receivedRefund
    expectFragments('FundedNext refund example', content, [
      `$${amount(economics.breakEvenProfit)}`,
      `$${amount(traderShare)}`,
      `$${amount(cashReceipt)}`,
      `${fundedNext.payoutFirstDays} days`,
    ])
  }

  const topstep = product('topstep', 'trading-combine-standard-path')
  if (topstep) {
    const tier = topstep.accountSizes.find(account => account.sizeUsd === 100000)
    const oneMonthCost = tier.priceUsd + topstep.activationFeeUsd
    const twoMonthCost = tier.priceUsd * 2 + topstep.activationFeeUsd
    const oneMonthRecovery = oneMonthCost / (topstep.profitSplitPct / 100)
    const twoMonthRecovery = twoMonthCost / (topstep.profitSplitPct / 100)
    expectFragments('Topstep recurring-cost example', content, [
      `$${amount(tier.priceUsd)} per month`,
      `$${amount(topstep.activationFeeUsd)} activation`,
      `$${amount(oneMonthCost)}`,
      `$${amount(oneMonthRecovery)}`,
      `$${amount(twoMonthCost)}`,
      `$${amount(twoMonthRecovery)}`,
    ])
  }

  const lightning = product('fxify', 'lightning-challenge')
  if (
    lightning?.profitSplitPct !== null ||
    !content.includes('<code>profitSplitPct</code> is null') ||
    !content.includes('fee-recovery profit is undefined')
  ) {
    rows.push('FXIFY Lightning must remain uncalculated while its base split is null')
  }

  const requiredLinks = [
    '/how-to-pass-a-prop-firm-challenge',
    '/how-prop-firm-challenges-work',
    '/prop-firm-challenges',
    '/prop-firm-challenge-changes',
    '/blog/ftmo-review',
    '/blog/fundednext-review',
    '/blog/topstep-review',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const calculatorSurfaces = [
    [COST_CALCULATOR_FILE, 'reusable calculator'],
    [HOMEPAGE_FILE, 'homepage calculator'],
  ]
  for (const [file, label] of calculatorSurfaces) {
    const calculator = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    for (const required of [
      'Fee-recovery profit',
      'Cost / loss-room ratio',
      'Standardized growth days',
    ]) {
      if (!calculator.includes(required)) rows.push(`${label} is missing "${required}"`)
    }
    for (const verdict of ['Favourable', 'Workable', 'Math against you', 'better odds']) {
      if (calculator.includes(verdict)) rows.push(`${label} restored verdict "${verdict}"`)
    }
  }

  const staleClaims = [
    '$489 FTMO',
    'FXIFY Lightning $5K',
    'at 80% split with 10% trailing',
    'the "average buyer" pays',
    'estimates cluster in 8–14%',
    'R-multiple is above 0.5',
    'realistic days @ 1%/day',
    'a realistic floor',
    'break-even is the first profitable trade',
    'favorable risk math',
    'R = 1.0+ is hostile',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale true-cost claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ True-cost pillar')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Drawdown copy must keep four separate concepts explicit: reference value,
 * observed value, floor movement, and update/reset timing. Tie every current
 * example and worked result back to structured challenge data plus the raw
 * firm capture so a familiar but incorrect balance=static shortcut cannot
 * return unnoticed.
 */
function checkDrawdownGuide() {
  const rows = []
  if (!fs.existsSync(DRAWDOWN_GUIDE_FILE)) {
    console.log('\n✗ Balance/equity drawdown guide')
    console.log(
      '  · content/posts/balance-based-drawdown-vs-equity-based-drawdown.md is missing',
    )
    return 1
  }

  const { data, content } = matter(fs.readFileSync(DRAWDOWN_GUIDE_FILE, 'utf-8'))
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedMarkup = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match?.[1] ?? ''
  }
  const attributedText = (tag, attribute, key) =>
    stripTags(attributedMarkup(tag, attribute, key)).replace(/\s+/g, ' ').trim()
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }
  const money = value => `$${value.toLocaleString('en-US')}`
  const product = (firmSlug, productSlug) =>
    loadChallenges(firmSlug)?.find(challenge => challenge.productSlug === productSlug)
  const tier = (challenge, sizeUsd) =>
    challenge?.accountSizes.find(account => account.sizeUsd === sizeUsd)

  if (data.title !== 'Balance vs Equity Drawdown: Prop Firm Rules Explained (2026)') {
    rows.push('title must preserve the balance/equity distinction and current-year intent')
  }
  if (data.seoTitle !== 'Balance vs Equity Drawdown in Prop Firms (2026)') {
    rows.push('seoTitle must preserve the direct prop-firm drawdown intent')
  }
  if (typeof data.seoTitle !== 'string' || data.seoTitle.length > 60) {
    rows.push('seoTitle must stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (!Array.isArray(data.tags) || !data.tags.includes('trailing drawdown')) {
    rows.push('tags must preserve trailing-drawdown search intent')
  }

  const ftmoTwoStep = product('ftmo', 'ftmo-challenge-2-step')
  const ftmoOneStep = product('ftmo', 'ftmo-challenge-1-step')
  const fundedNextTwoStep = product('fundednext', 'stellar-2-step')
  const fundedNextInstant = product('fundednext', 'stellar-instant')
  const ftmoTwoStepTier = tier(ftmoTwoStep, 100000)
  const ftmoOneStepTier = tier(ftmoOneStep, 100000)
  const fundedNextTwoStepTier = tier(fundedNextTwoStep, 100000)
  const fundedNextInstantTier = tier(fundedNextInstant, 10000)

  const requiredProducts = [
    ['FTMO 2-Step $100K', ftmoTwoStep, ftmoTwoStepTier],
    ['FTMO 1-Step $100K', ftmoOneStep, ftmoOneStepTier],
    ['FundedNext Stellar 2-Step $100K', fundedNextTwoStep, fundedNextTwoStepTier],
    ['FundedNext Stellar Instant $10K', fundedNextInstant, fundedNextInstantTier],
  ]
  for (const [label, challenge, accountTier] of requiredProducts) {
    if (!challenge || !accountTier) rows.push(`${label} structured product or tier is missing`)
  }

  if (ftmoTwoStep && ftmoTwoStepTier) {
    const floor = ftmoTwoStepTier.sizeUsd * (1 - ftmoTwoStep.maxLossPct / 100)
    expectFragments(
      'FTMO 2-Step drawdown example',
      attributedText('tr', 'data-drawdown-example', 'ftmo:ftmo-challenge-2-step'),
      [
        'FTMO 2-Step $100K',
        `€${ftmoTwoStepTier.priceEur}`,
        `${ftmoTwoStep.dailyLossPct}% of initial balance`,
        `${ftmoTwoStep.maxLossPct}% ${ftmoTwoStep.drawdownType}`,
        `${money(floor)} floor`,
        ftmoTwoStep.sourceCapturedAt,
      ],
    )
    if (ftmoTwoStep.drawdownType !== 'static') {
      rows.push('FTMO 2-Step must remain a static maximum-loss example')
    }
  }

  if (fundedNextTwoStep && fundedNextTwoStepTier) {
    const floor =
      fundedNextTwoStepTier.sizeUsd * (1 - fundedNextTwoStep.maxLossPct / 100)
    expectFragments(
      'FundedNext Stellar 2-Step drawdown example',
      attributedText('tr', 'data-drawdown-example', 'fundednext:stellar-2-step'),
      [
        'FundedNext Stellar 2-Step $100K',
        money(fundedNextTwoStepTier.priceUsd),
        `${fundedNextTwoStep.dailyLossPct}% daily loss`,
        `${fundedNextTwoStep.maxLossPct}% ${fundedNextTwoStep.drawdownType}`,
        `${money(floor)} floor`,
        fundedNextTwoStep.sourceCapturedAt,
      ],
    )
    if (fundedNextTwoStep.drawdownType !== 'static') {
      rows.push('FundedNext Stellar 2-Step must remain a static maximum-loss example')
    }
  }

  if (ftmoOneStep && ftmoOneStepTier) {
    expectFragments(
      'FTMO 1-Step drawdown example',
      attributedText('tr', 'data-drawdown-example', 'ftmo:ftmo-challenge-1-step'),
      [
        'FTMO 1-Step $100K',
        `€${ftmoOneStepTier.priceEur}`,
        `${ftmoOneStep.dailyLossPct}% of initial balance`,
        `${ftmoOneStep.maxLossPct}% balance-based end-of-day trailing`,
        'can increase but never decrease',
        'resets after a reward withdrawal',
        ftmoOneStep.sourceCapturedAt,
      ],
    )
    if (ftmoOneStep.drawdownType !== 'eod-trailing') {
      rows.push('FTMO 1-Step must remain the end-of-day trailing example')
    }
  }

  if (fundedNextInstant && fundedNextInstantTier) {
    const lossAmount =
      fundedNextInstantTier.sizeUsd * (fundedNextInstant.maxLossPct / 100)
    const startingFloor = fundedNextInstantTier.sizeUsd - lossAmount
    expectFragments(
      'FundedNext Stellar Instant drawdown example',
      attributedText('tr', 'data-drawdown-example', 'fundednext:stellar-instant'),
      [
        'FundedNext Stellar Instant $10K',
        money(fundedNextInstantTier.priceUsd),
        'No daily-loss percentage captured',
        `${fundedNextInstant.maxLossPct}% real-time ${fundedNextInstant.drawdownType}`,
        `${money(startingFloor)} starting floor`,
        `locks at ${money(fundedNextInstantTier.sizeUsd)}`,
        'does not reset after a withdrawal',
        fundedNextInstant.sourceCapturedAt,
      ],
    )
    if (
      fundedNextInstant.dailyLossPct !== null ||
      fundedNextInstant.drawdownType !== 'trailing'
    ) {
      rows.push('FundedNext Stellar Instant trailing/no-daily-loss example drifted')
    }
  }

  const ftmoCapture = fs.readFileSync(
    path.join(CHALLENGES, '_captures/ftmo-2026-07-27.json'),
    'utf-8',
  )
  const fundedNextCapture = fs.readFileSync(
    path.join(CHALLENGES, '_captures/fundednext-2026-07-27.json'),
    'utf-8',
  )
  for (const fragment of [
    'Account balance at midnight CE(S)T minus 5% of the initial account balance',
    'account equity, not balance',
    'balance-based end-of-day trailing',
    'can only increase, but never decrease',
    'when a Reward is withdrawn',
  ]) {
    if (!ftmoCapture.includes(fragment)) {
      rows.push(`FTMO raw capture is missing drawdown support: "${fragment}"`)
    }
  }
  for (const fragment of [
    'breach floor remains 90% of initial balance',
    'loss floor trails profit upward and locks at the initial balance',
    'does not reset after a withdrawal',
  ]) {
    if (!fundedNextCapture.toLowerCase().includes(fragment.toLowerCase())) {
      rows.push(`FundedNext raw capture is missing drawdown support: "${fragment}"`)
    }
  }

  const initialBalance = 100000
  const staticFloor = initialBalance * (1 - ftmoTwoStep?.maxLossPct / 100)
  const midnightBalance = 101000
  const dailyFloor =
    midnightBalance - initialBalance * (ftmoTwoStep?.dailyLossPct / 100)
  const instantInitial = fundedNextInstantTier?.sizeUsd
  const instantLossAmount = instantInitial * (fundedNextInstant?.maxLossPct / 100)
  const instantHigh = 10200
  const instantFloor = instantHigh - instantLossAmount
  const instantStartingFloor = instantInitial - instantLossAmount
  const instantLockHigh = 10600
  const instantLockedFloor = Math.min(
    instantInitial,
    instantLockHigh - instantLossAmount,
  )
  expectFragments(
    'worked drawdown-floor math',
    attributedText('table', 'data-drawdown-math', 'worked-floors'),
    [
      `${money(initialBalance)} × (1 − 0.10)`,
      `${money(staticFloor)} fixed floor`,
      `${money(midnightBalance)} − (${money(initialBalance)} × 0.05)`,
      `${money(dailyFloor)} daily floor`,
      `${money(instantHigh)} − (${money(instantInitial)} × 0.06)`,
      `${money(instantFloor)} trailing floor`,
    ],
  )
  expectFragments('Instant lock explanation', stripTags(content), [
    `or ${money(instantLossAmount)}`,
    `lifts the floor from ${money(instantStartingFloor)} to ${money(instantFloor)}`,
    `${money(instantLockHigh)} high`,
    `locks at the ${money(instantLockedFloor)} starting balance`,
  ])

  const choiceMarkup = attributedMarkup('div', 'data-drawdown-choice', 'fundednext')
  const choiceText = stripTags(choiceMarkup).replace(/\s+/g, ' ').trim()
  if (fundedNextTwoStep && fundedNextTwoStepTier && fundedNextInstantTier) {
    const staticFloor =
      fundedNextTwoStepTier.sizeUsd * (1 - fundedNextTwoStep.maxLossPct / 100)
    const instantFloor =
      fundedNextInstantTier.sizeUsd * (1 - fundedNextInstant.maxLossPct / 100)
    expectFragments('FundedNext drawdown choice', choiceText, [
      'Stellar 2-Step',
      '$100K tier',
      `static ${money(staticFloor)} maximum-loss floor`,
      'Stellar Instant',
      '$10K tier',
      `trailing ${money(instantFloor)} floor`,
      'all 4 products',
    ])
  }
  for (const href of ['/blog/fundednext-review', '/go/fundednext']) {
    if (!choiceMarkup.includes(`href="${href}"`)) {
      rows.push(`FundedNext drawdown choice is missing ${href}`)
    }
  }

  const requiredLinks = [
    '/blog/ftmo-review',
    '/blog/fundednext-review',
    '/prop-firm-challenges',
    '/true-cost-of-prop-firm-challenges',
    '/how-to-pass-a-prop-firm-challenge',
    '/prop-firms/static-drawdown',
    '/prop-firm-challenge-changes',
    '/go/fundednext',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [WHAT_IS_PROP_FIRM_GUIDE_FILE, 'prop-firm definition guide'],
    [PASSING_SERVICES_GUIDE_FILE, 'passing-services guide'],
    [CHALLENGE_PASSING_PAGE_FILE, 'challenge-passing pillar'],
    [path.join(POSTS, 'what-is-overtrading.md'), 'overtrading guide'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/balance-based-drawdown-vs-equity-based-drawdown')) {
      rows.push(`${label} is missing a drawdown-guide backlink`)
    }
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-balance-based-drawdown-vs-equity-based-drawdown"',
    ) ||
    !renderedContent.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('rendered FundedNext CTA lacks controlled attribution or disclosure')
  }

  const faqSection = content.split('<h2>Frequently asked questions</h2>')[1] ?? ''
  if ((faqSection.match(/<h3>/gi) ?? []).length !== 6) {
    rows.push('drawdown guide must preserve 6 factual FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('drawdown guide contains a bare external link')
  }

  const staleClaims = [
    'it’s best for you to go for balance based',
    'always a better choice',
    'go for balance based drawdown prop firms',
    'limit increases to $535',
    '$10,165',
    '%0.25',
    'never risk more than 1-2%',
    'don’t have a time limit these days',
    'my own strategy',
    'strongly recommend choosing balance based',
    'investopedia.com',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale drawdown claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Balance/equity drawdown guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Overtrading copy must define the problem as observable plan drift rather
 * than a universal trade count. Keep its current product examples, null-field
 * caveat, hypothetical session math, audit worksheet, and commercial path
 * tied to the structured records and raw captures that support them.
 */
function checkOvertradingGuide() {
  const rows = []
  if (!fs.existsSync(OVERTRADING_GUIDE_FILE)) {
    console.log('\n✗ Overtrading guide')
    console.log('  · content/posts/what-is-overtrading.md is missing')
    return 1
  }

  const { data, content } = matter(fs.readFileSync(OVERTRADING_GUIDE_FILE, 'utf-8'))
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedMarkup = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match?.[1] ?? ''
  }
  const attributedText = (tag, attribute, key) =>
    stripTags(attributedMarkup(tag, attribute, key)).replace(/\s+/g, ' ').trim()
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }
  const money = value => `$${value.toLocaleString('en-US')}`
  const product = (firmSlug, productSlug) =>
    loadChallenges(firmSlug)?.find(challenge => challenge.productSlug === productSlug)
  const tier = (challenge, sizeUsd) =>
    challenge?.accountSizes.find(account => account.sizeUsd === sizeUsd)

  if (data.title !== 'What Is Overtrading? 7 Signs and a Stop System (2026)') {
    rows.push('title must preserve definition, signs, control system, and current year')
  }
  if (data.seoTitle !== 'What Is Overtrading? Signs and How to Stop (2026)') {
    rows.push('seoTitle must preserve the direct definition and prevention intent')
  }
  if (typeof data.seoTitle !== 'string' || data.seoTitle.length > 60) {
    rows.push('seoTitle must stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (
    !Array.isArray(data.tags) ||
    !data.tags.includes('overtrading') ||
    !data.tags.includes('risk management')
  ) {
    rows.push('tags must preserve overtrading and risk-management search intent')
  }

  expectFragments('overtrading definition', stripTags(content), [
    'Overtrading is taking trades that exceed a tested trading plan',
    'It is not defined by one universal number of orders',
    'A 20-trade systematic strategy can remain on plan',
    'actual decisions versus pre-session rules',
  ])
  expectFragments(
    'planned-frequency distinction',
    attributedText('table', 'data-overtrading-distinction', 'plan-vs-drift'),
    ['Entry', 'Risk', 'Timing', 'Costs', 'Stop', 'Planned frequency', 'Overtrading drift'],
  )

  const fundedNext = product('fundednext', 'stellar-2-step')
  const ftmo = product('ftmo', 'ftmo-challenge-1-step')
  const fxify = product('fxify', 'lightning-challenge')
  const fundedNextTier = tier(fundedNext, 100000)
  const ftmoTier = tier(ftmo, 100000)
  const fxifyTier = tier(fxify, 100000)

  const requiredProducts = [
    ['FundedNext Stellar 2-Step $100K', fundedNext, fundedNextTier],
    ['FTMO 1-Step $100K', ftmo, ftmoTier],
    ['FXIFY Lightning $100K', fxify, fxifyTier],
  ]
  for (const [label, challenge, accountTier] of requiredProducts) {
    if (!challenge || !accountTier) rows.push(`${label} structured product or tier is missing`)
  }

  if (fundedNext && fundedNextTier) {
    expectFragments(
      'FundedNext overtrading-rule row',
      attributedText('tr', 'data-overtrading-rule', 'fundednext:stellar-2-step'),
      [
        'FundedNext Stellar 2-Step $100K',
        money(fundedNextTier.priceUsd),
        `${fundedNext.dailyLossPct}% daily loss`,
        `${fundedNext.maxLossPct}% ${fundedNext.drawdownType} maximum loss`,
        `${fundedNext.minTradingDays} minimum trading days`,
        'no maximum-day number recorded',
        fundedNext.sourceCapturedAt,
      ],
    )
    if (fundedNext.maxTradingDays !== null || fundedNext.drawdownType !== 'static') {
      rows.push('FundedNext example lost its null maximum-day or static-drawdown caveat')
    }
  }

  if (ftmo && ftmoTier) {
    expectFragments(
      'FTMO overtrading-rule row',
      attributedText('tr', 'data-overtrading-rule', 'ftmo:ftmo-challenge-1-step'),
      [
        'FTMO 1-Step $100K',
        `€${ftmoTier.priceEur}`,
        `${ftmo.dailyLossPct}% daily loss`,
        `${ftmo.maxLossPct}% balance-based end-of-day trailing maximum loss`,
        `${ftmo.consistencyRulePct}% Best Day rule`,
        ftmo.sourceCapturedAt,
      ],
    )
    if (ftmo.drawdownType !== 'eod-trailing' || ftmo.consistencyRulePct !== 50) {
      rows.push('FTMO 1-Step example lost its EOD-trailing or Best Day support')
    }
  }

  if (fxify && fxifyTier) {
    expectFragments(
      'FXIFY Lightning overtrading-rule row',
      attributedText('tr', 'data-overtrading-rule', 'fxify:lightning-challenge'),
      [
        'FXIFY Lightning $100K',
        money(fxifyTier.priceUsd),
        `${fxify.dailyLossPct}% daily loss`,
        `${fxify.maxLossPct}% ${fxify.drawdownType} maximum loss`,
        `${fxify.consistencyRulePct}% consistency`,
        `${fxify.minTradingDays} minimum and ${fxify.maxTradingDays} maximum trading days`,
        'mandatory stop loss',
        fxify.sourceCapturedAt,
      ],
    )
    if (
      fxify.drawdownType !== 'trailing' ||
      fxify.maxTradingDays !== 5 ||
      fxify.consistencyRulePct !== 30 ||
      !fxify.notes.some(note => note.includes('Mandatory stop loss'))
    ) {
      rows.push('FXIFY Lightning pressure example drifted from structured support')
    }
  }

  const captureEvidence = (file, productSlug) => {
    const capture = JSON.parse(fs.readFileSync(file, 'utf-8'))
    const capturedProduct = capture.products?.find(
      candidate => candidate.productSlug === productSlug,
    )
    if (!capturedProduct) return ''
    return [
      ...capturedProduct.accountSizes.flatMap(account =>
        Object.values(account).filter(value => typeof value === 'string'),
      ),
      ...Object.values(capturedProduct.fieldEvidence ?? {}).filter(
        value => typeof value === 'string',
      ),
      ...(capturedProduct.notes ?? []),
    ].join(' ')
  }
  const fundedNextCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/fundednext-2026-07-27.json'),
    'stellar-2-step',
  )
  const ftmoCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/ftmo-2026-07-27.json'),
    'ftmo-challenge-1-step',
  )
  const fxifyCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/fxify-2026-08-10.json'),
    'lightning-challenge',
  )
  for (const fragment of [
    "'$100k Get Plan Fee: $549.99'",
    'Stellar 2-Step permits 5% of initial balance per day',
    'Stellar 2-Step maximum loss is 10% of initial balance',
    'require 5 trading days in each phase',
  ]) {
    if (!fundedNextCapture.includes(fragment)) {
      rows.push(`FundedNext raw capture is missing overtrading support: "${fragment}"`)
    }
  }
  for (const fragment of [
    '"price":"499"',
    'Maximum Daily Loss is set as 3% from the initial balance',
    'balance-based end-of-day trailing limit',
    '"Best Day Rule" = 50%',
  ]) {
    if (!ftmoCapture.includes(fragment)) {
      rows.push(`FTMO raw capture is missing overtrading support: "${fragment}"`)
    }
  }
  for (const fragment of [
    '"title":"$100K" ... "price":"$399"',
    '"Max Trailing Drawdown": ["4%", "4%"]',
    '"Daily Loss Limit": ["3%", "3%"]',
    '"Minimum Trading Days" = "3 days"',
    '"Maximum Trading Days" = "5 days"',
    '"Consistency Rule" = "30%"',
    'Mandatory SL on every trade',
  ]) {
    if (!fxifyCapture.includes(fragment)) {
      rows.push(`FXIFY raw capture is missing overtrading support: "${fragment}"`)
    }
  }

  const accountSize = 100000
  const riskPct = 0.25
  const plannedAttempts = 3
  const actualAttempts = 6
  const lossPerAttempt = accountSize * (riskPct / 100)
  const plannedLoss = plannedAttempts * lossPerAttempt
  const actualLoss = actualAttempts * lossPerAttempt
  const unplannedLoss = actualLoss - plannedLoss
  expectFragments(
    'overtrading session-drift math',
    attributedText('table', 'data-overtrading-math', 'session-drift'),
    [
      money(accountSize),
      `${money(accountSize)} × ${riskPct}% = ${money(lossPerAttempt)}`,
      `${plannedAttempts} attempts × ${money(lossPerAttempt)} = ${money(plannedLoss)}`,
      `${actualAttempts} attempts × ${money(lossPerAttempt)} = ${money(actualLoss)}`,
      `${money(actualLoss)} − ${money(plannedLoss)} = ${money(unplannedLoss)}`,
      'planned session risk doubled',
    ],
  )
  if (fundedNext && fundedNextTier) {
    const firmDailyAmount =
      fundedNextTier.sizeUsd * (fundedNext.dailyLossPct / 100)
    expectFragments('firm-versus-personal limit explanation', stripTags(content), [
      `captured ${fundedNext.dailyLossPct}% daily amount is ${money(firmDailyAmount)}`,
      `${money(actualLoss)} session can remain inside that firm boundary`,
      `breaching the hypothetical ${money(plannedLoss)} personal plan by ${money(unplannedLoss)}`,
    ])
  }

  expectFragments(
    'twenty-session audit',
    attributedText('table', 'data-overtrading-audit', 'twenty-session'),
    [
      'Off-plan entry rate',
      'Off-plan entries ÷ all entries × 100',
      'Risk-escalation rate',
      'Entries above planned size ÷ all entries × 100',
      'Post-stop violations',
      'Trade-order expectancy',
      'Average net result for trades 1, 2, 3, and 4+',
      'Turnover cost',
    ],
  )

  const choiceMarkup = attributedMarkup('div', 'data-overtrading-choice', 'fundednext')
  const choiceText = stripTags(choiceMarkup).replace(/\s+/g, ' ').trim()
  if (fundedNext && fundedNextTier && fxify) {
    expectFragments('FundedNext overtrading choice', choiceText, [
      'Comparing the deadline field?',
      `current $100K tier is ${money(fundedNextTier.priceUsd)}`,
      `${fundedNext.dailyLossPct}% daily loss`,
      `${fundedNext.maxLossPct}% ${fundedNext.drawdownType} maximum loss`,
      `${fundedNext.minTradingDays} minimum trading days`,
      'no verified maximum-day number',
      'do not treat that null as proof of no deadline',
      `FXIFY Lightning explicitly records a ${fxify.maxTradingDays}-day maximum`,
      'confirm the live schedule before buying',
    ])
  }
  for (const href of ['/blog/fundednext-review', '/go/fundednext']) {
    if (!choiceMarkup.includes(`href="${href}"`)) {
      rows.push(`FundedNext overtrading choice is missing ${href}`)
    }
  }

  const requiredLinks = [
    '/blog/what-is-copy-trading',
    '/blog/fundednext-review',
    '/blog/ftmo-review',
    '/blog/fxify-review',
    '/prop-firm-challenges',
    '/how-to-pass-a-prop-firm-challenge',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
    '/true-cost-of-prop-firm-challenges',
    '/go/fundednext',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [CHALLENGE_PASSING_PAGE_FILE, 'challenge-passing pillar'],
    [COPY_TRADING_GUIDE_FILE, 'copy-trading guide'],
    [path.join(POSTS, 'what-is-prop-firm-consistency-rule.md'), 'consistency guide'],
    [path.join(POSTS, 'is-prop-firm-trading-profitable.md'), 'profitability guide'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/what-is-overtrading')) {
      rows.push(`${label} is missing an overtrading-guide backlink`)
    }
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-what-is-overtrading"',
    ) ||
    !renderedContent.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('rendered FundedNext CTA lacks controlled attribution or disclosure')
  }

  const faqSection = content.split('<h2>Frequently asked questions</h2>')[1] ?? ''
  if ((faqSection.match(/<h3>/gi) ?? []).length !== 6) {
    rows.push('overtrading guide must preserve 6 factual FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('overtrading guide contains a bare external link')
  }

  const staleClaims = [
    'What Is Overtrading and How to Stop it?',
    'just can\'t stop trading',
    'fastest ways to blow',
    'extremely catastrophic',
    'Trust me, I’ve been there',
    'my $100K funded account',
    'want and eagerly wait for you to breach',
    'full-blown tilt mode',
    'Get a life',
    '2, 3, or max 4 trades',
    'Demo when emotional',
    'scratch the itch without wrecking',
    'one solid trade a day is enough',
    'the market always punishes',
    'Take this seriously, or take the loss',
    'crypoptionhub.com',
    'avoids the captured 5-day maximum',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale overtrading claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Overtrading guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Profitability copy must measure realised trader cash rather than dashboard
 * PnL or account-size headlines. Recompute every fee-recovery and scenario
 * value, preserve source denominators, and keep conditional refunds and null
 * base splits out of cash until their named requirements are satisfied.
 */
function checkProfitabilityGuide() {
  const rows = []
  if (!fs.existsSync(PROFITABILITY_GUIDE_FILE)) {
    console.log('\n✗ Prop-firm profitability guide')
    console.log('  · content/posts/is-prop-firm-trading-profitable.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(PROFITABILITY_GUIDE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedMarkup = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match?.[1] ?? ''
  }
  const attributedText = (tag, attribute, key) =>
    stripTags(attributedMarkup(tag, attribute, key)).replace(/\s+/g, ' ').trim()
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }
  const amount = value =>
    value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  const money = value => `$${amount(value)}`
  const roundCents = value => Math.round(value * 100) / 100
  const product = (firmSlug, productSlug) =>
    loadChallenges(firmSlug)?.find(challenge => challenge.productSlug === productSlug)
  const tier = (challenge, sizeUsd) =>
    challenge?.accountSizes.find(account => account.sizeUsd === sizeUsd)

  if (data.title !== 'Is Prop Firm Trading Profitable? The Net Cash Test (2026)') {
    rows.push('title must preserve profitability, net cash, and current-year intent')
  }
  if (data.seoTitle !== 'Is Prop Firm Trading Profitable? Net Cash Test (2026)') {
    rows.push('seoTitle must preserve the direct profitability intent')
  }
  if (typeof data.seoTitle !== 'string' || data.seoTitle.length > 60) {
    rows.push('seoTitle must stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (
    !Array.isArray(data.tags) ||
    !data.tags.includes('prop firm profitability') ||
    !data.tags.includes('funded trader payouts')
  ) {
    rows.push('tags must preserve profitability and payout search intent')
  }

  expectFragments('net-cash definition', stripTags(content), [
    'Prop-firm trading is profitable for a trader only when approved cash payouts and refunds exceed every challenge',
    'A positive simulated account balance is not cash income',
    'a $100K account label is not $100,000 the trader can withdraw',
    'net_cash_result = approved_payouts + refunds_received',
    '- challenge_fees - subscriptions - activations',
    '- resets - platform_add_ons - withdrawal_fees',
  ])
  expectFragments(
    'cash-versus-dashboard definition',
    attributedText('table', 'data-profitability-definition', 'cash-vs-dashboard'),
    [
      'Challenge or subscription payment',
      'Simulated account profit',
      'Do not count yet',
      'Approved payout received',
      'Conditional refund',
      'Inflow only when received',
    ],
  )

  const fundedNext = product('fundednext', 'stellar-2-step')
  const ftmo = product('ftmo', 'ftmo-challenge-2-step')
  const topstep = product('topstep', 'trading-combine-standard-path')
  const fxify = product('fxify', 'lightning-challenge')
  const fundedNextTier = tier(fundedNext, 100000)
  const ftmoTier = tier(ftmo, 100000)
  const topstepTier = tier(topstep, 100000)
  const fxifyTier = tier(fxify, 100000)

  const requiredProducts = [
    ['FundedNext Stellar 2-Step $100K', fundedNext, fundedNextTier],
    ['FTMO 2-Step $100K', ftmo, ftmoTier],
    ['Topstep Standard Path $100K', topstep, topstepTier],
    ['FXIFY Lightning $100K', fxify, fxifyTier],
  ]
  for (const [label, challenge, accountTier] of requiredProducts) {
    if (!challenge || !accountTier) rows.push(`${label} structured product or tier is missing`)
  }

  const computedExamples = [
    ['fundednext:stellar-2-step', 'FundedNext', fundedNext, fundedNextTier, '$'],
    ['ftmo:ftmo-challenge-2-step', 'FTMO', ftmo, ftmoTier, '€'],
    [
      'topstep:trading-combine-standard-path',
      'Topstep',
      topstep,
      topstepTier,
      '$',
    ],
  ]
  for (const [key, label, challenge, accountTier, symbol] of computedExamples) {
    if (!challenge || !accountTier) continue
    const economics = challengeTierEconomics(challenge, accountTier)
    if (!economics) {
      rows.push(`${label} fee-recovery economics unexpectedly became null`)
      continue
    }
    expectFragments(
      `${label} profitability-cost row`,
      attributedText('tr', 'data-profitability-cost', key),
      [
        `${symbol}${amount(economics.minimumCost)}`,
        `${challenge.profitSplitPct}%`,
        `${symbol}${amount(economics.breakEvenProfit)}`,
        challenge.sourceCapturedAt,
      ],
    )
  }

  if (fxify && fxifyTier) {
    const economics = challengeTierEconomics(fxify, fxifyTier)
    expectFragments(
      'FXIFY profitability-cost row',
      attributedText('tr', 'data-profitability-cost', 'fxify:lightning-challenge'),
      [
        'FXIFY Lightning $100K',
        money(fxifyTier.priceUsd),
        'Not verified',
        'Not calculable',
        '“Up to 90%” does not establish a base split',
        fxify.sourceCapturedAt,
      ],
    )
    if (fxify.profitSplitPct !== null || economics !== null) {
      rows.push('FXIFY must remain uncalculated while its verified base split is null')
    }
  }

  const captureEvidence = (file, productSlug) => {
    const capture = JSON.parse(fs.readFileSync(file, 'utf-8'))
    const capturedProduct = capture.products?.find(
      candidate => candidate.productSlug === productSlug,
    )
    if (!capturedProduct) return ''
    return [
      ...capturedProduct.accountSizes.flatMap(account =>
        Object.values(account).filter(value => typeof value === 'string'),
      ),
      ...Object.values(capturedProduct.fieldEvidence ?? {}).filter(
        value => typeof value === 'string',
      ),
      ...(capturedProduct.notes ?? []),
    ].join(' ')
  }
  const fundedNextCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/fundednext-2026-07-27.json'),
    'stellar-2-step',
  )
  const ftmoCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/ftmo-2026-07-27.json'),
    'ftmo-challenge-2-step',
  )
  const topstepCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/topstep-2026-07-27.json'),
    'trading-combine-standard-path',
  )
  const fxifyCapture = captureEvidence(
    path.join(CHALLENGES, '_captures/fxify-2026-08-10.json'),
    'lightning-challenge',
  )
  for (const fragment of [
    "'$100k Get Plan Fee: $549.99'",
    'current base Reward Share is 80%',
    'refundable with the first approved Performance Reward',
    'First standard payout eligibility is after 21 days',
    'non-refundable $25 cTrader or Match-Trader platform fee',
  ]) {
    if (!fundedNextCapture.includes(fragment)) {
      rows.push(`FundedNext capture is missing profitability support: "${fragment}"`)
    }
  }
  for (const fragment of [
    '"price":"540"',
    'receive 80% of the profit',
    'paid fee is refunded with your first Reward withdrawal',
  ]) {
    if (!ftmoCapture.includes(fragment)) {
      rows.push(`FTMO capture is missing profitability support: "${fragment}"`)
    }
  }
  for (const fragment of [
    'subscription fee rebills monthly until you pass the Trading Combine or cancel',
    'Express Funded Activation Fee: $149',
    'keep 90% of the profits',
  ]) {
    if (!topstepCapture.includes(fragment)) {
      rows.push(`Topstep capture is missing profitability support: "${fragment}"`)
    }
  }
  for (const fragment of [
    '"title":"$100K" ... "price":"$399"',
    'only "Performance Split" = "Up to 90%" given, no stated base split',
  ]) {
    if (!fxifyCapture.includes(fragment)) {
      rows.push(`FXIFY capture is missing profitability support: "${fragment}"`)
    }
  }

  if (fundedNext && fundedNextTier) {
    const attempts = 3
    const grossProfit = 2000
    const totalPaid = roundCents(fundedNextTier.priceUsd * attempts)
    const traderShare = roundCents(
      grossProfit * (fundedNext.profitSplitPct / 100),
    )
    const refund = fundedNextTier.priceUsd
    const cashReceived = roundCents(traderShare + refund)
    const netCash = roundCents(cashReceived - totalPaid)
    const ledger = attributedText(
      'table',
      'data-profitability-ledger',
      'fundednext-three-attempts',
    )
    expectFragments('FundedNext three-attempt ledger', ledger, [
      `${attempts} × ${money(fundedNextTier.priceUsd)} = ${money(totalPaid)}`,
      money(grossProfit),
      `${money(grossProfit)} × ${fundedNext.profitSplitPct}% = ${money(traderShare)}`,
      `1 × ${money(refund)} = ${money(refund)}`,
      `${money(traderShare)} + ${money(refund)} = ${money(cashReceived)}`,
      `${money(cashReceived)} − ${money(totalPaid)} = ${money(netCash)}`,
      'before excluded costs',
    ])
    expectFragments('FundedNext failure counterfactual', stripTags(content), [
      `If all ${attempts} attempts fail, the ledger is negative ${money(totalPaid)}`,
      'If the refund or payout is not approved, it cannot be booked as cash',
    ])
  }

  if (topstep && topstepTier) {
    const monthlyFee = topstepTier.priceUsd
    const activationFee = topstep.activationFeeUsd
    const recurring = attributedText(
      'table',
      'data-profitability-recurring',
      'topstep-standard-100k',
    )
    for (const months of [1, 2, 3]) {
      const subscriptionSpend = monthlyFee * months
      const cashCost = subscriptionSpend + activationFee
      const economics = computeTrueCost({
        priceUsd: cashCost,
        sizeUsd: topstepTier.sizeUsd,
        profitSplitPct: topstep.profitSplitPct,
        dailyLossPct: null,
        maxLossPct: null,
      })
      expectFragments(`Topstep ${months}-month economics`, recurring, [
        String(months),
        `${money(subscriptionSpend)} + ${money(activationFee)} = ${money(cashCost)}`,
        `${money(cashCost)} ÷ 0.90 = ${money(roundCents(economics.breakEvenProfit))}`,
      ])
    }
  }

  expectFragments(
    'Topstep 2025 outcome statistics',
    attributedText('table', 'data-profitability-stat', 'topstep-2025'),
    [
      'Trading Combines successfully completed',
      '16.8%',
      'All Trading Combines initiated',
      'Participants advancing at least once',
      '51.8%',
      'Individuals who entered 1 or more Combines',
      'Funded-level participants receiving a payout',
      '33.3%',
      'Individuals at the Funded Level',
      'XFA participants called to a Live Funded Account',
      '0.71%',
      'Individuals trading in an Express Funded Account',
    ],
  )
  for (const fragment of [
    '16.8% of all Trading Combines initiated',
    '51.8% of individual participants who entered one or more Trading Combines',
    '33.3% of all individual participants at the Funded Level received a payout',
    '0.71% of individual participants trading in an Express Funded Account',
  ]) {
    if (!topstepCapture.includes(fragment)) {
      rows.push(`Topstep capture is missing outcome-stat support: "${fragment}"`)
    }
  }
  expectFragments(
    'outcome-stat denominator caveat',
    stripTags(content).replace(/\s+/g, ' '),
    [
    'not a global prop-firm pass rate',
    'The 16.8% initiation rate and 51.8% participant rate are not contradictory',
    '1 ÷ 16.8% does not produce an honest “average attempts to pass”',
    ],
  )

  expectFragments(
    'pre-purchase profitability worksheet',
    attributedText('table', 'data-profitability-gate', 'pre-purchase'),
    [
      'Exact product and tier',
      'Maximum paid attempts',
      'Verified base split',
      'Rule-compatible sample',
      'Cash receipt gates',
      'Do not rely on cash before every gate can be met',
    ],
  )

  const choiceMarkup = attributedMarkup(
    'div',
    'data-profitability-choice',
    'fundednext',
  )
  const choiceText = stripTags(choiceMarkup).replace(/\s+/g, ' ').trim()
  if (fundedNext && fundedNextTier) {
    expectFragments('FundedNext profitability choice', choiceText, [
      'Testing FundedNext’s economics?',
      `current $100K list fee is ${money(fundedNextTier.priceUsd)}`,
      `start at an ${fundedNext.profitSplitPct}% split`,
      `first standard payout eligibility is recorded at ${fundedNext.payoutFirstDays} days`,
      '$500.02 result above is a hypothetical 3-attempt cash ledger',
      'not an earnings forecast',
      'maximum attempt budget still fit',
    ])
  }
  for (const href of ['/blog/fundednext-review', '/go/fundednext']) {
    if (!choiceMarkup.includes(`href="${href}"`)) {
      rows.push(`FundedNext profitability choice is missing ${href}`)
    }
  }

  const requiredLinks = [
    '/how-prop-firm-challenges-work',
    '/blog/fundednext-review',
    '/blog/ftmo-review',
    '/blog/topstep-review',
    '/blog/fxify-review',
    '/true-cost-of-prop-firm-challenges',
    '/blog/what-is-overtrading',
    '/blog/prop-firm-scaling-plan',
    '/blog/what-is-prop-firm-consistency-rule',
    '/prop-firm-challenges',
    '/prop-firm-challenge-changes',
    '/how-to-pass-a-prop-firm-challenge',
    '/blog/are-prop-firm-passing-services-worth-it',
    '/blog/ftmo-free-trial-explained',
    '/go/fundednext',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [TRUE_COST_PILLAR_FILE, 'true-cost pillar'],
    [CHALLENGE_LIFECYCLE_PAGE_FILE, 'challenge lifecycle pillar'],
    [WHAT_IS_PROP_FIRM_GUIDE_FILE, 'prop-firm definition guide'],
    [OVERTRADING_GUIDE_FILE, 'overtrading guide'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/is-prop-firm-trading-profitable')) {
      rows.push(`${label} is missing a profitability-guide backlink`)
    }
  }

  const lifecycle = fs.readFileSync(CHALLENGE_LIFECYCLE_PAGE_FILE, 'utf-8')
  if (
    !lifecycle.includes('structured maximum-day field is null') ||
    lifecycle.includes('$5,000 daily cap. No time limit')
  ) {
    rows.push('challenge lifecycle lost the FundedNext null maximum-day caveat')
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-is-prop-firm-trading-profitable"',
    ) ||
    !renderedContent.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('rendered FundedNext CTA lacks controlled attribution or disclosure')
  }

  const faqSection = content.split('<h2>Frequently asked questions</h2>')[1] ?? ''
  if ((faqSection.match(/<h3>/gi) ?? []).length !== 6) {
    rows.push('profitability guide must preserve 6 factual FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('profitability guide contains a bare external link')
  }

  const staleClaims = [
    'Sounds like free money',
    'there’s money to be made',
    'manage the hidden parts',
    'hidden costs',
    'many firms let you keep 80% to 90%',
    'make 5% in a month',
    '$4,000 to $4,500',
    'Most prop firms also refund',
    'somewhere around $500',
    'chances are prop firm trading is profitable for you',
    'far more profitable than trading your own small account',
    'Same account. Same rules.',
    'punish recklessness',
    'risk-free prop firm trading',
    'stick to the same percentage per trade',
    'investopedia.com',
    'Funding-Pips-100k-Challenge',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale profitability claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Prop-firm profitability guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Consistency-rule copy must distinguish the calculation stage, numerator,
 * denominator, threshold, consequence, and cutoff. Keep each current example
 * tied to its product record and raw capture, preserve the generic worked math,
 * and never turn a null structured percentage into a firm-wide claim.
 */
function checkConsistencyGuide() {
  const rows = []
  if (!fs.existsSync(CONSISTENCY_GUIDE_FILE)) {
    console.log('\nâœ— Consistency-rule guide')
    console.log('  Â· content/posts/what-is-prop-firm-consistency-rule.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(CONSISTENCY_GUIDE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedMarkup = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match?.[1] ?? ''
  }
  const attributedText = (tag, attribute, key) =>
    stripTags(attributedMarkup(tag, attribute, key)).replace(/\s+/g, ' ').trim()
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }
  const money = value => `$${value.toLocaleString('en-US')}`
  const product = (firmSlug, productSlug) =>
    loadChallenges(firmSlug)?.find(challenge => challenge.productSlug === productSlug)
  const tier = (challenge, sizeUsd) =>
    challenge?.accountSizes.find(account => account.sizeUsd === sizeUsd)
  const captureEvidence = (file, productSlug) => {
    const capture = JSON.parse(fs.readFileSync(file, 'utf-8'))
    const capturedProduct = capture.products?.find(
      candidate => candidate.productSlug === productSlug,
    )
    if (!capturedProduct) return ''
    return [
      ...capturedProduct.accountSizes.flatMap(account =>
        Object.values(account).filter(value => typeof value === 'string'),
      ),
      ...Object.values(capturedProduct.fieldEvidence ?? {}).filter(
        value => typeof value === 'string',
      ),
      ...(capturedProduct.notes ?? []),
    ].join(' ')
  }

  if (data.title !== 'Prop Firm Consistency Rule: Formulas and Examples (2026)') {
    rows.push('title must preserve consistency-rule, formula, examples, and current-year intent')
  }
  if (data.seoTitle !== 'Prop Firm Consistency Rule: Examples (2026)') {
    rows.push('seoTitle must preserve the primary search intent and current year')
  }
  if (typeof data.seoTitle !== 'string' || data.seoTitle.length > 60) {
    rows.push('seoTitle must stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (
    !Array.isArray(data.tags) ||
    !data.tags.includes('prop firm consistency rule') ||
    !data.tags.includes('risk management')
  ) {
    rows.push('tags must preserve consistency-rule and risk-management search intent')
  }

  expectFragments('consistency definition', stripTags(content), [
    'A prop-firm consistency rule measures whether too much of an account\'s result came from its best trading day',
    'The percentage alone is incomplete',
    'Positive Days\' Profit',
    'fixed Profit Target',
    'There is no safe firm-wide shortcut',
  ])
  expectFragments(
    'six-field consistency definition',
    attributedText('table', 'data-consistency-definition', 'six-fields'),
    [
      'Stage',
      'Numerator',
      'Denominator',
      'Threshold',
      'Consequence',
      'Cutoff and reset',
      'A best-day test is not a lot-size test',
    ],
  )

  const ftmoOneStep = product('ftmo', 'ftmo-challenge-1-step')
  const ftmoTwoStep = product('ftmo', 'ftmo-challenge-2-step')
  const topstep = product('topstep', 'trading-combine-standard-path')
  const fundingPipsZero = product('fundingpips', 'zero')
  const fxifyTwoPhase = product('fxify', 'two-phase-classic')
  const fundedNextInstant = product('fundednext', 'stellar-instant')
  const fundedNextInstantTier = tier(fundedNextInstant, 10000)
  const topstepTier = tier(topstep, 100000)

  for (const [label, challenge] of [
    ['FTMO 1-Step', ftmoOneStep],
    ['FTMO 2-Step', ftmoTwoStep],
    ['Topstep Standard Path', topstep],
    ['FundingPips Zero', fundingPipsZero],
    ['FXIFY Two Phase Classic', fxifyTwoPhase],
    ['FundedNext Stellar Instant', fundedNextInstant],
  ]) {
    if (!challenge) rows.push(`${label} structured product is missing`)
  }
  if (!fundedNextInstantTier) rows.push('FundedNext Stellar Instant $10K tier is missing')
  if (!topstepTier) rows.push('Topstep Standard Path $100K tier is missing')

  if (ftmoOneStep) {
    expectFragments(
      'FTMO 1-Step consistency row',
      attributedText('tr', 'data-consistency-example', 'ftmo:ftmo-challenge-1-step'),
      [
        'FTMO 1-Step',
        `${ftmoOneStep.consistencyRulePct}% Best Day rule`,
        'Challenge and reward',
        'Positive Days\' Profit',
        'Continue earning profit until no single day exceeds 50%',
        ftmoOneStep.sourceCapturedAt,
      ],
    )
    if (ftmoOneStep.consistencyRulePct !== 50) {
      rows.push('FTMO 1-Step Best Day percentage drifted from challenge data')
    }
  }

  if (topstep) {
    expectFragments(
      'Topstep Combine consistency row',
      attributedText(
        'tr',
        'data-consistency-example',
        'topstep:trading-combine-standard-path',
      ),
      [
        'Topstep Standard Path',
        `${topstep.consistencyRulePct}% Consistency Target`,
        'Trading Combine',
        'Profit Target',
        'increase the Consistency Target',
        topstep.sourceCapturedAt,
      ],
    )
    expectFragments(
      'Topstep XFA consistency row',
      attributedText('tr', 'data-consistency-example', 'topstep:xfa-consistency-path'),
      [
        '40% best-day limit',
        'Payout path',
        'total profit',
        'at least 3 trading days with 1 trade per day',
        topstep.sourceCapturedAt,
      ],
    )
  }

  if (fundingPipsZero) {
    expectFragments(
      'FundingPips Zero consistency row',
      attributedText('tr', 'data-consistency-example', 'fundingpips:zero'),
      [
        'FundingPips Zero',
        `${fundingPipsZero.consistencyRulePct}% maximum Consistency Score`,
        'Reward eligibility',
        'full denominator not recorded',
        '7 profitable days of at least 0.25% in each rolling 30-day period',
        fundingPipsZero.sourceCapturedAt,
      ],
    )
  }

  if (fxifyTwoPhase) {
    expectFragments(
      'FXIFY Two Phase consistency row',
      attributedText('tr', 'data-consistency-example', 'fxify:two-phase-classic'),
      [
        'FXIFY Two Phase Classic',
        `${fxifyTwoPhase.consistencyRulePct}% Consistency Rule`,
        'Funded stage only',
        'N/A in Phase 1 and Phase 2',
        'Full denominator is not recorded',
        fxifyTwoPhase.sourceCapturedAt,
      ],
    )
  }

  if (fundedNextInstant) {
    expectFragments(
      'FundedNext Instant consistency row',
      attributedText('tr', 'data-consistency-example', 'fundednext:stellar-instant'),
      [
        'FundedNext Stellar Instant',
        'No consistency rule in the captured official FAQ',
        'Phase-0 simulated instant-funded product',
        `${fundedNextInstant.maxLossPct}% ${fundedNextInstant.drawdownType} maximum loss`,
        fundedNextInstant.sourceCapturedAt,
      ],
    )
    if (fundedNextInstant.consistencyRulePct !== null) {
      rows.push('FundedNext Instant consistency field is no longer null')
    }
  }
  if (ftmoTwoStep?.consistencyRulePct !== null) {
    rows.push('FTMO 2-Step consistency field is no longer null')
  }

  const captureChecks = [
    [
      captureEvidence(
        path.join(CHALLENGES, '_captures/ftmo-2026-07-27.json'),
        'ftmo-challenge-1-step',
      ),
      [
        '"Best Day Rule" = 50%',
        'Positive Days\' Profit',
        'Applies to both the challenge and to reward withdrawal',
      ],
      'FTMO 1-Step',
    ],
    [
      captureEvidence(
        path.join(CHALLENGES, '_captures/ftmo-2026-07-27.json'),
        'ftmo-challenge-2-step',
      ),
      ['Explicitly NOT applied to this product'],
      'FTMO 2-Step',
    ],
    [
      captureEvidence(
        path.join(CHALLENGES, '_captures/topstep-2026-07-27.json'),
        'trading-combine-standard-path',
      ),
      [
        'best single day should stay below 50% of your Profit Target',
        'Keep your best day within 40% of total profit',
        'Trade at least three (3) days with at least one (1) trade per day',
      ],
      'Topstep',
    ],
    [
      captureEvidence(
        path.join(CHALLENGES, '_captures/fundingpips-2026-08-10.json'),
        'zero',
      ),
      [
        'Consistency Score 15% max',
        'At least 7 profitable days of 0.25% or more',
      ],
      'FundingPips Zero',
    ],
    [
      captureEvidence(
        path.join(CHALLENGES, '_captures/fxify-2026-08-10.json'),
        'two-phase-classic',
      ),
      ['"Consistency Rule": ["N/A", "N/A", "25%"]', 'Funded stage only'],
      'FXIFY Two Phase Classic',
    ],
    [
      captureEvidence(
        path.join(CHALLENGES, '_captures/fundednext-2026-07-27.json'),
        'stellar-instant',
      ),
      ['Official FAQ: no consistency rule'],
      'FundedNext Stellar Instant',
    ],
  ]
  for (const [evidence, fragments, label] of captureChecks) {
    for (const fragment of fragments) {
      if (!evidence.includes(fragment)) {
        rows.push(`${label} raw capture is missing consistency support: "${fragment}"`)
      }
    }
  }

  const bestDay = 1200
  const currentProfit = 3000
  const limitPct = 30
  const currentScore = (bestDay / currentProfit) * 100
  const requiredProfit = bestDay / (limitPct / 100)
  const additionalProfit = requiredProfit - currentProfit
  expectFragments(
    'best-day consistency math',
    attributedText('table', 'data-consistency-math', 'best-day-share'),
    [
      `${money(bestDay)} / ${money(currentProfit)} x 100 = ${currentScore}%`,
      `${limitPct}%`,
      `${money(bestDay)} / 0.${limitPct} = ${money(requiredProfit)}`,
      `${money(requiredProfit)} - ${money(currentProfit)} = ${money(additionalProfit)}`,
    ],
  )

  if (topstep && topstepTier) {
    const target = topstepTier.sizeUsd * (topstep.profitTargets.phase1 / 100)
    const limitAmount = target * (topstep.consistencyRulePct / 100)
    expectFragments('Topstep target-based example', stripTags(content), [
      'captured $100K Standard Path',
      `Profit Target is ${money(target)}`,
      `${topstep.consistencyRulePct}% is ${money(limitAmount)}`,
      'A $3,500 best day is 58.33% of that fixed target',
      'can increase the Consistency Target',
    ])
  }

  expectFragments(
    'consistency rule sheet',
    attributedText('table', 'data-consistency-checklist', 'rule-sheet'),
    [
      'Before checkout',
      'Before session',
      'After session',
      'Before payout',
      'Exact product, stage, numerator, denominator, percentage, consequence, and source date',
      'Use the firm\'s timezone and dashboard cutoff',
      'Treat every named gate as independent until approved',
    ],
  )

  const choiceMarkup = attributedMarkup('div', 'data-consistency-choice', 'fundednext')
  const choiceText = stripTags(choiceMarkup).replace(/\s+/g, ' ').trim()
  if (fundedNextInstant && fundedNextInstantTier) {
    expectFragments('FundedNext consistency choice', choiceText, [
      'Comparing a captured no-consistency-rule option?',
      'official FAQ capture says there is no consistency rule',
      `current $10K tier costs ${money(fundedNextInstantTier.priceUsd)}`,
      `starts at a ${fundedNextInstant.profitSplitPct}% Reward Share`,
      'is non-refundable',
      `uses a ${fundedNextInstant.maxLossPct}% ${fundedNextInstant.drawdownType} maximum loss`,
      'removing 1 gate does not make the product low-risk',
    ])
    if (fundedNextInstantTier.refundable !== false) {
      rows.push('FundedNext Instant CTA lost its non-refundable support')
    }
  }
  for (const href of ['/blog/fundednext-review', '/go/fundednext']) {
    if (!choiceMarkup.includes(`href="${href}"`)) {
      rows.push(`FundedNext consistency choice is missing ${href}`)
    }
  }

  const requiredLinks = [
    '/blog/ftmo-review',
    '/blog/topstep-review',
    '/blog/fundingpips-zero',
    '/blog/fxify-review',
    '/blog/fundednext-review',
    '/prop-firm-challenges',
    '/prop-firm-challenge-changes',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
    '/blog/what-is-overtrading',
    '/blog/is-prop-firm-trading-profitable',
    '/how-to-pass-a-prop-firm-challenge',
    '/how-prop-firm-challenges-work',
    '/go/fundednext',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [CHALLENGE_LIFECYCLE_PAGE_FILE, 'challenge lifecycle pillar'],
    [CHALLENGE_PASSING_PAGE_FILE, 'challenge-passing pillar'],
    [TRUE_COST_PILLAR_FILE, 'true-cost pillar'],
    [WHAT_IS_PROP_FIRM_GUIDE_FILE, 'prop-firm definition guide'],
    [OVERTRADING_GUIDE_FILE, 'overtrading guide'],
    [PROFITABILITY_GUIDE_FILE, 'profitability guide'],
    [path.join(POSTS, 'fundednext-review.md'), 'FundedNext review'],
    [path.join(POSTS, 'fundingpips-zero.md'), 'FundingPips Zero guide'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/what-is-prop-firm-consistency-rule')) {
      rows.push(`${label} is missing a consistency-guide backlink`)
    }
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-what-is-prop-firm-consistency-rule"',
    ) ||
    !renderedContent.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('rendered FundedNext CTA lacks controlled attribution or disclosure')
  }

  const faqSection = content.split('<h2>Frequently asked questions</h2>')[1] ?? ''
  if ((faqSection.match(/<h3>/gi) ?? []).length !== 6) {
    rows.push('consistency guide must preserve 6 factual FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('consistency guide contains a bare external link')
  }

  const staleClaims = [
    'one of the fundamental rules you\'ll find in most prop firms',
    'sole revenue source for most prop firms',
    'failed challenge fees',
    'obstacle that separates gamblers from true traders',
    'if you really are a consistently profitable trader, you have nothing to worry about',
    'Makarios Consistency Rule Calculator',
    'Funded Wizard Consistency Calculator',
    'Fast Track Trading Consistency Calculator',
    'PropScholar Consistency Rule Check',
    'The Most Comprehensive FTMO Review in 2025',
    'strongly recommend',
    'game-changer',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale consistency claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— Consistency-rule guide')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Retired overview pages must stay consolidated into their canonical reviews. */
function checkLegacyOverviewConsolidation() {
  const rows = []
  const config = fs.existsSync(NEXT_CONFIG_FILE)
    ? fs.readFileSync(NEXT_CONFIG_FILE, 'utf-8')
    : ''
  const rootSlugPage = fs.existsSync(ROOT_SLUG_PAGE_FILE)
    ? fs.readFileSync(ROOT_SLUG_PAGE_FILE, 'utf-8')
    : ''
  const sitemap = fs.existsSync(SITEMAP_FILE)
    ? fs.readFileSync(SITEMAP_FILE, 'utf-8')
    : ''
  const redirects = new Map([
    ['ftmo-overview', '/blog/ftmo-review'],
    ['fundednext-overview', '/blog/fundednext-review'],
    ['fundingpips-overview', '/blog/funding-pips-review'],
    ['e8-markets-overview', '/blog/e8-markets-review'],
  ])

  if (!rootSlugPage.includes('!LEGACY_OVERVIEW_SLUGS.has(p.slug)')) {
    rows.push('dynamic root-page generation no longer excludes legacy overview slugs')
  }
  if (!sitemap.includes('!SKIP.has(p.slug)')) {
    rows.push('sitemap no longer filters its legacy-page skip set')
  }

  for (const [slug, destination] of redirects) {
    const redirectPattern = new RegExp(
      `source:\\s*['\"]/${slug}['\"]\\s*,\\s*destination:\\s*['\"]${destination}['\"]\\s*,\\s*permanent:\\s*true`,
    )
    if (!redirectPattern.test(config)) {
      rows.push(`/${slug} is missing its permanent redirect to ${destination}`)
    }
    if (!rootSlugPage.includes(`'${slug}'`)) {
      rows.push(`${slug} is missing from LEGACY_OVERVIEW_SLUGS`)
    }
    if (!sitemap.includes(`'${slug}'`)) {
      rows.push(`${slug} is missing from the sitemap skip set`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Legacy overview consolidation')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep the UK shortlist policy-backed, product-current, and separate from FCA status. */
function checkUkLandingCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const expectedSlugs = [
    'ftmo',
    'fundednext',
    'fundingpips',
    'fxify',
    'alpha-capital',
    'city-traders-imperium',
    'bright-funded',
    'e8-markets',
  ]
  let capture
  try {
    capture = JSON.parse(read(UK_ACCESS_EVIDENCE_FILE))
  } catch (error) {
    rows.push(`UK access evidence is invalid JSON (${error.message})`)
    capture = { firms: [] }
  }

  const entries = Array.isArray(capture.firms) ? capture.firms : []
  const capturedSlugs = entries.map(entry => entry.firmSlug)
  if (
    entries.length !== expectedSlugs.length
    || new Set(capturedSlugs).size !== expectedSlugs.length
    || JSON.stringify([...capturedSlugs].sort()) !== JSON.stringify([...expectedSlugs].sort())
  ) {
    rows.push(`UK evidence must contain exactly ${expectedSlugs.join(', ')}`)
  }
  if (!String(capture.methodology ?? '').includes('not a completed UK checkout')) {
    rows.push('UK evidence methodology must state the checkout and regulatory boundary')
  }

  const firms = JSON.parse(read(path.join(ROOT, 'content/data/firms.json')) || '[]')
  const firmsBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const mappedProducts = new Set()
  const isFreshDate = value => {
    const captured = new Date(`${value}T00:00:00Z`)
    const ageDays = Math.floor((TODAY - captured) / 86_400_000)
    return !Number.isNaN(captured.getTime()) && ageDays >= 0 && ageDays <= STALE_DAYS
  }

  for (const entry of entries) {
    const label = `UK evidence ${entry.firmSlug || '(missing slug)'}`
    const firm = firmsBySlug.get(entry.firmSlug)
    if (!firm) {
      rows.push(`${label}: no matching firms.json record`)
      continue
    }
    if (entry.firmName !== firm.name) rows.push(`${label}: firmName does not match firms.json`)
    if (entry.accessStatus !== 'policy-supported') {
      rows.push(`${label}: accessStatus must be policy-supported`)
    }
    for (const field of ['evidenceLabel', 'evidenceSummary', 'decisionNote']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        rows.push(`${label}: ${field} is required`)
      }
    }
    if (!isFreshDate(entry.sourceCapturedAt)) {
      rows.push(`${label}: access source is outside the ${STALE_DAYS}-day freshness window`)
    }
    try {
      const source = new URL(entry.sourceUrl)
      const official = new URL(firm.officialUrl)
      const sourceHost = source.hostname.toLowerCase().replace(/^www\./, '')
      const officialHost = official.hostname.toLowerCase().replace(/^www\./, '')
      if (
        source.protocol !== 'https:'
        || (sourceHost !== officialHost && !sourceHost.endsWith(`.${officialHost}`))
      ) {
        rows.push(`${label}: sourceUrl is not on the firm's first-party HTTPS host`)
      }
    } catch {
      rows.push(`${label}: sourceUrl is invalid`)
    }
    if ((firm.countriesRestricted ?? []).some(country =>
      /^(uk|united kingdom|great britain)$/i.test(country.trim()))) {
      rows.push(`${label}: firms.json contradicts the UK access policy`)
    }

    const challenges = JSON.parse(
      read(path.join(CHALLENGES, `${entry.firmSlug}.json`)) || '[]',
    )
    const challengeSlugs = challenges.map(product => product.productSlug).sort()
    const productSlugs = Array.isArray(entry.productSlugs)
      ? [...entry.productSlugs].sort()
      : []
    if (new Set(productSlugs).size !== productSlugs.length) {
      rows.push(`${label}: productSlugs contain a duplicate`)
    }
    if (JSON.stringify(productSlugs) !== JSON.stringify(challengeSlugs)) {
      rows.push(`${label}: productSlugs must match every current structured product exactly`)
    }
    for (const product of challenges) {
      const composite = `${entry.firmSlug}:${product.productSlug}`
      mappedProducts.add(composite)
      if (!isFreshDate(product.sourceCapturedAt)) {
        rows.push(`${label}: ${product.productSlug} is outside the freshness window`)
      }
    }
  }

  if (entries.length !== 8 || mappedProducts.size !== 34) {
    rows.push(
      `UK fixture expects 8 firms and 34 mapped products; received ${entries.length} and ${mappedProducts.size}`,
    )
  }

  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'best-prop-firms-in-uk'([\s\S]*?)slug:\s*'best-prop-firms-in-us'/,
  )?.[1] ?? ''
  if (!block) {
    rows.push('best-prop-firms-in-uk landing config is missing')
  } else {
    for (const fragment of [
      "import rawUkAccessEvidence from '@/content/data/uk-access-evidence.json'",
      'const UK_ACCESS_EVIDENCE_BY_SLUG = new Map',
      'function freshMappedProducts(firmSlugValue: string, productSlugs: string[])',
      'return products.length === productSlugs.length ? products : []',
      'function ukProductsForEvidence(evidence: UkAccessEvidence): Challenge[]',
      'isAccessEvidenceFresh(evidence.sourceCapturedAt)',
      'const CURRENT_UK_FIRM_COUNT = CURRENT_UK_SNAPSHOT.length',
      'const CURRENT_UK_PRODUCT_COUNT = CURRENT_UK_SNAPSHOT.reduce',
      'UK_ACCESS_EVIDENCE_BY_SLUG.get(slug)',
      'entry from ${minimumPublishedEntry(products)}',
      "trailingMetricLabel: 'UK access'",
      "trailingMetricValue: 'Policy'",
      'url: evidence.sourceUrl',
      'capturedAt: evidence.sourceCapturedAt',
      'affiliate status, coupon size, headquarters, company registration, maximum split, and payout method add 0 points',
      'Does UK access mean the firm is FCA-authorised?',
      'What should match before checkout and KYC?',
      'How should USD and EUR fees be compared in GBP?',
      'Does the policy cover every product and platform forever?',
      "lastReviewed: '2026-08-17'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`UK landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      'countriesRestricted',
      'payoutMethods',
      'firm.profitSplitPct',
      'settles reliably from the UK',
      'Every firm below accepts UK-based traders',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`UK landing restored aggregate or unsupported logic: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('UK landing must keep exactly 4 decision-guide questions')
    }
  }

  const expectedTitle = 'Best Prop Firms for UK Traders (2026): 8 Checked'
  const expectedDescription =
    'Compare 8 prop firms with current first-party UK-access policies across 34 product paths, plus FCA checks, fees, rules, reviews, and dated sources.'
  if (expectedTitle.length > 54) rows.push('UK meta title leaves no room for the root suffix')
  if (expectedDescription.length < 120 || expectedDescription.length > 160) {
    rows.push('UK meta description must be between 120 and 160 characters')
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isUk = landing.slug === 'best-prop-firms-in-uk'",
    'What UK traders should verify',
    'Four policy, FCA, currency and product checks before paying.',
    'Policy-supported UK access is not an FCA status.',
    'https://www.fca.org.uk/consumers/fca-firm-checker',
    'https://www.fca.org.uk/consumers/warning-list-unauthorised-firms',
    '8 policy-checked firms across 34 mapped products',
    "href: '/prop-firm-challenges'",
    "href: '/compare/ftmo-vs-fundednext'",
    "href: '/blog/fundednext-review'",
    "href: '/cheapest-prop-firms'",
    'Choose the product, then verify the UK route',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`UK landing component is missing "${fragment}"`)
    }
  }

  for (const file of [
    'ftmo-review.md',
    'fundednext-review.md',
    'funding-pips-review.md',
    'fxify-review.md',
    'alpha-capital-review.md',
  ]) {
    if (!read(path.join(POSTS, file)).includes('href="/best-prop-firms-in-uk"')) {
      rows.push(`${file}: missing contextual UK-ranking backlink`)
    }
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const ukLandingPath = '/best-prop-firms-in-uk'",
    'ukAccessEvidence.firms.flatMap',
    'expectedUkProductCount',
    'Policy-supported UK access is not an FCA status.',
    'href="/go/fundednext?from=best-prop-firms-in-uk"',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing UK-ranking safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ UK ranking, access evidence and FCA boundary')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The U.S. landing replaces an overlapping legacy article and makes a
 * narrower claim: current first-party access evidence, not legal approval.
 * Keep the evidence set small, fresh, source-linked, and reachable from each
 * ranked review so the consolidation cannot silently regress into a
 * restriction-list guess or two competing indexable URLs.
 */
function checkUsLandingConsolidation() {
  const rows = []
  const expected = new Map([
    ['fundednext', {
      name: 'FundedNext', host: 'help.fundednext.com', status: 'explicit',
      products: ['stellar-2-step', 'stellar-1-step', 'stellar-lite', 'stellar-instant'],
    }],
    ['tradeify', {
      name: 'Tradeify', host: 'help.tradeify.co', status: 'explicit',
      products: ['growth-evaluation', 'select-flex', 'select-daily', 'lightning-funded'],
    }],
    ['topstep', {
      name: 'Topstep', host: 'help.topstep.com', status: 'policy-supported',
      products: ['trading-combine-standard-path', 'trading-combine-no-activation-fee-path'],
    }],
    ['apex-trader-funding', {
      name: 'Apex Trader Funding', host: 'apextraderfunding.com', status: 'explicit',
      products: [
        'intraday-trail-standard',
        'eod-trail-standard',
        'intraday-trail-no-activation-fee',
        'eod-trail-no-activation-fee',
      ],
    }],
  ])
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const slugify = name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  let capture = null
  if (!fs.existsSync(US_ACCESS_EVIDENCE_FILE)) {
    rows.push('content/data/us-access-evidence.json is missing')
  } else {
    try {
      capture = JSON.parse(read(US_ACCESS_EVIDENCE_FILE))
    } catch (error) {
      rows.push(`U.S. access evidence is invalid JSON (${error.message})`)
    }
  }

  const entries = Array.isArray(capture?.firms) ? capture.firms : []
  const capturedSlugs = entries.map(entry => entry.firmSlug)
  const expectedSlugs = [...expected.keys()].sort()
  if (
    entries.length !== expected.size
    || new Set(capturedSlugs).size !== expected.size
    || JSON.stringify([...capturedSlugs].sort()) !== JSON.stringify(expectedSlugs)
  ) {
    rows.push(`U.S. evidence must contain exactly ${expectedSlugs.join(', ')}`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(capture?.capturedAt ?? '')) {
    rows.push('U.S. evidence root capturedAt must be an ISO date')
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const firmsBySlug = new Map(firms.map(firm => [slugify(firm.name), firm]))
  for (const [slug, spec] of expected) {
    const matches = entries.filter(entry => entry.firmSlug === slug)
    if (matches.length !== 1) {
      rows.push(`${slug}: expected exactly 1 access-evidence record`)
      continue
    }
    const entry = matches[0]
    if (entry.firmName !== spec.name) {
      rows.push(`${slug}: firmName must be ${spec.name}`)
    }
    if (entry.accessStatus !== spec.status) {
      rows.push(`${slug}: accessStatus must be ${spec.status}`)
    }
    if (!['cfd', 'futures'].includes(entry.assetClass)) {
      rows.push(`${slug}: assetClass must be cfd or futures`)
    }
    if (JSON.stringify(entry.productSlugs) !== JSON.stringify(spec.products)) {
      rows.push(`${slug}: productSlugs must map the ${spec.products.length} verified products exactly`)
    }
    if (!entry.platformConstraint || !entry.evidenceLabel || !entry.decisionNote) {
      rows.push(`${slug}: platform constraint, evidence label and decision note are required`)
    }
    if (entry.sourceCapturedAt !== capture?.capturedAt) {
      rows.push(`${slug}: sourceCapturedAt must match the root capture date`)
    }
    const captured = new Date(`${entry.sourceCapturedAt}T00:00:00Z`)
    const age = Math.floor((TODAY - captured) / 86400000)
    if (Number.isNaN(captured.getTime()) || age < 0 || age > STALE_DAYS) {
      rows.push(`${slug}: access evidence is outside the ${STALE_DAYS}-day freshness gate`)
    }

    for (const [field, sourceUrl] of [
      ['sourceUrl', entry.sourceUrl],
      ['secondarySourceUrl', entry.secondarySourceUrl],
    ]) {
      if (!sourceUrl) {
        if (field === 'sourceUrl') rows.push(`${slug}: sourceUrl is required`)
        continue
      }
      try {
        const source = new URL(sourceUrl)
        if (source.protocol !== 'https:') {
          rows.push(`${slug}.${field}: source must use HTTPS`)
        }
        if (
          source.hostname !== spec.host
          && !source.hostname.endsWith(`.${spec.host}`)
        ) {
          rows.push(`${slug}.${field}: ${source.hostname} is not the approved first-party host`)
        }
      } catch {
        rows.push(`${slug}.${field}: invalid source URL`)
      }
    }

    const firm = firmsBySlug.get(slug)
    if (!firm) {
      rows.push(`${slug}: no matching firms.json record`)
    } else if ((firm.countriesRestricted ?? []).some(country =>
      /^(us|usa|united states)$/i.test(country.trim()))) {
      rows.push(`${slug}: firms.json contradicts the captured U.S. access evidence`)
    }
    const challenges = loadChallenges(slug)
    if (!challenges?.length) {
      rows.push(`${slug}: no challenge data found`)
    } else {
      const challengeBySlug = new Map(
        challenges.map(challenge => [challenge.productSlug, challenge]),
      )
      const mapped = spec.products.flatMap(productSlug => {
        const challenge = challengeBySlug.get(productSlug)
        if (!challenge) rows.push(`${slug}: mapped product ${productSlug} is missing`)
        return challenge ? [challenge] : []
      })
      if (mapped.length !== spec.products.length) {
        rows.push(`${slug}: mapped product coverage is incomplete`)
      }
      const freshnessErrors = []
      checkSourceFreshness(mapped, freshnessErrors)
      for (const error of freshnessErrors) rows.push(`${slug}: ${error}`)
    }
  }

  const expectedProductCount = [...expected.values()].reduce(
    (total, spec) => total + spec.products.length,
    0,
  )
  if (expectedProductCount !== 14) {
    rows.push(`U.S. evidence fixture must map 14 products, received ${expectedProductCount}`)
  }

  const landings = read(LANDINGS_CONFIG_FILE)
  const landingBlock = landings.match(
    /slug:\s*'best-prop-firms-in-us'([\s\S]*?)slug:\s*'best-prop-firms-in-india'/,
  )?.[1] ?? ''
  if (!landingBlock) {
    rows.push('best-prop-firms-in-us landing config is missing')
  } else {
    const expectedDescription =
      `Compare ${expected.size} policy-checked prop firms for U.S. traders across ${expectedProductCount} exact futures and CFD products, with platform limits, CFTC/NFA checks, reviews, and sources.`
    if (expectedDescription.length < 120 || expectedDescription.length > 160) {
      rows.push('U.S. landing meta description must be between 120 and 160 characters')
    }
    const requiredFragments = [
      'h1: `Best Prop Firms for U.S. Traders (2026): ${CURRENT_US_FIRM_COUNT} Policy-Checked`',
      'metaTitle: `Best Prop Firms for US Traders (2026): ${CURRENT_US_FIRM_COUNT} Checked`',
      'CURRENT_US_PRODUCT_COUNT} exact futures and CFD products',
      'US_ACCESS_EVIDENCE_BY_SLUG.get(slug)',
      'usProductsForEvidence(evidence)',
      'U.S.-mapped ${products.length === 1',
      'joinNatural(shownProducts)',
      'sortKey: firm.score',
      "trailingMetricLabel: 'US access'",
      'A missing restriction is not enough.',
      'affiliate status, coupon size, product count, asset class and platform add 0 points',
      `lastReviewed: '${capture?.capturedAt}'`,
    ]
    for (const fragment of requiredFragments) {
      if (!landingBlock.includes(fragment)) {
        rows.push(`U.S. landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      'CFTC-aware',
      'CFTC-regulated path',
      'only fully unambiguous legal path',
      'countriesRestricted',
      "metricLabel: 'US evidence'",
      'const challenges = getChallengesByFirm(slug)',
    ]) {
      if (landingBlock.includes(staleClaim)) {
        rows.push(`U.S. landing restored unsafe eligibility logic: "${staleClaim}"`)
      }
    }
    if ((landingBlock.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('U.S. landing must keep exactly 4 decision-guide questions')
    }
  }
  for (const fragment of [
    'function usProductsForEvidence(evidence: UsAccessEvidence): Challenge[]',
    'freshMappedProducts(evidence.firmSlug, evidence.productSlugs)',
    'const CURRENT_US_FIRM_COUNT = CURRENT_US_SNAPSHOT.length',
    'const CURRENT_US_PRODUCT_COUNT = CURRENT_US_SNAPSHOT.reduce',
  ]) {
    if (!landings.includes(fragment)) {
      rows.push(`U.S. landing helper is missing "${fragment}"`)
    }
  }

  const firmList = read(LANDING_FIRM_LIST_FILE)
  for (const fragment of [
    'const evidenceLinks = item.evidenceLinks ?? (item.evidence ? [item.evidence] : [])',
    'evidence.url',
    'evidence.label',
    'evidence.capturedAt',
    'rel="nofollow noopener"',
    'href={`/go/${slug}?from=${fromParam}`}',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!firmList.includes(fragment)) {
      rows.push(`landing firm list is missing "${fragment}"`)
    }
  }
  const evidenceLinkBlock = firmList.match(
    /\{evidenceLinks\.length > 0 && \(([\s\S]*?)<div className="leader-stats">/,
  )?.[1] ?? ''
  if (evidenceLinkBlock.includes('sponsored')) {
    rows.push('first-party evidence links must not be marked sponsored')
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isUs = landing.slug === 'best-prop-firms-in-us'",
    'U.S. access is not a regulatory badge.',
    'https://www.cftc.gov/check',
    'https://www.nfa.futures.org/basicnet/',
    'What U.S. traders should verify',
    'href="/prop-firm-challenges"',
    "href: '/prop-firm-challenges?market=futures'",
    '10 futures paths',
    'href="/best-futures-prop-firms"',
    "href: '/blog/fundednext-review'",
    "href: '/prop-firm-discount-codes'",
    'Verify the FundedNext 5% coupon',
    "href: '/prop-firm-challenge-changes'",
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`U.S. landing component is missing "${fragment}"`)
    }
  }

  const retired = read(RETIRED_CONTENT_FILE)
  if (!retired.includes("'forex-prop-firms-in-the-us': '/best-prop-firms-in-us'")) {
    rows.push('retired U.S. article is not mapped to the canonical landing')
  }
  const mdx = read(MDX_FILE)
  if (
    !mdx.includes("import { isRetiredPostSlug } from './retiredContent'")
    || (mdx.match(/filter\(post => !isRetiredPostSlug\(post\.slug\)\)/g) ?? []).length !== 2
  ) {
    rows.push('retired posts must be filtered from both metadata and full-content loaders')
  }
  const blogRoute = read(BLOG_POST_PAGE_FILE)
  if (!blogRoute.includes('getAllPosts().map(p => ({ slug: p.slug }))')) {
    rows.push('blog static params no longer use the filtered post loader')
  }
  const sitemap = read(SITEMAP_FILE)
  if (!sitemap.includes('const posts = getAllPosts()') || !sitemap.includes('const postRoutes')) {
    rows.push('sitemap no longer derives blog URLs from the filtered post loader')
  }

  const config = read(NEXT_CONFIG_FILE)
  for (const fragment of [
    "import { RETIRED_POST_REDIRECTS } from './lib/retiredContent'",
    'Object.entries(RETIRED_POST_REDIRECTS).flatMap',
    '{ source: `/${slug}`, destination, permanent: true }',
    '{ source: `/blog/${slug}`, destination, permanent: true }',
    '...retiredPostRedirects()',
  ]) {
    if (!config.includes(fragment)) {
      rows.push(`retired-post redirect config is missing "${fragment}"`)
    }
  }

  const reviewFiles = [
    'fundednext-review.md',
    'tradeify-review.md',
    'topstep-review.md',
    'apex-trader-funding-review.md',
  ]
  for (const file of reviewFiles) {
    const content = read(path.join(POSTS, file))
    if (!content.includes('href="/best-prop-firms-in-us"')) {
      rows.push(`${file}: missing contextual backlink to the U.S. comparison`)
    }
  }
  if (!read(CHALLENGE_LIFECYCLE_PAGE_FILE).includes('href="/best-prop-firms-in-us"')) {
    rows.push('challenge lifecycle pillar is missing its contextual U.S. comparison backlink')
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const usLandingPath = '/best-prop-firms-in-us'",
    'expectedUsFirms',
    'expectedUsProductCount',
    '14 products',
    'href="/go/fundednext?from=best-prop-firms-in-us"',
    'missing contextual U.S.-ranking backlink',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing U.S.-ranking safeguard: "${fragment}"`)
    }
  }

  const retiredPath = path.join(POSTS, 'forex-prop-firms-in-the-us.md')
  for (const directory of [path.join(ROOT, 'app'), path.join(ROOT, 'components'), path.join(ROOT, 'lib'), POSTS]) {
    const stack = [directory]
    while (stack.length) {
      const current = stack.pop()
      for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, dirent.name)
        if (dirent.isDirectory()) {
          stack.push(fullPath)
        } else if (
          fullPath !== retiredPath
          && /\.(?:md|ts|tsx)$/.test(dirent.name)
          && read(fullPath).includes('/blog/forex-prop-firms-in-the-us')
        ) {
          rows.push(`${path.relative(ROOT, fullPath)} still links to the retired U.S. article`)
        }
      }
    }
  }

  if (rows.length) {
    console.log('\nâœ— U.S. landing consolidation')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Keep the swing shortlist product-level and the focused-rule link graph balanced. */
function checkSwingFeatureCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'best-swing-trading-prop-firms'([\s\S]*?)\n\s*},\n]/,
  )?.[1] ?? ''

  if (!block) {
    rows.push('best-swing-trading-prop-firms landing config is missing')
  } else {
    const metaTitle = block.match(/metaTitle:\s*'([^']+)'/)?.[1]
    const description = block.match(/metaDescription:\s*\n\s*'([^']+)'/)?.[1]
    if (metaTitle && metaTitle.length > 54) {
      rows.push('swing landing meta title must leave room for the root title suffix')
    }
    if (description && (description.length < 120 || description.length > 160)) {
      rows.push('swing landing meta description must be between 120 and 160 characters')
    }
    for (const fragment of [
      'function swingCompatibleProducts(firm: Firm): Challenge[]',
      'const CURRENT_SWING_FIRM_COUNT = CURRENT_SWING_SNAPSHOT.length',
      'const CURRENT_SWING_PRODUCT_COUNT = CURRENT_SWING_SNAPSHOT.reduce',
      'isChallengeFresh(challenge)',
      'challenge.rules.overnight === true',
      'challenge.rules.weekend === true',
      'h1: `Best Prop Firms for Swing Trading (2026): ${CURRENT_SWING_FIRM_COUNT} Verified`',
      'metaTitle: `Best Swing Trading Prop Firms (2026): ${CURRENT_SWING_FIRM_COUNT} Verified`',
      'snapshotProductCount: CURRENT_SWING_PRODUCT_COUNT',
      'const qualifying = swingCompatibleProducts(firm)',
      "trailingMetricLabel: 'Product fit'",
      'trailingMetricValue: `${qualifying.length}/${freshProducts.length}`',
      'function evidenceLinksForProducts(',
      'evidenceLinks: evidenceLinksForProducts(qualifying)',
      'label: `${joinNatural(source.productNames)} rule source`',
      'at least 1 product captured within 30 days sets both overnight and weekend holding to allowed on that same product',
      'affiliate status, coupon size, the ${CURRENT_SWING_PRODUCT_COUNT}-product coverage count, and drawdown type add 0 points',
      "lastReviewed: '2026-08-17'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`swing landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      'Every firm below allows BOTH',
      'static-drawdown account',
      '.filter(f => f.overnightAllowed === true && f.weekendAllowed === true)',
      'aggregate rules allow both overnight and weekend holding',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`swing landing restored unsupported logic: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('swing landing must keep exactly 4 product-level decision questions')
    }
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isSwing = landing.slug === 'best-swing-trading-prop-firms'",
    'What swing traders should verify',
    'Four product-level checks before carrying a position across sessions.',
    "href: '/prop-firms/overnight-holding'",
    "href: '/prop-firms/weekend-holding'",
    "href: '/blog/balance-based-drawdown-vs-equity-based-drawdown'",
    "href: '/prop-firm-discount-codes'",
    'Verify the FundedNext 5% coupon',
    'landing.snapshotProductCount',
    'every card names every qualifying product and links each distinct rule source',
    'Verify the exact product before carrying',
    'href="/prop-firm-challenges"',
    'href="/blog/fundednext-review"',
    'href="/prop-firm-discount-codes"',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`swing landing component is missing "${fragment}"`)
    }
  }

  const featureRoute = read(FEATURE_PAGE_ROUTE_FILE)
  if (!featureRoute.includes('const siblings = FEATURES.filter(f => f.slug !== slug)')) {
    rows.push('focused rule pages no longer render the complete sibling cluster')
  }
  if (/FEATURES\.filter\(f => f\.slug !== slug\)\.slice\(/.test(featureRoute)) {
    rows.push('focused rule sibling links are sliced by config order')
  }

  for (const [file, label] of [
    [TRUE_COST_PILLAR_FILE, 'true-cost pillar'],
    [SCALING_PLAN_GUIDE_FILE, 'scaling guide'],
    [PROFITABILITY_GUIDE_FILE, 'profitability guide'],
  ]) {
    if (!read(file).includes('href="/prop-firms/high-profit-split"')) {
      rows.push(`${label} is missing its contextual high-profit-split link`)
    }
  }

  for (const file of [
    'fundednext-review.md',
    'e8-markets-review.md',
    'fxify-review.md',
    'alpha-capital-review.md',
    'city-traders-imperium-review.md',
    'bright-funded-prop-firm.md',
    'crypto-fund-trader-review.md',
  ]) {
    if (!read(path.join(POSTS, file)).includes('href="/best-swing-trading-prop-firms"')) {
      rows.push(`${file}: missing contextual backlink to the swing comparison`)
    }
  }
  if (!read(DRAWDOWN_GUIDE_FILE).includes('href="/best-swing-trading-prop-firms"')) {
    rows.push('drawdown guide is missing its contextual swing-comparison backlink')
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "path.startsWith('/prop-firms/')",
    'inlinkCount < 5',
    "const swingLandingPath = '/best-swing-trading-prop-firms'",
    'expectedSwingFirms',
    'expectedSwingProductCount',
    'challenge.rules.overnight === true',
    'challenge.rules.weekend === true',
    '7 firms and 27 products',
    'Product fit ${products.length}/${freshProducts.length}',
    'href="/go/fundednext?from=best-swing-trading-prop-firms"',
    'missing contextual swing-ranking backlink',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— Swing landing and focused-rule links')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Keep the futures shortlist product-level and separate exchange oversight from firm registration. */
function checkFuturesLandingCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'best-futures-prop-firms'([\s\S]*?)slug:\s*'best-crypto-prop-firms'/,
  )?.[1] ?? ''

  if (!block) {
    rows.push('best-futures-prop-firms landing config is missing')
  } else {
    const metaTitle = block.match(/metaTitle:\s*'([^']+)'/)?.[1]
    const description = block.match(/metaDescription:\s*\n\s*'([^']+)'/)?.[1]
    if (metaTitle && metaTitle.length > 54) {
      rows.push('futures landing meta title must leave room for the root title suffix')
    }
    if (description && (description.length < 120 || description.length > 160)) {
      rows.push('futures landing meta description must be between 120 and 160 characters')
    }
    for (const fragment of [
      'function freshFuturesProducts(firm: Firm): Challenge[]',
      'const CURRENT_FUTURES_FIRM_COUNT = CURRENT_FUTURES_SNAPSHOT.length',
      'const CURRENT_FUTURES_PRODUCT_COUNT = CURRENT_FUTURES_SNAPSHOT.reduce',
      "isChallengeFresh(challenge) && challenge.assetClass === 'futures'",
      'h1: `Best Futures Prop Firms (2026): ${CURRENT_FUTURES_FIRM_COUNT} Verified`',
      'metaTitle: `Best Futures Prop Firms (2026): ${CURRENT_FUTURES_FIRM_COUNT} Verified`',
      'snapshotProductCount: CURRENT_FUTURES_PRODUCT_COUNT',
      'const products = freshFuturesProducts(firm)',
      'pricingModelLabel(product.pricingModel)',
      "trailingMetricLabel: 'Products'",
      'trailingMetricValue: products.length.toString()',
      'evidenceLinks: evidenceLinksForProducts(products)',
      'affiliate status, coupon size, the ${CURRENT_FUTURES_PRODUCT_COUNT}-product count, billing model, platform, and drawdown type add 0 points',
      'Is the evaluation fee one-time or recurring?',
      'Does drawdown trail intraday or at session end?',
      'Is the funded stage simulated or live?',
      'Which entity is actually regulated?',
      "lastReviewed: '2026-08-17'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`futures landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      'CFTC-regulated brokers',
      'US-friendly status',
      "firms.filter(f => f.assets?.includes('Futures'))",
      'firm acts as an evaluation gate, not as the counterparty',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`futures landing restored unsupported logic: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('futures landing must keep exactly 4 product-level decision questions')
    }
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isFutures = landing.slug === 'best-futures-prop-firms'",
    'What futures traders should verify',
    'Four product, billing, account-stage and registration checks before paying.',
    'Exchange oversight is not a prop-firm registration badge.',
    'https://www.cftc.gov/IndustryOversight/TradingOrganizations/DCMs/index.htm',
    'https://www.cftc.gov/check',
    "href: '/prop-firm-challenges?market=futures'",
    'title: `Compare ${landing.snapshotProductCount ?? 0} current futures products`',
    "href: '/best-prop-firms-in-us'",
    "href: '/blog/balance-based-drawdown-vs-equity-based-drawdown'",
    "href: '/prop-firm-challenge-changes'",
    'landing.snapshotProductCount',
    'every card names every current futures product and links each distinct source',
    'Compare the exact futures product',
    'href="/prop-firm-challenges?market=futures"',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`futures landing component is missing "${fragment}"`)
    }
  }

  const challengeComparison = read(GLOBAL_CHALLENGE_COMPONENT_FILE)
  for (const fragment of [
    'function parseMarketFilter(value: string | null): MarketFilter',
    "setMarket(parseMarketFilter(params.get('market')))",
    'const commitMarket = (value: MarketFilter)',
    "url.searchParams.set('market', value)",
    "url.searchParams.delete('market')",
    'onChange={value => commitMarket(value as MarketFilter)}',
  ]) {
    if (!challengeComparison.includes(fragment)) {
      rows.push(`global challenge comparison is missing futures-filter safeguard: "${fragment}"`)
    }
  }

  for (const file of [
    'topstep-review.md',
    'my-funded-futures.md',
    'take-profit-trader-review.md',
    'tradeday-review.md',
    'apex-trader-funding-review.md',
    'lucid-trading-review.md',
    'tradeify-review.md',
  ]) {
    if (!read(path.join(POSTS, file)).includes('href="/best-futures-prop-firms"')) {
      rows.push(`${file}: missing contextual backlink to the futures comparison`)
    }
  }

  const mffFile = read(path.join(POSTS, 'my-funded-futures.md'))
  const { data: mff, content: mffContent } = matter(mffFile)
  const expectedMffSeoTitle = 'My Funded Futures Review 2026: Plans, Fees & Payouts'
  const expectedMffDescription =
    'My Funded Futures review of Rapid, Flex, Pro and Builder pricing, drawdown rules, payout gates, recurring costs, and which plan fits each trader.'
  if (
    mff.seoTitle !== expectedMffSeoTitle
    || mff.seoDescription !== expectedMffDescription
    || mff.modified !== '2026-08-18 12:00:00'
    || mff.sourceCapturedAt !== '2026-07-27'
  ) {
    rows.push('My Funded Futures SEO or evidence metadata is stale')
  }
  if (
    String(mff.seoTitle || '').length > 60
    || String(mff.seoDescription || '').length < 120
    || String(mff.seoDescription || '').length > 160
  ) {
    rows.push('My Funded Futures search metadata is outside the editorial range')
  }
  for (const sourceUrl of [
    'https://myfundedfutures.com/challenge',
    'https://help.myfundedfutures.com/en/articles/13134709-rapid-plan-50k-a-comprehensive-look',
    'https://help.myfundedfutures.com/en/articles/15072271-flex-plan-50-000-a-comprehensive-guide',
    'https://help.myfundedfutures.com/en/articles/11802674-pro-plan-sim-funded-and-live-account-highlights',
    'https://help.myfundedfutures.com/en/articles/14290805-builder-plan-50k-a-comprehensive-guide',
  ]) {
    if (!mff.sourceUrls?.includes(sourceUrl)) {
      rows.push(`My Funded Futures frontmatter is missing first-party source ${sourceUrl}`)
    }
  }
  for (const token of [
    'data-mff-review-evidence="2026-07-27"',
    'The best plan depends on the rule that constrains the trader, not the lowest monthly fee.',
    'data-mff-plan-decision="binding-rule"',
    'Real-time trailing drawdown after funding plus the size-specific payout buffer',
    'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
    'href="/blog/what-is-prop-firm-consistency-rule"',
    'data-mff-comparison-journey="futures-alternatives"',
    'href="/compare/my-funded-futures-vs-topstep"',
    'href="/blog/topstep-review"',
    'href="/blog/take-profit-trader-review"',
    'href="/blog/apex-trader-funding-review"',
    'data-mff-faq="current-plans"',
    'rank-math-question',
  ]) {
    if (!mffContent.includes(token)) {
      rows.push(`My Funded Futures review is missing SEO or decision token ${token}`)
    }
  }
  if (/href=["']https?:\/\/(?:www\.)?(?:myfundedfutures\.com|help\.myfundedfutures\.com)/i.test(mffContent)) {
    rows.push('My Funded Futures review contains a bare firm-domain link')
  }
  for (const [relativePath, label] of [
    ['content/posts/apex-trader-funding-review.md', 'Apex review'],
    ['content/posts/balance-based-drawdown-vs-equity-based-drawdown.md', 'drawdown guide'],
    ['content/posts/what-is-prop-firm-consistency-rule.md', 'consistency guide'],
  ]) {
    if (!read(path.join(ROOT, relativePath)).includes('href="/blog/my-funded-futures"')) {
      rows.push(`${label} is missing its contextual My Funded Futures backlink`)
    }
  }
  if (!read(DRAWDOWN_GUIDE_FILE).includes('href="/best-futures-prop-firms"')) {
    rows.push('drawdown guide is missing its contextual futures-comparison backlink')
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const futuresLandingPath = '/best-futures-prop-firms'",
    'expectedFuturesFirms',
    'expectedFuturesProductCount',
    "challenge.assetClass === 'futures'",
    '7 firms and 25 products',
    'Products ${products.length}',
    'missing contextual futures-ranking backlink',
    "'/prop-firm-challenges?market=futures'",
    'canonical includes futures market state',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing futures safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— Futures landing and review links')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Keep crypto eligibility tied to a tradable-market source and exact product rows. */
function checkCryptoLandingCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  let evidenceData
  try {
    evidenceData = JSON.parse(read(CRYPTO_MARKET_EVIDENCE_FILE))
  } catch (error) {
    rows.push(`crypto market evidence JSON is invalid: ${error.message}`)
    evidenceData = { ranked: [], watch: [] }
  }

  const ranked = Array.isArray(evidenceData.ranked) ? evidenceData.ranked : []
  const watch = Array.isArray(evidenceData.watch) ? evidenceData.watch : []
  const firms = JSON.parse(read(path.join(ROOT, 'content/data/firms.json')) || '[]')
  const firmsBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const rankedSlugs = new Set()
  const mappedProducts = new Set()

  const isFreshDate = value => {
    const captured = new Date(`${value}T00:00:00Z`)
    const ageDays = Math.floor((TODAY - captured) / 86_400_000)
    return !Number.isNaN(captured.getTime()) && ageDays >= 0 && ageDays <= STALE_DAYS
  }
  const validateFirstPartySource = (entry, label, { requireFresh = true } = {}) => {
    const firm = firmsBySlug.get(entry.firmSlug)
    if (!firm) {
      rows.push(`${label}: no matching firms.json record`)
      return null
    }
    if (entry.firmName !== firm.name) {
      rows.push(`${label}: firmName does not match firms.json`)
    }
    try {
      const source = new URL(entry.sourceUrl)
      const official = new URL(firm.officialUrl)
      const sourceHost = source.hostname.toLowerCase().replace(/^www\./, '')
      const officialHost = official.hostname.toLowerCase().replace(/^www\./, '')
      if (
        source.protocol !== 'https:'
        || (sourceHost !== officialHost && !sourceHost.endsWith(`.${officialHost}`))
      ) {
        rows.push(`${label}: sourceUrl is not on the firm's first-party HTTPS host`)
      }
    } catch {
      rows.push(`${label}: sourceUrl is invalid`)
    }
    if (requireFresh && !isFreshDate(entry.sourceCapturedAt)) {
      rows.push(`${label}: market evidence is outside the ${STALE_DAYS}-day freshness window`)
    }
    return firm
  }

  for (const entry of ranked) {
    const label = `crypto ranked ${entry.firmSlug || '(missing slug)'}`
    validateFirstPartySource(entry, label)
    if (rankedSlugs.has(entry.firmSlug)) rows.push(`${label}: duplicate ranked firm`)
    rankedSlugs.add(entry.firmSlug)
    if (!['crypto-native', 'multi-asset-cfd'].includes(entry.marketModel)) {
      rows.push(`${label}: invalid marketModel`)
    }
    if (!Array.isArray(entry.productSlugs) || entry.productSlugs.length === 0) {
      rows.push(`${label}: productSlugs must contain at least 1 exact product`)
      continue
    }
    if (new Set(entry.productSlugs).size !== entry.productSlugs.length) {
      rows.push(`${label}: duplicate productSlug`)
    }

    const challenges = JSON.parse(
      read(path.join(CHALLENGES, `${entry.firmSlug}.json`)) || '[]',
    )
    const challengesBySlug = new Map(challenges.map(product => [product.productSlug, product]))
    for (const productSlug of entry.productSlugs) {
      const composite = `${entry.firmSlug}:${productSlug}`
      if (mappedProducts.has(composite)) rows.push(`${label}: duplicate mapping ${composite}`)
      mappedProducts.add(composite)
      const product = challengesBySlug.get(productSlug)
      if (!product) {
        rows.push(`${label}: missing challenge row ${productSlug}`)
      } else if (!isFreshDate(product.sourceCapturedAt)) {
        rows.push(`${label}: ${productSlug} is outside the ${STALE_DAYS}-day freshness window`)
      }
    }
  }

  for (const entry of watch) {
    const label = `crypto watch ${entry.firmSlug || '(missing slug)'}`
    validateFirstPartySource(entry, label, {
      requireFresh: entry.status === 'product-capture-needed',
    })
    if (rankedSlugs.has(entry.firmSlug)) {
      rows.push(`${label}: firm cannot be both ranked and on watch`)
    }
    if (!['product-capture-needed', 'market-and-product-refresh-needed'].includes(entry.status)) {
      rows.push(`${label}: status must describe a product capture or market/product refresh`)
    }
    for (const field of ['evidence', 'nextStep']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        rows.push(`${label}: ${field} is required`)
      }
    }
  }

  if (ranked.length !== 3 || watch.length !== 7 || mappedProducts.size !== 12) {
    rows.push(
      `crypto fixture expects 3 current ranked firms, 7 watch firms and 12 mapped products; received ${ranked.length}, ${watch.length} and ${mappedProducts.size}`,
    )
  }
  if (!String(evidenceData.methodology ?? '').includes('Payment or payout by crypto does not qualify')) {
    rows.push('crypto evidence methodology must separate tradable markets from payment and payout rails')
  }

  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'best-crypto-prop-firms'([\s\S]*?)slug:\s*'best-swing-trading-prop-firms'/,
  )?.[1] ?? ''
  if (!block) {
    rows.push('best-crypto-prop-firms landing config is missing')
  } else {
    for (const fragment of [
      "import rawCryptoMarketEvidence from '@/content/data/crypto-market-evidence.json'",
      'function freshMappedProducts(firmSlugValue: string, productSlugs: string[])',
      'return products.length === productSlugs.length ? products : []',
      'function cryptoProductsForEvidence(evidence: CryptoMarketEvidence): Challenge[]',
      'isCryptoMarketEvidenceFresh(evidence.sourceCapturedAt)',
      'freshMappedProducts(evidence.firmSlug, evidence.productSlugs)',
      'const CURRENT_CRYPTO_FIRM_COUNT = CURRENT_CRYPTO_SNAPSHOT.length',
      'const CURRENT_CRYPTO_PRODUCT_COUNT = CURRENT_CRYPTO_SNAPSHOT.reduce',
      'snapshotProductCount: CURRENT_CRYPTO_PRODUCT_COUNT',
      'CRYPTO_MARKET_EVIDENCE_BY_SLUG.get(slug)',
      "evidence.marketModel === 'crypto-native' ? 100 : 0",
      "metricLabel: 'Products'",
      "trailingMetricLabel: 'Market model'",
      'url: evidence.sourceUrl',
      'capturedAt: evidence.sourceCapturedAt',
      'Affiliate status, coupon size, advertised pair count, maximum split, and payment method add 0 points',
      'Can I trade crypto, or only pay and withdraw with it?',
      'Is it a dedicated crypto account or a multi-asset CFD product?',
      'Does weekend or 24/7 access actually apply?',
      'What do leverage, commission, consistency, and payout rules do?',
      'evidenceGaps: CRYPTO_MARKET_WATCH.map',
      "lastReviewed: '2026-08-27'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`crypto landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      ".filter(f => f.assets?.includes('Crypto'))",
      'firm.profitSplitPct',
      'firm.payoutFrequency',
      'can you get paid in it?',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`crypto landing restored aggregate or payment-based logic: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('crypto landing must keep exactly 4 product-level decision questions')
    }
  }

  const expectedDescription =
    `Compare ${ranked.length} crypto prop firms across ${mappedProducts.size} mapped products using current rules, market-specific evidence, source dates, and reviews.`
  if (expectedDescription.length < 120 || expectedDescription.length > 160) {
    rows.push('crypto landing meta description must be between 120 and 160 characters')
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isCrypto = landing.slug === 'best-crypto-prop-firms'",
    'What crypto traders should verify',
    'Four market, product and risk checks before paying for a crypto trading path.',
    '`${count} evidence-backed firms across ${landing.snapshotProductCount ?? 0} mapped products`',
    'Not ranked yet: {landing.evidenceGaps.length} evidence gaps',
    "href: '/prop-firm-challenges'",
    "href: '/blog/fundednext-review'",
    "href: '/prop-firm-challenge-changes'",
    'Choose the crypto product, not the payment badge',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`crypto landing component is missing "${fragment}"`)
    }
  }

  const firmList = read(LANDING_FIRM_LIST_FILE)
  for (const fragment of [
    "item.trailingMetricLabel ?? 'Payouts'",
    "item.trailingMetricValue ?? firm.payoutFrequency ?? '—'",
  ]) {
    if (!firmList.includes(fragment)) {
      rows.push(`landing firm list is missing crypto metric safeguard: "${fragment}"`)
    }
  }

  const backlinkFiles = [
    path.join(POSTS, 'crypto-fund-trader-review.md'),
    path.join(POSTS, 'fundednext-review.md'),
    path.join(POSTS, 'city-traders-imperium-review.md'),
    path.join(POSTS, 'what-is-a-prop-firm.md'),
  ]
  for (const file of backlinkFiles) {
    if (!read(file).includes('href="/best-crypto-prop-firms"')) {
      rows.push(`${path.relative(ROOT, file)}: missing contextual crypto-ranking backlink`)
    }
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const cryptoLandingPath = '/best-crypto-prop-firms'",
    'cryptoMarketEvidence.ranked.flatMap',
    'expectedCryptoProductCount',
    'expectedCryptoMappedProductCount',
    'href="/go/fundednext?from=best-crypto-prop-firms"',
    'href="/go/fundingpips?from=best-crypto-prop-firms"',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing crypto-ranking safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Crypto ranking, market evidence and internal links')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep the core ranking fresh, product-backed, and connected to its supporting guides. */
function checkOverallLandingCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'best-prop-firms-2026'([\s\S]*?)slug:\s*'best-prop-firms-in-uk'/,
  )?.[1] ?? ''

  const snapshot = fs.readdirSync(CHALLENGES)
    .filter(file => file.endsWith('.json'))
    .flatMap(file => {
      const products = JSON.parse(read(path.join(CHALLENGES, file))).filter(challenge => {
        const captured = new Date(`${challenge.sourceCapturedAt}T00:00:00Z`)
        const ageDays = Math.floor((TODAY - captured) / 86_400_000)
        return !Number.isNaN(captured.getTime()) && ageDays >= 0 && ageDays <= STALE_DAYS
      })
      return products.length ? [{ file, products }] : []
    })
  const productCount = snapshot.reduce((total, entry) => total + entry.products.length, 0)
  const tierCount = snapshot.reduce((total, entry) => total + entry.products.reduce(
    (subtotal, product) => subtotal + product.accountSizes.length,
    0,
  ), 0)

  if (!block) {
    rows.push('best-prop-firms-2026 landing config is missing')
  } else {
    for (const fragment of [
      'const CURRENT_OVERALL_SNAPSHOT = getAllFirms().flatMap',
      'const CURRENT_OVERALL_FIRM_COUNT = CURRENT_OVERALL_SNAPSHOT.length',
      'const CURRENT_OVERALL_PRODUCT_COUNT = CURRENT_OVERALL_SNAPSHOT.reduce',
      'function freshProductsForFirm(firm: Firm): Challenge[]',
      'const products = freshProductsForFirm(firm)',
      'if (!products.length) return []',
      'const tierCount = products.reduce',
      'const splits = [...new Set(products.flatMap',
      'const drawdowns = [...new Set(products.map',
      'url: evidenceProduct.sourceUrl',
      'capturedAt: evidenceProduct.sourceCapturedAt',
      'Affiliate status, coupon size, product count, tier count, account headline, and maximum advertised split add 0 points',
      'Does rank 1 mean best for every strategy?',
      'Are the editorial score and product facts the same measure?',
      'How should USD, EUR, and recurring prices be compared?',
      'What should be rechecked immediately before purchase?',
      "lastReviewed: '2026-08-17'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`overall landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      "highlight: `${firm.profitSplitPct",
      "${firm.payoutFrequency",
      'Every major prop firm ranked',
      'drawdown type (static beats trailing for most traders)',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`overall landing restored aggregate or unsupported copy: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('overall landing must keep exactly 4 ranking-use questions')
    }
  }

  if (snapshot.length !== 19 || productCount !== 89 || tierCount !== 453) {
    rows.push(
      `overall snapshot expects 19 fresh firms, 89 products and 453 tiers; received ${snapshot.length}, ${productCount} and ${tierCount}`,
    )
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isOverall = landing.slug === 'best-prop-firms-2026'",
    'How to use an overall ranking',
    'Editorial ranking with current product evidence',
    "href: '/prop-firm-challenges'",
    "href: '/compare/ftmo-vs-fundednext'",
    "href: '/cheapest-prop-firms'",
    "href: '/prop-firm-challenge-changes'",
    'Move from firm rank to the exact product',
    'Partnership status, coupon size and product count add 0 points.',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`overall landing component is missing "${fragment}"`)
    }
  }

  const backlinkFiles = [
    path.join(ROOT, 'content/posts/what-is-a-prop-firm.md'),
    path.join(ROOT, 'content/posts/is-prop-firm-trading-profitable.md'),
    path.join(ROOT, 'content/pages/how-prop-firm-challenges-work.md'),
    path.join(ROOT, 'content/pages/true-cost-of-prop-firm-challenges.md'),
  ]
  for (const file of backlinkFiles) {
    if (!read(file).includes('href="/best-prop-firms-2026"')) {
      rows.push(`${path.relative(ROOT, file)}: missing contextual overall-ranking backlink`)
    }
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const overallLandingPath = '/best-prop-firms-2026'",
    'expectedOverallFirms',
    'expectedOverallProductCount',
    'expectedOverallTierCount',
    'Compare FTMO and FundedNext',
    'href="/go/fundednext?from=best-prop-firms-2026"',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing overall-ranking safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Overall ranking, fresh products and internal links')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep the minimum-cost landing complete without inventing a cross-currency rank. */
function checkCheapestLandingCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'cheapest-prop-firms'([\s\S]*?)slug:\s*'best-instant-funding-prop-firms'/,
  )?.[1] ?? ''

  const challengeFiles = fs.readdirSync(CHALLENGES)
    .filter(file => file.endsWith('.json'))
  const pricedFirms = challengeFiles.flatMap(file => {
    const challenges = JSON.parse(read(path.join(CHALLENGES, file))).filter(challenge => {
      const captured = new Date(`${challenge.sourceCapturedAt}T00:00:00Z`)
      const ageDays = Math.floor((TODAY - captured) / 86_400_000)
      return !Number.isNaN(captured.getTime()) && ageDays >= 0 && ageDays <= STALE_DAYS
    })
    const hasUsd = challenges.some(challenge => challenge.accountSizes.some(tier =>
      tier.priceUsd != null && tier.priceUsd > 0,
    ))
    const hasEur = challenges.some(challenge => challenge.accountSizes.some(tier =>
      tier.priceEur != null && tier.priceEur > 0,
    ))
    return hasUsd || hasEur ? [{ file, hasUsd, hasEur }] : []
  })
  const usdFirmCount = pricedFirms.filter(firm => firm.hasUsd).length
  const eurFirmCount = pricedFirms.filter(firm => firm.hasEur).length

  if (!block) {
    rows.push('cheapest-prop-firms landing config is missing')
  } else {
    const metaTitle = block.match(/metaTitle:\s*'([^']+)'/)?.[1] ?? ''
    const description = block.match(/metaDescription:\s*\n\s*'([^']+)'/)?.[1] ?? ''
    if (metaTitle.length > 54) {
      rows.push('cheapest landing meta title must leave room for the root title suffix')
    }
    if (description.length < 120 || description.length > 160) {
      rows.push('cheapest landing meta description must be between 120 and 160 characters')
    }
    if (!description.includes(`${pricedFirms.length} prop firms`)) {
      rows.push(`cheapest landing meta description must match ${pricedFirms.length} fresh priced firms`)
    }
    for (const fragment of [
      'function publishedMinimumCost(',
      "const currency = challengeCurrency(challenge)",
      "if (currency === 'USD')",
      'const usdSurcharge = (tier.payLaterUsd ?? 0)',
      'tier.priceEur == null',
      "const byCurrency: Record<ChallengeCurrency, LandingFirm[]>",
      "...byCurrency.USD.sort(byMinimumCost)",
      "...byCurrency.EUR.sort(byMinimumCost)",
      "const groupLabel = currency === 'USD'",
      'groupLabel,',
      "metricLabel: 'Minimum cost'",
      'metricValue: formatPublishedMoney(amount, currency)',
      'url: challenge.sourceUrl',
      'capturedAt: challenge.sourceCapturedAt',
      'USD and EUR are never converted or ranked against each other',
      'Are USD and EUR prices directly ranked together?',
      'Does the number include activation or pay-later charges?',
      'What does a monthly minimum mean?',
      'Why can the smallest fee still be expensive?',
      "lastReviewed: '2026-08-17'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`cheapest landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      'the lowest priced entry challenge from every firm we track, sorted by price',
      'cheapest.minimumCostUsd.toFixed(0)',
      '($${(cheapest.sizeUsd / 1000).toFixed(0)}K)',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`cheapest landing restored incomplete or rounded pricing: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('cheapest landing must keep exactly 4 cost-basis decision questions')
    }
  }

  if (pricedFirms.length !== 19 || usdFirmCount !== 17 || eurFirmCount !== 2) {
    rows.push(
      `cheapest data fixture expects 19 firms (17 USD, 2 EUR), received ${pricedFirms.length} (${usdFirmCount} USD, ${eurFirmCount} EUR)`,
    )
  }

  const firmList = read(LANDING_FIRM_LIST_FILE)
  for (const fragment of [
    'const hasGroups = ranked.some(item => item.groupLabel)',
    'const groups = new Map<string, LandingFirm[]>()',
    'aria-labelledby={headingId}',
    '{renderList(items)}',
  ]) {
    if (!firmList.includes(fragment)) {
      rows.push(`landing firm list is missing independent currency-group rendering: "${fragment}"`)
    }
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isCheapest = landing.slug === 'cheapest-prop-firms'",
    'const rankedGroups = new Map<string, typeof firms>()',
    'Lowest published path by currency',
    'USD and EUR lists restart at 01 and are not ranked against each other.',
    'What price-first buyers should verify',
    "href: '/true-cost-of-prop-firm-challenges'",
    "href: '/prop-firm-discount-codes'",
    'Price the exact path, then test the rules',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`cheapest landing component is missing "${fragment}"`)
    }
  }

  const backlinkFiles = [
    path.join(ROOT, 'content/pages/true-cost-of-prop-firm-challenges.md'),
    path.join(ROOT, 'content/pages/how-prop-firm-challenges-work.md'),
    path.join(POSTS, 'maven-prop-firm-review.md'),
    path.join(POSTS, 'bright-funded-prop-firm.md'),
  ]
  for (const file of backlinkFiles) {
    if (!read(file).includes('href="/cheapest-prop-firms"')) {
      rows.push(`${path.relative(ROOT, file)}: missing contextual cheapest-ranking backlink`)
    }
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const cheapestLandingPath = '/cheapest-prop-firms'",
    'expectedCheapestEntries',
    'USD-denominated products',
    'EUR-denominated products',
    'Maven Standard 3-Step',
    'Bright Funded 2-Step Bright',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing cheapest-ranking safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Cheapest landing, currencies and internal links')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep the discount hub offer-only, first-party sourced, and conversion-honest. */
function checkDiscountHub() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const page = read(DISCOUNT_HUB_PAGE_FILE)
  const library = read(DEALS_LIBRARY_FILE)
  const card = read(DEAL_CARD_FILE)
  const filter = read(DEALS_FILTER_FILE)
  const deals = JSON.parse(read(DEALS_DATA_FILE) || '[]')
  const firms = JSON.parse(
    read(path.join(ROOT, 'content/data/firms.json')) || '[]',
  )
  const freeTrials = JSON.parse(read(FREE_TRIAL_DATA_FILE) || '[]')
  const firmBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const mechanisms = new Set(['checkout-code', 'link-applied', 'earned-coupon'])

  if (deals.length === 0) rows.push('deals.json must keep at least 1 freshly sourced offer')
  for (const [index, deal] of deals.entries()) {
    const label = deal.firmSlug || `row ${index + 1}`
    const firm = firmBySlug.get(deal.firmSlug)
    if (!firm) {
      rows.push(`${label}: no matching firm record`)
      continue
    }
    if (!mechanisms.has(deal.mechanism)) {
      rows.push(`${label}: mechanism must distinguish code, link, or earned coupon`)
    }
    if (deal.status === 'partner' && !firm.affiliateUrl) {
      rows.push(`${label}: partner status has no affiliateUrl`)
    }
    if (!Number.isInteger(deal.pct) || deal.pct <= 0 || deal.pct > 100) {
      rows.push(`${label}: pct must be an integer from 1 to 100`)
    }
    if (deal.mechanism === 'checkout-code' && !deal.code) {
      rows.push(`${label}: checkout-code offer is missing its typeable code`)
    }
    if (deal.mechanism !== 'checkout-code' && deal.code) {
      rows.push(`${label}: ${deal.mechanism} must not publish a typeable code`)
    }
    for (const field of ['amountLabel', 'sourceLabel', 'ctaLabel']) {
      if (typeof deal[field] !== 'string' || !deal[field].trim()) {
        rows.push(`${label}: ${field} is required`)
      }
    }

    const checkedAt = new Date(`${deal.verifiedOn}T00:00:00Z`)
    const ageDays = Math.floor((TODAY - checkedAt) / 86_400_000)
    if (Number.isNaN(checkedAt.getTime()) || ageDays < 0 || ageDays > STALE_DAYS) {
      rows.push(`${label}: verifiedOn is outside the ${STALE_DAYS}-day freshness gate`)
    }
    if (deal.expiresOn && deal.expiresOn < TODAY.toISOString().slice(0, 10)) {
      rows.push(`${label}: expired offers must be removed from deals.json`)
    }

    try {
      const sourceHost = new URL(deal.sourceUrl).hostname.replace(/^www\./, '')
      const officialHost = new URL(firm.officialUrl).hostname.replace(/^www\./, '')
      if (sourceHost !== officialHost && !sourceHost.endsWith(`.${officialHost}`)) {
        rows.push(`${label}: sourceUrl must stay on ${officialHost} or its subdomain`)
      }
    } catch {
      rows.push(`${label}: sourceUrl or firm officialUrl is invalid`)
    }
  }

  const fundedNextDeal = deals.find(deal => deal.firmSlug === 'fundednext')
  const fundedNextTrial = freeTrials.find(trial => trial.firmSlug === 'fundednext')
  if (!fundedNextDeal || !fundedNextTrial) {
    rows.push('FundedNext deal and Free Trial evidence must both exist')
  } else {
    const coupon = fundedNextTrial.completionCoupon
    if (
      fundedNextDeal.mechanism !== 'earned-coupon' ||
      fundedNextDeal.code != null ||
      fundedNextDeal.pct !== coupon?.discountPct ||
      fundedNextDeal.sourceUrl !== fundedNextTrial.sourceUrl ||
      !(fundedNextDeal.scope ?? '').includes('New users') ||
      !(fundedNextDeal.scope ?? '').includes('CFD plans') ||
      !(fundedNextDeal.scope ?? '').includes('no resets') ||
      !(fundedNextDeal.note ?? '').includes(`${coupon?.validDays} days`)
    ) {
      rows.push('FundedNext earned coupon does not match structured Free Trial evidence')
    }
  }
  const fundingPipsDeal = deals.find(deal => deal.firmSlug === 'fundingpips')
  if (
    !fundingPipsDeal ||
    fundingPipsDeal.mechanism !== 'checkout-code' ||
    fundingPipsDeal.code !== 'HELLO' ||
    fundingPipsDeal.pct !== 20 ||
    fundingPipsDeal.sourceUrl !== 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started' ||
    !(fundingPipsDeal.scope ?? '').includes('excludes $100K accounts')
  ) {
    rows.push('FundingPips HELLO offer must match the official Get Started evidence')
  }

  const brightDeals = deals.filter(deal => deal.firmSlug === 'bright-funded')
  const brightCodes = new Map(brightDeals.map(deal => [deal.code, deal]))
  const expectedBrightOffers = [
    ['SUMMER30', 30, '1-Step Challenge'],
    ['SUMMER25', 25, '2-Step Bright'],
    ['SUMMER15', 15, '2-Step Classic'],
  ]
  for (const [code, pct, scope] of expectedBrightOffers) {
    const deal = brightCodes.get(code)
    if (
      !deal ||
      deal.mechanism !== 'checkout-code' ||
      deal.pct !== pct ||
      deal.scope !== scope ||
      deal.sourceUrl !== 'https://brightfunded.com/trading-updates'
    ) {
      rows.push(`BrightFunded ${code} offer must match the official Trading Updates evidence`)
    }
  }

  const title = page.match(/const TITLE = '([^']+)'/)?.[1] ?? ''
  const description = page.match(/const DESCRIPTION =\s*\n\s*'([^']+)'/)?.[1] ?? ''
  if (title !== 'Prop Firm Discount Codes & Offers (2026)') {
    rows.push('discount hub title must preserve intent without duplicating the root TFH suffix')
  }
  if (description.length < 120 || description.length > 160) {
    rows.push('discount hub description must be between 120 and 160 characters')
  }
  for (const fragment of [
    'rankDeals(deals, firms).flatMap',
    'const liveCount = rows.length',
    "row.mechanism === 'checkout-code'",
    'numberOfItems: rows.length',
    'Current verified offers',
    'How the FundedNext 5% offer works',
    'There is no public FundedNext code to copy',
    'data-fundednext-offer-steps="earned-coupon"',
    'fundedNextProducts.length',
    'fundedNextTierCount',
    'href="/blog/fundednext-review"',
    'href="/compare/ftmo-vs-fundednext"',
    'href="/blog/ftmo-free-trial-explained"',
    'href="/true-cost-of-prop-firm-challenges"',
  ]) {
    if (!page.includes(fragment)) rows.push(`discount hub is missing "${fragment}"`)
  }
  for (const staleClaim of [
    'No verified offer today',
    'See review for pricing',
    'const defaultLabel',
    'from=deals',
  ]) {
    if (page.includes(staleClaim) || card.includes(staleClaim)) {
      rows.push(`discount hub restored padded or ambiguous copy: "${staleClaim}"`)
    }
  }

  for (const fragment of [
    "mechanism: 'checkout-code' | 'link-applied' | 'earned-coupon'",
    'sourceUrl: string',
    'sourceLabel: string',
    'ctaLabel: string',
    'isDealFresh(deal, now)',
    "'earned-coupon': 2",
  ]) {
    if (!library.includes(fragment)) rows.push(`deal loader is missing "${fragment}"`)
  }
  for (const fragment of [
    '?from=discount-hub-${deal.mechanism}',
    'data-affiliate-placement={`discount-hub-${deal.mechanism}`}',
    'data-deal-source={deal.firmSlug}',
    'rel="sponsored nofollow noopener"',
    'rel="nofollow noopener"',
    '{deal.ctaLabel}',
    'Compare rules',
  ]) {
    if (!card.includes(fragment)) rows.push(`deal card is missing "${fragment}"`)
  }
  for (const fragment of [
    'No offer is inside the 30-day verification window today',
    'availableMarkets',
    "verified {visible.length === 1 ? 'offer' : 'offers'}",
  ]) {
    if (!filter.includes(fragment)) rows.push(`deal filter is missing "${fragment}"`)
  }

  const backlinks = [
    path.join(POSTS, 'fundednext-review.md'),
    FTMO_FREE_TRIAL_GUIDE_FILE,
    TRUE_COST_PILLAR_FILE,
  ]
  for (const file of backlinks) {
    if (!read(file).includes('href="/prop-firm-discount-codes"')) {
      rows.push(`${path.relative(ROOT, file)}: missing contextual discount-hub backlink`)
    }
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const discountHubPath = '/prop-firm-discount-codes'",
    'expectedDeals = getAllDeals()',
    'discount-hub-earned-coupon',
    'data-deal-source=',
    'missing contextual discount-hub backlink',
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing discount-hub safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Discount offers, sourcing and affiliate journey')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep instant-funding eligibility product-level and every qualifying review connected. */
function checkInstantFundingCluster() {
  const rows = []
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const landings = read(LANDINGS_CONFIG_FILE)
  const block = landings.match(
    /slug:\s*'best-instant-funding-prop-firms'([\s\S]*?)slug:\s*'best-futures-prop-firms'/,
  )?.[1] ?? ''

  if (!block) {
    rows.push('best-instant-funding-prop-firms landing config is missing')
  } else {
    const metaTitle = block.match(/metaTitle:\s*'([^']+)'/)?.[1]
    const description = block.match(/metaDescription:\s*\n\s*'([^']+)'/)?.[1]
    if (metaTitle && metaTitle.length > 54) {
      rows.push('instant-funding meta title must leave room for the root title suffix')
    }
    if (description && (description.length < 120 || description.length > 160)) {
      rows.push('instant-funding meta description must be between 120 and 160 characters')
    }
    for (const fragment of [
      'function freshInstantProducts(firm: Firm): Challenge[]',
      'const CURRENT_INSTANT_FIRM_COUNT = CURRENT_INSTANT_SNAPSHOT.length',
      'const CURRENT_INSTANT_PRODUCT_COUNT = CURRENT_INSTANT_SNAPSHOT.reduce',
      'isChallengeFresh(challenge) && challenge.phases === 0',
      'h1: `Best Instant Funding Prop Firms (2026): ${CURRENT_INSTANT_FIRM_COUNT} Verified`',
      'metaTitle: `Best Instant Funding Prop Firms (2026): ${CURRENT_INSTANT_FIRM_COUNT} Verified`',
      'snapshotProductCount: CURRENT_INSTANT_PRODUCT_COUNT',
      'const products = freshInstantProducts(firm)',
      'products.flatMap(product => product.accountSizes.flatMap',
      'minimumCostToFundedUsd(product, tier)',
      "trailingMetricLabel: 'Products'",
      'trailingMetricValue: products.length.toString()',
      'evidenceLinks: evidenceLinksForProducts(products)',
      'Every qualifying product contributes to the ${CURRENT_INSTANT_FIRM_COUNT}-firm, ${CURRENT_INSTANT_PRODUCT_COUNT}-product snapshot',
      'affiliate status, product count, price, profit split, drawdown type, and payout speed add 0 points',
      'Does phase 0 mean the account trades live capital?',
      'How does the maximum-loss line move?',
      'How much loss room repays the one-time fee?',
      'What unlocks the first payout?',
      "lastReviewed: '2026-08-17'",
    ]) {
      if (!landings.includes(fragment) && !block.includes(fragment)) {
        rows.push(`instant-funding landing is missing "${fragment}"`)
      }
    }
    for (const staleClaim of [
      'challenges.find((c: Challenge) => c.phases === 0)',
      'const instant = challenges.find',
      'instant.accountSizes',
      'Lower-profit-split "instant" products',
    ]) {
      if (block.includes(staleClaim)) {
        rows.push(`instant-funding landing restored first-product logic: "${staleClaim}"`)
      }
    }
    if ((block.match(/title:\s*'/g) ?? []).length !== 4) {
      rows.push('instant-funding landing must keep exactly 4 product-level decision questions')
    }
  }

  const landingPage = read(LANDING_PAGE_COMPONENT_FILE)
  for (const fragment of [
    "const isInstant = landing.slug === 'best-instant-funding-prop-firms'",
    'What instant-funding buyers should verify',
    'Four account-stage, loss-line, cost and payout checks before paying.',
    "href: '/prop-firm-challenges?program=instant'",
    "href: '/how-prop-firm-challenges-work'",
    "href: '/true-cost-of-prop-firm-challenges'",
    "href: '/blog/what-is-prop-firm-consistency-rule'",
    "href: '/prop-firm-discount-codes'",
    'Verify the FundedNext 5% coupon',
    'landing.snapshotProductCount',
    'every card names every phase-0 product and links each distinct rule source',
    'Compare the exact phase-0 product',
    'href="/prop-firm-challenges?program=instant"',
    'href="/blog/fundednext-review"',
    'href="/prop-firm-discount-codes"',
  ]) {
    if (!landingPage.includes(fragment)) {
      rows.push(`instant-funding landing component is missing "${fragment}"`)
    }
  }

  const challengeComparison = read(GLOBAL_CHALLENGE_COMPONENT_FILE)
  for (const fragment of [
    'function parseProgramFilter(value: string | null): ProgramFilter',
    "setProgram(parseProgramFilter(params.get('program')))",
    'const commitProgram = (value: ProgramFilter)',
    "url.searchParams.set('program', value)",
    "url.searchParams.delete('program')",
    'onChange={value => commitProgram(value as ProgramFilter)}',
  ]) {
    if (!challengeComparison.includes(fragment)) {
      rows.push(`global challenge comparison is missing phase-0 filter safeguard: "${fragment}"`)
    }
  }

  const reviewFiles = [
    'alpha-capital-review.md',
    'city-traders-imperium-review.md',
    'crypto-fund-trader-review.md',
    'fundednext-review.md',
    'funding-pips-review.md',
    'fxify-review.md',
    'lucid-trading-review.md',
    'maven-prop-firm-review.md',
    'ofp-funding-review.md',
    'tradeify-review.md',
  ]
  for (const file of reviewFiles) {
    if (!read(path.join(POSTS, file)).includes('href="/best-instant-funding-prop-firms"')) {
      rows.push(`${file}: missing contextual backlink to the instant-funding comparison`)
    }
  }
  for (const [file, label] of [
    [WHAT_IS_PROP_FIRM_GUIDE_FILE, 'what-is-a-prop-firm guide'],
    [PASSING_SERVICES_GUIDE_FILE, 'passing-services guide'],
  ]) {
    if (!read(file).includes('href="/best-instant-funding-prop-firms"')) {
      rows.push(`${label}: missing contextual backlink to the instant-funding comparison`)
    }
  }

  const ctiFile = path.join(POSTS, 'city-traders-imperium-review.md')
  const ctiRaw = read(ctiFile)
  const cti = ctiRaw ? matter(ctiRaw) : { data: {}, content: '' }
  const ctiProducts = loadChallenges('city-traders-imperium') ?? []
  if (cti.data.modified !== '2026-08-17 12:00:00') {
    rows.push('CTI review modified date must match the 4-product correction')
  }
  if (ctiProducts.length !== 4) {
    rows.push(`CTI review expects 4 product records, received ${ctiProducts.length}`)
  }
  const money = amount => `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
  for (const product of ctiProducts) {
    const match = cti.content.match(new RegExp(
      `<tr[^>]*\\bdata-cti-product-summary="${product.productSlug}"[^>]*>([\\s\\S]*?)<\\/tr>`,
      'i',
    ))
    if (!match) {
      rows.push(`${product.productName}: CTI product summary row is missing`)
      continue
    }
    const cells = cellTexts(match[1])
    const prices = product.accountSizes.flatMap(tier =>
      tier.priceUsd == null ? [] : [tier.priceUsd],
    )
    const expected = [
      product.productName,
      String(product.phases),
      String(product.accountSizes.length),
      `${money(Math.min(...prices))}–${money(Math.max(...prices))}`,
      product.profitTargets
        ? Object.values(product.profitTargets).join('% / ') + '%'
        : 'None',
      `${product.maxLossPct}% ${product.drawdownType}`,
      `${product.profitSplitPct}%`,
    ]
    if (JSON.stringify(cells) !== JSON.stringify(expected)) {
      rows.push(`${product.productName}: CTI summary does not match structured product data`)
    }
  }
  for (const staleClaim of [
    'Single 2-Step Challenge',
    'Single product line',
    'no Instant or 1-Step variants',
    '4.5/5 cluster',
    '70% standard, scaling up',
    'industry-typical paths',
    'due to CFTC restrictions',
  ]) {
    if (cti.content.includes(staleClaim)) {
      rows.push(`CTI review restored stale or unsupported copy: "${staleClaim}"`)
    }
  }
  for (const fragment of [
    '4 products and 23 priced tiers',
    'All 23 refundable fields remain unverified',
    '4.2/5 from 1,633 reviews',
    'Instant Funding and Direct Funding both set phases to 0',
  ]) {
    if (!cti.content.includes(fragment)) {
      rows.push(`CTI review is missing corrected evidence: "${fragment}"`)
    }
  }

  const crawler = read(RELEASE_CRAWL_FILE)
  for (const fragment of [
    "const instantLandingPath = '/best-instant-funding-prop-firms'",
    'expectedInstantFirms',
    'expectedInstantProductCount',
    'challenge.phases === 0',
    '10 firms and 19 products',
    'Products ${products.length}',
    'href="/go/fundednext?from=best-instant-funding-prop-firms"',
    'missing contextual instant-funding backlink',
    "const instantProgramProbePath = '/prop-firm-challenges?program=instant'",
    'canonical includes instant program state',
    "const ctiReviewPath = '/blog/city-traders-imperium-review'",
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing instant-funding safeguard: "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— Instant-funding landing and review cluster')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Keep the strongest converting review product-specific, disclosed, and attributable. */
function checkFundedNextAffiliatePath() {
  const rows = []
  const reviewFile = path.join(POSTS, 'fundednext-review.md')
  const ftmoReviewFile = path.join(POSTS, 'ftmo-review.md')
  const reviewRaw = fs.existsSync(reviewFile) ? fs.readFileSync(reviewFile, 'utf-8') : ''
  const ftmoRaw = fs.existsSync(ftmoReviewFile) ? fs.readFileSync(ftmoReviewFile, 'utf-8') : ''
  const parsed = reviewRaw ? matter(reviewRaw) : { data: {}, content: '' }
  const challenges = loadChallenges('fundednext') ?? []

  if (challenges.length !== 4) {
    rows.push(`FundedNext product-fit table expects 4 current products, received ${challenges.length}`)
  }
  const pricedTierCount = challenges.reduce(
    (total, challenge) => total + challenge.accountSizes.filter(
      tier => tier.priceUsd != null,
    ).length,
    0,
  )
  if (pricedTierCount !== 22) {
    rows.push(`FundedNext product-fit table expects 22 priced tiers, received ${pricedTierCount}`)
  }

  const refundText = new Map([
    ['stellar-2-step', 'first approved reward'],
    ['stellar-1-step', 'third approved reward'],
    ['stellar-lite', 'third approved reward'],
    ['stellar-instant', 'no refund'],
  ])
  for (const challenge of challenges) {
    const rowMatches = [...parsed.content.matchAll(new RegExp(
      `<tr[^>]*\\bdata-fundednext-product-fit="${challenge.productSlug}"[^>]*>([\\s\\S]*?)<\\/tr>`,
      'gi',
    ))]
    if (rowMatches.length !== 1) {
      rows.push(`${challenge.productName}: expected exactly 1 product-fit row`)
      continue
    }
    const rowText = stripTags(rowMatches[0][1]).replace(/\s+/g, ' ').trim()
    const cheapest = challenge.accountSizes
      .filter(tier => tier.priceUsd != null)
      .sort((a, b) => a.priceUsd - b.priceUsd)[0]
    if (!cheapest) {
      rows.push(`${challenge.productName}: no priced tier available for product-fit row`)
      continue
    }
    const price = `$${cheapest.priceUsd.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(cheapest.priceUsd) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
    const size = `$${cheapest.sizeUsd / 1000}K`
    const expectedFragments = [
      challenge.productName,
      price,
      size,
      challenge.dailyLossPct == null ? 'No daily cap' : `${challenge.dailyLossPct}% daily`,
      `${challenge.maxLossPct}%`,
      challenge.drawdownType,
      challenge.payoutFirstDays === 0 ? 'On demand' : `${challenge.payoutFirstDays}`,
      refundText.get(challenge.productSlug),
    ]
    for (const fragment of expectedFragments) {
      if (fragment && !rowText.includes(fragment)) {
        rows.push(`${challenge.productName}: product-fit row is missing ${fragment}`)
      }
    }
  }
  if ((parsed.content.match(/data-fundednext-product-fit=/g) ?? []).length !== 4) {
    rows.push('FundedNext verdict must keep exactly 4 attributed product-fit rows')
  }

  for (const fragment of [
    'data-fundednext-conversion="product-fit"',
    'data-affiliate-placement="product-fit"',
    'href="/go/fundednext"',
    'partnership contributes 0 points',
    'href="/compare/ftmo-vs-fundednext"',
  ]) {
    if (!parsed.content.includes(fragment)) {
      rows.push(`FundedNext review is missing conversion safeguard: ${fragment}`)
    }
  }
  if (parsed.data.modified !== '2026-08-27') {
    rows.push('FundedNext review modified date must match the product-fit review date')
  }
  if (!ftmoRaw.includes('href="/compare/ftmo-vs-fundednext"')) {
    rows.push('FTMO review is missing its contextual link to the FundedNext comparison')
  }

  const decorator = fs.readFileSync(path.join(ROOT, 'lib/postOutboundLinks.ts'), 'utf-8')
  for (const fragment of [
    'export function postBodyCampaign',
    'data-affiliate-placement',
    'postBodyCampaign(routeSlug, placement)',
  ]) {
    if (!decorator.includes(fragment)) {
      rows.push(`post-body attribution is missing placement safeguard: ${fragment}`)
    }
  }

  const crawler = fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
  for (const fragment of [
    "const fundedNextReviewPath = '/blog/fundednext-review'",
    'post-body-fundednext-review-product-fit',
    'data-fundednext-product-fit=',
    "'/go/fundednext?from=post-body-fundednext-review-product-fit'",
    "searchParams.get('fpr') !== 'karlis56'",
    "searchParams.get('utm_campaign')",
  ]) {
    if (!crawler.includes(fragment)) {
      rows.push(`release crawl is missing FundedNext conversion safeguard: ${fragment}`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— FundedNext product and affiliate path')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Keep the FTMO practice guide tied to current FTMO and FundedNext sources. */
function checkFtmoFreeTrialGuide() {
  const rows = []
  if (!fs.existsSync(FTMO_FREE_TRIAL_GUIDE_FILE)) {
    console.log('\n✗ FTMO Free Trial guide')
    console.log('  · content/posts/ftmo-free-trial-explained.md is missing')
    return 1
  }
  if (!fs.existsSync(FREE_TRIAL_DATA_FILE)) {
    console.log('\n✗ FTMO Free Trial guide')
    console.log('  · content/data/free-trials.json is missing')
    return 1
  }

  const captures = JSON.parse(fs.readFileSync(FREE_TRIAL_DATA_FILE, 'utf-8'))
  const { data, content } = matter(
    fs.readFileSync(FTMO_FREE_TRIAL_GUIDE_FILE, 'utf-8'),
  )
  const ftmo = captures.find(capture => capture.firmSlug === 'ftmo')
  const fundedNext = captures.find(capture => capture.firmSlug === 'fundednext')
  const captureSlugs = captures.map(capture => capture.firmSlug)
  if (
    captures.length !== 2 ||
    new Set(captureSlugs).size !== 2 ||
    !ftmo ||
    !fundedNext
  ) {
    rows.push('free-trial data must contain exactly 1 FTMO and 1 FundedNext record')
  }

  for (const capture of captures) {
    let source
    try {
      source = new URL(capture.sourceUrl)
    } catch {
      rows.push(`${capture.firmSlug} free-trial sourceUrl is invalid`)
      continue
    }
    const expectedHost = capture.firmSlug === 'ftmo'
      ? 'ftmo.com'
      : 'help.fundednext.com'
    if (source.hostname !== expectedHost) {
      rows.push(`${capture.firmSlug} free-trial source must use ${expectedHost}`)
    }
    const capturedAt = new Date(`${capture.sourceCapturedAt}T00:00:00Z`)
    const age = Math.floor((TODAY - capturedAt) / 86400000)
    if (Number.isNaN(capturedAt.getTime()) || age < 0 || age > STALE_DAYS) {
      rows.push(`${capture.firmSlug} free-trial capture is invalid or older than ${STALE_DAYS} days`)
    }
  }

  if (data.title !== 'FTMO Free Trial 2026: 1-Step vs 2-Step Rules') {
    rows.push('title must preserve FTMO Free Trial, year, and both product intents')
  }
  if (data.seoTitle !== 'FTMO Free Trial 2026: Rules & 14-Day Test Plan') {
    rows.push('seoTitle no longer states rules and the 14-day test intent')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (data.modified !== ftmo?.sourceCapturedAt || data.modified !== fundedNext?.sourceCapturedAt) {
    rows.push('guide modified date must equal both free-trial capture dates')
  }

  const tableText = (attribute, value) => {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = content.match(
      new RegExp(`<table[^>]*\\b${attribute}="${escaped}"[^>]*>([\\s\\S]*?)<\\/table>`, 'i'),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (ftmo) {
    const paid = loadChallenges('ftmo') ?? []
    const trialOneStep = ftmo.products.find(
      product => product.productSlug === 'ftmo-free-trial-1-step',
    )
    const trialTwoStep = ftmo.products.find(
      product => product.productSlug === 'ftmo-free-trial-2-step',
    )
    const paidOneStep = paid.find(
      product => product.productSlug === trialOneStep?.mapsToChallenge,
    )
    const paidTwoStep = paid.find(
      product => product.productSlug === trialTwoStep?.mapsToChallenge,
    )
    for (const [label, trial, challenge] of [
      ['1-Step', trialOneStep, paidOneStep],
      ['2-Step', trialTwoStep, paidTwoStep],
    ]) {
      if (!trial || !challenge) {
        rows.push(`${label} trial-to-paid product mapping is missing`)
        continue
      }
      if (
        trial.dailyLossPct !== challenge.dailyLossPct ||
        trial.maxLossPct !== challenge.maxLossPct ||
        trial.drawdownType !== challenge.drawdownType ||
        trial.consistencyRulePct !== challenge.consistencyRulePct
      ) {
        rows.push(`${label} trial inherited risk fields drifted from its paid product`)
      }
    }
    if (
      ftmo.durationDays !== 14 ||
      ftmo.maxConcurrentAccounts !== 1 ||
      ftmo.maxAccountSizeUsd !== 200000 ||
      ftmo.passGrantsFunding !== false ||
      trialOneStep?.profitTargetPct !== 5 ||
      trialOneStep?.minTradingDays !== null ||
      trialTwoStep?.profitTargetPct !== 5 ||
      trialTwoStep?.minTradingDays !== 2
    ) {
      rows.push('FTMO structured duration, access, target, or minimum-day facts drifted')
    }
    expectFragments(
      'FTMO summary table',
      tableText('data-free-trial-summary', 'ftmo'),
      ['€0', '14 days', '1-Step', '2-Step', '5%', '1 active', '$200,000', ...ftmo.platforms],
    )
    expectFragments(
      'FTMO rule table',
      tableText('data-free-trial-rules', 'ftmo'),
      ['3%', '5%', '10% end-of-day trailing', '10% static', '50% Best Day', '2 days'],
    )
    const paidOneTier = paidOneStep?.accountSizes.find(tier => tier.sizeUsd === 100000)
    const paidTwoTier = paidTwoStep?.accountSizes.find(tier => tier.sizeUsd === 100000)
    expectFragments(
      'FTMO trial-to-paid table',
      tableText('data-free-trial-paid-comparison', 'ftmo'),
      [
        `€${paidOneTier?.priceEur}`,
        'non-refundable',
        `€${paidTwoTier?.priceEur}`,
        'refundable with first approved reward',
        `${paidOneStep?.profitTargets.phase1}%`,
        `${paidTwoStep?.profitTargets.phase1}% then ${paidTwoStep?.profitTargets.phase2}%`,
        `${paidTwoStep?.minTradingDays} minimum days per phase`,
      ],
    )
  }

  if (fundedNext) {
    if (
      fundedNext.durationDays !== 14 ||
      fundedNext.durationStarts !== 'first-trade' ||
      fundedNext.phases !== 1 ||
      fundedNext.profitTargetPct !== 5 ||
      fundedNext.minTradingDays !== 3 ||
      fundedNext.dailyLossPct !== 5 ||
      fundedNext.maxLossPct !== 10 ||
      fundedNext.eaAllowed !== false ||
      fundedNext.maxOpenPositions !== 30 ||
      fundedNext.resetAvailable !== false ||
      fundedNext.completionCoupon?.discountPct !== 5 ||
      fundedNext.completionCoupon?.validDays !== 14 ||
      fundedNext.completionCoupon?.newUsersOnly !== true ||
      fundedNext.completionCoupon?.appliesToResets !== false
    ) {
      rows.push('FundedNext structured trial or coupon facts drifted')
    }
    expectFragments(
      'FTMO versus FundedNext table',
      tableText('data-free-trial-comparison', 'ftmo-fundednext'),
      [
        `${fundedNext.durationDays} days from first trade`,
        `${fundedNext.profitTargetPct}% / ${fundedNext.minTradingDays} days`,
        `${fundedNext.dailyLossPct}% / ${fundedNext.maxLossPct}% maximum`,
        fundedNext.platforms.nonUs,
        fundedNext.platforms.us,
        `${fundedNext.completionCoupon.discountPct}% CFD-plan coupon`,
        `valid ${fundedNext.completionCoupon.validDays} days`,
      ],
    )
  }

  expectFragments('14-day test plan', tableText('data-free-trial-test-plan', '14-day'), [
    'Before Day 1',
    'Days 1–4',
    'Days 5–10',
    'Days 11–14',
    '0 unexplained dashboard differences',
    '0 hard-rule breaches',
  ])
  expectFragments('worked FTMO math', stripTags(content), [
    '$104,000',
    '$94,000',
    '$3,000 best day divided by $5,000',
    'equals 60%',
    'at least $6,000',
  ])

  const sectionNames = [
    'Verdict',
    'FTMO Free Trial quick facts',
    'FTMO 1-Step vs 2-Step Free Trial rules',
    'Worked rule examples on a $100K trial',
    'Free Trial vs paid FTMO Challenge',
    'A 14-day test plan that produces a decision',
    'FTMO Free Trial vs FundedNext Free Trial',
    'What a Free Trial can and cannot prove',
    'Frequently asked questions',
  ]
  let priorIndex = -1
  for (const section of sectionNames) {
    const index = content.indexOf(`<h2>${section}</h2>`)
    if (index < 0) rows.push(`missing H2 section "${section}"`)
    else if (index <= priorIndex) rows.push(`H2 section is out of order: "${section}"`)
    priorIndex = Math.max(priorIndex, index)
  }
  const faq = content.split('<h2>Frequently asked questions</h2>')[1] ?? ''
  if ((faq.match(/<h3>/g) ?? []).length !== 6) {
    rows.push('Free Trial guide must preserve 6 factual FAQs')
  }

  const requiredLinks = [
    '/go/ftmo',
    '/go/fundednext',
    '/blog/ftmo-review',
    '/blog/fundednext-review',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
    '/blog/what-is-prop-firm-consistency-rule',
    '/blog/what-is-overtrading',
    '/how-to-pass-a-prop-firm-challenge',
    '/true-cost-of-prop-firm-challenges',
    '/prop-firm-challenges',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }
  for (const [file, label] of [
    [path.join(POSTS, 'ftmo-review.md'), 'FTMO review'],
    [CHALLENGE_PASSING_PAGE_FILE, 'challenge-passing guide'],
  ]) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/ftmo-free-trial-explained')) {
      rows.push(`${label} is missing a backlink to the FTMO Free Trial guide`)
    }
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const rendered = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  const campaign = 'post-body-ftmo-free-trial-explained'
  const ftmoTag = rendered.match(
    new RegExp(`<a[^>]*href="/go/ftmo\\?from=${campaign}"[^>]*>`, 'i'),
  )?.[0] ?? ''
  const fundedNextTag = rendered.match(
    new RegExp(`<a[^>]*href="/go/fundednext\\?from=${campaign}"[^>]*>`, 'i'),
  )?.[0] ?? ''
  if (!ftmoTag.includes('rel="nofollow noopener"')) {
    rows.push('rendered FTMO trial link is not marked as a non-affiliate outbound link')
  }
  if (!fundedNextTag.includes('rel="sponsored nofollow noopener"')) {
    rows.push('rendered FundedNext trial link lacks affiliate attribution and disclosure')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('Free Trial guide contains a bare outbound URL instead of a controlled /go/ route')
  }

  const staleClaims = [
    'Minimum Trading Days:</strong> 5',
    '30 days (Phase 1) + 60 days',
    'Recent Updates (September 2025)',
    'biggest name in the prop firm space',
    'personal recommendation',
    'FTUK',
    'City Traders Imperium (CTI)',
    '2 free trials every 28 days',
    'perfect starting point',
  ]
  for (const claim of staleClaims) {
    if (content.toLowerCase().includes(claim.toLowerCase())) {
      rows.push(`stale Free Trial claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ FTMO Free Trial guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * FundingPips Zero is a product-level commercial guide, so every fee, rule,
 * worked amount, comparison, review aggregate, and affiliate path must remain
 * tied to the structured product records and their first-party captures.
 */
function checkFundingPipsZeroGuide() {
  const rows = []
  if (!fs.existsSync(FUNDINGPIPS_ZERO_GUIDE_FILE)) {
    console.log('\nâœ— FundingPips Zero guide')
    console.log('  Â· content/posts/fundingpips-zero.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(FUNDINGPIPS_ZERO_GUIDE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedMarkup = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match?.[1] ?? ''
  }
  const attributedText = (tag, attribute, key) =>
    stripTags(attributedMarkup(tag, attribute, key)).replace(/\s+/g, ' ').trim()
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }
  const amount = value =>
    value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  const money = value => `$${amount(value)}`
  const product = (firmSlug, productSlug) =>
    loadChallenges(firmSlug)?.find(challenge => challenge.productSlug === productSlug)
  const tier = (challenge, sizeUsd) =>
    challenge?.accountSizes.find(account => account.sizeUsd === sizeUsd)
  const captureProduct = (file, productSlug) => {
    const capture = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return capture.products?.find(candidate => candidate.productSlug === productSlug)
  }
  const evidenceText = capturedProduct => {
    if (!capturedProduct) return ''
    return [
      ...capturedProduct.accountSizes.flatMap(account =>
        Object.values(account).filter(value => typeof value === 'string'),
      ),
      ...Object.values(capturedProduct.fieldEvidence ?? {}).filter(
        value => typeof value === 'string',
      ),
      ...Object.values(capturedProduct.rules ?? {}).filter(
        value => typeof value === 'string',
      ),
      ...(capturedProduct.notes ?? []),
    ].join(' ')
  }

  if (data.title !== 'FundingPips Zero Review 2026: Fees, Rules, Payouts') {
    rows.push('title must preserve product, year, fee, rule, and payout intent')
  }
  if (data.seoTitle !== 'FundingPips Zero Review 2026: Fees, Rules, Payouts') {
    rows.push('seoTitle must preserve the primary product-review search intent')
  }
  if (typeof data.seoTitle !== 'string' || data.seoTitle.length > 60) {
    rows.push('seoTitle must stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (
    !Array.isArray(data.tags) ||
    !data.tags.includes('FundingPips Zero') ||
    !data.tags.includes('instant funding')
  ) {
    rows.push('tags must preserve FundingPips Zero and instant-funding intent')
  }

  const zero = product('fundingpips', 'zero')
  const instant = product('fundednext', 'stellar-instant')
  const zero10k = tier(zero, 10000)
  const zero100k = tier(zero, 100000)
  const instant10k = tier(instant, 10000)
  if (!zero) rows.push('FundingPips Zero structured product is missing')
  if (!instant) rows.push('FundedNext Stellar Instant structured product is missing')
  if (!zero10k || !zero100k) rows.push('FundingPips Zero $10K or $100K tier is missing')
  if (!instant10k) rows.push('FundedNext Stellar Instant $10K tier is missing')

  if (zero) {
    const fees = zero.accountSizes.map(account => account.priceUsd)
    expectFragments(
      'FundingPips Zero quick facts',
      attributedText('table', 'data-zero-facts', 'current'),
      [
        '0 evaluation phases; no evaluation profit target',
        `${money(Math.min(...fees))}–${money(Math.max(...fees))} across ${zero.accountSizes.length} tiers; all non-refundable`,
        `${zero.dailyLossPct}%`,
        `${zero.maxLossPct}% ${zero.drawdownType} from peak equity`,
        '1% combined floating Max Open Risk',
        `${zero.consistencyRulePct}% maximum Consistency Score`,
        `Every ${zero.payoutFirstDays} calendar days after the first executed trade; ${zero.payoutFrequency}`,
        `${zero.profitSplitPct}%`,
        zero.sourceCapturedAt,
      ],
    )
    if (zero.phases !== 0 || zero.profitTargets !== null) {
      rows.push('FundingPips Zero no-evaluation support drifted from challenge data')
    }
    if (zero.accountSizes.some(account => account.refundable !== false)) {
      rows.push('FundingPips Zero pricing is no longer uniformly non-refundable')
    }

    for (const account of zero.accountSizes) {
      expectFragments(
        `FundingPips Zero ${account.sizeUsd} price row`,
        attributedText('tr', 'data-zero-price', String(account.sizeUsd)),
        [
          `$${account.sizeUsd / 1000}K`,
          money(account.priceUsd),
          'No',
          zero.sourceCapturedAt,
        ],
      )
    }
  }

  const zeroCapture = captureProduct(
    path.join(CHALLENGES, '_captures/fundingpips-2026-08-27.json'),
    'zero',
  )
  const instantCapture = captureProduct(
    path.join(CHALLENGES, '_captures/fundednext-2026-07-27.json'),
    'stellar-instant',
  )
  const zeroEvidence = evidenceText(zeroCapture)
  const instantEvidence = evidenceText(instantCapture)
  for (const fragment of [
    'No evaluation: live from day one',
    'Daily Loss Limit 3%',
    'Max Trailing Loss Limit 5%',
    'Consistency Score 15% max',
    '95% profit split',
    'Every 14 calendar days after your first executed trade',
    'Max Open Risk is 1% combined floating loss',
    'Risk Per Trade Idea is 3% below $50K and 2% at $50K and above',
    'At least 7 profitable days of 0.25% or more',
    'a 3% safety cushion, and largest loss no greater than largest win',
    'A reset option at a 20% discount is now available for all account sizes',
    'No position may be opened, closed, or held within the restricted window',
    'All positions must be fully closed before market close on Friday',
  ]) {
    if (!zeroEvidence.includes(fragment)) {
      rows.push(`FundingPips Zero raw capture is missing: "${fragment}"`)
    }
  }
  for (const fragment of [
    'Stellar Instant has no daily loss limit',
    'Official FAQ: no consistency rule',
    '6% trailing maximum loss',
    'Tier 1 and Tier 2 start at 70%',
    'Weekend holding is allowed',
    'On-demand eligibility is available at the next EOD after 5% growth',
  ]) {
    if (!instantEvidence.includes(fragment)) {
      rows.push(`FundedNext Instant raw capture is missing: "${fragment}"`)
    }
  }

  if (zero100k && zero) {
    const startingLoss = zero100k.sizeUsd * (zero.maxLossPct / 100)
    const secondPeak = zero100k.sizeUsd * 1.02
    const lockPeak = zero100k.sizeUsd * 1.05
    expectFragments(
      'FundingPips Zero trailing-loss example',
      attributedText('table', 'data-zero-drawdown', '100k'),
      [
        money(zero100k.sizeUsd),
        money(startingLoss),
        money(zero100k.sizeUsd - startingLoss),
        money(secondPeak),
        money(secondPeak - startingLoss),
        money(lockPeak),
        `${money(zero100k.sizeUsd)}; floor locks`,
      ],
    )
    const dailyAmount = zero100k.sizeUsd * (zero.dailyLossPct / 100)
    const openRisk = zero100k.sizeUsd * 0.01
    const tradeIdeaRisk = zero100k.sizeUsd * 0.02
    expectFragments('FundingPips Zero independent risk controls', stripTags(content), [
      `${money(dailyAmount)} of daily room`,
      `${money(openRisk)} of combined floating loss`,
      `captured $100K figure is ${money(tradeIdeaRisk)}`,
      `smaller ${money(openRisk)} open-risk ceiling`,
    ])

    const profitableDay = zero100k.sizeUsd * 0.0025
    const safetyCushion = zero100k.sizeUsd * 0.03
    const minimumReward = zero100k.sizeUsd * 0.01
    expectFragments(
      'FundingPips Zero reward gates',
      attributedText('table', 'data-zero-reward-gates', '100k'),
      [
        `Every ${zero.payoutFirstDays} calendar days after the first trade`,
        '7 days of at least 0.25% in each rolling 30-day period',
        `Each qualifying day needs at least ${money(profitableDay)}`,
        `Score at or below ${zero.consistencyRulePct}%`,
        'full denominator is not recorded',
        '3% before reward eligibility',
        money(safetyCushion),
        'Largest loss cannot exceed largest win',
        '1% of account size',
        money(minimumReward),
      ],
    )
  }

  if (zero && instant && zero10k && instant10k) {
    const zeroEconomics = challengeTierEconomics(zero, zero10k)
    const instantEconomics = challengeTierEconomics(instant, instant10k)
    if (!zeroEconomics || !instantEconomics) {
      rows.push('instant-product fee-recovery economics are not calculable')
    } else {
      expectFragments(
        'FundingPips Zero versus FundedNext comparison',
        attributedText('table', 'data-zero-comparison', '10k-instant'),
        [
          `${money(zero10k.priceUsd)} / non-refundable`,
          `${money(instant10k.priceUsd)} / non-refundable`,
          `${zero.profitSplitPct}%`,
          `${instant.profitSplitPct}%`,
          money(Math.round(zeroEconomics.breakEvenProfit * 100) / 100),
          money(Math.round(instantEconomics.breakEvenProfit * 100) / 100),
          `${zero.dailyLossPct}%`,
          'Official FAQ records no daily loss limit',
          `${zero.maxLossPct}% ${zero.drawdownType}`,
          `${instant.maxLossPct}% ${instant.drawdownType}`,
          `${zero.consistencyRulePct}% maximum score`,
          'Official FAQ records no consistency rule',
          '20-minute hard-breach window',
          'Only 40% of profits count in the 10-minute window; full losses remain',
          zero.sourceCapturedAt,
          instant.sourceCapturedAt,
        ],
      )
      const feeDifference = instant10k.priceUsd - zero10k.priceUsd
      const splitDifference = zero.profitSplitPct - instant.profitSplitPct
      const drawdownDifference = instant.maxLossPct - zero.maxLossPct
      expectFragments('instant-product decision trade-off', stripTags(content), [
        `costs ${money(feeDifference)} more at $10K`,
        `starts ${splitDifference} percentage points lower on Reward Share`,
        `provides ${drawdownDifference} percentage point more trailing room`,
      ])
    }
    if (instant.dailyLossPct !== null || instant.consistencyRulePct !== null) {
      rows.push('FundedNext Instant comparison lost its null structured fields')
    }
  }

  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const fundingPipsFirm = firms.find(firm => firm.name === 'FundingPips')
  if (!fundingPipsFirm) {
    rows.push('FundingPips aggregate firm record is missing')
  } else {
    expectFragments('FundingPips review aggregate caveat', stripTags(content), [
      `${fundingPipsFirm.trustpilotScore}/5`,
      fundingPipsFirm.trustpilotCount.toLocaleString('en-US'),
      fundingPipsFirm.trustpilotCapturedAt,
      'third-party sentiment signal',
      'does not prove',
    ])
  }

  const fundingPipsChoice = attributedMarkup(
    'div',
    'data-zero-choice',
    'fundingpips',
  )
  const fundingPipsChoiceText = stripTags(fundingPipsChoice).replace(/\s+/g, ' ').trim()
  if (zero && zero10k) {
    expectFragments('FundingPips Zero commercial choice', fundingPipsChoiceText, [
      `current $10K list fee is ${money(zero10k.priceUsd)}`,
      `split is ${zero.profitSplitPct}%`,
      'fee is non-refundable',
      '1% open-risk',
      `${zero.consistencyRulePct}% consistency`,
      'news, weekend, and reward gates',
    ])
  }
  for (const href of ['/blog/funding-pips-review', '/go/fundingpips']) {
    if (!fundingPipsChoice.includes(`href="${href}"`)) {
      rows.push(`FundingPips Zero commercial choice is missing ${href}`)
    }
  }

  const fundedNextChoice = attributedMarkup(
    'div',
    'data-zero-choice',
    'fundednext',
  )
  const fundedNextChoiceText = stripTags(fundedNextChoice).replace(/\s+/g, ' ').trim()
  if (instant && instant10k) {
    expectFragments('FundedNext Instant alternative', fundedNextChoiceText, [
      `current $10K fee is ${money(instant10k.priceUsd)}`,
      `starting Reward Share is ${instant.profitSplitPct}%`,
      `${instant.maxLossPct}% ${instant.drawdownType} maximum loss`,
      'higher price, lower split, and news-window adjustment',
    ])
  }
  for (const href of ['/blog/fundednext-review', '/go/fundednext']) {
    if (!fundedNextChoice.includes(`href="${href}"`)) {
      rows.push(`FundedNext Instant alternative is missing ${href}`)
    }
  }

  const requiredLinks = [
    '/blog/funding-pips-review',
    '/best-instant-funding-prop-firms',
    '/how-prop-firm-challenges-work',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
    '/blog/what-is-overtrading',
    '/blog/what-is-prop-firm-consistency-rule',
    '/blog/is-prop-firm-trading-profitable',
    '/blog/fundednext-review',
    '/true-cost-of-prop-firm-challenges',
    '/prop-firm-challenge-changes',
    '/go/fundingpips',
    '/go/fundednext',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [path.join(POSTS, 'funding-pips-review.md'), 'FundingPips review'],
    [CONSISTENCY_GUIDE_FILE, 'consistency guide'],
    [CHALLENGE_LIFECYCLE_PAGE_FILE, 'challenge lifecycle pillar'],
    [TRUE_COST_PILLAR_FILE, 'true-cost pillar'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/fundingpips-zero')) {
      rows.push(`${label} is missing a FundingPips Zero backlink`)
    }
  }

  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  for (const firmSlug of ['fundingpips', 'fundednext']) {
    if (
      !renderedContent.includes(
        `href="/go/${firmSlug}?from=post-body-fundingpips-zero"`,
      )
    ) {
      rows.push(`rendered ${firmSlug} link lacks post-body attribution`)
    }
  }
  if (!renderedContent.includes('rel="sponsored nofollow noopener"')) {
    rows.push('rendered FundingPips Zero affiliate links lack sponsored disclosure')
  }

  const faqSection = content.split('<h2>Frequently asked questions</h2>')[1] ?? ''
  if ((faqSection.match(/<h3>/gi) ?? []).length !== 6) {
    rows.push('FundingPips Zero guide must preserve 6 factual FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('FundingPips Zero guide contains a bare external link')
  }

  const staleClaims = [
    'Quickest Way to Funding?',
    '$499 fee for the $100K account',
    '<td>$69</td>',
    '<td>$99</td>',
    '<td>$199</td>',
    '<td>$299</td>',
    '4.6</strong> on <strong>Trustpilot',
    '4.7</strong> on <strong>TFH',
    'most traders fail before seeing a payout',
    'payouts are real',
    'typically processed within 24',
    'Hot Seat',
    '100% payouts',
    'solid option',
    'one of the more reliable instant funding models',
    'no second chances or resets',
    'FundingPips-Zero-Trustpilot.jpg',
    'worth it, but only',
    'They pay traders',
    'strong presence',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale FundingPips Zero claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— FundingPips Zero guide')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/**
 * Passing-service copy must not promote vendors whose terms and prices cannot
 * be verified. Keep the page focused on captured firm restrictions, explicit
 * cash math, account-control risk, and alternatives sold by the firms.
 */
function checkPassingServicesGuide() {
  const rows = []
  if (!fs.existsSync(PASSING_SERVICES_GUIDE_FILE)) {
    console.log('\n✗ Passing-services guide')
    console.log('  · content/posts/are-prop-firm-passing-services-worth-it.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(PASSING_SERVICES_GUIDE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedText = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.title !== 'Prop Firm Passing Services: Rules, Costs and Risks (2026)') {
    rows.push('title must preserve passing-service, cost, risk, and current-year intent')
  }
  if (data.seoTitle !== 'Prop Firm Passing Services: Risks and Rules (2026)') {
    rows.push('seoTitle must preserve the passing-service risk intent')
  }
  if (data.seoTitle.length > 60) rows.push('seoTitle must stay at or below 60 characters')
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }
  if (!Array.isArray(data.tags) || !data.tags.includes('account sharing')) {
    rows.push('tags must preserve the account-sharing distinction')
  }

  const fundedNext = loadChallenges('fundednext') ?? []
  const fundedNextEvaluation = fundedNext.filter(challenge => challenge.phases > 0)
  const fundedNextInstant = fundedNext.find(challenge => challenge.phases === 0)
  const fundedNextRestricted = fundedNext.filter(
    challenge => challenge.rules.copyTrading === 'restricted',
  )
  const fundedNextDates = new Set(fundedNext.map(challenge => challenge.sourceCapturedAt))
  expectFragments(
    'FundedNext passing rules',
    attributedText('tr', 'data-passing-rule', 'fundednext'),
    [
      `All ${fundedNext.length} products`,
      `${fundedNextEvaluation.length} evaluation paths`,
      'same person’s challenge accounts',
      'prohibit funded-account copying',
      'Instant permits copying only between the same person’s Instant accounts',
      [...fundedNextDates][0],
    ],
  )
  const fundedNextCapture = fs.readFileSync(
    path.join(CHALLENGES, '_captures/fundednext-2026-07-27.json'),
    'utf-8',
  )
  if (
    fundedNextRestricted.length !== fundedNext.length ||
    fundedNextEvaluation.length !== 3 ||
    !fundedNextInstant ||
    fundedNextDates.size !== 1 ||
    !fundedNextCapture.includes('funded-account copying is prohibited') ||
    !fundedNextCapture.includes('same person')
  ) {
    rows.push('FundedNext copy restrictions or source evidence drifted')
  }

  const maven = loadChallenges('maven') ?? []
  const mavenCopyProhibited = maven.filter(
    challenge => challenge.rules.copyTrading === false,
  )
  const mavenEaProhibited = maven.filter(challenge => challenge.rules.ea === false)
  const mavenDates = new Set(maven.map(challenge => challenge.sourceCapturedAt))
  expectFragments(
    'Maven passing rules',
    attributedText('tr', 'data-passing-rule', 'maven'),
    [
      `All ${maven.length} products`,
      'copying from another individual',
      'both users breached',
      'EAs are not permitted',
      [...mavenDates][0],
    ],
  )
  const mavenCapture = fs.readFileSync(
    path.join(CHALLENGES, '_captures/maven-2026-08-11.json'),
    'utf-8',
  )
  if (
    maven.length !== 9 ||
    mavenCopyProhibited.length !== maven.length ||
    mavenEaProhibited.length !== maven.length ||
    mavenDates.size !== 1 ||
    !mavenCapture.includes('both users will be breached') ||
    !mavenCapture.includes('EAs are not permitted under any circumstances')
  ) {
    rows.push('Maven copy/EA restrictions or raw-capture support drifted')
  }

  const ofp = loadChallenges('ofp-funding') ?? []
  const ofpProhibited = ofp.filter(challenge => challenge.rules.copyTrading === false)
  const ofpDates = new Set(ofp.map(challenge => challenge.sourceCapturedAt))
  expectFragments(
    'OFP Funding passing rules',
    attributedText('tr', 'data-passing-rule', 'ofp-funding'),
    [
      `All ${ofp.length} captured products`,
      'internal and external mirroring',
      'same trader',
      'immediate account closure',
      [...ofpDates][0],
    ],
  )
  const ofpCapture = fs.readFileSync(
    path.join(CHALLENGES, '_captures/ofp-funding-2026-07-27.json'),
    'utf-8',
  )
  if (
    ofp.length !== 9 ||
    ofpProhibited.length !== ofp.length ||
    ofpDates.size !== 1 ||
    !ofpCapture.includes('Violation Consequence: Immediate account closure')
  ) {
    rows.push('OFP Funding prohibition or raw-capture support drifted')
  }

  const challengeFee = 100
  const serviceFee = 250
  const attempts = 3
  const refund = 100
  const challengeSpend = challengeFee * attempts
  const serviceSpend = serviceFee * attempts
  const totalPaid = challengeSpend + serviceSpend
  const netCost = totalPaid - refund
  const money = value => `$${value.toLocaleString('en-US')}`
  expectFragments(
    'three-attempt cost example',
    attributedText('table', 'data-passing-cost', 'three-attempt-hypothetical'),
    [
      `${attempts} × ${money(challengeFee)}`,
      money(challengeSpend),
      `${attempts} × ${money(serviceFee)}`,
      money(serviceSpend),
      `${money(challengeSpend)} + ${money(serviceSpend)}`,
      money(totalPaid),
      `−${money(refund)}`,
      `${money(totalPaid)} − ${money(refund)}`,
      `${money(netCost)} before any payout share or provider charge`,
    ],
  )

  if (fundedNextInstant) {
    const tier = fundedNextInstant.accountSizes.find(account => account.sizeUsd === 10000)
    expectFragments(
      'FundedNext Instant alternative',
      attributedText(
        'div',
        'data-passing-alternative',
        'fundednext:stellar-instant',
      ),
      [
        'simulated phase-0 product',
        '$10K',
        `$${tier.priceUsd}`,
        `${fundedNextInstant.profitSplitPct}% reward share`,
        `${fundedNextInstant.maxLossPct}% ${fundedNextInstant.drawdownType}`,
        'non-refundable',
        '5% growth',
        'end-of-day check',
      ],
    )
    if (
      tier.refundable !== false ||
      !fundedNextInstant.notes.some(note => note.includes('requires 5% account growth'))
    ) {
      rows.push('FundedNext Instant alternative lost its refund or payout-gate support')
    }
  }

  const requiredLinks = [
    '/blog/what-is-a-prop-firm',
    '/blog/what-is-copy-trading',
    '/blog/what-is-prop-firm-consistency-rule',
    '/how-prop-firm-challenges-work',
    '/blog/fundednext-review',
    '/blog/maven-prop-firm-review',
    '/blog/ofp-funding-review',
    '/prop-firms/copy-trading',
    '/true-cost-of-prop-firm-challenges',
    '/how-to-pass-a-prop-firm-challenge',
    '/blog/ftmo-free-trial-explained',
    '/prop-firm-challenges',
    '/best-instant-funding-prop-firms',
    '/prop-firm-challenge-changes',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [CHALLENGE_PASSING_PAGE_FILE, 'challenge-passing pillar'],
    [WHAT_IS_PROP_FIRM_GUIDE_FILE, 'prop-firm definition guide'],
    [COPY_TRADING_GUIDE_FILE, 'copy-trading guide'],
    [path.join(POSTS, 'is-prop-firm-trading-profitable.md'), 'profitability guide'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/are-prop-firm-passing-services-worth-it')) {
      rows.push(`${label} is missing a passing-services backlink`)
    }
  }

  if (!content.includes('href="/go/fundednext"')) {
    rows.push('FundedNext phase-0 CTA is missing its controlled /go/ route')
  }
  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-are-prop-firm-passing-services-worth-it"',
    ) ||
    !renderedContent.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('rendered FundedNext CTA lacks controlled attribution or disclosure')
  }

  if ((content.match(/<h3>/gi) ?? []).length !== 6) {
    rows.push('passing-services guide must preserve 6 factual FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('passing-services guide contains a bare external vendor link')
  }

  const staleClaims = [
    'Best Prop Firm Passing Services',
    'Seyoxx Trades',
    'Forex Green Pips',
    'Prop Firm Live Signals',
    'Pass My Prop Firms',
    'avoid IP detection',
    'designed to make you fail',
    'guarantee that they will pass',
    'much more competent than most traders',
    'get blacklisted',
    'Fiverr Gigs',
    'Trustpilot',
    '$7,000',
    '$1,460',
    '$3,500',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale passing-service claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Passing-services guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Copy-trading copy must distinguish software mechanics from investment
 * outcomes. Preserve the worked sizing math and current product-level prop
 * rules instead of restoring platform promotion or blanket legality claims.
 */
function checkCopyTradingGuide() {
  const rows = []
  if (!fs.existsSync(COPY_TRADING_GUIDE_FILE)) {
    console.log('\n✗ Copy-trading guide')
    console.log('  · content/posts/what-is-copy-trading.md is missing')
    return 1
  }

  const { data, content } = matter(fs.readFileSync(COPY_TRADING_GUIDE_FILE, 'utf-8'))
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attributedText = (tag, attribute, key) => {
    const match = content.match(
      new RegExp(
        `<${tag}[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence block is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.title !== 'What Is Copy Trading? How It Works and Its Risks (2026)') {
    rows.push('title must preserve copy-trading definition, risk, and current-year intent')
  }
  if (data.seoTitle !== 'What Is Copy Trading? How It Works and Risks (2026)') {
    rows.push('seoTitle must preserve the direct search intent')
  }
  if (data.seoTitle.length > 60) {
    rows.push('seoTitle must stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }

  const sourceEquity = 50000
  const followerEquity = 5000
  const sourceLots = 1
  const grossReturnPct = 5
  const performanceFeePct = 20
  const equityRatio = followerEquity / sourceEquity
  const followerLots = sourceLots * equityRatio
  const grossResult = followerEquity * grossReturnPct / 100
  const performanceFee = grossResult * performanceFeePct / 100
  const netResult = grossResult - performanceFee
  const money = value => `$${value.toLocaleString('en-US')}`
  expectFragments(
    'equity-proportional sizing example',
    attributedText('table', 'data-copy-math', 'equity-proportional'),
    [
      money(sourceEquity),
      money(followerEquity),
      equityRatio.toFixed(2),
      `${sourceLots.toFixed(2)} provider lot × ${equityRatio.toFixed(2)}`,
      `${followerLots.toFixed(2)} follower lot`,
      `hypothetical ${grossReturnPct}%`,
      money(grossResult),
      `${money(grossResult)} × ${performanceFeePct}%`,
      money(performanceFee),
      `${money(grossResult)} − ${money(performanceFee)}`,
      `${money(netResult)} before execution and other costs`,
    ],
  )

  const fxify = loadChallenges('fxify') ?? []
  const fxifyRestricted = fxify.filter(
    challenge => challenge.rules.copyTrading === 'restricted',
  )
  const fxifyProhibited = fxify.filter(
    challenge => challenge.rules.copyTrading === false,
  )
  const fxifyDates = new Set(fxify.map(challenge => challenge.sourceCapturedAt))
  expectFragments(
    'FXIFY copy rules',
    attributedText('tr', 'data-copy-rule', 'fxify'),
    [
      `${fxifyRestricted.length} restricted products`,
      `${fxifyProhibited.length} prohibited products`,
      `${fxifyRestricted.length} phase products`,
      'own-account copying',
      'approval',
      '30-day named statement',
      'Two Phase Pro',
      'both Instant products',
      'Lightning',
      [...fxifyDates][0],
    ],
  )
  if (
    fxify.length !== 8 ||
    fxifyDates.size !== 1 ||
    !fxifyRestricted.every(challenge =>
      challenge.notes.some(note =>
        note.includes("Copying between a trader's own FXIFY accounts is allowed"),
      ),
    ) ||
    !fxifyRestricted.every(challenge =>
      challenge.notes.some(note => note.includes('30-day named trading statement')),
    )
  ) {
    rows.push('FXIFY product counts or restricted-copy evidence drifted')
  }

  const ofp = loadChallenges('ofp-funding') ?? []
  const ofpProhibited = ofp.filter(challenge => challenge.rules.copyTrading === false)
  const ofpDates = new Set(ofp.map(challenge => challenge.sourceCapturedAt))
  expectFragments(
    'OFP Funding copy rules',
    attributedText('tr', 'data-copy-rule', 'ofp-funding'),
    [
      `all ${ofpProhibited.length} captured products`,
      'prohibited',
      'internal and external mirroring',
      'same trader',
      [...ofpDates][0],
    ],
  )
  if (ofp.length !== 9 || ofpProhibited.length !== ofp.length || ofpDates.size !== 1) {
    rows.push('OFP Funding product count, prohibition, or capture date drifted')
  }

  const requiredLinks = [
    '/blog/traders-connect-trade-copier',
    '/category/copy-trading',
    '/blog/what-is-overtrading',
    '/blog/fxify-review',
    '/blog/ofp-funding-review',
    '/prop-firms/copy-trading',
    '/prop-firm-challenge-changes',
    '/blog/are-prop-firm-passing-services-worth-it',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const featurePage = fs.readFileSync(
    path.join(ROOT, 'app/prop-firms/[feature]/page.tsx'),
    'utf-8',
  )
  if (
    !featurePage.includes("slug === 'copy-trading'") ||
    !featurePage.includes('href="/blog/what-is-copy-trading"')
  ) {
    rows.push('product-level copy-trading page is missing its contextual backlink')
  }

  const imagePath = path.join(
    ROOT,
    'public/images/wp/2025/06/copy-trading-final.jpg',
  )
  if (
    !fs.existsSync(imagePath) ||
    !content.includes('alt="One experienced trader sending copy-trade instructions to three follower accounts"')
  ) {
    rows.push('copy-trading explainer image or descriptive alt text is missing')
  }
  if ((content.match(/<img\b/gi) ?? []).length !== 1) {
    rows.push('copy-trading guide must preserve one relevant explainer image')
  }
  if ((content.match(/<h3>[^<]+<\/h3>/gi) ?? []).length !== 8) {
    rows.push('copy-trading guide must preserve 2 risk subsections and 6 FAQs')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('guide contains a bare external platform link')
  }

  const staleClaims = [
    'Grow Your AUM and Build Reputation',
    'one of the smartest ways',
    'earn without being a pro',
    'Win-win for both sides',
    'their capital is also tied to your account',
    'Scaling Without Extra Risk',
    'in most countries, it is allowed',
    'Copy trading is legal, and you can start',
    'the more people who copy your trades, the more your AUM',
    'chances are you’ll attract loyal followers',
    'capital.com',
    'etoro.com',
    'bitget.com',
    'avatrade.com',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale copy-trading claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Copy-trading guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * The definition guide is an entry point to the site's entire prop-firm topic
 * cluster. Its examples must show genuinely different product models without
 * restoring generic fees, invented business-model claims, or ambiguous funded
 * account language.
 */
function checkWhatIsPropFirmGuide() {
  const rows = []
  if (!fs.existsSync(WHAT_IS_PROP_FIRM_GUIDE_FILE)) {
    console.log('\n✗ What-is-a-prop-firm guide')
    console.log('  · content/posts/what-is-a-prop-firm.md is missing')
    return 1
  }

  const { data, content } = matter(
    fs.readFileSync(WHAT_IS_PROP_FIRM_GUIDE_FILE, 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rowText = key => {
    const match = content.match(
      new RegExp(
        `<tr[^>]*\\bdata-prop-firm-example="${escapeRegExp(key)}"[^>]*>([\\s\\S]*?)<\\/tr>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const product = (firmSlug, productSlug) => {
    const record = loadChallenges(firmSlug)?.find(
      challenge => challenge.productSlug === productSlug,
    )
    if (!record) rows.push(`${firmSlug}:${productSlug} is missing from challenge data`)
    return record
  }
  const amount = value => Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} example row is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.title !== 'What Is a Prop Firm? How Retail Funding Works (2026)') {
    rows.push('title must answer the definition intent and preserve the current year')
  }
  if (data.seoTitle !== data.title || data.seoTitle.length > 60) {
    rows.push('seoTitle must match the direct-answer title and stay at or below 60 characters')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }

  const challengeFiles = fs.readdirSync(CHALLENGES)
    .filter(file => file.endsWith('.json'))
  const phaseCounts = challengeFiles.flatMap(file =>
    JSON.parse(fs.readFileSync(path.join(CHALLENGES, file), 'utf-8'))
      .map(challenge => challenge.phases),
  )
  const minPhases = Math.min(...phaseCounts)
  const maxPhases = Math.max(...phaseCounts)
  if (!content.includes(`${minPhases} to ${maxPhases} evaluation phases`)) {
    rows.push('catalog phase range drifted from the structured challenge data')
  }

  const fundedNextTwoStep = product('fundednext', 'stellar-2-step')
  if (fundedNextTwoStep) {
    const tier = fundedNextTwoStep.accountSizes.find(account => account.sizeUsd === 100000)
    expectFragments(
      'FundedNext Stellar 2-Step',
      rowText('fundednext:stellar-2-step'),
      [
        '$100K',
        `$${amount(tier.priceUsd)}`,
        'refundable',
        `${fundedNextTwoStep.phases} phases`,
        `${fundedNextTwoStep.profitTargets.phase1}% then ${fundedNextTwoStep.profitTargets.phase2}%`,
        `${fundedNextTwoStep.dailyLossPct}% daily`,
        `${fundedNextTwoStep.maxLossPct}% ${fundedNextTwoStep.drawdownType}`,
        `${fundedNextTwoStep.profitSplitPct}%`,
        `${fundedNextTwoStep.payoutFirstDays} days`,
        '14 days',
        fundedNextTwoStep.sourceCapturedAt,
      ],
    )
    if (
      tier.refundable !== true ||
      !fundedNextTwoStep.notes.some(note =>
        note.includes('refundable with the first approved Performance Reward'),
      )
    ) {
      rows.push('FundedNext 2-Step first-reward refund lost its capture support')
    }
  }

  const fundedNextInstant = product('fundednext', 'stellar-instant')
  if (fundedNextInstant) {
    const tier = fundedNextInstant.accountSizes.find(account => account.sizeUsd === 10000)
    expectFragments(
      'FundedNext Stellar Instant',
      rowText('fundednext:stellar-instant'),
      [
        '$10K',
        `$${amount(tier.priceUsd)}`,
        'non-refundable',
        `${fundedNextInstant.phases} phases`,
        `${fundedNextInstant.maxLossPct}% ${fundedNextInstant.drawdownType}`,
        'no daily-loss percentage captured',
        `${fundedNextInstant.profitSplitPct}%`,
        '5% growth',
        fundedNextInstant.sourceCapturedAt,
      ],
    )
    if (
      tier.refundable !== false ||
      fundedNextInstant.dailyLossPct !== null ||
      !fundedNextInstant.notes.some(note => note.includes('requires 5% account growth'))
    ) {
      rows.push('FundedNext Instant refund, daily-loss, or payout-gate support drifted')
    }
  }

  const ftmo = product('ftmo', 'ftmo-challenge-2-step')
  if (ftmo) {
    const tier = ftmo.accountSizes.find(account => account.sizeUsd === 100000)
    expectFragments(
      'FTMO 2-Step',
      rowText('ftmo:ftmo-challenge-2-step'),
      [
        '$100K',
        `€${amount(tier.priceEur)}`,
        'refundable',
        `${ftmo.phases} phases`,
        `${ftmo.profitTargets.phase1}% then ${ftmo.profitTargets.phase2}%`,
        `${ftmo.dailyLossPct}% daily`,
        `${ftmo.maxLossPct}% ${ftmo.drawdownType}`,
        `${ftmo.minTradingDays} minimum days`,
        `${ftmo.profitSplitPct}%`,
        `${ftmo.payoutFirstDays} days`,
        ftmo.sourceCapturedAt,
      ],
    )
    const rawCapture = fs.readFileSync(
      path.join(CHALLENGES, '_captures/ftmo-2026-07-27.json'),
      'utf-8',
    )
    if (
      tier.refundable !== true ||
      !rawCapture.includes('the paid fee is refunded with your first Reward withdrawal')
    ) {
      rows.push('FTMO 2-Step first-reward refund lost its raw-capture support')
    }
  }

  const topstep = product('topstep', 'trading-combine-standard-path')
  if (topstep) {
    const tier = topstep.accountSizes.find(account => account.sizeUsd === 100000)
    expectFragments(
      'Topstep Standard Path',
      rowText('topstep:trading-combine-standard-path'),
      [
        '$100K',
        `$${amount(tier.priceUsd)} monthly`,
        `$${amount(topstep.activationFeeUsd)} activation`,
        `${topstep.phases} phase`,
        `${topstep.profitTargets.phase1}% target`,
        '$3,000 end-of-day trailing',
        `${topstep.profitSplitPct}%`,
        `${topstep.payoutFirstDays} trading days`,
        '5 winning days',
        '$150',
        topstep.sourceCapturedAt,
      ],
    )
    if (
      !topstep.notes.some(note => note.includes('rebills monthly until you pass')) ||
      !topstep.notes.some(note => note.includes("'$100K' -> '$3,000'")) ||
      !topstep.notes.some(note => note.includes('five (5) $150 winning trading days'))
    ) {
      rows.push('Topstep subscription, loss, or payout-path support drifted')
    }
  }

  const requiredLinks = [
    '/prop-firms',
    '/how-prop-firm-challenges-work',
    '/prop-firm-challenges',
    '/blog/fundednext-review',
    '/blog/ftmo-review',
    '/blog/topstep-review',
    '/true-cost-of-prop-firm-challenges',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
    '/blog/what-is-prop-firm-consistency-rule',
    '/how-to-pass-a-prop-firm-challenge',
    '/prop-firm-challenge-changes',
    '/prop-firm-discount-codes',
    '/best-instant-funding-prop-firms',
    '/blog/are-prop-firm-passing-services-worth-it',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }

  const backlinkFiles = [
    [path.join(ROOT, 'components/navLinks.ts'), 'Learn navigation'],
    [CHALLENGE_LIFECYCLE_PAGE_FILE, 'challenge lifecycle'],
    [SCALING_PLAN_GUIDE_FILE, 'scaling guide'],
  ]
  for (const [file, label] of backlinkFiles) {
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    if (!source.includes('/blog/what-is-a-prop-firm')) {
      rows.push(`${label} is missing a backlink to the definition guide`)
    }
  }

  if (!content.includes('href="/go/fundednext"')) {
    rows.push('FundedNext CTA is missing its controlled /go/ route')
  }
  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-what-is-a-prop-firm"',
    ) ||
    !renderedContent.includes('rel="sponsored nofollow noopener"')
  ) {
    rows.push('rendered FundedNext CTA lacks controlled attribution or disclosure')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('guide contains a bare outbound URL instead of a controlled internal route')
  }

  const staleClaims = [
    'The Best Source of Funding',
    'one of the most popular and quickest sources',
    'retail trailer',
    'the primary revenue of any prop trading firm',
    'your profits are not real',
    'make you fail',
    'can always pass prop firm challenges with ease',
    'their savior',
    'Impatient Traders',
    'you won’t regret',
    'arguably the best way to go',
    'paid $500 for it',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale definition claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ What-is-a-prop-firm guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/**
 * Scaling copy previously mixed firm ceilings, base product splits, paid
 * add-ons, and unsupported milestone schedules. Keep the replacement table
 * tied to the aggregate and product records instead of letting those figures
 * drift back into an unsourced ranking.
 */
function checkScalingPlanGuide() {
  const rows = []
  if (!fs.existsSync(SCALING_PLAN_GUIDE_FILE)) {
    console.log('\n✗ Scaling-plan guide')
    console.log('  · content/posts/prop-firm-scaling-plan.md is missing')
    return 1
  }

  const { data, content } = matter(fs.readFileSync(SCALING_PLAN_GUIDE_FILE, 'utf-8'))
  const firms = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf-8'),
  )
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rowText = slug => {
    const match = content.match(
      new RegExp(
        `<tr[^>]*\\bdata-scaling-evidence="${escapeRegExp(slug)}"[^>]*>([\\s\\S]*?)<\\/tr>`,
        'i',
      ),
    )
    return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : ''
  }
  const expectFragments = (label, text, fragments) => {
    if (!text) {
      rows.push(`${label} evidence row is missing`)
      return
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) rows.push(`${label} is missing "${fragment}"`)
    }
  }

  if (data.seoTitle !== 'Prop Firm Scaling Plans Explained (2026)') {
    rows.push('seoTitle must preserve scaling-plan intent and current year')
  }
  if (
    typeof data.seoDescription !== 'string' ||
    data.seoDescription.length < 120 ||
    data.seoDescription.length > 160
  ) {
    rows.push('seoDescription must be between 120 and 160 characters')
  }

  const specs = [
    {
      slug: 'fundednext',
      name: 'FundedNext',
      splitFragments: ['80%', '3 evaluations', '70%', 'Instant'],
      countFragments: [[80, 3], [70, 1]],
      nullCount: 0,
    },
    {
      slug: 'ftmo',
      name: 'FTMO',
      splitFragments: ['80%', '2-Step', '90%', '1-Step'],
      countFragments: [[80, 1], [90, 1]],
      nullCount: 0,
    },
    {
      slug: 'fundingpips',
      name: 'FundingPips',
      splitFragments: ['80%', '85%', '95%', 'selected payout structure'],
      countFragments: [[80, 1], [85, 1], [95, 1]],
      nullCount: 2,
    },
    {
      slug: 'fxify',
      name: 'FXIFY',
      splitFragments: ['80%', '5 phase products', 'unstated on 3 products'],
      countFragments: [[80, 5]],
      nullCount: 3,
    },
  ]

  for (const spec of specs) {
    const firm = firms.find(candidate => candidate.name === spec.name)
    const challenges = loadChallenges(spec.slug)
    if (!firm || !challenges) {
      rows.push(`${spec.name} aggregate or challenge data is missing`)
      continue
    }
    const text = rowText(spec.slug)
    expectFragments(spec.name, text, [
      firm.maxAllocation,
      firm.lastUpdated,
      ...spec.splitFragments,
    ])
    for (const [split, expectedCount] of spec.countFragments) {
      const actualCount = challenges.filter(challenge => challenge.profitSplitPct === split).length
      if (actualCount !== expectedCount) {
        rows.push(
          `${spec.name} challenge data now has ${actualCount} products at ${split}%, expected ${expectedCount}; refresh the guide`,
        )
      }
    }
    const actualNullCount = challenges.filter(
      challenge => challenge.profitSplitPct == null,
    ).length
    if (actualNullCount !== spec.nullCount) {
      rows.push(
        `${spec.name} challenge data now has ${actualNullCount} unstated base splits, expected ${spec.nullCount}; refresh the guide`,
      )
    }
    const captureDates = new Set(challenges.map(challenge => challenge.sourceCapturedAt))
    if (captureDates.size !== 1 || !captureDates.has(firm.lastUpdated)) {
      rows.push(`${spec.name} aggregate and challenge record dates no longer align`)
    }
  }

  const requiredLinks = [
    '/how-prop-firm-challenges-work',
    '/true-cost-of-prop-firm-challenges',
    '/how-to-pass-a-prop-firm-challenge',
    '/blog/what-is-prop-firm-consistency-rule',
    '/prop-firm-challenges',
    '/prop-firm-challenge-changes',
    '/blog/fundednext-review',
    '/blog/ftmo-review',
    '/blog/funding-pips-review',
    '/blog/fxify-review',
  ]
  for (const href of requiredLinks) {
    if (!content.includes(`href="${href}"`)) rows.push(`missing internal link to ${href}`)
  }
  if (!content.includes('href="/go/fundednext"')) {
    rows.push('FundedNext CTA is missing its controlled /go/ route')
  }
  const renderedContent = decoratePostOutboundLinks(
    content,
    buildOutboundRelationships(firms),
    data.slug,
  )
  if (
    !renderedContent.includes(
      'href="/go/fundednext?from=post-body-prop-firm-scaling-plan"',
    )
  ) {
    rows.push('rendered FundedNext CTA is missing post-body attribution')
  }
  if (!renderedContent.includes('rel="sponsored nofollow noopener"')) {
    rows.push('rendered FundedNext CTA is missing sponsored and nofollow disclosure')
  }
  if (/href="https?:\/\//i.test(content)) {
    rows.push('guide contains a bare outbound URL instead of a /go/ route')
  }

  const staleClaims = [
    'Top 5 Prop Firms with the Best Scaling Plans',
    'allows you to scale all the way up to $4 million',
    'personal favorite',
    'lost the account in a day',
    'gold standard',
    'Hot Seat',
    'E8X dashboard',
    'https://fundednext.com/blog',
  ]
  const lowerContent = content.toLowerCase()
  for (const claim of staleClaims) {
    if (lowerContent.includes(claim.toLowerCase())) {
      rows.push(`unsupported or stale scaling claim returned: "${claim}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Scaling-plan guide')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep the highest-intent FundedNext matchup current and attributable. */
function checkFundedNextComparisonOverlay() {
  const rows = []
  const comparisons = fs.existsSync(COMPARISONS_FILE)
    ? fs.readFileSync(COMPARISONS_FILE, 'utf-8')
    : ''
  const overlayMatch = comparisons.match(
    /'ftmo-vs-fundednext':\s*\{([\s\S]*?)\n\s*\},\n\n\s*'ftmo-vs-fundingpips':/,
  )
  const overlayText = overlayMatch?.[1] ?? ''
  if (!overlayText) {
    rows.push('ftmo-vs-fundednext overlay source block is missing')
  } else {
    const ftmo = loadChallenges('ftmo') ?? []
    const fundedNext = loadChallenges('fundednext') ?? []
    const product = (challenges, slug) =>
      challenges.find(challenge => challenge.productSlug === slug)
    const tier = (challenge, sizeUsd) =>
      challenge?.accountSizes.find(account => account.sizeUsd === sizeUsd)

    const ftmoTwoStep = product(ftmo, 'ftmo-challenge-2-step')
    const ftmoOneStep = product(ftmo, 'ftmo-challenge-1-step')
    const stellarTwoStep = product(fundedNext, 'stellar-2-step')
    const stellarOneStep = product(fundedNext, 'stellar-1-step')
    const stellarLite = product(fundedNext, 'stellar-lite')
    const stellarInstant = product(fundedNext, 'stellar-instant')
    const latestCapture = [...ftmo, ...fundedNext]
      .map(challenge => challenge.sourceCapturedAt)
      .sort()
      .at(-1)

    const reviewedAt = overlayText.match(/\breviewedAt:\s*'([^']+)'/)?.[1]
    const challengeReviewedAt = overlayText.match(/\bchallengeReviewedAt:\s*'([^']+)'/)?.[1]
    if (
      !reviewedAt
      || !challengeReviewedAt
      || reviewedAt < latestCapture
      || challengeReviewedAt < latestCapture
    ) {
      rows.push('ftmo-vs-fundednext editorial and challenge review dates are not current')
    }
    const metaDescription = overlayText.match(/metaDescription:\s*\n\s*'([^']+)'/)?.[1] ?? ''
    if (metaDescription.length < 120 || metaDescription.length > 160) {
      rows.push('ftmo-vs-fundednext meta description must be between 120 and 160 characters')
    }
    const categoryCount = (overlayText.match(/\{ category:/g) ?? []).length
    const faqCount = (overlayText.match(/\{ q:/g) ?? []).length
    if (categoryCount !== 7 || faqCount !== 5) {
      rows.push('ftmo-vs-fundednext must preserve 7 category calls and 5 factual FAQs')
    }

    const expectedFragments = [
      `${ftmo.length} evaluation products`,
      `${fundedNext.length} product paths`,
      `${ftmoOneStep.profitSplitPct}%`,
      `${stellarInstant.profitSplitPct}%`,
      `${ftmoTwoStep.payoutFirstDays} days`,
      `${stellarOneStep.payoutFirstDays} days`,
      `${stellarTwoStep.payoutFirstDays} days`,
      `€${tier(ftmoTwoStep, 100000).priceEur}`,
      `€${tier(ftmoOneStep, 100000).priceEur}`,
      `$${tier(stellarTwoStep, 100000).priceUsd}`,
      `$${tier(stellarOneStep, 100000).priceUsd}`,
      `$${tier(stellarLite, 100000).priceUsd}`,
      `${stellarOneStep.maxLossPct}% static`,
      `${ftmoOneStep.consistencyRulePct}% Best Day`,
    ]
    for (const fragment of expectedFragments) {
      if (!overlayText.includes(fragment)) {
        rows.push(`ftmo-vs-fundednext overlay is missing current fact "${fragment}"`)
      }
    }

    const staleClaims = [
      'FundedNext’s 95% standard split',
      'FundedNext scales to $4M',
      'limited to MT4 and MT5',
      'no country restrictions',
      '7–10 days sooner',
      'lowest probability of a payout dispute',
      'Both firms allow EAs, news trading',
    ]
    for (const claim of staleClaims) {
      if (overlayText.includes(claim)) rows.push(`stale matchup claim returned: "${claim}"`)
    }
  }

  const additionalOverlays = [
    {
      slug: 'fundednext-vs-fundingpips',
      nextSlug: 'ftmo-vs-fxify',
      categoryCount: 7,
      faqCount: 5,
      expected: [
        '9 captured products',
        '4 paths',
        '5 models',
        '$399.99',
        '$422',
        '5 days',
        '7 days',
        '12% static',
        '100% monthly',
        '95% on Zero',
        'fourth reward',
      ],
      stale: [
        '95% standard split',
        '$4M allocation',
        'zero minimum trading days',
        'FundingPips imposes 5',
        'FundingPips treats news-window profit normally',
      ],
    },
    {
      slug: 'fundednext-vs-fxify',
      nextSlug: 'fundingpips-vs-fxify',
      categoryCount: 7,
      faqCount: 5,
      expected: [
        '12 captured products',
        '4 paths',
        '8 products',
        '$399.99',
        '$399',
        '5 days',
        '7 days',
        '80%',
        '70%',
        'up to 90%',
        '40%',
        'DXTrade',
        'TradingView',
      ],
      stale: [
        '95% standard split',
        '$4M ceiling',
        'Both support on-demand payouts',
        'no country restrictions',
        'same on-demand, $4M, static-drawdown structure',
      ],
    },
  ]
  for (const spec of additionalOverlays) {
    const block = comparisons.match(
      new RegExp(
        `'${spec.slug}':\\s*\\{([\\s\\S]*?)\\n\\s*\\},\\n\\n\\s*'${spec.nextSlug}':`,
      ),
    )?.[1] ?? ''
    if (!block) {
      rows.push(`${spec.slug} overlay source block is missing`)
      continue
    }
    if (
      !block.includes("reviewedAt: '2026-08-14'") ||
      !block.includes("challengeReviewedAt: '2026-08-14'")
    ) {
      rows.push(`${spec.slug} review dates are not current`)
    }
    const metaDescription = block.match(/metaDescription:\s*\n\s*'([^']+)'/)?.[1] ?? ''
    if (metaDescription.length < 120 || metaDescription.length > 160) {
      rows.push(`${spec.slug} meta description must be between 120 and 160 characters`)
    }
    const categoryCount = (block.match(/\{ category:/g) ?? []).length
    const faqCount = (block.match(/\{ q:/g) ?? []).length
    if (categoryCount !== spec.categoryCount || faqCount !== spec.faqCount) {
      rows.push(
        `${spec.slug} must preserve ${spec.categoryCount} category calls and ${spec.faqCount} FAQs`,
      )
    }
    for (const fragment of spec.expected) {
      if (!block.includes(fragment)) rows.push(`${spec.slug} is missing "${fragment}"`)
    }
    for (const claim of spec.stale) {
      if (block.includes(claim)) rows.push(`${spec.slug} restored stale claim "${claim}"`)
    }
  }

  const hero = fs.existsSync(COMPARISON_HERO_FILE)
    ? fs.readFileSync(COMPARISON_HERO_FILE, 'utf-8')
    : ''
  const route = fs.existsSync(COMPARISON_ROUTE_FILE)
    ? fs.readFileSync(COMPARISON_ROUTE_FILE, 'utf-8')
    : ''
  const challengeMatchupComponent = fs.existsSync(CHALLENGE_MATCHUP_COMPONENT_FILE)
    ? fs.readFileSync(CHALLENGE_MATCHUP_COMPONENT_FILE, 'utf-8')
    : ''
  const challengeMatchupLib = fs.existsSync(CHALLENGE_MATCHUP_LIB_FILE)
    ? fs.readFileSync(CHALLENGE_MATCHUP_LIB_FILE, 'utf-8')
    : ''
  const releaseCrawl = fs.existsSync(RELEASE_CRAWL_FILE)
    ? fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
    : ''
  if (!hero.includes('from=compare-${campaign}')) {
    rows.push('comparison outbound links do not carry matchup-specific attribution')
  }
  if (!route.includes('campaign={canonical}')) {
    rows.push('comparison route does not pass its canonical matchup campaign')
  }
  for (const fragment of [
    'summaryA?: MatchupFirmSummary',
    'summaryB?: MatchupFirmSummary',
    'summary.productCount',
    'formatSplitRange(summary.profitSplits)',
    "summary.drawdownTypes.join(' / ')",
    'data-compare-firm={slug}',
  ]) {
    if (!hero.includes(fragment)) {
      rows.push(`comparison hero is missing product-summary contract "${fragment}"`)
    }
  }
  for (const fragment of [
    'profitSplits: number[]',
    'drawdownTypes: string[]',
    'productNames: string[]',
    'existing.productNames.push(challenge.productName)',
  ]) {
    if (!challengeMatchupLib.includes(fragment)) {
      rows.push(`challenge matchup is missing grouped evidence contract "${fragment}"`)
    }
  }
  if (!challengeMatchupComponent.includes("source.productNames.join(', ')")) {
    rows.push('challenge matchup sources do not name every product supported by a shared page')
  }
  for (const fragment of [
    'summaryA={challengeMatchup.hasData ? challengeMatchup.a : undefined}',
    'summaryB={challengeMatchup.hasData ? challengeMatchup.b : undefined}',
    'data-compare-conversion="ftmo-fundednext-final"',
    'data-affiliate-placement="compare-ftmo-vs-fundednext-final"',
    '/go/fundednext?from=compare-ftmo-vs-fundednext-final',
    '/go/ftmo?from=compare-ftmo-vs-fundednext-final',
    'href="/prop-firm-discount-codes"',
    'FundedNext is a partner; FTMO is not. Partnership does not change our verdict.',
    'Compare the live checkout totals and your card&apos;s FX cost before paying.',
  ]) {
    if (!route.includes(fragment)) {
      rows.push(`ftmo-vs-fundednext final decision path is missing "${fragment}"`)
    }
  }
  for (const fragment of [
    "const ftmoFundedNextPath = '/compare/ftmo-vs-fundednext'",
    'data-compare-firm="${set.slug}"',
    '/go/fundednext?from=compare-ftmo-vs-fundednext-final',
    "utm_campaign') !== 'compare-ftmo-vs-fundednext-final'",
  ]) {
    if (!releaseCrawl.includes(fragment)) {
      rows.push(`release crawl is missing ftmo-vs-fundednext safeguard "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ FundedNext commercial comparison')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Product captures must outrank firm aggregates on every comparison detail page. */
function checkComparisonDetailTemplate() {
  const rows = []
  const route = fs.existsSync(COMPARISON_ROUTE_FILE)
    ? fs.readFileSync(COMPARISON_ROUTE_FILE, 'utf-8')
    : ''
  const hero = fs.existsSync(COMPARISON_HERO_FILE)
    ? fs.readFileSync(COMPARISON_HERO_FILE, 'utf-8')
    : ''
  const verdict = fs.existsSync(COMPARISON_VERDICT_FILE)
    ? fs.readFileSync(COMPARISON_VERDICT_FILE, 'utf-8')
    : ''
  const comparisons = fs.existsSync(COMPARISONS_FILE)
    ? fs.readFileSync(COMPARISONS_FILE, 'utf-8')
    : ''
  const schema = fs.existsSync(SCHEMA_FILE)
    ? fs.readFileSync(SCHEMA_FILE, 'utf-8')
    : ''
  const crawl = fs.existsSync(RELEASE_CRAWL_FILE)
    ? fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
    : ''

  for (const fragment of [
    'const currentProductCount = challengeMatchup.a.productCount + challengeMatchup.b.productCount',
    'const currentSourceCount = challengeMatchup.sources.length',
    'this page withholds a product winner until both sides pass the 30-day freshness gate',
    "['Founded', 'Platforms', 'Assets', 'Payout Methods'].includes(row.label)",
    '.map(row => ({ ...row, winner: null }))',
    'comparisonItemListSchema(firmA, firmB, matchupLabel)',
    '<span>(2026): {challengeMatchup.a.productCount} vs {challengeMatchup.b.productCount} Products</span>',
    'without flattening one product into a firm-wide answer',
    "title={overlay ? 'Our verdict' : 'Evidence summary'}",
    '<ChallengeMatchup matchup={challengeMatchup} prose={matchupProse} />',
    'data-compare-firm-context',
    'data-compare-aggregate-fallback',
    'The sourced product tables above decide the exact fee, split, drawdown and trading conditions.',
  ]) {
    if (!route.includes(fragment)) {
      rows.push(`comparison detail template is missing "${fragment}"`)
    }
  }
  const verdictIndex = route.indexOf('<ComparisonVerdict')
  const productIndex = route.indexOf('<ChallengeMatchup')
  const contextIndex = route.indexOf('data-compare-firm-context')
  if (!(verdictIndex >= 0 && verdictIndex < productIndex && productIndex < contextIndex)) {
    rows.push('comparison detail hierarchy must be verdict, product evidence, then firm context')
  }
  for (const stale of [
    'ComparisonInfographic',
    'computeFallbackTlDr',
    'const aWins = rows.filter',
    'const [firstFirm, secondFirm]',
    'aria-label="Side-by-side specifications"',
  ]) {
    if (route.includes(stale)) rows.push(`comparison detail restored aggregate ranking "${stale}"`)
  }
  if (fs.existsSync(COMPARISON_INFOGRAPHIC_FILE)) {
    rows.push('aggregate comparison infographic still exists after product-first migration')
  }
  for (const stale of [
    'firm.profitSplitPct',
    'firm.payoutFrequency',
    'firm.drawdownType',
  ]) {
    if (hero.includes(stale)) rows.push(`comparison hero restored aggregate product term ${stale}`)
  }
  for (const fragment of [
    '`TFH ${firm.score}/10`',
    'Traders Fund Hub editorial score ${firm.score} out of 10',
    '<span className="feature-firm-stat-label">Product evidence</span>',
    '<span className="feature-firm-stat-value">Refreshing</span>',
  ]) {
    if (!hero.includes(fragment)) rows.push(`comparison hero is missing "${fragment}"`)
  }
  for (const fragment of [
    "import { FileCheck2, Trophy } from 'lucide-react'",
    "title = 'Our verdict'",
    'const Icon = categoryCalls?.length ? Trophy : FileCheck2',
    '<section className="compare-verdict" aria-label={title}>',
    '<h2 className="compare-verdict-title">{title}</h2>',
  ]) {
    if (!verdict.includes(fragment)) rows.push(`comparison summary is missing "${fragment}"`)
  }
  if (comparisons.includes('export function computeFallbackTlDr')) {
    rows.push('aggregate spec-win fallback verdict still exists')
  }
  if (
    !schema.includes('Callers pass canonical URL order, not an')
    || !schema.includes('ListItem position must not turn flattened firm fields into a ranking claim')
  ) {
    rows.push('comparison ItemList schema does not document neutral canonical ordering')
  }
  for (const fragment of [
    "const genericComparisonPath = '/compare/alpha-capital-vs-city-traders-imperium'",
    'generic comparison restored aggregate scoreboard or winner markup',
    'generic comparison ItemList is not in neutral canonical order',
    'editorial comparison restored aggregate scoreboard or winner markup',
    'comparison ItemList is not in neutral canonical order',
    'data-compare-firm-context="true"',
  ]) {
    if (!crawl.includes(fragment)) {
      rows.push(`release crawl is missing generic comparison safeguard "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Comparison detail hierarchy')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep the complete comparison library discoverable, searchable and evidence-led. */
function checkComparisonHub() {
  const rows = []
  const hub = fs.existsSync(COMPARISON_HUB_FILE)
    ? fs.readFileSync(COMPARISON_HUB_FILE, 'utf-8')
    : ''
  const directory = fs.existsSync(COMPARISON_DIRECTORY_FILE)
    ? fs.readFileSync(COMPARISON_DIRECTORY_FILE, 'utf-8')
    : ''
  const directoryLib = fs.existsSync(COMPARISON_DIRECTORY_LIB_FILE)
    ? fs.readFileSync(COMPARISON_DIRECTORY_LIB_FILE, 'utf-8')
    : ''
  const css = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf-8')
  const crawl = fs.existsSync(RELEASE_CRAWL_FILE)
    ? fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
    : ''

  for (const fragment of [
    'const ALL_PAIRS = getAllCanonicalPairs()',
    'freshChallenges(slug).length',
    'Prop Firm Comparisons (2026): ${ALL_PAIRS.length} Matchups',
    'Prop firm comparisons,',
    'pairEvidence(',
    'data-curated-matchup={slug}',
    'data-product-count={evidence.productCount}',
    'data-source-count={evidence.sourceCount}',
    'data-evidence-date={evidence.evidenceDate ?? undefined}',
    '<ComparisonDirectory rows={directoryRows} />',
    'href="/prop-firm-challenges"',
    'href="/cheapest-prop-firms"',
    'href="/prop-firm-challenge-changes"',
  ]) {
    if (!hub.includes(fragment)) {
      rows.push(`comparison hub is missing evidence/search contract "${fragment}"`)
    }
  }
  if (hub.includes('<Star') || hub.includes('★ {firmA.score}')) {
    rows.push('comparison hub restored score-only matchup evidence')
  }

  for (const fragment of [
    "'use client'",
    'type="search"',
    'aria-controls="comparison-directory-results"',
    'data-comparison-result-count',
    'filterComparisonRows(rows, query)',
    "trackSiteEvent('comparison_directory_search'",
    'query_length: normalizedQuery.length',
    'result_count: visible.length',
    'data-comparison-matchup={row.matchup}',
    'data-product-count={row.productCount}',
    'data-source-count={row.sourceCount}',
    'data-evidence-date={row.evidenceDate ?? undefined}',
    'Latest evidence <time',
  ]) {
    if (!directory.includes(fragment)) {
      rows.push(`comparison directory is missing interaction/evidence contract "${fragment}"`)
    }
  }
  if (directory.includes('query: normalizedQuery') || directory.includes('query: query')) {
    rows.push('comparison directory analytics must not send the raw search query')
  }
  for (const fragment of [
    'export function normalizeComparisonQuery',
    'export function filterComparisonRows',
    'normalizedQuery ? matchesQuery(row, normalizedQuery) : !row.editorial',
    'Number(b.editorial) - Number(a.editorial)',
  ]) {
    if (!directoryLib.includes(fragment)) {
      rows.push(`comparison search helper is missing "${fragment}"`)
    }
  }
  for (const fragment of [
    '.comparison-paths',
    '.comparison-directory-search',
    '.comparison-directory-count',
    '.comparison-directory-empty',
  ]) {
    if (!css.includes(fragment)) rows.push(`comparison hub CSS is missing ${fragment}`)
  }
  for (const fragment of [
    "const comparisonHubPath = '/compare'",
    'data-comparison-matchup',
    'data-curated-matchup',
    "filterComparisonRows(expectedSearchRows, 'FTMO FundedNext')",
    "filterComparisonRows(expectedSearchRows, 'FundedNext')",
    'comparison hub rendered ${matchupTags.size} unique matchup links',
    'href="/compare/ftmo-vs-fundednext"',
  ]) {
    if (!crawl.includes(fragment)) {
      rows.push(`release crawl is missing comparison-hub safeguard "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Comparison hub')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Keep dated trading-tool reviews honest, reciprocal and search-ready. */
function checkTradingToolReviewCluster() {
  const rows = []
  const posts = fs.readdirSync(POSTS)
    .filter(file => file.endsWith('.md') && !file.startsWith('_'))
    .map(file => {
      const { data, content } = matter(fs.readFileSync(path.join(POSTS, file), 'utf-8'))
      return { ...data, content }
    })
  const bySlug = new Map(posts.map(post => [post.slug, post]))
  const configuredSlugs = TRADING_TOOL_REVIEWS.map(review => review.slug)

  if (TRADING_TOOL_REVIEWS.length !== 5 || new Set(configuredSlugs).size !== 5) {
    rows.push('trading-tool cluster must contain 5 unique existing reviews')
  }

  for (const review of TRADING_TOOL_REVIEWS) {
    const post = bySlug.get(review.slug)
    if (!post) {
      rows.push(`${review.slug}: configured trading-tool review is missing`)
      continue
    }
    for (const field of ['title', 'seoTitle', 'excerpt', 'seoDescription', 'modified']) {
      if (!String(post[field] || '').trim()) {
        rows.push(`${review.slug}: missing ${field}`)
      }
    }
    if (post.title !== post.seoTitle || !post.title.includes(review.name)) {
      rows.push(`${review.slug}: visible and search titles must share the evergreen tool name`)
    }
    if (/\b20\d{2}\b/.test(`${post.title} ${post.seoTitle} ${post.excerpt}`)) {
      rows.push(`${review.slug}: title or deck contains a frozen marketing year`)
    }
    if (post.seoTitle.length > 60) {
      rows.push(`${review.slug}: search title is ${post.seoTitle.length} characters`)
    }
    if (post.seoDescription.length < 70 || post.seoDescription.length > 160) {
      rows.push(`${review.slug}: search description is ${post.seoDescription.length} characters`)
    }
    if (/\b(?:best and most popular|all you need|honest insights|worth it)\b/i.test(
      `${post.title} ${post.excerpt} ${post.seoDescription}`,
    )) {
      rows.push(`${review.slug}: search surface restored promotional filler`)
    }

    const selected = getTradingToolReviewLinks(review.slug, posts)
    const reversed = getTradingToolReviewLinks(review.slug, [...posts].reverse())
    const expected = configuredSlugs.filter(slug => slug !== review.slug)
    if (JSON.stringify(selected.map(item => item.slug)) !== JSON.stringify(expected)) {
      rows.push(`${review.slug}: reciprocal cluster does not contain the other 4 reviews`)
    }
    if (
      JSON.stringify(reversed.map(item => item.slug))
        !== JSON.stringify(selected.map(item => item.slug))
    ) {
      rows.push(`${review.slug}: reciprocal cluster depends on post input order`)
    }
  }

  const tradersConnect = bySlug.get('traders-connect-trade-copier')
  if (!tradersConnect) {
    rows.push('Traders Connect review is missing from the tool-review cluster')
  } else {
    const expectedTitle = 'Traders Connect Review: Pricing, Platforms & Risks'
    if (
      tradersConnect.title !== expectedTitle
      || tradersConnect.seoTitle !== expectedTitle
      || tradersConnect.modified !== '2026-08-18 12:00:00'
      || tradersConnect.sourceCapturedAt !== '2026-08-18'
    ) {
      rows.push('Traders Connect title or evidence dates disagree with the current review')
    }
    if (
      tradersConnect.seoTitle.length > 60
      || tradersConnect.seoDescription.length < 120
      || tradersConnect.seoDescription.length > 160
    ) {
      rows.push('Traders Connect search title or description is outside the editorial range')
    }
    for (const sourceUrl of [
      'https://tradersconnect.com/copier',
      'https://help.tradersconnect.com/en/article/pricing-1ty8n8e/',
      'https://help.tradersconnect.com/en/article/equity-protection-1j4jm9y/',
      'https://help.tradersconnect.com/en/article/advanced-settings-a296h8/',
      'https://tradersconnect.com/legal',
    ]) {
      if (!tradersConnect.sourceUrls?.includes(sourceUrl)) {
        rows.push(`Traders Connect frontmatter is missing first-party source ${sourceUrl}`)
      }
    }
    for (const token of [
      'data-tool-evidence-captured="2026-08-18"',
      'data-traders-connect-evidence="2026-08-18"',
      '10 listed: MT4, MT5, cTrader, MatchTrader, TradeLocker, DXtrade, NinjaTrader, Tradovate, ProjectX, Rithmic',
      'data-tool-pricing="cfd-premium"',
      '$10 per account monthly or $100 per account annually',
      'data-tool-pricing="futures"',
      'data-tool-pricing="analyzer"',
      'data-tool-pricing="dedicated-environment"',
      'Equity Protection is a beta control, not the firm\'s loss engine',
      'data-tool-compliance-warning="trade-identity"',
      'Do not use settings to disguise the origin of a trade.',
      '<strong>No vendor can grant that permission.</strong>',
      'data-traders-connect-test-plan="demo-first"',
      'href="/blog/what-is-copy-trading"',
      'href="/blog/are-prop-firm-passing-services-worth-it"',
      'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
      'href="/go/traders-connect"',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!tradersConnect.content.includes(token)) {
        rows.push(`Traders Connect review is missing evidence or decision token ${token}`)
      }
    }
    for (const stale of [
      'avoiding detection',
      'Keeps you invisible to prop firm detection systems',
      'without breaking prop firm rules',
      '20–30 milliseconds',
      '280 reviews',
      '4.6 out of 5',
      'one of the best copy-trading platforms',
      'Yes. You can use Trades Connect Trade Copier',
    ]) {
      if (tradersConnect.content.includes(stale)) {
        rows.push(`Traders Connect review restored unsafe or stale claim ${stale}`)
      }
    }
    const goLinks = [...tradersConnect.content.matchAll(/href=["'](\/go\/traders-connect[^"']*)/g)]
    if (
      goLinks.length !== 1
      || goLinks[0][1] !== '/go/traders-connect'
    ) {
      rows.push('Traders Connect review must have 1 attributed official CTA')
    }
    const renderedTradersConnect = decoratePostOutboundLinks(
      tradersConnect.content,
      { 'traders-connect': 'official' },
      tradersConnect.slug,
    )
    if (
      !renderedTradersConnect.includes(
        'href="/go/traders-connect?from=post-body-traders-connect-trade-copier-verdict"',
      )
      || !renderedTradersConnect.includes('rel="nofollow noopener"')
      || renderedTradersConnect.includes('rel="sponsored nofollow noopener"')
    ) {
      rows.push('Traders Connect rendered CTA lacks controlled verdict attribution or disclosure')
    }
  }

  const fxReplay = bySlug.get('fx-replay-review')
  if (!fxReplay) {
    rows.push('FX Replay review is missing from the tool-review cluster')
  } else {
    const expectedTitle = 'FX Replay Review: Pricing, Features & Limits'
    if (
      fxReplay.title !== expectedTitle
      || fxReplay.seoTitle !== expectedTitle
      || fxReplay.modified !== '2026-08-18 12:00:00'
      || fxReplay.sourceCapturedAt !== '2026-08-18'
    ) {
      rows.push('FX Replay title or evidence dates disagree with the current review')
    }
    if (
      fxReplay.seoTitle.length > 60
      || fxReplay.seoDescription.length < 120
      || fxReplay.seoDescription.length > 160
    ) {
      rows.push('FX Replay search title or description is outside the editorial range')
    }
    const fxReplayWordCount = fxReplay.content
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
    if (fxReplayWordCount < 1800) {
      rows.push(`FX Replay source-checked review is only ${fxReplayWordCount} words`)
    }
    for (const sourceUrl of [
      'https://fxreplay.com/pricing',
      'https://fxreplay.com/backtest',
      'https://fxreplay.com/prop-firm-simulator',
      'https://support.fxreplay.com/articles/what-are-the-differences-between-fx-replay-plans-and-their-pricing',
      'https://support.fxreplay.com/articles/how-to-use-the-rr-simulator',
      'https://support.fxreplay.com/articles/refund-policy',
    ]) {
      if (!fxReplay.sourceUrls?.includes(sourceUrl)) {
        rows.push(`FX Replay frontmatter is missing first-party source ${sourceUrl}`)
      }
    }
    for (const token of [
      'data-tool-evidence-captured="2026-08-18"',
      'Traders Fund Hub does not currently record an affiliate relationship with FX Replay.',
      'data-fx-replay-evidence="2026-08-18"',
      'data-tool-pricing="fx-replay-free"',
      '2 sessions, 50 records, 1-month session duration, 1-week retention, 1 indicator',
      'data-tool-pricing="fx-replay-intermediate"',
      '$17.99 monthly or $180 annually ($15 monthly equivalent)',
      'data-tool-pricing="fx-replay-pro"',
      '$35 monthly or $350 annually ($29.16 monthly equivalent)',
      'the page does not state a fixed trial duration',
      'data-fx-replay-prop-simulator="user-configured"',
      'data-fx-replay-test-plan="research-integrity"',
      'data-fx-replay-billing="nonrefundable-auto-renew"',
      'href="/how-to-pass-a-prop-firm-challenge"',
      'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
      'href="/blog/what-is-prop-firm-consistency-rule"',
      'href="/blog/wyckoff-pattern"',
      'href="/blog/what-is-overtrading"',
      'href="/go/fx-replay"',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!fxReplay.content.includes(token)) {
        rows.push(`FX Replay review is missing evidence or decision token ${token}`)
      }
    }
    for (const stale of [
      'one of the best forex backtesting software tools',
      'one of the most popular forex backtesting software tools',
      '4.6 out of 5 stars',
      'over 200 reviews',
      '5-day FX Replay free trial',
      'search for FX Replay discount code',
      'risk-free way to explore',
      'up to 20 backtesting sessions',
      'up to five indicators',
      'accurately replicates market conditions',
      'the best backtesting software',
      'wp-image-175',
    ]) {
      if (fxReplay.content.toLowerCase().includes(stale.toLowerCase())) {
        rows.push(`FX Replay review restored promotional, unsafe or stale claim ${stale}`)
      }
    }
    const goLinks = [...fxReplay.content.matchAll(/href=["'](\/go\/fx-replay[^"']*)/g)]
    if (goLinks.length !== 1 || goLinks[0][1] !== '/go/fx-replay') {
      rows.push('FX Replay review must have 1 attributed official CTA')
    }
    const renderedFxReplay = decoratePostOutboundLinks(
      fxReplay.content,
      { 'fx-replay': 'official' },
      fxReplay.slug,
    )
    if (
      !renderedFxReplay.includes(
        'href="/go/fx-replay?from=post-body-fx-replay-review-verdict"',
      )
      || !renderedFxReplay.includes('rel="nofollow noopener"')
      || renderedFxReplay.includes('rel="sponsored nofollow noopener"')
    ) {
      rows.push('FX Replay rendered CTA lacks controlled verdict attribution or disclosure')
    }
  }

  const threeCommas = bySlug.get('3commas-review')
  if (!threeCommas) {
    rows.push('3Commas review is missing from the tool-review cluster')
  } else {
    const expectedTitle = '3Commas Review: Pricing, Bots & API Risks'
    if (
      threeCommas.title !== expectedTitle
      || threeCommas.seoTitle !== expectedTitle
      || threeCommas.modified !== '2026-08-18 12:00:00'
      || threeCommas.sourceCapturedAt !== '2026-08-18'
    ) {
      rows.push('3Commas title or evidence dates disagree with the current review')
    }
    if (
      threeCommas.seoTitle.length > 60
      || threeCommas.seoDescription.length < 120
      || threeCommas.seoDescription.length > 160
    ) {
      rows.push('3Commas search title or description is outside the editorial range')
    }
    const threeCommasWordCount = threeCommas.content
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
    if (threeCommasWordCount < 2200) {
      rows.push(`3Commas source-checked review is only ${threeCommasWordCount} words`)
    }
    for (const sourceUrl of [
      'https://3commas.io/pricing',
      'https://help.3commas.io/en/articles/8420093-available-subscription-plans',
      'https://help.3commas.io/en/articles/8420117-subscriptions-faq',
      'https://help.3commas.io/en/articles/3108964-available-exchanges-and-supported-features',
      'https://help.3commas.io/en/articles/4456595-3commas-security',
      'https://3commas.io/blog/notice-on-api-data-disclosure-incident',
      'https://help.3commas.io/en/articles/8146367-how-to-claim-a-refund',
      'https://help.3commas.io/en/articles/3311526-what-happens-when-my-subscription-ends',
    ]) {
      if (!threeCommas.sourceUrls?.includes(sourceUrl)) {
        rows.push(`3Commas frontmatter is missing first-party source ${sourceUrl}`)
      }
    }
    for (const token of [
      'data-tool-evidence-captured="2026-08-18"',
      'Traders Fund Hub does not currently record an affiliate relationship with 3Commas.',
      'data-3commas-evidence="2026-08-18"',
      'data-tool-pricing="3commas-free"',
      'data-tool-pricing="3commas-starter"',
      '$20 monthly or $180 annually ($15 monthly equivalent)',
      'data-tool-pricing="3commas-pro"',
      '$50 monthly or $456 annually ($38 monthly equivalent)',
      'data-tool-pricing="3commas-expert"',
      '$140 monthly or $1,260 annually ($105 monthly equivalent)',
      'data-3commas-pricing-conflict="active-accounts"',
      '1 Starter, 5 Pro, and 25 Expert active API keys',
      '1, 3, and 15 active trading accounts',
      'data-3commas-security-incident="2022-api-disclosure"',
      'data-3commas-security-checklist="least-privilege"',
      'data-3commas-test-plan="connected-exchange"',
      'data-3commas-offboarding="subscription-expiry"',
      'data-3commas-billing="trial-refund"',
      'href="/blog/what-is-copy-trading"',
      'href="/blog/fx-replay-review"',
      'href="/blog/what-is-overtrading"',
      'href="/go/3commas"',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!threeCommas.content.includes(token)) {
        rows.push(`3Commas review is missing evidence or decision token ${token}`)
      }
    }
    for (const stale of [
      '$37 Monthly',
      '$59 Monthly',
      'PROTIME50',
      'ZRB2AUPH4N0',
      'lvEp2glM',
      'earn money when others copy',
      'consistent profits',
      'emotion-free trading',
      '4.4 out of 5',
      'nearly 2,000',
      'over 2 million traders have signed up',
      'wp-image-21',
    ]) {
      if (threeCommas.content.toLowerCase().includes(stale.toLowerCase())) {
        rows.push(`3Commas review restored promotional, unsafe or stale claim ${stale}`)
      }
    }
    const goLinks = [...threeCommas.content.matchAll(/href=["'](\/go\/3commas[^"']*)/g)]
    if (goLinks.length !== 1 || goLinks[0][1] !== '/go/3commas') {
      rows.push('3Commas review must have 1 attributed official CTA')
    }
    const renderedThreeCommas = decoratePostOutboundLinks(
      threeCommas.content,
      { '3commas': 'official' },
      threeCommas.slug,
    )
    if (
      !renderedThreeCommas.includes(
        'href="/go/3commas?from=post-body-3commas-review-verdict"',
      )
      || !renderedThreeCommas.includes('rel="nofollow noopener"')
      || renderedThreeCommas.includes('rel="sponsored nofollow noopener"')
    ) {
      rows.push('3Commas rendered CTA lacks controlled verdict attribution or disclosure')
    }
  }

  const zuluTrade = bySlug.get('zulutrade-review')
  if (!zuluTrade) {
    rows.push('ZuluTrade review is missing from the tool-review cluster')
  } else {
    const expectedTitle = 'ZuluTrade Review: Fees, Copying & Key Risks'
    if (
      zuluTrade.title !== expectedTitle
      || zuluTrade.seoTitle !== expectedTitle
      || zuluTrade.modified !== '2026-08-18 12:00:00'
      || zuluTrade.sourceCapturedAt !== '2026-08-18'
    ) {
      rows.push('ZuluTrade title or evidence dates disagree with the current review')
    }
    if (
      zuluTrade.seoTitle.length > 60
      || zuluTrade.seoDescription.length < 120
      || zuluTrade.seoDescription.length > 160
    ) {
      rows.push('ZuluTrade search title or description is outside the editorial range')
    }
    const zuluTradeWordCount = zuluTrade.content
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
    if (zuluTradeWordCount < 2300) {
      rows.push(`ZuluTrade source-checked review is only ${zuluTradeWordCount} words`)
    }
    for (const sourceUrl of [
      'https://www.zulutrade.com/pricing',
      'https://www.zulutrade.com/user-guide',
      'https://www.zulutrade.com/leader-guide',
      'https://www.zulutrade.com/autoprotect-your-account',
      'https://entry.zulutrade.com/trader-guide',
      'https://www.zulutrade.com/select-broker',
      'https://www.zulutrade.com/terms-of-service-eu',
      'https://www.zulutrade.com/printable-terms',
    ]) {
      if (!zuluTrade.sourceUrls?.includes(sourceUrl)) {
        rows.push(`ZuluTrade frontmatter is missing first-party source ${sourceUrl}`)
      }
    }
    for (const token of [
      'data-tool-evidence-captured="2026-08-18"',
      'Traders Fund Hub does not currently record an affiliate relationship with ZuluTrade.',
      'data-zulutrade-evidence="2026-08-18"',
      'data-zulutrade-model="default-zero-subscription"',
      'Default ZuluTrade Investor account type in the current Leader Guide',
      'creation of new Profit Sharing Investor accounts discontinued since April 2022',
      'data-zulutrade-fee-boundary="current-vs-legacy"',
      '0.5 pip for each closed copied trade',
      '$5 per $100,000 traded',
      'data-zulutrade-connection="master-credential"',
      'data-zulutrade-leader-selection="record-quality"',
      'data-zulutrade-execution-risk="orphan-trade"',
      'data-zulutrade-guard="threshold-control"',
      'data-zulutrade-test-plan="demo-to-live"',
      'data-zulutrade-regulation="entity-specific"',
      'Triple A Experts Investment Services S.A.',
      'href="/blog/what-is-copy-trading"',
      'href="/blog/traders-connect-trade-copier"',
      'href="/blog/what-is-overtrading"',
      'href="/go/zulutrade"',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!zuluTrade.content.includes(token)) {
        rows.push(`ZuluTrade review is missing evidence or decision token ${token}`)
      }
    }
    for (const stale of [
      '3.3</strong> on <strong>Trustpilot',
      'used in 150+ countries',
      '30 million accounts',
      '2 million active traders',
      'one of the oldest and most well-known',
      'one of the top platforms',
      'UF Awards 2024',
      'Is ZuluTrade profitable?',
      'It can be profitable for those',
      'completely legitimate copy trading platform',
      'Classic & Profit Sharing Accounts',
      'minimum deposit requirements',
      'TrustPilot Reviews',
      '$30 subscription',
      '20% performance',
      '25% performance',
      'wp-image-22',
    ]) {
      if (zuluTrade.content.toLowerCase().includes(stale.toLowerCase())) {
        rows.push(`ZuluTrade review restored promotional, unsafe or stale claim ${stale}`)
      }
    }
    const goLinks = [...zuluTrade.content.matchAll(/href=["'](\/go\/zulutrade[^"']*)/g)]
    if (goLinks.length !== 1 || goLinks[0][1] !== '/go/zulutrade') {
      rows.push('ZuluTrade review must have 1 attributed official CTA')
    }
    const renderedZuluTrade = decoratePostOutboundLinks(
      zuluTrade.content,
      { zulutrade: 'official' },
      zuluTrade.slug,
    )
    if (
      !renderedZuluTrade.includes(
        'href="/go/zulutrade?from=post-body-zulutrade-review-verdict"',
      )
      || !renderedZuluTrade.includes('rel="nofollow noopener"')
      || renderedZuluTrade.includes('rel="sponsored nofollow noopener"')
    ) {
      rows.push('ZuluTrade rendered CTA lacks controlled verdict attribution or disclosure')
    }
  }

  const copyFx = bySlug.get('copyfx-review')
  if (!copyFx) {
    rows.push('CopyFX review is missing from the tool-review cluster')
  } else {
    const expectedTitle = 'CopyFX Review: New Name, Fees & Copy Risks'
    if (
      copyFx.title !== expectedTitle
      || copyFx.seoTitle !== expectedTitle
      || copyFx.modified !== '2026-08-18 12:00:00'
      || copyFx.sourceCapturedAt !== '2026-08-18'
    ) {
      rows.push('CopyFX title or evidence dates disagree with the current review')
    }
    if (
      copyFx.seoTitle.length > 60
      || copyFx.seoDescription.length < 120
      || copyFx.seoDescription.length > 160
    ) {
      rows.push('CopyFX search title or description is outside the editorial range')
    }
    const copyFxWordCount = copyFx.content
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
    if (copyFxWordCount < 2700) {
      rows.push(`CopyFX source-checked review is only ${copyFxWordCount} words`)
    }
    for (const sourceUrl of [
      'https://roboforex.com/about/company/news/show/upgraded-copy-trading-service/',
      'https://roboforex.com/copy-trading/copy-top-strategies/',
      'https://roboforex.com/copy-trading/share-your-strategy/',
      'https://roboforex.com/help/faq/copy-trading-traders/subscription-conditions-from-a-to-z/',
      'https://roboforex.com/help/faq/copy-trading-investors/what-is-a-copying-mode/',
      'https://roboforex.com/help/faq/copy-trading-investors/how-and-where-do-i-manage-my-subscriptions/',
      'https://roboforex.com/help/faq/copy-trading-investors/why-wasnt-the-trade-copied-to-my-account/',
      'https://roboforex.com/help/faq/copy-trading-investors/what-do-i-pay-for-copying/',
      'https://roboforex.com/help/faq/copy-trading-rating/what-information-is-displayed-in-the-rating/',
      'https://roboforex.com/about/company/regulation/',
    ]) {
      if (!copyFx.sourceUrls?.includes(sourceUrl)) {
        rows.push(`CopyFX frontmatter is missing first-party source ${sourceUrl}`)
      }
    }
    for (const token of [
      'data-tool-evidence-captured="2026-08-18"',
      'Traders Fund Hub does not currently record an affiliate relationship with CopyFX or RoboForex.',
      'data-copyfx-rebrand="copy-trading-service"',
      '6 November 2025',
      'data-copyfx-platforms="mt4-mt5-rstockstrader"',
      'data-copyfx-cross-platform="not-supported"',
      'Copy Trading Service does not currently support cross-platform copying.',
      'data-copyfx-investor-minimum="trader-defined"',
      'Trader sets the minimum USD deposit',
      'data-copyfx-copy-modes="proportional-classic-fixed"',
      'data-copyfx-fee-boundary="strategy-specific"',
      'data-copyfx-performance-conflict="zero-vs-five"',
      'Trader page hero shows 0%-50%; its detailed FAQ and current help say 5%-50%',
      'data-copyfx-evidence="2026-08-18"',
      'data-copyfx-rating="record-quality"',
      'data-copyfx-incentive="partner-promotion"',
      'data-copyfx-subscription-lifecycle="pause-vs-cancel"',
      'data-copyfx-test-plan="subscriber-lifecycle"',
      'data-copyfx-regulation="roboforex-ltd"',
      'registration/licence number <strong>9759600</strong>',
      'href="/blog/what-is-copy-trading"',
      'href="/blog/zulutrade-review"',
      'href="/blog/traders-connect-trade-copier"',
      'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
      'href="/blog/what-is-overtrading"',
      'href="/go/copyfx"',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!copyFx.content.includes(token)) {
        rows.push(`CopyFX review is missing evidence or decision token ${token}`)
      }
    }
    for (const stale of [
      'Eureka!',
      'Best Copy Trading Platform 2025',
      'TrustFinance Business Bangkok 2025',
      'copy trades with just $10',
      'Cross Copying',
      'between 1 and 10 USD per lot',
      'up to 100 times',
      'Trustpilot',
      'one of the best copy trading platforms',
      'reliable copy trading platform',
      'More than 12,000',
      'wp-image-225',
    ]) {
      if (copyFx.content.toLowerCase().includes(stale.toLowerCase())) {
        rows.push(`CopyFX review restored promotional, unsafe or stale claim ${stale}`)
      }
    }
    const goLinks = [...copyFx.content.matchAll(/href=["'](\/go\/copyfx[^"']*)/g)]
    if (goLinks.length !== 1 || goLinks[0][1] !== '/go/copyfx') {
      rows.push('CopyFX review must have 1 attributed official CTA')
    }
    const renderedCopyFx = decoratePostOutboundLinks(
      copyFx.content,
      { copyfx: 'official' },
      copyFx.slug,
    )
    if (
      !renderedCopyFx.includes(
        'href="/go/copyfx?from=post-body-copyfx-review-verdict"',
      )
      || !renderedCopyFx.includes('rel="nofollow noopener"')
      || renderedCopyFx.includes('rel="sponsored nofollow noopener"')
    ) {
      rows.push('CopyFX rendered CTA lacks controlled verdict attribution or disclosure')
    }
  }

  for (const [relativePath, label] of [
    ['content/posts/what-is-copy-trading.md', 'copy-trading guide'],
    ['content/posts/are-prop-firm-passing-services-worth-it.md', 'passing-services guide'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
    if (!body.includes('href="/blog/traders-connect-trade-copier"')) {
      rows.push(`${label} is missing its contextual Traders Connect backlink`)
    }
  }

  for (const [relativePath, label] of [
    ['content/posts/wyckoff-pattern.md', 'Wyckoff guide'],
    ['content/posts/what-is-overtrading.md', 'overtrading guide'],
    ['content/posts/is-prop-firm-trading-profitable.md', 'profitability guide'],
    ['content/pages/how-to-pass-a-prop-firm-challenge.md', 'challenge risk-plan guide'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
    if (!body.includes('href="/blog/fx-replay-review"')) {
      rows.push(`${label} is missing its contextual FX Replay backlink`)
    }
  }

  for (const [relativePath, label] of [
    ['content/posts/what-is-copy-trading.md', 'copy-trading guide'],
    ['content/posts/what-is-overtrading.md', 'overtrading guide'],
    ['content/posts/fx-replay-review.md', 'FX Replay review'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
    if (!body.includes('href="/blog/3commas-review"')) {
      rows.push(`${label} is missing its contextual 3Commas backlink`)
    }
  }

  for (const [relativePath, label] of [
    ['content/posts/what-is-copy-trading.md', 'copy-trading guide'],
    ['content/posts/traders-connect-trade-copier.md', 'Traders Connect review'],
    ['content/posts/copyfx-review.md', 'CopyFX review'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
    if (!body.includes('href="/blog/zulutrade-review"')) {
      rows.push(`${label} is missing its contextual ZuluTrade backlink`)
    }
  }

  for (const [relativePath, label] of [
    ['content/posts/what-is-copy-trading.md', 'copy-trading guide'],
    ['content/posts/zulutrade-review.md', 'ZuluTrade review'],
    ['content/posts/traders-connect-trade-copier.md', 'Traders Connect review'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
    if (!body.includes('href="/blog/copyfx-review"')) {
      rows.push(`${label} is missing its contextual CopyFX backlink`)
    }
  }

  const outboundDestinations = fs.readFileSync(
    path.join(ROOT, 'lib/outboundDestinations.ts'),
    'utf-8',
  )
  if (!outboundDestinations.includes(
    "'traders-connect': { affiliateUrl: null, officialUrl: 'https://tradersconnect.com/' }",
  )) {
    rows.push('Traders Connect must remain an official, non-affiliate outbound route')
  }
  if (!outboundDestinations.includes(
    "'fx-replay': { affiliateUrl: null, officialUrl: 'https://www.fxreplay.com/' }",
  )) {
    rows.push('FX Replay must remain an official, non-affiliate outbound route')
  }
  if (!outboundDestinations.includes(
    "'3commas': { affiliateUrl: null, officialUrl: 'https://3commas.io/' }",
  )) {
    rows.push('3Commas must remain an official, non-affiliate outbound route')
  }
  if (!outboundDestinations.includes(
    "zulutrade: { affiliateUrl: null, officialUrl: 'https://www.zulutrade.com/' }",
  )) {
    rows.push('ZuluTrade must remain an official, non-affiliate outbound route')
  }
  if (!outboundDestinations.includes(
    "copyfx: { affiliateUrl: null, officialUrl: 'https://roboforex.com/copy-trading/copy-top-strategies/' }",
  )) {
    rows.push('CopyFX must remain an official, non-affiliate outbound route')
  }

  const component = fs.existsSync(TRADING_TOOL_REVIEW_COMPONENT_FILE)
    ? fs.readFileSync(TRADING_TOOL_REVIEW_COMPONENT_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'data-tool-review-status={post.slug}',
    'Editorial snapshot',
    'Pricing, integrations and feature availability may have changed since this review date.',
    'verify the official service before paying or',
    'data-tool-review-cluster={current.slug}',
    'Compare tools by the job they perform',
    'these products',
    'are not interchangeable',
    'data-tool-review-link={review.slug}',
    'Editorial update: {formatEditorialDate(editorialDate)}',
  ]) {
    if (!component.includes(fragment)) {
      rows.push(`trading-tool review component is missing "${fragment}"`)
    }
  }

  const library = fs.existsSync(TRADING_TOOL_REVIEW_LIB_FILE)
    ? fs.readFileSync(TRADING_TOOL_REVIEW_LIB_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'export const TRADING_TOOL_REVIEWS',
    'export function getTradingToolReview',
    'export function getTradingToolReviewLinks',
    'every configured tool review links to the other four',
  ]) {
    if (!library.includes(fragment)) {
      rows.push(`trading-tool review selector is missing "${fragment}"`)
    }
  }

  const blogRoute = fs.existsSync(BLOG_POST_PAGE_FILE)
    ? fs.readFileSync(BLOG_POST_PAGE_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'const toolReviewLinks = getTradingToolReviewLinks(slug, allPosts)',
    'allPosts.filter(candidate => !toolReviewSlugs.has(candidate.slug))',
    '<TradingToolReviewStatus post={post} />',
    '<TradingToolReviewCluster current={post} reviews={toolReviewLinks} />',
  ]) {
    if (!blogRoute.includes(fragment)) {
      rows.push(`blog template is missing trading-tool contract "${fragment}"`)
    }
  }
  const statusIndex = blogRoute.indexOf('<TradingToolReviewStatus')
  const contentsIndex = blogRoute.indexOf('<TableOfContents')
  const bodyIndex = blogRoute.indexOf('dangerouslySetInnerHTML={{ __html: contentWithIds }}')
  const clusterIndex = blogRoute.indexOf('<TradingToolReviewCluster')
  if (!(statusIndex >= 0 && statusIndex < contentsIndex && bodyIndex < clusterIndex)) {
    rows.push('trading-tool freshness must precede the article and peer links must follow it')
  }

  const schema = fs.existsSync(SCHEMA_FILE) ? fs.readFileSync(SCHEMA_FILE, 'utf-8') : ''
  if (!schema.includes('description: post.seoDescription || post.excerpt || post.title')) {
    rows.push('Article schema does not use the reviewed search description')
  }

  const releaseCrawl = fs.existsSync(RELEASE_CRAWL_FILE)
    ? fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
    : ''
  for (const fragment of [
    'trading-tool review has only ${inlinkCount} unique internal inlinks',
    'trading-tool cluster is incomplete or out of order',
    'trading-tool Article schema description disagrees with metadata',
  ]) {
    if (!releaseCrawl.includes(fragment)) {
      rows.push(`release crawl is missing trading-tool safeguard "${fragment}"`)
    }
  }

  if (rows.length) {
    console.log('\nâœ— Trading-tool review cluster')
    for (const row of rows) console.log(`  Â· ${row}`)
  }
  return rows.length
}

/** Keep the existing Wyckoff guide search-ready, testable and well connected. */
function checkWyckoffGuide() {
  const rows = []
  if (!fs.existsSync(WYCKOFF_GUIDE_FILE)) {
    rows.push('content/posts/wyckoff-pattern.md is missing')
  } else {
    const { data, content } = matter(fs.readFileSync(WYCKOFF_GUIDE_FILE, 'utf-8'))
    const expectedTitle = 'Wyckoff Pattern: Accumulation & Distribution Guide'
    if (data.title !== expectedTitle || data.seoTitle !== expectedTitle) {
      rows.push('Wyckoff visible and search titles must use the focused evergreen title')
    }
    if (data.modified !== '2026-08-18 12:00:00') {
      rows.push('Wyckoff guide is missing the current editorial revision date')
    }
    if (String(data.seoTitle || '').length > 60) {
      rows.push(`Wyckoff search title is ${data.seoTitle.length} characters`)
    }
    if (
      String(data.seoDescription || '').length < 120
      || String(data.seoDescription || '').length > 160
    ) {
      rows.push(
        `Wyckoff search description is ${String(data.seoDescription || '').length} characters`,
      )
    }
    for (const tag of ['Wyckoff method', 'technical analysis', 'market structure', 'backtesting']) {
      if (!data.tags?.includes(tag)) rows.push(`Wyckoff guide is missing topic tag ${tag}`)
    }
    for (const token of [
      'The Wyckoff pattern is an interpretive framework',
      'Cycle and schematic are different.',
      'Composite Man is a model, not an observable trader',
      'The 3 Wyckoff laws',
      'How to make a Wyckoff pattern testable',
      'Fix the market and data source.',
      'Separate research from paid execution.',
      'What the Wyckoff pattern can and cannot tell you',
      'Does a Wyckoff spring guarantee a rally?',
      'https://www.wyckoffanalytics.com/wyckoff-method/',
      'href="/blog/fx-replay-review"',
      'href="/how-to-pass-a-prop-firm-challenge"',
      'href="/blog/what-is-overtrading"',
      'href="/blog/is-prop-firm-trading-profitable"',
      'href="/prop-firm-challenges"',
      'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
      'href="/prop-firms/overnight-holding"',
      'href="/prop-firms/weekend-holding"',
    ]) {
      if (!content.includes(token)) rows.push(`Wyckoff guide is missing ${token}`)
    }
    for (const stale of [
      'Uderstanding',
      'the The Wyckoff',
      'anticipate market movements',
      'follow smart money',
      'great chances to buy',
      'prime chances to short',
      '<blockquote',
    ]) {
      if (content.includes(stale)) rows.push(`Wyckoff guide restored stale claim or copy: ${stale}`)
    }
  }

  for (const [relativePath, label] of [
    ['content/pages/how-to-pass-a-prop-firm-challenge.md', 'challenge risk plan'],
    ['content/posts/fx-replay-review.md', 'FX Replay review'],
    ['content/posts/is-prop-firm-trading-profitable.md', 'profitability guide'],
    ['content/posts/what-is-a-prop-firm.md', 'prop-firm explainer'],
    ['content/posts/what-is-overtrading.md', 'overtrading guide'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
    if (!body.includes('href="/blog/wyckoff-pattern"')) {
      rows.push(`${label} is missing its contextual Wyckoff link`)
    }
  }

  const blogRoute = fs.readFileSync(BLOG_POST_PAGE_FILE, 'utf-8')
  for (const token of [
    'post.modified && post.modified !== post.date',
    'Updated {new Date(post.modified).toLocaleDateString',
  ]) {
    if (!blogRoute.includes(token)) {
      rows.push(`blog template is missing visible revision-date safeguard ${token}`)
    }
  }

  const releaseCrawl = fs.readFileSync(RELEASE_CRAWL_FILE, 'utf-8')
  for (const token of [
    'educational guide has only ${wyckoffInlinks.size} unique internal inlinks',
    "const wyckoffGuidePath = '/blog/wyckoff-pattern'",
    'missing contextual inlink from ${source}',
    'title, description or H1 disagrees with frontmatter',
    'Article schema disagrees with revised frontmatter',
    'Updated Aug 18, 2026',
  ]) {
    if (!releaseCrawl.includes(token)) {
      rows.push(`release crawl is missing Wyckoff safeguard ${token}`)
    }
  }

  if (rows.length) {
    console.log('\n✗ Wyckoff guide, search surface and contextual links')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Russian search acquisition must stay global, source-safe and affiliate-transparent. */
function checkRussianAcquisitionPilot() {
  const rows = []
  const evidenceFile = path.join(ROOT, 'content/data/russian-market-evidence.json')
  const localizedRoutesFile = path.join(ROOT, 'lib/localizedRoutes.ts')
  const russianLayoutFile = path.join(ROOT, 'app/ru/layout.tsx')
  const russianPartnerReviewFile = path.join(ROOT, 'components/RussianPartnerReview.tsx')
  const russianPartnerReviewSource = fs.existsSync(russianPartnerReviewFile)
    ? fs.readFileSync(russianPartnerReviewFile, 'utf8')
    : ''
  const russianRouteFiles = new Map([
    ['/ru', path.join(ROOT, 'app/ru/page.tsx')],
    ['/ru/dlya-russkoyazychnykh-treyderov', path.join(ROOT, 'app/ru/dlya-russkoyazychnykh-treyderov/page.tsx')],
    ['/ru/fundednext-vs-bright-funded', path.join(ROOT, 'app/ru/fundednext-vs-bright-funded/page.tsx')],
    ['/ru/fundednext-vs-fundingpips', path.join(ROOT, 'app/ru/fundednext-vs-fundingpips/page.tsx')],
    ['/ru/promokody-prop-firm', path.join(ROOT, 'app/ru/promokody-prop-firm/page.tsx')],
    ['/ru/vyplaty-prop-firm', path.join(ROOT, 'app/ru/vyplaty-prop-firm/page.tsx')],
    ['/ru/prop-firmy-bez-kyc', path.join(ROOT, 'app/ru/prop-firmy-bez-kyc/page.tsx')],
    ['/ru/obzor-proplive', path.join(ROOT, 'app/ru/obzor-proplive/page.tsx')],
    ['/ru/obzor-eratrade', path.join(ROOT, 'app/ru/obzor-eratrade/page.tsx')],
    ['/ru/obzor-kascapital', path.join(ROOT, 'app/ru/obzor-kascapital/page.tsx')],
    ['/ru/otzyvy-prop-firm', path.join(ROOT, 'app/ru/otzyvy-prop-firm/page.tsx')],
    ['/ru/prop-firmy-bez-chelendzha', path.join(ROOT, 'app/ru/prop-firmy-bez-chelendzha/page.tsx')],
    ['/ru/luchshie-prop-firmy', path.join(ROOT, 'app/ru/luchshie-prop-firmy/page.tsx')],
    ['/ru/luchshie-kripto-prop-firmy', path.join(ROOT, 'app/ru/luchshie-kripto-prop-firmy/page.tsx')],
    ['/ru/obzor-ftmo', path.join(ROOT, 'app/ru/obzor-ftmo/page.tsx')],
    ['/ru/obzor-fundednext', path.join(ROOT, 'app/ru/obzor-fundednext/page.tsx')],
    ['/ru/obzor-fundingpips', path.join(ROOT, 'app/ru/obzor-fundingpips/page.tsx')],
    ['/ru/obzor-bright-funded', path.join(ROOT, 'app/ru/obzor-bright-funded/page.tsx')],
    ['/ru/kak-rabotayut-chellendzhi-prop-firm', path.join(ROOT, 'app/ru/kak-rabotayut-chellendzhi-prop-firm/page.tsx')],
    ['/ru/rossiyskie-prop-kompanii', path.join(ROOT, 'app/ru/rossiyskie-prop-kompanii/page.tsx')],
  ])

  for (const [route, file] of russianRouteFiles) {
    if (!fs.existsSync(file)) rows.push(`${route}: route source is missing`)
  }
  if (!fs.existsSync(evidenceFile)) {
    rows.push('content/data/russian-market-evidence.json is missing')
  } else {
    try {
      const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'))
      const capturedAt = new Date(`${evidence.capturedAt}T23:59:59Z`)
      const ageDays = (Date.now() - capturedAt.getTime()) / 86_400_000
      if (Number.isNaN(capturedAt.getTime()) || ageDays < -1 || ageDays > 30) {
        rows.push(`Russian market evidence capture ${evidence.capturedAt || 'missing'} is outside the 30-day window`)
      }
      const queryFrequency = new Map((evidence.searchDemand?.queries ?? [])
        .map(item => [item.query, item.monthlyFrequency]))
      for (const [query, expected] of [
        ['проп компании', 255],
        ['проп компании для трейдеров в россии', 162],
        ['проп фирма', 60],
      ]) {
        if (queryFrequency.get(query) !== expected) {
          rows.push(`Russian search-demand fixture ${query} does not equal ${expected}`)
        }
      }
      if (
        evidence.searchDemand?.estimatedClicks !== 180
        || evidence.searchDemand?.top50Queries !== 41
        || !evidence.searchDemand?.notes?.some(note => note.includes('must not be added'))
        || !evidence.searchDemand?.sourceType?.includes('third-party')
      ) {
        rows.push('Russian search-demand caveat or 180-click/41-query fixture is missing')
      }
      const autocompleteSignals = new Map((evidence.searchDemand?.autocompleteSignals ?? [])
        .map(item => [item.seed, item]))
      for (const seed of ['проп фирмы отзывы', 'fundednext отзывы']) {
        const signal = autocompleteSignals.get(seed)
        if (
          signal?.engine !== 'Google'
          || signal?.capturedAt !== evidence.capturedAt
          || !signal?.suggestions?.includes(seed)
        ) {
          rows.push(`Russian review autocomplete signal is incomplete for ${seed}`)
        }
      }
      const genericKycSignal = autocompleteSignals.get('проп фирмы без kyc')
      if (
        genericKycSignal?.engine !== 'Google'
        || genericKycSignal?.capturedAt !== evidence.capturedAt
        || genericKycSignal?.status !== 'no-suggestions-returned'
        || !Array.isArray(genericKycSignal?.suggestions)
        || genericKycSignal.suggestions.length !== 0
        || !evidence.searchDemand?.notes?.some(note => note.includes('search-language gap'))
      ) {
        rows.push('Russian generic KYC autocomplete gap or empty-signal caveat is incomplete')
      }
      const fundedNextKycSignal = autocompleteSignals.get('fundednext kyc')
      for (const suggestion of [
        'fundednext kyc',
        'fundednext kyc verification',
        'fundednext kyc requirements',
        'fundednext kyc process',
        'fundednext kyc documents',
      ]) {
        if (
          fundedNextKycSignal?.engine !== 'Google'
          || fundedNextKycSignal?.capturedAt !== evidence.capturedAt
          || !fundedNextKycSignal?.suggestions?.includes(suggestion)
        ) {
          rows.push(`FundedNext KYC autocomplete signal is incomplete for ${suggestion}`)
        }
      }
      const brightKycSignal = autocompleteSignals.get('bright funded kyc')
      if (
        brightKycSignal?.engine !== 'Google'
        || brightKycSignal?.capturedAt !== evidence.capturedAt
        || !brightKycSignal?.suggestions?.includes('bright funded kyc')
      ) {
        rows.push('Bright Funded KYC autocomplete signal is incomplete')
      }
      const fundingPipsKycSignal = autocompleteSignals.get('fundingpips kyc')
      for (const suggestion of [
        'fundingpips kyc verification',
        'fundingpips kyc process',
        'funding pips kyc documents',
      ]) {
        if (
          fundingPipsKycSignal?.engine !== 'Google'
          || fundingPipsKycSignal?.capturedAt !== evidence.capturedAt
          || !fundingPipsKycSignal?.suggestions?.includes(suggestion)
        ) {
          rows.push(`FundingPips KYC autocomplete signal is incomplete for ${suggestion}`)
        }
      }
      const genericInstantSignal = autocompleteSignals.get('проп фирмы без челленджа')
      if (
        genericInstantSignal?.engine !== 'Google'
        || genericInstantSignal?.capturedAt !== evidence.capturedAt
        || !genericInstantSignal?.suggestions?.includes('проп фирмы без челленджа')
      ) {
        rows.push('Russian instant-funding autocomplete signal is incomplete')
      }
      const fundedNextInstantSignal = autocompleteSignals.get('fundednext instant')
      for (const suggestion of [
        'fundednext instant funding',
        'fundednext instant account rules',
        'fundednext instant funding rules',
        'fundednext instant rules',
        'fundednext instant funding withdrawal',
      ]) {
        if (
          fundedNextInstantSignal?.engine !== 'Google'
          || fundedNextInstantSignal?.capturedAt !== evidence.capturedAt
          || !fundedNextInstantSignal?.suggestions?.includes(suggestion)
        ) {
          rows.push(`FundedNext Instant autocomplete signal is incomplete for ${suggestion}`)
        }
      }
      const fundingPipsZeroSignal = autocompleteSignals.get('fundingpips zero')
      for (const suggestion of [
        'fundingpips zero',
        'fundingpips zero account rules',
        'fundingpips zero rules',
        'fundingpips zero consistency rule',
        'fundingpips zero review',
      ]) {
        if (
          fundingPipsZeroSignal?.engine !== 'Google'
          || fundingPipsZeroSignal?.capturedAt !== evidence.capturedAt
          || !fundingPipsZeroSignal?.suggestions?.includes(suggestion)
        ) {
          rows.push(`FundingPips Zero autocomplete signal is incomplete for ${suggestion}`)
        }
      }

      const genericPayoutSignal = autocompleteSignals.get('выплаты проп фирм')
      if (
        genericPayoutSignal?.engine !== 'Google'
        || genericPayoutSignal?.capturedAt !== evidence.capturedAt
        || genericPayoutSignal?.status !== 'no-suggestions-returned'
        || !Array.isArray(genericPayoutSignal?.suggestions)
        || genericPayoutSignal.suggestions.length !== 0
      ) {
        rows.push('Russian generic payout autocomplete gap or empty-signal caveat is incomplete')
      }
      const payoutAutocompleteChecks = new Map([
        ['fundednext payout', [
          'fundednext payout rules',
          'fundednext payout methods',
          'fundednext payout time',
          'fundednext payout policy',
        ]],
        ['brightfunded payout', [
          'brightfunded payout',
          'brightfunded payout rules',
          'brightfunded payout split',
          'brightfunded payout policy',
        ]],
        ['fundingpips payout', [
          'fundingpips payout methods',
          'fundingpips payout rules',
          'fundingpips payout time',
          'fundingpips payout cycle',
        ]],
      ])
      for (const [seed, suggestions] of payoutAutocompleteChecks) {
        const signal = autocompleteSignals.get(seed)
        for (const suggestion of suggestions) {
          if (
            signal?.engine !== 'Google'
            || signal?.capturedAt !== evidence.capturedAt
            || !signal?.suggestions?.includes(suggestion)
          ) {
            rows.push(`Russian payout autocomplete signal is incomplete for ${seed}: ${suggestion}`)
          }
        }
      }

      for (const seed of ['fundednext vs bright funded', 'fundednext или bright funded']) {
        const signal = autocompleteSignals.get(seed)
        if (
          signal?.engine !== 'Google'
          || signal?.capturedAt !== evidence.capturedAt
          || signal?.status !== 'no-suggestions-returned'
          || !Array.isArray(signal?.suggestions)
          || signal.suggestions.length !== 0
        ) {
          rows.push(`FundedNext/Bright comparison autocomplete gap is incomplete for ${seed}`)
        }
      }

      for (const seed of ['промокоды проп фирм', 'bright funded промокод']) {
        const signal = autocompleteSignals.get(seed)
        if (
          signal?.engine !== 'Google'
          || signal?.capturedAt !== evidence.capturedAt
          || signal?.status !== 'no-suggestions-returned'
          || !Array.isArray(signal?.suggestions)
          || signal.suggestions.length !== 0
        ) {
          rows.push(`Russian promo-code autocomplete gap is incomplete for ${seed}`)
        }
      }
      const promoAutocompleteChecks = new Map([
        ['fundednext промокод', ['fundednext промокод', 'fundednext promo code']],
        ['fundednext promo code', ['fundednext promo code', 'fundednext promo code 30', 'fundednext promo code first order', 'fundednext promo code reddit']],
        ['fundingpips промокод', ['funding pips промокод', 'funding pips promo code']],
      ])
      for (const [seed, suggestions] of promoAutocompleteChecks) {
        const signal = autocompleteSignals.get(seed)
        for (const suggestion of suggestions) {
          if (
            signal?.engine !== 'Google'
            || signal?.capturedAt !== evidence.capturedAt
            || !signal?.suggestions?.includes(suggestion)
          ) {
            rows.push(`Russian promo-code autocomplete signal is incomplete for ${seed}: ${suggestion}`)
          }
        }
      }

      const payoutEvidence = new Map((evidence.payoutEvidence ?? [])
        .map(item => [item.firmSlug, item]))
      if (payoutEvidence.size !== 3) {
        rows.push(`Russian payout evidence must contain exactly 3 firms; received ${payoutEvidence.size}`)
      }
      const expectedPayoutHosts = new Map([
        ['fundednext', { host: 'fundednext.com', sources: 2, methods: 6 }],
        ['bright-funded', { host: 'brightfunded.com', sources: 3, methods: 2 }],
        ['fundingpips', { host: 'fundingpips.com', sources: 2, methods: 4 }],
      ])
      for (const [firmSlug, expected] of expectedPayoutHosts) {
        const item = payoutEvidence.get(firmSlug)
        if (
          !item
          || item.sourceCapturedAt !== evidence.capturedAt
          || item.sourceUrls?.length !== expected.sources
          || item.methods?.length !== expected.methods
        ) {
          rows.push(`${firmSlug}: payout source, method or capture fixtures are incomplete`)
          continue
        }
        for (const sourceUrl of item.sourceUrls) {
          try {
            const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '')
            if (host !== expected.host && !host.endsWith(`.${expected.host}`)) {
              rows.push(`${firmSlug}: payout source is not first-party: ${sourceUrl}`)
            }
          } catch {
            rows.push(`${firmSlug}: payout source URL is invalid: ${sourceUrl}`)
          }
        }
      }
      const fundedNextPayout = payoutEvidence.get('fundednext')
      if (
        !fundedNextPayout?.methods?.some(item => item.includes('USDT ERC20 or TRC20'))
        || !fundedNextPayout?.requestSteps?.some(item => item.includes('OTP'))
        || !fundedNextPayout?.processing?.some(item => item.includes('24 hours'))
        || !fundedNextPayout?.processing?.some(item => item.includes('5 business days'))
        || !fundedNextPayout?.processing?.some(item => item.includes('21 days') && item.includes('14-day'))
        || !fundedNextPayout?.fees?.some(item => item.includes('gateway charges'))
        || !fundedNextPayout?.countryBoundary?.some(item => item.includes('including Russia'))
      ) {
        rows.push('FundedNext payout methods, OTP, timing, fee or Russia boundary is incomplete')
      }
      const brightFundedPayout = payoutEvidence.get('bright-funded')
      if (
        !brightFundedPayout?.methods?.some(item => item.includes('USDC') && item.includes('ERC-20'))
        || !brightFundedPayout?.methods?.some(item => item.includes('EUR'))
        || !brightFundedPayout?.requestSteps?.some(item => item.includes('Close all open trades'))
        || !brightFundedPayout?.processing?.some(item => item.includes('30 days'))
        || !brightFundedPayout?.processing?.some(item => item.includes('14 days'))
        || !brightFundedPayout?.processing?.some(item => item.includes('maximum of 1 day'))
        || !brightFundedPayout?.fees?.some(item => item.includes('does not charge'))
        || !brightFundedPayout?.fees?.some(item => item.includes('USD 5 to USD 50'))
      ) {
        rows.push('Bright Funded payout methods, 30/14-day cycle, processing or fee evidence is incomplete')
      }
      const fundingPipsPayout = payoutEvidence.get('fundingpips')
      if (
        !fundingPipsPayout?.methods?.includes('Card')
        || !fundingPipsPayout?.methods?.includes('Crypto')
        || !fundingPipsPayout?.methods?.includes('Rise')
        || !fundingPipsPayout?.methods?.includes('Bank Transfer')
        || !fundingPipsPayout?.requestSteps?.some(item => item.includes('15 minutes'))
        || !fundingPipsPayout?.requestSteps?.some(item => item.includes("trader's own name"))
        || !fundingPipsPayout?.processing?.some(item => item.includes('1 to 3 working days'))
        || !fundingPipsPayout?.processing?.some(item => item.includes('1 to 2 working days'))
        || !fundingPipsPayout?.countryBoundary?.some(item => item.includes('same email'))
      ) {
        rows.push('FundingPips payout methods, 15-minute gate, processing or Rise evidence is incomplete')
      }

      const localSignals = new Map((evidence.localFirmSignals ?? [])
        .map(item => [item.operator, item]))
      if (
        localSignals.get('Era Trade')?.claims?.traders !== 6000
        || localSignals.get('Era Trade')?.claims?.countries !== 70
        || localSignals.get('Era Trade')?.claims?.payoutsUsd !== 2_000_000
      ) {
        rows.push('Era Trade operator-claim fixtures are missing from Russian evidence')
      }
      if (
        localSignals.get('PropLive')?.claims?.traders !== 13_722
        || !localSignals.get('PropLive')?.notes?.some(note => note.includes('10,700'))
      ) {
        rows.push('PropLive 13,722/10,700 first-party conflict is not preserved')
      }
      if (
        localSignals.get('KasCapital')?.claims?.maximumProfitSharePct !== 95
        || localSignals.get('KasCapital')?.claims?.minimumPayoutRub !== 10_000
        || localSignals.get('KasCapital')?.claims?.maximumPayoutRub !== 2_000_000
      ) {
        rows.push('KasCapital operator-term fixtures are missing from Russian evidence')
      }
      if (
        localSignals.get('А-Лаб Групп')?.claims?.traders !== 500
        || localSignals.get('А-Лаб Групп')?.claims?.monthlyTradesClaimed !== 800_000
        || localSignals.get('А-Лаб Групп')?.claims?.singleSessionRecordRub !== 12_563_379
      ) {
        rows.push('А-Лаб operator-claim fixtures are missing from Russian evidence')
      }
      if (
        localSignals.get('TeamTraders')?.claims?.stageProfitPct !== 6
        || localSignals.get('TeamTraders')?.claims?.minimumTradingSessions !== 15
        || localSignals.get('TeamTraders')?.claims?.dailyLossLimitPct !== 2
        || localSignals.get('TeamTraders')?.claims?.profitSharePct !== 90
      ) {
        rows.push('TeamTraders rule fixtures are missing from Russian evidence')
      }
      if (localSignals.get('Trade System')?.claims?.maximumProfitSharePct !== 95) {
        rows.push('Trade System operator-term fixtures are missing from Russian evidence')
      }

      const affiliatePrograms = new Map((evidence.affiliatePrograms ?? [])
        .map(item => [item.operator, item]))
      const eraAffiliate = affiliatePrograms.get('Era Trade')
      const propLiveAffiliate = affiliatePrograms.get('PropLive')
      const kasAffiliate = affiliatePrograms.get('KasCapital')
      if (
        eraAffiliate?.status !== 'public'
        || eraAffiliate?.baseCommissionPct !== 5
        || eraAffiliate?.maximumPublishedCommissionPct !== 60
        || eraAffiliate?.minimumPayoutUsd !== 50
        || eraAffiliate?.sourceUrl !== 'https://help.eratrade.club/ru/affiliate-program-overview/'
      ) {
        rows.push('Era Trade public 5%–60% affiliate evidence is incomplete')
      }
      if (
        propLiveAffiliate?.status !== 'application-only'
        || propLiveAffiliate?.maximumPublishedCommissionPct !== 50
        || !propLiveAffiliate?.notes?.some(note => note.includes('mentors and schools'))
      ) {
        rows.push('PropLive application-only partner boundary is incomplete')
      }
      if (kasAffiliate?.status !== 'not-found') {
        rows.push('KasCapital must remain affiliate-status not-found until sourced terms exist')
      }
      for (const operator of ['А-Лаб Групп', 'TeamTraders', 'Trade System']) {
        if (affiliatePrograms.get(operator)?.status !== 'not-found') {
          rows.push(`${operator} must remain affiliate-status not-found until sourced terms exist`)
        }
      }

      const firmAccess = new Map((evidence.firmAccess ?? []).map(item => [item.firmSlug, item]))
      if (
        firmAccess.get('ftmo')?.status !== 'restricted'
        || firmAccess.get('ftmo')?.sourceUrls?.[0]
          !== 'https://ftmo.com/en/faq/who-can-join-ftmo/'
      ) {
        rows.push('FTMO Russian Federation restriction evidence is incomplete')
      }
      if (
        firmAccess.get('fundednext')?.status !== 'conflicting'
        || firmAccess.get('fundednext')?.sourceUrls?.length !== 4
        || !firmAccess.get('fundednext')?.notes?.some(note =>
          note.includes('must not describe FundedNext as available to Russian residents'))
      ) {
        rows.push('FundedNext Russia-access conflict and four-source boundary are incomplete')
      }

      const kycEvidence = new Map((evidence.kycEvidence ?? [])
        .map(item => [item.firmSlug, item]))
      if (kycEvidence.size !== 3) {
        rows.push(`Russian KYC evidence must contain exactly 3 firms; received ${kycEvidence.size}`)
      }
      const expectedKycHosts = new Map([
        ['fundednext', 'fundednext.com'],
        ['bright-funded', 'brightfunded.com'],
        ['fundingpips', 'fundingpips.com'],
      ])
      for (const [firmSlug, expectedHost] of expectedKycHosts) {
        const item = kycEvidence.get(firmSlug)
        if (!item || item.required !== true || item.sourceCapturedAt !== evidence.capturedAt) {
          rows.push(`${firmSlug}: KYC required flag or capture date is incomplete`)
          continue
        }
        if (!Array.isArray(item.sourceUrls) || item.sourceUrls.length === 0) {
          rows.push(`${firmSlug}: KYC evidence has no official source URLs`)
        }
        for (const sourceUrl of item.sourceUrls ?? []) {
          try {
            const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '')
            if (host !== expectedHost && !host.endsWith(`.${expectedHost}`)) {
              rows.push(`${firmSlug}: KYC source is not first-party: ${sourceUrl}`)
            }
          } catch {
            rows.push(`${firmSlug}: KYC source URL is invalid: ${sourceUrl}`)
          }
        }
      }
      const fundedNextKyc = kycEvidence.get('fundednext')
      if (
        fundedNextKyc?.sourceUrls?.length !== 1
        || fundedNextKyc?.documents?.length !== 3
        || !fundedNextKyc?.trigger?.includes('After successfully completing the challenge')
        || !fundedNextKyc?.timing?.some(item => item.includes('48 hours'))
        || !fundedNextKyc?.additionalChecks?.some(item => item.includes('3 months'))
      ) {
        rows.push('FundedNext KYC trigger, document, 48-hour or address evidence is incomplete')
      }
      const brightFundedKyc = kycEvidence.get('bright-funded')
      if (
        brightFundedKyc?.sourceUrls?.length !== 2
        || brightFundedKyc?.provider !== 'SumSub'
        || brightFundedKyc?.documents?.length !== 2
        || !brightFundedKyc?.timing?.some(item => item.includes('1–2 business days'))
        || !brightFundedKyc?.timing?.some(item => item.includes('4 business days'))
        || !brightFundedKyc?.additionalChecks?.some(item => item.includes('Security Check'))
      ) {
        rows.push('Bright Funded SumSub, document or Security Check evidence is incomplete')
      }
      const fundingPipsKyc = kycEvidence.get('fundingpips')
      if (
        fundingPipsKyc?.sourceUrls?.length !== 2
        || fundingPipsKyc?.documents?.length !== 3
        || !fundingPipsKyc?.timing?.some(item => item.includes('few minutes'))
        || !fundingPipsKyc?.timing?.some(item => item.includes('2 working days'))
        || !fundingPipsKyc?.additionalChecks?.some(item => item.includes('same email'))
        || !fundingPipsKyc?.postKyc?.some(item => item.includes('4-step sequence'))
      ) {
        rows.push('FundingPips KYC, Rise or 4-step Master setup evidence is incomplete')
      }
    } catch (error) {
      rows.push(`Russian market evidence is invalid JSON: ${error.message}`)
    }
  }

  if (fs.existsSync(russianLayoutFile)) {
    const layout = fs.readFileSync(russianLayoutFile, 'utf8')
    for (const token of ['lang="ru"', 'data-russian-locale="pilot"', "import './ru.css'"]) {
      if (!layout.includes(token)) rows.push(`Russian layout is missing ${token}`)
    }
  }

  const expectedMappedRoutes = [
    "{ en: '/', ru: '/ru' }",
    "{ en: '/best-prop-firms-2026', ru: '/ru/luchshie-prop-firmy' }",
    "{ en: '/best-crypto-prop-firms', ru: '/ru/luchshie-kripto-prop-firmy' }",
    "{ en: '/best-instant-funding-prop-firms', ru: '/ru/prop-firmy-bez-chelendzha' }",
    "{ en: '/compare/bright-funded-vs-fundednext', ru: '/ru/fundednext-vs-bright-funded' }",
    "{ en: '/compare/fundednext-vs-fundingpips', ru: '/ru/fundednext-vs-fundingpips' }",
    "{ en: '/prop-firm-discount-codes', ru: '/ru/promokody-prop-firm' }",
    "{ en: '/blog/ftmo-review', ru: '/ru/obzor-ftmo' }",
    "{ en: '/blog/fundednext-review', ru: '/ru/obzor-fundednext' }",
    "{ en: '/blog/funding-pips-review', ru: '/ru/obzor-fundingpips' }",
    "{ en: '/blog/bright-funded-prop-firm', ru: '/ru/obzor-bright-funded' }",
    "ru: '/ru/kak-rabotayut-chellendzhi-prop-firm'",
    "'/ru/dlya-russkoyazychnykh-treyderov'",
    "'/ru/fundednext-vs-fundingpips'",
    "'/ru/promokody-prop-firm'",
    "'/ru/vyplaty-prop-firm'",
    "'/ru/prop-firmy-bez-kyc'",
    "'/ru/obzor-proplive'",
    "'/ru/obzor-eratrade'",
    "'/ru/obzor-kascapital'",
    "'/ru/otzyvy-prop-firm'",
    "'/ru/rossiyskie-prop-kompanii'",
    "'x-default': pair.en",
  ]
  if (fs.existsSync(localizedRoutesFile)) {
    const localizedRoutes = fs.readFileSync(localizedRoutesFile, 'utf8')
    for (const token of expectedMappedRoutes) {
      if (!localizedRoutes.includes(token)) rows.push(`localized route contract is missing ${token}`)
    }
  }

  for (const [route, file] of russianRouteFiles) {
    if (!fs.existsSync(file)) continue
    const pageSource = fs.readFileSync(file, 'utf8')
    const source = pageSource.includes('RussianPartnerReview')
      ? `${pageSource}\n${russianPartnerReviewSource}`
      : pageSource
    const title = source.match(/const TITLE = '([^']+)'/)?.[1] ?? ''
    const description = source.match(/const DESCRIPTION = '([^']+)'/)?.[1] ?? ''
    if (!title || title.length > 60) rows.push(`${route}: Russian SEO title is missing or over 60 characters`)
    if (description.length < 120 || description.length > 160) {
      rows.push(`${route}: Russian SEO description is ${description.length} characters, expected 120–160`)
    }
    for (const token of [
      'alternates: { canonical: PATH',
      "inLanguage: 'ru'",
      '<h1>',
      'RussianFaq',
    ]) {
      if (!source.includes(token)) rows.push(`${route}: Russian page is missing ${token}`)
    }
    for (const unsafe of [
      'FundedNext доступен в России',
      'FTMO доступен в России',
      'доступна всем россиянам',
    ]) {
      if (source.includes(unsafe)) rows.push(`${route}: contains unsupported access claim ${unsafe}`)
    }
  }

  const russianHub = fs.existsSync(russianRouteFiles.get('/ru'))
    ? fs.readFileSync(russianRouteFiles.get('/ru'), 'utf8')
    : ''
  for (const path of [...russianRouteFiles.keys()].filter(pathname => pathname !== '/ru')) {
    if (!russianHub.includes(`href="${path}"`)) {
      rows.push(`/ru: missing acquisition-cluster link to ${path}`)
    }
  }
  for (const token of [
    'data-russian-home-hero-partners="fundednext-bright-funded"',
    '/go/fundednext?from=ru-home-hero-fundednext',
    '/go/bright-funded?from=ru-home-hero-bright-funded',
    'data-russian-home-featured-partners="fundednext-bright-funded"',
    'data-russian-home-deals-partners="fundednext-bright-funded"',
    'data-russian-home-ftmo-entry="non-affiliate-to-partners"',
    'href="/ru/obzor-ftmo"',
    'Промокоды FundedNext и Bright Funded',
    'Сравнить коды и итоговые цены',
    'href="/ru/fundednext-vs-bright-funded"',
    'Сравнить FundedNext и Bright Funded',
    'Главное сравнение русской версии: 7 продуктов, 40 цен',
    'data-russian-home-featured-partner={item.slug}',
    "const featuredPartnerRoutes = [",
    "{ slug: 'fundednext', name: 'FundedNext'",
    "{ slug: 'bright-funded', name: 'Bright Funded'",
    'from=ru-home-${item.slug}',
    'rel="sponsored nofollow noopener"',
    'USDC-выплата не доказывает доступ к торговле криптовалютой',
    'официальные формулировки FundedNext противоречат друг другу',
  ]) {
    if (!russianHub.includes(token)) rows.push(`Russian home featured-partner funnel is missing ${token}`)
  }

  const localFirmPage = fs.existsSync(russianRouteFiles.get('/ru/rossiyskie-prop-kompanii'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/rossiyskie-prop-kompanii'), 'utf8')
    : ''
  for (const token of [
    'data-russian-local-firms="verification-only"',
    'data-russian-affiliate-opportunity="unactivated"',
    'Это не топ и не совет зарегистрироваться.',
    'многоуровневая Ambassador-схема нам не нужна',
    'href="/ru/dlya-russkoyazychnykh-treyderov"',
    'href="/ru/obzor-proplive"',
    'А-Лаб Групп',
    'TeamTraders',
    'Trade System',
  ]) {
    if (!localFirmPage.includes(token)) rows.push(`local-company verification page is missing ${token}`)
  }
  // Local-company research may hand readers to a separately labelled global
  // partner section. Keep the old guard for any unlabelled/unsponsored CTA.
  const approvedLocalGlobalHandoff =
    localFirmPage.includes('data-russian-local-global-funnel="partner-routes"') &&
    (localFirmPage.includes('from=ru-local-research-') || localFirmPage.includes("campaign: 'ru-local-research-")) &&
    localFirmPage.includes('rel="sponsored nofollow noopener"')
  if (localFirmPage.includes('/go/') && !approvedLocalGlobalHandoff) {
    rows.push('local-company verification page contains an unapproved affiliate CTA')
  }

  const russianRankingPage = fs.existsSync(russianRouteFiles.get('/ru/luchshie-prop-firmy'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/luchshie-prop-firmy'), 'utf8')
    : ''
  for (const token of [
    'data-russian-ranking-article="decision-first"',
    'data-russian-ranking-country-paths="diaspora-not-russia"',
    'data-russian-partner-shortlist="global"',
    'data-russian-ranking-partner-matrix="three-global-partners"',
    'data-russian-ranking-intent-paths="payout-drawdown-budget"',
    'data-russian-affiliate-disclosure="partner-shortlist"',
    "const globalPartners = ['fundednext', 'fundingpips', 'bright-funded']",
    'from=ru-ranking-partner-shortlist',
    '`/go/${item.slug}?from=ru-ranking-partner-shortlist`',
    'rel="sponsored nofollow noopener"',
    'href="/ru/rossiyskie-prop-kompanii"',
    'href="/ru/prop-firmy-bez-chelendzha"',
    'href="/ru/vyplaty-prop-firm"',
    'href="/ru/otzyvy-prop-firm"',
  ]) {
    if (!russianRankingPage.includes(token)) rows.push(`Russian global-partner shortlist is missing ${token}`)
  }

  const russianCryptoPage = fs.existsSync(russianRouteFiles.get('/ru/luchshie-kripto-prop-firmy'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/luchshie-kripto-prop-firmy'), 'utf8')
    : ''
  for (const token of [
    'data-russian-crypto-article="long-form"',
    'data-russian-crypto-hero="search-and-product-evidence"',
    'data-russian-crypto-ranking="source-gated"',
    'data-russian-crypto-product-count={productCount}',
    'data-russian-crypto-partner-count={partnerCount}',
    'data-russian-crypto-comparison="three-firms-twelve-products"',
    'data-russian-crypto-decision-guide="product-not-logo"',
    'data-russian-crypto-payout-boundary="bright-funded-not-ranked"',
    'data-russian-crypto-search-language="current-autocomplete"',
    'data-russian-crypto-watch-count={cryptoMarketEvidence.watch.length}',
    'data-russian-affiliate-disclosure="crypto-ranking"',
    'data-russian-country-boundary="crypto-not-access"',
    'from=ru-crypto-ranking',
    '/go/bright-funded?from=ru-crypto-ranking-payout-alternative',
    'rel="sponsored nofollow noopener"',
    'cryptoMarketEvidence',
    'russianMarketEvidence',
  ]) {
    if (!russianCryptoPage.includes(token)) rows.push(`Russian crypto ranking is missing ${token}`)
  }

  const russianDiasporaPage = fs.existsSync(russianRouteFiles.get('/ru/dlya-russkoyazychnykh-treyderov'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/dlya-russkoyazychnykh-treyderov'), 'utf8')
    : ''
  for (const token of [
    'data-russian-diaspora-guide="global-access"',
    'data-russian-diaspora-regions="kazakhstan-uae"',
    'data-russian-diaspora-regions="global-routes"',
    'data-russian-diaspora-region-funnel="global-partners"',
    'data-russian-country-boundary="diaspora-not-access"',
    'data-russian-affiliate-disclosure="diaspora-guide"',
    'ru-diaspora-fundednext',
    'ru-diaspora-fundingpips',
    'ru-diaspora-bright-funded',
    'ru-diaspora-regions-',
    'rel="sponsored nofollow noopener"',
    'Российские проп-компании',
    'проп-фирмы для русскоязычных в Европе',
    'проп-фирмы для трейдеров в Грузии',
  ]) {
    if (!russianDiasporaPage.includes(token)) rows.push(`Russian diaspora guide is missing ${token}`)
  }

  const russianComparisonPage = fs.existsSync(russianRouteFiles.get('/ru/fundednext-vs-fundingpips'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/fundednext-vs-fundingpips'), 'utf8')
    : ''
  for (const token of [
    'data-russian-partner-comparison="fundednext-fundingpips"',
    'data-russian-country-boundary="comparison-not-access"',
    'data-russian-affiliate-disclosure="comparison"',
    'data-russian-comparison-product-count={productRows.length}',
    'ru-comparison-fundednext-fundingpips',
    'brightFundedProducts',
    'data-russian-comparison-partner="bright-funded"',
    'ru-comparison-bright-funded',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianComparisonPage.includes(token)) rows.push(`Russian partner comparison is missing ${token}`)
  }

  const russianPrimaryComparisonPage = fs.existsSync(russianRouteFiles.get('/ru/fundednext-vs-bright-funded'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/fundednext-vs-bright-funded'), 'utf8')
    : ''
  for (const token of [
    'data-russian-primary-comparison="fundednext-bright-funded"',
    'data-russian-primary-comparison-products={products.length}',
    'data-russian-primary-comparison-prices={priceCount}',
    'data-russian-primary-comparison-article="product-before-brand"',
    'data-russian-country-boundary="comparison-not-access"',
    'data-russian-affiliate-disclosure="fundednext-bright-comparison"',
    'data-russian-primary-comparison-matrix="five-constraints"',
    'data-russian-primary-comparison-products="seven-current-products"',
    'data-russian-primary-comparison-product={`${product.firmSlug}:${product.productSlug}`}',
    'data-russian-primary-comparison-one-step="same-caps-different-engine"',
    'data-russian-primary-comparison-two-step="matched-risk-buckets"',
    'data-russian-primary-comparison-instant="fundednext-only"',
    'data-russian-primary-comparison-cost="compute-true-cost"',
    'data-russian-primary-comparison-payout="methods-cycle-fees"',
    'data-russian-primary-comparison-kyc="two-required-processes"',
    'data-russian-primary-comparison-diaspora="language-not-residency"',
    'data-russian-primary-comparison-trust="suppressed-is-not-null"',
    'data-russian-primary-comparison-search="zero-suggestions-no-doorways"',
    'data-russian-primary-comparison-decision="constraint-before-commission"',
    'data-russian-primary-comparison-cta="fundednext"',
    'data-russian-primary-comparison-cta="bright-funded"',
    'challengeTierEconomics',
    '/go/fundednext?from=ru-fn-vs-bright-fundednext',
    '/go/bright-funded?from=ru-fn-vs-bright-bright-funded',
    '/go/fundednext?from=ru-fn-vs-bright-verdict-fundednext',
    '/go/bright-funded?from=ru-fn-vs-bright-verdict-bright-funded',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianPrimaryComparisonPage.includes(token)) {
      rows.push(`Russian FundedNext/Bright comparison is missing ${token}`)
    }
  }
  const currentPrimaryComparisonProducts = fs.readdirSync(CHALLENGES)
    .filter(file => ['fundednext.json', 'bright-funded.json'].includes(file))
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(CHALLENGES, file), 'utf8')))
    .filter(product => {
      const captured = new Date(`${product.sourceCapturedAt}T23:59:59Z`)
      const ageDays = (Date.now() - captured.getTime()) / 86_400_000
      return !Number.isNaN(captured.getTime()) && ageDays >= -1 && ageDays <= 30
    })
  const currentPrimaryComparisonPriceCount = currentPrimaryComparisonProducts.reduce((sum, product) => sum
    + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)).length, 0)
  if (currentPrimaryComparisonProducts.length !== 7 || currentPrimaryComparisonPriceCount !== 40) {
    rows.push(`Russian FundedNext/Bright fixture expects 7 products and 40 prices; received ${currentPrimaryComparisonProducts.length} and ${currentPrimaryComparisonPriceCount}`)
  }

  const russianDealsPage = fs.existsSync(russianRouteFiles.get('/ru/promokody-prop-firm'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/promokody-prop-firm'), 'utf8')
    : ''
  for (const token of [
    'data-russian-deals="verified-offers"',
    'data-russian-deals-guide="long-form-verified-offers"',
    'data-russian-offer-freshness="30-days"',
    'data-russian-deals-featured-partners="fundednext-bright-funded"',
    'data-russian-deals-article="checkout-intent-source-gated"',
    'data-russian-country-boundary="deals-not-access"',
    'data-russian-affiliate-disclosure="deals"',
    'data-russian-deals-mechanisms="checkout-link-earned"',
    'data-russian-deals-featured-partner="fundednext"',
    'data-russian-deals-fundednext="earned-not-public"',
    'data-russian-deals-discount-table="currency-preserved"',
    'data-russian-deals-featured-partner="bright-funded"',
    'data-russian-deals-bright="three-product-codes"',
    'data-russian-deals-bright-price-rows={brightRows.length}',
    'data-russian-deals-secondary="fundingpips"',
    'data-russian-deals-decision="product-before-discount"',
    'data-russian-deals-checkout="final-total-controls"',
    'data-russian-deals-search="brand-signal-generic-gap"',
    'data-russian-deals-diaspora="language-not-residency"',
    'data-russian-deals-expiry="thirty-day-fail-closed"',
    'getAllDeals',
    'getAllChallenges',
    'isChallengeFresh',
    'CopyableCodePill',
    'locale="ru"',
    'campaignFor(deal)',
    '/go/fundednext?from=ru-deals-fundednext-earned-coupon',
    '/go/fundingpips?from=ru-deals-fundingpips-hello',
    "fundednext: '/ru/obzor-fundednext'",
    "'bright-funded': '/ru/obzor-bright-funded'",
    "fundingpips: '/ru/obzor-fundingpips'",
    "author: { '@type': 'Person', name: 'Edris Derakhshi'",
    'rel={isAffiliate ? \'sponsored nofollow noopener\' : \'nofollow noopener\'}',
  ]) {
    if (!russianDealsPage.includes(token)) rows.push(`Russian offers page is missing ${token}`)
  }

  const russianInstantPage = fs.existsSync(russianRouteFiles.get('/ru/prop-firmy-bez-chelendzha'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/prop-firmy-bez-chelendzha'), 'utf8')
    : ''
  for (const token of [
    'data-russian-instant-ranking="long-form-phase-zero"',
    'data-russian-instant-firm-count={instantFirmCount}',
    'data-russian-country-boundary="instant-not-access"',
    'data-russian-affiliate-disclosure="instant-ranking"',
    'data-russian-instant-product-count={products.length}',
    'data-russian-instant-article="global-partner-decision-guide"',
    'data-russian-instant-definition="zero-evaluation-not-zero-rules"',
    'data-russian-instant-featured-partners="fundednext-fundingpips"',
    'data-russian-instant-evidence={card.slug}',
    'data-russian-instant-partner="fundednext"',
    'data-russian-instant-partner="fundingpips"',
    'data-russian-instant-all-products={products.length}',
    'data-russian-instant-product={`${product.firmSlug}:${product.productSlug}`}',
    'data-russian-instant-risk="drawdown-before-price"',
    'data-russian-instant-diaspora="country-before-checkout"',
    'data-russian-instant-search="generic-and-branded"',
    'data-russian-instant-bright="challenge-alternative-only"',
    'data-russian-instant-local-boundary="different-market-models"',
    'data-russian-instant-decision="risk-before-fee"',
    "{ slug: 'fundednext', name: 'FundedNext', productSlug: 'stellar-instant'",
    "{ slug: 'fundingpips', name: 'FundingPips', productSlug: 'zero'",
    '/go/fundednext?from=ru-instant-fundednext',
    '/go/fundingpips?from=ru-instant-fundingpips',
    '/go/bright-funded?from=ru-instant-bright-alternative',
    'FUNDEDNEXT_REWARD_URL',
    'FUNDINGPIPS_ZERO_URL',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianInstantPage.includes(token)) rows.push(`Russian instant page is missing ${token}`)
  }
  const currentInstantProducts = fs.readdirSync(CHALLENGES)
    .filter(file => file.endsWith('.json') && !file.startsWith('_'))
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(CHALLENGES, file), 'utf8')))
    .filter(product => {
      if (product.phases !== 0) return false
      const captured = new Date(`${product.sourceCapturedAt}T23:59:59Z`)
      const ageDays = (Date.now() - captured.getTime()) / 86_400_000
      return !Number.isNaN(captured.getTime()) && ageDays >= -1 && ageDays <= 30
    })
  const currentInstantFirmSlugs = new Set(currentInstantProducts.map(product => product.firmSlug))
  const currentInstantPriceCount = currentInstantProducts.reduce((sum, product) => sum
    + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)).length, 0)
  if (
    currentInstantProducts.length !== 9
    || currentInstantFirmSlugs.size !== 7
    || currentInstantPriceCount !== 39
  ) {
    rows.push(`Russian instant fixture expects 9 products, 7 firms and 39 prices; received ${currentInstantProducts.length}, ${currentInstantFirmSlugs.size} and ${currentInstantPriceCount}`)
  }
  const fundedNextInstant = currentInstantProducts.filter(product =>
    product.firmSlug === 'fundednext' && product.productSlug === 'stellar-instant')
  const fundingPipsZero = currentInstantProducts.filter(product =>
    product.firmSlug === 'fundingpips' && product.productSlug === 'zero')
  const brightInstant = currentInstantProducts.filter(product => product.firmSlug === 'bright-funded')
  if (
    fundedNextInstant.length !== 1
    || fundingPipsZero.length !== 1
    || brightInstant.length !== 0
  ) {
    rows.push('Russian instant partner boundary must contain FundedNext Stellar Instant and FundingPips Zero, with 0 Bright Funded phase-0 products')
  }

  const russianPayoutsPage = fs.existsSync(russianRouteFiles.get('/ru/vyplaty-prop-firm'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/vyplaty-prop-firm'), 'utf8')
    : ''
  for (const token of [
    'data-russian-payout-guide="long-form-source-gated"',
    'data-russian-payout-partner-count={cards.length}',
    'data-russian-payout-article="diaspora-withdrawal-decision"',
    'data-russian-country-boundary="payout-not-access"',
    'data-russian-affiliate-disclosure="payout-ranking"',
    'data-russian-payout-matrix={cards.length}',
    'data-russian-payout-evidence={card.slug}',
    'data-russian-payout-featured-partners="fundednext-bright-funded"',
    'data-russian-payout-featured-partner={card.slug}',
    'data-russian-payout-gates="eligibility-request-processing-receipt"',
    'data-russian-payout-product-table={productCount}',
    'data-russian-payout-methods="rail-token-currency"',
    'data-russian-payout-fees="firm-provider-network-fx"',
    'data-russian-payout-diaspora="language-not-bank-country"',
    'data-russian-payout-secondary="fundingpips"',
    'data-russian-payout-local-models="separate-rub-contracts"',
    'data-russian-payout-search="brand-signal-generic-gap"',
    'data-russian-payout-decision="net-receipt-before-registration"',
    'payoutFirstDays',
    'payoutFrequency',
    '/go/fundednext?from=ru-payouts-fundednext',
    '/go/bright-funded?from=ru-payouts-bright-funded',
    '/go/fundingpips?from=ru-payouts-fundingpips',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianPayoutsPage.includes(token)) rows.push(`Russian payouts page is missing ${token}`)
  }
  const currentPayoutProducts = fs.readdirSync(CHALLENGES)
    .filter(file => file.endsWith('.json') && !file.startsWith('_'))
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(CHALLENGES, file), 'utf8')))
    .filter(product => {
      if (!['fundednext', 'bright-funded', 'fundingpips'].includes(product.firmSlug)) return false
      const captured = new Date(`${product.sourceCapturedAt}T23:59:59Z`)
      const ageDays = (Date.now() - captured.getTime()) / 86_400_000
      return !Number.isNaN(captured.getTime()) && ageDays >= -1 && ageDays <= 30
    })
  const currentPayoutPriceCount = currentPayoutProducts.reduce((sum, product) => sum
    + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)).length, 0)
  if (currentPayoutProducts.length !== 12 || currentPayoutPriceCount !== 67) {
    rows.push(`Russian payout fixture expects 12 products and 67 prices; received ${currentPayoutProducts.length} and ${currentPayoutPriceCount}`)
  }

  const russianKycPage = fs.existsSync(russianRouteFiles.get('/ru/prop-firmy-bez-kyc'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/prop-firmy-bez-kyc'), 'utf8')
    : ''
  for (const token of [
    'data-russian-kyc-guide="long-form-source-gated"',
    'data-russian-kyc-partner-count={partnerCards.length}',
    'data-russian-kyc-article="diaspora-decision-guide"',
    'data-russian-country-boundary="kyc-not-access"',
    'data-russian-affiliate-disclosure="kyc-guide"',
    'data-russian-kyc-gates="checkout-account-contract-payout"',
    'data-russian-kyc-matrix={partnerCards.length}',
    'data-russian-kyc-evidence={card.slug}',
    'data-russian-kyc-featured-partners="fundednext-bright-funded"',
    'data-russian-kyc-featured-partner={card.slug}',
    'data-russian-kyc-documents="identity-address-selfie"',
    'data-russian-kyc-payout-boundary="firm-vs-provider"',
    'data-russian-kyc-diaspora="language-not-residency"',
    'data-russian-kyc-search-language="brand-signal-generic-gap"',
    'data-russian-kyc-local-models="separate-contracts"',
    'data-russian-kyc-decision="documents-before-checkout"',
    'data-russian-kyc-secondary-partner="fundingpips"',
    'from=ru-kyc-${card.slug}',
    'from=ru-kyc-fundingpips',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianKycPage.includes(token)) rows.push(`Russian KYC page is missing ${token}`)
  }

  const russianPropLivePage = fs.existsSync(russianRouteFiles.get('/ru/obzor-proplive'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/obzor-proplive'), 'utf8')
    : ''
  for (const token of [
    'data-russian-local-review="proplive"',
    'data-russian-local-review-status="verification-only"',
    'data-russian-country-boundary="local-review-not-access"',
    'data-russian-local-affiliate="application-only"',
    'data-russian-local-global-funnel="proplive"',
    'data-russian-proplive-start-check="four-points"',
    'PROP_LIVE_HOME',
    'PROP_LIVE_ABOUT',
    'PROP_LIVE_REQUISITES',
    'PROP_LIVE_PARTNERS',
    'PROP_LIVE_CONTRACT',
    'ru-proplive-global-',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianPropLivePage.includes(token)) rows.push(`Russian PropLive review is missing ${token}`)
  }

  const russianEraTradePage = fs.existsSync(russianRouteFiles.get('/ru/obzor-eratrade'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/obzor-eratrade'), 'utf8')
    : ''
  for (const token of [
    'data-russian-local-review="era-trade"',
    'data-russian-local-review-status="verification-only"',
    'data-russian-country-boundary="local-review-not-access"',
    'data-russian-local-affiliate="public-not-activated"',
    'data-russian-local-global-funnel="era-trade"',
    'data-russian-eratrade-due-diligence="product-split"',
    'ERA_HOME',
    'ERA_AFFILIATE',
    'ERA_RULES',
    'ERA_PAYOUT',
    'ERA_PAYOUT_SYSTEM',
    'ERA_PROFITABLE_DAYS',
    'ERA_SPLIT',
    'ERA_TWO_STAGE',
    'ERA_ONE_STAGE',
    'ru-eratrade-global-',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianEraTradePage.includes(token)) rows.push(`Russian Era Trade review is missing ${token}`)
  }

  const russianKasCapitalPage = fs.existsSync(russianRouteFiles.get('/ru/obzor-kascapital'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/obzor-kascapital'), 'utf8')
    : ''
  for (const token of [
    'data-russian-local-review="kascapital"',
    'data-russian-local-review-status="verification-only"',
    'data-russian-country-boundary="local-review-not-access"',
    'data-russian-local-affiliate="not-found"',
    'data-russian-local-global-funnel="kascapital"',
    'data-russian-kascapital-due-diligence="terms-gap"',
    'KAS_HOME',
    'ru-kascapital-global-',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianKasCapitalPage.includes(token)) rows.push(`Russian KasCapital review is missing ${token}`)
  }

  const russianReviewsPage = fs.existsSync(russianRouteFiles.get('/ru/otzyvy-prop-firm'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/otzyvy-prop-firm'), 'utf8')
    : ''
  for (const token of [
    'data-russian-reviews-guide="long-form-source-gated"',
    'data-russian-reviews-article="decision-first"',
    'data-russian-country-boundary="reviews-not-access"',
    'data-russian-affiliate-disclosure="reviews-guide"',
    'data-russian-reviews-checklist="seven-fields"',
    'data-russian-reviews-featured-partners="fundednext-bright-funded"',
    'data-russian-reviews-featured-partner={card.slug}',
    'data-russian-reviews-product-evidence={featuredProducts.length}',
    'data-russian-reviews-payout-case="seven-facts"',
    'data-russian-reviews-negative-case="rule-first"',
    'data-russian-reviews-search-language="current-autocomplete"',
    'data-russian-reviews-local-models="bridge-not-ranking"',
    'data-russian-reviews-decision="reviews-to-product"',
    'data-russian-reviews-secondary-partner="fundingpips"',
    '`/go/${card.slug}?from=ru-reviews-guide-${card.slug}`',
    '/go/fundingpips?from=ru-reviews-guide-fundingpips',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianReviewsPage.includes(token)) rows.push(`Russian reviews guide is missing ${token}`)
  }

  const russianEducationPage = fs.existsSync(russianRouteFiles.get('/ru/kak-rabotayut-chellendzhi-prop-firm'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/kak-rabotayut-chellendzhi-prop-firm'), 'utf8')
    : ''
  for (const token of [
    'getAllFirms',
    'outboundSlug',
    'data-russian-education-partner-cta="challenge-guide"',
    'data-russian-education-partner={item.slug}',
    'ru-challenge-guide-',
    'rel="sponsored nofollow noopener"',
  ]) {
    if (!russianEducationPage.includes(token)) rows.push(`Russian education page is missing ${token}`)
  }

  const fundedNextRussianPage = fs.existsSync(russianRouteFiles.get('/ru/obzor-fundednext'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/obzor-fundednext'), 'utf8')
    : ''
  for (const token of [
    'data-russian-fundednext-article="long-form"',
    'data-fundednext-russia-access="conflicting"',
    'data-fundednext-russian-truecost="true"',
    'Содержание обзора',
    'id="verdict"',
    '/go/fundednext?from=ru-fundednext-review-verdict',
    'href="/ru/fundednext-vs-bright-funded"',
    'rel="sponsored nofollow noopener"',
    'VPN',
  ]) {
    if (!fundedNextRussianPage.includes(token)) rows.push(`Russian FundedNext path is missing ${token}`)
  }

  const ftmoRussianPage = fs.existsSync(russianRouteFiles.get('/ru/obzor-ftmo'))
    ? fs.readFileSync(russianRouteFiles.get('/ru/obzor-ftmo'), 'utf8')
    : ''
  for (const token of [
    'data-russian-ftmo-review="search-to-decision"',
    'data-russian-ftmo-article="long-form-source-first"',
    'data-russian-country-boundary="ftmo-russia-restricted"',
    'data-russian-ftmo-verdict="two-products-not-one-brand"',
    'data-russian-ftmo-official-site="non-affiliate"',
    'data-russian-ftmo-product-matrix="two-current-products"',
    'data-russian-ftmo-price-count={pricedTiers.length}',
    'data-russian-ftmo-truecost={pricedTiers.length}',
    'challengeTierEconomics',
    'data-russian-ftmo-risk="static-vs-eod-trailing"',
    'data-russian-ftmo-payout="day-14-refund-split"',
    'data-russian-ftmo-fit="rule-before-brand"',
    'data-russian-ftmo-global-funnel="fundednext-bright-funded"',
    'data-russian-affiliate-disclosure="ftmo-alternatives"',
    'data-russian-ftmo-alternative={item.slug}',
    '/go/ftmo?from=ru-ftmo-review-verdict',
    '`/go/${item.slug}?from=ru-ftmo-alternative-${item.slug}`',
    'data-russian-ftmo-checklist="seven-fields"',
    'href="/ru/fundednext-vs-bright-funded"',
    'rel="sponsored nofollow noopener"',
    'Российская Федерация',
  ]) {
    if (!ftmoRussianPage.includes(token)) rows.push(`Russian FTMO path is missing ${token}`)
  }
  const currentFtmoProducts = JSON.parse(fs.readFileSync(path.join(CHALLENGES, 'ftmo.json'), 'utf8'))
    .filter(product => {
      const captured = new Date(`${product.sourceCapturedAt}T23:59:59Z`)
      const ageDays = (Date.now() - captured.getTime()) / 86_400_000
      return !Number.isNaN(captured.getTime()) && ageDays >= -1 && ageDays <= 30
    })
  const currentFtmoPriceCount = currentFtmoProducts.reduce((sum, product) => sum
    + product.accountSizes.filter(tier => tier.priceEur != null && tier.priceEur > 0).length, 0)
  if (currentFtmoProducts.length !== 2 || currentFtmoPriceCount !== 10) {
    rows.push(`Russian FTMO fixture expects 2 products and 10 EUR prices; received ${currentFtmoProducts.length} and ${currentFtmoPriceCount}`)
  }
  if (!fs.existsSync(path.join(CHALLENGES, '_captures', 'ftmo-2026-08-28.json'))) {
    rows.push('Russian FTMO review is missing its 2026-08-28 first-party capture provenance')
  }

  for (const [route, expectedTokens] of [
    ['/ru/obzor-fundingpips', [
      'data-russian-partner-review={firmSlug}',
      'data-russian-partner-article={firmSlug}',
      'data-russian-partner-editorial-shell={firmSlug}',
      'data-russian-partner-country-access="unconfirmed"',
      'data-russian-partner-review-method="product-first"',
      'data-russian-affiliate-disclosure={firmSlug}',
      'affiliateSlug="fundingpips"',
      'affiliateFrom="ru-fundingpips-review-verdict"',
      'data-russian-fundingpips-deep-dive="reward-routes"',
      'data-russian-fundingpips-reward-routes="five-products"',
      'data-russian-fundingpips-deep-dive="payout-methods"',
      'data-russian-fundingpips-payout-routes="four"',
      'data-russian-fundingpips-deep-dive="strategy-platforms"',
      'data-russian-fundingpips-deep-dive="true-cost"',
      'data-russian-fundingpips-truecost={fixedRouteRows.length}',
      'data-russian-fundingpips-deep-dive="pros-cons"',
      'data-russian-fundingpips-deep-dive="fit"',
      "affiliateFrom.replace(/-verdict$/, '-summary')",
      '`/go/${affiliateSlug}?from=${affiliateFrom}`',
      'rel="sponsored nofollow noopener"',
    ]],
    ['/ru/obzor-bright-funded', [
      'data-russian-partner-review="bright-funded"',
      'data-russian-bright-article="long-form"',
      'data-russian-bright-country-access="published-list"',
      'data-russian-bright-plan-matrix="three-products"',
      'data-russian-bright-price-count={pricedTiers.length}',
      'data-russian-bright-truecost={pricedTiers.length}',
      'data-russian-bright-payouts="eur-usdc"',
      'data-russian-bright-diaspora="currency-first"',
      'data-russian-affiliate-disclosure="bright-funded"',
      '/go/bright-funded?from=ru-bright-funded-review-verdict',
      'href="/ru/fundednext-vs-bright-funded"',
      'rel="sponsored nofollow noopener"',
    ]],
  ]) {
    const pageSource = fs.existsSync(russianRouteFiles.get(route))
      ? fs.readFileSync(russianRouteFiles.get(route), 'utf8')
      : ''
    const page = pageSource.includes('RussianPartnerReview')
      ? `${pageSource}\n${russianPartnerReviewSource}`
      : pageSource
    for (const token of expectedTokens) {
      if (!page.includes(token)) rows.push(`${route}: Russian partner review is missing ${token}`)
    }
  }

  const headerNav = fs.readFileSync(path.join(ROOT, 'components/HeaderNav.tsx'), 'utf8')
  for (const token of [
    "label: 'Проп-фирмы'",
    "label: 'Обзоры'",
    "label: 'Гайды'",
    "label: 'Местные компании'",
    "href: '/ru/rossiyskie-prop-kompanii'",
    "href: '/ru/luchshie-kripto-prop-firmy'",
    "href: '/ru/dlya-russkoyazychnykh-treyderov'",
    "href: '/ru/fundednext-vs-bright-funded'",
    "href: '/ru/fundednext-vs-fundingpips'",
    "href: '/ru/promokody-prop-firm'",
    "href: '/ru/vyplaty-prop-firm'",
    "href: '/ru/prop-firmy-bez-kyc'",
    "href: '/ru/obzor-proplive'",
    "href: '/ru/obzor-ftmo'",
    "href: '/ru/obzor-eratrade'",
    "href: '/ru/obzor-kascapital'",
    "href: '/ru/obzor-fundingpips'",
    "href: '/ru/obzor-bright-funded'",
    "href: '/ru/otzyvy-prop-firm'",
    "href: '/ru/prop-firmy-bez-chelendzha'",
    'getAlternateLanguageHref(pathname)',
    'hrefLang={isRussian ? \'en\' : \'ru\'}',
  ]) {
    if (!headerNav.includes(token)) rows.push(`Russian header navigation is missing ${token}`)
  }
  const headerBrand = fs.readFileSync(path.join(ROOT, 'components/HeaderBrand.tsx'), 'utf8')
  if (!headerBrand.includes("isRussian ? '/ru' : '/'")) {
    rows.push('header brand does not preserve the Russian locale home')
  }
  const footer = fs.readFileSync(path.join(ROOT, 'components/Footer.tsx'), 'utf8')
  if (!footer.includes("href: '/ru'")) rows.push('global footer is missing the Russian-language entry point')
  if (!footer.includes("href: '/ru/fundednext-vs-bright-funded'")) rows.push('Russian footer is missing the primary partner comparison')
  if (!footer.includes("href: '/ru/vyplaty-prop-firm'")) rows.push('Russian footer is missing the payouts route')
  if (!footer.includes("href: '/ru/prop-firmy-bez-kyc'")) rows.push('Russian footer is missing the KYC route')
  if (!footer.includes("href: '/ru/obzor-proplive'")) rows.push('Russian footer is missing the PropLive review route')
  if (!footer.includes("href: '/ru/obzor-eratrade'")) rows.push('Russian footer is missing the Era Trade review route')
  if (!footer.includes("href: '/ru/obzor-kascapital'")) rows.push('Russian footer is missing the KasCapital review route')
  if (!footer.includes("href: '/ru/otzyvy-prop-firm'")) rows.push('Russian footer is missing the reviews guide route')
  if (!footer.includes("href: '/ru/obzor-ftmo'")) rows.push('Russian footer is missing the FTMO review route')

  const sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8')
  for (const token of [
    'LOCALIZED_ROUTE_PAIRS',
    'RUSSIAN_ONLY_ROUTES',
    "'x-default': `${BASE_URL}${pair.en}`",
    'russianMarketEvidence.capturedAt',
  ]) {
    if (!sitemap.includes(token)) rows.push(`sitemap is missing Russian safeguard ${token}`)
  }

  const releaseCrawl = fs.readFileSync(RELEASE_CRAWL_FILE, 'utf8')
  for (const token of [
    'const russianRoutePairs = [...LOCALIZED_ROUTE_PAIRS]',
    'Russian sitemap routes disagree with the ${russianPaths.length}-page acquisition pilot',
    'rendered Russian language boundary or schema is missing',
    'controlled affiliate CTA is missing or mislabelled',
    'unapproved local-firm affiliate action rendered',
    'Russian affiliate attribution failed',
  ]) {
    if (!releaseCrawl.includes(token)) rows.push(`release crawl is missing Russian safeguard ${token}`)
  }

  if (rows.length) {
    console.log('\n✗ Russian-language acquisition and local-firm boundary')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

/** Related links must be relevant, deterministic, unique, and never self-link. */
function checkRelatedPostSelection() {
  const rows = []
  const posts = fs.readdirSync(POSTS)
    .filter(file => file.endsWith('.md') && !file.startsWith('_'))
    .map(file => {
      const { data, content } = matter(fs.readFileSync(path.join(POSTS, file), 'utf-8'))
      return { ...data, content }
    })
  const bySlug = new Map(posts.map(post => [post.slug, post]))

  for (const current of posts) {
    const selected = rankRelatedPosts(current, posts)
    const selectedSlugs = selected.map(post => post.slug)
    const relevantCount = posts.filter(candidate =>
      candidate.slug !== current.slug && relatedPostScore(current, candidate) > 0
    ).length
    const expectedCount = Math.min(3, relevantCount)

    if (selected.length !== expectedCount) {
      rows.push(`${current.slug}: expected ${expectedCount} related posts, found ${selected.length}`)
    }
    if (selectedSlugs.includes(current.slug)) {
      rows.push(`${current.slug}: related posts include a self-link`)
    }
    if (new Set(selectedSlugs).size !== selectedSlugs.length) {
      rows.push(`${current.slug}: related posts contain a duplicate`)
    }
    if (selected.some(candidate => relatedPostScore(current, bySlug.get(candidate.slug)) <= 0)) {
      rows.push(`${current.slug}: related posts contain a zero-signal filler`)
    }

    const reversed = rankRelatedPosts(current, [...posts].reverse()).map(post => post.slug)
    if (JSON.stringify(reversed) !== JSON.stringify(selectedSlugs)) {
      rows.push(`${current.slug}: related-post order depends on filesystem input order`)
    }
  }

  const fixtures = new Map([
    ['fundednext-review', ['what-is-prop-firm-consistency-rule', 'ftmo-review']],
    ['ftmo-review', ['ftmo-free-trial-explained']],
    ['prop-firm-payout-tax-india', ['are-prop-firms-legal-in-india']],
    ['traders-connect-trade-copier', ['what-is-copy-trading']],
  ])
  for (const [slug, required] of fixtures) {
    const current = bySlug.get(slug)
    if (!current) {
      rows.push(`${slug}: related-post audit fixture is missing its source post`)
      continue
    }
    const selected = new Set(rankRelatedPosts(current, posts).map(post => post.slug))
    for (const requiredSlug of required) {
      if (!selected.has(requiredSlug)) {
        rows.push(`${slug}: related posts are missing ${requiredSlug}`)
      }
    }
  }

  if (rows.length) {
    console.log('\n✗ Related-post relevance')
    for (const row of rows) console.log(`  · ${row}`)
  }
  return rows.length
}

const aggregateErrors = checkFirmAggregates()
totalErrors += aggregateErrors
const firmCoverageErrors = checkFirmCoverage()
totalErrors += firmCoverageErrors
const trustAndCommercialErrors = checkTrustAndCommercialSurface()
totalErrors += trustAndCommercialErrors
const firmAlternativeNeutralityErrors = checkFirmAlternativeNeutrality()
totalErrors += firmAlternativeNeutralityErrors
const tierDrawdownMathErrors = checkTierDrawdownMathSurface()
totalErrors += tierDrawdownMathErrors
const tierFeeAndDailyLossErrors = checkTierFeeAndDailyLossSurface()
totalErrors += tierFeeAndDailyLossErrors
const trueCostRuntimeFixtureErrors = checkTrueCostRuntimeFixtures()
totalErrors += trueCostRuntimeFixtureErrors
const globalDirectoryErrors = checkGlobalDirectorySurface()
totalErrors += globalDirectoryErrors
const legacyOverviewConsolidationErrors = checkLegacyOverviewConsolidation()
totalErrors += legacyOverviewConsolidationErrors
const ukLandingClusterErrors = checkUkLandingCluster()
totalErrors += ukLandingClusterErrors
const usLandingConsolidationErrors = checkUsLandingConsolidation()
totalErrors += usLandingConsolidationErrors
const swingFeatureClusterErrors = checkSwingFeatureCluster()
totalErrors += swingFeatureClusterErrors
const futuresLandingClusterErrors = checkFuturesLandingCluster()
totalErrors += futuresLandingClusterErrors
const cryptoLandingClusterErrors = checkCryptoLandingCluster()
totalErrors += cryptoLandingClusterErrors
const overallLandingClusterErrors = checkOverallLandingCluster()
totalErrors += overallLandingClusterErrors
const cheapestLandingClusterErrors = checkCheapestLandingCluster()
totalErrors += cheapestLandingClusterErrors
const discountHubErrors = checkDiscountHub()
totalErrors += discountHubErrors
const instantFundingClusterErrors = checkInstantFundingCluster()
totalErrors += instantFundingClusterErrors
const fundedNextAffiliatePathErrors = checkFundedNextAffiliatePath()
totalErrors += fundedNextAffiliatePathErrors
const globalChallengeErrors = checkGlobalChallengeSurface()
totalErrors += globalChallengeErrors
const challengeChangeFocusErrors = checkChallengeChangeFocusContract()
totalErrors += challengeChangeFocusErrors
const challengeMonitoringErrors = checkChallengeMonitoringWorkflow()
totalErrors += challengeMonitoringErrors
const indiaEvidenceErrors = checkIndiaEvidence()
totalErrors += indiaEvidenceErrors
const indiaAffiliateCampaignGuardErrors = checkIndiaAffiliateCampaignGuard()
totalErrors += indiaAffiliateCampaignGuardErrors
const analyticsMeasurementContractErrors = checkAnalyticsMeasurementContract()
totalErrors += analyticsMeasurementContractErrors
const indiaPayoutSurfaceErrors = checkIndiaPayoutSurface()
totalErrors += indiaPayoutSurfaceErrors
const indiaChallengeSurfaceErrors = checkIndiaChallengeSurface()
totalErrors += indiaChallengeSurfaceErrors
const indiaChallengeChangesSurfaceErrors = checkIndiaChallengeChangesSurface()
totalErrors += indiaChallengeChangesSurfaceErrors
const indiaTaxGuideErrors = checkIndiaTaxGuide()
totalErrors += indiaTaxGuideErrors
const challengeLifecyclePillarErrors = checkChallengeLifecyclePillar()
totalErrors += challengeLifecyclePillarErrors
const challengePassingPillarErrors = checkChallengePassingPillar()
totalErrors += challengePassingPillarErrors
const trueCostPillarErrors = checkTrueCostPillar()
totalErrors += trueCostPillarErrors
const drawdownGuideErrors = checkDrawdownGuide()
totalErrors += drawdownGuideErrors
const overtradingGuideErrors = checkOvertradingGuide()
totalErrors += overtradingGuideErrors
const profitabilityGuideErrors = checkProfitabilityGuide()
totalErrors += profitabilityGuideErrors
const consistencyGuideErrors = checkConsistencyGuide()
totalErrors += consistencyGuideErrors
const fundingPipsZeroGuideErrors = checkFundingPipsZeroGuide()
totalErrors += fundingPipsZeroGuideErrors
const ftmoFreeTrialGuideErrors = checkFtmoFreeTrialGuide()
totalErrors += ftmoFreeTrialGuideErrors
const passingServicesGuideErrors = checkPassingServicesGuide()
totalErrors += passingServicesGuideErrors
const copyTradingGuideErrors = checkCopyTradingGuide()
totalErrors += copyTradingGuideErrors
const whatIsPropFirmGuideErrors = checkWhatIsPropFirmGuide()
totalErrors += whatIsPropFirmGuideErrors
const scalingPlanGuideErrors = checkScalingPlanGuide()
totalErrors += scalingPlanGuideErrors
const comparisonHubErrors = checkComparisonHub()
totalErrors += comparisonHubErrors
const comparisonDetailTemplateErrors = checkComparisonDetailTemplate()
totalErrors += comparisonDetailTemplateErrors
const fundedNextComparisonOverlayErrors = checkFundedNextComparisonOverlay()
totalErrors += fundedNextComparisonOverlayErrors
const tradingToolReviewClusterErrors = checkTradingToolReviewCluster()
totalErrors += tradingToolReviewClusterErrors
const wyckoffGuideErrors = checkWyckoffGuide()
totalErrors += wyckoffGuideErrors
const russianAcquisitionPilotErrors = checkRussianAcquisitionPilot()
totalErrors += russianAcquisitionPilotErrors
const relatedPostSelectionErrors = checkRelatedPostSelection()
totalErrors += relatedPostSelectionErrors

if (clean.length) {
  console.log(`\n✓ clean: ${clean.length}`)
  for (const c of clean) console.log(`  · ${c}`)
}

console.log(
  `\n${totalErrors} error(s), ${totalWarnings} warning(s)` +
    (showWarnings ? '' : ' — re-run with --warn to list warnings')
)

process.exit(totalErrors > 0 ? 1 : 0)
