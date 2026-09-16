/** Exercise the real CLI inside an isolated scratch repository, never shipped data. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scratchParent = path.join(root, '.preview')
fs.mkdirSync(scratchParent, { recursive: true })
const scratch = fs.mkdtempSync(path.join(scratchParent, 'capture-merge-test-'))
for (const dir of ['scripts', 'captures', 'content/data/challenges']) fs.mkdirSync(path.join(scratch, dir), { recursive: true })
for (const name of ['merge-capture.mjs', 'challenge-diff.mjs']) fs.copyFileSync(path.join(root, 'scripts', name), path.join(scratch, 'scripts', name))
const target = path.join(scratch, 'content/data/challenges/fixture-firm.json')
const capturePath = path.join(scratch, 'captures/capture-fixture-firm.json')
const date = new Date().toISOString().slice(0, 10)
const product = {
  productName: 'Fixture', productSlug: 'fixture', phases: 1,
  accountSizes: [{ sizeUsd: 10000, priceUsd: 100, refundable: null }],
  profitTargets: { phase1: 8 }, dailyLossPct: 5, maxLossPct: 10,
  drawdownType: 'static', minTradingDays: 0, maxTradingDays: null,
  consistencyRulePct: null, profitSplitPct: 80, payoutFirstDays: null, payoutFrequency: null,
  rules: { news: true, weekend: true, overnight: true, ea: 'restricted', copyTrading: null },
  assetClass: 'cfd', sourceUrl: 'https://fixture.example/rules',
}
const baseline = JSON.stringify([{ ...product, firmSlug: 'fixture-firm', sourceCapturedAt: date }], null, 2) + '\n'
const capture = overrides => ({ firmSlug: 'fixture-firm', capturedAt: date, products: [{ ...product, profitSplitPct: 70 }], ...overrides })
function run(input, args = []) {
  fs.writeFileSync(target, baseline)
  fs.writeFileSync(capturePath, typeof input === 'string' ? input : JSON.stringify(input))
  const result = spawnSync(process.execPath, [path.join(scratch, 'scripts/merge-capture.mjs'), 'fixture-firm', '--dir', path.join(scratch, 'captures'), ...args], { encoding: 'utf8', timeout: 30000 })
  assert.ifError(result.error)
  return { ...result, output: result.stdout + result.stderr }
}
const accept = ['--write', '--accept-changes']
let result = run(capture({ reviewStatus: 'draft', releaseBlockers: ['Conflicting prices'] }))
assert.equal(result.status, 0)
assert.match(result.output, /profitSplitPct: 80 → 70/)
assert.match(result.output, /editorial status: draft/)
assert.equal(fs.readFileSync(target, 'utf8'), baseline)
for (const hold of [
  { reviewStatus: 'draft' },
  { reviewStatus: 'draft', releaseBlockers: ['Conflicting prices'] },
  { reviewStatus: 'ready', releaseBlockers: ['Availability unresolved'] },
  { releaseBlockers: ['Missing verification'] },
]) {
  result = run(capture(hold), accept)
  assert.equal(result.status, 1, 'accept-changes cannot override an editorial hold')
  assert.match(result.output, /capture has an editorial hold/)
  assert.equal(fs.readFileSync(target, 'utf8'), baseline, 'held merge preserves the exact shipped bytes')
  assert(!fs.existsSync(path.join(scratch, 'content/data/challenges/_captures')), 'held merge does not archive a false completed capture')
}
for (const invalid of [{ reviewStatus: 'approved' }, { reviewStatus: null }, { releaseBlockers: 'conflict' }, { releaseBlockers: [''] }, { releaseBlockers: [7] }]) {
  result = run(capture(invalid), accept)
  assert.equal(result.status, 1, 'malformed review metadata fails closed')
  assert.equal(fs.readFileSync(target, 'utf8'), baseline)
}
for (const invalid of [
  { maxTradingDaysUnlimited: 'true' }, { consistencyRuleApplies: 'false' },
  { maxTradingDays: 30, maxTradingDaysUnlimited: true },
  { consistencyRulePct: 50, consistencyRuleApplies: false },
  { minTradingDays: -1 }, { minTradingDays: 0.5 }, { maxTradingDays: 0 },
  { consistencyRulePct: 0 }, { consistencyRulePct: 101 },
]) {
  result = run(capture({ products: [{ ...product, ...invalid }] }), accept)
  assert.equal(result.status, 1, 'ambiguous or contradictory numeric-rule states block the merge')
  assert.equal(fs.readFileSync(target, 'utf8'), baseline)
}
const explicitAbsence = capture({ products: [{ ...product, maxTradingDaysUnlimited: true, consistencyRuleApplies: false }] })
for (const sourceCapturedAt of ['invalid', '2999-01-01', '', null, '2026-02-30']) {
  result = run(capture({ products: [{ ...product, sourceCapturedAt }] }), accept)
  assert.equal(result.status, 1, 'invalid/future product dates cannot be used to bypass source scope')
  assert.equal(fs.readFileSync(target, 'utf8'), baseline)
}
result = run(explicitAbsence, ['--write'])
assert.equal(result.status, 1, 'rule-presence flags alone are material changes requiring acknowledgement')
assert.match(result.output, /maxTradingDaysUnlimited/)
assert.match(result.output, /consistencyRuleApplies/)
assert.equal(fs.readFileSync(target, 'utf8'), baseline)
result = run('{invalid JSON', accept)
assert.equal(result.status, 1)
assert.equal(fs.readFileSync(target, 'utf8'), baseline)
result = run(capture({}), ['--write'])
assert.equal(result.status, 1, 'unacknowledged material changes return failure to automation')
assert.match(result.output, /material changes require editorial review/)
assert.equal(fs.readFileSync(target, 'utf8'), baseline)
result = run(capture({ products: [{ ...product, accountSizes: [{ sizeUsd: 10000, priceUsd: null }] }] }), accept)
assert.equal(result.status, 1)
assert.match(result.output, /refusing to regress/)
assert.equal(fs.readFileSync(target, 'utf8'), baseline)
for (const ready of [{}, { reviewStatus: 'ready', releaseBlockers: [] }]) {
  result = run(capture(ready), accept)
  assert.equal(result.status, 0, result.output)
  const merged = JSON.parse(fs.readFileSync(target, 'utf8'))
  assert.equal(merged[0].profitSplitPct, 70)
  assert.equal(merged[0].sourceCapturedAt, date)
  const archived = JSON.parse(fs.readFileSync(path.join(scratch, `content/data/challenges/_captures/fixture-firm-${date}.json`), 'utf8'))
  assert.deepEqual(archived, capture(ready), 'successful capture retains its exact provenance')
}
result = run(explicitAbsence, accept)
assert.equal(result.status, 0, result.output)
const explicitMerged = JSON.parse(fs.readFileSync(target, 'utf8'))[0]
assert.equal(explicitMerged.maxTradingDaysUnlimited, true)
assert.equal(explicitMerged.consistencyRuleApplies, false)
assert.equal(explicitMerged.maxTradingDays, null)
assert.equal(explicitMerged.consistencyRulePct, null)
result = run(capture({ products: [{ ...product, sourceCapturedAt: '2026-01-01' }] }), accept)
assert.equal(result.status, 0, result.output)
assert.equal(JSON.parse(fs.readFileSync(target, 'utf8'))[0].sourceCapturedAt, '2026-01-01', 'mixed-scope capture preserves an older unresolved product date')
console.log('Capture merge checks passed: draft preview, write holds, malformed input, explicit rule states, contradiction checks, non-zero failures, price protection, explicit acknowledgement and legacy/ready success.')
console.log(`Isolated fixtures retained in ${path.relative(root, scratch)}.`)
