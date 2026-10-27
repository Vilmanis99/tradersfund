#!/usr/bin/env node
// C5 PriceMatrix (design/article-format-spec.md §4): every priced cell is the
// firm's own captured fee for that exact tier, in its own currency, and the
// matrix shows exactly as many prices as the fresh captures publish.
// Usage: npm run test:price-matrix
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'test:server-only', shortCircuit: true }
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:')
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local && local.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'test:server-only') return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

const { getAllChallenges, getAllFirms, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
const { buildPriceMatrix } = require(path.join(root, 'lib/priceMatrix.ts'))
const PriceMatrix = require(path.join(root, 'components/PriceMatrix.tsx')).default
const { firmSlug } = require(path.join(root, 'lib/firmSlug.ts'))

const positive = value => value != null && Number.isFinite(value) && value > 0
const challenges = getAllChallenges()
const firms = getAllFirms()
// Run at the newest capture date so the check exercises real data even when the
// wall clock has moved past the 30-day window.
const clock = new Date(`${challenges.map(product => product.sourceCapturedAt).sort().at(-1)}T12:00:00Z`)
let checkedFirms = 0
let checkedCells = 0

for (const slug of [...new Set(challenges.map(product => product.firmSlug))]) {
  const firm = firms.find(candidate => firmSlug(candidate.name) === slug)
  assert(firm, `${slug}: challenge file has a firms.json record`)
  const products = challenges.filter(product => product.firmSlug === slug && isChallengeFresh(product, clock))
  if (!products.length) continue
  const matrix = buildPriceMatrix(products, firm.name)
  const expected = products.flatMap(product => product.accountSizes
    .filter(tier => positive(tier.priceUsd) || positive(tier.priceEur))
    .map(tier => ({ product, tier })))
  assert.equal(matrix.pricedCount, expected.length, `${firm.name}: one matrix cell per priced fresh tier`)
  for (const { product, tier } of expected) {
    const column = matrix.columns.findIndex(item => item.product === product)
    const row = matrix.rows.find(item => item.sizeUsd === tier.sizeUsd)
    assert(column >= 0 && row, `${firm.name} ${product.productName} $${tier.sizeUsd}: tier has a cell`)
    const cell = row.cells[column]
    assert.equal(cell.kind, 'price')
    // Never converted: USD when the capture has USD, else the captured EUR.
    if (positive(tier.priceUsd)) assert.deepEqual([cell.currency, cell.amount], ['USD', tier.priceUsd], `${firm.name} ${product.productName} $${tier.sizeUsd}: USD fee unchanged`)
    else assert.deepEqual([cell.currency, cell.amount], ['EUR', tier.priceEur], `${firm.name} ${product.productName} $${tier.sizeUsd}: EUR fee unchanged`)
    assert.equal(cell.monthly, product.pricingModel === 'monthly-subscription', 'monthly billing is labelled')
    assert.equal(cell.payLaterUsd, positive(tier.payLaterUsd) ? tier.payLaterUsd : null, 'pay-later amount is carried, not dropped')
    checkedCells += 1
  }
  for (const row of matrix.rows) assert(row.cells.some(cell => cell.kind === 'price'), `${firm.name}: no empty size rows`)
  const sizes = matrix.rows.map(row => row.sizeUsd)
  assert.deepEqual(sizes, [...sizes].sort((a, b) => a - b), `${firm.name}: sizes ascend`)

  for (const locale of ['en', 'ru']) {
    const html = renderToStaticMarkup(React.createElement(PriceMatrix, {
      products, firmName: firm.name, firmSlug: firmSlug(firm.name), locale, ariaLabel: 'test',
      'data-test-count': matrix.pricedCount,
    }))
    assert.equal((html.match(/data-price-cell=/g) ?? []).length, expected.length, `${firm.name} ${locale}: rendered priced cells`)
    assert(html.includes(`data-test-count="${expected.length}"`), 'data-* markers reach the table')
    const visible = html.replace(/<[^>]+>/g, ' ')
    assert.doesNotMatch(visible, /\b20\d\d-\d\d-\d\d\b/, `${firm.name} ${locale}: no ISO dates in reader-facing text (spec §5)`)
    if (locale === 'ru') assert.match(visible, /\d\d\.\d\d\.20\d\d/, `${firm.name}: RU date is DD.MM.YYYY`)
    else assert.match(visible, /\d{1,2} [A-Z][a-z]{2} 20\d\d/, `${firm.name}: EN date is D Mon YYYY`)
    if (expected.some(({ tier }) => !positive(tier.priceUsd))) assert(html.includes('€'), `${firm.name}: EUR fees keep the euro sign`)
    // A conditional refund (refundAfterPayouts) is labelled with its condition, never a flat "Fee refunded".
    const conditional = matrix.columns.filter(column => column.refundUniform && column.refundable === true && column.refundAfterPayouts && !column.refundConflictCheckedAt)
    assert.equal((html.match(/data-price-matrix-refund-after=/g) ?? []).length, conditional.length, `${firm.name} ${locale}: one conditional-refund label per conditional product`)
    for (const column of conditional) {
      const label = locale === 'en' ? `Refunded after ${column.refundAfterPayouts}` : `Возврат после ${column.refundAfterPayouts}-й выплаты`
      assert(html.includes(label), `${firm.name} ${locale} ${column.product.productSlug}: refund condition shown`)
    }
  }
  checkedFirms += 1
}
assert(checkedFirms > 0, 'at least one firm has fresh captures')

// Callers: EN reviews and RU review pages pass fresh products only.
const blog = fs.readFileSync(path.join(root, 'app/blog/[slug]/page.tsx'), 'utf8')
assert.match(blog, /<PriceMatrix\s+products=\{freshFirmProducts\}/, 'EN review matrix uses fresh products only')
const bright = fs.readFileSync(path.join(root, 'app/ru/obzor-bright-funded/page.tsx'), 'utf8')
assert.match(bright, /<PriceMatrix\s+products=\{freshProducts\}[\s\S]*?data-russian-bright-price-count=\{pricedTiers\.length\}/, 'RU BrightFunded matrix keeps the crawl price-count marker')
const partner = fs.readFileSync(path.join(root, 'components/RussianPartnerReview.tsx'), 'utf8')
assert.match(partner, /<PriceMatrix\s+products=\{freshProducts\}/, 'RU partner review matrix uses fresh products only')

console.log(`test:price-matrix ok (${checkedFirms} firms, ${checkedCells} priced cells, clock ${clock.toISOString().slice(0, 10)})`)
