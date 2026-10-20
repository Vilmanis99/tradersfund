/**
 * Rendered-HTML audit of RU internal links (RU SEO Lead plan 20.10.2026, §5).
 * Needs a build. Run: npm run build && npm run audit:ru-links
 *   --url http://127.0.0.1:3000   read pages from a running server instead of .next
 *   --html-dir <dir>              read <slug>.html files (ru.html for /ru) from a folder
 *   --report                      print per-page inbound counts
 *   --json <file>                 write counts to a JSON file
 *
 * a) every registered RU route has ≥3 inbound links from other RU pages
 *    (page body, hub lists, related blocks, header and footer all count).
 * b) every /ru/obzor-* page links to every registered RU vs page naming its firm.
 * c) alternatives: the static rule runs in test-ru-related-links.mjs; here we
 *    warn on FundedNext sign-up CTAs outside FundedNext pages (plan §4.2).
 * d) a «Похожие материалы» block has ≤6 items and repeats no href that the
 *    page body already links.
 * Plus: /ru, promokody and otzyvy link every registered review; every /ru href
 * inside <main> is a registered route (no 404 links).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RU_CLOSED_FIRMS_PATH, RUSSIAN_ROUTE_EDITORIAL_DATES } from '../lib/localizedRoutes.ts'
import { RU_RELATED_MAX, ruReviewFirmFor } from '../lib/ruRelatedLinks.ts'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const baseUrl = opt('--url')
const htmlDir = opt('--html-dir')
const jsonOut = opt('--json')
const report = args.includes('--report')
const HUBS = ['/ru', '/ru/promokody-prop-firm', '/ru/otzyvy-prop-firm']
const MIN_INBOUND = 3

// /ru/zakrytye-prop-firmy is gated by content/data/closed-firms.json (lib/closedFirms.ts), not by
// RUSSIAN_ROUTE_EDITORIAL_DATES; while published it is a live route and gets the same checks.
const closedFirmsPublished = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/closed-firms.json'), 'utf8')).published === true
const routes = [...Object.keys(RUSSIAN_ROUTE_EDITORIAL_DATES), ...(closedFirmsPublished ? [RU_CLOSED_FIRMS_PATH] : [])].sort()
const registered = new Set(routes)

async function load(route) {
  const slug = route === '/ru' ? 'ru' : route.replace('/ru/', '')
  if (baseUrl) {
    const res = await fetch(new URL(route, baseUrl), { redirect: 'manual' })
    if (res.status !== 200) throw new Error(`${route}: HTTP ${res.status}`)
    return res.text()
  }
  const file = htmlDir
    ? path.join(htmlDir, `${slug}.html`)
    : path.join(ROOT, '.next/server/app', route === '/ru' ? 'ru.html' : `ru/${slug}.html`)
  if (!fs.existsSync(file)) throw new Error(`${route}: no rendered HTML at ${file} (run npm run build, or pass --url)`)
  return fs.readFileSync(file, 'utf8')
}

const hrefsIn = html => {
  const out = []
  for (const match of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const href = match[1].replace(/&amp;/g, '&')
    if (href === '/ru' || href.startsWith('/ru/') || href.startsWith('/ru#') || href.startsWith('/ru?')) out.push(href.split(/[?#]/)[0])
  }
  return out
}
const section = (html, re) => (html.match(re) ?? [])[0] ?? ''
function relatedBlock(main) {
  const start = main.search(/<section[^>]*data-ru-related-block=/)
  if (start < 0) return { block: '', rest: main }
  const end = main.indexOf('</section>', start) + '</section>'.length
  return { block: main.slice(start, end), rest: main.slice(0, start) + main.slice(end) }
}

const pages = new Map()
for (const route of routes) {
  const html = await load(route)
  const main = section(html, /<main\b[\s\S]*<\/main>/)
  const chrome = section(html, /<header\b[\s\S]*?<\/header>/) + section(html, /<footer\b[\s\S]*?<\/footer>/)
  const { block, rest } = relatedBlock(main)
  pages.set(route, {
    html,
    body: new Set(hrefsIn(rest)),
    related: hrefsIn(block),
    relatedItems: (block.match(/data-ru-slot="related"/g) ?? []).length,
    chrome: new Set(hrefsIn(chrome)),
    goFundedNext: (main.match(/href="\/go\/fundednext[^"]*"/g) ?? []).length,
  })
}

const errors = []
const warnings = []
const inbound = Object.fromEntries(routes.map(route => [route, { content: new Set(), all: new Set() }]))
for (const [from, page] of pages) {
  for (const href of [...page.body, ...page.related]) if (href !== from && inbound[href]) { inbound[href].content.add(from); inbound[href].all.add(from) }
  for (const href of page.chrome) if (href !== from && inbound[href]) inbound[href].all.add(from)
  // 404 guard
  for (const href of new Set([...page.body, ...page.related])) if (!registered.has(href)) errors.push(`${from}: links unregistered RU route ${href}`)
}

// a) inbound
for (const route of routes) if (inbound[route].all.size < MIN_INBOUND) errors.push(`(a) ${route}: ${inbound[route].all.size} inbound RU pages (min ${MIN_INBOUND})`)

// b) review → vs pages for its firm
const vsPages = routes.filter(route => route.includes('-vs-'))
for (const route of routes.filter(r => r.startsWith('/ru/obzor-'))) {
  const firm = ruReviewFirmFor(route)?.firm
  if (!firm) { errors.push(`(b) ${route}: unknown firm`); continue }
  const page = pages.get(route)
  const links = new Set([...page.body, ...page.related])
  for (const vs of vsPages) {
    const parts = vs.replace('/ru/', '').split('-vs-')
    if (parts.includes(firm) && !links.has(vs)) errors.push(`(b) ${route}: missing link to ${vs}`)
  }
}

// c) warnings only (static rule lives in test-ru-related-links.mjs)
for (const [route, page] of pages) {
  const reviewOrHub = route === '/ru' || route.startsWith('/ru/obzor-')
  if (page.goFundedNext && reviewOrHub && !route.includes('fundednext')) warnings.push(`(c) ${route}: ${page.goFundedNext} FundedNext sign-up link(s) on a non-FundedNext review/hub (plan §4.2: swap the FundedNext alternative card for Crypto Fund Trader once its review is live)`)
}

// d) related block
for (const [route, page] of pages) {
  if (page.relatedItems > RU_RELATED_MAX) errors.push(`(d) ${route}: ${page.relatedItems} related items (max ${RU_RELATED_MAX})`)
  for (const href of page.related) if (page.body.has(href)) errors.push(`(d) ${route}: related block repeats body link ${href}`)
  if (new Set(page.related).size !== page.related.length) errors.push(`(d) ${route}: duplicate href in related block`)
}

// hubs list every review
const reviews = routes.filter(route => route.startsWith('/ru/obzor-'))
const hubMissing = {}
for (const hub of HUBS) {
  const page = pages.get(hub)
  const missing = reviews.filter(review => !page.body.has(review))
  hubMissing[hub] = missing
  if (missing.length) errors.push(`(hub) ${hub}: missing ${missing.length} review link(s): ${missing.join(', ')}`)
}

const counts = Object.fromEntries(routes.map(route => [route, {
  inboundContent: inbound[route].content.size,
  inboundAll: inbound[route].all.size,
  outboundContent: new Set([...pages.get(route).body, ...pages.get(route).related].filter(h => h !== route)).size,
  related: pages.get(route).relatedItems,
}]))
if (report) {
  console.log('route\tinbound(body)\tinbound(+nav/footer)\toutbound(body)\trelated')
  for (const [route, c] of Object.entries(counts)) console.log(`${route}\t${c.inboundContent}\t${c.inboundAll}\t${c.outboundContent}\t${c.related}`)
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ counts, hubMissing }, null, 2))
for (const warning of warnings) console.warn(`WARN ${warning}`)
if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`)
  console.error(`\n${errors.length} RU link audit error(s)`)
  process.exit(1)
}
console.log(`RU link audit OK: ${routes.length} routes, checks a/b/d + hubs + 404 guard passed`)
