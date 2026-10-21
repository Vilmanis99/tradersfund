/**
 * Static checks for the RU related-links map (lib/ruRelatedLinks.ts).
 * No build needed. Run: npm run test:ru-related-links
 *
 * c) an `alternatives` entry may only hold a firm whose firms.json russiaStatus
 *    is `available`, never FundedNext; BrightFunded → CFT → Hash Hedge order.
 * d) ≤6 `related` entries per page, no duplicates or self-links.
 * Plus: keys/hrefs are registered or planned routes, every registered
 * /ru/obzor-* route has a firm entry, and the hub order follows russiaStatus.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RUSSIAN_ROUTE_EDITORIAL_DATES } from '../lib/localizedRoutes.ts'
import { firmSlug } from '../lib/firmSlug.ts'
import {
  RU_NOT_A_RUSSIA_OPTION,
  RU_RELATED,
  RU_RELATED_MAX,
  RU_REVIEW_FIRMS,
  RU_UPCOMING_ROUTES,
  ruAllReviews,
  ruPublishedLinks,
  ruReviewFirmFor,
  ruReviewRank,
} from '../lib/ruRelatedLinks.ts'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const firms = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf8'))
// Mirrors lib/russiaAvailability.ts (firms.json russiaStatus; The5ers known restricted; aliases).
const STATUS = Object.fromEntries(firms.map(firm => [firmSlug(firm.name), firm.russiaStatus ?? 'unverified']))
const EXTRA = { the5ers: 'restricted', 'the-5ers': 'restricted' }
const ALIASES = { 'funding-pips': 'fundingpips', brightfunded: 'bright-funded' }
const statusFor = slug => { const key = ALIASES[slug] ?? slug; return EXTRA[key] ?? STATUS[key] ?? 'unverified' }

const registered = new Set(Object.keys(RUSSIAN_ROUTE_EDITORIAL_DATES))
const upcoming = new Set(RU_UPCOMING_ROUTES)
const errors = []
const warnings = []
const fail = message => errors.push(message)

for (const [page, links] of Object.entries(RU_RELATED)) {
  if (!registered.has(page) && !upcoming.has(page)) fail(`${page}: map key is neither a registered nor a planned RU route`)
  const related = links.filter(link => link.slot === 'related')
  if (related.length > RU_RELATED_MAX) fail(`(d) ${page}: ${related.length} related entries (max ${RU_RELATED_MAX})`)
  const seen = new Set()
  for (const link of links) {
    const base = link.href.split('#')[0]
    if (!registered.has(base) && !upcoming.has(base)) fail(`${page}: ${link.href} is neither registered nor planned`)
    if (base === page) fail(`${page}: self-link ${link.href}`)
    const key = `${link.slot}:${base}`
    if (seen.has(key)) fail(`(d) ${page}: duplicate ${link.slot} href ${link.href}`)
    seen.add(key)
    if (!link.anchor.trim()) fail(`${page}: empty anchor for ${link.href}`)
  }
  // (c) alternatives
  const alternatives = links.filter(link => link.slot === 'alternatives')
  for (const link of alternatives) {
    const review = ruReviewFirmFor(link.href)
    if (!review) { fail(`(c) ${page}: alternatives entry ${link.href} is not a known RU review route`); continue }
    if (RU_NOT_A_RUSSIA_OPTION.has(review.firm)) { fail(`(c) ${page}: ${review.name} is never offered as a Russia option`); continue }
    const status = statusFor(review.firm)
    if (status !== 'available') {
      const message = `(c) ${page}: alternatives entry ${review.name} has russiaStatus "${status}"`
      if (registered.has(link.href)) fail(message)
      else warnings.push(`${message}; its review is not registered yet, so it does not render. It fails once registered unless firms.json says available.`)
    }
  }
  const order = ['bright-funded', 'crypto-fund-trader', 'hash-hedge']
  const firmsInOrder = alternatives.map(link => ruReviewFirmFor(link.href)?.firm).filter(firm => order.includes(firm))
  const sorted = [...firmsInOrder].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  if (firmsInOrder.join() !== sorted.join()) fail(`(c) ${page}: alternatives order must be BrightFunded → Crypto Fund Trader → Hash Hedge (got ${firmsInOrder.join(' → ')})`)

  if (registered.has(page)) {
    const live = ruPublishedLinks(page, 'related')
    if (live.length < 3) warnings.push(`${page}: only ${live.length} live related links (spec asks for 3–6)`)
  }
}

// Every registered review route needs a firm entry so the hubs can name and badge it.
for (const route of registered) {
  if (route.startsWith('/ru/obzor-') && !ruReviewFirmFor(route)) fail(`${route}: registered review route has no RU_REVIEW_FIRMS entry`)
}

// Hub order follows russiaStatus groups; FundedNext never ranks as an open option.
const hub = ruAllReviews(statusFor)
const reviewRoutes = [...registered].filter(route => route.startsWith('/ru/obzor-'))
assert.deepEqual(new Set(hub.map(item => item.path)), new Set(reviewRoutes), 'hub list must equal the registered /ru/obzor-* routes')
const ranks = hub.map(item => ruReviewRank(item, item.status))
assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), 'hub list must be sorted by russiaStatus group')
assert.equal(ruReviewRank({ firm: 'fundednext' }, 'available'), 2, 'FundedNext must not sort into the open group')
assert.equal(ruReviewRank({ firm: 'bright-funded' }, 'available'), 0)
assert.equal(ruReviewRank({ firm: 'bright-funded' }, 'restricted'), 2, 'a firm that loses access moves down automatically')
const bfIndex = hub.findIndex(item => item.firm === 'bright-funded')
if (statusFor('bright-funded') === 'available') assert.equal(bfIndex, 0, 'BrightFunded leads the hub list while available')
for (const item of RU_REVIEW_FIRMS) if (!item.local && !item.firm) fail(`${item.path}: missing firm slug`)

for (const warning of warnings) console.warn(`WARN ${warning}`)
if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`)
  console.error(`\n${errors.length} RU related-links error(s)`)
  process.exit(1)
}
console.log(`RU related links OK: ${Object.keys(RU_RELATED).length} pages mapped, hub order ${hub.map(item => item.name).join(' → ')}`)
