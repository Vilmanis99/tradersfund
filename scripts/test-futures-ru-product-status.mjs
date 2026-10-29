// Product-level Russia status: futuresCountriesRestricted makes futures restricted
// while firm-level russiaStatus (CFD/challenge) can stay available (BrightFunded).
// Run: node scripts/test-futures-ru-product-status.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  futuresRussiaRestrictedBySlug,
  resolveFuturesRestrictedInRussia,
  resolveRussiaStatus,
  resolveRussiaStatusForProduct,
  russiaStatusesBySlug,
} from '../lib/russiaStatus.ts'

const firms = JSON.parse(readFileSync('content/data/firms.json', 'utf8'))
const bf = firms.find(f => f.name === 'BrightFunded')
assert.ok(bf, 'BrightFunded in firms.json')
assert.equal(bf.russiaStatus, 'available', 'BF CFD/challenge russiaStatus stays available')
assert.ok(Array.isArray(bf.futuresCountriesRestricted) && bf.futuresCountriesRestricted.length > 0)
assert.ok(bf.futuresCountriesRestricted.some(c => /^russia$/i.test(c)), 'BF futures list names Russia')
assert.equal(typeof bf.futuresCountriesRestrictedSourceUrl, 'string')
assert.match(bf.futuresCountriesRestrictedCapturedAt, /^\d{4}-\d{2}-\d{2}$/)

const statusBySlug = russiaStatusesBySlug(firms)
const futuresBySlug = futuresRussiaRestrictedBySlug(firms)
assert.equal(resolveRussiaStatus(statusBySlug, 'bright-funded'), 'available')
assert.equal(resolveFuturesRestrictedInRussia(futuresBySlug, 'bright-funded'), true)
assert.equal(resolveFuturesRestrictedInRussia(futuresBySlug, 'BrightFunded'), true)
assert.equal(resolveFuturesRestrictedInRussia(futuresBySlug, 'brightfunded'), true)
assert.equal(resolveRussiaStatusForProduct(statusBySlug, futuresBySlug, 'bright-funded', 'cfd'), 'available')
assert.equal(resolveRussiaStatusForProduct(statusBySlug, futuresBySlug, 'bright-funded', 'futures'), 'restricted')
assert.equal(resolveRussiaStatusForProduct(statusBySlug, futuresBySlug, 'bright-funded', null), 'available')

// Firm without a futures list: futures product status equals firm status
assert.equal(resolveFuturesRestrictedInRussia(futuresBySlug, 'ftmo'), false)
assert.equal(
  resolveRussiaStatusForProduct(statusBySlug, futuresBySlug, 'ftmo', 'futures'),
  resolveRussiaStatus(statusBySlug, 'ftmo'),
)

// Fixture: available firm + futures Russia list → product split
const fixtureFirms = [
  { name: 'Demo CFD', russiaStatus: 'available', futuresCountriesRestricted: ['Russia', 'Belarus'] },
  { name: 'Demo Open Futures', russiaStatus: 'available', futuresCountriesRestricted: ['Iran'] },
]
const fixStatus = russiaStatusesBySlug(fixtureFirms)
const fixFut = futuresRussiaRestrictedBySlug(fixtureFirms)
assert.equal(resolveRussiaStatusForProduct(fixStatus, fixFut, 'Demo CFD', 'futures'), 'restricted')
assert.equal(resolveRussiaStatusForProduct(fixStatus, fixFut, 'Demo CFD', 'cfd'), 'available')
assert.equal(resolveRussiaStatusForProduct(fixStatus, fixFut, 'Demo Open Futures', 'futures'), 'available')

console.log('futures-ru-product-status OK')
