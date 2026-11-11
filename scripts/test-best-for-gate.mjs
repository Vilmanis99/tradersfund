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
  isBestForSaleEligible,
} from '../lib/bestFor.ts'
import { indexableBestForNavLinks } from '../lib/gateInlinks.ts'
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
assert.deepEqual(indexableBestForNavLinks('en', new Date(), emptyVerdictRoot), [])
assert.deepEqual(indexableBestForNavLinks('ru', new Date(), emptyVerdictRoot), [])
assert.equal(bestForRoutePair('/best-prop-firms-for-eas', new Date(), emptyVerdictRoot), undefined)
assert.equal(bestForIndexableFeatureLink('ea-allowed', emptyVerdictRoot), null)
assert.equal(bestForIndexableFeatureLink('news-trading', emptyVerdictRoot), null)

// Footer inlinks = indexable paths for that language only (same gate as the sitemap).
{
  const enLinks = indexableBestForNavLinks('en')
  const ruLinks = indexableBestForNavLinks('ru')
  const enPaths = indexableBestForPaths().filter(path => !path.startsWith('/ru/')).sort()
  const ruPaths = indexableBestForPaths().filter(path => path.startsWith('/ru/')).sort()
  assert.deepEqual(enLinks.map(link => link.href).sort(), enPaths)
  assert.deepEqual(ruLinks.map(link => link.href).sort(), ruPaths)
  for (const model of getBestForPageModels().filter(item => !item.indexable)) {
    const hrefs = (model.lang === 'ru' ? ruLinks : enLinks).map(link => link.href)
    assert.ok(!hrefs.includes(model.path), `noindex ${model.path} must not be a footer inlink`)
  }
}

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

// low-drawdown (EN-only): verdict + ≥5 ranked %-fields → indexable + in sitemap paths; no RU twin (fixture root only)
{
  const useCase = BEST_FOR_USE_CASES.find(u => u.id === 'low-drawdown')
  const { ranked } = rankBestFor(useCase, 'en')
  const rankedFields = useCase.fields.filter(key => key !== 'maxLossUsd' && key !== 'dailyLossUsd')
  const { count } = countDifferingFields(ranked, rankedFields)
  const dataOk = ranked.length >= BEST_FOR_MIN_FIRMS && count >= BEST_FOR_MIN_DIFF_FIELDS
  const noVerdict = buildBestForPageModel('low-drawdown', 'en', new Date(), emptyVerdictRoot)
  assert.equal(noVerdict.indexable, false)
  assert.equal(noVerdict.differingFieldCount, count, 'USD cap columns must not count toward the low-drawdown gate')
  assert.ok(!noVerdict.differingFields.includes('maxLossUsd') && !noVerdict.differingFields.includes('dailyLossUsd'))
  const body = Array.from({ length: 130 }, (_, i) => `word${i}`).join(' ')
  const fixtureRoot = makeVerdictFixtureRoot({
    'low-drawdown.md': `---
slug: low-drawdown
lang: en
checkedAt: '2026-11-02'
author: Test Writer
sources:
  - title: Example
    url: https://example.com/rules
---

${body}
`,
  })
  try {
    const en = buildBestForPageModel('low-drawdown', 'en', new Date(), fixtureRoot)
    assert.equal(en.hasVerdict, true)
    assert.equal(en.indexable, dataOk, `low-drawdown indexable must equal data gate (firms=${ranked.length} diffs=${count}): ${en.reasons}`)
    assert.equal(indexableBestForPaths(new Date(), fixtureRoot).includes('/best-prop-firms-for-low-drawdown'), dataOk)
    assert.equal(en.twinPath, null, 'low-drawdown has no RU slug')
    assert.equal(buildBestForPageModel('low-drawdown', 'ru', new Date(), fixtureRoot), null)
    assert.equal(bestForRoutePair('/best-prop-firms-for-low-drawdown', new Date(), fixtureRoot), undefined, 'EN-only: no RU alternate')
    console.log('  low-drawdown EN gate', { firms: ranked.length, diffs: count, indexable: en.indexable })
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
  const beginnersExpectedNote = ruBestForCtaRankNotePinned('BrightFunded')
  assert.equal(
    beginnersExpectedNote,
    'Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки; среди них первым стоит наш партнёр BrightFunded. Затем — фирмы, у которых статус для РФ неясен. Внутри групп порядок определяется данными, указанными выше.',
  )
  assert.ok(ruModel.sortRule.includes(beginnersExpectedNote))
  assert.equal(ruBestForCtaRankNote(ruModel.ranked), beginnersExpectedNote)
  assert.ok(!BEST_FOR_SORT_RULES.beginners.ru.includes('Сначала идут фирмы'))
  // EN keeps pure data order (BrightFunded not forced first)
  assert.notEqual(enModel.ranked[0]?.slug, 'bright-funded')
  // Excluded restricted note carries reviewPath when RU obzor exists
  const the5ex = ruModel.excludedRestrictedFirms?.find(f => f.slug === 'the5ers')
  assert.ok(the5ex, 'The5ers on excluded list')
  assert.equal(the5ex.reviewPath, '/ru/obzor-the5ers')
  const excludedSlugs = (ruModel.excludedRestrictedFirms || []).map(f => f.slug)
  assert.ok(excludedSlugs.includes('fundednext'), 'FundedNext on excluded restricted list')
  assert.equal(excludedSlugs.at(-1), 'fundednext', 'FundedNext last among excluded (CR)')
  assert.ok(!/without a sign-up link|без ссылки регистрации/i.test(BEST_FOR_USE_CASES.find(u => u.id === 'beginners').dataNote || ''))
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

// B1: soldToNewBuyers===false excluded from primaryProducts (every best-for use case).
{
  assert.equal(isBestForSaleEligible({}), true)
  assert.equal(isBestForSaleEligible({ soldToNewBuyers: undefined }), true)
  assert.equal(isBestForSaleEligible({ soldToNewBuyers: true }), true)
  assert.equal(isBestForSaleEligible({ soldToNewBuyers: false }), false)
}

// Track A: low-drawdown USD footnote drops soldToNewBuyers===false; numbered ranking untouched.
// Negative control must strip sale-status fields — live data may already carry Tracker flags.
{
  const useCase = BEST_FOR_USE_CASES.find(u => u.id === 'low-drawdown')
  const cftPath = path.join(process.cwd(), 'content/data/challenges/crypto-fund-trader.json')
  const original = fs.readFileSync(cftPath, 'utf8')
  const rankedIdentity = row => ({
    slug: row.slug,
    productSlugs: row.products.map(p => p.productSlug),
    fieldValues: row.fieldValues,
    sortKeys: row.sortKeys,
  })
  try {
    const products = JSON.parse(original)
    const breakProduct = products.find(p => p.productSlug === 'break')
    assert.ok(breakProduct, 'Break Challenge present')

    // Negative control: absent soldToNewBuyers → Break still eligible for unrankedUsd.
    // rankBestFor reads disk, so write a stripped copy then restore in finally.
    for (const product of products) {
      delete product.soldToNewBuyers
      delete product.soldToNewBuyersCheckedAt
    }
    fs.writeFileSync(cftPath, `${JSON.stringify(products, null, 2)}\n`)
    const withoutField = rankBestFor(useCase, 'en')
    assert.ok(
      withoutField.unrankedUsd.some(r => r.slug === 'crypto-fund-trader' && r.products.some(p => p.productSlug === 'break')),
      'without soldToNewBuyers, Break still appears in unrankedUsd',
    )

    // Positive control: explicit false removes the CFT USD footnote card only.
    breakProduct.soldToNewBuyers = false
    breakProduct.soldToNewBuyersCheckedAt = '2026-11-06'
    fs.writeFileSync(cftPath, `${JSON.stringify(products, null, 2)}\n`)
    const overlaid = rankBestFor(useCase, 'en')
    assert.deepEqual(
      overlaid.ranked.map(rankedIdentity),
      withoutField.ranked.map(rankedIdentity),
      'Track A must not change numbered low-drawdown ranking',
    )
    assert.ok(!overlaid.unrankedUsd.some(r => r.slug === 'crypto-fund-trader'), 'CFT Break USD card gone')
    assert.ok(
      overlaid.unrankedUsd.every(row => row.products.every(p => p.soldToNewBuyers !== false)),
      'unrankedUsd must not include soldToNewBuyers===false products',
    )
    console.log('  Track A unsold USD footnote filter', {
      ranked: overlaid.ranked.length,
      unrankedUsd: overlaid.unrankedUsd.length,
      cftRank: overlaid.ranked.findIndex(r => r.slug === 'crypto-fund-trader') + 1,
    })
  } finally {
    fs.writeFileSync(cftPath, original)
  }
}

// B1 overlay: Break+Ascend+Flex+Alpha Three soldToNewBuyers=false — products leave every best-for list.
{
  const files = {
    'crypto-fund-trader': [
      ['break', '2026-11-06'],
      ['ascend', '2026-10-20'],
    ],
    'my-funded-futures': [['flex', '2026-10-26']],
    'alpha-capital': [['alpha-three', '2026-10-20']],
  }
  const backups = {}
  try {
    for (const [firm, marks] of Object.entries(files)) {
      const p = path.join(process.cwd(), 'content/data/challenges', `${firm}.json`)
      backups[p] = fs.readFileSync(p, 'utf8')
      const products = JSON.parse(backups[p])
      for (const [slug, checked] of marks) {
        const hit = products.find(x => x.productSlug === slug)
        assert.ok(hit, `${firm}/${slug}`)
        hit.soldToNewBuyers = false
        hit.soldToNewBuyersCheckedAt = checked
      }
      fs.writeFileSync(p, `${JSON.stringify(products, null, 2)}\n`)
    }
    const low = BEST_FOR_USE_CASES.find(u => u.id === 'low-drawdown')
    const { ranked, unrankedUsd } = rankBestFor(low, 'en')
    const cft = ranked.find(r => r.slug === 'crypto-fund-trader')
    assert.ok(cft)
    assert.equal(ranked.indexOf(cft) + 1, 13)
    assert.deepEqual(cft.sortKeys, [6, 4])
    assert.ok(!cft.products.some(p => p.productSlug === 'break' || p.productSlug === 'ascend'))
    assert.ok(cft.products.map(p => p.productSlug).includes('accelerated'))
    assert.ok(cft.products.map(p => p.productSlug).includes('instant'))
    assert.ok(!unrankedUsd.some(r => r.slug === 'crypto-fund-trader'))
    const mff = ranked.find(r => r.slug === 'my-funded-futures')
    assert.ok(mff && !mff.products.some(p => p.productSlug === 'flex'))
    const alpha = ranked.find(r => r.slug === 'alpha-capital')
    assert.ok(alpha && !alpha.products.some(p => p.productSlug === 'alpha-three'))
    console.log('  B1 primaryProducts overlay', {
      cftRank: ranked.indexOf(cft) + 1,
      cftProducts: cft.products.map(p => p.productSlug),
      mffProducts: mff.products.map(p => p.productSlug),
      alphaProducts: alpha.products.map(p => p.productSlug),
    })
  } finally {
    for (const [p, body] of Object.entries(backups)) fs.writeFileSync(p, body)
  }
}

// B2: news-trading product filter — rules.news === true only (restricted must not leak via firm flag).
{
  const useCase = BEST_FOR_USE_CASES.find(u => u.id === 'news-trading')
  const { ranked } = rankBestFor(useCase, 'en')
  for (const row of ranked) {
    for (const product of row.products) {
      assert.equal(
        product.rules?.news,
        true,
        `news-trading products must have rules.news===true (got ${product.rules?.news} on ${row.slug}/${product.productSlug})`,
      )
    }
  }
  const fxify = ranked.find(r => r.slug === 'fxify')
  assert.ok(fxify, 'FXIFY in news-trading')
  assert.ok(!fxify.products.some(p => p.productSlug === 'lightning-challenge'), 'Lightning restricted must not qualify')
  assert.ok(fxify.products.some(p => p.productSlug === 'two-phase-pro'), 'Two Phase Pro remains')
  assert.equal(fxify.fieldValues.payoutFirstDays, '10', 'FXIFY first payout from Two Phase Pro, not Lightning 7d')
  const cti = ranked.find(r => r.slug === 'city-traders-imperium')
  assert.ok(cti)
  assert.equal(cti.fieldValues.profitSplitPct, '80')
  assert.equal(cti.fieldValues.payoutFirstDays, '5')
  const e8 = ranked.find(r => r.slug === 'e8-markets')
  assert.ok(e8)
  assert.ok(e8.products.some(p => p.productSlug === 'e8-signature'))
  assert.equal(e8.fieldValues.payoutFirstDays, '3')
  console.log('  B2 news-trading product news===true filter', {
    fxifyDays: fxify.fieldValues.payoutFirstDays,
    ctiDays: cti.fieldValues.payoutFirstDays,
    e8Days: e8.fieldValues.payoutFirstDays,
  })
}

// Sort rules present for every id (base RU copy has no CTA overlay — that is data-driven)
for (const id of Object.keys(BEST_FOR_SLUGS)) {
  assert.ok(BEST_FOR_SORT_RULES[id]?.en)
  assert.ok(BEST_FOR_SORT_RULES[id]?.ru)
  assert.ok(!BEST_FOR_SORT_RULES[id].ru.includes('Сначала идут фирмы'), `${id} base RU rule must not hardcode CTA overlay`)
  assert.ok(!/партнёрский статус не/i.test(BEST_FOR_SORT_RULES[id].ru), `${id} RU must not claim affiliate does not affect order`)
}

// ruBestForCtaRankNote — combinations (pin+unclear / open+unclear / no-open / pin-restricted / mixed / unclear-then-restricted)
{
  const pinName = 'BrightFunded'
  const withPin = ruBestForCtaRankNote([
    { slug: 'bright-funded', russiaStatus: 'available', firm: { name: pinName } },
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    { slug: 'fundingpips', russiaStatus: 'unclear', firm: { name: 'FundingPips' } },
  ])
  assert.equal(withPin, ruBestForCtaRankNotePinned(pinName))
  assert.equal(
    withPin,
    'Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки; среди них первым стоит наш партнёр BrightFunded. Затем — фирмы, у которых статус для РФ неясен. Внутри групп порядок определяется данными, указанными выше.',
  )

  const openNoPin = ruBestForCtaRankNote([
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    { slug: 'hash-hedge', russiaStatus: 'unclear', firm: { name: 'Hash Hedge' } },
  ])
  assert.equal(openNoPin, RU_BEST_FOR_CTA_RANK_NOTE_OPEN)
  assert.ok(!openNoPin.includes('партнёр'))
  assert.match(openNoPin, /России нет в списке ограничений на дату проверки/)

  const noOpen = ruBestForCtaRankNote([
    { slug: 'fundednext', russiaStatus: 'restricted', firm: { name: 'FundedNext' } },
    { slug: 'fundingpips', russiaStatus: 'unclear', firm: { name: 'FundingPips' } },
  ])
  assert.equal(noOpen, '')

  // Pin present but not available → open lead without partner; restricted-only follow
  const pinRestricted = ruBestForCtaRankNote([
    { slug: 'bright-funded', russiaStatus: 'restricted', firm: { name: pinName } },
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
  ])
  assert.equal(
    pinRestricted,
    'Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки. Затем — фирмы, у которых Россия в списке ограничений. Внутри групп порядок определяется данными, указанными выше.',
  )
  assert.ok(!pinRestricted.includes('партнёр'))

  // Mixed non-open order (restricted before unclear) — matches best-for RU data sort
  const mixed = ruBestForCtaRankNote([
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    { slug: 'the5ers', russiaStatus: 'restricted', firm: { name: 'The5ers' } },
    { slug: 'hash-hedge', russiaStatus: 'unclear', firm: { name: 'Hash Hedge' } },
  ])
  assert.equal(
    mixed,
    'Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки. Затем — остальные фирмы (статус для РФ неясен или Россия в списке ограничений). Внутри групп порядок определяется данными, указанными выше.',
  )

  // Unclear then restricted in listed order
  const unclearThenRestricted = ruBestForCtaRankNote([
    { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    { slug: 'hash-hedge', russiaStatus: 'unclear', firm: { name: 'Hash Hedge' } },
    { slug: 'the5ers', russiaStatus: 'restricted', firm: { name: 'The5ers' } },
  ])
  assert.equal(
    unclearThenRestricted,
    'Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки. Затем — фирмы, у которых статус для РФ неясен. В конце — фирмы, у которых Россия в списке ограничений. Внутри групп порядок определяется данными, указанными выше.',
  )

  // Only available → omit note
  assert.equal(
    ruBestForCtaRankNote([
      { slug: 'crypto-fund-trader', russiaStatus: 'available', firm: { name: 'Crypto Fund Trader' } },
    ]),
    '',
  )

  // Live pages
  const beginnersRu = buildBestForPageModel('beginners', 'ru')
  assert.equal(ruBestForCtaRankNote(beginnersRu.ranked), ruBestForCtaRankNotePinned('BrightFunded'))
  assert.ok(beginnersRu.sortRule.includes(ruBestForCtaRankNotePinned('BrightFunded')))
  const newsRu = buildBestForPageModel('news-trading', 'ru')
  const newsNote = ruBestForCtaRankNote(newsRu.ranked)
  assert.ok(newsNote.includes('остальные фирмы (статус для РФ неясен или Россия в списке ограничений)'))
  assert.ok(!newsNote.includes('партнёр'))
  assert.ok(newsRu.sortRule.includes(newsNote))
  const weeklyRu = buildBestForPageModel('weekly-payouts', 'ru')
  assert.equal(weeklyRu.sortRule, BEST_FOR_SORT_RULES['weekly-payouts'].ru)
  assert.equal(ruBestForCtaRankNote(weeklyRu.ranked), '')
  assert.ok(!weeklyRu.sortRule.includes('Сначала идут фирмы'))
  // No «открыты/закрыты для РФ» on any RU best-for model copy
  for (const model of getBestForPageModels().filter(m => m.lang === 'ru')) {
    assert.ok(!/открыт[аы]? для РФ|закрыт[аы]? для РФ|открытые для трейдеров из РФ/i.test(model.sortRule), model.path)
    assert.ok(!/открыт[аы]? для РФ|закрыт[аы]? для РФ/i.test(model.useCase.intro.ru), model.path + ' intro')
  }
  console.log('  ruBestForCtaRankNote cases: pin / open-no-pin / no-open / mixed / ordered OK')
}

// EN best-for routes must ship their own English root layout (CSS/header/nav).
{
  const enDirs = [
    'best-prop-firms-for-beginners',
    'best-prop-firms-for-eas',
    'best-prop-firms-for-low-drawdown',
    'best-prop-firms-for-news-trading',
    'best-prop-firms-for-no-time-limit',
    'best-prop-firms-for-scalping',
    'best-prop-firms-for-small-accounts',
  ]
  for (const dir of enDirs) {
    const layout = fs.readFileSync(`app/${dir}/layout.tsx`, 'utf8')
    assert.match(layout, /EnglishRootLayout/)
    assert.match(layout, /siteMetadata/)
  }
  const pageSource = fs.readFileSync('components/BestForPage.tsx', 'utf8')
  assert.ok(!/не индексируется|This page is noindex|Страница пока noindex|noindex until gate passes/.test(pageSource))
  assert.match(pageSource, /data-best-for-gate-reasons/)
  assert.match(pageSource, /AffiliateDisclosure lang=\{lang\}/)
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

function visibleBestForText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
}

const INTERNAL_GATE_VISIBLE = [
  { name: 'noindex', re: /\bnoindex\b/i },
  { name: 'content/verdicts', re: /content\/verdicts/i },
  { name: 'не индексируется', re: /не индексируется/ },
  { name: 'gate', re: /\bgate\b/i },
  { name: 'This page is noindex', re: /This page is noindex/i },
  { name: 'Страница пока noindex', re: /Страница пока noindex/ },
  { name: 'missing writer verdict', re: /missing writer verdict/i },
]

// Mirror lib/ruDisclosure.ruDisclosureHref without importing the TS module (JSON attribute).
const ruDisclosureCopy = JSON.parse(fs.readFileSync('content/data/ru-how-we-make-money.json', 'utf8'))
const ruDisclosurePath = ruDisclosureCopy.published === true ? '/ru/kak-my-zarabatyvaem' : '/how-we-make-money'
assert.match(
  fs.readFileSync('components/AffiliateDisclosure.tsx', 'utf8'),
  /ruDisclosureHref\(\)/,
  'RU disclosure href must come from ruDisclosureHref()',
)

for (const model of getBestForPageModels()) {
  const { status, html } = await get(model.path)
  assert.equal(status, 200, model.path)
  assert.equal(isNoindex(html), !model.indexable)
  assert.match(html, /data-best-for-sort-rule=/)
  assert.match(html, /data-affiliate-disclosure|affiliate|disclosure/i)
  if (!model.indexable) {
    assert.ok(!locs.has(model.path), `${model.path} in sitemap while noindex`)
    assert.match(html, /data-best-for-gate=["']noindex["']/, `${model.path} needs data-best-for-gate`)
    assert.match(html, /data-best-for-gate-reasons=/, `${model.path} needs data-best-for-gate-reasons`)
  } else {
    assert.ok(!/data-best-for-gate=["']noindex["']/.test(html), `${model.path} indexable must not mark noindex gate`)
  }
  const visible = visibleBestForText(html)
  for (const { name, re } of INTERNAL_GATE_VISIBLE) {
    assert.ok(!re.test(visible), `${model.path} visible text must not contain ${name}`)
  }
  if (model.lang === 'ru') {
    assert.ok(!/bybit/i.test(html))
    assert.match(html, /Раскрытие информации:/, `${model.path} RU disclosure label`)
    assert.match(
      html,
      new RegExp(`href=["']${ruDisclosurePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`),
      `${model.path} RU disclosure href ${ruDisclosurePath}`,
    )
    assert.match(html, /Как мы зарабатываем/, `${model.path} RU disclosure link text`)
    assert.ok(!/\bDisclosure:\b/.test(visible), `${model.path} must not show English Disclosure label`)
    assert.ok(!/How we make money/.test(visible), `${model.path} must not show English disclosure link`)
    assert.ok(
      !/We may earn a commission if you sign up via eligible links/.test(visible),
      `${model.path} must not show English disclosure body`,
    )
  }
  if (model.path === '/ru/luchshie-prop-firmy-dlya-novichkov') {
    assert.match(html, /data-best-for-excluded-restricted="true"/)
    assert.ok(!/без ссылки регистрации/i.test(html), 'excluded firms must keep sign-up CTAs')
    const excludedCtas = [...html.matchAll(/href="\/go\/([a-z0-9-]+)\?from=ru-best-for-beginners-excluded"/g)].map(m => m[1])
    assert.ok(excludedCtas.includes('the5ers'), 'excluded The5ers keeps /go/ CTA')
    assert.ok(excludedCtas.includes('fundednext'), 'excluded FundedNext keeps /go/ CTA')
    assert.equal(excludedCtas.at(-1), 'fundednext', 'FundedNext last among excluded CTAs')
    // Ranked available CTAs must appear before excluded CTAs (russiaCtaIssues order).
    const firstRanked = html.indexOf('href="/go/bright-funded?from=ru-best-for-beginners"')
    const firstExcludedBlock = html.indexOf('data-best-for-excluded-restricted="true"')
    assert.ok(firstRanked >= 0 && firstExcludedBlock > firstRanked, 'excluded CTA block after ranked list')
  }
}

for (const nested of BEST_FOR_RETIRED_NESTED_PATHS) {
  const { status } = await get(nested)
  assert.equal(status, 404, `${nested} must 404, got ${status}`)
}

// Feature pages: crosslink only when the paired best-for page is indexable (no link to noindex best-for)
for (const slug of ['ea-allowed', 'news-trading']) {
  const { html } = await get(`/prop-firms/${slug}`)
  const href = bestForIndexableFeatureLink(slug)
  if (!href) {
    assert.ok(!html.includes('data-best-for-crosslink'), `${slug} must not link to noindex best-for`)
  } else {
    assert.ok(indexableBestForPaths().includes(href), `${slug} crosslink ${href} must be an indexable best-for path`)
    assert.ok(html.includes(`data-best-for-crosslink="${slug}"`) && html.includes(`href="${href}"`), `${slug} must crosslink to indexable ${href}`)
  }
}

console.log(`PASS best-for gate (live against ${base})`)
