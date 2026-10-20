import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { firstPayoutDaysLabel, payoutFirstDaysUnit } from '../lib/challengeRuleLabels.ts'

// Fixtures: the unit comes only from a note naming the stored value.
const lite = { payoutFirstDays: 10, notes: ['First Performance Reward is available after 10 business days.'] }
assert.equal(payoutFirstDaysUnit(lite), 'business')
assert.equal(firstPayoutDaysLabel(lite), '10 business days')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 14, notes: ['first request after 14 calendar days'] }), '14 calendar days')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 5, notes: ['10-business-day cycle'] }), '5 days', 'a note about another number does not set the unit')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 10, notes: ['110 business days', '2.10 business days'] }), '10 days', 'no partial-number match')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 10, notes: ['10 business days', 'legacy: 10 calendar days'] }), '10 days', 'contradictory notes fall back to plain days')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 1, notes: ['1 business day'] }), '1 business day')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 7 }), '7 days')
assert.equal(firstPayoutDaysLabel({ payoutFirstDays: 0 }), '0 days')
for (const invalid of [null, undefined, -1, 1.5, NaN, Infinity, '10']) {
  assert.equal(firstPayoutDaysLabel({ payoutFirstDays: invalid }), 'Not published')
}

// Real data: every label is a number + unit, never a placeholder.
const dir = new URL('../content/data/challenges/', import.meta.url)
for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
  for (const product of JSON.parse(readFileSync(new URL(file, dir), 'utf8'))) {
    const label = firstPayoutDaysLabel(product)
    assert.match(label, /^(Not published|\d+ (business |calendar )?days?)$/, `${product.productSlug}: ${label}`)
    if (product.firmSlug === 'fundednext' && product.productSlug === 'stellar-lite'
      && (product.notes ?? []).some(note => /\b10 business days\b/i.test(note))) {
      assert.equal(label, '10 business days', 'Stellar Lite reads its business-day unit from the data notes')
    }
  }
}
console.log('payout days unit: ok')
