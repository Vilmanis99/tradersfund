/**
 * Unit checks for the rules template (lib/rulesPages.ts) and verdict loader
 * (lib/verdicts.ts). No build, no sample files: it mutates real firms.json
 * entries in memory. Run: npm run test:rules-pages
 *
 * 1. A page indexes only when its data is complete, sourced and <=30 days old
 *    AND a writer verdict exists for that language (EA decision 26.10.2026).
 *    Data-complete without a verdict is noindex; data-complete with an
 *    in-memory fixture verdict (never written to content/) is indexable.
 *    Blanking any required field, downgrading its evidence to a capture note,
 *    adding a contradiction note, or moving the clock past 30 days makes it
 *    noindex with a reason, verdict or not.
 * 2. Every verdict file on disk passes the loader's validation.
 * 3. Strict flag gate (Code Reviewer 26.10.2026): a conflict, contradiction or
 *    unconfirmed flag, or a 'not stated' value, on ANY product forces noindex,
 *    wherever the data records it: firms.json byProduct, the product's own
 *    challenge value, a challenge note, or the product's capture file
 *    (unresolvedConflicts / conflictingQuote). Review holds force noindex
 *    only while the reviewed value is unchanged. Real-data pins: TPT daily
 *    loss (challenge note), TradeDay consistency (challenge note), holds on
 *    Topstep payouts and TradeDay split / payouts.
 */
import assert from 'node:assert/strict'
import { buildRulesPageModel, getRulesPageModels, REQUIRED_RULE_KEYS, RULES_MAX_AGE_DAYS, RULES_REQUIRE_VERDICT, RULES_REVIEW_HOLDS } from '../lib/rulesPages.ts'
import { getChallengesByFirm } from '../lib/firms.ts'
import { listVerdictFiles, loadVerdict, verdictProblems } from '../lib/verdicts.ts'

const models = getRulesPageModels()

assert.deepEqual({ ...RULES_REQUIRE_VERDICT }, { en: true, ru: true }, 'verdict must be required for EN and RU indexing')

// In-memory fixture verdict; never written to content/verdicts.
const fixtureVerdict = (slug, lang) => ({
  kind: 'rules', slug, lang, checkedAt: '2026-10-26', author: 'Test Fixture',
  sources: [{ title: 'Fixture', url: 'https://example.com/' }],
  body: 'Fixture verdict body.', wordCount: 130, file: `(fixture) ${slug}${lang === 'ru' ? '.ru' : ''}.md`,
})
const withVerdicts = slug => ({ verdicts: { en: fixtureVerdict(slug, 'en'), ru: fixtureVerdict(slug, 'ru') } })
const noVerdicts = { verdicts: { en: null, ru: null } }
assert.ok(models.length > 0, 'expected at least one firm with a rules block')

// Anchor "now" to the newest capture of each firm, so the test does not age.
const nowFor = model => new Date(`${model.newestCapture}T12:00:00Z`)
const complete = models
  .map(model => buildRulesPageModel(model.firm, nowFor(model), withVerdicts(model.slug)))
  .find(model => model && model.dataEligible)
  // With every firm flagged today, fall back to the cleanest real firm with review holds lifted
  // (in memory only), so the mutation checks below still run against real data.
  ?? models
    .map(model => buildRulesPageModel(model.firm, nowFor(model), { ...withVerdicts(model.slug), holds: [] }))
    .find(model => model && model.dataEligible)
const baseOpts = complete && !models.some(model => model.dataEligible) ? { holds: [] } : {}

if (!complete) {
  console.log('SKIP mutation checks: no firm currently has complete, sourced rules data')
} else {
  const now = nowFor(complete)
  const clone = () => structuredClone(complete.firm)
  const opts = { ...withVerdicts(complete.slug), ...baseOpts }
  assert.equal(complete.en.indexable, true, `${complete.slug}: data-complete + verdict must be indexable`)
  const bare = buildRulesPageModel(clone(), now, { ...noVerdicts, ...baseOpts })
  assert.equal(bare.dataEligible, true, `${complete.slug}: still data-complete without a verdict`)
  assert.equal(bare.en.indexable, false, `${complete.slug}: data-complete without a verdict must be noindex`)
  assert.deepEqual(bare.en.reasons, ['no EN verdict file'], `${complete.slug}: the only reason must be the missing verdict`)

  const mutations = {
    'blank drawdownType': firm => { firm.rules.drawdownType = { value: null, summary: null, byProduct: null, evidence: [] } },
    'unconfirmed consistency': firm => { firm.rules.consistencyPct.summary = 'not stated' },
    'contradiction note on payouts': firm => { firm.rules.payoutFrequency.note = 'Official help articles contradict each other.' },
    'capture-note evidence on news': firm => {
      firm.rules.newsTrading.evidence = firm.rules.newsTrading.evidence.map(item => ({ ...item, quoteKind: 'capture-note' }))
    },
    'missing weekend field': firm => { delete firm.rules.weekendHolding },
  }
  for (const [label, mutate] of Object.entries(mutations)) {
    const firm = clone()
    mutate(firm)
    const model = buildRulesPageModel(firm, now, opts)
    assert.equal(model.en.indexable, false, `${complete.slug}: ${label} must render noindex`)
    assert.ok(model.en.reasons.length > 0, `${complete.slug}: ${label} must give a reason`)
    assert.ok(model.gaps.length > 0, `${complete.slug}: ${label} must list a gap`)
  }

  // Strict flag gate: one product flagged anywhere in the data forces noindex.
  const realChallenges = getChallengesByFirm(complete.slug)
  assert.ok(realChallenges.length > 0, `${complete.slug}: expected challenge products`)
  const product = realChallenges[realChallenges.length - 1].productSlug
  const withProduct = edit => realChallenges.map(item => (item.productSlug === product ? edit(structuredClone(item)) : item))
  const flagMutations = {
    'challenge note: daily loss CONFLICT': { challenges: withProduct(item => ({ ...item, notes: [...(item.notes ?? []), 'Daily loss CONFLICTING FIRST-PARTY SOURCES: homepage and API disagree.'] })) },
    'challenge note: payout frequency unresolved': { challenges: withProduct(item => ({ ...item, notes: [...(item.notes ?? []), 'Payout frequency is unresolved between the help centre and the dashboard.'] })) },
    'challenge value not stated (split null)': { challenges: withProduct(item => ({ ...item, profitSplitPct: null })) },
    'challenge value not stated (news text)': { challenges: withProduct(item => ({ ...item, rules: { ...item.rules, news: 'not stated' } })) },
    'capture unresolvedConflicts on dailyLossPct': { readCapture: () => ({ unresolvedConflicts: [{ field: 'dailyLossPct', sourceUrls: ['https://example.com/a'], resolution: 'left null' }] }) },
    'capture conflictingQuote on profitSplitPct': { readCapture: () => ({ products: [{ productSlug: product, fieldEvidence: { profitSplitPct: { quote: 'a', conflictingQuote: 'b' } } }] }) },
  }
  for (const [label, extra] of Object.entries(flagMutations)) {
    const model = buildRulesPageModel(clone(), now, { ...opts, ...extra })
    assert.equal(model.en.indexable, false, `${complete.slug}: ${label} must force EN noindex`)
    if (model.ru) assert.equal(model.ru.indexable, false, `${complete.slug}: ${label} must force RU noindex`)
    assert.equal(model.dataEligible, false, `${complete.slug}: ${label} must clear dataEligible`)
    assert.ok(model.rows.some(row => row.productFlags.length > 0), `${complete.slug}: ${label} must record where the flag is`)
  }
  // A resolved conflict does not block.
  const resolved = buildRulesPageModel(clone(), now, { ...opts, challenges: withProduct(item => ({ ...item, notes: [...(item.notes ?? []), 'The earlier daily loss conflict is resolved by the 2026-10-20 recheck.'] })) })
  assert.equal(resolved.dataEligible, true, `${complete.slug}: a resolved conflict note must not block`)
  // firms.json byProduct with one product not stated.
  const byProductFirm = clone()
  const splitField = byProductFirm.rules.profitSplitPct
  splitField.byProduct = Object.fromEntries(realChallenges.map(item => [item.productSlug, item.productSlug === product ? null : 80]))
  const byProductModel = buildRulesPageModel(byProductFirm, now, opts)
  assert.equal(byProductModel.en.indexable, false, `${complete.slug}: a not-stated byProduct value must force noindex`)
  // A hold forces noindex while the reviewed summary is unchanged, and lapses when it changes.
  const row = complete.rows.find(item => item.key === 'payoutFrequency')
  const hold = [{ slug: complete.slug, key: 'payoutFrequency', whileSummary: row.summary, reason: 'test' }]
  assert.equal(buildRulesPageModel(clone(), now, { ...opts, holds: hold }).en.indexable, false, `${complete.slug}: review hold must force noindex`)
  const changed = clone(); changed.rules.payoutFrequency.summary = `${row.summary} (rechecked)`
  assert.equal(buildRulesPageModel(changed, now, { ...opts, holds: hold }).rows.find(item => item.key === 'payoutFrequency').issues.includes('review-hold'), false, 'hold must lapse once the value changes')
  console.log(`PASS strict flag gate on ${complete.slug}: ${Object.keys(flagMutations).length + 2} flagged variants are noindex; resolved note and changed held value pass`)

  const later = new Date(now.getTime() + (RULES_MAX_AGE_DAYS + 1) * 86_400_000)
  const stale = buildRulesPageModel(clone(), later, opts)
  assert.equal(stale.en.indexable, false, `${complete.slug}: data older than ${RULES_MAX_AGE_DAYS} days must render noindex`)
  assert.ok(stale.en.reasons.some(reason => /older than|30 days/.test(reason)), 'stale reason must mention age')
  console.log(`PASS verdict gate on ${complete.slug}: data-complete is noindex without a verdict, indexable with one`)
  console.log(`PASS mutations on ${complete.slug}: ${Object.keys(mutations).length + 1} incomplete variants are noindex`)
}

// Real-data pins for the Code Reviewer findings (26.10.2026).
{
  const bySlug = Object.fromEntries(models.map(model => [model.slug, model]))
  const flagged = (slug, key) => bySlug[slug]?.rows.find(row => row.key === key)?.issues ?? []
  const tpt = bySlug['take-profit-trader']
  if (tpt && /LEFT NULL — CONFLICTING/.test(getChallengesByFirm('take-profit-trader').flatMap(item => item.notes ?? []).join(' '))) {
    assert.ok(flagged('take-profit-trader', 'dailyLoss').includes('contradiction'), 'TPT daily loss conflict note must flag dailyLoss')
    assert.equal(tpt.en.indexable, false, 'TPT must be noindex while its daily loss conflict is open')
  }
  for (const hold of RULES_REVIEW_HOLDS) {
    const model = bySlug[hold.slug]
    if (!model) continue
    const row = model.rows.find(item => item.key === hold.key)
    if (row.summary === hold.whileSummary) {
      assert.ok(row.issues.includes('review-hold'), `${hold.slug} ${hold.key}: active hold must show`)
      assert.equal(model.en.indexable, false, `${hold.slug}: held field must force EN noindex`)
      if (model.ru) assert.equal(model.ru.indexable, false, `${hold.slug}: held field must force RU noindex`)
    }
  }
  console.log(`PASS real-data flags: TPT daily loss, ${RULES_REVIEW_HOLDS.length} review holds; indexable EN: ${models.filter(m => m.en.indexable).map(m => m.slug).join(', ') || 'none'}`)
}

// RU: a template twin or hand-written RU rules page gets 'no RU verdict file' exactly when the RU verdict is missing.
for (const model of models.filter(item => item.ru)) {
  const now = nowFor(model)
  const without = buildRulesPageModel(model.firm, now, noVerdicts)
  const withOne = buildRulesPageModel(model.firm, now, withVerdicts(model.slug))
  assert.equal(without.ru.indexable, false, `${model.slug}: RU twin without a verdict must be noindex`)
  assert.ok(without.ru.reasons.includes('no RU verdict file'), `${model.slug}: RU missing-verdict reason`)
  assert.ok(!withOne.ru.reasons.includes('no RU verdict file'), `${model.slug}: RU verdict fixture must clear the verdict reason`)
  assert.equal(withOne.ru.indexable, withOne.ru.reasons.length === 0, `${model.slug}: RU indexable iff no reasons`)
}

// On disk: an indexable page always has its verdict file; a page without one is noindex.
for (const model of models) {
  assert.equal(model.en.indexable, model.dataEligible && Boolean(model.enVerdict), `${model.slug}: EN indexable must equal data gate AND EN verdict`)
  if (!model.enVerdict) assert.ok(model.en.reasons.includes('no EN verdict file'), `${model.slug}: missing EN verdict reason`)
  if (model.ru?.indexable) assert.ok(model.ruVerdict, `${model.slug}: RU indexable without RU verdict`)
}

// Every currently noindex model explains why; every indexable one has every required field clean.
for (const model of models) {
  if (model.en.indexable) {
    assert.equal(model.gaps.length, 0, `${model.slug}: indexable with gaps`)
    for (const key of REQUIRED_RULE_KEYS) {
      const row = model.rows.find(item => item.key === key)
      assert.ok(row && row.issues.length === 0, `${model.slug}: indexable but ${key} has issues`)
    }
  } else {
    assert.ok(model.en.reasons.length > 0, `${model.slug}: noindex without a reason`)
  }
  if (model.ru && !model.ru.indexable) assert.ok(model.ru.reasons.length > 0, `${model.slug}: RU noindex without a reason`)
}

// Verdict files.
const files = listVerdictFiles()
for (const file of files) {
  assert.doesNotThrow(() => loadVerdict(file.kind, file.slug, file.lang), `${file.file} must be valid`)
}
if (files.some(file => file.kind === 'rules')) {
  const rulesSlugs = new Set(models.map(model => model.slug))
  for (const file of files.filter(item => item.kind === 'rules')) {
    assert.ok(rulesSlugs.has(file.slug), `${file.file}: no firm with a rules block has slug ${file.slug}`)
  }
}
const okBody = Array.from({ length: 130 }, (_, index) => `word${index}`).join(' ')
const okData = { slug: 'x', lang: 'en', checkedAt: '2026-10-26', author: 'A', sources: [{ title: 'S', url: 'https://example.com' }] }
assert.deepEqual(verdictProblems(okData, okBody, { kind: 'rules', slug: 'x', lang: 'en' }), [])
assert.ok(verdictProblems(okData, 'too short', { kind: 'rules', slug: 'x', lang: 'en' }).length > 0, 'short body must fail')
assert.ok(verdictProblems({ ...okData, checkedAt: '2026-02-30' }, okBody, { kind: 'rules', slug: 'x', lang: 'en' }).length > 0, 'bad date must fail')
assert.ok(verdictProblems({ ...okData, sources: [{ title: 'S', url: 'content/data/firms.json' }] }, okBody, { kind: 'rules', slug: 'x', lang: 'en' }).length > 0, 'repo path source must fail')
assert.ok(verdictProblems(okData, okBody, { kind: 'rules', slug: 'y', lang: 'en' }).length > 0, 'slug mismatch must fail')

console.log(`PASS rules pages: ${models.length} firms (${models.filter(m => m.en.indexable).length} EN indexable), ${files.length} verdict file(s) valid`)

// RU render layer (team rule 26.10.2026): RU twins never name Bybit; platform lists follow the CFT review wording.
{
  const { ruPlatformList, ruRedactExchanges } = await import('../lib/ruRulesText.ts')
  const { formatRuleValue, headlineValue } = await import('../lib/rulesPages.ts')
  assert.equal(ruPlatformList(['Match-Trader', 'MT5', 'Bybit']), 'две основные — Match-Trader и MT5; третий вариант — сторонняя криптобиржа')
  assert.equal(ruPlatformList(['MT5', 'cTrader']), 'MT5, cTrader', 'lists without a hidden exchange are unchanged')
  assert.equal(formatRuleValue({ kind: 'list', value: ['Match-Trader', 'MT5', 'Bybit'] }, 'platforms', 'en'), 'Match-Trader, MT5, Bybit', 'EN unchanged')
  assert.doesNotMatch(formatRuleValue({ kind: 'list', value: ['Match-Trader', 'MT5', 'BYBIT'] }, 'platforms', 'ru'), /bybit/i)
  assert.doesNotMatch(ruRedactExchanges('offers Match-Trader, MetaTrader 5, and Bybit.'), /bybit/i)
  // Real data: the CFT platforms row is free text with no per-product values.
  const cftRow = getRulesPageModels().find(m => m.slug === 'crypto-fund-trader')?.rows.find(r => r.key === 'platforms')
  if (cftRow) {
    assert.equal(headlineValue(cftRow, 'ru'), 'две основные — Match-Trader и MT5; третий вариант — сторонняя криптобиржа', 'CFT RU platforms headline')
    assert.match(headlineValue(cftRow, 'en'), /Bybit/, 'CFT EN platforms headline unchanged')
  }
  console.log('PASS RU platform wording: no Bybit on RU, EN unchanged')
}
