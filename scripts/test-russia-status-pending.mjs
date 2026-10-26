// Unit test: russiaStatusFor() falls back to content/data/firms-pending.json russiaStatus for firms not in firms.json
// (RU SEO Lead 2026-10-26: RU reviews of Spice Prop, Goat Funded Trader, Blue Guardian on 28-30 Oct).
// firms.json stays the priority source; only 'restricted'/'unclear' fall back; unknown firms, pending 'available' and
// pending entries without a valid status stay 'unverified'.
// EA 2026-10-26: a pending 'available' keeps status 'unverified' (ranking, counters, CTA gating) but its badge is the neutral
// basis label «нет в списке ограничений (на DD.MM.YYYY)» from the entry's own russiaSourceCapturedAt, or undated without one.
// EA 2026-10-26 (TeamTraders): a pending entry with russiaBasis 'no-published-country-list' (the firm publishes no country
// list at all) gets «ограничений по странам не опубликовано (на DD.MM.YYYY)» instead. Modelled in data, never keyed on an
// empty countriesRestricted. BrightFunded / CFT (published lists) keep «нет в списке ограничений».
// Run: node scripts/test-russia-status-pending.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolvePendingNotListed, resolveRussiaBasisDate, resolveRussiaStatus, russiaBasisDatesBySlug, russiaPendingNotListedBySlug, russiaStatusesBySlug, russiaStatusesWithPending } from '../lib/russiaStatus.ts'
import { RU_ACCESS_BADGE, RU_BASIS_LABEL, ruAccessBadge, ruBasisLabel, ruNotListedLabel } from '../lib/ruAccessLabel.ts'

// Fixtures
const firms = [
  { name: 'BrightFunded', russiaStatus: 'available', russiaBasis: 'not-on-restricted-list', russiaSourceCapturedAt: '2026-10-23' },
  { name: 'FTMO', russiaStatus: 'restricted' },
  { name: 'No Status Firm' },
]
const pending = [
  { name: 'Spice Prop', slug: 'spice-prop', russiaStatus: 'unclear' },
  { name: 'Goat Funded Trader', russiaStatus: 'restricted' },
  { name: 'FTMO', russiaStatus: 'available' },            // firms.json wins
  { name: 'No Status Firm', russiaStatus: 'available' },  // firms.json wins even without a status ('unverified')
  { name: 'Typo Firm', russiaStatus: 'open' },            // invalid status adds nothing
  { name: 'Empty Firm' },                                 // no status adds nothing
  { name: 'Slugged Co', slug: 'slugged', russiaStatus: 'restricted' },
  { name: 'Inferred Open', russiaStatus: 'available' },   // pending 'available' is not promoted
  { name: 'Dated Open', slug: 'dated-open-co', russiaStatus: 'available', russiaSourceCapturedAt: '2026-10-21' },
  { name: 'Bad Date Open', russiaStatus: 'available', russiaSourceCapturedAt: '21.10.2026' }, // invalid date -> undated
  { name: 'No List Open', russiaStatus: 'available', russiaBasis: 'no-published-country-list', russiaSourceCapturedAt: '2026-10-20', countriesRestricted: [] },
  { name: 'No List Undated', russiaStatus: 'available', russiaBasis: 'no-published-country-list' },
  { name: 'Empty List Only', russiaStatus: 'available', countriesRestricted: [] }, // empty list alone does NOT pick the no-list basis
]
const map = russiaStatusesWithPending(firms, pending)
const status = name => resolveRussiaStatus(map, name)
assert.equal(status('Spice Prop'), 'unclear', 'pending firm falls back to its firms-pending russiaStatus')
assert.equal(status('spice-prop'), 'unclear', 'pending firm resolves by slug')
assert.equal(status('Goat Funded Trader'), 'restricted')
assert.equal(status('slugged'), 'restricted', 'explicit pending slug is a key too')
assert.equal(status('Slugged Co'), 'restricted', 'pending name slug is a key too')
assert.equal(status('FTMO'), 'restricted', 'firms.json status has priority over firms-pending')
assert.equal(status('No Status Firm'), 'unverified', 'a firms.json firm without russiaStatus stays unverified, pending does not fill it')
assert.equal(status('Typo Firm'), 'unverified', 'invalid pending status is ignored')
assert.equal(status('Inferred Open'), 'unverified', "pending 'available' stays unverified (no «Открыта для РФ» from pending data)")
assert.equal(status('Empty Firm'), 'unverified', 'pending entry without russiaStatus stays unverified')
assert.equal(status('Unknown Firm'), 'unverified', 'unknown firm stays unverified')
assert.equal(status('brightfunded'), 'available', 'aliases still resolve to firms.json')
assert.equal(status('The5ers'), 'restricted', 'EXTRA_RESTRICTED still applies')
// Without pending entries the map equals the old firms.json-only map.
assert.deepEqual(russiaStatusesWithPending(firms, []), russiaStatusesBySlug(firms))
// Pending firms never get a basis date: the neutral label stays firms.json-only.
const dates = russiaBasisDatesBySlug(firms)
assert.equal(resolveRussiaBasisDate(dates, 'Spice Prop'), null)
assert.equal(resolveRussiaBasisDate(dates, 'BrightFunded'), '2026-10-23')

// Pending 'available' -> neutral basis badge, never «Открыта для РФ»; status stays 'unverified'.
const notListed = russiaPendingNotListedBySlug(firms, pending)
const pend = name => resolvePendingNotListed(notListed, name)
assert.deepEqual(pend('Inferred Open'), { date: null, basis: 'not-on-restricted-list' }, 'pending available without a date: undated marker')
assert.deepEqual(pend('Dated Open'), { date: '2026-10-21', basis: 'not-on-restricted-list' }, 'pending russiaSourceCapturedAt is the date')
assert.deepEqual(pend('dated-open-co'), { date: '2026-10-21', basis: 'not-on-restricted-list' }, 'explicit pending slug resolves')
assert.deepEqual(pend('Bad Date Open'), { date: null, basis: 'not-on-restricted-list' }, 'invalid pending date is not used (no invented date)')
assert.equal(pend('FTMO'), null, 'firms.json wins: a pending available with a firms.json twin gets no pending badge')
assert.equal(pend('No Status Firm'), null, 'firms.json wins even without a status')
assert.equal(pend('Spice Prop'), null, "only pending 'available' entries are marked")
assert.equal(pend('Unknown Firm'), null)
for (const name of ['Inferred Open', 'Dated Open', 'Bad Date Open']) assert.equal(status(name), 'unverified', `${name}: status stays 'unverified' (not available for ranking, counters, CTA gating)`)
assert.deepEqual(ruAccessBadge(status('Inferred Open'), null, pend('Inferred Open')), { modifier: 'neutral', label: 'нет в списке ограничений', basis: 'not-on-restricted-list' }, 'no pending date -> undated neutral label')
assert.deepEqual(ruAccessBadge(status('Dated Open'), null, pend('Dated Open')), { modifier: 'neutral', label: 'нет в списке ограничений (на 21.10.2026)', basis: 'not-on-restricted-list' }, 'pending date -> dated neutral label, same as the basis badge')
// No published country list (TeamTraders-style): its own pinned wording, dated from the capture or undated.
assert.equal(RU_BASIS_LABEL['no-published-country-list'], 'ограничений по странам не опубликовано', 'pinned no-list wording')
assert.equal(RU_BASIS_LABEL['not-on-restricted-list'], 'нет в списке ограничений', 'pinned list-absence wording')
assert.deepEqual(pend('No List Open'), { date: '2026-10-20', basis: 'no-published-country-list' }, 'no-list basis read from data')
assert.deepEqual(ruAccessBadge(status('No List Open'), null, pend('No List Open')), { modifier: 'neutral', label: 'ограничений по странам не опубликовано (на 20.10.2026)', basis: 'no-published-country-list' }, 'dated no-list label')
assert.deepEqual(ruAccessBadge(status('No List Undated'), null, pend('No List Undated')), { modifier: 'neutral', label: 'ограничений по странам не опубликовано', basis: 'no-published-country-list' }, 'undated no-list label (no invented date)')
assert.equal(pend('Empty List Only').basis, 'not-on-restricted-list', 'an empty countriesRestricted alone never selects the no-list basis')
assert.equal(status('No List Open'), 'unverified', 'no-list pending firm stays unverified')
// Firms that publish a list (firms.json basis) keep the list-absence label.
assert.deepEqual(ruAccessBadge('available', '2026-10-23', null), { modifier: 'neutral', label: 'нет в списке ограничений (на 23.10.2026)', basis: 'not-on-restricted-list' }, 'published-list firm keeps «нет в списке ограничений»')
assert.equal(ruAccessBadge(status('Dated Open'), null, pend('Dated Open')).label, ruNotListedLabel('2026-10-21'), 'exactly the basis label')
assert.deepEqual(ruAccessBadge('unverified', null, null), RU_ACCESS_BADGE.unverified, 'no pending marker -> unchanged unverified badge')
assert.deepEqual(ruAccessBadge('restricted', null, { date: '2026-10-21', basis: 'no-published-country-list' }), RU_ACCESS_BADGE.restricted, 'a pending marker never softens restricted')
assert.deepEqual(ruAccessBadge('unclear', null, { date: null, basis: 'no-published-country-list' }), RU_ACCESS_BADGE.unclear, 'a pending marker never changes unclear')
for (const name of ['Inferred Open', 'Dated Open', 'Bad Date Open', 'No List Open', 'No List Undated']) assert.notEqual(ruAccessBadge(status(name), null, pend(name)).label, RU_ACCESS_BADGE.available.label, `${name}: never «Открыта для РФ»`)

// Real data: every firms.json firm keeps its own status; pending firms not in firms.json resolve to their pending status.
const realFirms = JSON.parse(readFileSync('content/data/firms.json', 'utf8'))
const realPending = JSON.parse(readFileSync('content/data/firms-pending.json', 'utf8')).firms
const real = russiaStatusesWithPending(realFirms, realPending)
const base = russiaStatusesBySlug(realFirms)
for (const firm of realFirms) assert.equal(resolveRussiaStatus(real, firm.name), resolveRussiaStatus(base, firm.name), `${firm.name}: firms.json status unchanged`)
const inFirms = new Set(realFirms.map(firm => firm.name.toLowerCase()))
let fellBack = 0
for (const firm of realPending) {
  if (inFirms.has(firm.name.toLowerCase())) continue
  const expected = ['restricted', 'unclear'].includes(firm.russiaStatus) ? firm.russiaStatus : 'unverified'
  assert.equal(resolveRussiaStatus(real, firm.name), expected, `${firm.name}: falls back to firms-pending russiaStatus`)
  if (firm.slug) assert.equal(resolveRussiaStatus(real, firm.slug), expected, `${firm.slug}: slug resolves`)
  fellBack++
}
for (const name of ['Spice Prop', 'Goat Funded Trader', 'Blue Guardian']) {
  const entry = realPending.find(firm => firm.name === name)
  assert.ok(entry && !inFirms.has(name.toLowerCase()), `${name} is a pending firm`)
  assert.equal(resolveRussiaStatus(real, name), entry.russiaStatus, `${name}: RU review reads the pending russiaStatus`)
}
const realNotListed = russiaPendingNotListedBySlug(realFirms, realPending)
const pendingOpenReal = realPending.filter(f => f.russiaStatus === 'available' && !inFirms.has(f.name.toLowerCase()))
const pendingLabels = []
for (const firm of pendingOpenReal) {
  const marker = resolvePendingNotListed(realNotListed, firm.name)
  const want = /^\d{4}-\d{2}-\d{2}$/.test(firm.russiaSourceCapturedAt ?? '') ? firm.russiaSourceCapturedAt : null
  const wantBasis = firm.russiaBasis === 'no-published-country-list' ? 'no-published-country-list' : 'not-on-restricted-list'
  assert.deepEqual(marker, { date: want, basis: wantBasis }, `${firm.name}: pending date is its own russiaSourceCapturedAt or null; basis from data`)
  const badge = ruAccessBadge(resolveRussiaStatus(real, firm.name), null, marker)
  assert.equal(badge.modifier, 'neutral', `${firm.name}: neutral badge`)
  assert.equal(badge.label, ruBasisLabel(wantBasis, want), `${firm.name}: basis label`)
  if (wantBasis === 'no-published-country-list') assert.equal((firm.countriesRestricted ?? []).length, 0, `${firm.name}: no-published-country-list but countriesRestricted is not empty`)
  pendingLabels.push(`${firm.name} «${badge.label}»`)
}
// TeamTraders (EA 2026-10-26): no published country list, dated from the 2026-10-20 capture.
{
  const tt = realPending.find(firm => firm.name === 'TeamTraders')
  assert.ok(tt, 'TeamTraders pending entry')
  assert.equal(tt.russiaBasis, 'no-published-country-list', 'TeamTraders basis')
  assert.equal(tt.russiaSourceCapturedAt, '2026-10-20', 'TeamTraders date = capture date')
  const capture = JSON.parse(readFileSync('content/data/challenges/_captures/teamtraders-2026-10-20.json', 'utf8'))
  assert.equal(capture.capturedAt, '2026-10-20', 'cited capture exists and is dated 2026-10-20')
  assert.match(capture.countryAccess?.note ?? '', /No country list/, 'cited capture records that no country list is published')
  assert.equal(ruAccessBadge(resolveRussiaStatus(real, 'TeamTraders'), null, resolvePendingNotListed(realNotListed, 'TeamTraders')).label, 'ограничений по странам не опубликовано (на 20.10.2026)', 'TeamTraders badge')
}
// BrightFunded and CFT publish lists: they keep «нет в списке ограничений (на …)».
{
  const realDates = russiaBasisDatesBySlug(realFirms)
  for (const name of ['BrightFunded', 'Crypto Fund Trader']) {
    const date = resolveRussiaBasisDate(realDates, name)
    assert.ok(date, `${name}: has a not-on-restricted-list date`)
    const badge = ruAccessBadge(resolveRussiaStatus(real, name), date, resolvePendingNotListed(realNotListed, name))
    assert.equal(badge.label, ruNotListedLabel(date), `${name}: keeps «нет в списке ограничений»`)
    assert.match(badge.label, /^нет в списке ограничений \(на \d{2}\.\d{2}\.\d{4}\)$/)
  }
}
console.log(`pending 'available' badges: ${pendingLabels.join('; ') || 'none'}`)
console.log(`test:russia-status-pending OK: ${fellBack} pending firms resolve from firms-pending.json (${realPending.filter(f => !inFirms.has(f.name.toLowerCase())).map(f => `${f.name}=${resolveRussiaStatus(real, f.name)}`).join(', ')}); firms.json priority kept for ${realFirms.length} firms`)
