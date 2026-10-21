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
let directoryQuery = new URLSearchParams()
const testLocation = { pathname: '/prop-firms', search: '', hash: '#global-prop-firm-directory' }
const historyEntries = []
function writeHistory(_state, _unused, href) {
  historyEntries.push(href)
  const url = new URL(href, 'http://localhost')
  testLocation.search = url.search
  directoryQuery = url.searchParams
}
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const testModule = { exports: {} }
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    module: testModule, exports: testModule.exports, URL, URLSearchParams,
    window: { location: testLocation, history: { pushState: writeHistory, replaceState: writeHistory } },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])) } },
    require(specifier) {
      if (specifier === 'react') return { ...React, useMemo: callback => callback(), useRef: initial => ({ current: initial }), useState(initial) {
        const index = cursor++
        if (!(index in states)) states[index] = initial
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
      } }
      if (specifier === 'next/link') return { __esModule: true, default: props => {
        const htmlProps = { ...props }; delete htmlProps.prefetch
        return React.createElement('a', htmlProps)
      } }
      if (specifier === 'next/navigation') return { useSearchParams: () => directoryQuery }
      if (specifier === 'next/image') return { __esModule: true, default: 'img' }
      if (specifier === './TrustpilotRating') return { __esModule: true, default: () => null }
      if (specifier === './FirmLogo') return load('components/FirmLogo.tsx')
      if (specifier === '@/lib/trustpilot') return { formatCapturedAt: date => date }
      if (specifier === '@/lib/firmSlug') return load('lib/firmSlug.ts')
      if (specifier === '@/lib/firmPlatforms') return load('lib/firmPlatforms.ts')
      if (specifier === '@/lib/firmDirectory') return load('lib/firmDirectory.ts')
      if (specifier === '@/lib/discountDisplay') return load('lib/discountDisplay.ts')
      return require(specifier)
    },
  }, { filename: file })
  cache.set(file, testModule.exports)
  return testModule.exports
}
const FirmTable = load('components/FirmTable.tsx').default
const { directoryPlatformNames, firmPlatformEvidenceStatus } = load('lib/firmPlatforms.ts')
const allFirms = JSON.parse(readFileSync(new URL('../content/data/firms.json', import.meta.url), 'utf8'))
const bright = allFirms.find(firm => firm.name === 'BrightFunded')
const brightCapturedMs = Date.parse(`${bright.platformEvidence.sourceCapturedAt}T00:00:00Z`)
clock = new Date(brightCapturedMs + 12 * 3_600_000).toISOString()
assert.deepEqual(bright.platforms, ['MT5', 'DXTrade', 'cTrader'])
assert.equal(bright.platformEvidence.sourceUrl, 'https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer')
const legacy = { ...bright, name: 'Legacy fixture', affiliateUrl: '', platformEvidence: undefined, platforms: ['TradeLocker'] }
const render = (firms, challenges = [], initialFilters = {}) => {
  cursor = 0
  if (!states.length) {
    directoryQuery = new URLSearchParams(Object.entries(initialFilters).map(([key, value]) => [key, value === true ? 'allowed' : String(value)]))
    testLocation.search = directoryQuery.size ? `?${directoryQuery}` : ''
  }
  return FirmTable({ firms, challenges })
}
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
clock = new Date(brightCapturedMs + 30 * 86_400_000 + 12 * 3_600_000).toISOString()
assert.equal(firmPlatformEvidenceStatus(bright), 'fresh', 'day 30 inclusive')
clock = new Date(brightCapturedMs + 31 * 86_400_000).toISOString()
assert.equal(firmPlatformEvidenceStatus(bright), 'recapture-required', 'day 31 requires recapture')
assert.equal(firmPlatformEvidenceStatus(legacy), 'uncaptured', 'legacy platform names are not promoted to verified evidence')
assert.equal(JSON.stringify(bright), original, 'all source fixtures restored')
console.log('PASS: corrected Bright platform record, actual directory filters/citation/scope, malformed and stale evidence, first-party boundary and day-30/day-31 checks.')

clock = '2026-09-08T12:00:00Z'
states = []
const product = { firmSlug: 'bright-funded', phases: 1, drawdownType: 'static', accountSizes: [{ sizeUsd: 50000, priceUsd: 99 }], rules: { news: true, ea: false, overnight: true, weekend: false }, sourceCapturedAt: '2026-09-08', sourceUrl: 'https://brightfunded.com/' }
const otherProduct = { ...product, phases: 2, drawdownType: 'trailing', accountSizes: [{ sizeUsd: 100000, priceUsd: 199 }], rules: { news: false, ea: true, overnight: false, weekend: true } }
for (const filters of [
  { phase: '1-step', size: 100000 },
  { phase: '1-step', drawdown: 'trailing' },
  { news: true, ea: true },
  { overnight: true, weekend: true },
]) {
  states = []
  tree = render([bright], [product, otherProduct], filters)
  assert.equal(Boolean(platformCell(tree)), false, 'filters cannot combine terms from separate products')
  const reset = nodes(tree).find(node => node.type === 'button' && node.props.children === 'Reset filters')
  assert(reset, 'empty results have an explicit recovery action')
  reset.props.onClick()
  assert(platformCell(render([bright], [product, otherProduct], filters)), 'reset restores firm results')
}
states = []
assert(platformCell(render([bright], [product, otherProduct], { phase: '1-step', size: 50000, news: true, overnight: true })), 'a single qualifying product still matches')
states = []
tree = render(allFirms)
const search = nodes(tree).find(node => node.props.id === 'firm-search')
search.props.onChange({ target: { value: '  brightfunded  ' } })
assert(platformCell(render(allFirms)), 'search accepts spaces and joined brand names')
states = []
tree = render(allFirms)
const buttons = nodes(tree).filter(node => node.type === 'button').map(node => node.props.children)
assert(buttons.includes('DXTrade') && !buttons.includes('DXtrade'), 'case variants share one platform filter')
assert(buttons.includes('Match-Trader') && !buttons.includes('Match-Trade'), 'legacy Match-Trade label shares one platform filter')
const checkbox = nodes(tree).find(node => node.props['aria-label'] === 'Select BrightFunded for comparison')
checkbox.props.onChange()
tree = render(allFirms)
const remove = nodes(tree).find(node => node.props['aria-label'] === 'Remove BrightFunded from comparison')
assert(remove, 'selected firm stays identifiable outside the filtered rows')
remove.props.onClick()
tree = render(allFirms)
assert(!nodes(tree).some(node => node.props['aria-label'] === 'Remove BrightFunded from comparison'))
console.log('PASS: same-product filters, empty-result recovery, forgiving brand search, platform aliases and comparison removal.')

const FirmLogo = load('components/FirmLogo.tsx').default
const renderLogo = src => { cursor = 0; return FirmLogo({ name: 'The Funded Trader', src }) }
states = []
let logo = renderLogo('')
assert.equal(logo.props['data-firm-logo'], 'fallback')
assert.equal(logo.props.children, 'TFT', 'missing branding uses meaningful initials')
states = []
logo = renderLogo('/missing-logo.png')
assert.equal(logo.props['data-firm-logo'], 'image')
nodes(logo).find(node => node.type === 'img').props.onError()
logo = renderLogo('/missing-logo.png')
assert.equal(logo.props['data-firm-logo'], 'fallback', 'a failed asset leaves readable initials instead of a broken image')
assert.equal(renderLogo('/replacement-logo.png').props['data-firm-logo'], 'image', 'a replacement source can load after an earlier failure')
console.log('PASS: missing and failed logo fallbacks, including recovery for replacement assets.')
states = []; cursor = 0
assert.equal(FirmLogo({ name: 'FTMO', src: '' }).props.children, 'FTMO', 'short brand acronyms stay readable when assets fail')
states = []; cursor = 0
assert.equal(FirmLogo({ name: 'FundedNext', src: '' }).props.children, 'FN', 'joined brand names have meaningful initials')

const { parseDirectoryQuery, writeDirectoryQuery, DIRECTORY_DEFAULTS, matchingDirectoryProducts } = load('lib/firmDirectory.ts')
const options = { assets: ['All', 'forex'], platforms: ['All', 'MT5'], slugs: ['ftmo', 'bright-funded'] }
const shared = { ...DIRECTORY_DEFAULTS, q: 'FTMO', asset: 'forex', platform: 'MT5', size: 100000,
  phase: '2-step', drawdown: 'static', score: 8.5, news: true, selected: ['ftmo', 'bright-funded'], sort: 'name', direction: 'asc' }
const encoded = writeDirectoryQuery('utm_source=fixture', shared)
assert.equal(new URLSearchParams(encoded).get('utm_source'), 'fixture', 'unrelated attribution survives filter updates')
assert.equal(JSON.stringify(parseDirectoryQuery(new URLSearchParams(encoded), options)), JSON.stringify(shared), 'all filters, sort and selections survive sharing/reload')
const malformed = parseDirectoryQuery(new URLSearchParams('size=-100&score=NaN&phase=unknown&asset=oops&platform=oops&sort=oops&direction=oops&news=yes&selected=ftmo,ftmo,unknown,bright-funded'), options)
assert.equal(malformed.size, 0)
assert.equal(malformed.score, 0)
assert.equal(malformed.phase, 'All')
assert.equal(malformed.news, false)
assert.equal(JSON.stringify(malformed.selected), JSON.stringify(['ftmo', 'bright-funded']))
assert.equal(parseDirectoryQuery(new URLSearchParams('phase=two-step'), options).phase, '2-step', 'existing landing links stay compatible')
const euroProduct = { ...product, productName: 'Two-step', productSlug: 'two-step', phases: 2, profitSplitPct: 80, payoutFrequency: 'bi-weekly',
  accountSizes: [{ sizeUsd: 10000, priceUsd: null, priceEur: 89 }, { sizeUsd: 100000, priceUsd: null, priceEur: 540 }] }
const cheaperProduct = { ...product, productName: 'One-step', productSlug: 'one-step', profitSplitPct: 90, accountSizes: [{ sizeUsd: 10000, priceUsd: null, priceEur: 79 }] }
states = []
tree = render([bright], [cheaperProduct, euroProduct], { size: 100000, phase: '2-step' })
const row = nodes(tree).find(node => node.type === 'tr' && nodes(node).some(child => child.props['data-firm-platforms'] === 'bright-funded'))
const rowHtml = renderToStaticMarkup(row)
assert(rowHtml.includes('€540') && !rowHtml.includes('€79') && !rowHtml.includes('€89'), 'rendered entry fee belongs to selected size and program')
assert(rowHtml.includes('80%') && !rowHtml.includes('90%'), 'rendered split belongs to matching product, not firm aggregate')
assert(rowHtml.includes('bi weekly') && rowHtml.includes('1 matching product') && !rowHtml.includes('1-step'), 'rendered payout and phases belong to matching product')
const removeSize = nodes(tree).find(node => node.props['aria-label'] === 'Remove $100K account filter')
assert(removeSize, 'active filters can be removed individually while collapsed')
removeSize.props.onClick()
assert.equal(directoryQuery.get('size'), null)
assert.equal(directoryQuery.get('phase'), '2-step', 'removing one chip retains other filters')
assert(historyEntries.at(-1).endsWith('#global-prop-firm-directory'), 'filter updates preserve the directory anchor')
const projected = matchingDirectoryProducts([euroProduct], { ...DIRECTORY_DEFAULTS, size: 100000 })
assert.equal(projected[0].accountSizes.length, 1)
assert.equal(euroProduct.accountSizes.length, 2, 'projection never mutates captured data')
states = []
const unknownTier = { ...euroProduct, accountSizes: [euroProduct.accountSizes[0], { sizeUsd: 100000, priceUsd: null, priceEur: null }] }
tree = render([bright], [unknownTier], { size: 100000 })
const unknownRow = nodes(tree).find(node => node.type === 'tr' && nodes(node).some(child => child.props['data-firm-platforms'] === 'bright-funded'))
assert(renderToStaticMarkup(unknownRow).includes('Fee unverified') && !renderToStaticMarkup(unknownRow).includes('€89'), 'unknown selected-tier fee cannot borrow a known small-tier price')
const multiSize = { ...product, accountSizes: [{ sizeUsd: 100000, priceUsd: 1 }, { sizeUsd: 200000, priceUsd: 200 }, { sizeUsd: 300000, priceUsd: 300 }] }
assert.equal(JSON.stringify(matchingDirectoryProducts([multiSize], { ...DIRECTORY_DEFAULTS, size: 200000 })[0].accountSizes.map(tier => tier.sizeUsd)), JSON.stringify([200000, 300000]), '200K+ pricing excludes cheaper small accounts')
console.log('PASS: rendered matching prices/splits/payouts, tier projection, URL roundtrip, malformed links, removable chips and attribution/hash preservation.')
