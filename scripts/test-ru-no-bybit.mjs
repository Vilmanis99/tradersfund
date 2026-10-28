/**
 * Team rule: RU pages never name Bybit (case-insensitive, anywhere in the HTML,
 * including the RSC payload). Crawls every /ru/ URL in the sitemap plus every RU
 * rules twin (those are noindex and not in the sitemap) and fails on any hit.
 * KNOWN_OUT_OF_SCOPE lists RU pages owned by other writers that still name it:
 * hits there are printed as warnings. Empty since RU Writer's 04cced5 (obzor-eratrade).
 * Usage: next start -p 3472 & node scripts/test-ru-no-bybit.mjs http://127.0.0.1:3472
 */
import { getRulesPageModels } from '../lib/rulesPages.ts'

const base = (process.argv.slice(2).find(arg => arg.startsWith('http')) ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const KNOWN_OUT_OF_SCOPE = new Set()
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
const paths = new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/ru(?:\/[^<]*)?)<\/loc>/g)].map(m => m[1].replace(/\/$/, '') || '/ru'))
paths.add('/ru')
for (const model of getRulesPageModels()) if (model.ru?.template) paths.add(model.ru.path)
for (const path of KNOWN_OUT_OF_SCOPE) paths.add(path)
const failures = []
const warnings = []
for (const path of [...paths].sort()) {
  const response = await fetch(`${base}${path}`)
  if (response.status !== 200) { failures.push(`${path}: HTTP ${response.status}`); continue }
  const html = await response.text()
  const hits = [...html.matchAll(/.{0,50}bybit.{0,30}/gi)].map(m => m[0].replace(/\s+/g, ' '))
  if (KNOWN_OUT_OF_SCOPE.has(path)) {
    if (hits.length) warnings.push(`${path}: ${hits.length} hit(s), out of scope, reported (e.g. "${hits[0]}")`)
    else warnings.push(`${path}: no longer names Bybit (fixed by 04cced5 on the bb7f4f1 stack); drop it from KNOWN_OUT_OF_SCOPE`)
  } else if (hits.length) {
    failures.push(`${path}: names Bybit ${hits.length}x, e.g. "${hits[0]}"`)
  }
}
for (const warning of warnings) console.warn(`WARN ${warning}`)
if (failures.length) {
  console.error(`test:ru-no-bybit FAILED (${failures.length})\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`test:ru-no-bybit OK: ${paths.size - KNOWN_OUT_OF_SCOPE.size} RU pages without Bybit; ${warnings.length} known out-of-scope page(s) reported`)
