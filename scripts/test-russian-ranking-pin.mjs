/** /ru/luchshie-prop-firmy order: a pinned firm leads only while it is open to Russia. */
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { compareRussianRanking, RU_RANKING_PINS } = await jiti.import('../lib/russianRanking.ts')

const firms = [
  { slug: 'bright-funded', name: 'BrightFunded', score: 7.0 },
  { slug: 'open-high', name: 'Open High', score: 9.0 },
  { slug: 'unclear-top', name: 'Unclear Top', score: 9.5 },
  { slug: 'closed-top', name: 'Closed Top', score: 9.9 },
]
const order = statuses => [...firms]
  .sort((a, b) => compareRussianRanking(a, b, slug => statuses[slug] ?? 'unverified', ['bright-funded']))
  .map(firm => firm.slug)

const base = { 'open-high': 'available', 'unclear-top': 'unclear', 'closed-top': 'restricted' }
assert.deepEqual(order({ ...base, 'bright-funded': 'available' }), ['bright-funded', 'open-high', 'unclear-top', 'closed-top'],
  'an open pinned firm leads, then status-first order')
assert.deepEqual(order({ ...base, 'bright-funded': 'restricted' }), ['open-high', 'unclear-top', 'closed-top', 'bright-funded'],
  'a restricted pinned firm loses its pin and sorts by score among restricted firms')
assert.deepEqual(order({ ...base, 'bright-funded': 'unclear' }), ['open-high', 'unclear-top', 'bright-funded', 'closed-top'],
  'an unclear pinned firm loses its pin and sorts by score among unclear firms')
assert.deepEqual(order({ ...base }), ['open-high', 'unclear-top', 'bright-funded', 'closed-top'],
  'an unverified pinned firm loses its pin')
assert(Array.isArray(RU_RANKING_PINS) && RU_RANKING_PINS.every(slug => typeof slug === 'string'), 'pins come from content/data/ru-ranking.json')
console.log('russian ranking pin: ok')
