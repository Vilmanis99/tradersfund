/** Actual firm-directory component with controlled filter state; not browser visual QA. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
let clock = '2026-09-08T12:00:00Z'
let states = [], cursor = 0
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const testModule = { exports: {} }
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    module: testModule, exports: testModule.exports, URL,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])) } },
    require(specifier) {
      if (specifier === 'react') return { ...React, useMemo: callback => callback(), useState(initial) {
        const index = cursor++
        if (!(index in states)) states[index] = initial
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
      } }
      if (specifier === 'next/link') return { __esModule: true, default: 'a' }
      if (specifier === 'next/image') return { __esModule: true, default: 'img' }
      if (specifier === './TrustpilotRating') return { __esModule: true, default: () => null }
      if (specifier === '@/lib/trustpilot') return { formatCapturedAt: date => date }
      if (specifier === '@/lib/firmPlatforms') return load('lib/firmPlatforms.ts')
      return require(specifier)
    },
  }, { filename: file })
  cache.set(file, testModule.exports)
  return testModule.exports
}
const FirmTable = load('components/FirmTable.tsx').default
const { directoryPlatformNames, firmPlatformEvidenceStatus } = load('lib/firmPlatforms.ts')
const allFirms = JSON.parse(readFileSync(new URL('../content/data/firms.json', import.meta.url), 'utf8'))
const bright = allFirms.find(firm => firm.name === 'Bright Funded')
assert.deepEqual(bright.platforms, ['MT5', 'DXTrade', 'cTrader'])
assert.equal(bright.platformEvidence.sourceUrl, 'https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer')
const legacy = { ...bright, name: 'Legacy fixture', affiliateUrl: '', platformEvidence: undefined, platforms: ['TradeLocker'] }
const render = firms => { cursor = 0; return FirmTable({ firms, challenges: [] }) }
function nodes(tree) {
  return React.isValidElement(tree) ? [tree, ...React.Children.toArray(tree.props.children).flatMap(nodes)] : []
}
const platformCell = tree => nodes(tree).find(node => node.props['data-firm-platforms'] === 'bright-funded')
let tree = render([bright, legacy])
assert(nodes(tree).some(node => node.props.role === 'region' && node.props.tabIndex === 0 && node.props['aria-label'] === 'Prop firm directory comparison table'), 'wide directory table has a named keyboard-scroll region')
let cell = platformCell(tree)
assert.equal(cell.props['data-platform-source-status'], 'fresh')
const html = renderToStaticMarkup(cell)
for (const name of bright.platforms) assert(html.includes(name))
assert(!html.includes('TradeLocker'))
assert(html.includes(bright.platformEvidence.sourceUrl) && html.includes('Platform-only check:'))
assert(html.includes('not confirmation for every programme or country') && html.includes('does not refresh prices'))
assert(html.includes('U.S./UAE'), 'captured profile restriction accompanies the corrected firm-wide list')
for (const [platform, matchesBright] of [['DXTrade', true], ['cTrader', true], ['TradeLocker', false]]) {
  states = []
  tree = render([bright, legacy])
  const button = nodes(tree).find(node => node.type === 'button' && node.props.children === platform)
  assert(button, `existing directory exposes ${platform} filter`)
  button.props.onClick()
  tree = render([bright, legacy])
  assert.equal(Boolean(platformCell(tree)), matchesBright, `actual ${platform} filter uses corrected aggregate data`)
}
const original = JSON.stringify(bright)
const evidence = bright.platformEvidence
const date = evidence.sourceCapturedAt
try {
  for (const sourceCapturedAt of ['', 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
    evidence.sourceCapturedAt = sourceCapturedAt
    states = []
    cell = platformCell(render([bright]))
    assert.equal(cell.props['data-platform-source-status'], 'recapture-required')
    assert(renderToStaticMarkup(cell).includes('needs rechecking'))
    assert(!nodes(cell).some(node => node.props.className === 'chip'), 'known stale platforms are not shown as current chips')
    assert.equal(directoryPlatformNames(bright).length, 0, 'known stale capture cannot produce a platform filter match')
  }
  evidence.sourceCapturedAt = date
  for (const sourceUrl of ['https://tradersfundhub.com/ru/obzor-bright-funded', 'https://brightfunded.com.evil.example/platforms', 'javascript:alert(1)', 'not-a-url']) {
    evidence.sourceUrl = sourceUrl
    assert.equal(firmPlatformEvidenceStatus(bright), 'recapture-required', 'platform proof must trace to the firm, not a circular or unrelated URL')
    states = []
    const cell = platformCell(render([bright]))
    assert(!nodes(cell).some(node => node.type === 'a'), 'invalid source cannot remain a clickable citation')
  }
} finally { Object.assign(bright, JSON.parse(original)) }
clock = '2026-10-08T12:00:00Z'
assert.equal(firmPlatformEvidenceStatus(bright), 'fresh', 'day 30 inclusive')
clock = '2026-10-09T00:00:00Z'
assert.equal(firmPlatformEvidenceStatus(bright), 'recapture-required', 'day 31 requires recapture')
assert.equal(firmPlatformEvidenceStatus(legacy), 'uncaptured', 'legacy platform names are not promoted to verified evidence')
assert.equal(JSON.stringify(bright), original, 'all source fixtures restored')
console.log('PASS: corrected Bright platform record, actual directory filters/citation/scope, malformed and stale evidence, first-party boundary and day-30/day-31 checks.')
