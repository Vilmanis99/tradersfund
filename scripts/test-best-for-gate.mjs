/**
 * Best-for-X index gate (lib/bestFor.ts).
 *
 * A page indexes only when BOTH hold:
 *   1. writer verdict at content/verdicts/best-for/<id>[.ru].md
 *   2. ≥ BEST_FOR_MIN_DIFF_FIELDS comparison fields differ across ranked firms
 *
 * Run: npm run test:best-for-gate
 * Optional live check after `next start`: node scripts/test-best-for-gate.mjs http://127.0.0.1:PORT
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  BEST_FOR_MIN_DIFF_FIELDS,
  BEST_FOR_MIN_FIRMS,
  BEST_FOR_USE_CASES,
  bestForRoutePair,
  bestForSlugManifest,
  buildBestForPageModel,
  countDifferingFields,
  enBestForPath,
  getBestForPageModels,
  indexableBestForPaths,
  rankBestFor,
  ruBestForPath,
} from '../lib/bestFor.ts'
import { listVerdictFiles, loadVerdict, verdictProblems, VERDICT_MIN_WORDS, VERDICT_MAX_WORDS } from '../lib/verdicts.ts'

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? null

assert.equal(BEST_FOR_MIN_DIFF_FIELDS, 5)
assert.ok(BEST_FOR_USE_CASES.length >= 6, 'expected the six W45 use cases')

const ids = BEST_FOR_USE_CASES.map(useCase => useCase.id)
assert.deepEqual(
  [...ids].sort(),
  ['beginners', 'eas', 'news-trading', 'no-time-limit', 'scalping', 'weekly-payouts'].sort(),
)

// Slug uniqueness and path shape
const enSlugs = new Set()
const ruSlugs = new Set()
for (const useCase of BEST_FOR_USE_CASES) {
  assert.ok(!enSlugs.has(useCase.enSlug), `duplicate EN slug ${useCase.enSlug}`)
  assert.ok(!ruSlugs.has(useCase.ruSlug), `duplicate RU slug ${useCase.ruSlug}`)
  enSlugs.add(useCase.enSlug)
  ruSlugs.add(useCase.ruSlug)
  assert.match(enBestForPath(useCase), /^\/best-prop-firms-for\/[a-z0-9-]+$/)
  assert.match(ruBestForPath(useCase), /^\/ru\/luchshie-prop-firmy-dlya\/[a-z0-9-]+$/)
  assert.ok(!useCase.metaTitle.en.toLowerCase().includes('bybit'))
  assert.ok(!useCase.metaTitle.ru.toLowerCase().includes('bybit'))
  assert.ok(!useCase.intro.ru.toLowerCase().includes('bybit'))
}

// Without verdict files on disk, every page must be noindex.
const models = getBestForPageModels()
assert.equal(models.length, BEST_FOR_USE_CASES.length * 2)
for (const model of models) {
  assert.equal(model.hasVerdict, false, `${model.path} should have no verdict on a clean tree`)
  assert.equal(model.indexable, false, `${model.path} must stay noindex without a verdict`)
  assert.ok(model.reasons.some(reason => /missing writer verdict/.test(reason)), `${model.path}: ${model.reasons}`)
}
assert.deepEqual(indexableBestForPaths(), [])
assert.equal(bestForRoutePair(enBestForPath(BEST_FOR_USE_CASES[0])), undefined)

// countDifferingFields: synthetic rows
const fake = (values) => values.map((fieldValues, index) => ({
  firm: { name: `F${index}`, score: 50 - index },
  slug: `f${index}`,
  products: [],
  highlight: '',
  russiaStatus: 'available',
  showRuSignupCta: true,
  fieldValues,
}))
const diff = countDifferingFields(
  fake([
    { profitSplitPct: '80', drawdownType: 'static', payoutFrequency: 'weekly', eaAllowed: 'allowed', newsTradingAllowed: 'allowed', platforms: 'MT5' },
    { profitSplitPct: '90', drawdownType: 'trailing', payoutFrequency: 'monthly', eaAllowed: 'blocked', newsTradingAllowed: 'restricted', platforms: 'cTrader' },
  ]),
  ['profitSplitPct', 'drawdownType', 'payoutFrequency', 'eaAllowed', 'newsTradingAllowed', 'platforms', 'minTradingDays'],
)
assert.equal(diff.count, 6, `expected 6 differing fields, got ${diff.count}: ${diff.fields}`)
assert.equal(
  countDifferingFields(fake([{ profitSplitPct: '80' }]), ['profitSplitPct']).count,
  0,
  'single firm cannot satisfy the gate',
)
assert.ok(BEST_FOR_MIN_FIRMS >= 2)

// In-memory verdict fixture unlocks index only when the data gate also passes.
const sampleBody = Array.from({ length: 130 }, (_, i) => `word${i}`).join(' ')
assert.ok(sampleBody.split(/\s+/).length >= VERDICT_MIN_WORDS && sampleBody.split(/\s+/).length <= VERDICT_MAX_WORDS)

for (const useCase of BEST_FOR_USE_CASES) {
  const ranked = rankBestFor(useCase, 'en')
  const { count } = countDifferingFields(ranked, useCase.fields)
  const dataOk = ranked.length >= BEST_FOR_MIN_FIRMS && count >= BEST_FOR_MIN_DIFF_FIELDS
  const model = buildBestForPageModel(useCase.id, 'en')
  assert.ok(model)
  assert.equal(model.differingFieldCount, count)
  assert.equal(model.indexable, false, 'no file verdict ⇒ noindex even when data gate would pass')
  if (!dataOk) {
    assert.ok(
      model.reasons.some(reason => /differing fields|ranked firms/.test(reason)),
      `${useCase.id}: expected data-gate reason, got ${model.reasons.join('; ')}`,
    )
  }
}

// Any on-disk best-for verdict must validate.
for (const entry of listVerdictFiles().filter(item => item.kind === 'best-for')) {
  const verdict = loadVerdict(entry.kind, entry.slug, entry.lang)
  assert.ok(verdict)
  assert.equal(verdictProblems({
    slug: verdict.slug,
    lang: verdict.lang,
    checkedAt: verdict.checkedAt,
    author: verdict.author,
    sources: verdict.sources,
  }, verdict.body, entry).length, 0)
}

// Manifest for writers / RU SEO Lead
const manifest = bestForSlugManifest()
assert.equal(manifest.length, 6)
console.log('PASS best-for gate (unit)')
console.log(`  use cases: ${BEST_FOR_USE_CASES.map(u => u.id).join(', ')}`)
for (const useCase of BEST_FOR_USE_CASES) {
  const en = buildBestForPageModel(useCase.id, 'en')
  console.log(
    `  ${useCase.id}: firms=${en.ranked.length} diffs=${en.differingFieldCount} indexable=${en.indexable}`
    + (useCase.dataNote ? ` NOTE=${useCase.dataNote}` : ''),
  )
}
console.log('  placeholder slugs:')
for (const row of manifest) {
  console.log(`    ${row.id}: ${row.en} ↔ ${row.ru}`)
}

if (!base) {
  process.exit(0)
}

// Optional live HTML guard
const SITE = 'https://tradersfundhub.com'
async function get(urlPath) {
  const response = await fetch(`${base}${urlPath}`, { redirect: 'manual' })
  return { status: response.status, html: await response.text(), headers: response.headers }
}
const isNoindex = html => /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
  || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html)

const sitemap = (await get('/sitemap.xml')).html
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(SITE, '') || '/'))

for (const model of getBestForPageModels()) {
  const { status, html } = await get(model.path)
  assert.equal(status, 200, `${model.path} should render`)
  assert.equal(isNoindex(html), !model.indexable, `${model.path}: robots vs model`)
  assert.match(html, new RegExp(`data-best-for="${model.useCase.id}"`))
  assert.match(html, new RegExp(`data-best-for-indexable="${model.indexable ? 'true' : 'false'}"`))
  if (!model.indexable) {
    assert.ok(!locs.has(model.path), `${model.path} noindex but in sitemap`)
  } else {
    assert.ok(locs.has(model.path), `${model.path} indexable but missing from sitemap`)
  }
  if (model.lang === 'ru') {
    assert.ok(!/bybit/i.test(html), `${model.path} must not name Bybit`)
    // Sign-up CTAs only for available firms
    for (const row of model.ranked) {
      if (!row.showRuSignupCta) {
        assert.ok(
          !html.includes(`/go/${row.slug}?from=ru-best-for-${model.useCase.id}`),
          `${model.path}: unexpected RU signup CTA for ${row.slug} (${row.russiaStatus})`,
        )
      }
    }
  }
}
console.log(`PASS best-for gate (live against ${base})`)
