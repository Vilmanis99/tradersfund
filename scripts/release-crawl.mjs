/**
 * Crawl the built preview exactly as a search engine would discover it.
 *
 * Usage:
 *   npm run crawl:release
 *   npm run crawl:release:strict
 *   npm run crawl:release -- http://127.0.0.1:3214
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import {
  buildOutboundRelationships,
  outboundSlug,
} from '../lib/outboundDestinations.ts'
import {
  challengeCurrency,
  getChallengesByFirm,
  isChallengeFresh,
  minimumCostToFundedUsd,
} from '../lib/firms.ts'
import { getAllDeals } from '../lib/deals.ts'
import { filterComparisonRows } from '../lib/comparisonDirectory.ts'
import { rankFirmAlternatives } from '../lib/firmAlternatives.ts'
import {
  buildRelatedComparisons,
  comparisonHref,
  getFreshComparisonEvidence,
  getFreshFirmEvidence,
} from '../lib/relatedComparisons.ts'
import {
  getTradingToolReviewLinks,
  TRADING_TOOL_REVIEWS,
} from '../lib/tradingToolReviews.ts'
import {
  INDIA_MATCHUPS,
  indiaMatchupPath,
} from '../lib/indiaMatchups.ts'
import {
  LOCALIZED_ROUTE_PAIRS,
  RUSSIAN_ONLY_ROUTES,
} from '../lib/localizedRoutes.ts'

const args = process.argv.slice(2)
const baseArg = args.find(value => !value.startsWith('--'))
const VERBOSE = args.includes('--verbose')
const STRICT_LENGTHS = args.includes('--strict-lengths')
const BASE = new URL(baseArg || 'http://127.0.0.1:3214')
const PRODUCTION_ORIGIN = 'https://tradersfundhub.com'
const CONCURRENCY = 12
const REQUEST_TIMEOUT_MS = 15_000
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const firmRecords = JSON.parse(
  readFileSync(join(PROJECT_ROOT, 'content/data/firms.json'), 'utf8'),
)
const firmReviewPostRecords = new Map(firmRecords.map(firm => {
  const reviewPath = new URL(firm.reviewUrl, PRODUCTION_ORIGIN).pathname
  const reviewSlug = reviewPath.split('/').filter(Boolean).at(-1)
  const post = matter(readFileSync(
    join(PROJECT_ROOT, 'content/posts', `${reviewSlug}.md`),
    'utf8',
  )).data
  return [reviewPath, post]
}))
const tradingToolPostRecords = TRADING_TOOL_REVIEWS.map(review => ({
  ...matter(readFileSync(
    join(PROJECT_ROOT, 'content/posts', `${review.slug}.md`),
    'utf8',
  )).data,
}))
const wyckoffPostRecord = {
  ...matter(readFileSync(
    join(PROJECT_ROOT, 'content/posts/wyckoff-pattern.md'),
    'utf8',
  )).data,
}
const ukAccessEvidence = JSON.parse(
  readFileSync(join(PROJECT_ROOT, 'content/data/uk-access-evidence.json'), 'utf8'),
)
const usAccessEvidence = JSON.parse(
  readFileSync(join(PROJECT_ROOT, 'content/data/us-access-evidence.json'), 'utf8'),
)
const cryptoMarketEvidence = JSON.parse(
  readFileSync(join(PROJECT_ROOT, 'content/data/crypto-market-evidence.json'), 'utf8'),
)
const outboundRelationships = buildOutboundRelationships(firmRecords)
const firmByReviewPath = new Map(firmRecords.map(firm => [
  new URL(firm.reviewUrl, PRODUCTION_ORIGIN).pathname,
  firm,
]))

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
}

function localUrl(input) {
  const parsed = new URL(input, PRODUCTION_ORIGIN)
  return new URL(`${parsed.pathname}${parsed.search}`, BASE)
}

function canonicalKey(input) {
  const parsed = new URL(input, PRODUCTION_ORIGIN)
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
  return `${parsed.origin}${pathname}${parsed.search}`
}

function textContent(value = '') {
  return decodeHtml(value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
}

function formatCaptureDate(value) {
  if (!value) return 'refresh pending'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatEditorialDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function firstMatch(html, expression) {
  return html.match(expression)?.[1]?.trim() || ''
}

function alternateHref(value, language) {
  for (const match of value.matchAll(/<(?:xhtml:)?link\b[^>]*>/gi)) {
    const tag = match[0]
    if (firstMatch(tag, /\bhreflang=["']([^"']+)["']/i) !== language) continue
    return decodeXml(firstMatch(tag, /\bhref=["']([^"']+)["']/i))
  }
  return ''
}

async function mapConcurrent(values, worker) {
  const results = new Array(values.length)
  let cursor = 0
  async function run() {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await worker(values[index], index)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, values.length) }, () => run()),
  )
  return results
}

async function fetchPage(url, redirect = 'manual') {
  try {
    const response = await fetch(url, {
      redirect,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'user-agent': 'TradersFundHubReleaseAudit/1.0' },
    })
    return {
      url,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      html: await response.text(),
    }
  } catch (error) {
    return {
      url,
      status: 0,
      contentType: '',
      location: '',
      html: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const sitemapResponse = await fetchPage(new URL('/sitemap.xml', BASE))
if (sitemapResponse.status !== 200) {
  console.error(`✗ sitemap.xml returned ${sitemapResponse.status || sitemapResponse.error}`)
  process.exit(1)
}

const sitemapUrls = [
  ...sitemapResponse.html.matchAll(/<loc>(.*?)<\/loc>/g),
].map(match => decodeXml(match[1]))
const uniqueSitemapUrls = [...new Set(sitemapUrls)]

const errors = []
const advisories = []

console.log(`Crawling ${uniqueSitemapUrls.length} sitemap URLs at ${BASE.origin}...`)

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

for (const sourceRoot of ['app', 'components', 'content']) {
  for (const path of sourceFiles(join(PROJECT_ROOT, sourceRoot))) {
    if (!['.ts', '.tsx', '.md'].includes(extname(path))) continue
    const source = readFileSync(path, 'utf8')
    if (/\bhref\s*=\s*["']#["']/i.test(source)) {
      errors.push(`${relative(PROJECT_ROOT, path)}: contains an href="#" placeholder in source`)
    }
  }
}

if (uniqueSitemapUrls.length !== sitemapUrls.length) {
  errors.push(`sitemap contains ${sitemapUrls.length - uniqueSitemapUrls.length} duplicate URL(s)`)
}

const pages = await mapConcurrent(uniqueSitemapUrls, async productionUrl => {
  const page = await fetchPage(localUrl(productionUrl))
  return { ...page, productionUrl }
})

const titles = new Map()
const descriptions = new Map()
const internalTargets = new Set()
const internalInlinks = new Map()
const pageIds = new Map()
const internalFragments = []
let jsonLdCount = 0
let imageCount = 0

for (const page of pages) {
  const path = new URL(page.productionUrl).pathname
  if (page.status !== 200) {
    errors.push(`${path}: HTTP ${page.status || page.error}`)
    continue
  }
  if (!page.contentType.includes('text/html')) continue

  const title = textContent(firstMatch(page.html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const description = decodeHtml(firstMatch(
    page.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    page.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const canonical = firstMatch(
    page.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    page.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  const h1Count = (page.html.match(/<h1\b/gi) || []).length
  const h1 = textContent(firstMatch(page.html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i))

  if (!title) errors.push(`${path}: missing title`)
  if (!description) errors.push(`${path}: missing meta description`)
  if (!canonical) {
    errors.push(`${path}: missing canonical`)
  } else {
    const canonicalUrl = new URL(canonical, PRODUCTION_ORIGIN).href
    if (canonicalKey(canonicalUrl) !== canonicalKey(page.productionUrl)) {
      errors.push(`${path}: canonical points to ${canonicalUrl}`)
    }
  }
  if (h1Count !== 1) errors.push(`${path}: expected 1 h1, found ${h1Count}`)
  if (/\bhref=["']#["']/i.test(page.html)) {
    errors.push(`${path}: contains an href="#" placeholder`)
  }
  const reviewedFirm = firmByReviewPath.get(path)
  if (reviewedFirm) {
    const reviewPost = firmReviewPostRecords.get(path)
    if (!reviewPost) {
      errors.push(`${path}: firm review frontmatter is missing`)
    } else if (
      title !== reviewPost.seoTitle
      || description !== reviewPost.seoDescription
      || h1 !== reviewPost.title
    ) {
      errors.push(`${path}: firm-review title, description or H1 disagrees with frontmatter`)
    }
    const slug = outboundSlug(reviewedFirm.name)
    const reviewCtaTag = [...page.html.matchAll(/<a\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => tag.includes(`/go/${slug}?from=review-cta`)) || ''
    if (!reviewCtaTag) {
      errors.push(`${path}: review CTA does not open the configured firm destination`)
    }
    const expectedRel = reviewedFirm.affiliateUrl
      ? 'sponsored nofollow noopener'
      : 'nofollow noopener'
    if (!reviewCtaTag.includes(`rel="${expectedRel}"`)) {
      errors.push(`${path}: review CTA relationship does not match firm configuration`)
    }
    const expectedRelationship = reviewedFirm.affiliateUrl ? 'affiliate' : 'official'
    const disclosureHtml = firstMatch(
      page.html,
      new RegExp(
        `<p[^>]*data-affiliate-disclosure=["']${expectedRelationship}["'][^>]*>`
        + `([\\s\\S]*?)<\\/p>`,
        'i',
      ),
    )
    const disclosureText = textContent(disclosureHtml)
    if (!disclosureHtml) {
      errors.push(`${path}: missing ${expectedRelationship} relationship disclosure`)
    } else if (reviewedFirm.affiliateUrl) {
      if (!disclosureText.includes(
        'We may earn a commission if you sign up via eligible links on this page',
      )) {
        errors.push(`${path}: affiliate review disclosure is inaccurate`)
      }
    } else if (
      !disclosureText.includes(
        `does not currently record an affiliate relationship with ${reviewedFirm.name}`,
      )
      || !disclosureText.includes('official website without affiliate tracking')
    ) {
      errors.push(`${path}: official review disclosure is inaccurate`)
    }
    if (page.html.includes('Read full review')) {
      errors.push(`${path}: review CTA links back to the current review`)
    }
  }
  pageIds.set(path, new Set(
    [...page.html.matchAll(/\bid=(?:"([^"]+)"|'([^']+)')/gi)]
      .map(match => decodeHtml(match[1] || match[2])),
  ))

  if (title) {
    const paths = titles.get(title) || []
    paths.push(path)
    titles.set(title, paths)
    if (title.length > 60) {
      const finding = `${path}: title is ${title.length} characters`
      ;(STRICT_LENGTHS ? errors : advisories).push(finding)
    }
  }
  if (description) {
    const paths = descriptions.get(description) || []
    paths.push(path)
    descriptions.set(description, paths)
    if (description.length > 160 || description.length < 70) {
      const finding = `${path}: description is ${description.length} characters`
      ;(STRICT_LENGTHS ? errors : advisories).push(finding)
    }
  }

  for (const match of page.html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    jsonLdCount += 1
    try {
      JSON.parse(match[1])
    } catch {
      errors.push(`${path}: invalid JSON-LD block`)
    }
  }

  for (const match of page.html.matchAll(/<img\b[^>]*>/gi)) {
    imageCount += 1
    if (!/\balt=(?:"[^"]*"|'[^']*')/i.test(match[0])) {
      errors.push(`${path}: image without alt attribute`)
    }
  }

  for (const match of page.html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0]
    const href = decodeXml(firstMatch(tag, /\bhref=["']([^"']+)["']/i))
    if (!href) continue
    const destination = new URL(href, page.productionUrl)
    if (
      destination.origin !== PRODUCTION_ORIGIN
      || !destination.pathname.startsWith('/go/')
    ) continue

    const firmSlug = destination.pathname.split('/')[2]
    const relationship = outboundRelationships[firmSlug]
    if (!relationship) {
      errors.push(`${path}: /go link points at unknown destination ${firmSlug}`)
      continue
    }
    if (!destination.searchParams.get('from')) {
      errors.push(`${path}: /go/${firmSlug} link has no controlled from placement`)
    }
    const rel = firstMatch(tag, /\brel=["']([^"']*)["']/i).toLowerCase()
    const sponsored = rel.split(/\s+/).includes('sponsored')
    if (sponsored !== (relationship === 'affiliate')) {
      errors.push(`${path}: /go/${firmSlug} sponsored rel disagrees with outbound configuration`)
    }
  }

  for (const match of page.html.matchAll(/\bhref=(?:"([^"]+)"|'([^']+)')/gi)) {
    const href = decodeXml(match[1] || match[2])
    if (
      !href ||
      /^(?:mailto|tel|javascript):/i.test(href)
    ) {
      continue
    }
    const target = new URL(href, page.productionUrl)
    if (target.origin === PRODUCTION_ORIGIN) {
      internalTargets.add(`${target.pathname}${target.search}`)
      if (target.hash) {
        internalFragments.push({
          source: path,
          target: target.pathname,
          fragment: decodeURIComponent(target.hash.slice(1)),
        })
      }
      if (target.pathname !== path) {
        const sources = internalInlinks.get(target.pathname) || new Set()
        sources.add(path)
        internalInlinks.set(target.pathname, sources)
      }
    }
  }
}

for (const link of internalFragments) {
  if (!pageIds.get(link.target)?.has(link.fragment)) {
    errors.push(
      `${link.source}: fragment #${link.fragment} is missing on ${link.target}`,
    )
  }
}

for (const productionUrl of uniqueSitemapUrls) {
  const path = new URL(productionUrl).pathname
  if (path !== '/' && !internalInlinks.has(path)) {
    errors.push(`${path}: sitemap URL has no internal inlink`)
  }
}

// Focused rule pages form one semantic cluster. A page linked only from the
// hub is technically discoverable but weakly supported; require several
// unique contextual/sibling sources so later config order cannot orphan it.
for (const productionUrl of uniqueSitemapUrls) {
  const path = new URL(productionUrl).pathname
  if (!path.startsWith('/prop-firms/')) continue
  const inlinkCount = internalInlinks.get(path)?.size ?? 0
  if (inlinkCount < 5) {
    errors.push(`${path}: focused rule page has only ${inlinkCount} unique internal inlinks`)
  }
}

// Every exact matchup must be reachable from the comparison hub and from the
// review page for each participating firm. This distributes discovery across
// the complete 171-page library instead of concentrating links on a few firms.
for (const productionUrl of uniqueSitemapUrls) {
  const path = new URL(productionUrl).pathname
  if (!path.startsWith('/compare/')) continue
  const inlinkCount = internalInlinks.get(path)?.size ?? 0
  if (inlinkCount < 3) {
    errors.push(`${path}: comparison page has only ${inlinkCount} unique internal inlinks`)
  }
}

// Curated India matchups must be supported by the India landing, the product
// comparison, the matchup hub, sibling matchups and both participating firm
// reviews. This keeps pair-specific intent connected to both discovery paths.
for (const matchup of Object.values(INDIA_MATCHUPS)) {
  const path = indiaMatchupPath(matchup)
  const inlinks = internalInlinks.get(path) ?? new Set()
  const inlinkCount = inlinks.size
  if (inlinkCount < 7) {
    errors.push(`${path}: India matchup has only ${inlinkCount} unique internal inlinks`)
  }
  const participantReviewPaths = matchup.firmSlugs.map(slug =>
    firmRecords.find(firm => outboundSlug(firm.name) === slug)?.reviewUrl,
  )
  for (const source of [
    '/best-prop-firms-in-india',
    '/best-prop-firms-in-india/challenge-comparison',
    '/best-prop-firms-in-india/compare',
    ...participantReviewPaths,
  ]) {
    if (!source || !inlinks.has(source)) {
      errors.push(`${path}: missing required contextual inlink from ${source || 'participant review'}`)
    }
  }
}

const tradingToolReviewPaths = new Set(
  TRADING_TOOL_REVIEWS.map(review => `/blog/${review.slug}`),
)
for (const path of tradingToolReviewPaths) {
  const inlinkCount = internalInlinks.get(path)?.size ?? 0
  if (inlinkCount < 6) {
    errors.push(`${path}: trading-tool review has only ${inlinkCount} unique internal inlinks`)
  }
}

const tradersConnectPath = '/blog/traders-connect-trade-copier'
const tradersConnectInlinks = internalInlinks.get(tradersConnectPath) ?? new Set()
if (tradersConnectInlinks.size < 9) {
  errors.push(
    `${tradersConnectPath}: source-checked review has only `
    + `${tradersConnectInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/blog/what-is-copy-trading',
  '/blog/are-prop-firm-passing-services-worth-it',
]) {
  if (!tradersConnectInlinks.has(source)) {
    errors.push(`${tradersConnectPath}: missing compliance-context inlink from ${source}`)
  }
}

const fxReplayPath = '/blog/fx-replay-review'
const fxReplayInlinks = internalInlinks.get(fxReplayPath) ?? new Set()
if (fxReplayInlinks.size < 10) {
  errors.push(
    `${fxReplayPath}: source-checked review has only `
    + `${fxReplayInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/blog/wyckoff-pattern',
  '/blog/what-is-overtrading',
  '/blog/is-prop-firm-trading-profitable',
  '/how-to-pass-a-prop-firm-challenge',
]) {
  if (!fxReplayInlinks.has(source)) {
    errors.push(`${fxReplayPath}: missing research-context inlink from ${source}`)
  }
}

const threeCommasPath = '/blog/3commas-review'
const threeCommasInlinks = internalInlinks.get(threeCommasPath) ?? new Set()
if (threeCommasInlinks.size < 9) {
  errors.push(
    `${threeCommasPath}: source-checked review has only `
    + `${threeCommasInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/blog/what-is-copy-trading',
  '/blog/what-is-overtrading',
  '/blog/fx-replay-review',
]) {
  if (!threeCommasInlinks.has(source)) {
    errors.push(`${threeCommasPath}: missing automation-context inlink from ${source}`)
  }
}

const zuluTradePath = '/blog/zulutrade-review'
const zuluTradeInlinks = internalInlinks.get(zuluTradePath) ?? new Set()
if (zuluTradeInlinks.size < 9) {
  errors.push(
    `${zuluTradePath}: source-checked review has only `
    + `${zuluTradeInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/blog/what-is-copy-trading',
  '/blog/traders-connect-trade-copier',
  '/blog/copyfx-review',
]) {
  if (!zuluTradeInlinks.has(source)) {
    errors.push(`${zuluTradePath}: missing social-copying inlink from ${source}`)
  }
}

const copyFxPath = '/blog/copyfx-review'
const copyFxInlinks = internalInlinks.get(copyFxPath) ?? new Set()
if (copyFxInlinks.size < 9) {
  errors.push(
    `${copyFxPath}: source-checked review has only `
    + `${copyFxInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/blog/what-is-copy-trading',
  '/blog/zulutrade-review',
  '/blog/traders-connect-trade-copier',
]) {
  if (!copyFxInlinks.has(source)) {
    errors.push(`${copyFxPath}: missing broker-native copying inlink from ${source}`)
  }
}

const mffReviewPath = '/blog/my-funded-futures'
const mffReviewInlinks = internalInlinks.get(mffReviewPath) ?? new Set()
if (mffReviewInlinks.size < 9) {
  errors.push(
    `${mffReviewPath}: decision-ready review has only `
    + `${mffReviewInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/blog/apex-trader-funding-review',
  '/blog/balance-based-drawdown-vs-equity-based-drawdown',
  '/blog/what-is-prop-firm-consistency-rule',
]) {
  if (!mffReviewInlinks.has(source)) {
    errors.push(`${mffReviewPath}: missing futures decision inlink from ${source}`)
  }
}

const wyckoffGuidePath = '/blog/wyckoff-pattern'
const wyckoffInlinks = internalInlinks.get(wyckoffGuidePath) ?? new Set()
if (wyckoffInlinks.size < 8) {
  errors.push(
    `${wyckoffGuidePath}: educational guide has only ${wyckoffInlinks.size} unique internal inlinks`,
  )
}
for (const source of [
  '/how-to-pass-a-prop-firm-challenge',
  '/blog/fx-replay-review',
  '/blog/is-prop-firm-trading-profitable',
  '/blog/what-is-a-prop-firm',
  '/blog/what-is-overtrading',
]) {
  if (!wyckoffInlinks.has(source)) {
    errors.push(`${wyckoffGuidePath}: missing contextual inlink from ${source}`)
  }
}

const russianRoutePairs = [...LOCALIZED_ROUTE_PAIRS]
const russianOnlyPaths = [...RUSSIAN_ONLY_ROUTES]
const russianPaths = [
  ...russianRoutePairs.map(pair => pair.ru),
  ...russianOnlyPaths,
]
const russianSitemapPaths = uniqueSitemapUrls
  .map(url => new URL(url).pathname)
  .filter(path => path === '/ru' || path.startsWith('/ru/'))
if (JSON.stringify(russianSitemapPaths.sort()) !== JSON.stringify([...russianPaths].sort())) {
  errors.push(`Russian sitemap routes disagree with the ${russianPaths.length}-page acquisition pilot`)
}

const sitemapEntries = [...sitemapResponse.html.matchAll(/<url>([\s\S]*?)<\/url>/gi)]
  .map(match => match[1])
for (const pair of russianRoutePairs) {
  for (const path of [pair.en, pair.ru]) {
    const entry = sitemapEntries.find(block => {
      const location = decodeXml(firstMatch(block, /<loc>([\s\S]*?)<\/loc>/i))
      return location && new URL(location).pathname === path
    })
    if (!entry) {
      errors.push(`${path}: localized sitemap entry is missing`)
      continue
    }
    for (const [language, expectedPath] of [
      ['en', pair.en],
      ['ru', pair.ru],
      ['x-default', pair.en],
    ]) {
      const href = alternateHref(entry, language)
      if (canonicalKey(href) !== canonicalKey(`${PRODUCTION_ORIGIN}${expectedPath}`)) {
        errors.push(`${path}: sitemap hreflang ${language} does not point to ${expectedPath}`)
      }
    }
  }
}

const russianExpectations = new Map([
  ['/ru', {
    title: 'Проп-фирмы: обзоры, цены и правила на русском',
    h1: 'Проп-фирмы: цены, правила и выплаты без рекламного тумана',
    markers: [
      'data-russian-country-boundary="language-not-access"',
      '255',
      '162',
      '180',
      '41',
    ],
  }],
  ['/ru/luchshie-prop-firmy', {
    title: 'Лучшие проп-фирмы 2026: рейтинг и сравнение',
    h1: 'Лучшие проп-фирмы 2026: рейтинг для русскоязычных трейдеров',
    markers: [
      'data-russian-country-boundary="ranking-not-access"',
      'data-russian-ranking="top-five"',
      'data-russian-affiliate-disclosure="ranking"',
      'data-russian-partner-shortlist="global"',
      'data-russian-affiliate-disclosure="partner-shortlist"',
      '/go/fundednext?from=ru-ranking-partner-shortlist',
      '/go/fundingpips?from=ru-ranking-partner-shortlist',
      '/go/bright-funded?from=ru-ranking-partner-shortlist',
    ],
  }],
  ['/ru/luchshie-kripto-prop-firmy', {
    title: 'Крипто-проп-фирмы 2026: проверенные варианты',
    h1: 'Крипто-проп-фирмы 2026: проверенные варианты',
    markers: [
      'data-russian-country-boundary="crypto-not-access"',
      'data-russian-crypto-ranking="source-gated"',
      'data-russian-affiliate-disclosure="crypto-ranking"',
      'data-russian-crypto-product-count="32"',
    ],
  }],
  ['/ru/obzor-fundednext', {
    title: 'FundedNext: обзор 2026, цены, правила и выплаты',
    h1: 'FundedNext: обзор 2026 — 22 цены и 4 разных набора правил',
    markers: [
      'data-fundednext-russia-access="conflicting"',
      'data-fundednext-russian-products="4"',
      'data-russian-affiliate-disclosure="fundednext"',
    ],
  }],
  ['/ru/obzor-fundingpips', {
    title: 'FundingPips: обзор 2026, цены, правила и выплаты',
    h1: 'FundingPips: обзор 2026, цены, правила и выплаты',
    markers: [
      'data-russian-partner-review="fundingpips"',
      'data-russian-partner-country-access="unconfirmed"',
      'data-russian-product-count="5"',
      'data-russian-affiliate-disclosure="fundingpips"',
    ],
  }],
  ['/ru/obzor-bright-funded', {
    title: 'Bright Funded: обзор 2026, цены, правила и выплаты',
    h1: 'Bright Funded: обзор 2026, цены, правила и выплаты',
    markers: [
      'data-russian-partner-review="bright-funded"',
      'data-russian-partner-country-access="unconfirmed"',
      'data-russian-product-count="3"',
      'data-russian-affiliate-disclosure="bright-funded"',
    ],
  }],
  ['/ru/kak-rabotayut-chellendzhi-prop-firm', {
    title: 'Челлендж проп-фирмы: 5 этапов и правила (2026)',
    h1: 'Как работает челлендж проп-фирмы: от оплаты до выплаты',
    markers: [
      'data-russian-country-boundary="challenge-checkout"',
      'data-russian-affiliate-disclosure="challenge-guide"',
    ],
  }],
  ['/ru/rossiyskie-prop-kompanii', {
    title: 'Российские проп-компании: 3 реальных примера (2026)',
    h1: 'Российские проп-компании в 2026 году: 3 проверяемых примера',
    markers: [
      'data-russian-local-firms="verification-only"',
      'data-russian-affiliate-opportunity="unactivated"',
      'data-russian-country-boundary="local-to-global"',
    ],
  }],
])

for (const [path, expectation] of russianExpectations) {
  const probe = pages.find(page => new URL(page.productionUrl).pathname === path)
  if (!probe || probe.status !== 200) {
    errors.push(`${path}: Russian acquisition page is unavailable`)
    continue
  }
  const title = textContent(firstMatch(probe.html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const h1 = textContent(firstMatch(probe.html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i))
  const pageText = textContent(probe.html)
  if (title !== expectation.title || h1 !== expectation.h1) {
    errors.push(`${path}: Russian title or H1 disagrees with the acquisition brief`)
  }
  if (
    !probe.html.includes('lang="ru"')
    || !probe.html.includes('data-russian-locale="pilot"')
    || !probe.html.includes('"inLanguage":"ru"')
  ) {
    errors.push(`${path}: rendered Russian language boundary or schema is missing`)
  }
  for (const marker of expectation.markers) {
    if (!probe.html.includes(marker) && !pageText.includes(marker)) {
      errors.push(`${path}: missing Russian acquisition safeguard ${marker}`)
    }
  }
  if (
    pageText.includes('FundedNext доступен в России')
    || pageText.includes('FTMO доступен в России')
  ) {
    errors.push(`${path}: makes an unsupported Russia-access claim`)
  }
  const pair = russianRoutePairs.find(candidate => candidate.ru === path)
  const inlinkCount = internalInlinks.get(path)?.size ?? 0
  const minimumInlinks = pair ? 3 : 4
  if (inlinkCount < minimumInlinks) {
    errors.push(`${path}: Russian acquisition page has only ${inlinkCount} unique internal inlinks`)
  }

  if (pair) {
    for (const [language, expectedPath] of [
      ['en', pair.en],
      ['ru', pair.ru],
      ['x-default', pair.en],
    ]) {
      const href = alternateHref(probe.html, language)
      if (canonicalKey(href) !== canonicalKey(`${PRODUCTION_ORIGIN}${expectedPath}`)) {
        errors.push(`${path}: page hreflang ${language} does not point to ${expectedPath}`)
      }
    }
    const englishProbe = pages.find(page => new URL(page.productionUrl).pathname === pair.en)
    if (!englishProbe || canonicalKey(alternateHref(englishProbe.html, 'ru'))
      !== canonicalKey(`${PRODUCTION_ORIGIN}${pair.ru}`)) {
      errors.push(`${pair.en}: missing reciprocal Russian hreflang for ${pair.ru}`)
    }
  }
}

const russianFundedNextPage = pages.find(page =>
  new URL(page.productionUrl).pathname === '/ru/obzor-fundednext')
const russianFundedNextCta = [...(russianFundedNextPage?.html ?? '').matchAll(/<a\b[^>]*>/gi)]
  .map(match => match[0])
  .find(tag => tag.includes('/go/fundednext?from=ru-fundednext-review-verdict')) || ''
if (
  !russianFundedNextCta
  || !russianFundedNextCta.includes('rel="sponsored nofollow noopener"')
) {
  errors.push('/ru/obzor-fundednext: controlled affiliate CTA is missing or mislabelled')
}
for (const [path, href] of [
  ['/ru/obzor-fundingpips', '/go/fundingpips?from=ru-fundingpips-review-verdict'],
  ['/ru/obzor-bright-funded', '/go/bright-funded?from=ru-bright-funded-review-verdict'],
  ['/ru/luchshie-kripto-prop-firmy', '/go/fundednext?from=ru-crypto-ranking'],
]) {
  const page = pages.find(probe => new URL(probe.productionUrl).pathname === path)
  const cta = [...(page?.html ?? '').matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes(href)) || ''
  if (!cta || !cta.includes('rel="sponsored nofollow noopener"')) {
    errors.push(`${path}: controlled affiliate CTA is missing or mislabelled`)
  }
}
const russianLocalFirmPage = pages.find(page =>
  new URL(page.productionUrl).pathname === '/ru/rossiyskie-prop-kompanii')
if (russianLocalFirmPage?.html.includes('/go/')) {
  errors.push('/ru/rossiyskie-prop-kompanii: unapproved local-firm affiliate action rendered')
}

for (const [title, paths] of titles) {
  if (paths.length > 1) errors.push(`duplicate title on ${paths.join(', ')}: ${title}`)
}
for (const paths of descriptions.values()) {
  if (paths.length > 1) {
    errors.push(`duplicate description on ${paths.join(', ')}`)
  }
}

const internalResults = await mapConcurrent(
  [...internalTargets],
  async target => fetchPage(new URL(target, BASE), 'manual'),
)
for (const result of internalResults) {
  if (result.status < 200 || result.status >= 400) {
    errors.push(`${new URL(result.url).pathname}: internal link returned ${result.status || result.error}`)
  }
}

for (const review of TRADING_TOOL_REVIEWS) {
  const path = `/blog/${review.slug}`
  const post = tradingToolPostRecords.find(candidate => candidate.slug === review.slug)
  const probe = await fetchPage(new URL(path, BASE))
  if (probe.status !== 200 || !post) {
    errors.push(`${path}: trading-tool review or metadata is missing`)
    continue
  }

  const pageText = textContent(probe.html)
  const title = textContent(firstMatch(probe.html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const description = decodeHtml(firstMatch(
    probe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    probe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const h1 = textContent(firstMatch(probe.html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i))
  if (title !== post.seoTitle || description !== post.seoDescription || h1 !== post.title) {
    errors.push(`${path}: trading-tool title, description or H1 disagrees with frontmatter`)
  }

  const editorialDate = formatEditorialDate(post.modified || post.date)
  for (const required of [
    `data-tool-review-status="${review.slug}"`,
    'Editorial snapshot',
    editorialDate,
    'Pricing, integrations and feature availability may have changed since this review date.',
    'verify the official service before paying or connecting a trading account.',
    `data-tool-review-cluster="${review.slug}"`,
    'Compare tools by the job they perform',
    post.excerpt,
  ]) {
    if (!probe.html.includes(required) && !pageText.includes(required)) {
      errors.push(`${path}: trading-tool review is missing ${required}`)
    }
  }

  if (review.slug === 'traders-connect-trade-copier') {
    for (const required of [
      'data-tool-evidence-captured="2026-08-18"',
      'data-traders-connect-evidence="2026-08-18"',
      'Traders Fund Hub does not currently record an affiliate relationship with Traders Connect.',
      '10 listed: MT4, MT5, cTrader, MatchTrader, TradeLocker, DXtrade, NinjaTrader, Tradovate, ProjectX, Rithmic',
      '$10 per account monthly or $100 per account annually',
      'data-tool-pricing="futures"',
      'data-tool-pricing="analyzer"',
      'data-tool-pricing="dedicated-environment"',
      'Equity Protection is a beta control, not the firm\'s loss engine',
      'No vendor can grant that permission.',
      'data-tool-compliance-warning="trade-identity"',
      'Do not use settings to disguise the origin of a trade.',
      'data-traders-connect-test-plan="demo-first"',
      '/blog/what-is-copy-trading',
      '/blog/are-prop-firm-passing-services-worth-it',
      '/blog/balance-based-drawdown-vs-equity-based-drawdown',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!probe.html.includes(required) && !pageText.includes(required)) {
        errors.push(`${path}: missing current evidence or decision boundary ${required}`)
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
      if (pageText.includes(stale)) {
        errors.push(`${path}: rendered unsafe or stale claim ${stale}`)
      }
    }
    const ctaTag = [...probe.html.matchAll(/<a\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => tag.includes(
        'href="/go/traders-connect?from=post-body-traders-connect-trade-copier-verdict"',
      )) || ''
    if (
      !ctaTag
      || !ctaTag.includes('rel="nofollow noopener"')
      || ctaTag.includes('sponsored')
    ) {
      errors.push(`${path}: Traders Connect official CTA relationship is incorrect`)
    }
  }

  if (review.slug === 'fx-replay-review') {
    for (const required of [
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
      '/how-to-pass-a-prop-firm-challenge',
      '/blog/balance-based-drawdown-vs-equity-based-drawdown',
      '/blog/what-is-prop-firm-consistency-rule',
      '/blog/wyckoff-pattern',
      '/blog/what-is-overtrading',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!probe.html.includes(required) && !pageText.includes(required)) {
        errors.push(`${path}: missing current evidence or research boundary ${required}`)
      }
    }
    const lowerPageText = pageText.toLowerCase()
    for (const stale of [
      'one of the best forex backtesting software tools',
      'one of the most popular forex backtesting software tools',
      '4.6 out of 5 stars',
      'over 200 reviews',
      '5-day fx replay free trial',
      'search for fx replay discount code',
      'risk-free way to explore',
      'up to 20 backtesting sessions',
      'up to five indicators',
      'accurately replicates market conditions',
      'the best backtesting software',
    ]) {
      if (lowerPageText.includes(stale)) {
        errors.push(`${path}: rendered promotional, unsafe or stale claim ${stale}`)
      }
    }
    const ctaTag = [...probe.html.matchAll(/<a\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => tag.includes(
        'href="/go/fx-replay?from=post-body-fx-replay-review-verdict"',
      )) || ''
    if (
      !ctaTag
      || !ctaTag.includes('rel="nofollow noopener"')
      || ctaTag.includes('sponsored')
    ) {
      errors.push(`${path}: FX Replay official CTA relationship is incorrect`)
    }
  }

  if (review.slug === '3commas-review') {
    for (const required of [
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
      '/blog/what-is-copy-trading',
      '/blog/fx-replay-review',
      '/blog/what-is-overtrading',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!probe.html.includes(required) && !pageText.includes(required)) {
        errors.push(`${path}: missing current evidence or automation boundary ${required}`)
      }
    }
    const lowerPageText = pageText.toLowerCase()
    for (const stale of [
      '$37 monthly',
      '$59 monthly',
      'protime50',
      'zrb2auph4n0',
      'lvep2glm',
      'earn money when others copy',
      'consistent profits',
      'emotion-free trading',
      '4.4 out of 5',
      'nearly 2,000',
      'over 2 million traders have signed up',
    ]) {
      if (lowerPageText.includes(stale)) {
        errors.push(`${path}: rendered promotional, unsafe or stale claim ${stale}`)
      }
    }
    const ctaTag = [...probe.html.matchAll(/<a\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => tag.includes(
        'href="/go/3commas?from=post-body-3commas-review-verdict"',
      )) || ''
    if (
      !ctaTag
      || !ctaTag.includes('rel="nofollow noopener"')
      || ctaTag.includes('sponsored')
    ) {
      errors.push(`${path}: 3Commas official CTA relationship is incorrect`)
    }
  }

  if (review.slug === 'zulutrade-review') {
    for (const required of [
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
      '/blog/what-is-copy-trading',
      '/blog/traders-connect-trade-copier',
      '/blog/what-is-overtrading',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!probe.html.includes(required) && !pageText.includes(required)) {
        errors.push(`${path}: missing current evidence or copying boundary ${required}`)
      }
    }
    const lowerPageText = pageText.toLowerCase()
    for (const stale of [
      '3.3 on trustpilot',
      'used in 150+ countries',
      '30 million accounts',
      '2 million active traders',
      'one of the oldest and most well-known',
      'one of the top platforms',
      'uf awards 2024',
      'is zulutrade profitable?',
      'it can be profitable for those',
      'completely legitimate copy trading platform',
      'classic & profit sharing accounts',
      'minimum deposit requirements',
      'trustpilot reviews',
      '$30 subscription',
      '20% performance',
      '25% performance',
    ]) {
      if (lowerPageText.includes(stale)) {
        errors.push(`${path}: rendered promotional, unsafe or stale claim ${stale}`)
      }
    }
    const ctaTag = [...probe.html.matchAll(/<a\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => tag.includes(
        'href="/go/zulutrade?from=post-body-zulutrade-review-verdict"',
      )) || ''
    if (
      !ctaTag
      || !ctaTag.includes('rel="nofollow noopener"')
      || ctaTag.includes('sponsored')
    ) {
      errors.push(`${path}: ZuluTrade official CTA relationship is incorrect`)
    }
  }

  if (review.slug === 'copyfx-review') {
    for (const required of [
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
      'registration/licence number 9759600',
      '/blog/what-is-copy-trading',
      '/blog/zulutrade-review',
      '/blog/traders-connect-trade-copier',
      '/blog/balance-based-drawdown-vs-equity-based-drawdown',
      '/blog/what-is-overtrading',
      'data-affiliate-placement="verdict"',
    ]) {
      if (!probe.html.includes(required) && !pageText.includes(required)) {
        errors.push(`${path}: missing current evidence or broker-native boundary ${required}`)
      }
    }
    const lowerPageText = pageText.toLowerCase()
    for (const stale of [
      'eureka!',
      'best copy trading platform 2025',
      'trustfinance business bangkok 2025',
      'copy trades with just $10',
      'cross copying',
      'between 1 and 10 usd per lot',
      'up to 100 times',
      'trustpilot',
      'one of the best copy trading platforms',
      'reliable copy trading platform',
      'more than 12,000',
    ]) {
      if (lowerPageText.includes(stale)) {
        errors.push(`${path}: rendered promotional, unsafe or stale claim ${stale}`)
      }
    }
    const ctaTag = [...probe.html.matchAll(/<a\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => tag.includes(
        'href="/go/copyfx?from=post-body-copyfx-review-verdict"',
      )) || ''
    if (
      !ctaTag
      || !ctaTag.includes('rel="nofollow noopener"')
      || ctaTag.includes('sponsored')
    ) {
      errors.push(`${path}: CopyFX official CTA relationship is incorrect`)
    }
  }

  const expectedLinks = getTradingToolReviewLinks(review.slug, tradingToolPostRecords)
  const toolLinkTags = [...probe.html.matchAll(
    /<a\b[^>]*\bdata-tool-review-link=["'][^"']+["'][^>]*>/gi,
  )].map(match => match[0])
  const renderedLinks = toolLinkTags.map(tag =>
    firstMatch(tag, /\bdata-tool-review-link=["']([^"']+)["']/i),
  )
  if (
    expectedLinks.length !== 4
    || renderedLinks.includes(review.slug)
    || JSON.stringify(renderedLinks) !== JSON.stringify(expectedLinks.map(item => item.slug))
  ) {
    errors.push(`${path}: trading-tool cluster is incomplete or out of order`)
  }
  for (const linked of expectedLinks) {
    const tag = toolLinkTags.find(candidate =>
      candidate.includes(`data-tool-review-link="${linked.slug}"`),
    ) || ''
    const card = firstMatch(
      probe.html,
      new RegExp(
        `<a[^>]*data-tool-review-link=["']${linked.slug}["'][^>]*>([\\s\\S]*?)<\\/a>`,
        'i',
      ),
    )
    const cardText = textContent(card)
    for (const required of [
      linked.useCase,
      `${linked.name} review`,
      `Editorial update: ${formatEditorialDate(linked.post.modified || linked.post.date)}`,
    ]) {
      if (!cardText.includes(required)) {
        errors.push(`${path}: ${linked.slug} workflow card is missing ${required}`)
      }
    }
    if (!tag.includes(`href="/blog/${linked.slug}"`)) {
      errors.push(`${path}: ${linked.slug} workflow card is missing its internal link`)
    }
  }

  const jsonLdObjects = [...probe.html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].flatMap(match => {
    try {
      return [JSON.parse(match[1])]
    } catch {
      return []
    }
  })
  const article = jsonLdObjects.find(value => value['@type'] === 'Article')
  if (article?.description !== post.seoDescription) {
    errors.push(`${path}: trading-tool Article schema description disagrees with metadata`)
  }
  if (
    review.slug === 'traders-connect-trade-copier'
    && article?.dateModified !== post.modified
  ) {
    errors.push(`${path}: Traders Connect Article schema date disagrees with evidence date`)
  }
  if (
    review.slug === 'fx-replay-review'
    && article?.dateModified !== post.modified
  ) {
    errors.push(`${path}: FX Replay Article schema date disagrees with evidence date`)
  }
  if (
    review.slug === '3commas-review'
    && article?.dateModified !== post.modified
  ) {
    errors.push(`${path}: 3Commas Article schema date disagrees with evidence date`)
  }
  if (
    review.slug === 'zulutrade-review'
    && article?.dateModified !== post.modified
  ) {
    errors.push(`${path}: ZuluTrade Article schema date disagrees with evidence date`)
  }
  if (
    review.slug === 'copyfx-review'
    && article?.dateModified !== post.modified
  ) {
    errors.push(`${path}: CopyFX Article schema date disagrees with evidence date`)
  }
}

const wyckoffProbe = await fetchPage(new URL(wyckoffGuidePath, BASE))
if (wyckoffProbe.status !== 200) {
  errors.push(`${wyckoffGuidePath}: HTTP ${wyckoffProbe.status || wyckoffProbe.error}`)
} else {
  const pageText = textContent(wyckoffProbe.html)
  const title = textContent(firstMatch(
    wyckoffProbe.html,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ))
  const description = decodeHtml(firstMatch(
    wyckoffProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    wyckoffProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const h1 = textContent(firstMatch(
    wyckoffProbe.html,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
  ))
  const canonical = firstMatch(
    wyckoffProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    wyckoffProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (
    title !== wyckoffPostRecord.seoTitle
    || description !== wyckoffPostRecord.seoDescription
    || h1 !== wyckoffPostRecord.title
  ) {
    errors.push(`${wyckoffGuidePath}: title, description or H1 disagrees with frontmatter`)
  }
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${wyckoffGuidePath}`)) {
    errors.push(`${wyckoffGuidePath}: incorrect canonical`)
  }
  for (const required of [
    'Updated Aug 18, 2026',
    'The Wyckoff pattern is an interpretive framework',
    'How to make a Wyckoff pattern testable',
    'What the Wyckoff pattern can and cannot tell you',
    'Does a Wyckoff spring guarantee a rally?',
    '/blog/fx-replay-review',
    '/how-to-pass-a-prop-firm-challenge',
    '/blog/what-is-overtrading',
    '/blog/is-prop-firm-trading-profitable',
    '/prop-firm-challenges',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
  ]) {
    if (!wyckoffProbe.html.includes(required) && !pageText.includes(required)) {
      errors.push(`${wyckoffGuidePath}: missing evidence or workflow link ${required}`)
    }
  }
  const jsonLdObjects = [...wyckoffProbe.html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].flatMap(match => {
    try {
      return [JSON.parse(match[1])]
    } catch {
      return []
    }
  })
  const article = jsonLdObjects.find(value => value['@type'] === 'Article')
  if (
    article?.headline !== wyckoffPostRecord.title
    || article?.description !== wyckoffPostRecord.seoDescription
    || article?.dateModified !== wyckoffPostRecord.modified
  ) {
    errors.push(`${wyckoffGuidePath}: Article schema disagrees with revised frontmatter`)
  }
}

const comparisonHubPath = '/compare'
const comparisonHubProbe = await fetchPage(new URL(comparisonHubPath, BASE))
if (comparisonHubProbe.status !== 200) {
  errors.push(
    `${comparisonHubPath}: HTTP ${comparisonHubProbe.status || comparisonHubProbe.error}`,
  )
} else {
  const comparisonHubText = textContent(comparisonHubProbe.html)
  const eligibleFirms = firmRecords.map(firm => {
    const slug = outboundSlug(firm.name)
    return {
      firm,
      slug,
      products: getChallengesByFirm(slug).filter(challenge => isChallengeFresh(challenge)),
    }
  }).filter(entry => entry.products.length)
  const expectedPairCount = eligibleFirms.length * (eligibleFirms.length - 1) / 2
  const expectedProductCount = eligibleFirms.reduce(
    (total, entry) => total + entry.products.length,
    0,
  )
  const expectedTitle = `Prop Firm Comparisons (2026): ${expectedPairCount} Matchups`
  const expectedDescription =
    `Compare ${eligibleFirms.length} prop firms across ${expectedPairCount} head-to-head matchups and `
    + `${expectedProductCount} fresh products, with source-dated fees, rules, drawdowns and payouts.`
  const title = textContent(firstMatch(
    comparisonHubProbe.html,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ))
  const description = decodeHtml(firstMatch(
    comparisonHubProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    comparisonHubProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const canonical = firstMatch(
    comparisonHubProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    comparisonHubProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  const h1 = textContent(firstMatch(
    comparisonHubProbe.html,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
  ))

  if (title !== expectedTitle) {
    errors.push(`${comparisonHubPath}: incorrect title ${title}`)
  }
  if (description !== expectedDescription) {
    errors.push(`${comparisonHubPath}: current evidence meta description is missing`)
  }
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${comparisonHubPath}`)) {
    errors.push(`${comparisonHubPath}: incorrect canonical`)
  }
  if (h1 !== 'Prop firm comparisons, product by product.') {
    errors.push(`${comparisonHubPath}: incorrect search-intent H1 ${h1}`)
  }
  for (const required of [
    `${expectedPairCount} matchups`,
    `${eligibleFirms.length} firms`,
    `${expectedProductCount} current products`,
    `Search all ${expectedPairCount}`,
    'type="search"',
    'data-comparison-directory="true"',
    'data-comparison-result-count="true"',
    'href="/prop-firm-challenges"',
    'href="/cheapest-prop-firms"',
    'href="/prop-firm-challenge-changes"',
    'href="/compare/ftmo-vs-fundednext"',
  ]) {
    if (!comparisonHubText.includes(required) && !comparisonHubProbe.html.includes(required)) {
      errors.push(`${comparisonHubPath}: missing ${required}`)
    }
  }

  const matchupTags = new Map()
  for (const expression of [
    /<a\b[^>]*\bdata-curated-matchup="([^"]+)"[^>]*>/gi,
    /<a\b[^>]*\bdata-comparison-matchup="([^"]+)"[^>]*>/gi,
  ]) {
    for (const match of comparisonHubProbe.html.matchAll(expression)) {
      if (matchupTags.has(match[1])) {
        errors.push(`${comparisonHubPath}: duplicate matchup link ${match[1]}`)
      }
      matchupTags.set(match[1], match[0])
    }
  }
  if (matchupTags.size !== expectedPairCount) {
    errors.push(
      `${comparisonHubPath}: comparison hub rendered ${matchupTags.size} unique matchup links, expected ${expectedPairCount}`,
    )
  }
  const expectedSearchRows = []
  for (let a = 0; a < eligibleFirms.length; a += 1) {
    for (let b = a + 1; b < eligibleFirms.length; b += 1) {
      const firmA = eligibleFirms[a]
      const firmB = eligibleFirms[b]
      const matchup = [firmA.slug, firmB.slug].sort().join('-vs-')
      const tag = matchupTags.get(matchup)
      const products = [...firmA.products, ...firmB.products]
      const sourceCount = new Set(products.map(product => product.sourceUrl)).size
      const evidenceDate = products.map(product => product.sourceCapturedAt).sort().at(-1)
      expectedSearchRows.push({
        matchup,
        firmAName: firmA.firm.name,
        firmBName: firmB.firm.name,
        productCount: products.length,
        sourceCount,
        evidenceDate,
        editorial: matchup === 'ftmo-vs-fundednext',
      })
      if (
        !tag
        || !tag.includes(`data-product-count="${products.length}"`)
        || !tag.includes(`data-source-count="${sourceCount}"`)
        || !tag.includes(`data-evidence-date="${evidenceDate}"`)
      ) {
        errors.push(`${comparisonHubPath}: ${matchup} is missing fresh product/source evidence`)
      }
    }
  }
  const exactSearch = filterComparisonRows(expectedSearchRows, 'FTMO FundedNext')
  const fundedNextSearch = filterComparisonRows(expectedSearchRows, 'FundedNext')
  if (
    exactSearch.length !== 1
    || exactSearch[0]?.matchup !== 'ftmo-vs-fundednext'
    || fundedNextSearch.length !== eligibleFirms.length - 1
    || !fundedNextSearch.some(row => row.matchup === 'ftmo-vs-fundednext')
  ) {
    errors.push(`${comparisonHubPath}: comparison directory search logic failed`)
  }
  const fundedNextCurated = [...comparisonHubProbe.html.matchAll(
    /<a\b[^>]*\bdata-curated-matchup="ftmo-vs-fundednext"[^>]*>/gi,
  )][0]?.[0]
  if (!fundedNextCurated) {
    errors.push(`${comparisonHubPath}: current FTMO-vs-FundedNext editorial path is not featured`)
  }
  if (comparisonHubText.includes('★ 9') || comparisonHubText.includes('★ 8')) {
    errors.push(`${comparisonHubPath}: restored score-only matchup tiles`)
  }
}

const indiaLandingPath = '/best-prop-firms-in-india'
const indiaLandingProbe = await fetchPage(new URL(indiaLandingPath, BASE))
if (indiaLandingProbe.status !== 200) {
  errors.push(
    `${indiaLandingPath}: HTTP ${indiaLandingProbe.status || indiaLandingProbe.error}`,
  )
} else {
  const indiaLandingText = textContent(indiaLandingProbe.html)
  for (const required of [
    'Best Prop Firms in India 2026: RBI Alert-List Checked | TFH',
    '9/19 tracked firms pass every India publication gate',
    '44 fresh India-eligible products with first-party sources',
    'lowest published entry, keeping USD and EUR separate',
    '12 current verified changes and open source watches',
    'Compare 44 products',
    'Ranking order uses India evidence completeness first and editorial score second.',
    'Affiliate status and coupon size add 0 points.',
    'India evidence',
  ]) {
    if (!indiaLandingText.includes(required)) {
      errors.push(`${indiaLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/best-prop-firms-in-india"',
    'href="/prop-firm-challenge-changes"',
    '/go/e8-markets?from=best-prop-firms-in-india',
  ]) {
    if (!indiaLandingProbe.html.includes(required)) {
      errors.push(`${indiaLandingPath}: missing ${required}`)
    }
  }
}

const overallLandingPath = '/best-prop-firms-2026'
const expectedOverallFirms = firmRecords.flatMap(firm => {
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge),
  )
  return products.length ? [{ firm, products }] : []
}).sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
const expectedOverallProductCount = expectedOverallFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const expectedOverallTierCount = expectedOverallFirms.reduce(
  (total, entry) => total + entry.products.reduce(
    (subtotal, product) => subtotal + product.accountSizes.length,
    0,
  ),
  0,
)
const overallLandingProbe = await fetchPage(new URL(overallLandingPath, BASE))
if (overallLandingProbe.status !== 200) {
  errors.push(
    `${overallLandingPath}: HTTP ${overallLandingProbe.status || overallLandingProbe.error}`,
  )
} else {
  const overallText = textContent(overallLandingProbe.html)
  const cards = [...overallLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const evidenceDateCount = (overallText.match(/checked 2026-/g) ?? []).length
  const itemListCount = (overallLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length
  let representedProducts = 0
  let representedTiers = 0

  if (cards.length !== expectedOverallFirms.length) {
    errors.push(
      `${overallLandingPath}: rendered ${cards.length} firms, expected ${expectedOverallFirms.length}`,
    )
  }
  if (evidenceDateCount !== expectedOverallFirms.length) {
    errors.push(
      `${overallLandingPath}: rendered ${evidenceDateCount} dated sources, expected ${expectedOverallFirms.length}`,
    )
  }
  if (itemListCount !== 1) {
    errors.push(`${overallLandingPath}: rendered ${itemListCount} ItemLists, expected 1`)
  }

  for (const [index, { firm, products }] of expectedOverallFirms.entries()) {
    const tierCount = products.reduce(
      (total, product) => total + product.accountSizes.length,
      0,
    )
    const productLabel = `${products.length} current ${products.length === 1 ? 'product' : 'products'}`
    const tierLabel = `${tierCount} account tiers`
    const card = cards[index]
    if (!card || !card.text.includes(firm.name)) {
      errors.push(`${overallLandingPath}: rank ${index + 1} should be ${firm.name}`)
      continue
    }
    if (!card.text.includes(productLabel) || !card.text.includes(tierLabel)) {
      errors.push(`${overallLandingPath}: ${firm.name} is missing ${productLabel} · ${tierLabel}`)
      continue
    }
    representedProducts += products.length
    representedTiers += tierCount
  }
  if (representedProducts !== expectedOverallProductCount) {
    errors.push(
      `${overallLandingPath}: represented ${representedProducts} products, expected ${expectedOverallProductCount}`,
    )
  }
  if (representedTiers !== expectedOverallTierCount) {
    errors.push(
      `${overallLandingPath}: represented ${representedTiers} tiers, expected ${expectedOverallTierCount}`,
    )
  }

  for (const required of [
    `Best Prop Firms (2026): ${expectedOverallFirms.length} Ranked & Reviewed | TFH`,
    `${expectedOverallFirms.length} firms each have at least 1 product capture inside the 30-day freshness window`,
    `covering ${expectedOverallProductCount} current products in total`,
    'How to use an overall ranking',
    'Does rank 1 mean best for every strategy?',
    'Are the editorial score and product facts the same measure?',
    'How should USD, EUR, and recurring prices be compared?',
    'What should be rechecked immediately before purchase?',
    'Compare FTMO and FundedNext',
    'Partnership status, coupon size and product count add 0 points.',
  ]) {
    if (!overallText.includes(required)) {
      errors.push(`${overallLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/prop-firm-challenges"',
    'href="/compare/ftmo-vs-fundednext"',
    'href="/cheapest-prop-firms"',
    'href="/prop-firm-challenge-changes"',
    'href="/true-cost-of-prop-firm-challenges"',
  ]) {
    if (!overallLandingProbe.html.includes(required)) {
      errors.push(`${overallLandingPath}: missing ${required}`)
    }
  }
  const fundedNextCta = [...overallLandingProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes('href="/go/fundednext?from=best-prop-firms-2026"'))
  if (
    !fundedNextCta
    || !fundedNextCta.includes('rel="sponsored nofollow noopener"')
    || !fundedNextCta.includes('target="_blank"')
  ) {
    errors.push(`${overallLandingPath}: FundedNext ranking CTA is missing affiliate attribution`)
  }
  if (
    overallText.includes('Every major prop firm ranked')
    || overallText.includes('static beats trailing for most traders')
  ) {
    errors.push(`${overallLandingPath}: restored aggregate or unsupported ranking copy`)
  }
}

for (const backlinkPath of [
  '/blog/what-is-a-prop-firm',
  '/blog/is-prop-firm-trading-profitable',
  '/how-prop-firm-challenges-work',
  '/true-cost-of-prop-firm-challenges',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-prop-firms-2026"')) {
    errors.push(`${backlinkPath}: missing contextual overall-ranking backlink`)
  }
}

const ukLandingPath = '/best-prop-firms-in-uk'
const accessEvidenceIsFresh = sourceCapturedAt => {
  const captured = new Date(`${sourceCapturedAt}T00:00:00Z`)
  if (Number.isNaN(captured.getTime())) return false
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const ageDays = Math.floor((todayUtc - captured.getTime()) / 86_400_000)
  return ageDays >= 0 && ageDays <= 30
}
const expectedUkFirms = ukAccessEvidence.firms.flatMap(evidence => {
  const firm = firmRecords.find(candidate => outboundSlug(candidate.name) === evidence.firmSlug)
  const productsBySlug = new Map(
    getChallengesByFirm(evidence.firmSlug).map(product => [product.productSlug, product]),
  )
  const products = evidence.productSlugs.flatMap(productSlug => {
    const product = productsBySlug.get(productSlug)
    return product && isChallengeFresh(product) ? [product] : []
  })
  return firm
    && accessEvidenceIsFresh(evidence.sourceCapturedAt)
    && products.length === evidence.productSlugs.length
    ? [{ firm, evidence, products }]
    : []
}).sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
const expectedUkProductCount = expectedUkFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const ukLandingProbe = await fetchPage(new URL(ukLandingPath, BASE))
if (ukLandingProbe.status !== 200) {
  errors.push(`${ukLandingPath}: HTTP ${ukLandingProbe.status || ukLandingProbe.error}`)
} else {
  const ukText = textContent(ukLandingProbe.html)
  const cards = [...ukLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const itemListCount = (ukLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length

  if (cards.length !== expectedUkFirms.length) {
    errors.push(`${ukLandingPath}: rendered ${cards.length} firms, expected ${expectedUkFirms.length}`)
  }
  if (expectedUkFirms.length !== 8 || expectedUkProductCount !== 34) {
    errors.push(
      `${ukLandingPath}: evidence fixture must resolve to 8 firms and 34 products; received ${expectedUkFirms.length} and ${expectedUkProductCount}`,
    )
  }
  if (itemListCount !== 1) {
    errors.push(`${ukLandingPath}: rendered ${itemListCount} ItemLists, expected 1`)
  }

  expectedUkFirms.forEach(({ firm, evidence, products }, index) => {
    const card = cards[index]
    const productLabel = `${products.length} current ${products.length === 1 ? 'product' : 'products'}`
    if (!card || !card.text.includes(firm.name)) {
      errors.push(`${ukLandingPath}: rank ${index + 1} should be ${firm.name}`)
      return
    }
    for (const required of [
      productLabel,
      'entry from',
      'UK access Policy',
      `checked ${evidence.sourceCapturedAt}`,
    ]) {
      if (!card.text.includes(required)) {
        errors.push(`${ukLandingPath}: ${firm.name} card is missing ${required}`)
      }
    }
    for (const product of products.slice(0, 2)) {
      if (!card.text.includes(product.productName)) {
        errors.push(`${ukLandingPath}: ${firm.name} card is missing ${product.productName}`)
      }
    }
    if (!card.html.includes(`href="${evidence.sourceUrl}"`)) {
      errors.push(`${ukLandingPath}: ${firm.name} card is missing its country-policy source`)
    }
  })

  const expectedDescription =
    'Compare 8 prop firms with current first-party UK-access policies across 34 product paths, plus FCA checks, fees, rules, reviews, and dated sources.'
  const renderedDescription = decodeHtml(firstMatch(
    ukLandingProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    ukLandingProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  if (renderedDescription !== expectedDescription) {
    errors.push(`${ukLandingPath}: meta description does not match the 8-firm/34-product snapshot`)
  }

  for (const required of [
    'Best Prop Firms for UK Traders (2026): 8 Checked | TFH',
    'Best Prop Firms for UK Traders (2026): 8 Policy-Checked',
    '8 policy-checked firms across 34 mapped products',
    'Policy-supported UK access is not an FCA status.',
    'What UK traders should verify',
    'Does UK access mean the firm is FCA-authorised?',
    'What should match before checkout and KYC?',
    'How should USD and EUR fees be compared in GBP?',
    'Does the policy cover every product and platform forever?',
    'Choose the product, then verify the UK route',
  ]) {
    if (!ukText.includes(required)) {
      errors.push(`${ukLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="https://www.fca.org.uk/consumers/fca-firm-checker"',
    'href="https://www.fca.org.uk/consumers/warning-list-unauthorised-firms"',
    'href="/prop-firm-challenges"',
    'href="/compare/ftmo-vs-fundednext"',
    'href="/blog/fundednext-review"',
    'href="/cheapest-prop-firms"',
  ]) {
    if (!ukLandingProbe.html.includes(required)) {
      errors.push(`${ukLandingPath}: missing ${required}`)
    }
  }

  const fundedNextCta = [...ukLandingProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes('href="/go/fundednext?from=best-prop-firms-in-uk"'))
  if (
    !fundedNextCta
    || !fundedNextCta.includes('rel="sponsored nofollow noopener"')
    || !fundedNextCta.includes('target="_blank"')
  ) {
    errors.push(`${ukLandingPath}: FundedNext ranking CTA is missing affiliate attribution`)
  }
  if (
    ukText.includes('Every firm below accepts UK-based traders')
    || ukText.includes('settles reliably from the UK')
  ) {
    errors.push(`${ukLandingPath}: restored unsupported UK access or payout wording`)
  }
}

for (const backlinkPath of [
  '/blog/ftmo-review',
  '/blog/fundednext-review',
  '/blog/funding-pips-review',
  '/blog/fxify-review',
  '/blog/alpha-capital-review',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-prop-firms-in-uk"')) {
    errors.push(`${backlinkPath}: missing contextual UK-ranking backlink`)
  }
}

const usLandingPath = '/best-prop-firms-in-us'
const expectedUsFirms = usAccessEvidence.firms.flatMap(evidence => {
  const firm = firmRecords.find(candidate => outboundSlug(candidate.name) === evidence.firmSlug)
  const productsBySlug = new Map(
    getChallengesByFirm(evidence.firmSlug).map(product => [product.productSlug, product]),
  )
  const products = evidence.productSlugs.flatMap(productSlug => {
    const product = productsBySlug.get(productSlug)
    return product && isChallengeFresh(product) ? [product] : []
  })
  return firm
    && accessEvidenceIsFresh(evidence.sourceCapturedAt)
    && products.length === evidence.productSlugs.length
    ? [{ firm, evidence, products }]
    : []
}).sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
const expectedUsProductCount = expectedUsFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const usLandingProbe = await fetchPage(new URL(usLandingPath, BASE))
if (usLandingProbe.status !== 200) {
  errors.push(`${usLandingPath}: HTTP ${usLandingProbe.status || usLandingProbe.error}`)
} else {
  const usText = textContent(usLandingProbe.html)
  const cards = [...usLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const itemListCount = (usLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length

  if (cards.length !== expectedUsFirms.length) {
    errors.push(`${usLandingPath}: rendered ${cards.length} firms, expected ${expectedUsFirms.length}`)
  }
  if (expectedUsFirms.length !== 4 || expectedUsProductCount !== 14) {
    errors.push(
      `${usLandingPath}: evidence fixture must resolve to 4 firms and 14 products; received ${expectedUsFirms.length} and ${expectedUsProductCount}`,
    )
  }
  if (itemListCount !== 1) {
    errors.push(`${usLandingPath}: rendered ${itemListCount} ItemLists, expected 1`)
  }

  expectedUsFirms.forEach(({ firm, evidence, products }, index) => {
    const card = cards[index]
    const productLabel = `${products.length} U.S.-mapped ${products.length === 1 ? 'product' : 'products'}`
    const accessLabel = evidence.accessStatus === 'explicit' ? 'Direct' : 'Policy'
    if (!card || !card.text.includes(firm.name)) {
      errors.push(`${usLandingPath}: rank ${index + 1} should be ${firm.name}`)
      return
    }
    for (const required of [
      productLabel,
      `US access ${accessLabel}`,
      `checked ${evidence.sourceCapturedAt}`,
      `Score ${firm.score.toFixed(1)}`,
    ]) {
      if (!card.text.includes(required)) {
        errors.push(`${usLandingPath}: ${firm.name} card is missing ${required}`)
      }
    }
    for (const product of products.slice(0, 2)) {
      if (!card.text.includes(product.productName)) {
        errors.push(`${usLandingPath}: ${firm.name} card is missing ${product.productName}`)
      }
    }
    if (!card.html.includes(`href="${evidence.sourceUrl}"`)) {
      errors.push(`${usLandingPath}: ${firm.name} card is missing its U.S.-access source`)
    }
  })

  const expectedDescription =
    'Compare 4 policy-checked prop firms for U.S. traders across 14 exact futures and CFD products, with platform limits, CFTC/NFA checks, reviews, and sources.'
  const renderedDescription = decodeHtml(firstMatch(
    usLandingProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    usLandingProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  if (renderedDescription !== expectedDescription) {
    errors.push(`${usLandingPath}: meta description does not match the 4-firm/14-product snapshot`)
  }

  for (const required of [
    'Best Prop Firms for US Traders (2026): 4 Checked | TFH',
    'Best Prop Firms for U.S. Traders (2026): 4 Policy-Checked',
    '4 policy-checked firms across 14 mapped products',
    'U.S. access is not a regulatory badge.',
    'What U.S. traders should verify',
    'Does access mean the firm is CFTC-registered?',
    'Is the first funded stage simulated or live?',
    'Are futures and CFD paths interchangeable?',
    'What must match before a U.S. payout?',
    'Choose the product, not a U.S. badge',
    'Verify the FundedNext 5% coupon',
  ]) {
    if (!usText.includes(required)) errors.push(`${usLandingPath}: missing ${required}`)
  }
  for (const required of [
    'href="https://www.cftc.gov/check"',
    'href="https://www.nfa.futures.org/basicnet/"',
    'href="/prop-firm-challenges?market=futures"',
    'href="/prop-firm-challenges"',
    'href="/best-futures-prop-firms"',
    'href="/blog/fundednext-review"',
    'href="/prop-firm-discount-codes"',
    'href="/prop-firm-challenge-changes"',
  ]) {
    if (!usLandingProbe.html.includes(required)) errors.push(`${usLandingPath}: missing ${required}`)
  }

  const fundedNextCta = [...usLandingProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes('href="/go/fundednext?from=best-prop-firms-in-us"'))
  if (
    !fundedNextCta
    || !fundedNextCta.includes('rel="sponsored nofollow noopener"')
    || !fundedNextCta.includes('target="_blank"')
  ) {
    errors.push(`${usLandingPath}: FundedNext ranking CTA is missing affiliate attribution`)
  }
  if (
    usText.includes('CFTC-aware')
    || usText.includes('CFTC-regulated path')
    || usText.includes('only fully unambiguous legal path')
  ) {
    errors.push(`${usLandingPath}: restored unsafe regulatory wording`)
  }
}

for (const backlinkPath of [
  '/blog/fundednext-review',
  '/blog/tradeify-review',
  '/blog/topstep-review',
  '/blog/apex-trader-funding-review',
  '/how-prop-firm-challenges-work',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-prop-firms-in-us"')) {
    errors.push(`${backlinkPath}: missing contextual U.S.-ranking backlink`)
  }
}

const swingLandingPath = '/best-swing-trading-prop-firms'
const expectedSwingFirms = firmRecords.flatMap(firm => {
  const freshProducts = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge),
  )
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge)
    && challenge.rules.overnight === true
    && challenge.rules.weekend === true,
  )
  return products.length ? [{ firm, freshProducts, products }] : []
}).sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
const expectedSwingProductCount = expectedSwingFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const swingLandingProbe = await fetchPage(new URL(swingLandingPath, BASE))
if (swingLandingProbe.status !== 200) {
  errors.push(
    `${swingLandingPath}: HTTP ${swingLandingProbe.status || swingLandingProbe.error}`,
  )
} else {
  const swingText = textContent(swingLandingProbe.html)
  const cards = [...swingLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const itemListCount = (swingLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length

  if (cards.length !== expectedSwingFirms.length) {
    errors.push(
      `${swingLandingPath}: rendered ${cards.length} firms, expected ${expectedSwingFirms.length}`,
    )
  }
  if (expectedSwingFirms.length !== 7 || expectedSwingProductCount !== 27) {
    errors.push(
      `${swingLandingPath}: current fixture must resolve to 7 firms and 27 products; received ${expectedSwingFirms.length} and ${expectedSwingProductCount}`,
    )
  }
  if (itemListCount !== 1) {
    errors.push(`${swingLandingPath}: rendered ${itemListCount} ItemLists, expected 1`)
  }

  expectedSwingFirms.forEach(({ firm, freshProducts, products }, index) => {
    const card = cards[index]
    if (!card || !card.text.includes(firm.name)) {
      errors.push(`${swingLandingPath}: rank ${index + 1} should be ${firm.name}`)
      return
    }
    for (const required of [
      `${products.length} swing-qualified ${products.length === 1 ? 'product' : 'products'}`,
      `Score ${firm.score.toFixed(1)}`,
      `Product fit ${products.length}/${freshProducts.length}`,
    ]) {
      if (!card.text.includes(required)) {
        errors.push(`${swingLandingPath}: ${firm.name} card is missing ${required}`)
      }
    }
    for (const product of products) {
      if (!card.text.includes(product.productName)) {
        errors.push(`${swingLandingPath}: ${firm.name} card is missing ${product.productName}`)
      }
      if (!card.html.includes(`href="${product.sourceUrl}"`)) {
        errors.push(`${swingLandingPath}: ${firm.name} card is missing the ${product.productName} rule source`)
      }
      if (!card.text.includes(`checked ${product.sourceCapturedAt}`)) {
        errors.push(`${swingLandingPath}: ${firm.name} card is missing the ${product.productName} capture date`)
      }
    }
  })

  const expectedDescription =
    'Compare 7 swing-trading prop firms across 27 exact products with verified overnight and weekend holding, drawdown rules, dated sources, and reviews.'
  const renderedDescription = decodeHtml(firstMatch(
    swingLandingProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    swingLandingProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  if (renderedDescription !== expectedDescription) {
    errors.push(`${swingLandingPath}: meta description does not match the 7-firm/27-product snapshot`)
  }

  for (const required of [
    'Best Swing Trading Prop Firms (2026): 7 Verified | TFH',
    'Best Prop Firms for Swing Trading (2026): 7 Verified',
    '7 verified firms across 27 swing-qualified products',
    'What swing traders should verify',
    'Do both permissions belong to the same product?',
    'Is weekday overnight the same as weekend holding?',
    'What happens to the loss floor after open profit?',
    'Which carrying costs remain?',
    'Verify the FundedNext 5% coupon',
    'Verify the exact product before carrying',
  ]) {
    if (!swingText.includes(required)) {
      errors.push(`${swingLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/prop-firms/overnight-holding"',
    'href="/prop-firms/weekend-holding"',
    'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
    'href="/prop-firm-challenges"',
    'href="/blog/fundednext-review"',
    'href="/prop-firm-discount-codes"',
  ]) {
    if (!swingLandingProbe.html.includes(required)) {
      errors.push(`${swingLandingPath}: missing ${required}`)
    }
  }
  if (
    swingText.includes('Every firm below allows BOTH')
    || swingText.includes('static-drawdown account')
  ) {
    errors.push(`${swingLandingPath}: restored the unsupported aggregate/static claim`)
  }

  const fundedNextCta = [...swingLandingProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes('href="/go/fundednext?from=best-swing-trading-prop-firms"'))
  if (
    !fundedNextCta
    || !fundedNextCta.includes('rel="sponsored nofollow noopener"')
    || !fundedNextCta.includes('target="_blank"')
  ) {
    errors.push(`${swingLandingPath}: FundedNext ranking CTA is missing affiliate attribution`)
  }
}

for (const backlinkPath of [
  '/blog/fundednext-review',
  '/blog/e8-markets-review',
  '/blog/fxify-review',
  '/blog/alpha-capital-review',
  '/blog/city-traders-imperium-review',
  '/blog/bright-funded-prop-firm',
  '/blog/crypto-fund-trader-review',
  '/blog/balance-based-drawdown-vs-equity-based-drawdown',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-swing-trading-prop-firms"')) {
    errors.push(`${backlinkPath}: missing contextual swing-ranking backlink`)
  }
}

const futuresLandingPath = '/best-futures-prop-firms'
const expectedFuturesFirms = firmRecords.flatMap(firm => {
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge) && challenge.assetClass === 'futures',
  )
  return products.length ? [{ firm, products }] : []
}).sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
const expectedFuturesProductCount = expectedFuturesFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const futuresLandingProbe = await fetchPage(new URL(futuresLandingPath, BASE))
if (futuresLandingProbe.status !== 200) {
  errors.push(
    `${futuresLandingPath}: HTTP ${futuresLandingProbe.status || futuresLandingProbe.error}`,
  )
} else {
  const futuresText = textContent(futuresLandingProbe.html)
  const cards = [...futuresLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const itemListCount = (futuresLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length
  if (cards.length !== expectedFuturesFirms.length) {
    errors.push(
      `${futuresLandingPath}: rendered ${cards.length} firms, expected ${expectedFuturesFirms.length}`,
    )
  }
  if (expectedFuturesFirms.length !== 7 || expectedFuturesProductCount !== 25) {
    errors.push(
      `${futuresLandingPath}: current fixture must resolve to 7 firms and 25 products; received ${expectedFuturesFirms.length} and ${expectedFuturesProductCount}`,
    )
  }
  if (itemListCount !== 1) {
    errors.push(`${futuresLandingPath}: rendered ${itemListCount} ItemLists, expected 1`)
  }
  expectedFuturesFirms.forEach(({ firm, products }, index) => {
    const card = cards[index]
    if (!card || !card.text.includes(firm.name)) {
      errors.push(`${futuresLandingPath}: rank ${index + 1} should be ${firm.name}`)
      return
    }
    for (const required of [
      `${products.length} current ${products.length === 1 ? 'product' : 'products'}`,
      `Score ${firm.score.toFixed(1)}`,
      `Products ${products.length}`,
    ]) {
      if (!card.text.includes(required)) {
        errors.push(`${futuresLandingPath}: ${firm.name} card is missing ${required}`)
      }
    }
    for (const product of products) {
      if (!card.text.includes(product.productName)) {
        errors.push(`${futuresLandingPath}: ${firm.name} card is missing ${product.productName}`)
      }
      if (!decodeHtml(card.html).includes(`href="${product.sourceUrl}"`)) {
        errors.push(`${futuresLandingPath}: ${firm.name} card is missing the ${product.productName} source`)
      }
      if (!card.text.includes(`checked ${product.sourceCapturedAt}`)) {
        errors.push(`${futuresLandingPath}: ${firm.name} card is missing the ${product.productName} capture date`)
      }
    }
  })

  const expectedDescription =
    'Compare 7 futures prop firms across 25 current products with fees, billing, drawdown, payout rules, platforms, reviews, and dated first-party sources.'
  const renderedDescription = decodeHtml(firstMatch(
    futuresLandingProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    futuresLandingProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  if (renderedDescription !== expectedDescription) {
    errors.push(`${futuresLandingPath}: meta description does not match the 7-firm/25-product snapshot`)
  }
  for (const required of [
    'Best Futures Prop Firms (2026): 7 Verified | TFH',
    'Best Futures Prop Firms (2026): 7 Verified',
    '7 verified firms across 25 current futures products',
    'Compare 25 current futures products',
    'What futures traders should verify',
    'Is the evaluation fee one-time or recurring?',
    'Does drawdown trail intraday or at session end?',
    'Is the funded stage simulated or live?',
    'Which entity is actually regulated?',
    'Exchange oversight is not a prop-firm registration badge.',
  ]) {
    if (!futuresText.includes(required)) {
      errors.push(`${futuresLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/prop-firm-challenges?market=futures"',
    'href="/best-prop-firms-in-us"',
    'href="/blog/balance-based-drawdown-vs-equity-based-drawdown"',
    'href="/prop-firm-challenge-changes"',
    'href="https://www.cftc.gov/IndustryOversight/TradingOrganizations/DCMs/index.htm"',
    'href="https://www.cftc.gov/check"',
  ]) {
    if (!futuresLandingProbe.html.includes(required)) {
      errors.push(`${futuresLandingPath}: missing ${required}`)
    }
  }
  if (
    futuresText.includes('CFTC-regulated brokers')
    || futuresText.includes('US-friendly status')
    || futuresText.includes('firm acts as an evaluation gate, not as the counterparty')
  ) {
    errors.push(`${futuresLandingPath}: restored unsupported regulatory or aggregate wording`)
  }
}

for (const backlinkPath of [
  '/blog/topstep-review',
  '/blog/my-funded-futures',
  '/blog/take-profit-trader-review',
  '/blog/tradeday-review',
  '/blog/apex-trader-funding-review',
  '/blog/lucid-trading-review',
  '/blog/tradeify-review',
  '/blog/balance-based-drawdown-vs-equity-based-drawdown',
  '/best-prop-firms-in-us',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-futures-prop-firms"')) {
    errors.push(`${backlinkPath}: missing contextual futures-ranking backlink`)
  }
}

const mffReviewProbe = await fetchPage(new URL(mffReviewPath, BASE))
if (mffReviewProbe.status !== 200) {
  errors.push(`${mffReviewPath}: HTTP ${mffReviewProbe.status || mffReviewProbe.error}`)
} else {
  const mffText = textContent(mffReviewProbe.html)
  const mffTitle = textContent(firstMatch(
    mffReviewProbe.html,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ))
  const mffDescription = decodeHtml(firstMatch(
    mffReviewProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    mffReviewProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const mffH1 = textContent(firstMatch(
    mffReviewProbe.html,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
  ))
  if (mffTitle !== 'My Funded Futures Review 2026: Plans, Fees & Payouts') {
    errors.push(`${mffReviewPath}: search title does not use the decision-specific metadata`)
  }
  if (mffDescription !== (
    'My Funded Futures review of Rapid, Flex, Pro and Builder pricing, drawdown rules, '
    + 'payout gates, recurring costs, and which plan fits each trader.'
  )) {
    errors.push(`${mffReviewPath}: search description does not use the decision-specific metadata`)
  }
  if (mffH1 !== 'My Funded Futures Review 2026: 4 Plans, 11 Prices, $0 Activation') {
    errors.push(`${mffReviewPath}: visible H1 no longer preserves the current product snapshot`)
  }
  for (const required of [
    'data-mff-review-evidence="2026-07-27"',
    'The best plan depends on the rule that constrains the trader, not the lowest monthly fee.',
    'data-mff-plan-decision="binding-rule"',
    'Real-time trailing drawdown after funding plus the size-specific payout buffer',
    '/blog/balance-based-drawdown-vs-equity-based-drawdown',
    '/blog/what-is-prop-firm-consistency-rule',
    'data-mff-comparison-journey="futures-alternatives"',
    '/compare/my-funded-futures-vs-topstep',
    '/blog/topstep-review',
    '/blog/take-profit-trader-review',
    '/blog/apex-trader-funding-review',
    'data-mff-faq="current-plans"',
    'rank-math-question',
  ]) {
    if (!mffReviewProbe.html.includes(required) && !mffText.includes(required)) {
      errors.push(`${mffReviewPath}: missing SEO or decision boundary ${required}`)
    }
  }
  const mffJsonLd = [...mffReviewProbe.html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].flatMap(match => {
    try {
      return [JSON.parse(match[1])]
    } catch {
      return []
    }
  })
  const mffReview = mffJsonLd.find(value => value['@type'] === 'Review')
  if (
    mffReview?.dateModified !== '2026-08-18 12:00:00'
    || mffReview?.name !== mffH1
    || mffReview?.reviewBody !== (
      'MFF now sells Rapid, Flex, Pro, and Builder with monthly fees from $95 to $477. '
      + 'Compare drawdown, payout buffers, caps, and true cost.'
    )
  ) {
    errors.push(`${mffReviewPath}: Review schema disagrees with current editorial data`)
  }
}

const futuresMarketProbePath = '/prop-firm-challenges?market=futures'
const futuresMarketProbe = await fetchPage(new URL(futuresMarketProbePath, BASE))
if (futuresMarketProbe.status !== 200) {
  errors.push(
    `${futuresMarketProbePath}: HTTP ${futuresMarketProbe.status || futuresMarketProbe.error}`,
  )
} else {
  const futuresMarketCanonical = firstMatch(
    futuresMarketProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    futuresMarketProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(futuresMarketCanonical) !== canonicalKey(
    `${PRODUCTION_ORIGIN}/prop-firm-challenges`,
  )) {
    errors.push(`${futuresMarketProbePath}: canonical includes futures market state`)
  }
  if (!futuresMarketProbe.html.includes('<option value="futures">Futures</option>')) {
    errors.push(`${futuresMarketProbePath}: futures market option is missing`)
  }
}

const cryptoLandingPath = '/best-crypto-prop-firms'
const cryptoEvidenceIsFresh = sourceCapturedAt => {
  const captured = new Date(`${sourceCapturedAt}T00:00:00Z`)
  if (Number.isNaN(captured.getTime())) return false
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const ageDays = Math.floor((todayUtc - captured.getTime()) / 86_400_000)
  return ageDays >= 0 && ageDays <= 30
}
const expectedCryptoFirms = cryptoMarketEvidence.ranked.flatMap(evidence => {
  const firm = firmRecords.find(candidate => outboundSlug(candidate.name) === evidence.firmSlug)
  const productsBySlug = new Map(
    getChallengesByFirm(evidence.firmSlug).map(product => [product.productSlug, product]),
  )
  const products = evidence.productSlugs.flatMap(productSlug => {
    const product = productsBySlug.get(productSlug)
    return product && isChallengeFresh(product) ? [product] : []
  })
  return firm
    && cryptoEvidenceIsFresh(evidence.sourceCapturedAt)
    && products.length === evidence.productSlugs.length
    ? [{ firm, evidence, products }]
    : []
}).sort((a, b) => {
  const aKey = (a.evidence.marketModel === 'crypto-native' ? 100 : 0) + a.firm.score
  const bKey = (b.evidence.marketModel === 'crypto-native' ? 100 : 0) + b.firm.score
  return bKey - aKey || a.firm.name.localeCompare(b.firm.name)
})
const expectedCryptoProductCount = expectedCryptoFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const cryptoLandingProbe = await fetchPage(new URL(cryptoLandingPath, BASE))
if (cryptoLandingProbe.status !== 200) {
  errors.push(
    `${cryptoLandingPath}: HTTP ${cryptoLandingProbe.status || cryptoLandingProbe.error}`,
  )
} else {
  const cryptoText = textContent(cryptoLandingProbe.html)
  const cards = [...cryptoLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))

  if (cards.length !== expectedCryptoFirms.length) {
    errors.push(
      `${cryptoLandingPath}: rendered ${cards.length} firms, expected ${expectedCryptoFirms.length}`,
    )
  }
  if (expectedCryptoFirms.length !== 7 || expectedCryptoProductCount !== 32) {
    errors.push(
      `${cryptoLandingPath}: evidence fixture must resolve to 7 firms and 32 products; received ${expectedCryptoFirms.length} and ${expectedCryptoProductCount}`,
    )
  }

  expectedCryptoFirms.forEach(({ firm, evidence, products }, index) => {
    const card = cards.find(candidate => candidate.text.includes(firm.name))
    const marketLabel = evidence.marketModel === 'crypto-native'
      ? 'Crypto-native'
      : 'Multi-asset CFD'
    const productLabel = `${products.length} crypto-mapped ${products.length === 1 ? 'product' : 'products'}`
    if (!card) {
      errors.push(`${cryptoLandingPath}: missing qualifying firm ${firm.name}`)
      return
    }
    if (!cards[index]?.text.includes(firm.name)) {
      errors.push(`${cryptoLandingPath}: ${firm.name} is outside its evidence-model/score order`)
    }
    for (const required of [productLabel, marketLabel, `checked ${evidence.sourceCapturedAt}`]) {
      if (!card.text.includes(required)) {
        errors.push(`${cryptoLandingPath}: ${firm.name} card is missing ${required}`)
      }
    }
    for (const product of products.slice(0, 3)) {
      if (!card.text.includes(product.productName)) {
        errors.push(`${cryptoLandingPath}: ${firm.name} card is missing ${product.productName}`)
      }
    }
    if (!card.html.includes(`href="${evidence.sourceUrl}"`)) {
      errors.push(`${cryptoLandingPath}: ${firm.name} card is missing its market source`)
    }
  })

  for (const watch of cryptoMarketEvidence.watch) {
    if (!cryptoText.includes(watch.firmName)) {
      errors.push(`${cryptoLandingPath}: missing watch firm ${watch.firmName}`)
    }
    if (!cryptoLandingProbe.html.includes(`href="${watch.sourceUrl}"`)) {
      errors.push(`${cryptoLandingPath}: ${watch.firmName} watch source is missing`)
    }
    if (cards.some(card => card.text.includes(watch.firmName))) {
      errors.push(`${cryptoLandingPath}: watch firm ${watch.firmName} was rendered as ranked`)
    }
  }

  for (const required of [
    'Best Crypto Prop Firms (2026): 7 Verified | TFH',
    '7 evidence-backed firms across 32 mapped products',
    'Not ranked yet: 2 product-capture gaps',
    'What crypto traders should verify',
    'Can I trade crypto, or only pay and withdraw with it?',
    'Is it a dedicated crypto account or a multi-asset CFD product?',
    'Does weekend or 24/7 access actually apply?',
    'What do leverage, commission, consistency, and payout rules do?',
    'Choose the crypto product, not the payment badge',
  ]) {
    if (!cryptoText.includes(required)) {
      errors.push(`${cryptoLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/prop-firm-challenges"',
    'href="/blog/crypto-fund-trader-review"',
    'href="/blog/fundednext-review"',
    'href="/prop-firm-challenge-changes"',
  ]) {
    if (!cryptoLandingProbe.html.includes(required)) {
      errors.push(`${cryptoLandingPath}: missing ${required}`)
    }
  }

  const fundedNextCard = cards.find(card => card.text.includes('FundedNext'))
  if (!fundedNextCard?.html.includes('href="/go/fundednext?from=best-crypto-prop-firms"')) {
    errors.push(`${cryptoLandingPath}: FundedNext card is missing attributed affiliate CTA`)
  }
  if (
    !fundedNextCard?.html.includes('rel="sponsored nofollow noopener"')
    || !fundedNextCard?.html.includes('target="_blank"')
  ) {
    errors.push(`${cryptoLandingPath}: FundedNext affiliate CTA is missing disclosure attributes`)
  }
  if (
    cryptoText.includes('can you get paid in it?')
    || cryptoLandingProbe.html.includes("f.assets?.includes('Crypto')")
  ) {
    errors.push(`${cryptoLandingPath}: restored payment-based or aggregate crypto eligibility`)
  }
}

for (const backlinkPath of [
  '/blog/crypto-fund-trader-review',
  '/blog/fundednext-review',
  '/blog/city-traders-imperium-review',
  '/blog/what-is-a-prop-firm',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-crypto-prop-firms"')) {
    errors.push(`${backlinkPath}: missing contextual crypto-ranking backlink`)
  }
}

const cheapestLandingPath = '/cheapest-prop-firms'
const expectedCheapestEntries = firmRecords.flatMap(firm => {
  const tiers = getChallengesByFirm(outboundSlug(firm.name))
    .filter(challenge => isChallengeFresh(challenge))
    .flatMap(challenge => challenge.accountSizes.flatMap(tier => {
      const currency = challengeCurrency(challenge)
      const usdSurcharge = (tier.payLaterUsd ?? 0)
        + (tier.activationFeeUsd ?? challenge.activationFeeUsd ?? 0)
      const amount = currency === 'USD'
        ? minimumCostToFundedUsd(challenge, tier)
        : usdSurcharge === 0
          ? tier.priceEur ?? null
          : null
      return amount != null && amount > 0
        ? [{ firm, challenge, tier, currency, amount }]
        : []
    }))

  return (['USD', 'EUR']).flatMap(currency => {
    const cheapest = tiers
      .filter(tier => tier.currency === currency)
      .sort((a, b) => a.amount - b.amount)[0]
    return cheapest ? [cheapest] : []
  })
})
const expectedUsdEntries = expectedCheapestEntries.filter(entry => entry.currency === 'USD')
const expectedEurEntries = expectedCheapestEntries.filter(entry => entry.currency === 'EUR')
const cheapestLandingProbe = await fetchPage(new URL(cheapestLandingPath, BASE))
if (cheapestLandingProbe.status !== 200) {
  errors.push(
    `${cheapestLandingPath}: HTTP ${cheapestLandingProbe.status || cheapestLandingProbe.error}`,
  )
} else {
  const cheapestText = textContent(cheapestLandingProbe.html)
  const cards = [...cheapestLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const evidenceDateCount = (cheapestText.match(/checked 2026-/g) ?? []).length
  const itemListCount = (cheapestLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length
  const usdGroup = firstMatch(
    cheapestLandingProbe.html,
    /<section[^>]+aria-labelledby="ranking-usd-denominated-products"[^>]*>([\s\S]*?)<\/section>/i,
  )
  const eurGroup = firstMatch(
    cheapestLandingProbe.html,
    /<section[^>]+aria-labelledby="ranking-eur-denominated-products"[^>]*>([\s\S]*?)<\/section>/i,
  )
  const usdCardCount = (usdGroup.match(/<li class="leader-row/g) ?? []).length
  const eurCardCount = (eurGroup.match(/<li class="leader-row/g) ?? []).length

  if (cards.length !== expectedCheapestEntries.length) {
    errors.push(
      `${cheapestLandingPath}: rendered ${cards.length} entries, expected ${expectedCheapestEntries.length}`,
    )
  }
  if (evidenceDateCount !== expectedCheapestEntries.length) {
    errors.push(
      `${cheapestLandingPath}: rendered ${evidenceDateCount} dated price sources, expected ${expectedCheapestEntries.length}`,
    )
  }
  if (usdCardCount !== expectedUsdEntries.length || eurCardCount !== expectedEurEntries.length) {
    errors.push(
      `${cheapestLandingPath}: rendered ${usdCardCount} USD and ${eurCardCount} EUR entries; expected ${expectedUsdEntries.length} and ${expectedEurEntries.length}`,
    )
  }
  if (itemListCount !== 2) {
    errors.push(`${cheapestLandingPath}: rendered ${itemListCount} ItemLists, expected 2 currency lists`)
  }

  for (const expected of expectedCheapestEntries) {
    const symbol = expected.currency === 'USD' ? '$' : '€'
    const amount = `${symbol}${expected.amount.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(expected.amount) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
    const card = cards.find(candidate =>
      candidate.text.includes(expected.firm.name)
      && candidate.text.includes(expected.challenge.productName)
      && candidate.text.includes(amount),
    )
    if (!card) {
      errors.push(
        `${cheapestLandingPath}: missing ${expected.firm.name} ${expected.challenge.productName} at ${amount}`,
      )
    }
  }

  for (const required of [
    'Cheapest Prop Firm Challenges (2026) — By Currency | TFH',
    'Cheapest Prop Firm Challenges (2026): USD & EUR',
    'USD-denominated products',
    'EUR-denominated products',
    'What price-first buyers should verify',
    'Are USD and EUR prices directly ranked together?',
    'Does the number include activation or pay-later charges?',
    'What does a monthly minimum mean?',
    'Why can the smallest fee still be expensive?',
    'Maven Standard 3-Step',
    'Bright Funded 2-Step Bright',
  ]) {
    if (!cheapestText.includes(required)) {
      errors.push(`${cheapestLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/prop-firm-challenges"',
    'href="/true-cost-of-prop-firm-challenges"',
    'href="/prop-firm-discount-codes"',
    'href="/prop-firm-challenge-changes"',
  ]) {
    if (!cheapestLandingProbe.html.includes(required)) {
      errors.push(`${cheapestLandingPath}: missing ${required}`)
    }
  }
  if (
    cheapestText.includes('the lowest priced entry challenge from every firm we track')
    || cheapestText.includes('Minimum $5 to funded · Buy Now, Pay Later')
  ) {
    errors.push(`${cheapestLandingPath}: restored incomplete or cross-currency price copy`)
  }
}

for (const backlinkPath of [
  '/true-cost-of-prop-firm-challenges',
  '/how-prop-firm-challenges-work',
  '/blog/maven-prop-firm-review',
  '/blog/bright-funded-prop-firm',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/cheapest-prop-firms"')) {
    errors.push(`${backlinkPath}: missing contextual cheapest-ranking backlink`)
  }
}

const discountHubPath = '/prop-firm-discount-codes'
const expectedDeals = getAllDeals()
const discountHubProbe = await fetchPage(new URL(discountHubPath, BASE))
if (discountHubProbe.status !== 200) {
  errors.push(`${discountHubPath}: HTTP ${discountHubProbe.status || discountHubProbe.error}`)
} else {
  const discountText = textContent(discountHubProbe.html)
  const discountTitle = textContent(firstMatch(discountHubProbe.html, /<title>([\s\S]*?)<\/title>/i))
  const discountCards = [...discountHubProbe.html.matchAll(
    /<article class="deal-card"[^>]*>([\s\S]*?)<\/article>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const sourceCount = (discountHubProbe.html.match(/data-deal-source=/g) ?? []).length

  if (discountCards.length !== expectedDeals.length) {
    errors.push(
      `${discountHubPath}: rendered ${discountCards.length} offers, expected ${expectedDeals.length}`,
    )
  }
  if (sourceCount !== expectedDeals.length) {
    errors.push(
      `${discountHubPath}: rendered ${sourceCount} first-party sources, expected ${expectedDeals.length}`,
    )
  }

  for (const deal of expectedDeals) {
    const firm = firmRecords.find(record => outboundSlug(record.name) === deal.firmSlug)
    const card = discountCards.find(candidate =>
      candidate.text.includes(firm?.name ?? deal.firmSlug)
      && candidate.text.includes(deal.amountLabel),
    )
    if (!card) {
      errors.push(`${discountHubPath}: missing ${deal.firmSlug} ${deal.amountLabel}`)
      continue
    }
    if (!card.html.includes(`href="${deal.sourceUrl}"`)) {
      errors.push(`${discountHubPath}: ${deal.firmSlug} card is missing its first-party source`)
    }
    const [year, month, day] = deal.verifiedOn.split('-').map(Number)
    const monthName = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ][month - 1]
    if (!card.text.includes(`Checked ${monthName} ${day}, ${year}`)) {
      errors.push(`${discountHubPath}: ${deal.firmSlug} card has the wrong checked date`)
    }
  }

  if (discountTitle !== 'Prop Firm Discount Codes & Offers (2026) | TFH') {
    errors.push(`${discountHubPath}: title suffix is missing or duplicated: ${discountTitle}`)
  }

  for (const required of [
    'Prop Firm Discount Codes & Offers (2026)',
    'Current verified offers',
    'How the FundedNext 5% offer works',
    'There is no public FundedNext code to copy',
    'Earned coupon',
    '5% after Free Trial',
    'New users · CFD plans · no resets',
    'Compare 4 products and 22 prices',
  ]) {
    if (!discountText.includes(required)) errors.push(`${discountHubPath}: missing ${required}`)
  }
  for (const required of [
    'href="/go/fundednext?from=discount-hub-earned-coupon"',
    'data-affiliate-placement="discount-hub-earned-coupon"',
    'rel="sponsored nofollow noopener"',
    'href="/blog/fundednext-review"',
    'href="/compare/ftmo-vs-fundednext"',
    'href="/blog/ftmo-free-trial-explained"',
    'href="/true-cost-of-prop-firm-challenges"',
  ]) {
    if (!discountHubProbe.html.includes(required)) {
      errors.push(`${discountHubPath}: missing ${required}`)
    }
  }
  for (const staleClaim of [
    'No verified offer today',
    'See review for pricing',
    '10% comes off automatically',
  ]) {
    if (discountText.includes(staleClaim)) {
      errors.push(`${discountHubPath}: restored stale offer copy: ${staleClaim}`)
    }
  }
}

for (const backlinkPath of [
  '/blog/fundednext-review',
  '/blog/ftmo-free-trial-explained',
  '/true-cost-of-prop-firm-challenges',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/prop-firm-discount-codes"')) {
    errors.push(`${backlinkPath}: missing contextual discount-hub backlink`)
  }
}

const instantLandingPath = '/best-instant-funding-prop-firms'
const expectedInstantFirms = firmRecords.flatMap(firm => {
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge) && challenge.phases === 0,
  )
  return products.length ? [{ firm, products }] : []
}).sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
const expectedInstantProductCount = expectedInstantFirms.reduce(
  (total, entry) => total + entry.products.length,
  0,
)
const instantLandingProbe = await fetchPage(new URL(instantLandingPath, BASE))
if (instantLandingProbe.status !== 200) {
  errors.push(
    `${instantLandingPath}: HTTP ${instantLandingProbe.status || instantLandingProbe.error}`,
  )
} else {
  const instantText = textContent(instantLandingProbe.html)
  const cards = [...instantLandingProbe.html.matchAll(
    /<li class="leader-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  )].map(match => ({ html: match[0], text: textContent(match[1]) }))
  const itemListCount = (instantLandingProbe.html.match(/"@type":"ItemList"/g) ?? []).length
  if (cards.length !== expectedInstantFirms.length) {
    errors.push(
      `${instantLandingPath}: rendered ${cards.length} firms, expected ${expectedInstantFirms.length}`,
    )
  }
  if (expectedInstantFirms.length !== 10 || expectedInstantProductCount !== 19) {
    errors.push(
      `${instantLandingPath}: current fixture must resolve to 10 firms and 19 products; received ${expectedInstantFirms.length} and ${expectedInstantProductCount}`,
    )
  }
  if (itemListCount !== 1) {
    errors.push(`${instantLandingPath}: rendered ${itemListCount} ItemLists, expected 1`)
  }
  let renderedProductCount = 0
  expectedInstantFirms.forEach(({ firm, products }, index) => {
    const card = cards[index]
    const countLabel = `${products.length} current phase-0 ${products.length === 1 ? 'product' : 'products'}`
    if (!card || !card.text.includes(firm.name)) {
      errors.push(`${instantLandingPath}: rank ${index + 1} should be ${firm.name}`)
      return
    }
    for (const required of [
      countLabel,
      `Score ${firm.score.toFixed(1)}`,
      `Products ${products.length}`,
    ]) {
      if (!card.text.includes(required)) {
        errors.push(`${instantLandingPath}: ${firm.name} card is missing ${required}`)
      }
    }
    if (card.text.includes(countLabel)) renderedProductCount += products.length
    for (const product of products) {
      if (!card.text.includes(product.productName)) {
        errors.push(`${instantLandingPath}: ${firm.name} card is missing ${product.productName}`)
      }
      if (!decodeHtml(card.html).includes(`href="${product.sourceUrl}"`)) {
        errors.push(`${instantLandingPath}: ${firm.name} card is missing the ${product.productName} rule source`)
      }
      if (!card.text.includes(`checked ${product.sourceCapturedAt}`)) {
        errors.push(`${instantLandingPath}: ${firm.name} card is missing the ${product.productName} capture date`)
      }
    }
  })
  if (renderedProductCount !== expectedInstantProductCount) {
    errors.push(
      `${instantLandingPath}: represented ${renderedProductCount} products, expected ${expectedInstantProductCount}`,
    )
  }

  const expectedDescription =
    'Compare 10 instant-funding prop firms across 19 phase-0 products with entry costs, drawdown, starting splits, payout gates, reviews, and dated sources.'
  const renderedDescription = decodeHtml(firstMatch(
    instantLandingProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    instantLandingProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  if (renderedDescription !== expectedDescription) {
    errors.push(`${instantLandingPath}: meta description does not match the 10-firm/19-product snapshot`)
  }

  for (const required of [
    'Best Instant Funding Prop Firms (2026): 10 Verified | TFH',
    'Best Instant Funding Prop Firms (2026): 10 Verified',
    '10 verified firms across 19 phase-0 products',
    'What instant-funding buyers should verify',
    'Does phase 0 mean the account trades live capital?',
    'How does the maximum-loss line move?',
    'How much loss room repays the one-time fee?',
    'What unlocks the first payout?',
    'Verify the FundedNext 5% coupon',
    'Compare the exact phase-0 product',
  ]) {
    if (!instantText.includes(required)) {
      errors.push(`${instantLandingPath}: missing ${required}`)
    }
  }
  for (const required of [
    'href="/prop-firm-challenges?program=instant"',
    'href="/how-prop-firm-challenges-work"',
    'href="/true-cost-of-prop-firm-challenges"',
    'href="/blog/what-is-prop-firm-consistency-rule"',
    'href="/blog/fundednext-review"',
    'href="/prop-firm-discount-codes"',
  ]) {
    if (!instantLandingProbe.html.includes(required)) {
      errors.push(`${instantLandingPath}: missing ${required}`)
    }
  }
  if (
    instantText.includes('Lower-profit-split "instant" products')
    || instantText.includes('live capital from day one')
  ) {
    errors.push(`${instantLandingPath}: restored unsupported instant-funding copy`)
  }

  const fundedNextCta = [...instantLandingProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes('href="/go/fundednext?from=best-instant-funding-prop-firms"'))
  if (
    !fundedNextCta
    || !fundedNextCta.includes('rel="sponsored nofollow noopener"')
    || !fundedNextCta.includes('target="_blank"')
  ) {
    errors.push(`${instantLandingPath}: FundedNext ranking CTA is missing affiliate attribution`)
  }
}

for (const backlinkPath of [
  '/blog/alpha-capital-review',
  '/blog/city-traders-imperium-review',
  '/blog/crypto-fund-trader-review',
  '/blog/fundednext-review',
  '/blog/funding-pips-review',
  '/blog/fxify-review',
  '/blog/lucid-trading-review',
  '/blog/maven-prop-firm-review',
  '/blog/ofp-funding-review',
  '/blog/tradeify-review',
  '/blog/what-is-a-prop-firm',
  '/blog/are-prop-firm-passing-services-worth-it',
]) {
  const backlinkProbe = await fetchPage(new URL(backlinkPath, BASE))
  if (backlinkProbe.status !== 200) {
    errors.push(`${backlinkPath}: HTTP ${backlinkProbe.status || backlinkProbe.error}`)
  } else if (!backlinkProbe.html.includes('href="/best-instant-funding-prop-firms"')) {
    errors.push(`${backlinkPath}: missing contextual instant-funding backlink`)
  }
}

const instantProgramProbePath = '/prop-firm-challenges?program=instant'
const instantProgramProbe = await fetchPage(new URL(instantProgramProbePath, BASE))
if (instantProgramProbe.status !== 200) {
  errors.push(
    `${instantProgramProbePath}: HTTP ${instantProgramProbe.status || instantProgramProbe.error}`,
  )
} else {
  const instantProgramCanonical = firstMatch(
    instantProgramProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    instantProgramProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(instantProgramCanonical) !== canonicalKey(
    `${PRODUCTION_ORIGIN}/prop-firm-challenges`,
  )) {
    errors.push(`${instantProgramProbePath}: canonical includes instant program state`)
  }
  if (!instantProgramProbe.html.includes('<option value="instant">Instant funding</option>')) {
    errors.push(`${instantProgramProbePath}: instant programme option is missing`)
  }
}

const ctiReviewPath = '/blog/city-traders-imperium-review'
const ctiReviewProbe = await fetchPage(new URL(ctiReviewPath, BASE))
if (ctiReviewProbe.status !== 200) {
  errors.push(`${ctiReviewPath}: HTTP ${ctiReviewProbe.status || ctiReviewProbe.error}`)
} else {
  const ctiText = textContent(ctiReviewProbe.html)
  const summaryRows = (
    ctiReviewProbe.html.match(/<tr[^>]*\bdata-cti-product-summary=/gi) ?? []
  ).length
  if (summaryRows !== 4) {
    errors.push(`${ctiReviewPath}: rendered ${summaryRows} product summaries, expected 4`)
  }
  for (const required of [
    'City Traders Imperium Review 2026: 4 Plans & 23 Fees',
    'City Traders Imperium Review 2026: 4 Products, 23 Prices',
    '4 products and 23 priced tiers',
    'All 23 refundable fields remain unverified',
    '4.2/5 from 1,633 reviews',
    'Instant Funding and Direct Funding both set phases to 0',
  ]) {
    if (!ctiText.includes(required)) {
      errors.push(`${ctiReviewPath}: missing ${required}`)
    }
  }
  if (!ctiReviewProbe.html.includes('href="/best-instant-funding-prop-firms"')) {
    errors.push(`${ctiReviewPath}: missing instant-funding comparison link`)
  }
  for (const staleClaim of [
    'Single 2-Step Challenge',
    'Single product line',
    'no Instant or 1-Step variants',
    '4.5/5 cluster',
  ]) {
    if (ctiText.includes(staleClaim)) {
      errors.push(`${ctiReviewPath}: restored stale claim ${staleClaim}`)
    }
  }
}

const genericComparisonPath = '/compare/alpha-capital-vs-city-traders-imperium'
const genericComparisonProbe = await fetchPage(new URL(genericComparisonPath, BASE))
if (genericComparisonProbe.status !== 200) {
  errors.push(
    `${genericComparisonPath}: HTTP ${genericComparisonProbe.status || genericComparisonProbe.error}`,
  )
} else {
  const genericText = textContent(genericComparisonProbe.html)
  const alphaProducts = getChallengesByFirm('alpha-capital')
    .filter(challenge => isChallengeFresh(challenge))
  const ctiProducts = getChallengesByFirm('city-traders-imperium')
    .filter(challenge => isChallengeFresh(challenge))
  const genericProducts = [...alphaProducts, ...ctiProducts]
  const genericSources = new Set(genericProducts.map(product => product.sourceUrl))
  const alphaFirm = firmRecords.find(firm => firm.name === 'Alpha Capital')
  const ctiFirm = firmRecords.find(firm => firm.name === 'City Traders Imperium')
  const title = textContent(firstMatch(
    genericComparisonProbe.html,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ))
  const description = decodeHtml(firstMatch(
    genericComparisonProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    genericComparisonProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const canonical = firstMatch(
    genericComparisonProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    genericComparisonProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  const h1 = textContent(firstMatch(
    genericComparisonProbe.html,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
  ))
  const expectedDescription =
    `Alpha Capital vs City Traders Imperium: compare ${genericProducts.length} challenge products by funded cost, profit split, drawdown and payout rules using first-party data.`

  if (title !== 'Alpha Capital vs City Traders Imperium (2026)') {
    errors.push(`${genericComparisonPath}: incorrect title ${title}`)
  }
  if (description !== expectedDescription) {
    errors.push(`${genericComparisonPath}: incorrect product meta description`)
  }
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${genericComparisonPath}`)) {
    errors.push(`${genericComparisonPath}: incorrect canonical`)
  }
  if (
    h1
      !== `Alpha Capital vs City Traders Imperium (2026): ${alphaProducts.length} vs ${ctiProducts.length} Products`
  ) {
    errors.push(`${genericComparisonPath}: incorrect product-specific H1 ${h1}`)
  }
  for (const required of [
    `Product evidence · ${genericProducts.length} products · ${genericSources.size} source pages`,
    `Compare ${genericProducts.length} current products across ${genericSources.size} first-party source pages`,
    'without flattening one product into a firm-wide answer.',
    'Evidence summary',
    'Product-level: Alpha Capital vs City Traders Imperium',
    'Firm-level context',
    'data-compare-firm-context="true"',
    'These directory fields describe the firms, not a universal product rule.',
    `TFH ${alphaFirm?.score}/10`,
    `TFH ${ctiFirm?.score}/10`,
    'href="/blog/alpha-capital-review"',
    'href="/blog/city-traders-imperium-review"',
  ]) {
    if (!genericText.includes(required) && !genericComparisonProbe.html.includes(required)) {
      errors.push(`${genericComparisonPath}: missing ${required}`)
    }
  }
  for (const product of genericProducts) {
    if (!genericText.includes(product.productName)) {
      errors.push(`${genericComparisonPath}: missing product ${product.productName}`)
    }
    if (!genericComparisonProbe.html.includes(`href="${product.sourceUrl}"`)) {
      errors.push(`${genericComparisonPath}: missing source ${product.sourceUrl}`)
    }
  }
  const productIndex = genericText.indexOf('Product-level: Alpha Capital vs City Traders Imperium')
  const contextIndex = genericText.indexOf('Firm-level context')
  const trustpilotIndex = genericText.indexOf('Trustpilot: Alpha Capital vs City Traders Imperium')
  if (!(productIndex >= 0 && productIndex < contextIndex && contextIndex < trustpilotIndex)) {
    errors.push(`${genericComparisonPath}: product evidence is not primary in the rendered hierarchy`)
  }
  if (
    genericText.includes('Category scoreboard')
    || genericText.includes('Side-by-side: Alpha Capital vs City Traders Imperium')
    || genericComparisonProbe.html.includes('class="compare-infographic"')
    || genericComparisonProbe.html.includes('aria-label="Winner"')
    || genericComparisonProbe.html.includes('compare-tie-chip')
    || genericComparisonProbe.html.includes('data-compare-aggregate-fallback')
  ) {
    errors.push(`${genericComparisonPath}: generic comparison restored aggregate scoreboard or winner markup`)
  }
  const contextSection = firstMatch(
    genericComparisonProbe.html,
    /<section[^>]*data-compare-firm-context[^>]*>([\s\S]*?)<\/section>/i,
  )
  const contextRows = (contextSection.match(/<div[^>]*\brole=["']row["']/gi) ?? []).length
  if (contextRows !== 5) {
    errors.push(`${genericComparisonPath}: rendered ${contextRows - 1} context fields, expected 4`)
  }
  const jsonLdObjects = [...genericComparisonProbe.html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].flatMap(match => {
    try {
      return [JSON.parse(match[1])]
    } catch {
      return []
    }
  })
  const itemList = jsonLdObjects.find(value => value['@type'] === 'ItemList')
  const itemNames = itemList?.itemListElement?.map(entry => entry.item?.name) ?? []
  if (JSON.stringify(itemNames) !== JSON.stringify(['Alpha Capital', 'City Traders Imperium'])) {
    errors.push(`${genericComparisonPath}: generic comparison ItemList is not in neutral canonical order`)
  }
  if (!alphaFirm || !ctiFirm) {
    errors.push(`${genericComparisonPath}: comparison firms are missing from firms.json`)
  } else {
    const expectedRelated = buildRelatedComparisons(alphaFirm, ctiFirm, firmRecords)
    const renderedRelated = [...genericComparisonProbe.html.matchAll(
      /\bdata-related-matchup=["']([^"']+)["']/gi,
    )].map(match => match[1])
    if (
      !genericComparisonProbe.html.includes('data-related-comparisons="true"')
      || JSON.stringify(renderedRelated)
        !== JSON.stringify(expectedRelated.map(item => item.matchup))
    ) {
      errors.push(`${genericComparisonPath}: generic comparison related links do not match the shared selector`)
    }
    for (const related of expectedRelated) {
      const card = firstMatch(
        genericComparisonProbe.html,
        new RegExp(
          `<li[^>]*data-related-matchup=["']${related.matchup}["'][^>]*>([\\s\\S]*?)<\\/li>`,
          'i',
        ),
      )
      const cardText = textContent(card)
      for (const required of [
        related.label,
        `${related.productCount} current products`,
        `${related.sourceCount} first-party source`,
        `checked ${formatCaptureDate(related.latestCapture)}`,
      ]) {
        if (!cardText.includes(required)) {
          errors.push(`${genericComparisonPath}: ${related.matchup} is missing ${required}`)
        }
      }
      if (!card.includes(`href="${related.href}"`)) {
        errors.push(`${genericComparisonPath}: ${related.matchup} is missing its comparison link`)
      }
    }
  }
}

const fundedNextReviewPath = '/blog/fundednext-review'
const fundedNextReviewProbe = await fetchPage(new URL(fundedNextReviewPath, BASE))
if (fundedNextReviewProbe.status !== 200) {
  errors.push(
    `${fundedNextReviewPath}: HTTP ${fundedNextReviewProbe.status || fundedNextReviewProbe.error}`,
  )
} else {
  const fundedNextText = textContent(fundedNextReviewProbe.html)
  const productFitRows = (
    fundedNextReviewProbe.html.match(/<tr[^>]*\bdata-fundednext-product-fit=/gi) ?? []
  ).length
  if (productFitRows !== 4) {
    errors.push(`${fundedNextReviewPath}: rendered ${productFitRows} product-fit rows, expected 4`)
  }
  for (const required of [
    'Which FundedNext product fits which rule priority?',
    'Stellar 2-Step',
    'Stellar 1-Step',
    'Stellar Lite',
    'Stellar Instant',
    'partnership contributes 0 points',
  ]) {
    if (!fundedNextText.includes(required)) {
      errors.push(`${fundedNextReviewPath}: missing ${required}`)
    }
  }
  for (const required of [
    'data-fundednext-conversion="product-fit"',
    'data-affiliate-placement="product-fit"',
    'href="/go/fundednext?from=post-body-fundednext-review-product-fit"',
    'href="/compare/ftmo-vs-fundednext"',
  ]) {
    if (!fundedNextReviewProbe.html.includes(required)) {
      errors.push(`${fundedNextReviewPath}: missing ${required}`)
    }
  }
  const productFitCta = [...fundedNextReviewProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => tag.includes(
      'href="/go/fundednext?from=post-body-fundednext-review-product-fit"',
    ))
  if (
    !productFitCta
    || !productFitCta.includes('rel="sponsored nofollow noopener"')
    || !productFitCta.includes('target="_blank"')
  ) {
    errors.push(`${fundedNextReviewPath}: product-fit CTA is not disclosed as sponsored`)
  }

  const fundedNextFirm = firmRecords.find(firm => firm.name === 'FundedNext')
  const alternativeSection = firstMatch(
    fundedNextReviewProbe.html,
    /<section[^>]*aria-label=["']Alternatives to FundedNext["'][^>]*>([\s\S]*?)<\/section>/i,
  )
  const renderedAlternatives = [...alternativeSection.matchAll(
    /\bdata-firm-alternative=["']([^"']+)["']/gi,
  )].map(match => match[1])
  const expectedAlternatives = fundedNextFirm
    ? rankFirmAlternatives(fundedNextFirm, firmRecords)
    : []
  if (
    !fundedNextFirm
    || JSON.stringify(renderedAlternatives)
      !== JSON.stringify(expectedAlternatives.map(firm => outboundSlug(firm.name)))
  ) {
    errors.push(`${fundedNextReviewPath}: review alternatives do not match the shared ranker`)
  }
  for (const alternative of expectedAlternatives) {
    const slug = outboundSlug(alternative.name)
    const evidence = getFreshFirmEvidence(alternative)
    const href = comparisonHref(fundedNextFirm, alternative)
    const card = firstMatch(
      alternativeSection,
      new RegExp(
        `(<div[^>]*data-firm-alternative=["']${slug}["'][^>]*>[\\s\\S]*?)(?=<div[^>]*data-firm-alternative=|$)`,
        'i',
      ),
    )
    const cardText = textContent(card)
    if (
      !card.includes(`data-alternative-products="${evidence.productCount}"`)
      || !card.includes(`data-alternative-sources="${evidence.sourceCount}"`)
      || !card.includes(`data-alternative-comparison="${href}"`)
      || !card.includes(`href="${href}"`)
    ) {
      errors.push(`${fundedNextReviewPath}: review alternatives do not link to their exact comparisons`)
    }
    for (const required of [
      `TFH ${alternative.score}/10`,
      `${evidence.productCount} current ${evidence.productCount === 1 ? 'product' : 'products'}`,
      `${evidence.sourceCount} first-party ${evidence.sourceCount === 1 ? 'source' : 'sources'}`,
      `checked ${formatCaptureDate(evidence.latestCapture)}`,
    ]) {
      if (!cardText.includes(required)) {
        errors.push(`${fundedNextReviewPath}: ${alternative.name} alternative is missing ${required}`)
      }
    }
  }

  const expectedComparisonFirms = fundedNextFirm
    ? rankFirmAlternatives(fundedNextFirm, firmRecords, firmRecords.length)
    : []
  const comparisonIndexTags = [...alternativeSection.matchAll(
    /<a\b[^>]*\bdata-firm-comparison-link=["'][^"']+["'][^>]*>/gi,
  )].map(match => match[0])
  const renderedComparisonHrefs = comparisonIndexTags.map(tag =>
    firstMatch(tag, /\bdata-firm-comparison-link=["']([^"']+)["']/i),
  )
  const expectedComparisonHrefs = expectedComparisonFirms.map(firm =>
    comparisonHref(fundedNextFirm, firm),
  )
  if (
    !alternativeSection.includes('data-firm-comparison-index="fundednext"')
    || JSON.stringify(renderedComparisonHrefs) !== JSON.stringify(expectedComparisonHrefs)
  ) {
    errors.push(`${fundedNextReviewPath}: review comparison index is incomplete or out of order`)
  }
  expectedComparisonFirms.forEach((firm, index) => {
    const href = expectedComparisonHrefs[index]
    const evidence = getFreshComparisonEvidence(fundedNextFirm, firm)
    const tag = comparisonIndexTags[index] || ''
    const linkContent = firstMatch(
      alternativeSection,
      new RegExp(
        `<a[^>]*data-firm-comparison-link=["']${href}["'][^>]*>([\\s\\S]*?)<\\/a>`,
        'i',
      ),
    )
    const linkText = textContent(linkContent)
    if (
      !tag.includes(`href="${href}"`)
      || !tag.includes(`data-comparison-products="${evidence.productCount}"`)
      || !tag.includes(`data-comparison-sources="${evidence.sourceCount}"`)
      || !linkText.includes(`FundedNext vs ${firm.name}`)
      || !linkText.includes(`${evidence.productCount} products`)
      || !linkText.includes(`checked ${formatCaptureDate(evidence.latestCapture)}`)
    ) {
      errors.push(`${fundedNextReviewPath}: ${firm.name} comparison-index evidence is incomplete`)
    }
  })
}

const ftmoFundedNextPath = '/compare/ftmo-vs-fundednext'
const ftmoFundedNextProbe = await fetchPage(new URL(ftmoFundedNextPath, BASE))
if (ftmoFundedNextProbe.status !== 200) {
  errors.push(
    `${ftmoFundedNextPath}: HTTP ${ftmoFundedNextProbe.status || ftmoFundedNextProbe.error}`,
  )
} else {
  const matchupText = textContent(ftmoFundedNextProbe.html)
  const title = textContent(firstMatch(
    ftmoFundedNextProbe.html,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ))
  const description = decodeHtml(firstMatch(
    ftmoFundedNextProbe.html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || firstMatch(
    ftmoFundedNextProbe.html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ))
  const canonical = firstMatch(
    ftmoFundedNextProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    ftmoFundedNextProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  const h1 = textContent(firstMatch(
    ftmoFundedNextProbe.html,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
  ))

  if (title !== 'FTMO vs FundedNext (2026)') {
    errors.push(`${ftmoFundedNextPath}: incorrect title ${title}`)
  }
  if (
    description
      !== 'FTMO vs FundedNext using current 2026 fees, base splits, drawdowns, refund timing, payout gates, platforms and 6 captured challenge products.'
  ) {
    errors.push(`${ftmoFundedNextPath}: current product meta description is missing`)
  }
  if (h1 !== 'FTMO vs FundedNext (2026): 2 Products vs 4 Paths') {
    errors.push(`${ftmoFundedNextPath}: incorrect product-specific H1 ${h1}`)
  }
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${ftmoFundedNextPath}`)) {
    errors.push(`${ftmoFundedNextPath}: incorrect canonical`)
  }

  const challengeSets = [
    ['FTMO', 'ftmo'],
    ['FundedNext', 'fundednext'],
  ].map(([firmName, slug]) => ({
    firmName,
    slug,
    products: getChallengesByFirm(slug).filter(challenge => isChallengeFresh(challenge)),
  }))
  const productCount = challengeSets.reduce((sum, set) => sum + set.products.length, 0)
  const sourceGroups = new Map()
  for (const set of challengeSets) {
    for (const product of set.products) {
      const group = sourceGroups.get(product.sourceUrl) || {
        firmName: set.firmName,
        productNames: [],
      }
      group.productNames.push(product.productName)
      sourceGroups.set(product.sourceUrl, group)
    }
  }
  if (!matchupText.includes(`you actually buy — ${productCount} of them`)) {
    errors.push(`${ftmoFundedNextPath}: missing all ${productCount} fresh products`)
  }
  if (!matchupText.includes(`${sourceGroups.size} first-party pages`)) {
    errors.push(`${ftmoFundedNextPath}: missing ${sourceGroups.size} grouped first-party sources`)
  }
  for (const set of challengeSets) {
    for (const product of set.products) {
      if (!matchupText.includes(product.productName)) {
        errors.push(`${ftmoFundedNextPath}: missing product ${product.productName}`)
      }
    }
  }
  for (const [sourceUrl, group] of sourceGroups) {
    const label = `${group.firmName} — ${group.productNames
      .sort((x, y) => x.localeCompare(y))
      .join(', ')}`
    if (!ftmoFundedNextProbe.html.includes(`href="${sourceUrl}"`)) {
      errors.push(`${ftmoFundedNextPath}: missing first-party source ${sourceUrl}`)
    }
    if (!matchupText.includes(label)) {
      errors.push(`${ftmoFundedNextPath}: source does not name supported products ${label}`)
    }
  }

  const formatDrawdown = value => {
    if (value === 'eod-trailing') return 'EOD trailing'
    if (value === 'balance-based') return 'Balance-based'
    return value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
  }
  for (const set of challengeSets) {
    const splits = [...new Set(set.products.map(product => product.profitSplitPct)
      .filter(value => value != null))].sort((x, y) => x - y)
    const splitLabel = splits.length === 1
      ? `${splits[0]}%`
      : `${splits[0]}–${splits.at(-1)}%`
    const drawdowns = [...new Set(set.products.map(product =>
      formatDrawdown(product.drawdownType),
    ))].join(' / ')
    const card = [...ftmoFundedNextProbe.html.matchAll(
      /<div class="card compare-firm-card"[^>]*>/gi,
    )].map(match => match[0]).find(tag =>
      tag.includes(`data-compare-firm="${set.slug}"`),
    )
    if (
      !card
      || !card.includes(`data-product-count="${set.products.length}"`)
      || !card.includes(`data-starting-splits="${splitLabel}"`)
      || !card.includes(`data-drawdowns="${drawdowns}"`)
    ) {
      errors.push(`${ftmoFundedNextPath}: ${set.firmName} hero summary is not product-specific`)
    }
  }

  const itemListCount = (ftmoFundedNextProbe.html.match(/"@type":"ItemList"/g) ?? []).length
  const faqPageCount = (ftmoFundedNextProbe.html.match(/"@type":"FAQPage"/g) ?? []).length
  if (itemListCount !== 1 || faqPageCount !== 1) {
    errors.push(
      `${ftmoFundedNextPath}: expected 1 ItemList and 1 FAQPage, found ${itemListCount} and ${faqPageCount}`,
    )
  }
  const productIndex = matchupText.indexOf('Product-level: FTMO vs FundedNext')
  const contextIndex = matchupText.indexOf('Firm-level context')
  const trustpilotIndex = matchupText.indexOf('Trustpilot: FTMO vs FundedNext')
  if (!(productIndex >= 0 && productIndex < contextIndex && contextIndex < trustpilotIndex)) {
    errors.push(`${ftmoFundedNextPath}: product evidence is not primary in the rendered hierarchy`)
  }
  if (
    matchupText.includes('Category scoreboard')
    || matchupText.includes('Side-by-side: FTMO vs FundedNext')
    || ftmoFundedNextProbe.html.includes('class="compare-infographic"')
    || ftmoFundedNextProbe.html.includes('aria-label="Winner"')
    || ftmoFundedNextProbe.html.includes('compare-tie-chip')
    || ftmoFundedNextProbe.html.includes('data-compare-aggregate-fallback')
    || !ftmoFundedNextProbe.html.includes('data-compare-firm-context="true"')
  ) {
    errors.push(`${ftmoFundedNextPath}: editorial comparison restored aggregate scoreboard or winner markup`)
  }
  const contextSection = firstMatch(
    ftmoFundedNextProbe.html,
    /<section[^>]*data-compare-firm-context[^>]*>([\s\S]*?)<\/section>/i,
  )
  const contextRows = (contextSection.match(/<div[^>]*\brole=["']row["']/gi) ?? []).length
  if (contextRows !== 5) {
    errors.push(`${ftmoFundedNextPath}: rendered ${contextRows - 1} context fields, expected 4`)
  }
  const jsonLdObjects = [...ftmoFundedNextProbe.html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].flatMap(match => {
    try {
      return [JSON.parse(match[1])]
    } catch {
      return []
    }
  })
  const itemList = jsonLdObjects.find(value => value['@type'] === 'ItemList')
  const itemNames = itemList?.itemListElement?.map(entry => entry.item?.name) ?? []
  if (JSON.stringify(itemNames) !== JSON.stringify(['FTMO', 'FundedNext'])) {
    errors.push(`${ftmoFundedNextPath}: comparison ItemList is not in neutral canonical order`)
  }
  const ftmoFirm = firmRecords.find(firm => firm.name === 'FTMO')
  const fundedNextFirm = firmRecords.find(firm => firm.name === 'FundedNext')
  if (!ftmoFirm || !fundedNextFirm) {
    errors.push(`${ftmoFundedNextPath}: comparison firms are missing from firms.json`)
  } else {
    const expectedRelated = buildRelatedComparisons(ftmoFirm, fundedNextFirm, firmRecords)
    const renderedRelated = [...ftmoFundedNextProbe.html.matchAll(
      /\bdata-related-matchup=["']([^"']+)["']/gi,
    )].map(match => match[1])
    if (
      !ftmoFundedNextProbe.html.includes('data-related-comparisons="true"')
      || JSON.stringify(renderedRelated)
        !== JSON.stringify(expectedRelated.map(item => item.matchup))
    ) {
      errors.push(`${ftmoFundedNextPath}: editorial comparison related links do not match the shared selector`)
    }
    for (const related of expectedRelated) {
      const card = firstMatch(
        ftmoFundedNextProbe.html,
        new RegExp(
          `<li[^>]*data-related-matchup=["']${related.matchup}["'][^>]*>([\\s\\S]*?)<\\/li>`,
          'i',
        ),
      )
      const cardText = textContent(card)
      for (const required of [
        related.label,
        `${related.productCount} current products`,
        `${related.sourceCount} first-party source`,
        `checked ${formatCaptureDate(related.latestCapture)}`,
      ]) {
        if (!cardText.includes(required)) {
          errors.push(`${ftmoFundedNextPath}: ${related.matchup} is missing ${required}`)
        }
      }
      if (!card.includes(`href="${related.href}"`)) {
        errors.push(`${ftmoFundedNextPath}: ${related.matchup} is missing its comparison link`)
      }
    }
  }
  for (const href of [
    '/blog/ftmo-review',
    '/blog/fundednext-review',
    '/prop-firm-discount-codes',
  ]) {
    if (!ftmoFundedNextProbe.html.includes(`href="${href}"`)) {
      errors.push(`${ftmoFundedNextPath}: missing internal decision link ${href}`)
    }
  }
  const anchorTags = [...ftmoFundedNextProbe.html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => match[0])
  for (const [href, sponsored] of [
    ['/go/fundednext?from=compare-ftmo-vs-fundednext', true],
    ['/go/fundednext?from=compare-ftmo-vs-fundednext-final', true],
    ['/go/ftmo?from=compare-ftmo-vs-fundednext', false],
    ['/go/ftmo?from=compare-ftmo-vs-fundednext-final', false],
  ]) {
    const tag = anchorTags.find(anchor => anchor.includes(`href="${href}"`))
    const rel = tag ? firstMatch(tag, /\brel=["']([^"']*)["']/i) : ''
    if (
      !tag
      || !tag.includes('target="_blank"')
      || rel.split(/\s+/).includes('sponsored') !== sponsored
    ) {
      errors.push(`${ftmoFundedNextPath}: incorrect outbound disclosure for ${href}`)
    }
  }
  for (const required of [
    'data-compare-conversion="ftmo-fundednext-final"',
    'data-affiliate-placement="compare-ftmo-vs-fundednext-final"',
    'FundedNext is a partner; FTMO is not. Partnership does not change our verdict.',
    'Compare the live checkout totals and your card\'s FX cost before paying.',
  ]) {
    if (!ftmoFundedNextProbe.html.includes(required) && !matchupText.includes(required)) {
      errors.push(`${ftmoFundedNextPath}: missing final decision safeguard ${required}`)
    }
  }
}

const fundedNextMatchupRedirect = await fetchPage(new URL(
  '/go/fundednext?from=compare-ftmo-vs-fundednext-final',
  BASE,
), 'manual')
let fundedNextMatchupDestination = null
try {
  fundedNextMatchupDestination = new URL(fundedNextMatchupRedirect.location, BASE)
} catch {
  // The assertions below report the missing or malformed Location header.
}
if (
  fundedNextMatchupRedirect.status !== 302
  || !fundedNextMatchupDestination
  || fundedNextMatchupDestination.origin === BASE.origin
  || fundedNextMatchupDestination.searchParams.get('fpr') !== 'karlis56'
  || fundedNextMatchupDestination.searchParams.get('utm_source') !== 'tradersfundhub'
  || fundedNextMatchupDestination.searchParams.get('utm_medium') !== 'affiliate'
  || fundedNextMatchupDestination.searchParams.get('utm_campaign') !== 'compare-ftmo-vs-fundednext-final'
) {
  errors.push(
    '/go/fundednext?from=compare-ftmo-vs-fundednext-final: matchup affiliate redirect failed',
  )
}

const fundedNextAffiliateProbePath = '/go/fundednext?from=post-body-fundednext-review-product-fit'
const fundedNextAffiliateProbe = await fetchPage(
  new URL(fundedNextAffiliateProbePath, BASE),
  'manual',
)
let fundedNextAffiliateDestination = null
try {
  fundedNextAffiliateDestination = new URL(fundedNextAffiliateProbe.location, BASE)
} catch {
  // The assertions below report the missing or malformed Location header.
}
if (
  fundedNextAffiliateProbe.status !== 302
  || !fundedNextAffiliateDestination
  || fundedNextAffiliateDestination.origin === BASE.origin
  || fundedNextAffiliateDestination.hostname.replace(/^www\./, '') !== 'fundednext.com'
  || fundedNextAffiliateDestination.searchParams.get('fpr') !== 'karlis56'
  || fundedNextAffiliateDestination.searchParams.get('utm_source') !== 'tradersfundhub'
  || fundedNextAffiliateDestination.searchParams.get('utm_medium') !== 'affiliate'
  || fundedNextAffiliateDestination.searchParams.get('utm_campaign')
    !== 'post-body-fundednext-review-product-fit'
) {
  errors.push(`${fundedNextAffiliateProbePath}: affiliate destination or attribution failed`)
}

const shortlistProbe = await fetchPage(new URL(
  '/prop-firm-challenges?shortlist=topstep%3Atrading-combine-standard-path%2Capex-trader-funding%3Aeod-trail-standard',
  BASE,
))
if (shortlistProbe.status !== 200) {
  errors.push(`/prop-firm-challenges?shortlist=…: HTTP ${shortlistProbe.status || shortlistProbe.error}`)
} else {
  const shortlistCanonical = firstMatch(
    shortlistProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    shortlistProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(shortlistCanonical) !== canonicalKey(
    `${PRODUCTION_ORIGIN}/prop-firm-challenges`,
  )) {
    errors.push('/prop-firm-challenges?shortlist=…: canonical includes shortlist state')
  }
  if (!shortlistProbe.html.includes('Shareable product shortlist')) {
    errors.push('/prop-firm-challenges: missing the shareable shortlist panel')
  }
  if (!shortlistProbe.html.includes('aria-label="Add')) {
    errors.push('/prop-firm-challenges: missing shortlist selection controls')
  }
}

const indiaShortlistProbe = await fetchPage(new URL(
  '/best-prop-firms-in-india/challenge-comparison?shortlist=fundingpips%3A1-step-flex%2Cbright-funded%3Abright-funded-1-step&priority=payout-speed',
  BASE,
))
if (indiaShortlistProbe.status !== 200) {
  errors.push(
    `/best-prop-firms-in-india/challenge-comparison?shortlist=…: HTTP ${
      indiaShortlistProbe.status || indiaShortlistProbe.error
    }`,
  )
} else {
  const indiaShortlistCanonical = firstMatch(
    indiaShortlistProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    indiaShortlistProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(indiaShortlistCanonical) !== canonicalKey(
    `${PRODUCTION_ORIGIN}/best-prop-firms-in-india/challenge-comparison`,
  )) {
    errors.push(
      '/best-prop-firms-in-india/challenge-comparison?shortlist=…: '
      + 'canonical includes shortlist state',
    )
  }
  if (!indiaShortlistProbe.html.includes('India due-diligence shortlist')) {
    errors.push(
      '/best-prop-firms-in-india/challenge-comparison: missing the India shortlist panel',
    )
  }
  if (!indiaShortlistProbe.html.includes('aria-label="Add')) {
    errors.push(
      '/best-prop-firms-in-india/challenge-comparison: missing shortlist selection controls',
    )
  }
  if (
    !indiaShortlistProbe.html.includes(
      'FundingPips separates the current Standard path from legacy 10% resets',
    )
    || !indiaShortlistProbe.html.includes('product-change-signal')
  ) {
    errors.push(
      '/best-prop-firms-in-india/challenge-comparison: '
      + 'missing product-level challenge change signals',
    )
  }
  for (const matchup of Object.values(INDIA_MATCHUPS)) {
    const href = indiaMatchupPath(matchup)
    if (!indiaShortlistProbe.html.includes(`data-india-matchup-link="${href}"`)) {
      errors.push(
        '/best-prop-firms-in-india/challenge-comparison: '
        + `missing curated matchup link ${href}`,
      )
    }
  }
}

const globalChangePath = '/prop-firm-challenge-changes'
const globalChangeProbe = await fetchPage(new URL(globalChangePath, BASE))
if (globalChangeProbe.status !== 200) {
  errors.push(
    `${globalChangePath}: HTTP ${globalChangeProbe.status || globalChangeProbe.error}`,
  )
} else {
  const canonical = firstMatch(
    globalChangeProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    globalChangeProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${globalChangePath}`)) {
    errors.push(`${globalChangePath}: incorrect canonical`)
  }
  const globalChangeText = textContent(globalChangeProbe.html)
  for (const required of [
    '14 dated updates',
    '8 firms affected',
    '3 verified changes',
    '11 open watches',
    'Showing 14 of 14 dated updates.',
    'Alpha One prices do not identify the rule variant',
    'Alpha Capital disagrees on Alpha One payout schedules',
    'E8 Pro pages disagree on prices and configurable terms',
    'E8 One pages disagree on the default target and drawdown',
  ]) {
    if (!globalChangeText.includes(required)) {
      errors.push(`${globalChangePath}: missing ${required}`)
    }
  }
  if (globalChangeProbe.html.includes('/go/')) {
    errors.push(`${globalChangePath}: rendered an affiliate action`)
  }
}

const indiaChangePath = '/best-prop-firms-in-india/challenge-changes'
const indiaChangeProbe = await fetchPage(new URL(indiaChangePath, BASE))
if (indiaChangeProbe.status !== 200) {
  errors.push(
    `${indiaChangePath}: HTTP ${indiaChangeProbe.status || indiaChangeProbe.error}`,
  )
} else {
  const canonical = firstMatch(
    indiaChangeProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    indiaChangeProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${indiaChangePath}`)) {
    errors.push(`${indiaChangePath}: incorrect canonical`)
  }
  const indiaChangeText = textContent(indiaChangeProbe.html)
  for (const required of [
    '12 India-screened updates',
    '6 eligible firms affected',
    '16 products',
    '10 open watches',
    'Showing 12 of 12 dated updates.',
    'Tradeify list prices and homepage promotions can diverge',
    'FundingPips separates the current Standard path from legacy 10% resets',
    "Alpha Capital's own pages disagree on a 25K Pro price",
    'Alpha One prices do not identify the rule variant',
    'Alpha Capital disagrees on Alpha One payout schedules',
    'E8 One pages disagree on the default target and drawdown',
    'Affected products',
    'Affiliate status contributes 0 points',
  ]) {
    if (!indiaChangeText.includes(required)) {
      errors.push(`${indiaChangePath}: missing ${required}`)
    }
  }
  for (const required of [
    'shortlist=tradeify%3Agrowth-evaluation',
  ]) {
    if (!indiaChangeProbe.html.includes(required)) {
      errors.push(`${indiaChangePath}: missing ${required}`)
    }
  }
  if (indiaChangeProbe.html.includes('/go/')) {
    errors.push(`${indiaChangePath}: rendered an affiliate action`)
  }

  const socialPath = `${indiaChangePath}/opengraph-image.png`
  const socialProbe = await fetchPage(new URL(socialPath, BASE))
  if (
    socialProbe.status !== 200
    || !socialProbe.contentType.includes('image/png')
  ) {
    errors.push(`${socialPath}: missing social card`)
  }
}

const indiaMatchupHubPath = '/best-prop-firms-in-india/compare'
const indiaMatchupHubProbe = await fetchPage(new URL(indiaMatchupHubPath, BASE))
if (indiaMatchupHubProbe.status !== 200) {
  errors.push(
    `${indiaMatchupHubPath}: HTTP ${
      indiaMatchupHubProbe.status || indiaMatchupHubProbe.error
    }`,
  )
} else {
  const canonical = firstMatch(
    indiaMatchupHubProbe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    indiaMatchupHubProbe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (
    canonicalKey(canonical)
    !== canonicalKey(`${PRODUCTION_ORIGIN}${indiaMatchupHubPath}`)
  ) {
    errors.push(`${indiaMatchupHubPath}: incorrect canonical`)
  }
  for (const required of [
    'Curated India matchup library',
    '3 curated matchups',
    '/best-prop-firms-in-india/fundingpips-vs-bright-funded',
    '/best-prop-firms-in-india/fundingpips-vs-fxify',
    '/best-prop-firms-in-india/bright-funded-vs-fxify',
  ]) {
    if (!indiaMatchupHubProbe.html.includes(required)) {
      errors.push(`${indiaMatchupHubPath}: missing ${required}`)
    }
  }
  if (indiaMatchupHubProbe.html.includes('/go/')) {
    errors.push(`${indiaMatchupHubPath}: rendered an affiliate action`)
  }
}

for (const matchup of [
  {
    slug: 'fundingpips-vs-bright-funded',
    title: 'FundingPips vs Bright Funded',
    products: 8,
    campaign: 'fundingpips-bright-funded',
    partners: ['fundingpips', 'bright-funded'],
    nonPartners: [],
  },
  {
    slug: 'fundingpips-vs-fxify',
    title: 'FundingPips vs FXIFY',
    products: 13,
    campaign: 'fundingpips-fxify',
    partners: ['fundingpips'],
    nonPartners: ['fxify'],
  },
  {
    slug: 'bright-funded-vs-fxify',
    title: 'Bright Funded vs FXIFY',
    products: 11,
    campaign: 'bright-funded-fxify',
    partners: ['bright-funded'],
    nonPartners: ['fxify'],
  },
]) {
  const path = `/best-prop-firms-in-india/${matchup.slug}`
  const probe = await fetchPage(new URL(path, BASE))
  if (probe.status !== 200) {
    errors.push(`${path}: HTTP ${probe.status || probe.error}`)
    continue
  }
  const canonical = firstMatch(
    probe.html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ) || firstMatch(
    probe.html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  )
  if (canonicalKey(canonical) !== canonicalKey(`${PRODUCTION_ORIGIN}${path}`)) {
    errors.push(`${path}: incorrect canonical`)
  }
  for (const required of [
    matchup.title,
    'The short answer: choose by constraint',
    'India evidence, side by side',
    `Compare all ${matchup.products} eligible products`,
  ]) {
    if (!probe.html.includes(required)) {
      errors.push(`${path}: missing ${required}`)
    }
  }
  for (const partner of matchup.partners) {
    if (
      !probe.html.includes(
        `/go/${partner}?from=india-matchup-${matchup.campaign}`,
      )
      || !probe.html.includes('rel="sponsored nofollow noopener"')
    ) {
      errors.push(`${path}: missing approved ${partner} partner route`)
    }
  }
  for (const nonPartner of matchup.nonPartners) {
    if (
      !probe.html.includes('View official terms')
      || !probe.html.includes('rel="nofollow noopener"')
      || probe.html.includes(
        `/go/${nonPartner}?from=india-matchup-${matchup.campaign}`,
      )
    ) {
      errors.push(`${path}: non-partner ${nonPartner} action is not source-safe`)
    }
  }
  if (
    probe.html.includes(
      'https://app.fundingpips.com/register?referral_code=1d94705c',
    )
    || probe.html.includes('https://brightfunded.com/a/nIfOFrQBTUK-00O1dIjiSQ')
  ) {
    errors.push(`${path}: rendered a bare affiliate destination`)
  }
}

const russianAffiliateRedirect = await fetchPage(new URL(
  '/go/fundednext?from=ru-fundednext-review-verdict',
  BASE,
), 'manual')
let russianAffiliateDestination = null
try {
  russianAffiliateDestination = new URL(russianAffiliateRedirect.location, BASE)
} catch {
  // The assertions below report the missing or malformed Location header.
}
if (
  russianAffiliateRedirect.status !== 302
  || !russianAffiliateDestination
  || russianAffiliateDestination.origin === BASE.origin
  || russianAffiliateDestination.searchParams.get('utm_source') !== 'tradersfundhub'
  || russianAffiliateDestination.searchParams.get('utm_medium') !== 'affiliate'
  || russianAffiliateDestination.searchParams.get('utm_campaign')
    !== 'ru-fundednext-review-verdict'
) {
  errors.push('/go/fundednext?from=ru-fundednext-review-verdict: Russian affiliate attribution failed')
}

const namedAffiliateIndiaRedirect = await fetchPage(new URL(
  '/go/fundednext?from=best-prop-firms-in-india',
  BASE,
), 'manual')
let namedAffiliateIndiaDestination = null
try {
  namedAffiliateIndiaDestination = new URL(namedAffiliateIndiaRedirect.location, BASE)
} catch {
  // The assertions below report the missing or malformed Location header.
}
if (
  outboundRelationships.fundednext !== 'affiliate'
  || namedAffiliateIndiaRedirect.status !== 302
  || !namedAffiliateIndiaDestination
  || namedAffiliateIndiaDestination.pathname
    !== '/blog/are-prop-firms-legal-in-india'
  || namedAffiliateIndiaDestination.searchParams.size !== 1
  || namedAffiliateIndiaDestination.searchParams.get('firm') !== 'fundednext'
) {
  errors.push(
    '/go/fundednext?from=best-prop-firms-in-india: RBI named affiliate redirect guard failed',
  )
}

const screenedIndiaRedirect = await fetchPage(new URL(
  '/go/fundingpips?from=india-matchup-fundingpips-fxify',
  BASE,
), 'manual')
let screenedIndiaDestination = null
try {
  screenedIndiaDestination = new URL(screenedIndiaRedirect.location, BASE)
} catch {
  // The assertions below report the missing or malformed Location header.
}
if (
  screenedIndiaRedirect.status !== 302
  || !screenedIndiaDestination
  || screenedIndiaDestination.origin === BASE.origin
  || screenedIndiaDestination.searchParams.get('utm_campaign')
    !== 'india-matchup-fundingpips-fxify'
) {
  errors.push(
    '/go/fundingpips?from=india-matchup-…: screened India redirect failed',
  )
}

const officialRedirect = await fetchPage(new URL(
  '/go/ftmo?from=release-official-check',
  BASE,
), 'manual')
let officialDestination = null
try {
  officialDestination = new URL(officialRedirect.location, BASE)
} catch {
  // The assertions below report the missing or malformed Location header.
}
if (
  officialRedirect.status !== 302
  || !officialDestination
  || officialDestination.origin === BASE.origin
  || officialDestination.searchParams.has('utm_source')
  || officialDestination.searchParams.has('utm_medium')
  || officialDestination.searchParams.has('utm_campaign')
) {
  errors.push('/go/ftmo?from=release-official-check: official redirect attribution failed')
}

console.log(`Release crawl — ${BASE.origin}`)
console.log(`${uniqueSitemapUrls.length} sitemap URLs, ${internalTargets.size} internal targets`)
console.log(`${jsonLdCount} JSON-LD blocks, ${imageCount} images`)
console.log(
  `${errors.length} error(s), ${advisories.length} length advisory item(s)` +
  (STRICT_LENGTHS ? ' (strict lengths)' : ''),
)

if (errors.length) {
  for (const error of errors) console.error(`  ✗ ${error}`)
}
if (advisories.length) {
  const titleAdvisories = advisories.filter(item => item.includes('title is')).length
  const descriptionAdvisories = advisories.length - titleAdvisories
  console.log(`  · ${titleAdvisories} long-title advisories`)
  console.log(`  · ${descriptionAdvisories} description-length advisories`)
  if (VERBOSE) {
    for (const advisory of advisories) console.log(`  · ${advisory}`)
  }
}

process.exit(errors.length ? 1 : 0)
