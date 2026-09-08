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
  const { getAllChallenges, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
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
