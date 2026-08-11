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
import { buildOutboundRelationships } from '../lib/outboundDestinations.ts'

const args = process.argv.slice(2)
const baseArg = args.find(value => !value.startsWith('--'))
const VERBOSE = args.includes('--verbose')
const STRICT_LENGTHS = args.includes('--strict-lengths')
const BASE = new URL(baseArg || 'http://127.0.0.1:3214')
const PRODUCTION_ORIGIN = 'https://tradersfundhub.com'
const CONCURRENCY = 12
const REQUEST_TIMEOUT_MS = 15_000
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const outboundRelationships = buildOutboundRelationships(JSON.parse(
  readFileSync(join(PROJECT_ROOT, 'content/data/firms.json'), 'utf8'),
))

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
