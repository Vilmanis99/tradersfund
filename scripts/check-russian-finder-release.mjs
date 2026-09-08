import assert from 'node:assert/strict'
import { LOCALIZED_ROUTE_PAIRS, RUSSIAN_ONLY_ROUTES, RUSSIAN_ROUTE_EDITORIAL_DATES } from '../lib/localizedRoutes.ts'
import { getRussianFinderRows, getRussianReviewFinderHref, getRussianInstantFinderHref } from '../lib/challengeComparisonData.ts'
import { challengeKey, DEFAULT_FINDER_FILTERS, filterChallengeRows } from '../lib/challengeComparison.ts'
import { getAuthorBySlug } from '../lib/authors.ts'

const base = new URL(process.argv[2] || 'http://127.0.0.1:3214')
const production = 'https://tradersfundhub.com'
const paths = [...new Set([...LOCALIZED_ROUTE_PAIRS.map(pair => pair.ru), ...RUSSIAN_ONLY_ROUTES])]
const pages = new Map()
const sitemap = await fetch(new URL('/sitemap.xml', base)).then(response => response.text())
for (const pathname of paths) {
  const response = await fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 200, `${pathname}: HTTP status`)
  const html = await response.text()
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  assert.equal((body.match(/<h1\b/g) ?? []).length, 1, `${pathname}: exactly one H1`)
  assert(body.includes(`rel="canonical" href="${production}${pathname}"`), `${pathname}: self canonical`)
  assert(body.includes('lang="ru"'), `${pathname}: Russian language declaration`)
  assert.doesNotMatch(body, /Основатель Traders Fund Hub|funded-трейдер с 2020 года/iu, `${pathname}: no unsupported author credentials`)
  assert(sitemap.includes(`<loc>${production}${pathname}</loc>`), `${pathname}: in sitemap`)
  pages.set(pathname, body)
}
const ranking = pages.get('/ru/luchshie-prop-firmy')
const home = pages.get('/ru')
assert(home.includes('data-russian-home-finder="programme-entry"'))
assert(home.includes('/ru/luchshie-prop-firmy#size=50000'))
assert(ranking.includes('data-russian-challenge-finder="product-first"'))
assert(!ranking.includes('Коммерческий результат пока заблокирован.'))
assert(ranking.includes('data-russian-affiliate-disclosure="challenge-finder"'))
assert(ranking.includes('data-russian-country-boundary="finder-not-access"'))
assert.equal((ranking.match(/data-russian-ranking="single-directory"/g) ?? []).length, 1)
assert.equal((ranking.match(/data-russian-ranking-partners="single-section"/g) ?? []).length, 1)
assert(!ranking.includes('data-russian-ranking="top-five"') && !ranking.includes('data-russian-ranking-partner-matrix'))
for (const firm of ['fundednext', 'bright-funded', 'fundingpips', 'ftmo']) {
  const review = pages.get(`/ru/obzor-${firm}`)
  assert(review.includes('Автор: Edris Derakhshi'), `${firm}: established visible author`)
  assert(!review.includes('tara-mohseni'), `${firm}: no obsolete author`)
  assert(review.includes(getRussianReviewFinderHref(firm).replace(/&/g, '&amp;')), `${firm}: live review-to-finder handoff`)
}
const expected = filterChallengeRows(getRussianFinderRows(), DEFAULT_FINDER_FILTERS).map(challengeKey)
const actual = [...ranking.matchAll(/data-finder-product="([^"]+)"/g)].map(match => match[1])
assert.deepEqual(actual, expected, 'Server-rendered products match the same source-gated model as the UI')
const instantGuide = pages.get('/ru/fundednext-stellar-instant')
const instantText = instantGuide.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
assert(instantGuide.includes('Автор:') && instantGuide.includes('Edris Derakhshi'), 'Instant guide has a visible author')
assert(instantGuide.includes('data-russian-guide-source-status='), 'Instant guide exposes separate source age')
assert(instantText.includes('не более 3 раз на одном счёте'), 'Instant news-adjustment limit is visible')
assert(instantGuide.includes(getRussianInstantFinderHref().replace(/&/g, '&amp;')), 'published Instant comparison handoff')
assert.doesNotMatch(instantText, /\bcheckout\b|\bbuffer\b|\bgates?\b|захват[а-яё]*/iu, 'published Instant guide has no internal jargon')
for (const pathname of ['/ru', '/ru/luchshie-prop-firmy', '/ru/obzor-fundednext', '/ru/obzor-bright-funded', '/ru/obzor-fundingpips', '/ru/obzor-ftmo', '/ru/otzyvy-prop-firm', '/ru/luchshie-kripto-prop-firmy', '/ru/fundednext-stellar-instant']) {
  const block = sitemap.split('<url>').find(entry => entry.includes(`<loc>${production}${pathname}</loc>`))
  assert(block.includes(RUSSIAN_ROUTE_EDITORIAL_DATES[pathname]), `${pathname}: editorial lastmod`)
}
const edris = getAuthorBySlug('edris-derakhshi')
const authorResponse = await fetch(new URL(`/authors/${edris.slug}`, base))
assert.equal(authorResponse.status, 200, 'author profile responds')
const authorHtml = await authorResponse.text()
assert(authorHtml.includes('Selected work and biography sources'))
assert.doesNotMatch(authorHtml, /Founder &amp; Lead Editor|founded Traders Fund Hub|personally funded|verifies every payout/i)
for (const reference of edris.references) assert(authorHtml.includes(reference.url), 'published profile contains its biography evidence')
const person = [...authorHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1])).find(item => item['@type'] === 'Person')
assert.equal(person?.jobTitle, 'Author', 'published Person schema agrees with confirmed role')
const authorSitemap = sitemap.split('<url>').find(entry => entry.includes(`<loc>${production}/authors/${edris.slug}</loc>`))
assert(authorSitemap?.includes(edris.updatedAt), 'author lastmod follows the biography, not firm price captures')
const english = await fetch(new URL('/prop-firm-challenges', base)).then(response => response.text())
const imageUrl = english.match(/property="og:image" content="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&')
assert(imageUrl, 'English comparison social image metadata')
const imagePath = new URL(imageUrl, production)
const image = await fetch(new URL(imagePath.pathname + imagePath.search, base))
assert.equal(image.status, 200, 'Generated social image responds')
const bytes = Buffer.from(await image.arrayBuffer())
assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
assert.equal(bytes.readUInt32BE(16), 1200)
assert.equal(bytes.readUInt32BE(20), 630)
console.log(`Russian finder release checks passed: ${paths.length} Russian URLs, sitemap/canonicals/H1/language, ${actual.length} source-backed server-rendered results, partner disclosure, eligibility boundary, and 1200×630 social card.`)
