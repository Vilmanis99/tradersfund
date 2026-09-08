/** Render actual Russian page components under an isolated clock; never change capture files. */
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
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
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
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

const RealDate = Date
let clock = new RealDate().toISOString()
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [clock])) }
  static now() { return new RealDate(clock).getTime() }
}
const errors = []
try {
  assert.match(fs.readFileSync(path.join(root, 'app/ru/layout.tsx'), 'utf8'), /export const revalidate = 3600\b/, 'Russian layout must re-run age gates without a deployment')
  const pages = fs.readdirSync(path.join(root, 'app/ru'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'app/ru', entry.name, 'page.tsx')))
    .map(entry => entry.name)
  pages.unshift('')
  if (process.argv.includes('--built')) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.next/prerender-manifest.json'), 'utf8'))
    for (const slug of pages) {
      const route = slug ? `/ru/${slug}` : '/ru'
      const interval = manifest.routes[route]?.initialRevalidateSeconds
      assert(typeof interval === 'number' && interval > 0 && interval <= 3600, `${route}: built route must inherit hourly regeneration`)
    }
  }
  const { getAllChallenges, getAllFirms, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
  const { getAuthorBySlug } = require(path.join(root, 'lib/authors.ts'))
  const edris = getAuthorBySlug('edris-derakhshi')
  assert.equal(edris.role, 'Author', 'the confirmed TFH role is author, not founder')
  assert.doesNotMatch(`${edris.short} ${edris.long}`, /founded Traders Fund Hub|funded trader since|personally funded|verifies every payout|five years of trading funded/i, 'unsupported experience claims must not return')
  assert(edris.references.some(reference => reference.url === 'https://tradingrage.com/about'), 'TradingRage founder claim has public evidence')
  const authorModule = require(path.join(root, 'app/authors/[slug]/page.tsx'))
  const authorProps = { params: Promise.resolve({ slug: edris.slug }) }
  const authorHtml = renderToStaticMarkup(await authorModule.default(authorProps))
  const authorMetadata = await authorModule.generateMetadata(authorProps)
  assert.equal(authorMetadata.description, edris.short)
  assert(authorHtml.includes('Selected work and biography sources'))
  for (const reference of edris.references) assert(authorHtml.includes(reference.url), 'biography evidence is visible on the actual author page')
  const person = [...authorHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1])).find(item => item['@type'] === 'Person')
  assert.equal(person?.jobTitle, 'Author', 'Person schema does not restore founder status')
  assert.equal(person?.description, edris.short)
  const { getRussianReviewFinderHref, getRussianFinderRows } = require(path.join(root, 'lib/challengeComparisonData.ts'))
  const reviewed = {
    'obzor-ftmo': ['ftmo'], 'obzor-fundednext': ['fundednext'], 'obzor-bright-funded': ['bright-funded'],
    'obzor-fundingpips': ['fundingpips'], 'fundednext-vs-bright-funded': ['fundednext', 'bright-funded'],
    'fundednext-vs-fundingpips': ['fundednext', 'fundingpips'],
  }
  const products = getAllChallenges().filter(product => ['ftmo', 'fundednext', 'bright-funded', 'fundingpips'].includes(product.firmSlug))
  const offset = (date, days) => new RealDate(new RealDate(`${date}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)
  const boundaries = products.flatMap(product => [offset(product.sourceCapturedAt, 30), offset(product.sourceCapturedAt, 31)])
  const dates = [...new Set([new RealDate().toISOString().slice(0, 10), ...boundaries, offset(boundaries.sort().at(-1), 365)])].sort()
  for (const date of dates) {
    clock = `${date}T12:00:00Z`
    for (const slug of pages) {
      try {
        const Page = require(path.join(root, 'app/ru', slug, 'page.tsx')).default
        const html = renderToStaticMarkup(React.createElement(Page))
        assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'one H1 survives expiry')
        assert.doesNotMatch(html, /(?:NaN|Infinity|Invalid Date)/, 'no invalid number/date')
        assert.doesNotMatch(html, /Основатель Traders Fund Hub|funded-трейдер с 2020 года/iu, 'Russian pages do not invent the author’s founder or funded-trading history')
        if (slug === 'luchshie-prop-firmy') {
          assert.equal((html.match(/data-russian-ranking="single-directory"/g) ?? []).length, 1, 'one full editorial directory')
          assert.equal((html.match(/data-russian-ranking-partners="single-section"/g) ?? []).length, 1, 'one consolidated partner section')
          assert(!html.includes('data-russian-ranking="top-five"') && !html.includes('data-russian-ranking-partner-matrix'), 'no duplicate ranking cards or partner table')
          for (const anchor of ['top-5', 'partner-matrix', 'polnyy-reyting', 'podbor']) assert.equal((html.match(new RegExp(`id="${anchor}"`, 'g')) ?? []).length, 1, `preserve exactly one ${anchor} anchor`)
          const allProducts = getAllChallenges()
          const expectedFirms = getAllFirms().filter(firm => {
            const firmSlug = firm.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            const scoped = allProducts.filter(product => product.firmSlug === firmSlug)
            return scoped.length > 0 && scoped.every(product => isChallengeFresh(product))
          })
          assert.equal((html.match(/data-ranked-firm=/g) ?? []).length, expectedFirms.length, 'consolidation retains all fresh directory firms, expiry removes stale rows')
          const Finder = require(path.join(root, 'components/RussianChallengeFinder.tsx')).default
          for (const row of getRussianFinderRows().filter(row => row.product.phases === 0)) {
            // Isolate copy rendering at the server's default size. This synthetic size
            // is test-only; real tier availability is covered by finder projection tests.
            const fixture = { ...row, product: { ...row.product, tiers: [{ ...row.product.tiers[0], sizeUsd: 50000 }] } }
            const card = renderToStaticMarkup(React.createElement(Finder, { initialRows: [fixture] }))
            assert(!card.includes('после оценки'), 'instant-only finder does not describe a nonexistent evaluation')
            assert(card.includes('для начала участия'), 'instant cost explanation uses participation, not passing')
          }
        }
        if (['obzor-fundednext', 'obzor-bright-funded', 'obzor-fundingpips', 'obzor-ftmo'].includes(slug)) {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ')
          assert.doesNotMatch(visible, /\bCTA\b|\bcheckout\b|\bgates?\b|\bsnapshot\b|захват[а-яё]*|challengeTierEconomics|\bnull\b/iu, 'no internal editorial/implementation jargon in the four main reviews')
          assert(visible.includes('Автор: Edris Derakhshi'), 'established author is visible')
          assert(!html.includes('Tara Mohseni') && !html.includes('tara-mohseni'), 'do not misattribute the Russian review')
          const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
          const article = jsonLd.find(item => item['@type'] === 'Article')
          assert.equal(article?.author?.name, 'Edris Derakhshi', 'structured author agrees with the byline')
          const handoff = getRussianReviewFinderHref(slug.replace('obzor-', ''))
          assert(html.includes(handoff.replace(/&/g, '&amp;')), 'reader can carry a comparison into the finder')
        }
        if (reviewed[slug]) {
          const scoped = products.filter(product => reviewed[slug].includes(product.firmSlug))
          const needsRecapture = !scoped.length || scoped.some(product => !isChallengeFresh(product))
          assert.equal(html.includes('data-russian-source-status="recapture-required"'), needsRecapture, 'visible dated notice tracks relevant sources')
          if (needsRecapture) assert(html.includes('/ru/luchshie-prop-firmy#podbor'), 'expired reviews retain a finder handoff')
        }
        if (slug === 'fundednext-vs-fundingpips') {
          const fresh = products.filter(product => ['fundednext', 'fundingpips'].includes(product.firmSlug) && isChallengeFresh(product))
          assert(html.includes(`data-russian-comparison-product-count="${fresh.length}"`))
          const pairs = [['instant', 'stellar-instant', 'zero'], ['one-step', 'stellar-1-step', '1-step-flex'], ['two-step', 'stellar-2-step', '2-step-pro']]
          for (const [kind, left, right] of pairs) {
            const complete = fresh.some(product => product.firmSlug === 'fundednext' && product.productSlug === left)
              && fresh.some(product => product.firmSlug === 'fundingpips' && product.productSlug === right)
            assert.equal(html.includes(`data-russian-comparison-pair="${kind}"`), complete, 'only complete fresh pairs appear')
          }
        }
      } catch (error) { errors.push(`${date} /ru/${slug}: ${error.message}`) }
    }
  }
  assert.deepEqual(errors, [])
  console.log(`Russian expiry rendering passed: ${pages.length} pages × ${dates.length} dates, covering source day-30/day-31 boundaries.`)
} finally {
  globalThis.Date = RealDate
  hooks.deregister()
}
