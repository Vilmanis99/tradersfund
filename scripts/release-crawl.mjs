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

function firstMatch(html, expression) {
  return html.match(expression)?.[1]?.trim() || ''
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
    const slug = outboundSlug(reviewedFirm.name)
    if (!page.html.includes(`/go/${slug}?from=review-cta`)) {
      errors.push(`${path}: review CTA does not open the configured firm destination`)
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

const swingLandingPath = '/best-swing-trading-prop-firms'
const expectedSwingFirms = firmRecords.flatMap(firm => {
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge)
    && challenge.rules.overnight === true
    && challenge.rules.weekend === true,
  )
  return products.length ? [{ firm, products }] : []
})
const swingLandingProbe = await fetchPage(new URL(swingLandingPath, BASE))
if (swingLandingProbe.status !== 200) {
  errors.push(
    `${swingLandingPath}: HTTP ${swingLandingProbe.status || swingLandingProbe.error}`,
  )
} else {
  const swingText = textContent(swingLandingProbe.html)
  const cardCount = (swingLandingProbe.html.match(/<li class="leader-row/g) ?? []).length
  const evidenceDateCount = (swingText.match(/checked 2026-/g) ?? []).length
  if (cardCount !== expectedSwingFirms.length) {
    errors.push(
      `${swingLandingPath}: rendered ${cardCount} firms, expected ${expectedSwingFirms.length}`,
    )
  }
  if (evidenceDateCount !== expectedSwingFirms.length) {
    errors.push(
      `${swingLandingPath}: rendered ${evidenceDateCount} dated card sources, expected ${expectedSwingFirms.length}`,
    )
  }
  for (const { firm } of expectedSwingFirms) {
    if (!swingText.includes(firm.name)) {
      errors.push(`${swingLandingPath}: missing qualifying firm ${firm.name}`)
    }
  }
  for (const required of [
    'What swing traders should verify',
    'Do both permissions belong to the same product?',
    'Is weekday overnight the same as weekend holding?',
    'What happens to the loss floor after open profit?',
    'Which carrying costs remain?',
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
}

const futuresLandingPath = '/best-futures-prop-firms'
const expectedFuturesFirms = firmRecords.flatMap(firm => {
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge) && challenge.assetClass === 'futures',
  )
  return products.length ? [{ firm, products }] : []
})
const futuresLandingProbe = await fetchPage(new URL(futuresLandingPath, BASE))
if (futuresLandingProbe.status !== 200) {
  errors.push(
    `${futuresLandingPath}: HTTP ${futuresLandingProbe.status || futuresLandingProbe.error}`,
  )
} else {
  const futuresText = textContent(futuresLandingProbe.html)
  const cardCount = (futuresLandingProbe.html.match(/<li class="leader-row/g) ?? []).length
  const evidenceDateCount = (futuresText.match(/checked 2026-/g) ?? []).length
  if (cardCount !== expectedFuturesFirms.length) {
    errors.push(
      `${futuresLandingPath}: rendered ${cardCount} firms, expected ${expectedFuturesFirms.length}`,
    )
  }
  if (evidenceDateCount !== expectedFuturesFirms.length) {
    errors.push(
      `${futuresLandingPath}: rendered ${evidenceDateCount} dated card sources, expected ${expectedFuturesFirms.length}`,
    )
  }
  for (const { firm } of expectedFuturesFirms) {
    if (!futuresText.includes(firm.name)) {
      errors.push(`${futuresLandingPath}: missing qualifying firm ${firm.name}`)
    }
  }
  for (const required of [
    'Best Futures Prop Firms (2026) — By Product | TFH',
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

const instantLandingPath = '/best-instant-funding-prop-firms'
const expectedInstantFirms = firmRecords.flatMap(firm => {
  const products = getChallengesByFirm(outboundSlug(firm.name)).filter(challenge =>
    isChallengeFresh(challenge) && challenge.phases === 0,
  )
  return products.length ? [{ firm, products }] : []
})
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
  const evidenceDateCount = (instantText.match(/checked 2026-/g) ?? []).length
  if (cards.length !== expectedInstantFirms.length) {
    errors.push(
      `${instantLandingPath}: rendered ${cards.length} firms, expected ${expectedInstantFirms.length}`,
    )
  }
  if (evidenceDateCount !== expectedInstantFirms.length) {
    errors.push(
      `${instantLandingPath}: rendered ${evidenceDateCount} dated card sources, expected ${expectedInstantFirms.length}`,
    )
  }
  let renderedProductCount = 0
  for (const { firm, products } of expectedInstantFirms) {
    const card = cards.find(candidate => candidate.text.includes(firm.name))
    const countLabel = `${products.length} current phase-0 ${products.length === 1 ? 'product' : 'products'}`
    if (!card) {
      errors.push(`${instantLandingPath}: missing qualifying firm ${firm.name}`)
      continue
    }
    if (!card.text.includes(countLabel)) {
      errors.push(`${instantLandingPath}: ${firm.name} card is missing ${countLabel}`)
    } else {
      renderedProductCount += products.length
    }
  }
  if (renderedProductCount !== expectedInstantProductCount) {
    errors.push(
      `${instantLandingPath}: represented ${renderedProductCount} products, expected ${expectedInstantProductCount}`,
    )
  }
  for (const required of [
    'Best Instant Funding Prop Firms (2026) — Compared | TFH',
    'What instant-funding buyers should verify',
    'Does phase 0 mean the account trades live capital?',
    'How does the maximum-loss line move?',
    'How much loss room repays the one-time fee?',
    'What unlocks the first payout?',
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
    'City Traders Imperium Review 2026: Fees & Rules',
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
