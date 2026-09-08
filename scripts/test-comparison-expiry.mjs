/** Exercise real comparison routes in a warm process, without modifying capture files. */
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
let clock = '2026-09-08T12:00:00Z'
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [clock])) }
  static now() { return new RealDate(clock).getTime() }
}
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
try {
  const { getAllChallenges, getAllFirms, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
  const { getAllCanonicalPairs, getCurrentCanonicalPairs, getOverlay, firmSlug } = require(path.join(root, 'lib/comparisons.ts'))
  const { buildChallengeMatchup, freshChallenges } = require(path.join(root, 'lib/challengeMatchup.ts'))
  const hub = require(path.join(root, 'app/compare/page.tsx'))
  const detail = require(path.join(root, 'app/compare/[matchup]/page.tsx'))
  const products = getAllChallenges()
  const firms = getAllFirms()
  const pairs = getAllCanonicalPairs()
  const offset = (date, days) => new RealDate(new RealDate(`${date}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)
  const dates = [...new Set(['2026-09-08', ...products.flatMap(product => [offset(product.sourceCapturedAt, 30), offset(product.sourceCapturedAt, 31)]), '2030-01-01'])].sort()
  assert.match(fs.readFileSync(path.join(root, 'app/compare/layout.tsx'), 'utf8'), /export const revalidate = 3600\b/)
  if (process.argv.includes('--built')) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.next/prerender-manifest.json'), 'utf8'))
    for (const route of ['/compare', ...pairs.map(pair => `/compare/${pair.matchup}`)]) {
      const interval = manifest.routes[route]?.initialRevalidateSeconds
      assert(typeof interval === 'number' && interval > 0 && interval <= 3600, `${route}: actual build inherits hourly regeneration`)
    }
  }
  assert(getOverlay('ftmo-vs-fundednext'), 'the current editorial comparison remains available')
  // Deliberately move the clock forward, then back, without reloading modules.
  for (const date of [...dates, '2026-09-08']) {
    clock = `${date}T12:00:00Z`
    const current = products.filter(product => isChallengeFresh(product))
    const eligible = new Set(current.map(product => product.firmSlug))
    const expectedPairs = pairs.filter(pair => eligible.has(firmSlug(pair.firmA.name)) && eligible.has(firmSlug(pair.firmB.name)))
    assert.deepEqual(getCurrentCanonicalPairs().map(pair => pair.matchup), expectedPairs.map(pair => pair.matchup), `${date}: directory source gate`)
    for (const firm of firms) {
      const slug = firmSlug(firm.name)
      assert.deepEqual(freshChallenges(slug).map(product => product.productSlug), current.filter(product => product.firmSlug === slug).map(product => product.productSlug), `${date}: warm-process freshness for ${slug}`)
    }
    const hubHtml = renderToStaticMarkup(React.createElement(hub.default))
    const hubMetadata = hub.generateMetadata()
    assert.equal(hubMetadata.title.absolute, `Prop Firm Comparisons (2026): ${expectedPairs.length} Matchups`)
    assert(hubMetadata.description.includes(`${eligible.size} prop firms`))
    assert(hubMetadata.description.includes(`${current.length} fresh products`))
    const linkedPairs = [...hubHtml.matchAll(/data-(?:comparison-matchup|curated-matchup)="([^"]+)"/g)].map(match => match[1]).sort()
    assert.deepEqual(linkedPairs, expectedPairs.map(pair => pair.matchup).sort(), `${date}: real server-rendered directory and metadata agree`)
    const pendingPairs = [...hubHtml.matchAll(/data-pending-matchup="([^"]+)"/g)].map(match => match[1]).sort()
    const currentSlugs = new Set(expectedPairs.map(pair => pair.matchup))
    assert.deepEqual(pendingPairs, pairs.filter(pair => !currentSlugs.has(pair.matchup)).map(pair => pair.matchup).sort(), `${date}: excluded matchups remain discoverable with a separate source-status label`)
    assert.equal((hubHtml.match(/<h1\b/g) ?? []).length, 1)
    assert(hubHtml.includes('id="comparison-matchup-search"') && hubHtml.includes('for="comparison-matchup-search"'), 'search keeps a stable explicit label when its clear button appears')
    if (!expectedPairs.length) assert(visible(hubHtml).includes('No two-sided matchups currently pass the source checks'))

    for (const pair of pairs) {
      const trackedA = products.filter(product => product.firmSlug === firmSlug(pair.firmA.name))
      const trackedB = products.filter(product => product.firmSlug === firmSlug(pair.firmB.name))
      const freshA = trackedA.filter(product => isChallengeFresh(product))
      const freshB = trackedB.filter(product => isChallengeFresh(product))
      const model = buildChallengeMatchup({ name: pair.firmA.name, slug: firmSlug(pair.firmA.name) }, { name: pair.firmB.name, slug: firmSlug(pair.firmB.name) })
      assert.equal(model.hasData, Boolean(freshA.length && freshB.length), `${date} ${pair.matchup}: two-sided state`)
      assert.equal(model.a.excludedProducts.length, trackedA.length - freshA.length)
      assert.equal(model.b.excludedProducts.length, trackedB.length - freshB.length)
      assert.equal(model.sources.length, new Set([...freshA, ...freshB].map(product => product.sourceUrl)).size)
      assert.equal(model.oldestCapture, [...freshA, ...freshB].map(product => product.sourceCapturedAt).sort().at(0) ?? null)
      if (!model.hasData) assert.equal(model.costGroups.length, 0, 'one-sided evidence cannot create cost comparisons')
      const overlay = getOverlay(pair.matchup)
      if (overlay) {
        assert([...trackedA, ...trackedB].every(product => isChallengeFresh(product)), 'editorial claims require every referenced product to be fresh')
        assert(isChallengeFresh({ sourceCapturedAt: overlay.challengeReviewedAt }))
      }
    }
    for (const matchup of ['ftmo-vs-fundednext', 'alpha-capital-vs-city-traders-imperium', 'apex-trader-funding-vs-topstep']) {
      const pair = pairs.find(pair => pair.matchup === matchup)
      const pairProducts = current.filter(product => [firmSlug(pair.firmA.name), firmSlug(pair.firmB.name)].includes(product.firmSlug))
      const twoSided = expectedPairs.some(pair => pair.matchup === matchup)
      const props = { params: Promise.resolve({ matchup }) }
      const html = renderToStaticMarkup(await detail.default(props))
      const text = visible(html)
      const metadata = await detail.generateMetadata(props)
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
      assert.doesNotMatch(text, /\bNaN\b|Infinity|Invalid Date/)
      assert(!html.includes('data-compare-aggregate-fallback'), 'expired routes never restore aggregate fee/risk tables')
      assert(html.includes('data-compare-firm-context="true"'), 'bounded directory context remains')
      assert.equal(metadata.alternates.canonical, `/compare/${matchup}`, 'existing canonical stays intact')
      const sourceState = twoSided ? 'two-sided' : pairProducts.length ? 'partial' : 'unavailable'
      assert(html.includes(`data-comparison-evidence="${sourceState}"`))
      if (!twoSided) {
        assert(html.includes('data-comparison-source-status="recapture-required"'))
        assert(metadata.description.includes('needs a source recheck'))
        assert(!text.includes('Cost to funded, matched by account size'))
        assert(!html.includes('Category-by-category winners'))
        assert(!schemas(html).some(item => item['@type'] === 'FAQPage'))
      }
      for (const product of pairProducts) {
        assert(text.includes(product.productName), 'available product names remain on a partial page')
        assert(html.includes(product.sourceUrl), 'available products retain first-party attribution')
      }
    }
  }
  console.log(`Comparison expiry passed: ${pairs.length} pair models across ${dates.length} dates plus clock reset; actual hub and three full/partial/unavailable detail routes, metadata, overlays and warm-process age gates.`)
} finally {
  globalThis.Date = RealDate
  hooks.deregister()
}
