/**
 * Server check: every hand-written RU rules page registered in
 * lib/localizedRoutes.ts RU_RULES_HANDWRITTEN answers 200 directly (no
 * redirect), and no EN rules page points at a RU rules URL (hreflang
 * alternate or any link, e.g. the language switcher) that does not answer 200.
 * Added 26.10.2026 after /ru/fundingpips-pravila was mapped but 404ed.
 * Usage: next start -p 3472 & node scripts/test-ru-rules-routes.mjs http://127.0.0.1:3472
 */
import assert from 'node:assert/strict'
import { RU_RULES_HANDWRITTEN } from '../lib/localizedRoutes.ts'
import { getRulesPageModels } from '../lib/rulesPages.ts'

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? 'http://127.0.0.1:3000'
const SITE = 'https://tradersfundhub.com'
const statusCache = new Map()
async function status(path) {
  if (!statusCache.has(path)) statusCache.set(path, (await fetch(`${base}${path}`, { redirect: 'manual' })).status)
  return statusCache.get(path)
}

const entries = Object.entries(RU_RULES_HANDWRITTEN)
for (const [slug, path] of entries) {
  assert.match(path, /^\/ru\/[a-z0-9-]+$/, `${slug}: hand-written path must be a /ru/ path`)
  assert.equal(await status(path), 200, `RU_RULES_HANDWRITTEN.${slug} = ${path} must answer 200`)
}

let checked = 0
for (const model of getRulesPageModels()) {
  const response = await fetch(`${base}${model.en.path}`, { redirect: 'manual' })
  assert.equal(response.status, 200, `${model.en.path} should render`)
  const html = await response.text()
  const ruTargets = new Set([
    ...[...html.matchAll(/<link[^>]+hrefLang="ru"[^>]*href="([^"]+)"/gi)].map(match => match[1]),
    ...[...html.matchAll(/href="((?:https:\/\/tradersfundhub\.com)?\/ru\/[a-z0-9-]*pravila)"/g)].map(match => match[1]),
  ].map(href => href.replace(SITE, '')))
  for (const target of ruTargets) {
    assert.equal(await status(target), 200, `${model.en.path} points at ${target}, which answers ${await status(target)}`)
    checked++
  }
  if (!model.ru) assert.ok(![...ruTargets].length, `${model.en.path}: no RU twin, so no RU rules link expected`)
}
const fundingpips = getRulesPageModels().find(model => model.slug === 'fundingpips')
if (fundingpips && !Object.hasOwn(RU_RULES_HANDWRITTEN, 'fundingpips')) {
  assert.equal(fundingpips.ru, null, 'fundingpips: no RU rules page on this stack, so no RU pairing')
}
console.log(`PASS ru rules routes: ${entries.length} hand-written entr${entries.length === 1 ? 'y' : 'ies'} answer 200; ${checked} RU rules link(s) from EN rules pages answer 200`)
