#!/usr/bin/env node
// C15 diagrams (design/article-format-spec.md §4 C15, P3): the path-to-funded flow
// shows only the firm's published values (nothing derived or defaulted), covers
// every fresh product exactly once, and the drawdown diagram is unitless.
// Usage: npm run test:article-diagrams
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
const { buildChallengePaths } = require(path.join(root, 'lib/challengePath.ts'))
const ChallengePath = require(path.join(root, 'components/ChallengePath.tsx')).default
const DrawdownTypesDiagram = require(path.join(root, 'components/DrawdownTypesDiagram.tsx')).default
const { splitArticleDiagrams } = require(path.join(root, 'lib/articleContent.ts'))
const { firmSlug } = require(path.join(root, 'lib/firmSlug.ts'))

const challenges = getAllChallenges()
const firms = getAllFirms()
const clock = new Date(`${challenges.map(product => product.sourceCapturedAt).sort().at(-1)}T12:00:00Z`)
const visibleText = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
let checkedFirms = 0
let checkedGroups = 0

for (const slug of [...new Set(challenges.map(product => product.firmSlug))]) {
  const firm = firms.find(candidate => firmSlug(candidate.name) === slug)
  assert(firm, `${slug}: challenge file has a firms.json record`)
  const products = challenges.filter(product => product.firmSlug === slug && isChallengeFresh(product, clock))
  if (!products.length) continue
  const groups = buildChallengePaths(products)
  assert.equal(groups.flatMap(group => group.products).length, products.length, `${firm.name}: every fresh product is in exactly one group`)
  assert.equal(new Set(groups.flatMap(group => group.products)).size, products.length, `${firm.name}: no product repeated`)
  for (const group of groups) {
    for (const product of group.products) {
      assert.equal(group.phases, product.phases)
      assert.equal(group.stages.length, product.phases, `${firm.name} ${product.productName}: one stage per published phase`)
      group.stages.forEach(stage => {
        const published = product.profitTargets?.[`phase${stage.phase}`]
        assert.equal(stage.targetPct, typeof published === 'number' ? published : null, `${firm.name} ${product.productName} phase ${stage.phase}: target copied, not defaulted`)
      })
      assert.equal(group.profitSplitPct, product.profitSplitPct ?? null)
      assert.equal(group.payoutFirstDays, product.payoutFirstDays ?? null)
      assert.equal(group.limits.dailyLossPct, product.dailyLossPct ?? null)
      assert.equal(group.limits.maxLossPct, product.maxLossPct ?? null)
    }
    checkedGroups += 1
  }
  for (const locale of ['en', 'ru']) {
    const html = renderToStaticMarkup(React.createElement(ChallengePath, { products, firmName: firm.name, firmSlug: slug, locale }))
    const text = visibleText(html)
    assert.equal((html.match(/data-challenge-path-group=/g) ?? []).length, groups.length, `${firm.name} ${locale}: one flow per group (extra groups sit in <details>, not dropped)`)
    for (const group of groups) {
      for (const product of group.products) assert(html.includes(`data-challenge-path-group="${group.products.map(item => item.productSlug).join(',')}"`), `${firm.name}: ${product.productName} has a flow`)
      assert.equal((html.match(/data-challenge-path-step="funded"/g) ?? []).length, groups.length)
      if (group.profitSplitPct != null) assert(text.includes(`${group.profitSplitPct}%`), `${firm.name} ${locale}: published split shown`)
      else assert.match(text, locale === 'en' ? /Profit split not published/ : /Доля трейдера не опубликована/, `${firm.name}: missing split reads not published`)
      if (group.payoutFirstDays == null) assert.match(text, locale === 'en' ? /First payout timing not published/ : /Срок первой выплаты не опубликован/)
      for (const stage of group.stages) {
        if (stage.targetPct != null) assert(text.includes(`${stage.targetPct}%`))
        else assert.match(text, locale === 'en' ? /Profit target not published/ : /Цель по прибыли не опубликована/)
      }
    }
    // Every percentage or day count printed is one the challenge records publish.
    const allowed = new Set(groups.flatMap(group => [
      ...group.stages.map(stage => stage.targetPct), group.profitSplitPct, group.payoutFirstDays, group.minTradingDays, group.maxTradingDays,
      group.limits.dailyLossPct, group.limits.maxLossPct, group.fundedLimits?.dailyLossPct, group.fundedLimits?.maxLossPct,
    ]).filter(value => value != null).map(String))
    const body = text.replace(/Checked[^.]*?20\d\d/, '').replace(/Проверено[^А-Яа-я]*/, '').replace(/\b\d{1,2}[ .]\w+[ .]20\d\d\b/g, '').replace(/\d\d\.\d\d\.20\d\d/g, '')
    for (const match of body.matchAll(/(?<![\w.-])(\d+(?:\.\d+)?)(?=\s?(?:%|days|дн|trading|торг))/g)) {
      assert(allowed.has(match[1]), `${firm.name} ${locale}: "${match[1]}" is a published figure`)
    }
    assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\d\b/, 'no ISO dates in reader-facing text (spec §5)')
    checkedFirms += locale === 'en' ? 1 : 0
  }
}
assert(checkedFirms > 0, 'at least one firm has fresh captures')
assert.equal(renderToStaticMarkup(React.createElement(ChallengePath, { products: [], firmName: 'X', firmSlug: 'x', locale: 'en' })), '', 'no products renders nothing')

// A null field is rendered as "not published", never filled in.
const probe = { ...challenges.find(product => product.phases === 2), productSlug: 'probe', productName: 'Probe 2-Step', profitSplitPct: null, payoutFirstDays: null, profitTargets: { phase1: 8, phase2: null }, dailyLossPct: null, maxLossPct: null, drawdownType: null, payoutFrequency: null }
const probeText = visibleText(renderToStaticMarkup(React.createElement(ChallengePath, { products: [probe], firmName: 'Probe', firmSlug: 'probe', locale: 'en' })))
assert.match(probeText, /Profit split not published/)
assert.match(probeText, /First payout timing not published/)
assert.match(probeText, /Loss limits not published/)
assert.match(probeText, /8% profit target/)
assert.match(probeText, /Profit target not published/)

// Drawdown diagram: unitless illustration, all three floors, both locales.
for (const locale of ['en', 'ru']) {
  const html = renderToStaticMarkup(React.createElement(DrawdownTypesDiagram, { locale }))
  for (const kind of ['static', 'realtime', 'eod']) assert(html.includes(`data-drawdown-panel="${kind}"`), `${locale}: ${kind} panel`)
  assert.equal((html.match(/<polyline class="drawdown-types__floor"/g) ?? []).length, 3)
  assert.doesNotMatch(visibleText(html), /[$€%]|\d{2,}/, `${locale}: diagram prints no money, percentage or balance figures`)
}

// Slot handling.
const sample = '<h2>A</h2><div data-article-diagram="drawdown-types"></div><h3>B</h3><div data-article-diagram="nope"></div>'
const segments = splitArticleDiagrams(sample)
assert.deepEqual(segments.map(segment => segment.kind), ['html', 'diagram', 'html'])
assert(segments[2].html.includes('data-article-diagram="nope"'), 'unknown slot names are left alone')
assert.deepEqual(splitArticleDiagrams('<p>x</p>'), [{ kind: 'html', html: '<p>x</p>' }], 'articles without a slot are one untouched segment')
const guide = fs.readFileSync(path.join(root, 'content/posts/balance-based-drawdown-vs-equity-based-drawdown.md'), 'utf8')
assert.equal((guide.match(/data-article-diagram="drawdown-types"/g) ?? []).length, 1, 'EN drawdown guide has the slot once')

// Callers.
const blog = fs.readFileSync(path.join(root, 'app/blog/[slug]/page.tsx'), 'utf8')
assert.match(blog, /<ChallengePath\s+products=\{freshFirmProducts\}/, 'EN review path diagram uses fresh products only')
assert.match(fs.readFileSync(path.join(root, 'app/ru/obzor-bright-funded/page.tsx'), 'utf8'), /<ChallengePath products=\{freshProducts\}/, 'RU BrightFunded path diagram uses fresh products only')
assert.match(fs.readFileSync(path.join(root, 'components/RussianPartnerReview.tsx'), 'utf8'), /<ChallengePath products=\{freshProducts\}/, 'RU partner review path diagram uses fresh products only')
assert.match(fs.readFileSync(path.join(root, 'app/ru/kak-rabotayut-chellendzhi-prop-firm/page.tsx'), 'utf8'), /<DrawdownTypesDiagram locale="ru"/, 'RU challenge guide has the drawdown diagram')

console.log(`test:article-diagrams ok (${checkedFirms} firms, ${checkedGroups} product groups, clock ${clock.toISOString().slice(0, 10)})`)
