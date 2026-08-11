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

const aggregateErrors = checkFirmAggregates()
totalErrors += aggregateErrors
const firmCoverageErrors = checkFirmCoverage()
totalErrors += firmCoverageErrors
const trustAndCommercialErrors = checkTrustAndCommercialSurface()
totalErrors += trustAndCommercialErrors
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

if (clean.length) {
  console.log(`\n✓ clean: ${clean.length}`)
  for (const c of clean) console.log(`  · ${c}`)
}

console.log(
  `\n${totalErrors} error(s), ${totalWarnings} warning(s)` +
    (showWarnings ? '' : ' — re-run with --warn to list warnings')
)

process.exit(totalErrors > 0 ? 1 : 0)
