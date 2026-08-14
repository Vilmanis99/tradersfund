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
import { decoratePostOutboundLinks } from '../lib/postOutboundLinks.ts'
import { rankRelatedPosts, relatedPostScore } from '../lib/relatedPosts.ts'
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
const COST_CALCULATOR_FILE = path.join(ROOT, 'components/v4/CostCalculator.tsx')
const HOMEPAGE_FILE = path.join(ROOT, 'app/page.tsx')
const COMPARISON_HERO_FILE = path.join(ROOT, 'components/ComparisonHero.tsx')
const COMPARISON_ROUTE_FILE = path.join(ROOT, 'app/compare/[matchup]/page.tsx')
const COMPARISONS_FILE = path.join(ROOT, 'lib/comparisons.ts')
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
    /\b(drawdown|consistency|profit split|payout|leverage|phase|trailing|static|scaling|breach|EA|news|weekend|overnight|refund|min(?:imum)? trading days)\b/i
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
      const expectedCampaign = `post-body-${postSlug}`
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
      'SOCIAL_CARD_ENTRY_COUNT = 12',
      'SOCIAL_CARD_FIRM_COUNT = 6',
      'SOCIAL_CARD_PRODUCT_COUNT = 16',
      'SOCIAL_CARD_VERIFIED_COUNT = 2',
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
    '$299.99',
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
    path.join(CHALLENGES, '_captures/fundingpips-2026-08-10.json'),
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
    'Reset is available at a 20% discount within 7 calendar days',
    'Prohibited as a hard breach: no position may be opened, closed, or held from 10 minutes before to 10 minutes after',
    'Prohibited as a hard breach on all instruments',
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

    if (
      !overlayText.includes("reviewedAt: '2026-08-14'") ||
      !overlayText.includes("challengeReviewedAt: '2026-08-14'") ||
      '2026-08-14' < latestCapture
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
  if (!hero.includes('from=compare-${campaign}')) {
    rows.push('comparison outbound links do not carry matchup-specific attribution')
  }
  if (!route.includes('campaign={canonical}')) {
    rows.push('comparison route does not pass its canonical matchup campaign')
  }

  if (rows.length) {
    console.log('\n✗ FundedNext commercial comparison')
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
const passingServicesGuideErrors = checkPassingServicesGuide()
totalErrors += passingServicesGuideErrors
const copyTradingGuideErrors = checkCopyTradingGuide()
totalErrors += copyTradingGuideErrors
const whatIsPropFirmGuideErrors = checkWhatIsPropFirmGuide()
totalErrors += whatIsPropFirmGuideErrors
const scalingPlanGuideErrors = checkScalingPlanGuide()
totalErrors += scalingPlanGuideErrors
const fundedNextComparisonOverlayErrors = checkFundedNextComparisonOverlay()
totalErrors += fundedNextComparisonOverlayErrors
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
