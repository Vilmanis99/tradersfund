/**
 * Sitemap + orphan audit against a running build.
 *
 *   npm run build && npx next start -p 3214 &
 *   node scripts/audit-sitemap.mjs http://127.0.0.1:3214 [--json out.json]
 *
 * Checks:
 *  1. every sitemap URL answers 200 directly (no 3xx, no 4xx/5xx), is indexable (no noindex) and self-canonical;
 *  2. every indexable prerendered HTML route (from .next/prerender-manifest.json) is in the sitemap;
 *  3. no orphans: every sitemap URL has at least one internal inbound link from another sitemap page.
 * Exit code 1 when any check fails.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const base = (args.find(a => /^https?:/.test(a)) ?? 'http://127.0.0.1:3214').replace(/\/$/, '')
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null
const PROD = 'https://tradersfundhub.com'

const norm = path => (path.replace(/[?#].*$/, '').replace(/\/$/, '') || '/')

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
      const body = res.status === 200 ? await res.text() : ''
      return { status: res.status, location: res.headers.get('location'), body, robots: res.headers.get('x-robots-tag') ?? '' }
    } catch (error) {
      if (attempt === 2) return { status: 0, error: String(error), body: '' }
    }
  }
}

async function pool(items, size, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n]) }
  }))
  return out
}

const sitemapXml = (await get(`${base}/sitemap.xml`)).body
const sitemapPaths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => norm(new URL(m[1]).pathname))
const sitemapSet = new Set(sitemapPaths)
const errors = { notOk: [], noindexInSitemap: [], canonicalMismatch: [], missingFromSitemap: [], orphans: [] }

const inbound = new Map(sitemapPaths.map(p => [p, new Set()]))
const pages = await pool(sitemapPaths, 8, async path => ({ path, ...(await get(base + path)) }))
for (const page of pages) {
  if (page.status !== 200) { errors.notOk.push(`${page.path} → ${page.status}${page.location ? ` ${page.location}` : ''}`); continue }
  const robotsMeta = page.body.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? ''
  if (/noindex/i.test(robotsMeta + page.robots)) errors.noindexInSitemap.push(page.path)
  const canonical = page.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  if (canonical && norm(new URL(canonical, PROD).pathname) !== page.path) errors.canonicalMismatch.push(`${page.path} → ${canonical}`)
  for (const m of page.body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    let href = m[1].replace(/&amp;/g, '&')
    if (/^https?:\/\/(www\.)?tradersfundhub\.com/.test(href)) href = new URL(href).pathname
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/go/')) continue
    const target = norm(href)
    if (target !== page.path && inbound.has(target)) inbound.get(target).add(page.path)
  }
}
for (const [path, from] of inbound) if (from.size === 0 && path !== '/') errors.orphans.push(path)

// Indexable prerendered routes missing from the sitemap.
const manifest = JSON.parse(readFileSync(new URL('../.next/prerender-manifest.json', import.meta.url), 'utf8'))
const candidates = Object.keys(manifest.routes)
  .filter(route => !/\.(png|jpg|xml|txt|ico|webmanifest|json)$|^\/_|opengraph-image|twitter-image|^\/api\//.test(route))
  .filter(route => !sitemapSet.has(norm(route)))
const extra = await pool(candidates, 8, async route => ({ route, ...(await get(base + route)) }))
for (const page of extra) {
  if (page.status !== 200) continue
  const robotsMeta = page.body.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? ''
  const canonical = page.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  const selfCanonical = !canonical || norm(new URL(canonical, PROD).pathname) === norm(page.route)
  if (!/noindex/i.test(robotsMeta + page.robots) && selfCanonical) errors.missingFromSitemap.push(page.route)
}

const summary = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v.length]))
console.log(`Sitemap URLs: ${sitemapPaths.length}`, summary)
for (const [k, v] of Object.entries(errors)) for (const item of v) console.log(`  ✗ ${k}: ${item}`)
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base, sitemapUrls: sitemapPaths.length, errors, inbound: Object.fromEntries([...inbound].map(([k, v]) => [k, v.size])) }, null, 2))
process.exit(Object.values(errors).some(v => v.length) ? 1 : 0)
