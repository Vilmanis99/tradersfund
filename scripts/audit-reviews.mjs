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
import { computeTrueCost } from '../lib/firms.ts'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const POSTS = path.join(ROOT, 'content/posts')
const CHALLENGES = path.join(ROOT, 'content/data/challenges')

/** Post filename (no ext) → challenges/<slug>.json. Not every review is
 *  named "<firm>-review": two predate the convention. */
const REVIEW_TO_FIRM = {
  'alpha-capital-review': 'alpha-capital',
  'bright-funded-prop-firm': 'bright-funded',
  'city-traders-imperium-review': 'city-traders-imperium',
  'crypto-fund-trader-review': 'crypto-fund-trader',
  'e8-markets-review': 'e8-markets',
  'ftmo-review': 'ftmo',
  'fundednext-review': 'fundednext',
  'funding-pips-review': 'fundingpips',
  'fxify-review': 'fxify',
  'maven-prop-firm-review': 'maven',
  'my-funded-futures': 'my-funded-futures',
  'ofp-funding-review': 'ofp-funding',
  'take-profit-trader-review': 'take-profit-trader',
  'the-funded-trader-review': 'the-funded-trader',
  'topstep-review': 'topstep',
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
const TODAY = new Date('2026-07-27T00:00:00Z')

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
  return null
}

/** "~$189" → 189, "$1,236" → 1236. Leading ~ means "illustrative", which
 *  we still math-check — an illustrative fee must still produce a
 *  consistent illustrative break-even. */
function parseMoney(text) {
  const m = text.match(/\$\s*([\d,]+(?:\.\d+)?)/)
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
 * null has no verified pricing at all, so any dollar fee its review prints
 * was invented downstream of the data layer. Scoped to fully-unpriced firms
 * so composite fee columns (Topstep's "XFA activation", Take Profit
 * Trader's "1 mo + $130") aren't flagged on firms that do have pricing.
 */
function checkUnsourcedPrices(body, challenges, errors, warnings) {
  const tiers = challenges.flatMap(c => c.accountSizes ?? [])
  if (!tiers.length || tiers.some(t => t.priceUsd != null)) return

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
        dailyLossPct: dailyCapPct,
        maxLossPct: ddPct,
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
              `computeTrueCost() gives ${rMultiple.toFixed(2)} ($${expected} / ${ddPct}% of $${size})`
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
    ['eaAllowed', c => c.rules?.ea],
    ['newsTradingAllowed', c => c.rules?.news],
    ['weekendAllowed', c => c.rules?.weekend],
    ['overnightAllowed', c => c.rules?.overnight],
    ['copyTradingAllowed', c => c.rules?.copyTrading],
  ]

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
      // The card states one value for a firm that may sell several
      // products; it only has to match one of them to be defensible.
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

const aggregateErrors = checkFirmAggregates()
totalErrors += aggregateErrors

if (clean.length) {
  console.log(`\n✓ clean: ${clean.length}`)
  for (const c of clean) console.log(`  · ${c}`)
}

console.log(
  `\n${totalErrors} error(s), ${totalWarnings} warning(s)` +
    (showWarnings ? '' : ' — re-run with --warn to list warnings')
)

process.exit(totalErrors > 0 ? 1 : 0)
