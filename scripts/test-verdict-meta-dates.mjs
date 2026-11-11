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
    if (specifier === 'next/navigation') return { url: 'test:next-navigation', shortCircuit: true }
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
    if (url === 'test:next-navigation') return { format: 'commonjs', shortCircuit: true, source: `const real = require(${JSON.stringify(require.resolve('next/navigation'))}); const noop = () => {}; module.exports = { ...real, useRouter: () => ({ push: noop, replace: noop, prefetch: noop, back: noop, forward: noop, refresh: noop }) }` }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

/**
 * Verdict meta line ("Автор … · проверено …") on best-for and country pages.
 * RU pages must print the writer's checkedAt as DD.MM.YYYY (test:ru-visible-dates rule);
 * EN pages keep the ISO string byte-identical. Renders the real components with the
 * real models (no fixtures), so a new RU verdict can't reintroduce an ISO date.
 */
const { getBestForPageModels } = require(path.join(root, 'lib/bestFor.ts'))
const { getCountryPageModels } = require(path.join(root, 'lib/countryPages.ts'))
const BestForPage = require(path.join(root, 'components/BestForPage.tsx')).default
const CountryPage = require(path.join(root, 'components/CountryPage.tsx')).default

const ruDate = iso => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
const metaLine = html => /<p class="rules-meta">([\s\S]*?)<\/p>/.exec(html)?.[1]?.replace(/<!-- -->/g, '') ?? null

let checked = 0
function check(kind, model, Component) {
  if (!model.verdict?.checkedAt) return
  const iso = String(model.verdict.checkedAt)
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/, `${model.path}: checkedAt should be ISO in front matter`)
  const line = metaLine(renderToStaticMarkup(React.createElement(Component, { model })))
  assert.ok(line, `${kind} ${model.path} (${model.lang}): verdict meta line not rendered`)
  if (model.lang === 'ru') {
    assert.ok(line.includes(`проверено ${ruDate(iso)}`), `${model.path}: expected «проверено ${ruDate(iso)}», got: ${line}`)
    assert.ok(!line.includes(iso), `${model.path}: ISO ${iso} leaked into RU visible meta line: ${line}`)
  } else {
    assert.ok(line.includes(`checked ${iso}`), `${model.path}: EN meta line must keep ISO ${iso}, got: ${line}`)
  }
  checked++
}

for (const model of getBestForPageModels()) check('best-for', model, BestForPage)
const countryModels = getCountryPageModels()
for (const model of countryModels) check('country', model, CountryPage)
// RU country verdicts don't exist yet: render an EN verdict through the RU template so the RU path is covered too.
const enWithVerdict = countryModels.find(model => model.lang === 'en' && model.verdict)
const ruTwin = enWithVerdict && countryModels.find(model => model.lang === 'ru' && model.country.slug === enWithVerdict.country.slug)
if (ruTwin) check('country', { ...ruTwin, verdict: enWithVerdict.verdict }, CountryPage)

assert.ok(getBestForPageModels().some(model => model.lang === 'ru' && model.verdict), 'expected at least one RU best-for verdict to render')
console.log(`verdict meta dates: ${checked} page(s) checked; RU prints DD.MM.YYYY, EN keeps ISO`)
