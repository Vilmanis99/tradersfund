/**
 * Best-for reader copy must not leak internal field names / Tracker jargon.
 * Usage: node scripts/test-best-for-plain-copy.mjs
 * Live:  node scripts/test-best-for-plain-copy.mjs http://127.0.0.1:PORT
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  BEST_FOR_SORT_RULES,
  BEST_FOR_USE_CASES,
  BEGINNER_MAX_ENTRY_PRICE_EUR,
  BEGINNER_MAX_ENTRY_PRICE_USD,
  getBestForPageModels,
  buildBestForPageModel,
} from '../lib/bestFor.ts'
import { getChallengesByFirm } from '../lib/firms.ts'

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? null

const FORBIDDEN = [
  { name: 'russiaStatus', re: /russiaStatus/i },
  { name: 'restricted', re: /\brestricted\b/i },
  { name: 'null', re: /\bnull\b/i },
  { name: 'unknown', re: /\bunknown\b/i },
  { name: 'Tracker', re: /\bTracker\b/ },
  { name: 'priceUsd', re: /priceUsd/ },
  { name: 'priceEur', re: /priceEur/ },
  { name: 'sizeUsd', re: /sizeUsd/ },
  { name: 'maxLossPct', re: /maxLossPct/ },
  { name: 'dailyLossPct', re: /dailyLossPct/ },
  { name: 'payoutFirstDays', re: /payoutFirstDays/ },
]

function assertClean(label, text) {
  assert.equal(typeof text, 'string', label)
  for (const { name, re } of FORBIDDEN) {
    assert.ok(!re.test(text), `${label} must not contain ${name}: ${text.slice(0, 180)}`)
  }
}

function readerFacingFromHtml(html) {
  const metas = []
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0]
    const content = tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2]
    if (content) metas.push(content)
  }
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1])
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(m => m[1])
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return [...metas, ...jsonLd, ...titles, visible].join('\n')
}

// Static sort-rule + use-case copy
for (const [id, rule] of Object.entries(BEST_FOR_SORT_RULES)) {
  assertClean(`BEST_FOR_SORT_RULES.${id}.en`, rule.en)
  assertClean(`BEST_FOR_SORT_RULES.${id}.ru`, rule.ru)
  if (id === 'beginners') {
    assert.match(rule.en, /Affiliate status is not used/)
    assert.ok(!/Affiliate status is not used/i.test(rule.ru))
    assert.ok(!/Russia|russiaStatus|RF only/i.test(rule.en) || /currency/.test(rule.en))
    assert.ok(!/\bRussia\b/.test(rule.en), 'EN beginners must not mention the RU-only Russia filter')
  } else {
    // RU base rules never claim affiliate does not affect order
    assert.ok(!/партнёрский статус не|Affiliate status is not used/i.test(rule.ru))
  }
}

for (const useCase of BEST_FOR_USE_CASES) {
  for (const lang of ['en', 'ru']) {
    for (const key of ['intro', 'methodology', 'metaDescription', 'metaTitle', 'h1']) {
      assertClean(`${useCase.id}.${key}.${lang}`, useCase[key][lang])
    }
    if (useCase.dataNote) assertClean(`${useCase.id}.dataNote`, useCase.dataNote)
  }
}

// Built page models (includes data-driven RU note)
for (const model of getBestForPageModels()) {
  assertClean(`${model.path} sortRule`, model.sortRule)
  assertClean(`${model.path} h1`, model.h1)
  assertClean(`${model.path} metaTitle`, model.metaTitle)
  assertClean(`${model.path} metaDescription`, model.metaDescription)
  for (const reason of model.reasons) assertClean(`${model.path} reason`, reason)
}

// RU Writer: never «открыты/закрыты для РФ» on best-for copy
for (const model of getBestForPageModels().filter(m => m.lang === 'ru')) {
  assert.ok(!/открыт[аы]? для РФ|закрыт[аы]? для РФ|открытые для трейдеров из РФ/i.test(model.sortRule), model.path)
  assert.ok(!/открыт[аы]? для РФ|закрыт[аы]? для РФ/i.test(model.useCase.intro.ru), `${model.path} intro`)
  assert.ok(!/Недоступно для РФ/.test(model.sortRule))
}
assert.ok(!/закрыт[аы]? для РФ/.test(BEST_FOR_SORT_RULES.beginners.ru))
assert.match(BEST_FOR_SORT_RULES.beginners.ru, /у которых Россия в списке ограничений/)

// EN keeps affiliate line; RU beginners does not
assert.match(BEST_FOR_SORT_RULES.beginners.en, /Affiliate status is not used/)
assert.ok(!/Affiliate status is not used|партнёрский статус не/i.test(BEST_FOR_SORT_RULES.beginners.ru))

// Prices come from challenge captures — no firm fee literals in bestFor.ts source
const bestForSource = fs.readFileSync(new URL('../lib/bestFor.ts', import.meta.url), 'utf8')
const codeNoComments = bestForSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
assert.ok(!/\$29\b|\$40\b|\$79\b/.test(codeNoComments), 'bestFor.ts must not hardcode firm entry fees')
assert.equal(BEGINNER_MAX_ENTRY_PRICE_USD, 99)
assert.equal(BEGINNER_MAX_ENTRY_PRICE_EUR, 99)

const beginnersEn = buildBestForPageModel('beginners', 'en')
const fp = beginnersEn?.ranked.find(row => row.slug === 'fundingpips')
assert.ok(fp, 'FundingPips appears on EN beginners from live challenge data')
const fpProducts = getChallengesByFirm('fundingpips')
const minPrice = Math.min(
  ...fpProducts.flatMap(product => (product.accountSizes ?? [])
    .map(tier => tier.priceUsd)
    .filter(value => typeof value === 'number' && Number.isFinite(value))),
)
assert.ok(Number.isFinite(minPrice), 'FundingPips challenge data has priceUsd tiers')
assert.equal(
  Number(fp.fieldValues.entryPriceUsd),
  minPrice,
  'FundingPips entry on the page must equal min challenge accountSizes.priceUsd (not a hardcoded fee)',
)

// Component source: gate internals must not be visitor-facing copy.
{
  const pageSource = fs.readFileSync(new URL('../components/BestForPage.tsx', import.meta.url), 'utf8')
  for (const leak of ['не индексируется', 'This page is noindex', 'Страница пока noindex', 'noindex until gate passes']) {
    assert.ok(!pageSource.includes(leak), `BestForPage.tsx must not contain visible leak: ${leak}`)
  }
  assert.match(pageSource, /data-best-for-gate-reasons/)
}

console.log('PASS best-for plain copy (unit)')
console.log('  EN beginners:', BEST_FOR_SORT_RULES.beginners.en)
console.log('  RU beginners:', BEST_FOR_SORT_RULES.beginners.ru)
console.log(`  FundingPips EN entry $${fp.fieldValues.entryPriceUsd} (= challenge min)`)

// RU SEO: stem «подтвержд» is banned on RU best-for pages (template + lib copy).
const BANNED_RU_STEM = /подтвержд/i
for (const model of getBestForPageModels().filter(m => m.lang === 'ru')) {
  for (const [k, v] of Object.entries(model.useCase)) {
    if (v && typeof v === 'object' && typeof v.ru === 'string') assert.ok(!BANNED_RU_STEM.test(v.ru), `${model.path} useCase.${k}.ru has «подтвержд»`)
  }
}
for (const [id, rule] of Object.entries(BEST_FOR_SORT_RULES)) assert.ok(!BANNED_RU_STEM.test(rule.ru), `sort rule ${id}.ru has «подтвержд»`)
assert.ok(!BANNED_RU_STEM.test(fs.readFileSync(new URL('../components/BestForPage.tsx', import.meta.url), 'utf8')), 'BestForPage.tsx has «подтвержд»')

if (!base) process.exit(0)

async function get(urlPath) {
  const response = await fetch(`${base}${urlPath}`, { redirect: 'manual' })
  return { status: response.status, html: await response.text() }
}

const GATE_LEAKS = [
  { name: 'noindex', re: /\bnoindex\b/i },
  { name: 'content/verdicts', re: /content\/verdicts/i },
  { name: 'не индексируется', re: /не индексируется/ },
  { name: 'gate', re: /\bgate\b/i },
  { name: 'This page is noindex', re: /This page is noindex/i },
  { name: 'Страница пока noindex', re: /Страница пока noindex/ },
  { name: 'missing writer verdict', re: /missing writer verdict/i },
]

function visibleBody(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
}

const ruModels = getBestForPageModels().filter(m => m.lang === 'ru')
assert.equal(ruModels.length, 6, 'expected 6 RU best-for pages')
for (const model of getBestForPageModels()) {
  const { status, html } = await get(model.path)
  assert.equal(status, 200, model.path)
  assertClean(`${model.path} HTML`, readerFacingFromHtml(html))
  const visible = visibleBody(html)
  for (const { name, re } of GATE_LEAKS) {
    assert.ok(!re.test(visible), `${model.path} visible text must not contain ${name}`)
  }
  if (model.lang === 'ru') {
    assert.match(html, /Раскрытие информации:/)
    assert.ok(!BANNED_RU_STEM.test(visible), `${model.path} visible text must not contain «подтвержд»`)
    assert.ok(!/\bDisclosure:\b/.test(visible), `${model.path} no English Disclosure`)
    assert.ok(!/How we make money/.test(visible), `${model.path} no English how-we-make-money link text`)
  }
}

console.log(`PASS best-for plain copy (live against ${base})`)
