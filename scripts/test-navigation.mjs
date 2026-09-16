/** Actual navigation component with controlled hook/DOM fixtures, not browser visual QA. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
let pathname = '/'
let states, refs, effects, stateIndex, refIndex
const hooks = {
  useState(initial) {
    const index = stateIndex++
    if (!(index in states)) states[index] = initial
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
  },
  useRef(initial) { return refs[refIndex++] ??= { current: initial } },
  useEffect(callback) { effects.push(callback) },
}
const documentListeners = new Map()
const mediaListeners = new Map()
const document = {
  documentElement: { lang: 'en' }, body: { style: { overflow: 'auto' } },
  addEventListener: (name, callback) => documentListeners.set(name, callback),
  removeEventListener: name => documentListeners.delete(name),
}
const media = {
  matches: false,
  addEventListener: (name, callback) => mediaListeners.set(name, callback),
  removeEventListener: name => mediaListeners.delete(name),
}
const window = { matchMedia: query => { assert.equal(query, '(min-width: 1001px)'); return media } }
function load(file) {
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const testModule = { exports: {} }
  vm.runInNewContext(source, {
    module: testModule, exports: testModule.exports, document, window,
    require(specifier) {
      if (specifier === 'react') return { ...React, ...hooks }
      if (specifier === 'next/link') return { __esModule: true, default: 'a' }
      if (specifier === 'next/navigation') return { usePathname: () => pathname }
      if (specifier === './navLinks') return load('components/navLinks.ts')
      if (specifier === '@/lib/localizedRoutes') return load('lib/localizedRoutes.ts')
      return require(specifier)
    },
  }, { filename: file })
  return testModule.exports
}
const HeaderNav = load('components/HeaderNav.tsx').default
const { navLinks } = load('components/navLinks.ts')
function render({ path = '/', mobile = false, dropdown = null } = {}) {
  pathname = path
  states = [mobile, dropdown, path]
  refs = []; effects = []; stateIndex = 0; refIndex = 0
  return HeaderNav({ dataStatus: '12/19 source-checked' })
}
function nodes(tree) {
  if (!React.isValidElement(tree)) return []
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(nodes)]
}
const hrefs = tree => new Set(nodes(tree).filter(node => node.type === 'a').map(node => node.props.href))
const previousDestinations = [
  '/blog', '/best-prop-firms-in-india', '/prop-firms', '/best-prop-firms-2026',
  '/prop-firm-challenges', '/prop-firm-challenge-changes', '/compare', '/prop-firm-discount-codes',
  '/prop-firms#focused-rule-lists', '/best-prop-firms-in-india/compare',
  '/best-prop-firms-in-india/challenge-changes', '/best-prop-firms-in-india/challenge-comparison',
  '/best-prop-firms-in-india/payout-methods', '/best-prop-firms-in-uk', '/best-prop-firms-in-us',
  '/cheapest-prop-firms', '/best-futures-prop-firms', '/best-crypto-prop-firms',
  '/best-swing-trading-prop-firms', '/best-instant-funding-prop-firms',
  '/how-to-pass-a-prop-firm-challenge', '/how-prop-firm-challenges-work',
  '/true-cost-of-prop-firm-challenges', '/blog/what-is-a-prop-firm', '/about', '/contact',
]
assert.equal(navLinks.length, 4, 'Four task groups, not the previous seven main links')
const desktopDestinations = new Set()
for (const group of navLinks) {
  const tree = render({ dropdown: group.label })
  const elements = nodes(tree)
  const expanded = elements.filter(node => node.type === 'button' && node.props['aria-expanded'] === true)
  assert.equal(expanded.length, 1)
  assert(elements.some(node => node.props.id === expanded[0].props['aria-controls']), 'Disclosure points to its actual panel')
  assert(!elements.some(node => ['menu', 'menuitem'].includes(node.props.role)), 'Navigation uses ordinary tab-accessible links, not incomplete application-menu semantics')
  for (const href of hrefs(tree)) desktopDestinations.add(href)
  assert(renderToStaticMarkup(tree).includes(group.label.replaceAll('&', '&amp;')), 'Actual element tree renders')
}
for (const href of previousDestinations) assert(desktopDestinations.has(href), `Preserved desktop destination: ${href}`)
const mobileTree = render({ mobile: true })
for (const href of [...previousDestinations, '/']) assert(hrefs(mobileTree).has(href), `Preserved mobile destination: ${href}`)
assert(hrefs(render({ path: '/ru/obzor-fundednext' })).has('/blog/fundednext-review'), 'Russian review keeps its paired English destination')
assert(hrefs(render({ path: '/blog/fundednext-review' })).has('/ru/obzor-fundednext'), 'English review keeps its paired Russian destination')
const russianMobile = render({ path: '/ru', mobile: true })
for (const href of ['/ru', '/ru/obzor-fundednext', '/ru/obzor-bright-funded', '/ru/luchshie-prop-firmy', '/ru/rossiyskie-prop-kompanii']) {
  assert(hrefs(russianMobile).has(href), `Russian mobile entry retained: ${href}`)
}
assert(renderToStaticMarkup(russianMobile).includes('Закрыть'), 'Russian close action is visible text')

// Exercise the component's actual lifecycle callbacks with explicit DOM doubles.
const modalTree = render({ mobile: true })
const dialog = nodes(modalTree).find(node => node.type === 'dialog')
assert(dialog, 'Mobile navigation uses a native dialog')
let opened = 0, closed = 0
dialog.props.ref.current = { showModal: () => opened++, close: () => closed++ }
const cleanups = effects.map(effect => effect()).filter(Boolean)
assert.equal(opened, 1)
assert.equal(document.body.style.overflow, 'hidden')
dialog.props.onCancel()
assert.equal(states[0], false, 'Native Escape cancellation closes React state')
states[0] = true
nodes(modalTree).find(node => node.props.className === 'mobile-overlay__close').props.onClick()
assert.equal(states[0], false, 'Visible close action closes React state')
states[0] = true; media.matches = true
mediaListeners.get('change')()
assert.equal(states[0], false, 'Switching to desktop closes the mobile modal')
for (const cleanup of cleanups) cleanup()
assert.equal(closed, 1)
assert.equal(document.body.style.overflow, 'auto', 'Unmount restores prior scrolling')
assert.equal(mediaListeners.size, 0)

render({ dropdown: 'Prop Firms' })
let focused = false
refs[0].current = { querySelector: () => ({ focus: () => { focused = true } }) }
const desktopCleanup = effects.map(effect => effect()).filter(Boolean)
documentListeners.get('keydown')({ key: 'Escape' })
assert(focused, 'Desktop Escape returns focus to the disclosure trigger')
assert.equal(states[1], null)
desktopCleanup.forEach(cleanup => cleanup())
assert.equal(documentListeners.size, 0)
const css = readFileSync(new URL('../app/light-platform.css', import.meta.url), 'utf8')
assert(css.includes('@media (max-width: 1000px)'), 'CSS breakpoint matches the modal resize listener')
assert(css.includes('html dialog.mobile-overlay:not([open]) { display: none; }'), 'Closed dialog is hidden despite legacy flex styling')
assert(css.includes('max-height: calc(100dvh - 110px); overflow-y: auto;'), 'Desktop disclosures have a viewport-bounded scroll region')
console.log('PASS: navigation destinations, EN/RU rendering, disclosures and modal lifecycle fixtures. Browser layout/focus containment not verified by this test.')
