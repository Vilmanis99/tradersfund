/**
 * Best-for-X index gate, slugs, ranking, Tracker fields, nested 404s.
 * Run: npm run test:best-for-gate
 * Live: node scripts/test-best-for-gate.mjs http://127.0.0.1:PORT
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  BEST_FOR_MIN_DIFF_FIELDS,
  BEST_FOR_MIN_FIRMS,
  BEST_FOR_SLUGS,
  BEST_FOR_SORT_RULES,
  RU_BEST_FOR_CTA_RANK_NOTE_OPEN,
  ruBestForCtaRankNote,
  ruBestForCtaRankNotePinned,
  BEST_FOR_USE_CASES,
  BEST_FOR_RETIRED_NESTED_PATHS,
  BEGINNER_MAX_ENTRY_PRICE_EUR,
  BEGINNER_MAX_ENTRY_PRICE_USD,
  BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS,
  beginnerEntryQuote,
  allBestForPaths,
  bestForIndexableFeatureLink,
  bestForPath,
  bestForRoutePair,
  bestForSlugManifest,
  beginnerFirmFailures,
  beginnerProductFailures,
  buildBestForPageModel,
  countDifferingFields,
  getBestForPageModels,
  hasMinHoldSecondsField,
  indexableBestForPaths,
  isBeginnerFriendlyProduct,
  isScalpingFriendlyProduct,
  listBeginnerFriendlyFirms,
  listBeginnersExcludedRestricted,
  productHasNoTimeLimit,
  rankBestFor,
} from '../lib/bestFor.ts'
import { getAllFirms, getChallengesByFirm } from '../lib/firms.ts'
import { firmSlug } from '../lib/firmSlug.ts'

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? null

/** Fingerprint every file under content/verdicts — tests must leave this tree untouched. */
function fingerprintVerdictsTree(root = path.join(process.cwd(), 'content/verdicts')) {
  const files = []
  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/')
        const buf = fs.readFileSync(full)
        files.push({
          rel,
          sha256: crypto.createHash('sha256').update(buf).digest('hex'),
          size: buf.length,
        })
      }
    }
  }
  walk(root)
  files.sort((a, b) => a.rel.localeCompare(b.rel))
  return files
}

function assertVerdictsUnchanged(before, label = 'content/verdicts') {
  const after = fingerprintVerdictsTree()
  assert.deepEqual(after, before, `${label} must be byte-identical after tests (no create/delete/move)`)
}

const verdictsBefore = fingerprintVerdictsTree()

/** Isolated verdict root — never point this at the real content/ tree for writes. */
function makeVerdictFixtureRoot(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'best-for-verdicts-'))
  const dir = path.join(root, 'content/verdicts/best-for')
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body)
  }
  return root
}

const emptyVerdictRoot = makeVerdictFixtureRoot()


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

// Without verdicts (isolated empty root) → every built page noindex
// Real content/verdicts may already have writer files — never assume the repo tree is empty.
for (const model of getBestForPageModels(new Date(), emptyVerdictRoot)) {
  assert.equal(model.indexable, false, model.path)
  assert.ok(model.reasons.some(r => /missing writer verdict/.test(r)))
}
assert.deepEqual(indexableBestForPaths(new Date(), emptyVerdictRoot), [])
assert.equal(bestForRoutePair('/best-prop-firms-for-eas', new Date(), emptyVerdictRoot), undefined)
assert.equal(bestForIndexableFeatureLink('ea-allowed', emptyVerdictRoot), null)
assert.equal(bestForIndexableFeatureLink('news-trading', emptyVerdictRoot), null)

// Per-language gate: RU verdict alone can unlock RU when data passes (fixture root only)
{
  const useCase = BEST_FOR_USE_CASES.find(u => u.id === 'news-trading')
  const { ranked } = rankBestFor(useCase, 'ru')
  const { count } = countDifferingFields(ranked, useCase.fields)
  const dataOk = ranked.length >= BEST_FOR_MIN_FIRMS && count >= BEST_FOR_MIN_DIFF_FIELDS
  assert.ok(dataOk, `news-trading needs data gate for per-lang test (firms=${ranked.length} diffs=${count})`)

  const body = Array.from({ length: 130 }, (_, i) => `слово${i}`).join(' ')
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
  const fixtureRoot = makeVerdictFixtureRoot({
    'news-trading.ru.md': fm('ru', `title: 'RU Title From Frontmatter'
h1: 'RU H1 From Frontmatter'
description: 'RU meta from frontmatter for news trading page.'
`),
  })
  try {
    const ru = buildBestForPageModel('news-trading', 'ru', new Date(), fixtureRoot)
    const en = buildBestForPageModel('news-trading', 'en', new Date(), fixtureRoot)
    assert.equal(ru.indexable, true, `RU should index with verdict+data: ${ru.reasons}`)
    assert.equal(en.indexable, false, 'EN must stay noindex without its own verdict')
    assert.equal(bestForRoutePair(ru.path, new Date(), fixtureRoot), undefined, 'hreflang only when BOTH pass')
    assert.equal(ru.h1, 'RU H1 From Frontmatter')
    assert.equal(ru.metaTitle, 'RU Title From Frontmatter')
    assert.equal(ru.metaDescription, 'RU meta from frontmatter for news trading page.')
    assert.notEqual(en.h1, 'RU H1 From Frontmatter')
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
  }
}

// Frontmatter title on beginners RU path shape (fixture root only)
{
  const body = Array.from({ length: 130 }, (_, i) => `word${i}`).join(' ')
  const fixtureRoot = makeVerdictFixtureRoot({
    'beginners.ru.md': `---
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
`,
  })
  try {
    const model = buildBestForPageModel('beginners', 'ru', new Date(), fixtureRoot)
    assert.equal(model.path, '/ru/luchshie-prop-firmy-dlya-novichkov')
    assert.equal(model.h1, 'Кастомный H1 новичков')
    assert.equal(model.metaTitle, 'Кастомный title новичков')
    console.log('  beginners RU gate', { firms: model.ranked.length, diffs: model.differingFieldCount, indexable: model.indexable, reasons: model.reasons })
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
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
  // phaseEvaluationTimeLimits (schema) preferred over phasesDetail
  assert.deepEqual(
    productHasNoTimeLimit({
      ...baseProduct,
      phaseEvaluationTimeLimits: [
        { phase: 1, days: null, unlimited: true, sourceUrl: 'https://example.com', checkedAt: '2026-11-02' },
        { phase: 2, days: null, unlimited: true, sourceUrl: 'https://example.com', checkedAt: '2026-11-02' },
      ],
      phasesDetail: [{ phase: 1, evaluationTimeLimit: { days: 30, unlimited: false } }],
      maxTradingDaysUnlimited: false,
    }),
    { ok: true, viaProxy: false },
  )
  assert.deepEqual(
    productHasNoTimeLimit({
      ...baseProduct,
      phaseEvaluationTimeLimits: [
        { phase: 1, days: 30, unlimited: false, sourceUrl: 'https://example.com', checkedAt: '2026-11-02' },
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

// Beginners — RU SEO Lead hard filters + ranking signals
{
  assert.equal(BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS, 5)
  assert.equal(BEGINNER_MAX_ENTRY_PRICE_USD, 99)
  assert.equal(BEGINNER_MAX_ENTRY_PRICE_EUR, 99)
  const passingEn = listBeginnerFriendlyFirms(new Date(), { applyRussiaFilter: false })
  const passingRu = listBeginnerFriendlyFirms(new Date(), { applyRussiaFilter: true })
  console.log('  beginners EN pass:', passingEn.map(f => f.firmSlug).join(', ') || '(none)')
  console.log('  beginners RU pass:', passingRu.map(f => f.firmSlug).join(', ') || '(none)')
  const excluded = listBeginnersExcludedRestricted()
  console.log('  beginners RU excluded restricted:', excluded.map(f => f.slug).join(', ') || '(none)')
  assert.ok(excluded.some(f => f.slug === 'the5ers'), 'The5ers must be listed as restricted exclusion when product filters pass')

  const targetSlugs = ['bright-funded', 'crypto-fund-trader', 'fundingpips', 'hash-hedge', 'the5ers']
  for (const slug of targetSlugs) {
    const firm = getAllFirms().find(f => firmSlug(f.name) === slug)
    assert.ok(firm, `missing firm ${slug}`)
    const products = getChallengesByFirm(slug)
    const productPass = products.some(isBeginnerFriendlyProduct)
    const fails = products.map(p => ({ product: p.productSlug, reasons: beginnerProductFailures(p) }))
    const firmRu = beginnerFirmFailures(firm, products, { applyRussiaFilter: true })
    const firmEn = beginnerFirmFailures(firm, products, { applyRussiaFilter: false })
    console.log(`  beginners target ${slug}: productPass=${productPass} ruFail=${JSON.stringify(firmRu)} enFail=${JSON.stringify(firmEn)}`, JSON.stringify(fails.filter(f => f.reasons.length).slice(0, 2)))
  }

  // BF CFD: EUR-only ≤ €99 → qualifies via EUR cap (never converts)
  {
    const bfProducts = getChallengesByFirm('bright-funded')
    assert.ok(bfProducts.some(isBeginnerFriendlyProduct), 'BrightFunded CFD should pass via EUR cap')
    const pass = bfProducts.find(isBeginnerFriendlyProduct)
    const quote = beginnerEntryQuote(pass)
    assert.equal(quote?.currency, 'EUR')
    assert.ok(quote.price <= BEGINNER_MAX_ENTRY_PRICE_EUR)
    console.log('  BrightFunded EUR quote', quote)
  }
  for (const slug of ['crypto-fund-trader', 'fundingpips', 'hash-hedge', 'bright-funded']) {
    assert.ok(
      getChallengesByFirm(slug).some(isBeginnerFriendlyProduct),
      `${slug} should pass beginners product hard filters`,
    )
  }
  // Hash Hedge drawdownType is null on purpose (Tracker) — ranking signal only, never a hard filter
  {
    const hhProducts = getChallengesByFirm('hash-hedge')
    assert.ok(hhProducts.every(p => p.drawdownType == null), 'HH drawdownType expected null (unknown)')
    const ruRanked = rankBestFor(BEST_FOR_USE_CASES.find(u => u.id === 'beginners'), 'ru').ranked
    const hh = ruRanked.find(r => r.slug === 'hash-hedge')
    assert.ok(hh, 'Hash Hedge must remain on RU beginners with unknown drawdown')
    // preferredDd key is index 3 → 1 means non-preferred / unknown
    assert.equal(hh.sortKeys[3], 1, 'unknown drawdown ranks lowest on that signal')
  }
  // The5ers: product ok, RU restricted
  assert.ok(getChallengesByFirm('the5ers').some(isBeginnerFriendlyProduct), 'The5ers products pass price/freshness')
  const the5 = getAllFirms().find(f => firmSlug(f.name) === 'the5ers')
  assert.deepEqual(
    beginnerFirmFailures(the5, getChallengesByFirm('the5ers'), { applyRussiaFilter: true }),
    ['russia-restricted'],
  )
  assert.deepEqual(
    beginnerFirmFailures(the5, getChallengesByFirm('the5ers'), { applyRussiaFilter: false }),
    [],
  )

  const ruModel = buildBestForPageModel('beginners', 'ru', new Date(), emptyVerdictRoot)
  const enModel = buildBestForPageModel('beginners', 'en', new Date(), emptyVerdictRoot)
  console.log('  beginners RU gate', {
    firms: ruModel.ranked.length,
    diffs: ruModel.differingFieldCount,
    indexable: ruModel.indexable,
    reasons: ruModel.reasons,
    excluded: (ruModel.excludedRestrictedFirms || []).map(f => f.slug),
  })
  console.log('  beginners EN gate', {
    firms: enModel.ranked.length,
    diffs: enModel.differingFieldCount,
    indexable: enModel.indexable,
    reasons: enModel.reasons,
  })
  assert.ok(ruModel.ranked.length >= 4, 'RU beginners should include FP, CFT, HH, BF')
  assert.ok(ruModel.ranked.every(r => r.russiaStatus !== 'restricted'))
  assert.ok(ruModel.excludedRestrictedFirms?.some(f => f.slug === 'the5ers'))
  // Site rule 2026-10-14: every listed RU firm gets a sign-up CTA (+ badge via RuGoLink)
  for (const row of ruModel.ranked) {
    assert.equal(row.showRuSignupCta, true, `${row.slug} must keep RU CTA`)
  }
  assert.ok(ruModel.ranked.some(r => r.slug === 'bright-funded'), 'BF CFD now on RU beginners')
  const bfRank = ruModel.ranked.findIndex(r => r.slug === 'bright-funded') + 1
  console.log('  BrightFunded RU beginners rank', bfRank, '/', ruModel.ranked.length, 'sortKeys=', ruModel.ranked[bfRank - 1]?.sortKeys)
  assert.deepEqual(
    ruModel.ranked.map(r => r.slug),
    ['bright-funded', 'crypto-fund-trader', 'hash-hedge', 'fundingpips'],
    'RU beginners CTA order: available+pin first, then data within groups',
  )
  assert.ok(!/партнёрский статус не/i.test(BEST_FOR_SORT_RULES.beginners.ru))
  assert.ok(ruModel.sortRule.includes(ruBestForCtaRankNotePinned('BrightFunded')))
  assert.ok(!BEST_FOR_SORT_RULES.beginners.ru.includes('Сначала идут фирмы'))
  // EN keeps pure data order (BrightFunded not forced first)
  assert.notEqual(enModel.ranked[0]?.slug, 'bright-funded')
  // Excluded restricted note carries reviewPath when RU obzor exists
  const the5ex = ruModel.excludedRestrictedFirms?.find(f => f.slug === 'the5ers')
  assert.ok(the5ex, 'The5ers on excluded list')
  assert.equal(the5ex.reviewPath, '/ru/obzor-the5ers')
  // EN includes restricted firms that pass product filters (no Russia filter)
  assert.ok(enModel.ranked.some(r => r.slug === 'the5ers'), 'EN beginners keeps The5ers (no Russia filter)')
  // Ranking deterministic + no affiliate in sort keys
  const a = rankBestFor(BEST_FOR_USE_CASES.find(u => u.id === 'beginners'), 'ru')
  const b = rankBestFor(BEST_FOR_USE_CASES.find(u => u.id === 'beginners'), 'ru')
  assert.deepEqual(a.ranked.map(r => r.slug), b.ranked.map(r => r.slug))
  assert.deepEqual(a.ranked.map(r => r.sortKeys), b.ranked.map(r => r.sortKeys))
  assert.ok(BEST_FOR_SORT_RULES.beginners.en.includes('Affiliate status is not used'))
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

// Sort rules present for every id (base RU copy has no CTA overlay — that is data-driven)
for (const id of Object.keys(BEST_FOR_SLUGS)) {
  assert.ok(BEST_FOR_SORT_RULES[id]?.en)
  assert.ok(BEST_FOR_SORT_RULES[id]?.ru)
  assert.ok(!BEST_FOR_SORT_RULES[id].ru.includes('Сначала идут фирмы'), `${id} base RU rule must not hardcode CTA overlay`)
  assert.ok(!/партнёрский статус не/i.test(BEST_FOR_SORT_RULES[id].ru), `${id} RU must not claim affiliate does not affect order`)
}

// ruBestForCtaRankNote — three cases (pin / open-no-pin / no-open)
{
  const pinName = 'BrightFunded'
  const withPin = ruBestForCtaRankNote([
    { slug: 'bright-funded', russiaStatus: 'available', firm: { name: pinName } },
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    { slug: 'fundingpips', russiaStatus: 'unclear', firm: { name: 'FundingPips' } },
  ])
  assert.equal(withPin, ruBestForCtaRankNotePinned(pinName))
  assert.match(withPin, /наш партнёр BrightFunded/)

  const openNoPin = ruBestForCtaRankNote([
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    { slug: 'hash-hedge', russiaStatus: 'unclear', firm: { name: 'Hash Hedge' } },
  ])
  assert.equal(openNoPin, RU_BEST_FOR_CTA_RANK_NOTE_OPEN)
  assert.ok(!openNoPin.includes('партнёр'))

  const noOpen = ruBestForCtaRankNote([
    { slug: 'fundednext', russiaStatus: 'restricted', firm: { name: 'FundedNext' } },
    { slug: 'fundingpips', russiaStatus: 'unclear', firm: { name: 'FundingPips' } },
  ])
  assert.equal(noOpen, '')

  // Pin present but not available → treat as open-no-pin when another firm is open
  const pinRestricted = ruBestForCtaRankNote([
    { slug: 'bright-funded', russiaStatus: 'restricted', firm: { name: pinName } },
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
  ])
  assert.equal(pinRestricted, RU_BEST_FOR_CTA_RANK_NOTE_OPEN)

  // Live pages: pin / open-no-pin / none
  const beginnersRu = buildBestForPageModel('beginners', 'ru')
  assert.ok(beginnersRu.sortRule.includes(ruBestForCtaRankNotePinned('BrightFunded')))
  const newsRu = buildBestForPageModel('news-trading', 'ru')
  assert.ok(newsRu.sortRule.includes(RU_BEST_FOR_CTA_RANK_NOTE_OPEN))
  assert.ok(!newsRu.sortRule.includes('партнёр'))
  const weeklyRu = buildBestForPageModel('weekly-payouts', 'ru')
  assert.equal(weeklyRu.sortRule, BEST_FOR_SORT_RULES['weekly-payouts'].ru)
  assert.ok(!weeklyRu.sortRule.includes('Сначала идут фирмы'))
  console.log('  ruBestForCtaRankNote cases: pin / open-no-pin / no-open OK')
}

assertVerdictsUnchanged(verdictsBefore)
console.log('PASS best-for gate (unit) — content/verdicts unchanged')
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
