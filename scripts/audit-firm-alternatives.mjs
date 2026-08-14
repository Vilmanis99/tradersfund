/**
 * Commercial-independence audit for review alternatives.
 *
 * Run: npm run audit:alternatives
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rankFirmAlternatives } from '../lib/firmAlternatives.ts'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const firms = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'content/data/firms.json'), 'utf8'),
)

function selectedNames(current, candidates) {
  return rankFirmAlternatives(current, candidates).map(firm => firm.name)
}

function toggleAffiliateUrl(firm) {
  return {
    ...firm,
    affiliateUrl: firm.affiliateUrl
      ? ''
      : `https://affiliate-toggle.invalid/${encodeURIComponent(firm.name)}`,
  }
}

const baselineByFirm = new Map(
  firms.map(current => [current.name, selectedNames(current, firms)]),
)
const firmsBeforeAudit = JSON.stringify(firms)

for (const current of firms) {
  assert.deepEqual(
    selectedNames(current, [...firms].reverse()),
    baselineByFirm.get(current.name),
    `${current.name}: alternatives changed when the input order was reversed`,
  )
}

const allAffiliateUrlsToggled = firms.map(toggleAffiliateUrl)
for (const current of allAffiliateUrlsToggled) {
  assert.deepEqual(
    selectedNames(current, allAffiliateUrlsToggled),
    baselineByFirm.get(current.name),
    `${current.name}: alternatives changed when every affiliateUrl was toggled`,
  )
}

let individualToggleChecks = 0
for (let toggledIndex = 0; toggledIndex < firms.length; toggledIndex += 1) {
  const oneAffiliateUrlToggled = firms.map((firm, index) =>
    index === toggledIndex ? toggleAffiliateUrl(firm) : firm,
  )

  for (const current of oneAffiliateUrlToggled) {
    assert.deepEqual(
      selectedNames(current, oneAffiliateUrlToggled),
      baselineByFirm.get(current.name),
      `${current.name}: alternatives changed when ${firms[toggledIndex].name}'s affiliateUrl was toggled`,
    )
    individualToggleChecks += 1
  }
}

const topstep = firms.find(firm => firm.name === 'Topstep')
assert(topstep, 'Topstep is missing from content/data/firms.json')

const topstepAlternatives = rankFirmAlternatives(topstep, firms)
assert.equal(topstepAlternatives.length, 3, 'Topstep must have 3 alternatives')
for (const alternative of topstepAlternatives) {
  assert(
    alternative.assets.some(asset => asset.trim().toLowerCase() === 'futures'),
    `Topstep alternative ${alternative.name} is not futures-relevant`,
  )
}

assert.equal(
  JSON.stringify(firms),
  firmsBeforeAudit,
  'alternative ranking mutated the firm dataset',
)

console.log(
  `✓ affiliate independence: ${firms.length} global toggles and ${individualToggleChecks} individual selection checks`,
)
console.log(`✓ deterministic and pure: ${firms.length} reversed-order checks, 0 mutations`)
console.log(
  `✓ Topstep futures alternatives: ${topstepAlternatives.map(firm => firm.name).join(', ')}`,
)
