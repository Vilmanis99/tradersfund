/**
 * A firm's previousDiscountCode (content/data/firms.json, e.g. BrightFunded DOUBLE25,
 * replaced by HW30 on 2026-10-22) is history. It must never be the live code in data,
 * never be promoted by lib/discountDisplay, and never appear in page copy or in the built
 * HTML/feeds unless the same sentence labels it as previous/expired.
 *
 * PENDING lists writer-owned copy that still presents the old code as current. Those
 * routes are reported, not failed, so the daily stack stays green while the owners fix
 * them; any other occurrence fails, and a PENDING entry fails once its copy no longer
 * contains the code (delete the entry then). `--strict` fails on PENDING too.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promotableDiscount, unverifiedDiscount } from '../lib/discountDisplay.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STRICT = process.argv.includes('--strict')
const firms = JSON.parse(fs.readFileSync(path.join(root, 'content/data/firms.json'), 'utf8'))
const deals = JSON.parse(fs.readFileSync(path.join(root, 'content/data/deals.json'), 'utf8'))

// A sentence that names the old code must say it is not the current one.
const HISTORY = /\b(previous(ly)?|former(ly)?|expired|replaced|no longer|old code|was the code|ended|superseded)\b|прежн|предыдущ|ранее|истёк|истек|больше не|заменён|заменен/i

const PENDING = {
  // Empty: luchshie-prop-firmy no longer presents STRTN as current (cleared 2026-10-28 CR).
}

const withPrevious = firms.filter(firm => firm.previousDiscountCode)
assert(withPrevious.length > 0, 'fixture: at least one firm records a previousDiscountCode')
const codes = new Map(withPrevious.map(firm => [firm.previousDiscountCode, firm.name]))

// 1. Data and display helpers.
for (const firm of withPrevious) {
  const old = firm.previousDiscountCode
  assert.equal(typeof firm.previousDiscountCodeStatus, 'string', `${firm.name}: previousDiscountCodeStatus explains the old code`)
  assert.notEqual(firm.discountCode, old, `${firm.name}: the previous code is not the live discountCode`)
  assert.notEqual(firm.regionalDiscountCode, old, `${firm.name}: the previous code is not a regional code`)
  assert.notEqual(firm.affiliateSupportCode, old, `${firm.name}: the previous code is not the partner code`)
  assert.notEqual(promotableDiscount(firm)?.code, old, `${firm.name}: never promoted`)
  assert.notEqual(unverifiedDiscount(firm)?.code, old, `${firm.name}: never shown as an advertised code`)
  const dealText = JSON.stringify(deals)
  assert(!dealText.includes(old), `${firm.name}: ${old} is not in deals.json`)
}

const sentenceAround = (text, index, code) => {
  const start = Math.max(text.lastIndexOf('. ', index), text.lastIndexOf('\n', index), text.lastIndexOf('>', index), 0)
  const ends = ['. ', '\n', '<'].map(mark => text.indexOf(mark, index + code.length)).filter(i => i >= 0)
  return text.slice(start, ends.length ? Math.min(...ends) : text.length)
}
const report = []
const failures = []
const pendingSeen = new Set()
const check = (label, text, pendingKey) => {
  for (const [code, firmName] of codes) {
    let index = text.indexOf(code)
    while (index >= 0) {
      const sentence = sentenceAround(text, index, code).replace(/\s+/g, ' ').trim()
      if (!HISTORY.test(sentence)) {
        if (pendingKey) { pendingSeen.add(pendingKey); report.push(`PENDING (${PENDING[pendingKey].owner}) ${label}: ${firmName} ${code} as current`) }
        else failures.push(`${label}: ${firmName} ${code} shown as current: "${sentence.slice(0, 160)}"`)
      }
      index = text.indexOf(code, index + code.length)
    }
  }
}

// 2. Source copy: pages, components, lib, posts and every data file except the provenance records.
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = path.join(dir, entry.name)
  if (entry.isDirectory()) return entry.name === '_captures' || entry.name === 'node_modules' ? [] : walk(rel)
  return /\.(tsx?|md|json)$/.test(entry.name) ? [rel] : []
})
const PROVENANCE = new Set(['content/data/firms.json', 'lib/firms.ts'])
for (const file of ['app', 'components', 'lib', 'content'].flatMap(walk)) {
  if (PROVENANCE.has(file) || /^content\/data\/.*(evidence|capture|check)/.test(file)) continue
  check(file, fs.readFileSync(path.join(root, file), 'utf8'), PENDING[file] ? file : null)
}

// 3. Built output (run after `next build`): rendered HTML, RSS and llms.txt.
const built = path.join(root, '.next/server/app')
let builtFiles = 0
if (fs.existsSync(built)) {
  const routeFor = rel => '/' + rel.replace(/\.(html|body)$/, '').replace(/^index$/, '')
  const pendingByRoute = new Map(Object.entries(PENDING).flatMap(([key, item]) => item.routes.map(route => [route, key])))
  const files = fs.readdirSync(built, { recursive: true }).filter(rel => /\.(html|body)$/.test(rel))
  for (const rel of files) {
    builtFiles++
    const html = fs.readFileSync(path.join(built, rel), 'utf8')
    if (![...codes.keys()].some(code => html.includes(code))) continue
    const route = routeFor(rel)
    check(`built ${route}`, html.replace(/<(script|style)\b[^>]*>(?![\s\S]*?application\/ld\+json)[\s\S]*?<\/\1>/gi, ' '), pendingByRoute.get(route) ?? null)
  }
} else {
  console.log('note: no .next build output, built-HTML check skipped')
}

for (const [key, item] of Object.entries(PENDING)) {
  if (!pendingSeen.has(key)) failures.push(`${key}: no longer shows the previous code as current; remove it from PENDING (${item.owner})`)
}
for (const [line, count] of Object.entries(Object.groupBy(report, line => line))) console.log(`${line} ×${count.length}`)
assert.deepEqual(failures, [], `previous discount code shown as live:\n${failures.join('\n')}`)
if (STRICT) assert.equal(report.length, 0, `--strict: ${report.length} pending writer-owned occurrences`)
console.log(`previous-discount-code ok: ${[...codes].map(([code, firm]) => `${firm} ${code}`).join(', ')}; ${builtFiles} built pages scanned; ${report.length} pending writer-owned occurrences`)
