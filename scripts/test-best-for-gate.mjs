/**
 * Best-for-X index gate, slugs, ranking, Tracker fields, nested 404s.
 * Run: npm run test:best-for-gate
 * Live: node scripts/test-best-for-gate.mjs http://127.0.0.1:PORT
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  BEST_FOR_MIN_DIFF_FIELDS,
  BEST_FOR_MIN_FIRMS,
  BEST_FOR_SLUGS,
  BEST_FOR_SORT_RULES,
  BEST_FOR_USE_CASES,
  BEST_FOR_RETIRED_NESTED_PATHS,
  BEGINNER_MAX_ENTRY_PRICE_USD,
  BEGINNER_MAX_MIN_TRADING_DAYS,
  allBestForPaths,
  bestForIndexableFeatureLink,
  bestForPath,
  bestForRoutePair,
  bestForSlugManifest,
  beginnerProductFailures,
  buildBestForPageModel,
  countDifferingFields,
  getBestForPageModels,
  hasMinHoldSecondsField,
  indexableBestForPaths,
  isBeginnerFriendlyProduct,
  isScalpingFriendlyProduct,
  listBeginnerFriendlyFirms,
  productHasNoTimeLimit,
  rankBestFor,
} from '../lib/bestFor.ts'
import { getChallengesByFirm } from '../lib/firms.ts'

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? null

assert.equal(BEST_FOR_MIN_DIFF_FIELDS, 5)
assert.ok(BEST_FOR_USE_CASES.length >= 8)

// Slug map: weekly EN unset; low-drawdown/small-accounts RU unset
assert.equal(BEST_FOR_SLUGS['weekly-payouts'].en, null)
assert.ok(BEST_FOR_SLUGS['weekly-payouts'].ru)
assert.ok(BEST_FOR_SLUGS['low-drawdown'].en)
assert.equal(BEST_FOR_SLUGS['low-drawdown'].ru, null)
assert.ok(BEST_FOR_SLUGS['small-accounts'].en)
assert.equal(BEST_FOR_SLUGS['small-accounts'].ru, null)
assert.equal(bestForPath('weekly-payouts', 'en'), null)
assert.equal(buildBestForPageModel('weekly-payouts', 'en'), null)

// Paths are flat
for (const model of getBestForPageModels()) {
  assert.ok(!model.path.includes('/best-prop-firms-for/'), model.path)
  assert.ok(!model.path.includes('/luchshie-prop-firmy-dlya/'), model.path)
  assert.match(model.path, model.lang === 'ru' ? /^\/ru\/[a-z0-9-]+$/ : /^\/best-prop-firms-for-[a-z0-9-]+$/)
  assert.ok(model.sortRule.includes('How we ranked') || model.sortRule.includes('Как ранжируем'))
}

// Collision: blog weekly exists; our EN weekly must not
assert.ok(fs.existsSync('content/posts/prop-firms-with-weekly-payouts.md'))
assert.ok(!fs.existsSync('app/best-prop-firms-for-weekly-payouts'))
assert.ok(!fs.existsSync('content/posts/prop-firms-with-low-drawdown.md'))
assert.ok(fs.existsSync('app/best-prop-firms-for-low-drawdown/page.tsx'))
assert.ok(fs.existsSync('app/prop-firms/[feature]/page.tsx'))

// Without verdicts → every built page noindex
for (const model of getBestForPageModels()) {
  assert.equal(model.indexable, false, model.path)
  assert.ok(model.reasons.some(r => /missing writer verdict/.test(r)))
}
assert.deepEqual(indexableBestForPaths(), [])
assert.equal(bestForRoutePair('/best-prop-firms-for-eas'), undefined)
assert.equal(bestForIndexableFeatureLink('ea-allowed'), null)
assert.equal(bestForIndexableFeatureLink('news-trading'), null)

// Per-language gate: RU verdict alone can unlock RU when data passes
{
  const useCase = BEST_FOR_USE_CASES.find(u => u.id === 'news-trading')
  const { ranked } = rankBestFor(useCase, 'ru')
  const { count } = countDifferingFields(ranked, useCase.fields)
  const dataOk = ranked.length >= BEST_FOR_MIN_FIRMS && count >= BEST_FOR_MIN_DIFF_FIELDS
  assert.ok(dataOk, `news-trading needs data gate for per-lang test (firms=${ranked.length} diffs=${count})`)

  const dir = path.join(process.cwd(), 'content/verdicts/best-for')
  fs.mkdirSync(dir, { recursive: true })
  const body = Array.from({ length: 130 }, (_, i) => `слово${i}`).join(' ')
  const ruFile = path.join(dir, 'news-trading.ru.md')
  const enFile = path.join(dir, 'news-trading.md')
  const fm = (lang, extra = '') => `---
slug: news-trading
lang: ${lang}
checkedAt: '2026-11-02'
author: Test Writer
sources:
  - title: Example
    url: https://example.com/rules
${extra}---

${body}
`
  fs.writeFileSync(ruFile, fm('ru', `title: 'RU Title From Frontmatter'
h1: 'RU H1 From Frontmatter'
description: 'RU meta from frontmatter for news trading page.'
`))
  try {
    const ru = buildBestForPageModel('news-trading', 'ru')
    const en = buildBestForPageModel('news-trading', 'en')
    assert.equal(ru.indexable, true, `RU should index with verdict+data: ${ru.reasons}`)
    assert.equal(en.indexable, false, 'EN must stay noindex without its own verdict')
    assert.equal(bestForRoutePair(ru.path), undefined, 'hreflang only when BOTH pass')
    assert.equal(ru.h1, 'RU H1 From Frontmatter')
    assert.equal(ru.metaTitle, 'RU Title From Frontmatter')
    assert.equal(ru.metaDescription, 'RU meta from frontmatter for news trading page.')
    // EN still placeholders
    assert.notEqual(en.h1, 'RU H1 From Frontmatter')
  } finally {
    fs.rmSync(ruFile, { force: true })
    fs.rmSync(enFile, { force: true })
  }
}

// Frontmatter title on beginners RU path shape
{
  const dir = path.join(process.cwd(), 'content/verdicts/best-for')
  const body = Array.from({ length: 130 }, (_, i) => `word${i}`).join(' ')
  const file = path.join(dir, 'beginners.ru.md')
  fs.writeFileSync(file, `---
slug: beginners
lang: ru
checkedAt: '2026-11-02'
author: RU Writer
title: 'Кастомный title новичков'
h1: 'Кастомный H1 новичков'
description: 'Кастомное описание для новичков из frontmatter.'
sources:
  - title: Data
    url: /ru
---

${body}
`)
  try {
    const model = buildBestForPageModel('beginners', 'ru')
    assert.equal(model.path, '/ru/luchshie-prop-firmy-dlya-novichkov')
    assert.equal(model.h1, 'Кастомный H1 новичков')
    assert.equal(model.metaTitle, 'Кастомный title новичков')
    // indexable depends on data gate with new beginners filter
    console.log('  beginners RU gate', { firms: model.ranked.length, diffs: model.differingFieldCount, indexable: model.indexable, reasons: model.reasons })
  } finally {
    fs.rmSync(file, { force: true })
  }
}

// Tracker evaluationTimeLimit fixtures
{
  const baseProduct = {
    firmSlug: 'fixture-firm',
    productName: 'Fixture',
    productSlug: 'fixture',
    phases: 1,
    accountSizes: [{ sizeUsd: 10000, priceUsd: 49, refundable: null }],
    profitTargets: { phase1: 8 },
    dailyLossPct: 4,
    maxLossPct: 6,
    drawdownType: 'static',
    minTradingDays: 1,
    maxTradingDays: null,
    profitSplitPct: 80,
    payoutFirstDays: 14,
    payoutFrequency: 'bi-weekly',
    rules: { news: true, weekend: true, overnight: true, ea: true, copyTrading: false },
    assetClass: 'cfd',
    sourceUrl: 'https://example.com',
    sourceCapturedAt: '2026-11-01',
  }
  assert.deepEqual(productHasNoTimeLimit({ ...baseProduct, evaluationTimeLimit: { days: null, unlimited: true } }), { ok: true, viaProxy: false })
  assert.deepEqual(productHasNoTimeLimit({ ...baseProduct, evaluationTimeLimit: { days: 30, unlimited: false } }), { ok: false, viaProxy: false })
  assert.deepEqual(productHasNoTimeLimit({ ...baseProduct, evaluationTimeLimit: { days: null, unlimited: false } }), { ok: false, viaProxy: false })
  assert.deepEqual(
    productHasNoTimeLimit({
      ...baseProduct,
      phasesDetail: [
        { phase: 1, evaluationTimeLimit: { days: null, unlimited: true } },
        { phase: 2, evaluationTimeLimit: { days: null, unlimited: true } },
      ],
    }),
    { ok: true, viaProxy: false },
  )
  assert.deepEqual(
    productHasNoTimeLimit({
      ...baseProduct,
      phasesDetail: [
        { phase: 1, evaluationTimeLimit: { days: null, unlimited: true } },
        { phase: 2, evaluationTimeLimit: { days: 30, unlimited: false } },
      ],
    }),
    { ok: false, viaProxy: false },
  )
  // Legacy proxy only when field absent
  assert.deepEqual(
    productHasNoTimeLimit({ ...baseProduct, maxTradingDaysUnlimited: true, maxTradingDays: null }),
    { ok: true, viaProxy: true },
  )
  // Present-but-unknown must NOT fall back to legacy
  assert.deepEqual(
    productHasNoTimeLimit({
      ...baseProduct,
      evaluationTimeLimit: { days: null, unlimited: false },
      maxTradingDaysUnlimited: true,
      maxTradingDays: null,
    }),
    { ok: false, viaProxy: false },
  )
}

// Tracker minHoldSeconds fixtures — never use scalpingAllowed
{
  const withHold = (minHoldSeconds) => ({
    rules: { news: true, weekend: true, overnight: true, ea: true, copyTrading: false, minHoldSeconds },
  })
  assert.equal(isScalpingFriendlyProduct({ rules: { news: true, weekend: true, overnight: true, ea: true, copyTrading: false } }), false)
  assert.equal(hasMinHoldSecondsField({ rules: { news: true, weekend: true, overnight: true, ea: true, copyTrading: false } }), false)
  assert.equal(isScalpingFriendlyProduct(withHold(0)), true)
  assert.equal(isScalpingFriendlyProduct(withHold(null)), false)
  assert.equal(isScalpingFriendlyProduct(withHold(60)), false)
  assert.equal(hasMinHoldSecondsField(withHold(null)), true)
}

// Beginners filter constants + BrightFunded exclusion note
{
  assert.equal(BEGINNER_MAX_MIN_TRADING_DAYS, 5)
  assert.equal(BEGINNER_MAX_ENTRY_PRICE_USD, 99)
  const passing = listBeginnerFriendlyFirms()
  console.log('  beginners pass firms:', passing.map(f => f.firmSlug).join(', ') || '(none)')
  const target = {
    'bright-funded': getChallengesByFirm('bright-funded'),
    'fundingpips': getChallengesByFirm('fundingpips'),
    'hash-hedge': getChallengesByFirm('hash-hedge'),
    'crypto-fund-trader': getChallengesByFirm('crypto-fund-trader'),
  }
  for (const [slug, products] of Object.entries(target)) {
    const any = products.some(isBeginnerFriendlyProduct)
    const fails = products.map(p => ({ product: p.productSlug, reasons: beginnerProductFailures(p) }))
    console.log(`  beginners target ${slug}: pass=${any}`, JSON.stringify(fails.filter(f => f.reasons.length).slice(0, 3)))
  }
}

// Ranking determinism + BrightFunded position from rule only (low-drawdown / small-accounts / eas)
{
  const useCase = BEST_FOR_USE_CASES.find(u => u.id === 'low-drawdown')
  const a = rankBestFor(useCase, 'en')
  const b = rankBestFor(useCase, 'en')
  assert.deepEqual(
    a.ranked.map(r => r.slug),
    b.ranked.map(r => r.slug),
    'low-drawdown ranking must be deterministic',
  )
  // sort keys non-decreasing by comparator
  for (let i = 1; i < a.ranked.length; i++) {
    const prev = a.ranked[i - 1]
    const cur = a.ranked[i]
    const prevMax = Number(prev.fieldValues.maxLossPct)
    const curMax = Number(cur.fieldValues.maxLossPct)
    if (Number.isFinite(prevMax) && Number.isFinite(curMax)) {
      assert.ok(prevMax <= curMax, `maxLossPct order broken: ${prev.slug}=${prevMax} then ${cur.slug}=${curMax}`)
    }
  }
  // USD group separate
  assert.ok(a.unrankedUsd.every(r => r.drawdownBasis === 'usd'))
  assert.ok(a.ranked.every(r => r.drawdownBasis === 'pct'))

  const small = BEST_FOR_USE_CASES.find(u => u.id === 'small-accounts')
  const s = rankBestFor(small, 'en').ranked
  for (let i = 1; i < s.length; i++) {
    const prev = Number(s[i - 1].fieldValues.smallestAccountUsd)
    const cur = Number(s[i].fieldValues.smallestAccountUsd)
    if (Number.isFinite(prev) && Number.isFinite(cur)) {
      assert.ok(prev <= cur, `small-accounts size order: ${s[i - 1].slug} then ${s[i].slug}`)
    }
  }

  // BrightFunded position on eas comes from sort keys, not affiliate
  const eas = BEST_FOR_USE_CASES.find(u => u.id === 'eas')
  const easRanked = rankBestFor(eas, 'en').ranked
  const bf = easRanked.find(r => r.slug === 'bright-funded')
  if (bf) {
    const idx = easRanked.indexOf(bf)
    const expected = [...easRanked].sort((x, y) => {
      for (let i = 0; i < Math.max(x.sortKeys.length, y.sortKeys.length); i++) {
        const d = (x.sortKeys[i] ?? 0) - (y.sortKeys[i] ?? 0)
        if (d) return d
      }
      return x.firm.name.localeCompare(y.firm.name)
    })
    assert.deepEqual(expected.map(r => r.slug), easRanked.map(r => r.slug), 'eas order must equal sortKeys+name')
    // Position must match the data rule, not editorial score order
    const byScore = [...easRanked].sort((x, y) => y.firm.score - x.firm.score || x.firm.name.localeCompare(y.firm.name))
    const scoreIdx = byScore.findIndex(r => r.slug === 'bright-funded')
    console.log(`  BrightFunded eas rank #${idx + 1} (score-order would be #${scoreIdx + 1}) sortKeys=${JSON.stringify(bf.sortKeys)} split=${bf.fieldValues.profitSplitPct}`)
    assert.equal(easRanked[idx].sortKeys[0], bf.sortKeys[0])
  } else {
    console.log('  BrightFunded not in eas list (eaAllowed not true) — skip eas position assert')
  }

  // BrightFunded on small-accounts / low-drawdown: position from sortKeys only
  for (const id of ['small-accounts', 'low-drawdown']) {
    const uc = BEST_FOR_USE_CASES.find(u => u.id === id)
    const { ranked } = rankBestFor(uc, 'en')
    const row = ranked.find(r => r.slug === 'bright-funded')
    if (!row) {
      console.log(`  BrightFunded not in ${id} ranked list`)
      continue
    }
    const recomputed = [...ranked].sort((x, y) => {
      for (let i = 0; i < Math.max(x.sortKeys.length, y.sortKeys.length); i++) {
        const d = (x.sortKeys[i] ?? 0) - (y.sortKeys[i] ?? 0)
        if (d) return d
      }
      return x.firm.name.localeCompare(y.firm.name)
    })
    assert.deepEqual(recomputed.map(r => r.slug), ranked.map(r => r.slug), `${id} order must equal sort rule`)
    const byScore = [...ranked].sort((x, y) => y.firm.score - x.firm.score || x.firm.name.localeCompare(y.firm.name))
    const ruleIdx = ranked.indexOf(row)
    const scoreIdx = byScore.indexOf(row)
    console.log(`  BrightFunded ${id}: rule-rank #${ruleIdx + 1}, score-rank would be #${scoreIdx + 1}, sortKeys=${JSON.stringify(row.sortKeys)}`)
    // Prove affiliate/score did not drive order: if score order differs, rule still matches recomputed
    assert.equal(recomputed[ruleIdx].slug, 'bright-funded')
  }
}

// Sort rules present for every id
for (const id of Object.keys(BEST_FOR_SLUGS)) {
  assert.ok(BEST_FOR_SORT_RULES[id]?.en)
  assert.ok(BEST_FOR_SORT_RULES[id]?.ru)
}

console.log('PASS best-for gate (unit)')
console.log(`  built paths (${allBestForPaths().length}):`)
for (const row of bestForSlugManifest()) {
  console.log(`    ${row.id}: EN=${row.en ?? '—'} RU=${row.ru ?? '—'}`)
}
console.log('  sort rules:')
for (const [id, rule] of Object.entries(BEST_FOR_SORT_RULES)) {
  console.log(`    ${id}: ${rule.en}`)
}

if (!base) process.exit(0)

const SITE = 'https://tradersfundhub.com'
async function get(urlPath) {
  const response = await fetch(`${base}${urlPath}`, { redirect: 'manual' })
  return { status: response.status, html: await response.text(), headers: response.headers }
}
const isNoindex = html => /name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
  || /content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html)

const sitemap = (await get('/sitemap.xml')).html
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(SITE, '') || '/'))

for (const model of getBestForPageModels()) {
  const { status, html } = await get(model.path)
  assert.equal(status, 200, model.path)
  assert.equal(isNoindex(html), !model.indexable)
  assert.match(html, /data-best-for-sort-rule=/)
  assert.match(html, /AffiliateDisclosure|affiliate|disclosure/i)
  if (!model.indexable) assert.ok(!locs.has(model.path), `${model.path} in sitemap while noindex`)
  if (model.lang === 'ru') assert.ok(!/bybit/i.test(html))
}

for (const nested of BEST_FOR_RETIRED_NESTED_PATHS) {
  const { status } = await get(nested)
  assert.equal(status, 404, `${nested} must 404, got ${status}`)
}

// Feature pages: no crosslink while gate closed (byte-stable intent)
for (const slug of ['ea-allowed', 'news-trading']) {
  const { html } = await get(`/prop-firms/${slug}`)
  assert.ok(!html.includes('data-best-for-crosslink'), `${slug} must not link to noindex best-for`)
}

console.log(`PASS best-for gate (live against ${base})`)
