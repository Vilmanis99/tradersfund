import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateWatchCaptureProvenance } from '../lib/challengeWatchEvidence.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readEvidence = file => JSON.parse(fs.readFileSync(path.join(root, 'content/data', file), 'utf8'))
const entries = readEvidence('challenge-watch.json')
const ruleEntries = entries.filter(entry => entry.ruleEvidenceRefs)
assert.equal(ruleEntries.length, 3)
for (const entry of ruleEntries) {
  const products = readEvidence(`challenges/${entry.firmSlug}.json`).filter(product => entry.productSlugs.includes(product.productSlug))
  assert(products.length > 0)
  assert(products.every(product => product.sourceCapturedAt < entry.lastCheckedAt), 'rule-only recheck did not relabel older price captures')
  assert.deepEqual(validateWatchCaptureProvenance(entry, products, readEvidence), [])
}
const entry = structuredClone(ruleEntries[0])
const products = [{ sourceCapturedAt: '2026-08-27' }]
const validate = (candidate, read = readEvidence) => validateWatchCaptureProvenance(candidate, products, read)
const rejects = (candidate, pattern, read) => assert.match(validate(candidate, read).join('\n'), pattern)
const legacy = { ...entry }
delete legacy.ruleEvidenceRefs
rejects(legacy, /does not match every affected product capture/)
assert.deepEqual(validateWatchCaptureProvenance(legacy, [{ sourceCapturedAt: entry.lastCheckedAt }], readEvidence), [])
for (const kind of ['price-watch', 'lineup-change']) rejects({ ...entry, kind }, /cannot replace a price or lineup capture/)
for (const ruleEvidenceRefs of [[], null, 'ea']) rejects({ ...entry, ruleEvidenceRefs }, /must contain supporting evidence/)
for (const file of ['../outside.json', '/outside.json', 'C:\\outside.json', 'nested/file.json', 'bad.txt']) {
  rejects({ ...entry, ruleEvidenceRefs: [{ file, section: 'ea' }] }, /invalid rule evidence/, () => { throw new Error('must not be called') })
}
rejects({ ...entry, ruleEvidenceRefs: [{ file: 'missing.json', section: 'ea' }] }, /cannot be read/)
rejects({ ...entry, ruleEvidenceRefs: [{ file: entry.ruleEvidenceRefs[0].file, section: 'missing' }] }, /missing evidence section/)
rejects({ ...entry, ruleEvidenceRefs: [...entry.ruleEvidenceRefs, ...entry.ruleEvidenceRefs] }, /duplicate rule evidence/)
rejects({ ...entry, firmSlug: 'another-firm' }, /different or unspecified firm/)
rejects({ ...entry, lastCheckedAt: '2026-09-09' }, /rule capture must match lastCheckedAt/)
rejects({ ...entry, sourceUrls: [] }, /requires first-party source URLs/)
rejects({ ...entry, sourceUrls: undefined }, /requires first-party source URLs/)
rejects({ ...entry, sourceUrls: ['https://example.com/not-the-source'] }, /must be cited|lacks dated rule evidence/)
rejects({ ...entry, sourceUrls: [...entry.sourceUrls, 'https://help.fundednext.com/unverified'] }, /lacks dated rule evidence/)
const changedDate = file => {
  const document = readEvidence(file)
  document.ea.sourceCapturedAt = '2026-08-28'
  return document
}
rejects(entry, /rule capture must match lastCheckedAt/, changedDate)
const partialScope = { ...ruleEntries[1], ruleEvidenceRefs: ruleEntries[1].ruleEvidenceRefs.slice(0, 1) }
rejects(partialScope, /lacks dated rule evidence/)
const conflict = entries.find(entry => entry.sourceConflictEvidenceRefs)
assert(conflict, 'A separately dated source conflict is recorded')
const conflictProducts = readEvidence(`challenges/${conflict.firmSlug}.json`).filter(product => conflict.productSlugs.includes(product.productSlug))
assert(conflictProducts.length === conflict.productSlugs.length, 'Conflict observations cover every affected product')
assert(conflictProducts.every(product => product.sourceCapturedAt < conflict.lastCheckedAt), 'Conflict observations must not renew product verification')
assert.deepEqual(validateWatchCaptureProvenance(conflict, conflictProducts, readEvidence), [])
const conflictRejects = (candidate, pattern, read = readEvidence) => assert.match(validateWatchCaptureProvenance(candidate, conflictProducts, read).join('\n'), pattern)
conflictRejects({ ...conflict, status: 'verified' }, /only valid for unresolved/)
for (const kind of ['rule-change', 'price-watch', 'lineup-change']) conflictRejects({ ...conflict, kind }, /only valid for unresolved/)
conflictRejects({ ...conflict, ruleEvidenceRefs: entry.ruleEvidenceRefs }, /cannot combine/)
conflictRejects({ ...conflict, productSlugs: [] }, /requires affected product/)
conflictRejects({ ...conflict, sourceConflictEvidenceRefs: null }, /must contain supporting evidence/)
conflictRejects({ ...conflict, sourceConflictEvidenceRefs: conflict.sourceConflictEvidenceRefs.slice(0, 1) }, /at least two cited sources/)
conflictRejects({ ...conflict, sourceConflictEvidenceRefs: [{ file: '../outside.json', section: 'prices' }] }, /invalid conflict evidence/)
conflictRejects({ ...conflict, lastCheckedAt: '2026-09-09' }, /conflict capture must match/)
for (const change of [
  document => { document.homepagePrices.quote = '' },
  document => { document.homepagePrices.productSlugs = ['another-programme'] },
  document => { document.termsPrices.productSlugs = ['break'] },
]) conflictRejects(conflict, /source quote|product scope|at least two cited sources/, file => {
  const document = readEvidence(file); change(document); return document
})
console.log('Watch evidence checks passed: real rule rechecks, unchanged price dates, legacy capture gates, source coverage, scope and malformed references.')
