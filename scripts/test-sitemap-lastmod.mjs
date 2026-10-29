#!/usr/bin/env node
/**
 * Sitemap lastmod guard (app/sitemap.ts + lib/sitemapLastmod.ts + content/data/sitemap-lastmod.json).
 *
 *   node scripts/test-sitemap-lastmod.mjs [baseUrl]   (baseUrl: also compare the served /sitemap.xml)
 *   node scripts/test-sitemap-lastmod.mjs --update-urls   re-pin scripts/fixtures/sitemap-urls.json
 *
 * 1. The manifest is up to date with the content it dates (hash check only, no git needed), and
 *    lib/ruRouteLastmod.generated.ts (RU dateModified/visible date) matches the sitemap.
 * 2. Every lastmod is an ISO date, not in the future, not before the page's published date, and
 *    equals one of that URL's own editorial or source-change dates (traceable, never the clock).
 * 3. Clustering. The bug this replaces put 124/302 URLs (41%) on 2026-10-20, an older date than the
 *    newest change, because one shared capture date was stamped on whole page classes.
 *    - No date other than the sitemap's newest date may cover more than 25% of URLs. A release
 *      can only be the newest date once; when the next one lands, honest pages split by what each
 *      release touched, and a class still pinned to one older date means a shared default again.
 *    - The newest date may cover at most 60%: a real daily bundle legitimately touches many pages
 *      (805b715 changed 4 compare firms, RU copy on 33 pages and every all-firm hub: 48%), but a
 *      share near 100% means a global date (build time, max-of-everything) leaked back in.
 *    - No single source key may be the only reason for more than 25% of URLs' lastmod.
 * 4. URL set (302 at 805b715) and hreflang alternates match scripts/fixtures/sitemap-urls.json.
 */
import fs from 'node:fs'
import { checkManifest } from './gen-sitemap-lastmod.mjs'
import { requireTs, sitemapEntries } from './sitemap-entries.mjs'
import { RU_ROUTES_PATH, ruRoutesModule } from './sitemap-lastmod-sources.mjs'

const FIXTURE = 'scripts/fixtures/sitemap-urls.json'
const OLDER_DATE_MAX_SHARE = 0.25
const NEWEST_DATE_MAX_SHARE = 0.6
const SINGLE_SOURCE_MAX_SHARE = 0.25

const failures = []
const fail = message => failures.push(message)
const entries = sitemapEntries()

if (process.argv.includes('--update-urls')) {
  const urls = entries.map(e => ({ url: e.url, languages: e.languages })).sort((a, b) => (a.url < b.url ? -1 : 1))
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'))
  fs.writeFileSync(FIXTURE, `${JSON.stringify({ ...fixture, urls }, null, 1)}\n`)
  console.log(`pinned ${urls.length} URLs`)
  process.exit(0)
}

// 1. manifest freshness
const stale = checkManifest()
if (stale.length) fail(`manifest out of date (${stale.length}): ${stale.slice(0, 8).join(', ')}; run node scripts/gen-sitemap-lastmod.mjs after committing`)

// Russian route dates read by pages (dateModified, visible "Обновлено") match the sitemap rule.
const ruExpected = requireTs('lib/russianRouteLastmod.ts').expectedRussianRouteLastmods()
const ruWritten = ruExpected
if (fs.readFileSync(RU_ROUTES_PATH, 'utf8') !== ruRoutesModule(ruExpected)) fail(`${RU_ROUTES_PATH} is out of date; run node scripts/gen-sitemap-lastmod.mjs`)
for (const entry of entries) {
  const pathname = new URL(entry.url).pathname
  if (ruWritten[pathname] && ruWritten[pathname] !== entry.lastModified.slice(0, 10)) {
    fail(`${pathname}: sitemap ${entry.lastModified.slice(0, 10)} differs from page date ${ruWritten[pathname]}`)
  }
}

// 2. per-URL date rules
const today = new Date().toISOString().slice(0, 10)
const manifestFile = JSON.parse(fs.readFileSync('content/data/sitemap-lastmod.json', 'utf8'))
const manifest = manifestFile.sources
const urlEntries = manifestFile.urls ?? {}
const ISO = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/
const posts = new Map(fs.readdirSync('content/posts').filter(f => f.endsWith('.md') && !f.startsWith('_')).map(f => {
  const m = /^date:\s*"?(\d{4}-\d{2}-\d{2})/m.exec(fs.readFileSync(`content/posts/${f}`, 'utf8'))
  return [`/blog/${f.slice(0, -3)}`, m?.[1]]
}))
const winners = new Map()
for (const entry of entries) {
  const { url, lastModified, published } = entry
  const day = lastModified.slice(0, 10)
  if (!ISO.test(lastModified)) fail(`${url}: lastmod ${lastModified} is not an ISO date`)
  if (day > today) fail(`${url}: lastmod ${day} is in the future`)
  if (!published) { fail(`${url}: no provenance`); continue }
  if (day < published) fail(`${url}: lastmod ${day} before published ${published}`)
  const postDate = posts.get(new URL(url).pathname)
  if (postDate && day < postDate) fail(`${url}: lastmod ${day} before frontmatter date ${postDate}`)
  const pathName = new URL(url).pathname.replace(/\/$/, '') || '/'
  const candidates = [
    ['published', published],
    ...entry.editorial.map(d => ['editorial', d]),
    ...entry.sources.map(key => [key, manifest[key]?.changed]),
    ['url-state', urlEntries[pathName]?.lastmod],
  ]
  const reasons = candidates.filter(([, d]) => d === day).map(([key]) => key)
  if (!reasons.length) fail(`${url}: lastmod ${day} is not one of its own source dates`)
  if (reasons.length === 1 && reasons[0] !== 'published' && reasons[0] !== 'editorial') {
    winners.set(reasons[0], (winners.get(reasons[0]) ?? 0) + 1)
  }
}

// 3. clustering
const byDate = new Map()
for (const e of entries) byDate.set(e.lastModified.slice(0, 10), (byDate.get(e.lastModified.slice(0, 10)) ?? 0) + 1)
const newestDate = [...byDate.keys()].sort().at(-1)
for (const [date, count] of byDate) {
  const share = count / entries.length
  const max = date === newestDate ? NEWEST_DATE_MAX_SHARE : OLDER_DATE_MAX_SHARE
  if (share > max) fail(`${count}/${entries.length} URLs (${(share * 100).toFixed(1)}%) share lastmod ${date}; max ${max * 100}%${date === newestDate ? ' for the newest date' : ' for an older date'}`)
}
for (const [key, count] of winners) {
  if (count / entries.length > SINGLE_SOURCE_MAX_SHARE) fail(`${key} alone dates ${count}/${entries.length} URLs`)
}

// 4. URL set and hreflang
const pinned = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).urls
const current = new Map(entries.map(e => [e.url, JSON.stringify(e.languages)]))
if (entries.length !== pinned.length) fail(`URL count ${entries.length}, pinned ${pinned.length}`)
for (const { url, languages } of pinned) {
  if (!current.has(url)) fail(`missing URL ${url}`)
  else if (current.get(url) !== JSON.stringify(languages)) fail(`hreflang changed for ${url}`)
}
const pinnedUrls = new Set(pinned.map(p => p.url))
for (const url of current.keys()) if (!pinnedUrls.has(url)) fail(`unpinned URL ${url} (re-pin with --update-urls if intended)`)

// optional: the served sitemap matches
const base = process.argv.slice(2).find(arg => /^https?:\/\//.test(arg))
if (base) {
  const xml = await (await fetch(`${base.replace(/\/$/, '')}/sitemap.xml`)).text()
  const served = new Map([...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => [
    /<loc>([^<]+)<\/loc>/.exec(block)?.[1], /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1]?.slice(0, 10),
  ]))
  if (served.size !== entries.length) fail(`served sitemap has ${served.size} URLs, expected ${entries.length}`)
  for (const e of entries) {
    if (served.get(e.url) !== e.lastModified.slice(0, 10)) fail(`served lastmod for ${e.url} is ${served.get(e.url)}, expected ${e.lastModified.slice(0, 10)}`)
  }
}

const top = [...byDate].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, n]) => `${d}:${n}`).join(' ')
if (failures.length) {
  console.error(`FAIL sitemap lastmod (${failures.length})\n  ${failures.slice(0, 30).join('\n  ')}`)
  process.exit(1)
}
console.log(`PASS sitemap lastmod: ${entries.length} URLs, ${byDate.size} distinct dates, top ${top}${base ? ', served sitemap matches' : ''}`)
