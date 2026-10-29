/** consistencyBasis* fields: every product with a consistency % has a researched basis, quoted from a first-party page or explained when null. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'content/data/challenges')
const BASES = ['total-profit', 'profit-target', 'payout-cycle-profit', 'per-trade', 'per-position', 'other']
const KEYS = ['consistencyBasis', 'consistencyBasisQuote', 'consistencyBasisSourceUrl', 'consistencyBasisCheckedAt', 'consistencyBasisNote']
const INTERNAL = /\b(403|blocked|proxy|vpn|curl|webfetch|ip address|box|scrap|tool)\b/i

let withPct = 0, nulls = 0
for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
  for (const p of JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))) {
    const id = `${file}:${p.productSlug}`
    const hasPct = p.consistencyRulePct != null || (Array.isArray(p.consistencyRules) && p.consistencyRules.length > 0)
    if (!hasPct) {
      for (const k of KEYS) assert.equal(p[k], undefined, `${id}: ${k} without a consistency %`)
      continue
    }
    withPct++
    assert.ok('consistencyBasis' in p, `${id}: consistencyBasis researched`)
    assert.ok(p.consistencyBasis === null || BASES.includes(p.consistencyBasis), `${id}: consistencyBasis enum`)
    assert.match(p.consistencyBasisSourceUrl ?? '', /^https:\/\//, `${id}: source URL`)
    assert.match(p.consistencyBasisCheckedAt ?? '', /^\d{4}-\d{2}-\d{2}$/, `${id}: checked date`)
    if (p.consistencyBasis === null) {
      nulls++
      assert.equal(p.consistencyBasisQuote ?? null, null, `${id}: no quote with a null basis`)
      assert.ok(typeof p.consistencyBasisNote === 'string' && p.consistencyBasisNote.length > 20, `${id}: null basis needs a note`)
      assert.doesNotMatch(p.consistencyBasisNote, INTERNAL, `${id}: note is public-safe`)
      assert.doesNotMatch(p.consistencyBasisNote, /bybit/i, `${id}: no Bybit`)
    } else {
      assert.ok(typeof p.consistencyBasisQuote === 'string' && p.consistencyBasisQuote.length > 20, `${id}: quote`)
      assert.equal(p.consistencyBasisNote, undefined, `${id}: note only for null basis`)
    }
  }
}
assert.ok(withPct >= 40, 'read the products with a consistency %')
console.log(`consistency basis: ${withPct} products with a consistency % carry a basis (${nulls} null with notes)`)
