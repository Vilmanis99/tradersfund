/**
 * audit:ru-links registers gate-passing RU best-for paths via
 * indexableBestForPaths() (same as sitemap / IndexNow / release-crawl).
 * A best-for path that fails the gate must stay unregistered.
 * Run: npm run test:audit-ru-links
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { allBestForPaths, indexableBestForPaths } from '../lib/bestFor.ts'
import { LOCALIZED_ROUTE_PAIRS } from '../lib/localizedRoutes.ts'
import { registeredRuLinkRoutes } from './audit-ru-links.mjs'

const NOVICHKI = '/ru/luchshie-prop-firmy-dlya-novichkov'

function makeEmptyVerdictRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-ru-links-verdicts-'))
  fs.mkdirSync(path.join(root, 'content/verdicts/best-for'), { recursive: true })
  return root
}

const allRuBestFor = allBestForPaths().filter(p => p.startsWith('/ru/'))
assert.ok(allRuBestFor.includes(NOVICHKI), 'novichki is a built RU best-for path')

// Do not put best-for paths in LOCALIZED_ROUTE_PAIRS — that forces hreflang.
const pairRu = new Set(LOCALIZED_ROUTE_PAIRS.map(pair => pair.ru))
for (const route of allRuBestFor) {
  assert.ok(!pairRu.has(route), `${route} must not be in LOCALIZED_ROUTE_PAIRS`)
}

// Live tree: register iff the gate passes. Non-indexable best-for paths stay out.
const liveIndexableRu = indexableBestForPaths().filter(p => p.startsWith('/ru/'))
const liveRegistered = new Set(registeredRuLinkRoutes())
assert.deepEqual(
  allRuBestFor.filter(route => liveRegistered.has(route)).sort(),
  [...liveIndexableRu].sort(),
)
for (const route of liveIndexableRu) {
  assert.ok(liveRegistered.has(route), `indexable ${route} must be a registered RU audit route`)
}
for (const route of allRuBestFor) {
  if (!liveIndexableRu.includes(route)) {
    assert.ok(!liveRegistered.has(route), `gated-off ${route} must stay unregistered`)
  }
}

// Negative control: empty verdict root fails the gate for every best-for page,
// including novichki, so a hub link to it is still an unregistered-route error.
const emptyRoot = makeEmptyVerdictRoot()
assert.deepEqual(indexableBestForPaths(new Date(), emptyRoot), [])
const emptyRegistered = new Set(registeredRuLinkRoutes(new Date(), emptyRoot))
for (const route of allRuBestFor) {
  assert.ok(!emptyRegistered.has(route), `empty verdicts: ${route} must stay unregistered`)
}

function unregisteredErrors(from, hrefs, registered) {
  return hrefs.filter(href => !registered.has(href)).map(href => `${from}: links unregistered RU route ${href}`)
}

assert.deepEqual(
  unregisteredErrors('/ru/luchshie-prop-firmy', [NOVICHKI], emptyRegistered),
  ['/ru/luchshie-prop-firmy: links unregistered RU route /ru/luchshie-prop-firmy-dlya-novichkov'],
)
if (liveIndexableRu.includes(NOVICHKI)) {
  assert.deepEqual(unregisteredErrors('/ru/luchshie-prop-firmy', [NOVICHKI], liveRegistered), [])
}

console.log(`audit-ru-links registered-route tests OK (${liveIndexableRu.length} indexable RU best-for, ${allRuBestFor.length - liveIndexableRu.length} gated-off)`)
