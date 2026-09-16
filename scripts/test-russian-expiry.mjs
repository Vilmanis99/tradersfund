/** Render actual Russian page components under an isolated clock; never change capture files. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // Next enforces this marker at bundle time; this harness runs server rendering in Node.
    if (specifier === 'server-only') return { url: 'test:server-only', shortCircuit: true }
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:')
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local && local.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'test:server-only') return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

const RealDate = Date
let clock = new RealDate().toISOString()
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [clock])) }
  static now() { return new RealDate(clock).getTime() }
}
const errors = []
try {
  assert.match(fs.readFileSync(path.join(root, 'app/ru/layout.tsx'), 'utf8'), /export const revalidate = 3600\b/, 'Russian layout must re-run age gates without a deployment')
  assert.match(fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8'), /export const revalidate = 3600\b/, 'English homepage must re-run product age gates without a deployment')
  const pages = fs.readdirSync(path.join(root, 'app/ru'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'app/ru', entry.name, 'page.tsx')))
    .map(entry => entry.name)
  pages.unshift('')
  if (process.argv.includes('--built')) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.next/prerender-manifest.json'), 'utf8'))
    assert.equal(manifest.routes['/']?.initialRevalidateSeconds, 3600, 'built English homepage must refresh hourly')
    for (const slug of pages) {
      const route = slug ? `/ru/${slug}` : '/ru'
      const interval = manifest.routes[route]?.initialRevalidateSeconds
      assert(typeof interval === 'number' && interval > 0 && interval <= 3600, `${route}: built route must inherit hourly regeneration`)
    }
  }
  const { getAllChallenges, getAllFirms, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
  const { getAuthorBySlug } = require(path.join(root, 'lib/authors.ts'))
  const edris = getAuthorBySlug('edris-derakhshi')
  assert.equal(edris.role, 'Author', 'the confirmed TFH role is author, not founder')
  assert.doesNotMatch(`${edris.short} ${edris.long}`, /founded Traders Fund Hub|funded trader since|personally funded|verifies every payout|five years of trading funded/i, 'unsupported experience claims must not return')
  assert(edris.references.some(reference => reference.url === 'https://tradingrage.com/about'), 'TradingRage founder claim has public evidence')
  const authorModule = require(path.join(root, 'app/authors/[slug]/page.tsx'))
  const authorProps = { params: Promise.resolve({ slug: edris.slug }) }
  const authorHtml = renderToStaticMarkup(await authorModule.default(authorProps))
  const authorMetadata = await authorModule.generateMetadata(authorProps)
  assert.equal(authorMetadata.description, edris.short)
  assert(authorHtml.includes('Selected work and biography sources'))
  for (const reference of edris.references) assert(authorHtml.includes(reference.url), 'biography evidence is visible on the actual author page')
  const person = [...authorHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1])).find(item => item['@type'] === 'Person')
  assert.equal(person?.jobTitle, 'Author', 'Person schema does not restore founder status')
  assert.equal(person?.description, edris.short)
  const { getRussianReviewFinderHref, getRussianFinderRows, getRussianInstantFinderHref, buildChallengeComparisonRows } = require(path.join(root, 'lib/challengeComparisonData.ts'))
  const GlobalComparison = require(path.join(root, 'components/GlobalChallengeComparison.tsx')).default
  const CftChangeFeed = require(path.join(root, 'components/ChallengeChangeFeed.tsx')).default
  const cftChanges = require(path.join(root, 'content/data/challenge-watch.json'))
    .filter(entry => entry.firmSlug === 'crypto-fund-trader')
    .map(entry => ({ ...entry, reviewUrl: '/blog/crypto-fund-trader-review', indiaScreened: false,
      productKeys: entry.productSlugs.map(slug => `crypto-fund-trader:${slug}`) }))
  const cftFeedHtml = renderToStaticMarkup(React.createElement(CftChangeFeed, {
    entries: cftChanges, surface: 'global', validProductKeys: cftChanges.flatMap(entry => entry.productKeys),
  }))
  assert.equal(cftChanges.length, 2, 'CFT has separate correction and price records')
  assert.equal(
    cftFeedHtml.includes('Conflict observed separately; full product verification remains unresolved.'),
    cftChanges.some(entry => entry.kind === 'source-conflict' && entry.status === 'watch'),
    'Actual feed labels an independent conflict only when the current CFT ledger has one',
  )
  for (const entry of cftChanges) {
    assert(cftFeedHtml.includes(`id="${entry.id}"`), 'Both CFT records render, not just the JSON file')
    for (const sourceUrl of entry.sourceUrls) assert(cftFeedHtml.includes(sourceUrl), 'Actual feed exposes every cited CFT source')
  }
  const comparisonSource = fs.readFileSync(path.join(root, 'components/GlobalChallengeComparison.tsx'), 'utf8')
  for (const [, size] of comparisonSource.matchAll(/fontSize: '([\d.]+)rem'/g)) {
    assert(Number(size) >= 0.875, 'global comparison inline text must not return to sub-14px sizing')
  }
  assert.match(comparisonSource, /fontSize: '1rem'/, 'comparison controls retain 16px text')
  const readingCss = fs.readFileSync(path.join(root, 'app/light-platform.css'), 'utf8')
  for (const selector of ['html .ru-finder-filters label', 'html .ru-finder-card > .ru-source-line', 'html .challenge-shortlist-metrics dt', 'html .india-decision-matrix td']) {
    assert(readingCss.includes(selector), `${selector}: explicit shared readable type treatment`)
  }
  const instantEvidence = require(path.join(root, 'content/data/russian-fundednext-instant-evidence.json'))
  const mt5Evidence = require(path.join(root, 'content/data/russian-fundednext-mt5-evidence.json'))
  const cTraderEvidence = require(path.join(root, 'content/data/russian-ctrader-evidence.json'))
  const forexEvidence = require(path.join(root, 'content/data/russian-forex-evidence.json'))
  const teamTradersEvidence = require(path.join(root, 'content/data/russian-teamtraders-evidence.json'))
  const TeamTradersPage = require(path.join(root, 'app/ru/obzor-teamtraders/page.tsx')).default
  const { DEFAULT_FINDER_FILTERS, filterChallengeRows, challengeKey, parseFinderState } = require(path.join(root, 'lib/challengeComparison.ts'))
  const marketEvidence = require(path.join(root, 'content/data/russian-market-evidence.json'))
  const { RUSSIAN_ROUTE_EDITORIAL_DATES } = require(path.join(root, 'lib/localizedRoutes.ts'))
  const EvidenceNotice = require(path.join(root, 'components/RussianEvidenceFreshnessNotice.tsx')).default
  clock = '2026-09-14T12:00:00Z'
  const originalTeamEvidence = JSON.stringify(teamTradersEvidence)
  for (const source of teamTradersEvidence.sources) {
    const capturedAt = source.capturedAt
    try {
      for (const unavailableDate of ['', 'invalid', '2030-01-01', '2026-08-08']) {
        source.capturedAt = unavailableDate
        const html = renderToStaticMarkup(React.createElement(TeamTradersPage))
        assert(html.includes('data-russian-teamtraders-evidence-status="recapture-required"'), 'each local source expires independently')
        assert(html.includes('data-russian-guide-source-status="recapture-required"'))
        assert(!html.includes('"@type":"FAQPage"') && !html.includes('class="ru-stats"'), 'invalid local evidence cannot publish current FAQ schema or headline metrics')
        assert(html.includes('data-russian-teamtraders-pricing="three-rub-tiers"'), 'dated local analysis is retained, not replaced with a thin empty page')
        assert(html.includes('data-russian-teamtraders-partner-products="fundednext"'), 'local expiry does not erase separately fresh global products')
      }
    } finally { source.capturedAt = capturedAt }
  }
  assert.equal(JSON.stringify(teamTradersEvidence), originalTeamEvidence, 'source fixtures are restored without changing capture files')
  const HomeFinder = require(path.join(root, 'components/RussianFinderEntry.tsx')).default
  const EnglishFinder = require(path.join(root, 'components/EnglishFinderEntry.tsx')).default
  const homeFixture = getRussianFinderRows()[0]
  const RuleFinder = require(path.join(root, 'components/RussianChallengeFinder.tsx')).default
  const singleSizeRow = { ...homeFixture, product: { ...homeFixture.product, tiers: [{ ...homeFixture.product.tiers[0], sizeUsd: 25000 }] } }
  const singleSizeHtml = renderToStaticMarkup(React.createElement(RuleFinder, { initialRows: [singleSizeRow] }))
  assert(singleSizeHtml.includes('value="25000" selected=""'), 'full Russian finder selects an existing tier when 50K is unavailable')
  assert(singleSizeHtml.includes('class="ru-finder-card"'), 'full Russian finder does not render a false empty result at an unavailable default')
  const IndiaComparison = require(path.join(root, 'components/IndiaChallengeComparison.tsx')).default
  const { buildIndiaMatcherFirms } = require(path.join(root, 'lib/indiaMatcher.ts'))
  const indiaRuleFixture = buildIndiaMatcherFirms(getAllFirms()).find(firm => firm.products.length)
  assert(indiaRuleFixture, 'a current India fixture is available')
  const plainRuleText = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  for (const [fields, en, ru] of [
    [{ minTradingDays: null, maxTradingDays: null, consistencyRulePct: null }, ['Unverified', 'Unverified', 'Unverified'], ['Не подтверждено', 'Не подтверждено', 'Не подтверждено']],
    [{ minTradingDays: 0, maxTradingDays: null, maxTradingDaysUnlimited: true, consistencyRulePct: null, consistencyRuleApplies: false }, ['0', 'Unlimited', 'No rule'], ['0', 'Без ограничения срока', 'Правило не применяется']],
    [{ minTradingDays: 3, maxTradingDays: 30, consistencyRulePct: 40 }, ['3', '30', '40%'], ['3', '30', '40%']],
    [{ minTradingDays: null, maxTradingDays: 30, maxTradingDaysUnlimited: true, consistencyRulePct: 40, consistencyRuleApplies: false }, ['Unverified', 'Unverified', 'Unverified'], ['Не подтверждено', 'Не подтверждено', 'Не подтверждено']],
  ]) {
    const product = { ...homeFixture.product, maxTradingDaysUnlimited: null, consistencyRuleApplies: null, ...fields, tiers: [{ ...homeFixture.product.tiers[0], sizeUsd: 50000 }] }
    const english = plainRuleText(renderToStaticMarkup(React.createElement(GlobalComparison, { rows: [{ ...homeFixture, product }] })))
    for (const [i, label] of ['Minimum days:', 'Maximum days:', 'Consistency:'].entries()) assert(english.includes(`${label} ${en[i]}`), `global table: ${label} distinguishes missing, zero, explicit absence and conflicts`)
    const russian = plainRuleText(renderToStaticMarkup(React.createElement(RuleFinder, { initialRows: [{ ...homeFixture, product }] })))
    for (const [i, label] of ['Минимум торговых дней:', 'Максимальный срок:', 'Правило стабильности:'].entries()) assert(russian.includes(`${label} ${ru[i]}`), `Russian details: ${label} preserves the same evidence distinction`)
    const indiaProduct = { ...indiaRuleFixture.products[0], maxTradingDaysUnlimited: null, consistencyRuleApplies: null, ...fields }
    const india = plainRuleText(renderToStaticMarkup(React.createElement(IndiaComparison, { firms: [{ ...indiaRuleFixture, products: [indiaProduct] }] })))
    assert(india.includes(`Min days: ${en[0]}`) && india.includes(`Consistency: ${en[2]}`), 'India comparison must not restore no-rule claims from missing data')
  }
  for (const [pricingModel, label, englishLabel] of [['monthly-subscription', 'в месяц; доплаты отдельно', 'per month; extras excluded'], ['split-payment', 'первый взнос', 'initial payment'], ['one-off', 'базовый взнос', 'base fee']]) {
    const row = { ...homeFixture, product: { ...homeFixture.product, pricingModel, tiers: [{ ...homeFixture.product.tiers[0], sizeUsd: 50000, priceUsd: 123.45, priceEur: 67.89 }] } }
    const card = renderToStaticMarkup(React.createElement(HomeFinder, { rows: [row] }))
    assert(card.includes(label), 'home preview distinguishes subscription, split and base fees')
    for (const [currency, price] of [['USD', 123.45], ['EUR', 67.89]]) assert(card.includes(new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(price)), 'home preview preserves each captured denomination')
    assert(!card.includes('без доплат'), 'base fee is not represented as all-inclusive')
    const englishCard = renderToStaticMarkup(React.createElement(EnglishFinder, { rows: [row] }))
    assert(englishCard.includes(englishLabel))
    assert(englishCard.includes('$123.45') && englishCard.includes('€67.89'), 'English preview preserves currency and decimal prices')
    assert(englishCard.includes('name="size"') && englishCard.includes('name="program"') && englishCard.includes('method="get"'), 'English comparison form remains usable without JavaScript')
  }
  const emptyHome = renderToStaticMarkup(React.createElement(HomeFinder, { rows: [] }))
  assert(emptyHome.includes('href="/ru/luchshie-prop-firmy"') && !emptyHome.includes('<select'), 'empty home preview retains a usable directory link')
  const emptyEnglish = renderToStaticMarkup(React.createElement(EnglishFinder, { rows: [] }))
  assert(emptyEnglish.includes('href="/prop-firm-challenges"') && !emptyEnglish.includes('<select'), 'English empty preview retains its comparison link')
  const ChangeFeed = require(path.join(root, 'components/ChallengeChangeFeed.tsx')).default
  const ruleEntries = require(path.join(root, 'content/data/challenge-watch.json')).filter(entry => entry.ruleEvidenceRefs)
  const changeHtml = renderToStaticMarkup(React.createElement(ChangeFeed, { entries: ruleEntries.map(entry => ({ ...entry, reviewUrl: '/ru/obzor-fundednext', indiaScreened: false, productKeys: entry.productSlugs.map(slug => `fundednext:${slug}`) })), surface: 'global', validProductKeys: [] }))
  assert.equal((changeHtml.match(/Rule sources checked separately; prices were not refreshed\./g) ?? []).length, ruleEntries.length, 'each rule-only card explains its capture scope')
  for (const [captures, needsCheck] of [
    [[], true], [['2026-09-08'], false], [['2026-08-15'], false], [['2026-08-14'], true],
    [['2026-09-08', '2026-08-14'], true], [[''], true], [['not-a-date'], true], [['2030-01-01'], true],
  ]) {
    const notice = renderToStaticMarkup(React.createElement(EvidenceNotice, { evidence: captures.map(capturedAt => ({ label: 'правила', capturedAt })) }))
    assert.equal(notice.includes('data-russian-guide-source-status="recapture-required"'), needsCheck, 'guide source notice handles independent, missing, stale and future dates')
    assert(notice.includes('class="ru-source-details"') && notice.includes('Показать даты отдельных проверок'), 'source ledger stays available but is collapsed in the public notice')
    if (needsCheck) assert(notice.includes('не подтверждают действующие условия'))
  }
  const reviewed = {
    'obzor-ftmo': ['ftmo'], 'obzor-fundednext': ['fundednext'], 'obzor-bright-funded': ['bright-funded'],
    'obzor-fundingpips': ['fundingpips'], 'fundednext-vs-bright-funded': ['fundednext', 'bright-funded'],
    'fundednext-vs-fundingpips': ['fundednext', 'fundingpips'],
  }
  const products = getAllChallenges().filter(product => ['ftmo', 'fundednext', 'bright-funded', 'fundingpips'].includes(product.firmSlug))
  const offset = (date, days) => new RealDate(new RealDate(`${date}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)
  const instantProduct = products.find(product => product.firmSlug === 'fundednext' && product.productSlug === 'stellar-instant')
  const instantSourceDates = [instantEvidence.capturedAt, instantEvidence.news.sourceCapturedAt, instantProduct.sourceCapturedAt,
    marketEvidence.capturedAt, mt5Evidence.ea.sourceCapturedAt, mt5Evidence.instantEaScope.sourceCapturedAt]
  const mt5SourceDates = Object.values(mt5Evidence).filter(value => value && typeof value === 'object' && 'sourceCapturedAt' in value).map(value => value.sourceCapturedAt)
  const cTraderSourceDates = [cTraderEvidence.platformSource.sourceCapturedAt, ...cTraderEvidence.firms.map(firm => firm.sourceCapturedAt)]
  const cTraderFundedNext = cTraderEvidence.firms.find(firm => firm.firmSlug === 'fundednext')
  const CTraderPage = require(path.join(root, 'app/ru/prop-firmy-s-ctrader/page.tsx')).default
  const originalPlatformDate = cTraderFundedNext.sourceCapturedAt
  try {
    for (const unavailableDate of ['2026-08-08', 'invalid', '2030-01-01']) {
      cTraderFundedNext.sourceCapturedAt = unavailableDate
      const html = renderToStaticMarkup(React.createElement(CTraderPage))
      assert(!html.includes('data-russian-ctrader-checkout-product='), 'old, malformed or future platform evidence cannot be combined with fresh product prices')
      assert(html.includes('data-russian-ctrader-reference-product='), 'independent Bright Funded base prices remain available')
      assert(!html.includes('"@type":"FAQPage"'), 'invalid platform evidence withholds current FAQ schema')
    }
  } finally { cTraderFundedNext.sourceCapturedAt = originalPlatformDate }
  const ForexPage = require(path.join(root, 'app/ru/forex-prop-firmy/page.tsx')).default
  const forexFundedNext = forexEvidence.firms.find(firm => firm.firmSlug === 'fundednext')
  const forexSourceDates = forexEvidence.firms.map(firm => firm.sourceCapturedAt)
  const leverageCell = (html, key) => html.match(new RegExp(`data-russian-forex-leverage-product="${key}">([^<]+)</td>`))?.[1]
  const originalForexDate = forexFundedNext.sourceCapturedAt
  try {
    for (const unavailableDate of ['2026-08-08', 'invalid', '2030-01-01']) {
      forexFundedNext.sourceCapturedAt = unavailableDate
      const html = renderToStaticMarkup(React.createElement(ForexPage))
      assert.equal(leverageCell(html, 'fundednext:stellar-1-step'), 'Требует перепроверки', 'old, malformed or future leverage evidence cannot ride on fresh prices')
      assert.equal(leverageCell(html, 'bright-funded:bright-funded-1-step'), '1:100', 'unrelated fresh leverage evidence remains visible')
      assert(html.includes('data-russian-forex-product="fundednext:stellar-1-step"'), 'independently fresh price rows remain')
      assert(!html.includes('"@type":"FAQPage"'), 'FAQ schema does not treat expired guide evidence as current')
    }
  } finally { forexFundedNext.sourceCapturedAt = originalForexDate }
  const firmsModule = require(path.join(root, 'lib/firms.ts'))
  const cryptoEvidence = require(path.join(root, 'content/data/crypto-market-evidence.json'))
  const cryptoModule = require(path.join(root, 'app/ru/luchshie-kripto-prop-firmy/page.tsx'))
  const renderCrypto = () => renderToStaticMarkup(React.createElement(cryptoModule.default))
  const cryptoCards = html => [...html.matchAll(/data-russian-crypto-firm="([^"]+)"/g)].map(match => match[1]).sort()
  const cryptoSchemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  const cryptoSlugs = cryptoEvidence.ranked.map(evidence => evidence.firmSlug).sort()
  const originalCryptoEvidence = JSON.stringify(cryptoEvidence)
  const originalByFirm = firmsModule.getChallengesByFirm
  const cryptoReference = renderCrypto()
  assert.deepEqual(cryptoCards(cryptoReference), cryptoSlugs, 'current crypto fixture includes every independently sourced firm')
  assert(cryptoSchemas(cryptoReference).some(item => item['@type'] === 'FAQPage'))
  assert.doesNotMatch(`${cryptoModule.metadata.title.absolute} ${cryptoModule.metadata.description}`, /3 проверенных|3 крипто|12 подтверждённых/, 'search metadata does not promise a fixed live inventory')
  assert.equal(cryptoModule.metadata.openGraph.title, 'Крипто-проп-фирмы 2026: 3 проверенных варианта', 'sharing metadata is preserved pending separate approval')
  assert.equal(cryptoModule.metadata.twitter.description, 'Проп трейдинг криптовалют: сравниваем 3 крипто-проп фирмы и 12 подтверждённых продуктов по цене, просадке, плечу, KYC и выплатам.')
  const assertCryptoArchive = html => {
    assert(html.includes('data-russian-crypto-article="long-form"') && html.includes('id="sources"'), 'expiry preserves the substantive article and dated sources')
    assert(html.includes('data-russian-crypto-cft-correction="2026-09-08"'), 'unresolved CFT correction survives unrelated evidence expiry')
    assert(html.includes('data-russian-affiliate-disclosure="crypto-ranking"'), 'disclosure survives expiry')
    assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'incomplete current evidence withholds FAQ schema')
    assert.doesNotMatch(html, /NaN|Infinity|Invalid Date/)
  }
  try {
    for (const evidence of cryptoEvidence.ranked) {
      const originalDate = evidence.sourceCapturedAt
      try {
        for (const date of ['', undefined, 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
          evidence.sourceCapturedAt = date
          const html = renderCrypto()
          assert.deepEqual(cryptoCards(html), cryptoSlugs.filter(slug => slug !== evidence.firmSlug), 'invalid market evidence excludes only its firm despite fresh product prices')
          assertCryptoArchive(html)
        }
      } finally { evidence.sourceCapturedAt = originalDate }
    }
    const payoutDate = cryptoEvidence.payoutAlternative.sourceCapturedAt
    try {
      for (const date of ['', 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
        cryptoEvidence.payoutAlternative.sourceCapturedAt = date
        const html = renderCrypto()
        assert.deepEqual(cryptoCards(html), cryptoSlugs, 'expired payout evidence does not erase independent trading-instrument evidence')
        assert(html.includes('data-russian-crypto-payout-status="recapture-required"'))
        assertCryptoArchive(html)
      }
    } finally { cryptoEvidence.payoutAlternative.sourceCapturedAt = payoutDate }
    for (const evidence of cryptoEvidence.ranked) {
      for (const failure of ['stale', 'missing', 'unpriced']) {
        firmsModule.getChallengesByFirm = slug => {
          const values = structuredClone(originalByFirm(slug))
          if (slug !== evidence.firmSlug) return values
          const affected = values.find(product => product.productSlug === evidence.productSlugs[0])
          assert(affected, 'fixture targets an actually mapped product')
          if (failure === 'stale') affected.sourceCapturedAt = '2026-08-08'
          if (failure === 'unpriced') affected.accountSizes = []
          return failure === 'missing' ? values.filter(product => product !== affected) : values
        }
        const html = renderCrypto()
        assert.deepEqual(cryptoCards(html), cryptoSlugs.filter(slug => slug !== evidence.firmSlug), 'fresh instrument evidence cannot renew stale, missing or unpriced products')
        assertCryptoArchive(html)
      }
    }
    firmsModule.getChallengesByFirm = originalByFirm
    for (const evidence of cryptoEvidence.ranked) evidence.sourceCapturedAt = '2026-08-08'
    const empty = renderCrypto()
    assert.deepEqual(cryptoCards(empty), [])
    assert(empty.includes('data-russian-crypto-empty="recapture-required"'))
    assert(!cryptoSchemas(empty).some(item => item['@type'] === 'ItemList'), 'zero firms do not generate a current ranking schema')
    assert(!empty.match(/<section\b[^>]*id="comparison"[\s\S]*?<\/section>/)?.[0].includes('<table'), 'an empty current-price table is not rendered; the separate unresolved-source table remains')
    assertCryptoArchive(empty)
  } finally {
    firmsModule.getChallengesByFirm = originalByFirm
    const restored = JSON.parse(originalCryptoEvidence)
    cryptoEvidence.ranked.forEach((evidence, index) => Object.assign(evidence, restored.ranked[index]))
    Object.assign(cryptoEvidence.payoutAlternative, restored.payoutAlternative)
  }
  assert.equal(JSON.stringify(cryptoEvidence), originalCryptoEvidence, 'crypto fixtures do not write or leave mutated source evidence')
  const brightEvidence = require(path.join(root, 'content/data/russian-bright-funded-evidence.json'))
  const BrightModule = require(path.join(root, 'app/ru/obzor-bright-funded/page.tsx'))
  const renderBright = () => renderToStaticMarkup(React.createElement(BrightModule.default))
  const brightReference = renderBright()
  assert(brightReference.includes('data-russian-bright-price-count="18"'))
  assert(cryptoSchemas(brightReference).some(item => item['@type'] === 'FAQPage'), 'complete current Bright source fixture provides FAQ schema')
  assert(!cryptoSchemas(brightReference).find(item => item['@type'] === 'FAQPage').mainEntity.some(item => item.name === 'Почему у Bright Funded нет средней оценки Trustpilot?'), 'old Trustpilot observation remains visible but is excluded independently from current FAQ schema')
  assert.doesNotMatch(BrightModule.metadata.description, /18 цен|3 программы/)
  assert.equal(BrightModule.metadata.openGraph.description, 'Отзывы о Bright Funded и обзор на русском: 3 программы, 18 цен в EUR, просадка, выплаты, Trustpilot и проверка ограничений по стране.', 'existing sharing copy stays pending separate approval')
  const originalBrightEvidence = JSON.stringify(brightEvidence)
  for (const source of Object.values(brightEvidence.sources)) {
    const originalDate = source.sourceCapturedAt
    try {
      for (const date of ['', undefined, 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
        source.sourceCapturedAt = date
        const html = renderBright()
        assert(html.includes('data-russian-bright-evidence-status="recapture-required"'))
        assert(html.includes('data-russian-bright-price-count="18"'), 'help-centre expiry does not erase separately current programme prices')
        assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'every invalid help source independently withholds current FAQ schema')
        assert(html.includes('id="sources"') && html.includes('data-russian-bright-article="long-form"'))
        assert.doesNotMatch(html, /NaN|Infinity|Invalid Date/)
      }
    } finally { source.sourceCapturedAt = originalDate }
  }
  assert.equal(JSON.stringify(brightEvidence), originalBrightEvidence)
  const brightFixtureProducts = originalByFirm('bright-funded')
  try {
    const fixture = structuredClone(brightFixtureProducts.find(product => product.phases === 2))
    firmsModule.getChallengesByFirm = slug => slug === 'bright-funded' ? [fixture] : originalByFirm(slug)
    fixture.profitTargets = null
    fixture.profitSplitPct = null
    fixture.dailyLossPct = null
    fixture.maxLossPct = null
    fixture.minTradingDays = null
    fixture.accountSizes = [{ sizeUsd: 5000, priceEur: 123.45, priceUsd: null }]
    let html = renderBright()
    assert(html.includes('Цели не подтверждены') && !html.includes('без цели оценки'))
    const costTable = html.match(/<table\b[^>]*data-russian-bright-truecost="1"[\s\S]*?<\/table>/)?.[0]
    assert(costTable.includes('€123.45') && costTable.includes('не подтверждено') && !costTable.includes('€0'), 'unknown share leaves known fee visible but does not create a zero break-even result')
    fixture.minTradingDays = 0
    fixture.profitTargets = { phase1: 8, phase2: null }
    html = renderBright()
    assert(html.includes('0 на этап') && html.includes('8% → не подтверждена'), 'explicit zero days and missing second-stage target are distinct')
    fixture.accountSizes = []
    html = renderBright()
    assert(html.includes('data-russian-bright-empty="recapture-required"') && !cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'))
    assert.doesNotMatch(html, /NaN|Infinity|Invalid Date|€0/)
    fixture.accountSizes = [{ sizeUsd: 5000, priceEur: 123.45, priceUsd: null }]
    fixture.sourceCapturedAt = '2026-08-08'
    html = renderBright()
    assert(html.includes('data-russian-bright-price-count="0"') && !html.includes('€123.45'), 'fresh help pages cannot renew an old price capture')
    for (const product of brightFixtureProducts) assert(html.includes(product.sourceUrl) || product.productSlug !== fixture.productSlug, 'expired programme retains its primary source link')
  } finally { firmsModule.getChallengesByFirm = originalByFirm }
  const brightSourceDates = [...Object.values(brightEvidence.sources).map(source => source.sourceCapturedAt), ...brightFixtureProducts.map(product => product.sourceCapturedAt)]
  const primaryModule = require(path.join(root, 'app/ru/fundednext-vs-bright-funded/page.tsx'))
  const renderPrimary = () => renderToStaticMarkup(React.createElement(primaryModule.default))
  const primaryReference = renderPrimary()
  const primaryVisible = primaryReference.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
  assert(primaryReference.includes('data-russian-primary-comparison-products="7"') && primaryReference.includes('data-russian-primary-comparison-prices="40"'))
  assert(cryptoSchemas(primaryReference).some(item => item['@type'] === 'FAQPage'))
  assert.doesNotMatch(primaryModule.metadata.description, /7 продукт|40 цен|true cost/)
  assert.equal(primaryModule.metadata.openGraph.description, 'Сравнение FundedNext и Bright Funded по 7 продуктам и 40 ценам: USD или EUR, этапы, просадка, true cost, выплаты, KYC и выбор для трейдера.', 'existing sharing description is preserved pending explicit approval')
  assert.doesNotMatch(primaryVisible, /\b(?:evaluation|checkout|risk buckets?|true cost|cash.flow|gateway|payout window|TradeLocker|highest equity|eligibility|suppressed)\b/i, 'comparison uses reader-facing Russian and does not revive the incorrect TradeLocker contrast')
  assert(primaryVisible.includes('MT5, DXTrade и cTrader') && primaryVisible.includes('противоречие остаётся неразрешённым'))
  for (const match of primaryReference.matchAll(/<td data-russian-payout-product="bright-funded:[^"]+">([\s\S]*?)<\/td>/g)) assert(match[1].includes('базовый следующий цикл требует уточнения'), 'Bright payout ambiguity is visible in each summary row, not only later prose')
  assert.equal((primaryReference.match(/tabindex="0" role="region" aria-label=/g) ?? []).length, 5, 'every wide comparison table is a named keyboard-scroll region')
  for (const id of ['comparison-products', 'comparison-one-step', 'comparison-two-step', 'comparison-instant', 'comparison-cost', 'comparison-payout', 'comparison-profile', 'sources']) {
    assert(primaryReference.includes(`href="#${id}"`) && primaryReference.includes(`id="${id}"`), `comparison contents points to actual section ${id}`)
  }
  const primaryRuleSources = [brightEvidence.sources.rules, brightEvidence.sources.reward, brightEvidence.sources.platforms,
    ...marketEvidence.payoutEvidence.filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug)),
    ...marketEvidence.kycEvidence.filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug))]
  for (const source of primaryRuleSources) {
    const capturedAt = source.sourceCapturedAt
    try {
      for (const invalidDate of ['', '2026-02-30', '2026-08-08', '2030-01-01']) {
        source.sourceCapturedAt = invalidDate
        const html = renderPrimary()
        assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'each independent rule/process source gates current comparison FAQ')
        assert(html.includes('data-russian-primary-comparison-prices="40"'), 'new rule dates do not control independently current prices')
        assert(html.includes('id="sources"') && html.includes('data-russian-primary-comparison-article="product-before-brand"'))
      }
    } finally { source.sourceCapturedAt = capturedAt }
  }
  const originalAllChallenges = firmsModule.getAllChallenges
  const primaryFixtures = structuredClone(originalAllChallenges())
  const primaryCostRow = html => html.match(/<tr[^>]*data-russian-comparison-cost="bright-funded:bright-funded-1-step"[^>]*>([\s\S]*?)<\/tr>/)?.[1]
  const primaryProductRow = html => html.match(/<tr[^>]*data-russian-primary-comparison-product="bright-funded:bright-funded-1-step"[^>]*>([\s\S]*?)<\/tr>/)?.[1]
  try {
    firmsModule.getAllChallenges = () => primaryFixtures
    const fixture = primaryFixtures.find(product => product.firmSlug === 'bright-funded' && product.productSlug === 'bright-funded-1-step')
    Object.assign(fixture, { profitTargets: null, dailyLossPct: null, maxLossPct: null, profitSplitPct: null, minTradingDays: null, payoutFirstDays: null, accountSizes: [{ sizeUsd: 50000, priceEur: 123.45, priceUsd: null }] })
    let html = renderPrimary()
    assert(primaryProductRow(html).includes('не подтверждено') && !primaryProductRow(html).includes('без оценочного этапа'))
    assert(primaryCostRow(html).includes('€123.45') && primaryCostRow(html).includes('не рассчитано'), 'known EUR price remains when profit share cannot support break-even maths')
    assert.doesNotMatch(html, /NaN|Infinity|€0|\$0|—%|null дн/)
    fixture.phases = 2; fixture.profitTargets = { phase1: 8, phase2: null }; fixture.minTradingDays = 0
    html = renderPrimary()
    assert(primaryProductRow(html).includes('8% → не подтверждено'), 'missing later target cannot silently disappear')
    assert(html.includes('Минимум торговых дней: 0'))
    fixture.accountSizes = []
    html = renderPrimary()
    assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage') && !primaryCostRow(html).includes('€123.45'))
    for (const product of primaryFixtures.filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug))) product.sourceCapturedAt = '2026-08-08'
    html = renderPrimary()
    assert(html.includes('data-russian-primary-comparison-products="0"') && html.includes('data-russian-primary-comparison-prices="0"'))
    assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage') && html.includes('Актуальных строк нет'))
    assert(html.includes('id="sources"') && html.includes('Финальный чек-лист выбора'), 'price expiry leaves useful long-form analysis and source navigation')
    for (const product of primaryFixtures.filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug))) assert(html.includes(product.sourceUrl), 'expired product source remains linked')
  } finally { firmsModule.getAllChallenges = originalAllChallenges }
  const fundedReviewEvidence = require(path.join(root, 'content/data/russian-fundednext-review-evidence.json'))
  const payoutRoutes = ['obzor-fundednext', 'fundednext-mt5', 'fundednext-vs-bright-funded', 'fundednext-vs-fundingpips', 'vyplaty-prop-firm', 'otzyvy-prop-firm']
  const payoutPages = payoutRoutes.map(slug => [slug, require(path.join(root, `app/ru/${slug}/page.tsx`)).default])
  const payoutSource = fundedReviewEvidence.sources.payoutGeneral
  const payoutSourceDate = payoutSource.sourceCapturedAt
  const payoutCell = html => html.match(/<td data-russian-payout-product="fundednext:stellar-1-step">([\s\S]*?)<\/td>/)?.[1]
  try {
    for (const capturedAt of [payoutSourceDate, '', 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
      payoutSource.sourceCapturedAt = capturedAt
      for (const [slug, Page] of payoutPages) {
        const html = renderToStaticMarkup(React.createElement(Page))
        const cell = payoutCell(html)
        assert(cell, `${slug}: separately fresh product remains in its table when timing evidence expires`)
        assert(html.includes(payoutSource.sourceUrl), `${slug}: independent timing source is actually linked`)
        assert(!cell.includes('еженедельно'), `${slug}: no calendar-week shortcut for five business days`)
        assert(cell.includes(capturedAt === payoutSourceDate ? '5 раб. дн.' : 'требует проверки'), `${slug}: source expiry and day unit are reflected in rendered payout cell`)
        if (slug === 'fundednext-vs-bright-funded' && capturedAt !== payoutSourceDate) assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'stale timing cannot retain the numeric comparison FAQ schema')
      }
      const row = getRussianFinderRows().find(row => row.firm.slug === 'fundednext' && row.product.slug === 'stellar-1-step')
      const finderHtml = renderToStaticMarkup(React.createElement(RuleFinder, { initialRows: [row] }))
      assert(finderHtml.includes(capturedAt === payoutSourceDate ? '5 раб. дн.' : 'требует проверки'), 'actual finder uses the same scoped payout evidence as articles')
      assert(finderHtml.includes(payoutSource.sourceUrl))
    }
  } finally { payoutSource.sourceCapturedAt = payoutSourceDate }
  const FundedReviewModule = require(path.join(root, 'app/ru/obzor-fundednext/page.tsx'))
  const renderFundedReview = () => renderToStaticMarkup(React.createElement(FundedReviewModule.default))
  const fundedReviewRow = (html, slug) => html.match(new RegExp(`<tr\\b[^>]*data-russian-fundednext-product="${slug}"[^>]*>[\\s\\S]*?<\\/tr>`))?.[0]
  const fundedReference = renderFundedReview()
  assert(fundedReference.includes('data-fundednext-russian-products="4"'))
  assert(fundedReviewRow(fundedReference, 'stellar-instant').includes('Нет дневного лимита'), 'a named fresh Instant source supports the explicit absence')
  assert(fundedReviewRow(fundedReference, 'stellar-1-step').includes('5 раб. дн.'), 'one-step timing retains the source business-day unit')
  assert(!fundedReviewRow(fundedReference, 'stellar-1-step').includes('еженедельно'), 'five business days are not flattened to a calendar-week label')
  assert(cryptoSchemas(fundedReference).some(item => item['@type'] === 'FAQPage'))
  assert.doesNotMatch(FundedReviewModule.metadata.description, /22 цены|4 модели/)
  assert.equal(FundedReviewModule.metadata.openGraph.description, 'Отзывы о FundedNext и обзор на русском: 4 модели Stellar, 22 цены, просадка, выплаты, Free Trial и проверка ограничений по стране.', 'sharing copy is preserved pending approval')
  const originalFundedEvidence = JSON.stringify(fundedReviewEvidence)
  for (const source of Object.values(fundedReviewEvidence.sources)) {
    const originalDate = source.sourceCapturedAt
    try {
      for (const date of ['', undefined, 'invalid', '2026-02-30', '2026-08-08', '2030-01-01']) {
        source.sourceCapturedAt = date
        const html = renderFundedReview()
        assert(html.includes('data-russian-fundednext-evidence-status="recapture-required"'))
        assert(html.includes('data-fundednext-russian-products="4"'), 'narrow rule expiry does not renew or erase independently current product records')
        assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'))
        if (source === fundedReviewEvidence.sources.instantLoss) assert(fundedReviewRow(html, 'stellar-instant').includes('Дневной лимит не подтверждён'), 'old absence evidence cannot turn a null daily cap into permission')
        assert(html.includes('id="sources"') && html.includes('data-russian-fundednext-copy-scope="challenge-versus-instant"'))
        assert.doesNotMatch(html, /NaN|Infinity|Invalid Date/)
      }
    } finally { source.sourceCapturedAt = originalDate }
  }
  assert.equal(JSON.stringify(fundedReviewEvidence), originalFundedEvidence)
  const fundedFixtureProducts = originalByFirm('fundednext')
  try {
    const fixture = structuredClone(fundedFixtureProducts.find(product => product.productSlug === 'stellar-2-step'))
    firmsModule.getChallengesByFirm = slug => slug === 'fundednext' ? [fixture] : originalByFirm(slug)
    fixture.profitTargets = null
    fixture.profitSplitPct = null
    fixture.dailyLossPct = null
    fixture.maxLossPct = null
    fixture.payoutFirstDays = null
    fixture.payoutFrequency = null
    fixture.minTradingDays = null
    fixture.accountSizes = [{ sizeUsd: 100000, priceUsd: 123.45, refundable: null }]
    let html = renderFundedReview()
    let row = fundedReviewRow(html, fixture.productSlug)
    assert(row.includes('Дневной лимит не подтверждён') && row.includes('срок не подтверждён'))
    assert(!row.includes('Нет дневного лимита') && !row.includes('null дн.'))
    assert(html.includes('Цели не подтверждены') && html.includes('возврат не подтверждён'))
    const costTable = html.match(/<table\b[^>]*data-fundednext-russian-truecost="true"[\s\S]*?<\/table>/)?.[0]
    assert(costTable.includes('$123.45') && costTable.includes('не подтверждено') && !costTable.includes('$0'), 'missing split withholds break-even while keeping known cash cost')
    fixture.profitTargets = { phase1: 8, phase2: null }
    fixture.minTradingDays = 0
    html = renderFundedReview()
    assert(html.includes('8% → не подтверждена') && html.includes('Минимум торговых дней на этап: 0'))
    fixture.accountSizes = []
    html = renderFundedReview()
    assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'))
    assert.doesNotMatch(html, /NaN|Infinity|Invalid Date|\$0|0%–/)
    fixture.accountSizes = [{ sizeUsd: 100000, priceUsd: 123.45 }]
    fixture.sourceCapturedAt = '2026-08-08'
    html = renderFundedReview()
    assert(html.includes('data-fundednext-russian-products="0"') && !html.includes('$123.45'), 'fresh narrow rules cannot renew an expired price')
    assert(html.includes(fixture.sourceUrl), 'expired product retains its primary source link')
  } finally { firmsModule.getChallengesByFirm = originalByFirm }
  const fundedReviewDates = Object.values(fundedReviewEvidence.sources).map(source => source.sourceCapturedAt)
  const originalGetChallenges = firmsModule.getAllChallenges
  const forexFixture = products.find(product => product.firmSlug === 'fundednext' && product.productSlug === 'stellar-1-step')
  const fixtureRow = fixture => {
    firmsModule.getAllChallenges = () => [fixture]
    const html = renderToStaticMarkup(React.createElement(ForexPage))
    assert.doesNotMatch(html, /NaN|Infinity|Invalid Date/)
    return html.match(/<tr\b[^>]*data-russian-forex-product="fundednext:stellar-1-step"[^>]*>[\s\S]*?<\/tr>/)?.[0]
  }
  try {
    const fixture = structuredClone(forexFixture)
    fixture.phases = 2
    fixture.profitTargets = null
    fixture.accountSizes = [{ sizeUsd: 100000, priceUsd: 123.45, priceEur: 67.89, dailyLossUsd: 1234.56, maxLossUsd: 2345.67 }]
    let row = fixtureRow(fixture)
    assert(row.includes('Цели не подтверждены') && !row.includes('Без оценки'), 'missing targets are not a zero-stage product')
    for (const [currency, value] of [['USD', 123.45], ['EUR', 67.89], ['USD', 1234.56], ['USD', 2345.67]]) {
      assert(row.includes(new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)), 'forex rows preserve both denominations, cents and tier-specific risk overrides')
    }
    fixture.profitTargets = { phase1: 8, phase2: null, phase3: null }
    assert(fixtureRow(fixture).includes('8% → не подтверждена'), 'a missing second-stage target stays visibly missing')
    fixture.phases = 0
    fixture.profitTargets = null
    assert(fixtureRow(fixture).includes('Без оценки'), 'only actual zero-phase programmes are labelled without evaluation')
    fixture.accountSizes = []
    row = fixtureRow(fixture)
    assert(row.includes('Размеры счёта не подтверждены') && row.includes('Лимиты в деньгах не рассчитаны'), 'empty sizes cannot crash the guide or manufacture a tier')
    fixture.accountSizes = [{ sizeUsd: 100000, priceUsd: null, priceEur: null }]
    fixture.dailyLossPct = null
    fixture.maxLossPct = null
    row = fixtureRow(fixture)
    assert(row.includes('цена не подтверждена') && row.includes('Дневной: не подтверждён; общий: не подтверждён'), 'unknown fees and risk stay unknown')
  } finally { firmsModule.getAllChallenges = originalGetChallenges }
  assert.equal(mt5Evidence.ea.manualOnlyFromAccountSizeUsd, 50000)
  assert.equal(mt5Evidence.instantEaScope.accountSizeCutoffUsd, null, 'missing product-specific cutoff is not an exemption')
  const SecondaryComparison = require(path.join(root, 'app/ru/fundednext-vs-fundingpips/page.tsx'))
  const renderSecondary = () => renderToStaticMarkup(React.createElement(SecondaryComparison.default))
  const secondaryProducts = structuredClone([...originalByFirm('fundednext'), ...originalByFirm('fundingpips')])
  const secondaryRow = (html, marker, key) => html.match(new RegExp(`<tr\\b[^>]*${marker}="${key}"[^>]*>[\\s\\S]*?<\\/tr>`))?.[0]
  let secondaryHtml = renderSecondary()
  assert(secondaryHtml.includes('Автор:') && secondaryHtml.includes('Edris Derakhshi'))
  assert.equal(cryptoSchemas(secondaryHtml).find(item => item['@type'] === 'Article')?.author?.name, 'Edris Derakhshi')
  assert.equal(cryptoSchemas(secondaryHtml).find(item => item['@type'] === 'FAQPage')?.mainEntity?.length, 5)
  assert.equal(SecondaryComparison.metadata.openGraph.description, 'Сравнение FundedNext и FundingPips на русском: продукты, цены, просадка, сплиты, выплаты и проверка доступности страны перед регистрацией.', 'Existing sharing metadata is preserved')
  for (const id of ['produkty', 'comparison-instant', 'comparison-one-step', 'comparison-two-step', 'comparison-cost', 'comparison-decision', 'sources']) {
    assert(secondaryHtml.includes(`href="#${id}"`) && secondaryHtml.includes(`id="${id}"`), 'Contents links have real destinations')
  }
  assert(secondaryHtml.indexOf('id="comparison-cost"') < secondaryHtml.indexOf('id="comparison-decision"'), 'Cost evidence comes before registration decision')
  assert.equal((secondaryHtml.match(/tabindex="0" role="region" aria-label=/g) ?? []).length, 2, 'Both wide tables are named keyboard-scroll regions')
  assert(secondaryHtml.includes('ru-review-article'))
  const secondaryText = secondaryHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ')
  assert.doesNotMatch(secondaryText, /\bsplit\b|\breward\b|\bstatic\b|\btrailing\b|\bcheckout\b|\b0-phase\b|захват[а-яё]*/iu)
  for (const product of secondaryProducts) assert(secondaryHtml.includes(product.sourceUrl))
  const twoStepFixture = secondaryProducts.find(product => product.firmSlug === 'fundednext' && product.productSlug === 'stellar-2-step')
  const originalTwoStep = structuredClone(twoStepFixture)
  try {
    firmsModule.getChallengesByFirm = slug => ['fundednext', 'fundingpips'].includes(slug)
      ? secondaryProducts.filter(product => product.firmSlug === slug) : originalByFirm(slug)
    for (const product of secondaryProducts) product.sourceCapturedAt = product === twoStepFixture ? '2026-08-27' : '2026-09-08'
    secondaryHtml = renderSecondary()
    assert(secondaryHtml.includes('<strong>2026-08-27</strong>'), 'Oldest record, not newest, labels the source range')
    twoStepFixture.profitTargets = null
    twoStepFixture.profitSplitPct = null
    twoStepFixture.dailyLossPct = null
    twoStepFixture.maxLossPct = null
    twoStepFixture.minTradingDays = null
    twoStepFixture.payoutFirstDays = null
    twoStepFixture.accountSizes = [{ sizeUsd: 50000, priceUsd: 123.45, refundable: null }]
    secondaryHtml = renderSecondary()
    let row = secondaryRow(secondaryHtml, 'data-russian-comparison-product', 'fundednext:stellar-2-step')
    assert(row.includes('не подтверждено → не подтверждено') && !row.includes('без оценочного этапа'))
    assert(row.includes('срок не подтверждён') && !row.includes('null'))
    const costRow = secondaryRow(secondaryHtml, 'data-russian-comparison-cost-product', 'fundednext:stellar-2-step')
    assert(costRow.includes('$123.45') && costRow.includes('не подтверждено') && !costRow.includes('$0'), 'Known cost survives unknown split without a fake recovery figure')
    twoStepFixture.profitTargets = { phase1: 8, phase2: null }
    assert(renderSecondary().includes('8% → не подтверждено'))
    twoStepFixture.phases = 1
    assert(!renderSecondary().includes('data-russian-comparison-pair="two-step"'), 'Product slug cannot override a changed evaluation structure')
    Object.assign(twoStepFixture, originalTwoStep)
    twoStepFixture.accountSizes = [{ sizeUsd: 25000, priceUsd: 123.45, refundable: null }]
    assert(!secondaryRow(renderSecondary(), 'data-russian-comparison-cost-product', 'fundednext:stellar-2-step').includes('$123.45'), 'Missing 50K tier does not borrow the 25K fee')
    for (const invalid of [NaN, Infinity, -10, 0]) {
      twoStepFixture.accountSizes = [{ sizeUsd: 50000, priceUsd: invalid, refundable: null }]
      secondaryHtml = renderSecondary()
      assert.doesNotMatch(secondaryHtml, /NaN|Infinity|Invalid Date/)
      assert(!cryptoSchemas(secondaryHtml).some(item => item['@type'] === 'FAQPage'))
    }
    Object.assign(twoStepFixture, originalTwoStep)
    for (const invalid of ['', '2026-02-30', '2030-01-01', '2026-08-08']) {
      twoStepFixture.sourceCapturedAt = invalid
      secondaryHtml = renderSecondary()
      assert(!secondaryHtml.includes('data-russian-comparison-pair="two-step"'))
      assert(secondaryHtml.includes('id="sources"') && secondaryHtml.includes(twoStepFixture.sourceUrl))
      assert(!cryptoSchemas(secondaryHtml).some(item => item['@type'] === 'FAQPage'))
    }
    for (const product of secondaryProducts) product.sourceCapturedAt = '2026-08-08'
    secondaryHtml = renderSecondary()
    assert(secondaryHtml.includes('data-russian-comparison-product-count="0"'))
    assert(secondaryHtml.includes('Нет программ с актуальной проверкой'))
    assert(!secondaryHtml.includes('data-russian-comparison-cost-product='))
    for (const product of secondaryProducts) assert(secondaryHtml.includes(product.sourceUrl), 'Sources survive complete price expiry')
  } finally { firmsModule.getChallengesByFirm = originalByFirm }
  const cryptoSourceDates = [...cryptoEvidence.ranked.map(evidence => evidence.sourceCapturedAt), cryptoEvidence.payoutAlternative.sourceCapturedAt,
    ...cryptoEvidence.ranked.flatMap(evidence => originalByFirm(evidence.firmSlug).filter(product => evidence.productSlugs.includes(product.productSlug)).map(product => product.sourceCapturedAt))]
  const boundaries = [...products.map(product => product.sourceCapturedAt), ...instantSourceDates, ...mt5SourceDates, ...cTraderSourceDates, ...forexSourceDates, ...cryptoSourceDates, ...brightSourceDates, ...fundedReviewDates, ...teamTradersEvidence.sources.map(source => source.capturedAt)]
    .flatMap(capturedAt => [offset(capturedAt, 30), offset(capturedAt, 31)])
  const dates = [...new Set([new RealDate().toISOString().slice(0, 10), ...boundaries, offset(boundaries.sort().at(-1), 365)])].sort()
  for (const date of dates) {
    clock = `${date}T12:00:00Z`
    const englishRows = buildChallengeComparisonRows(getAllChallenges(), getAllFirms(), [])
    const globalHtml = renderToStaticMarkup(React.createElement(GlobalComparison, { rows: englishRows }))
    assert(globalHtml.includes('challenge-workspace'), 'the real global comparison receives the shared reading surface')
    if (englishRows.length) {
      assert.match(globalHtml, /class="challenge-table-scroll" tabindex="0" role="region" aria-label="Challenge comparison table; scroll horizontally to see all columns"/, 'wide results have a labelled keyboard-focusable scroll region')
      assert(globalHtml.includes('class="challenge-data-table"'), 'comparison table receives readable data styling')
    } else {
      assert(globalHtml.includes('No sourced product matches every filter'), 'readability work preserves the expired-source empty state')
      assert(!globalHtml.includes('class="challenge-data-table"'), 'no empty data table replaces the source warning')
    }
    const EnglishHome = require(path.join(root, 'app/page.tsx')).default
    const englishHtml = renderToStaticMarkup(React.createElement(EnglishHome))
    const englishSizes = [...new Set(englishRows.flatMap(row => row.product.tiers.map(tier => tier.sizeUsd)))].sort((a, b) => a - b)
    const englishSize = englishSizes.includes(50000) ? 50000 : englishSizes[0]
    const englishMatches = englishSizes.length ? filterChallengeRows(englishRows, { ...DEFAULT_FINDER_FILTERS, size: englishSize }) : []
    const represented = new Set()
    const englishExpected = englishMatches.filter(row => !represented.has(row.firm.slug) && represented.add(row.firm.slug)).slice(0, 3).map(challengeKey)
    assert.deepEqual([...englishHtml.matchAll(/data-english-home-preview-product="([^"]+)"/g)].map(match => match[1]), englishExpected, `${date}: actual English homepage preview expires with source data`)
    assert.equal((englishHtml.match(/<h1\b/g) ?? []).length, 1)
    assert.doesNotMatch(englishHtml, /(?:NaN|Infinity|Invalid Date)/)
    assert(englishHtml.includes('data-english-home-layout="focused"'))
    assert.equal((englishHtml.match(/<section\b/g) ?? []).length, 4, 'English home has one comparison, partner, decision and guide section')
    assert.equal((englishHtml.match(/data-english-home-partners="single-section"/g) ?? []).length, 1)
    assert.deepEqual([...englishHtml.matchAll(/data-english-home-partner="([^"]+)"/g)].map(match => match[1]), ['fundednext', 'bright-funded'], 'only the two primary partners get commercial homepage placement')
    assert(englishHtml.includes('data-english-home-affiliate-disclosure="primary-partners"') && englishHtml.includes('not a ranking'))
    assert.equal((englishHtml.match(/data-english-home-guide="selected"/g) ?? []).length, 3, 'home keeps a curated guide entry, not a latest-article feed')
    assert.doesNotMatch(englishHtml, /class="(?:bento-grid|leaderboard|picker-card|marquee|truecost-card|cta-final|featured-spotlight)/, 'duplicate rankings, pickers, promotions and calculator are absent')
    const sectionOrder = ['id="home-programmes"', 'data-english-home-partners="single-section"', 'data-english-home-tools="decision-links"', 'data-english-home-guides="selected-three"'].map(marker => englishHtml.indexOf(marker))
    assert(sectionOrder.every((position, index) => position >= 0 && (index === 0 || position > sectionOrder[index - 1])), 'comparison precedes commercial placement, tools and selected guides')
    for (const href of ['/prop-firms', '/compare', '/methodology', '/prop-firm-challenge-changes', '/best-prop-firms-in-india', '/ru', '/blog', '/true-cost-of-prop-firm-challenges', '/how-prop-firm-challenges-work', '/how-to-pass-a-prop-firm-challenge']) {
      assert(englishHtml.includes(`href="${href}"`), `homepage retains ${href} discovery`)
    }
    for (const [slug, campaign] of [['fundednext', 'home-fundednext-spotlight'], ['bright-funded', 'home-partners']]) {
      const card = englishHtml.match(new RegExp(`<article\\b[^>]*data-english-home-partner="${slug}"[^>]*>[\\s\\S]*?<\\/article>`))?.[0]
      assert(card, `partner card for ${slug}`)
      const products = getAllChallenges().filter(product => product.firmSlug === slug)
      const fresh = products.length > 0 && products.every(product => isChallengeFresh(product))
      assert(card.includes(`data-source-status="${fresh ? 'fresh' : 'recapture-required'}"`), 'commercial placement cannot conceal stale product evidence')
      if (fresh) {
        assert(card.includes(`data-english-home-partner-products="${products.length}"`))
        assert(card.includes(`dateTime="${products.map(product => product.sourceCapturedAt).sort()[0]}"`), 'partner date uses its oldest supporting capture')
      } else {
        assert(!card.includes('data-english-home-partner-products=') && card.includes('not confirmation of current terms'), 'expired partners keep a useful review link, not current programme claims')
      }
      const affiliate = card.match(new RegExp(`<a\\b[^>]*href="/go/${slug}\\?from=${campaign}"[^>]*>`))?.[0]
      assert(affiliate?.includes('rel="sponsored nofollow noopener"') && affiliate.includes('target="_blank"'), 'existing affiliate attribution and link disclosure are preserved')
      assert(!card.includes('% off') && !card.includes('split'), 'no uncaptured aggregate discounts or profit splits on partner cards')
    }
    for (const match of englishHtml.matchAll(/href="(\/prop-firm-challenges\?[^"#]+)#challenge-shortlist-heading"/g)) {
      const url = new URL(match[1].replace(/&amp;/g, '&'), 'https://tradersfundhub.com')
      assert.equal(url.searchParams.get('size'), String(englishSize))
      assert.equal(url.searchParams.get('program'), 'all')
      assert(englishExpected.includes(url.searchParams.get('shortlist')), 'English handoff uses the existing valid product keys')
    }
    for (const slug of pages) {
      try {
        const Page = require(path.join(root, 'app/ru', slug, 'page.tsx')).default
        const html = renderToStaticMarkup(React.createElement(Page))
        assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'one H1 survives expiry')
        if (['obzor-fundednext', 'obzor-bright-funded'].includes(slug)) {
          const regions = [...html.matchAll(/<div\b[^>]*class="ru-table-wrap"[^>]*>/g)].map(match => match[0])
          assert.equal(regions.length, slug === 'obzor-fundednext' ? 4 : 3, 'all partner review tables remain available')
          for (const region of regions) assert(region.includes('tabindex="0"') && region.includes('role="region"') && /aria-label="[^"]+таблицу можно прокрутить"/.test(region), 'each Russian partner table has named keyboard-scroll access, including expired states')
          const labels = regions.map(region => region.match(/aria-label="([^"]+)"/)[1])
          assert.equal(new Set(labels).size, regions.length, 'table regions have distinct meaningful labels')
        }
        if (slug === 'obzor-bright-funded') {
          const captured = originalByFirm('bright-funded')
          const fresh = captured.filter(product => isChallengeFresh(product))
          const tierCount = fresh.reduce((count, product) => count + product.accountSizes.filter(tier => tier.priceEur != null && tier.priceEur > 0).length, 0)
          assert(html.includes(`data-russian-bright-price-count="${tierCount}"`))
          const valid = fresh.length === captured.length && Object.values(brightEvidence.sources).every(source => isChallengeFresh(source))
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), valid)
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\breward\b|\bsuppression\b|\bcountry-check\b|\bpayout\b|\bfee\b|\bchallenge\b|\bEUR-priced\b|\bOvernight\b|\bweekend\b|\boff-ramp\b|\bpayment ownership\b|\bcomputeTrueCost\b|B2B30|захвачен/iu, 'Bright review uses reader-facing Russian and no expired promotion')
          assert(!html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0].includes('18 цен'))
          assert(html.includes('14-дневный режим перечислен среди платных дополнений'), 'payout-cycle conflict stays explicit')
          for (const source of Object.values(brightEvidence.sources)) assert(html.includes(`href="${source.sourceUrl}"`))
        }
        if (slug === 'obzor-fundednext') {
          const valid = fundedFixtureProducts.every(product => isChallengeFresh(product))
            && [...fundedReviewDates, marketEvidence.capturedAt, instantEvidence.capturedAt, instantEvidence.news.sourceCapturedAt, mt5Evidence.ea.sourceCapturedAt, mt5Evidence.instantEaScope.sourceCapturedAt]
              .every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), valid, 'FundedNext review schema expires with independent rule, country and programme evidence')
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\breward\b|\bchallenge\b|\btrailing\b|\bpayout\b|\btrue cost\b|\breset-price\b|\bresets\b|захвачен/iu, 'FundedNext review uses natural reader-facing Russian')
          assert(html.includes('data-russian-fundednext-copy-scope="challenge-versus-instant"'))
          for (const source of Object.values(fundedReviewEvidence.sources)) assert(html.includes(`href="${source.sourceUrl}"`))
          assert(!html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0].includes('22 цены'))
        }
        if (slug === 'obzor-teamtraders') {
          const fresh = [teamTradersEvidence, ...teamTradersEvidence.sources].every(source => isChallengeFresh({ sourceCapturedAt: source.capturedAt }))
          assert(html.includes('class="ru-review-article"'), 'TeamTraders uses the shared readable article layout')
          assert.equal(html.includes('data-russian-teamtraders-evidence-status="dated"'), fresh)
          assert.equal(html.includes('"@type":"FAQPage"'), fresh, 'dated FAQ schema expires with the oldest source')
          assert.equal(html.includes('class="ru-stats"'), fresh)
          const article = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1])).find(item => item['@type'] === 'Article')
          assert.equal(article?.author?.name, 'Edris Derakhshi')
          assert.equal(article?.datePublished, '2026-08-28')
          assert.equal(article?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/obzor-teamtraders'])
          assert(html.includes(`Обновлено ${article.dateModified}`))
          for (const id of ['tarify', 'etapy', 'pravila', 'vyplaty', 'raskhozhdeniya', 'oferta', 'istochniki', 'global-options']) assert(html.includes(`id="${id}"`), 'contents links resolve to real sections')
          for (const source of teamTradersEvidence.sources) assert(html.includes(`href="${source.url}"`), 'all four primary sources remain visible')
          const decision = html.split('data-russian-teamtraders-decision="rules-before-reviews"')[1].split('</section>')[0]
          assert(decision.indexOf('Сначала прочитайте оферту') < decision.indexOf('Затем проверьте техническую совместимость'), 'contract review precedes account registration, even free')
          assert(html.includes('У нас нет проверенной истории выплат'))
          assert(html.includes(getRussianReviewFinderHref('fundednext').replace(/&/g, '&amp;')), 'local model hands off to a separately labelled global comparison')
          assert.equal(html.includes('Открыть две глобальные двухэтапные программы'), !getRussianReviewFinderHref('fundednext').endsWith('#podbor'), 'expired preset does not promise two available programmes')
          for (const firmSlug of ['fundednext', 'bright-funded']) {
            const hasFreshProducts = products.some(product => product.firmSlug === firmSlug && isChallengeFresh(product))
            assert.equal(html.includes(`data-russian-teamtraders-partner-products="${firmSlug}"`), hasFreshProducts)
            assert.equal(html.includes(`data-russian-teamtraders-partner-expired="${firmSlug}"`), !hasFreshProducts)
            const affiliate = html.match(new RegExp(`<a\\b[^>]*href="/go/${firmSlug}\\?from=ru-teamtraders-global-${firmSlug}"[^>]*>`))?.[0]
            assert(affiliate?.includes('rel="sponsored nofollow noopener"'), 'global affiliate attribution remains disclosed')
          }
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ')
          assert.doesNotMatch(visible, /\breal\b|\bfunded demo\b|\bfee\b|\bevaluation\b|\bpayout\b|\bUTM\b|\baffiliate\b|\bprofit cap\b|\bMOEX\b/iu, 'native Russian replaces internal mixed-language copy')
        }
        assert.doesNotMatch(html, /(?:NaN|Infinity|Invalid Date)/, 'no invalid number/date')
        assert.doesNotMatch(html, /Основатель Traders Fund Hub|funded-трейдер с 2020 года/iu, 'Russian pages do not invent the author’s founder or funded-trading history')
        if (slug === 'prop-firmy-s-ctrader') {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\bcheckout\b|\bshortlist\b|\btier\b|\bfee\b|\bpayout\b|\bCTA\b|\bcaptured\b|sourceCapturedAt|захвачен/iu, 'cTrader uses native reader-facing explanations')
          assert(visible.includes('Автор: Edris Derakhshi'))
          assert(html.includes('ru-review-article'))
          const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
          assert.equal(schema.find(item => item['@type'] === 'Article')?.author?.name, 'Edris Derakhshi')
          assert.equal(schema.find(item => item['@type'] === 'Article')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/prop-firmy-s-ctrader'])
          const fresh = products.filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug) && isChallengeFresh(product))
          const needsCheck = cTraderSourceDates.some(sourceCapturedAt => !isChallengeFresh({ sourceCapturedAt }))
            || ['fundednext', 'bright-funded'].some(firm => !fresh.some(product => product.firmSlug === firm))
          assert.equal(html.includes('data-russian-guide-source-status="recapture-required"'), needsCheck)
          assert.equal(schema.some(item => item['@type'] === 'FAQPage'), !needsCheck)
          const expectedRows = fresh.filter(product => product.firmSlug === 'fundednext' && product.phases > 0 && product.accountSizes.some(tier => tier.sizeUsd === cTraderFundedNext.maxAccountSizeUsd) && isChallengeFresh(cTraderFundedNext))
          assert.equal((html.match(/data-russian-ctrader-checkout-product=/g) ?? []).length, expectedRows.length, 'calculation needs both current price and platform evidence')
          for (const product of expectedRows) {
            const tier = product.accountSizes.find(tier => tier.sizeUsd === cTraderFundedNext.maxAccountSizeUsd)
            if (tier.priceUsd != null) assert(html.includes(`$${(tier.priceUsd + cTraderFundedNext.platformFee.amount).toFixed(2)}`), 'platform-cost arithmetic uses captured amounts')
          }
          for (const firm of cTraderEvidence.firms) for (const sourceUrl of firm.sourceUrls) assert(html.includes(sourceUrl), 'each official platform source is actually linked')
          assert(html.includes('/ru/luchshie-prop-firmy#podbor'))
          assert(html.includes('не подтверждает доступность cTrader'), 'finder handoff does not masquerade as a platform filter')
          assert.equal(cTraderFundedNext.platformFee.usClientRefundException, true)
          assert(visible.includes('Исключение по возврату не является разрешением купить новый счёт'))
        }
        if (slug === '') {
          const rows = getRussianFinderRows()
          const sizes = [...new Set(rows.flatMap(row => row.product.tiers.map(tier => tier.sizeUsd)))].sort((a, b) => a - b)
          const size = sizes.includes(50000) ? 50000 : sizes[0]
          const matching = sizes.length ? filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, size }) : []
          const seen = new Set()
          const expected = matching.filter(row => !seen.has(row.firm.slug) && seen.add(row.firm.slug)).slice(0, 3)
          const shown = [...html.matchAll(/data-russian-home-preview-product="([^"]+)"/g)].map(match => match[1])
          assert.deepEqual(shown, expected.map(challengeKey), 'home preview uses current source-checked data, one programme per firm in alphabetical order')
          if (sizes.length) assert(html.includes(`data-russian-home-result-count="${matching.length}"`), 'home count agrees with working finder')
          for (const match of html.matchAll(/href="\/ru\/luchshie-prop-firmy#([^"]+)"/g)) {
            const state = parseFinderState(match[1].replace(/&amp;/g, '&'), rows)
            for (const key of state.selected) assert(rows.some(row => challengeKey(row) === key), 'home handoff never selects unavailable products')
          }
          assert.equal((html.match(/data-russian-home-hero-partner=/g) ?? []).length, 2, 'two disclosed partner cards remain')
        }
        if (['fundednext-mt5', 'fundednext-stellar-instant', 'obzor-fundednext'].includes(slug)) {
          const fresh = [mt5Evidence.ea, mt5Evidence.instantEaScope].every(evidence => isChallengeFresh(evidence))
          assert(html.includes(`data-russian-fundednext-ea-size="${fresh ? 'source-checked' : 'recheck-required'}"`), 'EA notice expires independently')
          assert(html.includes(mt5Evidence.instantEaScope.sourceUrl), 'product-specific scope conflict stays sourced')
        }
        if (slug === 'fundednext-mt5') {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\bcheckout\b|\bsnapshot\b|\ballocation\b|\bdownload\b|\bCTA\b/iu, 'MT5 guide uses reader-facing Russian')
          assert(visible.includes('Автор: Edris Derakhshi'))
          const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
          assert.equal(schema.find(item => item['@type'] === 'Article')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/fundednext-mt5'])
          const freshProducts = products.filter(product => product.firmSlug === 'fundednext' && isChallengeFresh(product))
          const needsCheck = !freshProducts.length || [...mt5SourceDates, marketEvidence.capturedAt].some(sourceCapturedAt => !isChallengeFresh({ sourceCapturedAt }))
          assert.equal(html.includes('data-russian-guide-source-status="recapture-required"'), needsCheck)
          assert.equal(schema.some(item => item['@type'] === 'FAQPage'), !needsCheck)
          for (const capturedAt of mt5SourceDates) assert(visible.includes(capturedAt), 'each independent MT5 source date stays visible')
          assert.equal((html.match(/data-russian-fundednext-mt5-product=/g) ?? []).length, freshProducts.length, 'expired product rows do not survive')
          assert.equal((html.match(/id="(?:answer|login|products|free-trial|ea-rules|continuity|platforms|checkout|country|verdict|sources|faq)"/g) ?? []).length, 12, 'existing MT5 article anchors survive')
        }
        if (slug === 'luchshie-prop-firmy') {
          assert.equal((html.match(/data-russian-ranking="single-directory"/g) ?? []).length, 1, 'one full editorial directory')
          assert.equal((html.match(/data-russian-ranking-partners="single-section"/g) ?? []).length, 1, 'one consolidated partner section')
          assert(!html.includes('data-russian-ranking="top-five"') && !html.includes('data-russian-ranking-partner-matrix'), 'no duplicate ranking cards or partner table')
          for (const anchor of ['top-5', 'partner-matrix', 'polnyy-reyting', 'podbor']) assert.equal((html.match(new RegExp(`id="${anchor}"`, 'g')) ?? []).length, 1, `preserve exactly one ${anchor} anchor`)
          const allProducts = getAllChallenges()
          const expectedFirms = getAllFirms().filter(firm => {
            const firmSlug = firm.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            const scoped = allProducts.filter(product => product.firmSlug === firmSlug)
            return scoped.length > 0 && scoped.every(product => isChallengeFresh(product))
          })
          assert.equal((html.match(/data-ranked-firm=/g) ?? []).length, expectedFirms.length, 'consolidation retains all fresh directory firms, expiry removes stale rows')
          const Finder = require(path.join(root, 'components/RussianChallengeFinder.tsx')).default
          for (const row of getRussianFinderRows().filter(row => row.product.phases === 0)) {
            // Isolate copy rendering at the server's default size. This synthetic size
            // is test-only; real tier availability is covered by finder projection tests.
            const fixture = { ...row, product: { ...row.product, tiers: [{ ...row.product.tiers[0], sizeUsd: 50000 }] } }
            const card = renderToStaticMarkup(React.createElement(Finder, { initialRows: [fixture] }))
            assert(!card.includes('после оценки'), 'instant-only finder does not describe a nonexistent evaluation')
            assert(card.includes('для начала участия'), 'instant cost explanation uses participation, not passing')
          }
        }
        if (['obzor-fundednext', 'obzor-bright-funded', 'obzor-fundingpips', 'obzor-ftmo'].includes(slug)) {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ')
          assert.doesNotMatch(visible, /\bCTA\b|\bcheckout\b|\bgates?\b|\bsnapshot\b|захват[а-яё]*|challengeTierEconomics|\bnull\b/iu, 'no internal editorial/implementation jargon in the four main reviews')
          assert(visible.includes('Автор: Edris Derakhshi'), 'established author is visible')
          assert(!html.includes('Tara Mohseni') && !html.includes('tara-mohseni'), 'do not misattribute the Russian review')
          const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
          const article = jsonLd.find(item => item['@type'] === 'Article')
          assert.equal(article?.author?.name, 'Edris Derakhshi', 'structured author agrees with the byline')
          const handoff = getRussianReviewFinderHref(slug.replace('obzor-', ''))
          assert(html.includes(handoff.replace(/&/g, '&amp;')), 'reader can carry a comparison into the finder')
        }
        if (slug === 'prop-firmy-bez-chelendzha') {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\bCTA\b|\bcheckout\b|\bshortlist\b|\bsnapshot\b|\btier\b|\bfee\b|\bpayout route\b|\baccount size\b|\bfailure point\b|\bchallenge-based\b|\baffiliate page\b|\bidentity verification\b|\bCustomer Agreement\b|\bpayout-provider\b|\beligibility\b/iu, 'instant-funding guide uses reader-facing Russian rather than internal labels')
          assert(visible.toLowerCase().includes('плавающий лимит убытка') && visible.includes('Условие выплаты'), 'instant-funding guide keeps localized risk and payout labels')
        }
        if (reviewed[slug]) {
          const scoped = products.filter(product => reviewed[slug].includes(product.firmSlug))
          const needsRecapture = !scoped.length || scoped.some(product => !isChallengeFresh(product))
          assert.equal(html.includes('data-russian-source-status="recapture-required"'), needsRecapture, 'visible dated notice tracks relevant sources')
          if (needsRecapture) assert(html.includes('/ru/luchshie-prop-firmy#podbor'), 'expired reviews retain a finder handoff')
        }
        if (slug === 'luchshie-kripto-prop-firmy') {
          const expected = cryptoEvidence.ranked.filter(evidence => {
            const mapped = originalByFirm(evidence.firmSlug).filter(product => evidence.productSlugs.includes(product.productSlug))
            return isChallengeFresh(evidence) && mapped.length === evidence.productSlugs.length && mapped.every(product => isChallengeFresh(product)
              && product.accountSizes.some(tier => (firmsModule.minimumCostToFundedUsd(product, tier) ?? 0) > 0))
          })
          assert.deepEqual(cryptoCards(html), expected.map(evidence => evidence.firmSlug).sort(), `${date}: cards re-evaluate both independent source dates`)
          assert(html.includes(`data-russian-crypto-product-count="${expected.reduce((count, evidence) => count + evidence.productSlugs.length, 0)}"`), 'programme count follows the actual surviving mappings')
          const schemas = cryptoSchemas(html)
          const list = schemas.find(item => item['@type'] === 'ItemList')
          assert.equal(Boolean(list), expected.length > 0)
          if (list) {
            assert.equal(list.numberOfItems, expected.length)
            assert.deepEqual(list.itemListElement.map(entry => entry.item.name).sort(), expected.map(evidence => evidence.firmName).sort())
            const fundedNext = list.itemListElement.find(entry => entry.item.name === 'FundedNext')
            if (fundedNext) assert.equal(fundedNext.item.url, 'https://tradersfundhub.com/ru/obzor-fundednext', 'schema points to the localized review when available')
          }
          assert.equal(schemas.some(item => item['@type'] === 'FAQPage'), expected.length === cryptoEvidence.ranked.length && isChallengeFresh(cryptoEvidence.payoutAlternative))
          assert.equal(html.includes('data-russian-crypto-empty="recapture-required"'), expected.length === 0)
          for (const section of ['country-check', 'ranking', 'comparison', 'firm-decisions', 'crypto-risk', 'payout-boundary', 'evidence-watch', 'sources', 'alternatives', 'faq']) assert(html.includes(`id="${section}"`), 'contents targets survive expiry')
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\bcheckout\b|\btier\b|\bCTA\b|\bgates?\b|\brails?\b|\bshortlist\b|\bsnapshot\b|\bsourceCapturedAt\b/iu, 'crypto guide uses reader-facing Russian')
          assert(html.includes('data-russian-crypto-cft-correction="2026-09-08"'), 'Dated CFT correction remains substantive after product expiry')
          assert(!html.includes('data-russian-crypto-firm="crypto-fund-trader"'), 'A price correction does not automatically qualify CFT for crypto ranking')
          assert(html.includes('/blog/crypto-fund-trader-review'), 'Russian reader can reach the complete existing review')
          assert(html.includes('products=crypto-fund-trader%3Ainstant%2Ccrypto-fund-trader%3Aascend%2Ccrypto-fund-trader%3Abreak#change-ledger'), 'Watch handoff uses the supported product-focus parameter')
          assert(html.includes('даты полной проверки остаются 27 июля'), 'Conflict date does not replace the older full-product dates')
        }
        if (slug === 'forex-prop-firmy') {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\bcheckout\b|\btier\b|\bCTA\b|\bgates?\b|\brails?\b|\bshortlist\b|\bsnapshot\b|\bsourceCapturedAt\b|захвачен/iu, 'forex guide uses reader-facing Russian')
          assert(visible.includes('Автор: Edris Derakhshi') && html.includes('ru-review-article'))
          const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
          const article = schema.find(item => item['@type'] === 'Article')
          assert.equal(article?.author?.name, 'Edris Derakhshi')
          assert.equal(article?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/forex-prop-firmy'])
          assert(!article.headline.includes('7 продуктов'), 'metadata does not promise a fixed expiring count')
          const scoped = getAllChallenges().filter(product => product.assetClass === 'cfd' && ['fundednext', 'bright-funded'].includes(product.firmSlug))
          const current = scoped.filter(product => isChallengeFresh(product))
          assert.deepEqual([...html.matchAll(/data-russian-forex-product="([^"]+)"/g)].map(match => match[1]), current.map(product => `${product.firmSlug}:${product.productSlug}`))
          const needsCheck = [...forexSourceDates, ...scoped.map(product => product.sourceCapturedAt), marketEvidence.capturedAt].some(sourceCapturedAt => !isChallengeFresh({ sourceCapturedAt }))
          assert.equal(html.includes('data-russian-guide-source-status="recapture-required"'), needsCheck)
          assert.equal(schema.some(item => item['@type'] === 'FAQPage'), !needsCheck)
          for (const product of current) {
            const firm = forexEvidence.firms.find(firm => firm.firmSlug === product.firmSlug)
            const rule = firm.forexLeverage.find(rule => rule.products.includes(product.productName))
            const expected = isChallengeFresh({ sourceCapturedAt: firm.sourceCapturedAt }) ? `1:${rule.ratio}` : 'Требует перепроверки'
            assert.equal(leverageCell(html, `${product.firmSlug}:${product.productSlug}`), expected, 'displayed leverage follows its independent evidence record')
          }
          if (!current.length) assert(html.includes('Ценовые записи вышли за пределы окна проверки') && !html.includes('<tbody>'), 'empty forex coverage has a useful explanation, not an empty comparison table')
          assert(html.includes(getRussianReviewFinderHref('fundednext').replace(/&/g, '&amp;')), 'forex handoff carries the existing same-size pair or its safe fallback')
          for (const id of ['produkty', 'plecho', 'sources', 'faq']) assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1)
          for (const firm of forexEvidence.firms) for (const url of firm.sourceUrls) assert(html.includes(url), 'all forex primary sources remain visible')
          assert(html.includes('data-russian-forex-correction="stellar-1-step-leverage"') && visible.includes('исправление нашей записи'), 'correction is transparent and not presented as a new policy-change date')
        }
        if (slug === 'fundednext-stellar-instant') {
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert.doesNotMatch(visible, /\bCTA\b|\bcheckout\b|\bgates?\b|\bsnapshot\b|захват[а-яё]*|\bbuffer\b|\bgrowth\b|\bsetup\b|\breset fee\b|\bprofit high\b/iu, 'Instant guide uses reader-facing Russian')
          assert(visible.includes('Автор: Edris Derakhshi'))
          assert(html.includes('ru-review-article'), 'Instant guide inherits the shared readable article layout')
          const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
          const article = schema.find(item => item['@type'] === 'Article')
          assert.equal(article?.author?.name, 'Edris Derakhshi')
          assert.equal(article?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/fundednext-stellar-instant'])
          const needsCheck = instantSourceDates.some(sourceCapturedAt => !isChallengeFresh({ sourceCapturedAt }))
          assert.equal(html.includes('data-russian-guide-source-status="recapture-required"'), needsCheck, 'rule, price and access age are independent of editorial date')
          assert.equal(schema.some(item => item['@type'] === 'FAQPage'), !needsCheck, 'dated archival answers do not remain current FAQ structured data')
          for (const capturedAt of instantSourceDates) assert(visible.includes(capturedAt), 'actual source dates remain visible')
          assert.equal((html.match(/data-russian-fundednext-instant-tier=/g) ?? []).length,
            isChallengeFresh(instantProduct) ? instantProduct.accountSizes.filter(tier => tier.priceUsd > 0).length : 0, 'expired prices are hidden independently from explanatory rules')
          assert(html.includes(getRussianInstantFinderHref().replace(/&/g, '&amp;')), 'instant guide carries a valid current comparison or safe fallback')
          assert(visible.includes(`не более ${instantEvidence.news.newsMllEquityBufferMaximumUses} раз на одном счёте`), 'news adjustment includes its per-account use limit')
          assert.equal(instantEvidence.news.newsMllEquityBufferMaximumUses, 3)
          assert.match(instantEvidence.news.maximumUsesEvidenceQuote, /maximum of 3 times/)
          assert.equal((html.match(/id="(?:answer|price|risk|payout|news|platform|holding|scale|reset|country|verdict|sources|faq)"/g) ?? []).length, 13, 'all established article anchors remain')
        }
        if (slug === 'fundednext-vs-fundingpips') {
          const fresh = products.filter(product => ['fundednext', 'fundingpips'].includes(product.firmSlug) && isChallengeFresh(product))
          assert(html.includes(`data-russian-comparison-product-count="${fresh.length}"`))
          const pairs = [['instant', 'stellar-instant', 'zero'], ['one-step', 'stellar-1-step', '1-step-flex'], ['two-step', 'stellar-2-step', '2-step-pro']]
          for (const [kind, left, right] of pairs) {
            const complete = fresh.some(product => product.firmSlug === 'fundednext' && product.productSlug === left)
              && fresh.some(product => product.firmSlug === 'fundingpips' && product.productSlug === right)
            assert.equal(html.includes(`data-russian-comparison-pair="${kind}"`), complete, 'only complete fresh pairs appear')
          }
        }
      } catch (error) { errors.push(`${date} /ru/${slug}: ${error.message}`) }
    }
  }
  assert.deepEqual(errors, [])
  console.log(`Russian expiry rendering passed: ${pages.length} pages plus the English homepage × ${dates.length} dates, covering source day-30/day-31 boundaries.`)
} finally {
  globalThis.Date = RealDate
  hooks.deregister()
}
