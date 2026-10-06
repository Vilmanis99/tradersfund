import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'

const require = createRequire(import.meta.url)
let states = [], cursor = 0, fetchCalls = 0, response = { ok: false, error: 'Please retry later.' }
let copiedText = '', legacyResult = false, removed = false, focusCount = 0
class Element { focus() { focusCount++ } }
const previous = new Element()
const navigator = { clipboard: { writeText: async text => { copiedText = text } } }
const document = {
  activeElement: previous, body: { appendChild() {} },
  createElement: () => ({ style: {}, select() {}, remove() { removed = true } }),
  execCommand: () => legacyResult,
}
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    module: mod, exports: mod.exports, navigator, document, HTMLElement: Element,
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: callback => callback(),
    fetch: async () => { fetchCalls++; return { ok: response.ok, json: async () => response } },
    require(specifier) {
      if (specifier === 'react') return { ...React, useEffect() {}, useId: () => 'feedback',
        useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }] },
        useRef(initial) { const index = cursor++; if (!(index in states)) states[index] = { current: initial }; return states[index] },
      }
      if (specifier === '@/lib/clientAnalytics') return { trackSiteEvent() {} }
      if (specifier.startsWith('@/')) return load(`${specifier.slice(2)}.ts`)
      if (specifier.startsWith('.')) return load(`${path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier))}.ts`)
      return require(specifier)
    },
  }, { filename: file })
  cache.set(file, mod.exports)
  return mod.exports
}
const { copyText } = load('lib/copyText.ts')
assert.equal(await copyText('TFH'), true)
assert.equal(copiedText, 'TFH')
navigator.clipboard.writeText = async () => { throw new Error('Permission denied') }
legacyResult = true
assert.equal(await copyText('TFH'), true, 'legacy action can recover a rejected permission')
assert(removed && focusCount > 0, 'temporary copy field is removed and focus restored')
legacyResult = false
assert.equal(await copyText('TFH'), false, 'a failed legacy copy must not claim success')
document.execCommand = () => { throw new Error('Copy unavailable') }
assert.equal(await copyText('TFH'), false, 'unavailable copy action offers manual copying')

function nodes(tree) { return React.isValidElement(tree) ? [tree, ...React.Children.toArray(tree.props.children).flatMap(nodes)] : [] }
function text(tree) { return React.isValidElement(tree) ? React.Children.toArray(tree.props.children).map(text).join('') : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '' }
function render(Component, props = {}) { cursor = 0; return Component(props) }
const Pill = load('components/CopyableCodePill.tsx').default
states = []
let tree = render(Pill, { code: 'TFH', pct: 10 })
await nodes(tree).find(node => node.type === 'button').props.onClick()
tree = render(Pill, { code: 'TFH', pct: 10 })
assert(text(tree).includes('Couldn’t copy. Copy manually:') && text(tree).includes('TFH') && !text(tree).includes('Copied!'), 'copy failure is visible and code remains selectable')
navigator.clipboard.writeText = async () => {}
await nodes(tree).find(node => node.type === 'button').props.onClick()
tree = render(Pill, { code: 'TFH', pct: 10 })
assert(text(tree).includes('Copied!') && !text(tree).includes('Couldn’t copy'), 'retry clears the failure after successful copy')

const Contact = load('components/ContactForm.tsx').default
states = []; focusCount = 0
tree = render(Contact)
const submitEvent = { preventDefault() {}, currentTarget: { elements: { namedItem: () => previous } } }
await tree.props.onSubmit(submitEvent)
tree = render(Contact)
assert.equal(fetchCalls, 0, 'invalid contact form never sends a request')
assert.equal(focusCount, 1, 'first invalid contact field gets focus')
for (const id of ['contact-name', 'contact-email', 'contact-message']) {
  const field = nodes(tree).find(node => node.props.id === id)
  assert.equal(field.props['aria-invalid'], true)
  assert(nodes(tree).some(node => node.props.id === field.props['aria-describedby']), 'inline error is programmatically associated')
}
for (const [id, value] of [['contact-name', 'Trader'], ['contact-email', 'trader@example.com'], ['contact-message', 'Please check these terms.']]) {
  nodes(tree).find(node => node.props.id === id).props.onChange({ target: { value } })
  tree = render(Contact)
}
await tree.props.onSubmit(submitEvent)
tree = render(Contact)
assert.equal(fetchCalls, 1)
assert(text(tree).includes('Please retry later.'))
assert.equal(nodes(tree).find(node => node.props.id === 'contact-message').props.value, 'Please check these terms.', 'delivery failure preserves the message')

const Newsletter = load('components/NewsletterForm.tsx').default
states = []; fetchCalls = 0
tree = render(Newsletter)
nodes(tree).find(node => node.props.type === 'email').props.onChange({ target: { value: 'a@' } })
tree = render(Newsletter)
await tree.props.onSubmit(submitEvent)
tree = render(Newsletter)
assert.equal(fetchCalls, 0)
assert.equal(nodes(tree).find(node => node.props.type === 'email').props['aria-invalid'], true)
nodes(tree).find(node => node.props.type === 'email').props.onChange({ target: { value: 'trader@example.com' } })
tree = render(Newsletter)
response = { ok: true, message: 'Check your inbox and confirm your subscription.' }
await tree.props.onSubmit(submitEvent)
tree = render(Newsletter)
assert(text(tree).includes('Check your inbox') && !text(tree).includes('Confirm email'), 'confirmation happens in the inbox, not a disabled form action')
assert.equal(nodes(tree).find(node => node.props.type === 'submit').props.disabled, true)
await tree.props.onSubmit(submitEvent)
assert.equal(fetchCalls, 1, 'pending signup cannot send duplicate requests')
nodes(tree).find(node => node.props.className === 'newsletter-another-email').props.onClick()
tree = render(Newsletter)
assert.equal(nodes(tree).find(node => node.props.type === 'submit').props.disabled, false, 'reader can enter another email')
console.log('PASS: clipboard permission/fallback failures and recovery, inline contact errors/focus/preserved input, newsletter validation and inbox confirmation flow. No messages sent.')
