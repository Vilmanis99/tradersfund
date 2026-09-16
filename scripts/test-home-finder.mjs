/** Controlled component lifecycle tests; no browser layout or interaction sign-off. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const cache = new Map()
let states = [], cursor = 0
const events = []
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const testModule = { exports: {} }
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    module: testModule, exports: testModule.exports, URLSearchParams,
    require(specifier) {
      if (specifier === 'react') return { ...React, useState(initial) {
        const index = cursor++
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
        return [states[index], value => { states[index] = value }]
      } }
      if (specifier === 'next/link') return { __esModule: true, default: 'a' }
      if (specifier === '@/lib/clientAnalytics') return { trackSiteEvent: (...args) => events.push(args) }
      if (specifier === '@/lib/challengeComparison') return load('lib/challengeComparison.ts')
      return require(specifier)
    },
  }, { filename: file })
  cache.set(file, testModule.exports)
  return testModule.exports
}
const { parseFinderState, finderAccountSizes, resolveFinderSize } = load('lib/challengeComparison.ts')
const fixture = (name, size, phases = 2) => ({
  firm: { slug: name.toLowerCase(), name, isPartner: name === 'Zulu' },
  product: { slug: 'test', name: `${name} programme`, phases, capturedAt: '2026-09-08',
    assetClass: 'cfd', pricingModel: 'one-off', tiers: [{ sizeUsd: size, priceUsd: 123.45, priceEur: null }] },
})
function nodes(tree) {
  return React.isValidElement(tree) ? [tree, ...React.Children.toArray(tree.props.children).flatMap(nodes)] : []
}
for (const locale of ['English', 'Russian']) {
  states = []; events.length = 0
  const Component = load(`components/${locale}FinderEntry.tsx`).default
  let rows = [fixture('Zulu', 50000), fixture('Alpha', 50000), fixture('Beta', 10000, 3)]
  const render = () => { cursor = 0; return Component({ rows }) }
  let tree = render()
  let elements = nodes(tree)
  assert.equal(elements.find(node => node.type === 'select').props.value, 50000)
  const previews = elements.filter(node => node.type === 'li')
  assert.equal(previews.length, 2)
  assert(renderToStaticMarkup(previews[0]).includes('Alpha'), 'Alphabetical preview does not privilege the partner')
  const stageControl = elements.filter(node => node.type === 'select')[1]
  assert(nodes(stageControl).some(node => node.type === 'option' && node.props.value === (locale === 'Russian' ? '3' : 'three-step')), 'Both homepages expose three-stage selection')
  elements.find(node => node.type === 'select').props.onChange({ target: { value: '10000' } })
  stageControl.props.onChange({ target: { value: locale === 'Russian' ? '3' : 'three-step' } })
  tree = render(); elements = nodes(tree)
  assert.equal(elements.filter(node => node.type === 'li').length, 1)
  assert(renderToStaticMarkup(tree).includes('Beta programme'))
  if (locale === 'Russian') {
    const link = elements.find(node => node.type === 'a' && node.props.href.includes('compare='))
    const handoff = parseFinderState(new URL(link.props.href, 'https://tradersfundhub.com').hash, rows)
    assert.equal(handoff.filters.size, 10000)
    assert.equal(handoff.filters.phases, '3')
    assert.equal(handoff.selected[0], 'beta:test')
    elements.find(node => node.type === 'a' && node.props.onClick).props.onClick()
    assert.equal(events[0][1].account_size, 10000)
    assert.equal(events[0][1].phases, '3')
  }
  // Same mounted component receives a refresh in which its chosen tier disappeared.
  rows = [fixture('Gamma', 25000, 3)]
  tree = render(); elements = nodes(tree)
  assert.equal(elements.find(node => node.type === 'select').props.value, 25000)
  assert.equal(elements.filter(node => node.type === 'li').length, 1, 'A removed selection must not hide available results')
  assert(renderToStaticMarkup(tree).includes('Gamma programme'))
  assert(!renderToStaticMarkup(tree).includes('size=10000'))
  rows = []
  tree = render()
  assert(!nodes(tree).some(node => node.type === 'select'))
  assert(nodes(tree).some(node => node.type === 'a'), 'Empty data retains an article/comparison handoff')
  rows = [fixture('Delta', 5000, 3)]
  tree = render()
  assert.equal(nodes(tree).find(node => node.type === 'select').props.value, 5000, 'Empty-to-populated refresh initializes from real tiers')
  assert.equal(nodes(tree).filter(node => node.type === 'li').length, 1)
  rows = [fixture('Delta', 5000, 2)]
  tree = render()
  assert.equal(nodes(tree).filter(node => node.type === 'li').length, 0, 'Stage choice is preserved; no unrelated substitute result')
  assert(nodes(tree).some(node => node.type === 'select'), 'No match still allows changing requirements')
  for (const [assetClass, label] of [['cfd', 'CFD'], ['futures', locale === 'Russian' ? 'Фьючерсы' : 'FUTURES'], ['crypto', locale === 'Russian' ? 'Криптовалюты' : 'CRYPTO'], ['prediction-markets', locale === 'Russian' ? 'Рынки прогнозов' : 'Prediction markets']]) {
    states = []
    rows = [{ ...fixture('Market', 50000), product: { ...fixture('Market', 50000).product, assetClass } }]
    assert(renderToStaticMarkup(render()).includes(label), `${locale}: preview identifies ${assetClass}`)
  }
}
const limited = [fixture('Only', 25000)]
for (const hash of ['', '#podbor', '#size=50000', '#size=NaN']) {
  assert.equal(parseFinderState(hash, limited).filters.size, 25000, 'Full Russian comparison falls back to a real tier too')
}
assert.equal(resolveFinderSize([]), undefined)
const malformed = [NaN, Infinity, 0, -5000, 25000, 25000].map(size => fixture('Invalid', size))
assert.equal(JSON.stringify(finderAccountSizes(malformed)), '[25000]')
assert.equal(parseFinderState('#size=Infinity', malformed).filters.size, 25000)
console.log('PASS: EN/RU homepage selection lifecycle, three-stage handoff, alphabetical previews, market labels, empty/refresh recovery and valid-tier fallback.')
