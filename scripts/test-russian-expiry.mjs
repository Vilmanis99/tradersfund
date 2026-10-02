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
  assert.equal(isChallengeFresh({ sourceCapturedAt: '2026-09-31' }, new RealDate('2026-10-01T12:00:00Z')), false, 'an impossible challenge capture cannot normalize into a fresh day')
  assert.equal(isChallengeFresh({ sourceCapturedAt: '2026-02-29' }, new RealDate('2026-03-01T12:00:00Z')), false, 'an invalid leap day cannot qualify as recent source evidence')
  assert.equal(isChallengeFresh({ sourceCapturedAt: '2026-09-30' }, new RealDate('2026-10-01T12:00:00Z')), true, 'a real recent challenge capture remains eligible')
  assert.equal(isChallengeFresh({ sourceCapturedAt: '2026-10-02' }, new RealDate('2026-10-01T12:00:00Z')), false, 'a future challenge capture remains ineligible')
  const brightFirm = getAllFirms().find(firm => firm.name === 'Bright Funded')
  assert(brightFirm?.affiliateUrl, 'Bright Funded affiliate destination is configured')
  const [brightTrustpilotCapture] = JSON.parse(fs.readFileSync(path.join(root, 'content/data/trustpilot-captures/2026-10-01/trustpilot-batch1.json'), 'utf8'))
  assert.equal(brightFirm.trustpilotCapturedAt, brightTrustpilotCapture.capturedAt, 'Bright Trustpilot date matches its preserved observation')
  assert.equal(brightFirm.trustpilotUrl, brightTrustpilotCapture.trustpilotUrl, 'Bright Trustpilot source URL matches its preserved observation')
  assert.match(brightTrustpilotCapture.evidence, /rating is unavailable.*breach.*guidelines/i, 'suppressed aggregate has first-party platform evidence')
  assert.match(
    fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8'),
    /\/go\/bright-funded\?from=home-partners/,
    'English homepage keeps the Bright Funded partner placement',
  )
  assert.match(
    fs.readFileSync(path.join(root, 'app/ru/page.tsx'), 'utf8'),
    /\/go\/bright-funded\?from=ru-home-hero-bright-funded/,
    'Russian homepage keeps a Bright Funded partner placement',
  )
  const brightRedirectRoute = require(path.join(root, 'app/go/[firm]/route.ts'))
  const configuredBrightDestination = new URL(brightFirm.affiliateUrl)
  for (const campaign of ['home-partners', 'ru-home-hero-bright-funded', 'ru-bright-funded-review-verdict']) {
    const brightRedirect = await brightRedirectRoute.GET(
      new Request(`https://tradersfundhub.com/go/bright-funded?from=${campaign}`),
      { params: Promise.resolve({ firm: 'bright-funded' }) },
    )
    assert.equal(brightRedirect.status, 302, `${campaign}: affiliate click uses a temporary redirect`)
    const destination = new URL(brightRedirect.headers.get('location') ?? '')
    assert.equal(destination.origin, configuredBrightDestination.origin, `${campaign}: configured affiliate host`)
    assert.equal(destination.pathname, configuredBrightDestination.pathname, `${campaign}: configured affiliate path`)
    assert.equal(destination.searchParams.get('utm_source'), 'tradersfundhub', `${campaign}: affiliate source attribution`)
    assert.equal(destination.searchParams.get('utm_medium'), 'affiliate', `${campaign}: affiliate medium attribution`)
    assert.equal(destination.searchParams.get('utm_campaign'), campaign, `${campaign}: placement attribution`)
  }
  const { isDealFresh, isDealCurrent } = require(path.join(root, 'lib/deals.ts'))
  assert.equal(isDealFresh({ verifiedOn: '2026-09-31' }, new RealDate('2026-10-01T12:00:00Z')), false, 'an impossible offer check date cannot normalize into a fresh day')
  assert.equal(isDealFresh({ verifiedOn: '2026-02-29' }, new RealDate('2026-03-01T12:00:00Z')), false, 'an invalid leap day cannot qualify as a recent offer')
  assert.equal(isDealFresh({ verifiedOn: '2026-09-30' }, new RealDate('2026-10-01T12:00:00Z')), true, 'a real recent date remains eligible')
  assert.equal(isDealCurrent({ verifiedOn: '2026-09-30', expiresOn: '2026-10-32' }, new RealDate('2026-10-01T12:00:00Z')), false, 'an impossible offer expiry date cannot leave a code active')
  assert.equal(isDealCurrent({ verifiedOn: '2026-09-30', expiresOn: '2026-10-01' }, new RealDate('2026-10-01T12:00:00Z')), true, 'a valid end date remains active through its stated day')
  assert.equal(isDealCurrent({ verifiedOn: '2026-09-30', expiresOn: '2026-10-01' }, new RealDate('2026-10-02T12:00:00Z')), false, 'a code expires after its stated end day')
  const deals = JSON.parse(fs.readFileSync(path.join(root, 'content/data/deals.json'), 'utf8'))
  const archivedDeals = JSON.parse(fs.readFileSync(path.join(root, 'content/data/deals-archive.json'), 'utf8'))
  assert.equal(deals.length, 0, 'unreverified offers are retired from the active catalog')
  assert.equal(archivedDeals.offers.length, 5, 'all five historical offers remain recoverable')
  assert.deepEqual(archivedDeals.offers.filter(deal => deal.firmSlug === 'bright-funded').map(deal => deal.code).sort(), ['SUMMER15', 'SUMMER25', 'SUMMER30'], 'old Bright codes remain archival, not current')
  const brightOfferObservation = require(path.join(root, 'content/data/russian-bright-offer-observation.json'))
  assert.equal(brightOfferObservation.firmSlug, 'bright-funded')
  assert.equal(brightOfferObservation.status, 'advertised-unverified')
  assert.equal(brightOfferObservation.checkoutVerified, false, 'homepage advertising alone is not checkout verification')
  assert.equal(new URL(brightOfferObservation.sourceUrl).hostname, 'brightfunded.com')
  assert(brightOfferObservation.sourceQuotes.some(quote => quote.includes(String(brightOfferObservation.advertisedDiscountPct))))
  assert(brightOfferObservation.sourceQuotes.some(quote => quote.includes(brightOfferObservation.code)))
  const latestDealCheck = archivedDeals.offers.map(deal => deal.verifiedOn).sort().at(-1)
  assert(latestDealCheck, 'historical offer expiry fixture has a verified date')
  const primaryBasePriceCount = () => getAllChallenges()
    .filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug) && isChallengeFresh(product))
    .reduce((count, product) => count + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0) || (tier.priceEur != null && tier.priceEur > 0)).length, 0)
  const originalClock = clock
  try {
    clock = new RealDate(Math.max(
      new RealDate(`${latestDealCheck}T12:00:00Z`).getTime() + 31 * 86_400_000,
      new RealDate(originalClock).getTime(),
    )).toISOString()
    const offersModule = require(path.join(root, 'app/ru/promokody-prop-firm/page.tsx'))
    const RussianOffers = offersModule.default
    const offersHtml = renderToStaticMarkup(React.createElement(RussianOffers))
    assert.equal(offersModule.metadata.title.absolute, 'Промокоды проп-фирм 2026: статус FundedNext и BrightFunded', 'promo search title uses the exact brand without promising a live code')
    assert.equal(offersModule.metadata.openGraph.title, 'Промокоды проп-фирм 2026: FundedNext и Bright', 'existing promo sharing title stays unchanged')
    assert(offersHtml.includes('Промокоды проп-фирм: FundedNext, BrightFunded и проверка скидок'), 'empty offer catalog uses the exact brand without promising real discounts')
    assert(offersHtml.includes(`<strong>${primaryBasePriceCount()}</strong><span>базовых цен FundedNext и Bright</span>`), 'base-price count stays useful without a verified code')
    assert(offersHtml.includes('data-russian-bright-deal-fallback="no-current-code"'), 'expired Bright codes leave a useful fallback')
    assert(offersHtml.includes('id="bright-offer-status"'), 'Bright offer status has a stable deep-link target without a verified code')
    assert(offersHtml.includes('href="/ru/obzor-bright-funded"'), 'the fallback reaches the Russian Bright review')
    assert(offersHtml.includes('href="/go/bright-funded?from=ru-deals-bright-no-current-code"'), 'the fallback reaches the shared partner redirect')
    assert(!offersHtml.includes('SUMMER30') && !offersHtml.includes('SUMMER25') && !offersHtml.includes('SUMMER15'), 'expired Bright codes are not advertised')
    const EnglishOffers = require(path.join(root, 'app/prop-firm-discount-codes/page.tsx')).default
    const englishOffersHtml = renderToStaticMarkup(React.createElement(EnglishOffers))
    assert(englishOffersHtml.includes('We have no FundedNext discount verified within the last 30 days'), 'expired English FAQ does not claim a current FundedNext coupon')
    assert(!englishOffersHtml.includes('data-fundednext-offer-steps="earned-coupon"'), 'expired English coupon instructions do not render')
    clock = `${brightOfferObservation.sourceCapturedAt}T12:00:00Z`
    const observedOfferHtml = renderToStaticMarkup(React.createElement(RussianOffers))
    assert(observedOfferHtml.includes(`<strong>${primaryBasePriceCount()}</strong><span>базовых цен FundedNext и Bright</span>`), 'fresh base prices remain visible while Bright offer is only advertised')
    assert(observedOfferHtml.includes('data-russian-bright-offer-observation="advertised-unverified"'), 'fresh first-party advertisement is visible but not treated as verified')
    assert(observedOfferHtml.includes('href="#bright-offer-status"') && observedOfferHtml.includes('id="bright-offer-status"'), 'Russian Bright-code search intent can reach the qualified observation')
    assert(observedOfferHtml.includes('data-russian-funnel-intent="bright_offer_status"'), 'Bright offer-status interest can be measured without code or profile data')
    assert(observedOfferHtml.includes(brightOfferObservation.code) && observedOfferHtml.includes(brightOfferObservation.sourceUrl))
    assert(observedOfferHtml.includes('data-russian-deal-count="0"'), 'advertised-only code is excluded from verified deal count')
    assert(!observedOfferHtml.includes('data-russian-deals-bright="current-product-codes"'), 'advertised-only code gets no verified price table')
    clock = new RealDate(new RealDate(`${brightOfferObservation.sourceCapturedAt}T12:00:00Z`).getTime() + 31 * 86_400_000).toISOString()
    const expiredObservationHtml = renderToStaticMarkup(React.createElement(RussianOffers))
    assert(expiredObservationHtml.includes(`<strong>${primaryBasePriceCount()}</strong><span>базовых цен FundedNext и Bright</span>`), 'base-price count expires with the source records')
    assert(!expiredObservationHtml.includes('data-russian-bright-offer-observation="advertised-unverified"'), 'day-31 advertisement needs a new source check')
    assert(!expiredObservationHtml.includes('href="#bright-offer-status"'), 'expired observation has no hero shortcut')
    assert(expiredObservationHtml.includes('id="bright-offer-status"'), 'expired observation leaves a valid status deep link')
    assert(!expiredObservationHtml.includes(brightOfferObservation.code), 'old advertised code is not promoted after its 30-day window')
  } finally { clock = originalClock }
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
  assert.equal(teamTradersEvidence.availabilityCheck.offerUrlStatus, '404', 'unavailable prop agreement is recorded separately from the older capture')
  assert.equal(teamTradersEvidence.availabilityCheck.legacyDocsUrlStatus, '404', 'unavailable archived documentation is recorded separately from the older capture')
  assert.equal(teamTradersEvidence.availabilityCheck.currentLegalUrl, 'https://teamtraders.ru/rules', 'current training offer has its own provenance')
  assert.equal(teamTradersEvidence.availabilityCheck.checkedAt, teamTradersEvidence.capturedAt, 'current legal-availability check matches the public-terms recheck')
  assert.equal(teamTradersEvidence.affiliateProgram.checkedAt, teamTradersEvidence.capturedAt, 'public partner-program check is scoped to the current pages')
  assert.equal(teamTradersEvidence.searchIntent.capturedAt, '2026-08-28', 'old search phrasing is not relabelled as current demand')
  const teamLiveSources = teamTradersEvidence.sources.filter(source => source.id === 'home' || source.id === 'faq')
  const teamArchivedSources = teamTradersEvidence.sources.filter(source => source.id === 'offer' || source.id === 'legacy-docs')
  assert.equal(teamLiveSources.length, 2)
  assert.equal(teamArchivedSources.length, 2)
  for (const source of teamLiveSources) {
    assert(source.capturedAt === teamTradersEvidence.capturedAt && source.recheckQuotes?.length >= 3, 'current TeamTraders terms have first-party recheck quotes')
  }
  for (const source of teamArchivedSources) assert.equal(source.capturedAt, '2026-08-28', '404 TeamTraders sources keep their older archived dates')
  const { DEFAULT_FINDER_FILTERS, filterChallengeRows, challengeKey, parseFinderState } = require(path.join(root, 'lib/challengeComparison.ts'))
  const marketEvidence = require(path.join(root, 'content/data/russian-market-evidence.json'))
  const brightEvidence = require(path.join(root, 'content/data/russian-bright-funded-evidence.json'))
  const brightFinderCountrySources = () => ({
    helpUrl: brightEvidence.sources.countries.sourceUrl,
    helpCapturedAt: brightEvidence.sources.countries.sourceCapturedAt,
    termsUrl: brightEvidence.sources.countryTerms.sourceUrl,
    termsCapturedAt: brightEvidence.sources.countryTerms.sourceCapturedAt,
    current: [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]
      .every(source => isChallengeFresh({ sourceCapturedAt: source.sourceCapturedAt })),
  })
  assert.equal(marketEvidence.localFirmSignals.find(item => item.operator === 'TeamTraders')?.sourceCapturedAt, teamTradersEvidence.capturedAt, 'TeamTraders directory signal uses the scoped public-terms recheck date')
  assert.equal(marketEvidence.affiliatePrograms.find(item => item.operator === 'TeamTraders')?.sourceCapturedAt, teamTradersEvidence.affiliateProgram.checkedAt, 'TeamTraders directory affiliate signal uses the scoped public-page check date')
  const fundedNextAccessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  assert.equal(marketEvidence.capturedAt, '2026-08-27', 'a scoped FundedNext check does not refresh the wider market snapshot')
  assert.equal(marketEvidence.snapshotStatus, 'historical', 'the broad market capture is explicitly historical rather than silently redated')
  assert(marketEvidence.localFirmSignals.every(item => item.sourceCapturedAt === '2026-10-01'), 'all six local-firm claims carry their own first-party recheck date')
  assert(marketEvidence.affiliatePrograms.every(item => item.sourceCapturedAt === '2026-10-01'), 'all six local partner statuses carry their own public-page check date')
  assert.equal(marketEvidence.affiliatePrograms.find(item => item.operator === 'Trade System')?.status, 'described-no-terms', 'Trade System mentor share is neither a missing program nor a verified publisher commission')
  assert.equal(fundedNextAccessEvidence?.status, 'conflicting', 'FundedNext is not marked accessible to Russian residents')
  assert.equal(fundedNextAccessEvidence?.sourceCapturedAt, '2026-10-01', 'FundedNext access uses its own first-party recheck date')
  assert.equal(new Set(fundedNextAccessEvidence.sourceObservations.map(item => item.sourceUrl)).size, 4, 'all four access sources have observations')
  assert(fundedNextAccessEvidence.sourceObservations.every(item => item.sourceCapturedAt === fundedNextAccessEvidence.sourceCapturedAt), 'FundedNext access observations share the scoped capture date')
  assert(fundedNextAccessEvidence.notes.some(item => item.includes('card-transfer restrictions')), 'Russian card country boundary is retained in access evidence')
  assert.equal(instantEvidence.capturedAt, '2026-08-29', 'a payout-only recheck does not refresh all Stellar Instant rules')
  assert.equal(instantEvidence.withdrawal.sourceCapturedAt, '2026-10-01', 'Stellar Instant payout routes have their own first-party recheck date')
  assert(instantEvidence.withdrawal.methods.includes('Card') && instantEvidence.withdrawal.sourceQuote.includes('saved card'), 'conditional card payout is captured for Stellar Instant')
  const fundedNextKycEvidence = marketEvidence.kycEvidence.find(item => item.firmSlug === 'fundednext')
  assert.equal(fundedNextKycEvidence?.sourceCapturedAt, '2026-10-01', 'FundedNext challenge KYC uses its first-party recheck date')
  assert(fundedNextKycEvidence.sourceObservations.every(item => item.sourceCapturedAt === fundedNextKycEvidence.sourceCapturedAt), 'FundedNext KYC observations match their scoped capture date')
  assert(fundedNextKycEvidence.scopeNote.includes('not Stellar Instant') && marketEvidence.capturedAt < fundedNextKycEvidence.sourceCapturedAt, 'challenge KYC recheck does not redate the wider market or Instant onboarding')
  const fundedNextPayoutEvidence = marketEvidence.payoutEvidence.find(item => item.firmSlug === 'fundednext')
  assert.equal(fundedNextPayoutEvidence?.sourceCapturedAt, '2026-10-01', 'FundedNext payout methods and standard schedule use their first-party recheck date')
  assert.equal(fundedNextPayoutEvidence?.methods.length, 7, 'conditional card payout is a distinct seventh published route')
  assert(fundedNextPayoutEvidence.methods.some(item => item.includes('Card') && item.includes('saved during payment')), 'card payouts retain the payment-stage saved-card condition')
  assert(fundedNextPayoutEvidence.countryBoundary.some(item => item.includes('Card Transfer') && item.includes('Russian Federation')), 'card payout country list is separate from the bank list')
  assert(fundedNextPayoutEvidence.sourceObservations.every(item => item.sourceCapturedAt === fundedNextPayoutEvidence.sourceCapturedAt), 'FundedNext payout observations match their scoped capture date')
  assert(fundedNextPayoutEvidence.processing.some(item => item.includes('standard') && item.includes('3-day') && item.includes('on-demand')), '21/14-day timing is scoped to the default checkout option')
  assert(fundedNextPayoutEvidence.scopeNote.includes('does not recheck Stellar Instant eligibility') && marketEvidence.capturedAt < fundedNextPayoutEvidence.sourceCapturedAt, 'payout recheck does not redate Instant or the wider market snapshot')
  const brightPayoutEvidence = marketEvidence.payoutEvidence.find(item => item.firmSlug === 'bright-funded')
  const brightKycEvidence = marketEvidence.kycEvidence.find(item => item.firmSlug === 'bright-funded')
  assert(brightPayoutEvidence?.processing.some(item => item.includes('14 days') && item.includes('add-on') && item.includes('unresolved')), 'Bright payout evidence retains the first-party cycle conflict')
  assert.equal(brightPayoutEvidence?.sourceCapturedAt, brightPayoutEvidence?.sourceObservations.map(item => item.sourceCapturedAt).sort()[0], 'Bright payout date is the oldest cited observation')
  assert.equal(brightKycEvidence?.sourceCapturedAt, brightKycEvidence?.sourceObservations.map(item => item.sourceCapturedAt).sort()[0], 'Bright KYC date is the oldest cited observation')
  const { RUSSIAN_ROUTE_EDITORIAL_DATES, russianRouteDateModified } = require(path.join(root, 'lib/localizedRoutes.ts'))
  const EvidenceNotice = require(path.join(root, 'components/RussianEvidenceFreshnessNotice.tsx')).default
  clock = '2026-09-29T12:00:00Z'
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
  const teamClock = clock
  try {
    clock = `${teamLiveSources[0].capturedAt}T12:00:00Z`
    const html = renderToStaticMarkup(React.createElement(TeamTradersPage))
    assert(html.includes('Просрочено или не подтверждено 2 из 5 пунктов'), 'current public terms do not freshen the archived agreement and documentation')
    assert(html.includes(`проверено ${teamLiveSources[0].capturedAt}`), 'the price source shows its scoped recheck date')
    assert(html.includes(`проверено ${teamLiveSources[1].capturedAt}`), 'the FAQ source shows its scoped recheck date')
    assert(!html.includes('"@type":"FAQPage"'), 'a partial recheck cannot restore current FAQ schema')
  } finally { clock = teamClock }
  const HomeFinder = require(path.join(root, 'components/RussianFinderEntry.tsx')).default
  const EnglishFinder = require(path.join(root, 'components/EnglishFinderEntry.tsx')).default
  const homeFixture = getRussianFinderRows()[0]
  const RuleFinder = require(path.join(root, 'components/RussianChallengeFinder.tsx')).default
  const singleSizeRow = { ...homeFixture, product: { ...homeFixture.product, tiers: [{ ...homeFixture.product.tiers[0], sizeUsd: 25000 }] } }
  const singleSizeHtml = renderToStaticMarkup(React.createElement(RuleFinder, { initialRows: [singleSizeRow], brightCountrySources: brightFinderCountrySources() }))
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
    const russian = plainRuleText(renderToStaticMarkup(React.createElement(RuleFinder, { initialRows: [{ ...homeFixture, product }], brightCountrySources: brightFinderCountrySources() })))
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
  assert(/href="\/ru\/luchshie-prop-firmy(?:#|\")/.test(emptyHome) && !emptyHome.includes('<select'), 'empty home preview retains a usable directory link')
  const emptyEnglish = renderToStaticMarkup(React.createElement(EnglishFinder, { rows: [] }))
  assert(emptyEnglish.includes('href="/prop-firm-challenges"') && !emptyEnglish.includes('<select'), 'English empty preview retains its comparison link')
  const ChangeFeed = require(path.join(root, 'components/ChallengeChangeFeed.tsx')).default
  const ruleEntries = require(path.join(root, 'content/data/challenge-watch.json')).filter(entry => entry.ruleEvidenceRefs)
  const changeHtml = renderToStaticMarkup(React.createElement(ChangeFeed, { entries: ruleEntries.map(entry => ({ ...entry, reviewUrl: '/ru/obzor-fundednext', indiaScreened: false, productKeys: entry.productSlugs.map(slug => `fundednext:${slug}`) })), surface: 'global', validProductKeys: [] }))
  assert.equal((changeHtml.match(/Rule sources checked separately; prices were not refreshed\./g) ?? []).length, ruleEntries.length, 'each rule-only card explains its capture scope')
  for (const [captures, needsCheck] of [
    [[], true], [['2026-09-08'], false], [['2026-08-15'], true], [['2026-08-14'], true],
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
    instantEvidence.withdrawal.sourceCapturedAt, fundedNextAccessEvidence.sourceCapturedAt, mt5Evidence.ea.sourceCapturedAt, mt5Evidence.instantEaScope.sourceCapturedAt]
  const mt5SourceDates = Object.values(mt5Evidence).filter(value => value && typeof value === 'object' && 'sourceCapturedAt' in value).map(value => value.sourceCapturedAt)
  const cTraderSourceDates = [cTraderEvidence.platformSource.sourceCapturedAt, ...cTraderEvidence.firms.map(firm => firm.sourceCapturedAt)]
  const cTraderFundedNext = cTraderEvidence.firms.find(firm => firm.firmSlug === 'fundednext')
  const CTraderPage = require(path.join(root, 'app/ru/prop-firmy-s-ctrader/page.tsx')).default
  // Keep the independent-price assertion aligned with the current product captures.
  clock = '2026-09-29T12:00:00Z'
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
  // Bright Funded is the current independent price fixture after its refresh;
  // FundedNext's older prices correctly fail the 30-day gate at this clock.
  const ForexPage = require(path.join(root, 'app/ru/forex-prop-firmy/page.tsx')).default
  const forexBright = forexEvidence.firms.find(firm => firm.firmSlug === 'bright-funded')
  const forexSourceDates = forexEvidence.firms.map(firm => firm.sourceCapturedAt)
  const leverageCell = (html, key) => html.match(new RegExp(`data-russian-forex-leverage-product="${key}">([^<]+)</td>`))?.[1]
  const originalForexDate = forexBright.sourceCapturedAt
  try {
    for (const unavailableDate of ['2026-08-08', 'invalid', '2030-01-01']) {
      forexBright.sourceCapturedAt = unavailableDate
      const html = renderToStaticMarkup(React.createElement(ForexPage))
      assert.equal(leverageCell(html, 'bright-funded:bright-funded-1-step'), 'Требует перепроверки', 'old, malformed or future leverage evidence cannot ride on fresh prices')
      assert(html.includes('data-russian-forex-product="bright-funded:bright-funded-1-step"'), 'independently fresh price rows remain')
      assert(!html.includes('"@type":"FAQPage"'), 'FAQ schema does not treat expired guide evidence as current')
    }
  } finally { forexBright.sourceCapturedAt = originalForexDate }
  // Keep later fixtures aligned with the current product captures.
  clock = '2026-09-29T12:00:00Z'
  const firmsModule = require(path.join(root, 'lib/firms.ts'))
  const cryptoEvidence = require(path.join(root, 'content/data/crypto-market-evidence.json'))
  const cryptoModule = require(path.join(root, 'app/ru/luchshie-kripto-prop-firmy/page.tsx'))
  const renderCrypto = () => renderToStaticMarkup(React.createElement(cryptoModule.default))
  const cryptoCards = html => [...html.matchAll(/data-russian-crypto-firm="([^"]+)"/g)].map(match => match[1]).sort()
  const cryptoSchemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  const cTraderReference = renderToStaticMarkup(React.createElement(CTraderPage))
  assert(cTraderReference.includes('<h1>Проп-фирмы с cTrader: FundedNext или BrightFunded</h1>'), 'cTrader H1 uses the exact brand')
  assert.equal(cryptoSchemas(cTraderReference).find(item => item['@type'] === 'ItemList')?.itemListElement?.[1]?.name, 'BrightFunded', 'cTrader ItemList uses the official brand')
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
  const fundingPipsAccessEvidence = require(path.join(root, 'content/data/russian-fundingpips-access-evidence.json'))
  assert.equal(fundingPipsAccessEvidence.firmSlug, 'fundingpips', 'the country check belongs to FundingPips')
  assert.equal(fundingPipsAccessEvidence.sourceUrl, 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started', 'Russian access check cites FundingPips itself')
  assert.match(fundingPipsAccessEvidence.residentRestrictionQuote, /resident in Iran, Vietnam, or the United Arab Emirates/, 'country check records the resident-only rule')
  const rankingClock = clock
  const rankingKyc = marketEvidence.kycEvidence.find(item => item.firmSlug === 'fundingpips')
  const rankingPayout = marketEvidence.payoutEvidence.find(item => item.firmSlug === 'fundingpips')
  assert(rankingKyc && rankingPayout, 'Russian ranking has scoped FundingPips KYC and payout evidence')
  const rankingOriginalDates = [marketEvidence.capturedAt, rankingKyc.sourceCapturedAt, rankingPayout.sourceCapturedAt]
  try {
    clock = '2026-10-01T12:00:00Z'
    const RussianRanking = require(path.join(root, 'app/ru/luchshie-prop-firmy/page.tsx')).default
    const rankingReference = renderToStaticMarkup(React.createElement(RussianRanking))
    assert(rankingReference.includes('data-russian-ranking-faq-status="recheck-required"'), 'ranking visibly qualifies old KYC and payout evidence')
    assert(!cryptoSchemas(rankingReference).some(item => item['@type'] === 'FAQPage'), 'stale partner evidence cannot publish current ranking FAQ schema')
    marketEvidence.capturedAt = '2026-10-01'
    rankingKyc.sourceCapturedAt = '2026-10-01'
    rankingPayout.sourceCapturedAt = '2026-10-01'
    const refreshedRanking = renderToStaticMarkup(React.createElement(RussianRanking))
    assert(refreshedRanking.includes('data-russian-ranking-faq-status="source-checked"'), 'FAQ status recovers when every required source is current')
    assert(cryptoSchemas(refreshedRanking).some(item => item['@type'] === 'FAQPage'), 'complete scoped source fixture restores ranking FAQ schema')
    assert(refreshedRanking.includes('data-russian-ranking-fundingpips-country-status="dated"'), 'ranking partner dates the separate FundingPips country check')
    assert(refreshedRanking.includes(`href="${fundingPipsAccessEvidence.sourceUrl}"`), 'ranking links the first-party country rule')
    const accessDate = fundingPipsAccessEvidence.sourceCapturedAt
    try {
      for (const invalidDate of ['2026-08-08', '2026-02-30', '2030-01-01']) {
        fundingPipsAccessEvidence.sourceCapturedAt = invalidDate
        const staleRanking = renderToStaticMarkup(React.createElement(RussianRanking))
        assert(staleRanking.includes('data-russian-ranking-fundingpips-country-status="recapture-required"'), 'old or invalid FundingPips access evidence ages its partner guidance')
        assert(staleRanking.includes('data-russian-ranking-faq-status="recheck-required"'), 'country evidence independently ages ranking FAQ')
        assert(!cryptoSchemas(staleRanking).some(item => item['@type'] === 'FAQPage'), 'stale country evidence cannot publish current FAQ structured data')
        assert(staleRanking.includes('текущую политику нужно проверить заново'), 'UAE card becomes historical when country evidence expires')
      }
    } finally { fundingPipsAccessEvidence.sourceCapturedAt = accessDate }
    const rankingTermsDate = brightEvidence.sources.countryTerms.sourceCapturedAt
    try {
      brightEvidence.sources.countryTerms.sourceCapturedAt = '2026-08-08'
      const oldTermsRanking = renderToStaticMarkup(React.createElement(RussianRanking))
      assert(oldTermsRanking.includes('data-russian-ranking-bright-country-status="recapture-required"'), 'old Bright Terms independently stale the ranking partner warning')
      assert(oldTermsRanking.includes('data-russian-finder-bright-country-status="recapture-required"') && oldTermsRanking.includes('Страновые источники требуют повторной проверки'), 'old Bright Terms independently stale the pre-click finder warning')
      assert(oldTermsRanking.includes('data-russian-ranking-faq-status="recheck-required"'), 'old Bright Terms independently stale ranking FAQ status')
      const oldTermsRussiaAnswer = oldTermsRanking.match(/<summary>Какая проп-фирма работает с резидентами России\?<\/summary><p>(.*?)<\/p>/)?.[1]
      assert(oldTermsRussiaAnswer?.includes('страновые источники BrightFunded требуют повторной проверки') && oldTermsRussiaAnswer.includes('не подтверждает доступ сегодня'), 'old Bright Terms make the visible ranking Russia FAQ historical')
      assert(oldTermsRanking.includes('Страновые источники BrightFunded требуют повторной проверки; старые списки не подтверждают доступ к покупке или выплате сегодня.'), 'old Bright Terms make the partner-card country guidance historical')
      assert(oldTermsRanking.includes('прежнее отсутствие России в списках не подтверждает доступ сегодня.'), 'old Bright Terms make the Russia profile card historical')
      assert(!cryptoSchemas(oldTermsRanking).some(item => item['@type'] === 'FAQPage'), 'old Bright Terms remove ranking FAQ structured data')
    } finally {
      brightEvidence.sources.countryTerms.sourceCapturedAt = rankingTermsDate
    }
    const rankingChallengeFixtures = structuredClone(getAllChallenges())
    const originalRankingChallenges = firmsModule.getAllChallenges
    try {
      firmsModule.getAllChallenges = () => rankingChallengeFixtures
      const stellar = rankingChallengeFixtures.find(product => product.firmSlug === 'fundednext' && product.productSlug === 'stellar-instant')
      const zero = rankingChallengeFixtures.find(product => product.firmSlug === 'fundingpips' && product.productSlug === 'zero')
      assert(stellar && zero, 'ranking has both named phase-0 partner fixtures')
      stellar.sourceCapturedAt = '2026-08-08'
      let rankingHtml = renderToStaticMarkup(React.createElement(RussianRanking))
      let instantCard = rankingHtml.match(/<article[^>]*data-russian-ranking-instant-card="[^"]+"[^>]*>[\s\S]*?<\/article>/)?.[0]
      let instantFaq = rankingHtml.match(/<summary>Есть ли проп-фирмы без челленджа\?<\/summary><p>(.*?)<\/p>/)?.[1]
      assert(instantCard?.includes('FundingPips Zero') && !instantCard.includes('Stellar Instant'), 'one expired partner product is removed from the ranking instant card')
      assert(instantFaq?.includes('FundingPips Zero') && !instantFaq.includes('Stellar Instant'), 'ranking FAQ uses current phase-0 examples')
      assert(!rankingHtml.includes('href="/ru/fundednext-stellar-instant"'), 'ranking short answer does not recommend an expired Stellar Instant product')
      zero.sourceCapturedAt = '2026-08-08'
      rankingHtml = renderToStaticMarkup(React.createElement(RussianRanking))
      instantCard = rankingHtml.match(/<article[^>]*data-russian-ranking-instant-card="[^"]+"[^>]*>[\s\S]*?<\/article>/)?.[0]
      assert(!instantCard?.includes('Stellar Instant') && !instantCard?.includes('FundingPips Zero'), 'both expired partner names disappear from the instant card')
      for (const product of rankingChallengeFixtures.filter(product => product.phases === 0)) product.sourceCapturedAt = '2026-08-08'
      rankingHtml = renderToStaticMarkup(React.createElement(RussianRanking))
      instantFaq = rankingHtml.match(/<summary>Есть ли проп-фирмы без челленджа\?<\/summary><p>(.*?)<\/p>/)?.[1]
      assert(rankingHtml.includes('data-russian-ranking-instant-status="recapture-required"') && rankingHtml.includes('data-russian-ranking-instant-card="recapture-required"'), 'zero fresh phase-0 products switch the ranking hero and card to recapture mode')
      assert(instantFaq?.includes('нет программ без челленджа со свежей проверкой'), 'ranking FAQ does not promise a current instant product after all phase-0 captures expire')
    } finally {
      firmsModule.getAllChallenges = originalRankingChallenges
    }
  } finally {
    [marketEvidence.capturedAt, rankingKyc.sourceCapturedAt, rankingPayout.sourceCapturedAt] = rankingOriginalDates
    clock = rankingClock
  }
  clock = `${Object.values(brightEvidence.sources).map(source => source.sourceCapturedAt).sort().at(-1)}T12:00:00Z`
  const BrightModule = require(path.join(root, 'app/ru/obzor-bright-funded/page.tsx'))
  const renderBright = () => renderToStaticMarkup(React.createElement(BrightModule.default))
  const brightReference = renderBright()
  assert.equal(brightEvidence.sources.countryTerms.sourceUrl, 'https://brightfunded.com/terms-and-conditions', 'the Bright country conflict cites the firm’s own Terms')
  assert(brightEvidence.sources.countryTerms.sourceQuote.includes('Cuba, Iran, North Korea, Syria, and Vietnam'), 'the five-country Terms observation remains separate from the six-country help list')
  assert(brightReference.includes('data-russian-bright-country-conflict="help-six-terms-five"'), 'Russian Bright review discloses the first-party country-list conflict beside access guidance')
  assert(brightReference.includes('data-russian-bright-country-access="published-list" data-russian-bright-country-source-status="dated"'), 'current Bright access section labels both country sources as dated')
  assert(brightReference.includes(`href="${brightEvidence.sources.countryTerms.sourceUrl}"`), 'the Russian conflict notice links directly to the Terms')
  const brightSummaryCountry = brightReference.match(/<div class="ru-notice" data-russian-bright-summary-cta="qualified-country-first">[\s\S]*?<\/div>/)?.[0]
  assert(brightSummaryCountry?.includes('data-russian-bright-summary-country-status="dated"'), 'current country evidence is visible before the first Bright affiliate action')
  assert(brightSummaryCountry.includes('5 условий: гражданство, страну проживания, фактическое местонахождение, способ оплаты и способ получения выплаты'), 'the pre-click checklist includes location as required by the Terms')
  for (const source of [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]) {
    assert(brightSummaryCountry.includes(`href="${source.sourceUrl}"`) && brightSummaryCountry.includes(source.sourceCapturedAt), 'the first Bright action is preceded by both dated first-party country sources')
  }
  assert(brightSummaryCountry.includes('условия допускают дополнительные ограничения') && brightReference.indexOf(brightSummaryCountry) < brightReference.indexOf('/go/bright-funded?from=ru-bright-funded-review-summary'), 'the first Bright affiliate click follows the qualified source conflict')
  const brightAccessQuestion = 'BrightFunded доступен русскоязычным трейдерам?'
  const brightAccessAnswer = brightReference.match(/<summary>BrightFunded доступен русскоязычным трейдерам\?<\/summary><p>(.*?)<\/p>/)?.[1]
  assert(brightAccessAnswer?.includes(brightEvidence.sources.countries.sourceCapturedAt)
    && brightAccessAnswer.includes(brightEvidence.sources.countryTerms.sourceCapturedAt)
    && brightAccessAnswer.includes('пять стран без Пакистана')
    && brightAccessAnswer.includes('не подтверждает доступ конкретного трейдера'), 'search-facing Bright access FAQ dates both disagreeing country sources and does not imply permission')
  assert.equal(BrightModule.metadata.title.absolute, 'BrightFunded: обзор 2026, цены, правила и выплаты', 'Bright search title uses the first-party one-word brand')
  assert(brightReference.includes('<h1>BrightFunded: обзор 2026, цены, правила и выплаты</h1>'), 'Bright visible H1 matches the exact brand title')
  assert.equal(BrightModule.metadata.openGraph.title, 'Bright Funded: обзор 2026, цены, правила и выплаты', 'previous social-sharing title remains unchanged')
  assert.equal(BrightModule.metadata.twitter.title, BrightModule.metadata.openGraph.title, 'Twitter sharing title remains aligned with preserved Open Graph copy')
  assert(brightReference.includes('data-russian-bright-price-count="18"'))
  assert(cryptoSchemas(brightReference).some(item => item['@type'] === 'FAQPage'), 'complete current Bright source fixture provides FAQ schema')
  const brightAccessSchemaAnswer = cryptoSchemas(brightReference).find(item => item['@type'] === 'FAQPage').mainEntity
    .find(item => item.name === brightAccessQuestion)?.acceptedAnswer?.text
  assert.equal(brightAccessSchemaAnswer, brightAccessAnswer, 'Bright FAQ structured data repeats the visible country-conflict answer')
  const brightTrustpilotFaq = cryptoSchemas(brightReference).find(item => item['@type'] === 'FAQPage').mainEntity.some(item => item.name === 'Почему у Bright Funded нет средней оценки Trustpilot?')
  assert.equal(brightTrustpilotFaq, isChallengeFresh({ sourceCapturedAt: brightFirm.trustpilotCapturedAt }), 'Trustpilot FAQ schema follows its own captured date, independently of the country Terms recheck')
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
        if ([brightEvidence.sources.countries, brightEvidence.sources.countryTerms].includes(source)) {
          const summaryCountry = html.match(/<div class="ru-notice" data-russian-bright-summary-cta="qualified-country-first">[\s\S]*?<\/div>/)?.[0]
          assert(summaryCountry?.includes('data-russian-bright-summary-country-status="recapture-required"') && summaryCountry.includes('требуют повторной проверки'), 'an expired or invalid country source makes the pre-click warning historical')
          assert(!summaryCountry.includes('Россия не названа в обоих списках'), 'expired country sources cannot imply a current unrestricted profile')
          const accessSection = html.slice(html.indexOf('<h2 id="access">'), html.indexOf('<h2 id="plans">'))
          assert(accessSection.includes('data-russian-bright-country-access="historical-list" data-russian-bright-country-source-status="recapture-required"'), 'invalid Bright country evidence switches the lower access section to a historical state')
          assert(accessSection.includes('Прежний список не подтверждает доступ из России сегодня.') && !accessSection.includes('Россия не названа в опубликованном списке'), 'expired Bright country evidence cannot leave a current-list headline below the first CTA')
          assert(accessSection.includes('В датированном снимке два официальных списка расходились.') && !accessSection.includes('Россия не названа ни там, ни там'), 'expired Bright country conflict is phrased as historical')
          const staleAccessAnswer = html.match(/<summary>BrightFunded доступен русскоязычным трейдерам\?<\/summary><p>(.*?)<\/p>/)?.[1]
          const staleRussiaAnswer = html.match(/<summary>Можно ли зарегистрироваться, проживая в России\?<\/summary><p>(.*?)<\/p>/)?.[1]
          assert(staleAccessAnswer?.includes('требуют повторной проверки') && staleAccessAnswer.includes('не подтверждает доступ сегодня'), 'visible Bright access FAQ switches to historical guidance when either country source expires')
          assert(staleRussiaAnswer?.includes('Доступ для проживающего в России не подтверждён') && staleRussiaAnswer.includes('не является разрешением сегодня'), 'visible Russia FAQ does not retain current-list language after source expiry')
        }
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
  clock = '2026-10-01T12:00:00Z'
  const primaryModule = require(path.join(root, 'app/ru/fundednext-vs-bright-funded/page.tsx'))
  const renderPrimary = () => renderToStaticMarkup(React.createElement(primaryModule.default))
  const primaryReference = renderPrimary()
  assert.equal(primaryModule.metadata.title.absolute, 'FundedNext или BrightFunded: сравнение 2026', 'Russian comparison search title matches the official one-word BrightFunded brand')
  assert(primaryModule.metadata.description.startsWith('FundedNext или BrightFunded:'), 'Russian comparison search description matches the incoming exact-brand links')
  assert(primaryReference.includes('<h1>FundedNext или BrightFunded: что выбрать в 2026 году</h1>'), 'Russian comparison H1 matches the exact-brand search title')
  assert.equal(primaryModule.metadata.openGraph.title, 'FundedNext или Bright Funded: сравнение 2026', 'existing comparison sharing title remains unchanged')
  assert.equal(primaryModule.metadata.twitter.title, primaryModule.metadata.openGraph.title, 'comparison Twitter title remains aligned with preserved sharing copy')
  assert.equal(cryptoSchemas(primaryReference).find(item => item['@type'] === 'Article')?.headline, primaryModule.metadata.title.absolute, 'comparison Article headline follows the search title')
  assert.equal(cryptoSchemas(primaryReference).find(item => item['@type'] === 'ItemList')?.itemListElement?.[1]?.item?.name, 'BrightFunded', 'comparison ItemList uses the official brand')
  const fundedPayoutSource = require(path.join(root, 'lib/fundedNextPayout.ts')).fundedNextPayoutSource
  const primaryExpectedModified = [
    RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/fundednext-vs-bright-funded'],
    ...getAllChallenges().filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug)).map(product => product.sourceCapturedAt),
    fundedNextAccessEvidence.sourceCapturedAt,
    fundedPayoutSource.sourceCapturedAt,
    ...[brightEvidence.sources.rules, brightEvidence.sources.reward, brightEvidence.sources.platforms, brightEvidence.sources.countries, brightEvidence.sources.countryTerms].map(source => source.sourceCapturedAt),
    ...marketEvidence.payoutEvidence.filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug)).map(source => source.sourceCapturedAt),
    ...marketEvidence.kycEvidence.filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug)).map(source => source.sourceCapturedAt),
  ].sort().at(-1)
  assert.equal(cryptoSchemas(primaryReference).find(item => item['@type'] === 'Article')?.dateModified, primaryExpectedModified, 'Bright comparison Article reflects the newest scoped rule or product update')
  assert(primaryReference.includes(`href="${fundedPayoutSource.sourceUrl}"`) && primaryReference.includes(fundedPayoutSource.sourceCapturedAt), 'comparison exposes its Stellar 1-Step payout source and separate date')
  assert(primaryReference.includes(`href="${brightEvidence.sources.countries.sourceUrl}"`) && primaryReference.includes(brightEvidence.sources.countries.sourceCapturedAt), 'comparison cites Bright Funded country restrictions separately')
  assert(primaryReference.includes('data-russian-primary-comparison-country-conflict="help-six-terms-five"'), 'comparison discloses the Bright country-list disagreement before its KYC table')
  assert(primaryReference.includes('data-russian-primary-comparison-country-status="dated"'), 'current Bright country sources keep the comparison warning dated')
  assert(primaryReference.indexOf('data-russian-primary-comparison-country-conflict="help-six-terms-five"') < primaryReference.indexOf('href="/go/bright-funded?from=ru-fn-vs-bright-bright-funded"'), 'Bright country-list conflict precedes the first comparison affiliate action')
  assert(primaryReference.includes(`href="${brightEvidence.sources.countryTerms.sourceUrl}"`) && primaryReference.includes(brightEvidence.sources.countryTerms.sourceCapturedAt), 'comparison links the dated Terms as a separate first-party source')
  const primaryRussiaAnswer = primaryReference.match(/<summary>Можно ли зарегистрироваться резиденту России\?<\/summary><p>(.*?)<\/p>/)?.[1]
  assert(primaryRussiaAnswer?.includes(brightEvidence.sources.countries.sourceCapturedAt) && primaryRussiaAnswer.includes(brightEvidence.sources.countryTerms.sourceCapturedAt), 'comparison Russia FAQ dates both Bright country sources while current')
  for (const source of [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]) {
    const originalDate = source.sourceCapturedAt
    try {
      source.sourceCapturedAt = '2026-08-08'
      const html = renderPrimary()
      const notice = html.match(/<div class="ru-notice" data-russian-primary-comparison-country-conflict="help-six-terms-five" data-russian-primary-comparison-country-status="recapture-required">([\s\S]*?)<\/div>/)?.[1]
      const answer = html.match(/<summary>Можно ли зарегистрироваться резиденту России\?<\/summary><p>(.*?)<\/p>/)?.[1]
      assert(notice?.includes('В датированном снимке') && notice.includes('не подтверждает доступ сегодня') && !notice.includes('Россия не названа ни в одном из этих списков'), 'one expired Bright source makes the comparison country notice historical')
      assert(answer?.includes('требуют повторной проверки') && answer.includes('не является разрешением сегодня'), 'one expired Bright source makes the visible comparison FAQ historical')
      assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'expired country evidence removes the comparison FAQ schema')
    } finally { source.sourceCapturedAt = originalDate }
  }
  assert(primaryReference.includes(fundedNextAccessEvidence.sourceCapturedAt), 'comparison shows the scoped FundedNext access date')
  const primaryVisible = primaryReference.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
  assert(primaryReference.includes('data-russian-primary-comparison-products="7"') && primaryReference.includes('data-russian-primary-comparison-prices="40"'))
  assert(cryptoSchemas(primaryReference).some(item => item['@type'] === 'FAQPage'), 'current scoped evidence supports the comparison FAQ despite the older broad market snapshot')
  assert(cryptoSchemas(primaryReference).find(item => item['@type'] === 'FAQPage')?.mainEntity?.some(item => item.name === 'Что лучше: FundedNext или BrightFunded?'), 'comparison FAQ question uses the search-facing brand spelling')
  assert(!primaryReference.includes('data-russian-primary-comparison-evidence="recapture-required"'), 'an unrelated older market snapshot does not stale the scoped comparison')
  assert.doesNotMatch(primaryModule.metadata.description, /7 продукт|40 цен|true cost/)
  assert.equal(primaryModule.metadata.openGraph.description, 'Сравнение FundedNext и Bright Funded по 7 продуктам и 40 ценам: USD или EUR, этапы, просадка, true cost, выплаты, KYC и выбор для трейдера.', 'existing sharing description is preserved pending explicit approval')
  assert.doesNotMatch(primaryVisible, /\b(?:evaluation|checkout|risk buckets?|true cost|cash.flow|gateway|payout window|TradeLocker|highest equity|eligibility|suppressed)\b/i, 'comparison uses reader-facing Russian and does not revive the incorrect TradeLocker contrast')
  assert(primaryVisible.includes('MT5, DXTrade и cTrader') && primaryVisible.includes('противоречие остаётся неразрешённым'))
  for (const match of primaryReference.matchAll(/<td data-russian-payout-product="bright-funded:[^"]+">([\s\S]*?)<\/td>/g)) assert(match[1].includes('базовый следующий цикл требует уточнения'), 'Bright payout ambiguity is visible in each summary row, not only later prose')
  assert.equal((primaryReference.match(/tabindex="0" role="region" aria-label=/g) ?? []).length, 5, 'every wide comparison table is a named keyboard-scroll region')
  for (const id of ['comparison-products', 'comparison-one-step', 'comparison-two-step', 'comparison-instant', 'comparison-cost', 'comparison-payout', 'comparison-profile', 'sources']) {
    assert(primaryReference.includes(`href="#${id}"`) && primaryReference.includes(`id="${id}"`), `comparison contents points to actual section ${id}`)
  }
  const primaryRuleSources = [brightEvidence.sources.rules, brightEvidence.sources.reward, brightEvidence.sources.platforms, brightEvidence.sources.countries, brightEvidence.sources.countryTerms, fundedNextAccessEvidence,
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
  const originalAccessStatus = fundedNextAccessEvidence.status
  try {
    fundedNextAccessEvidence.status = 'restricted'
    assert(!cryptoSchemas(renderPrimary()).some(item => item['@type'] === 'FAQPage'), 'changed FundedNext access status cannot keep the conflict-specific comparison FAQ')
  } finally { fundedNextAccessEvidence.status = originalAccessStatus }
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
      const finderHtml = renderToStaticMarkup(React.createElement(RuleFinder, { initialRows: [row], brightCountrySources: brightFinderCountrySources() }))
      assert(finderHtml.includes(capturedAt === payoutSourceDate ? '5 раб. дн.' : 'требует проверки'), 'actual finder uses the same scoped payout evidence as articles')
      assert(finderHtml.includes(payoutSource.sourceUrl))
    }
  } finally { payoutSource.sourceCapturedAt = payoutSourceDate }
  const RussianPayoutPage = payoutPages.find(([slug]) => slug === 'vyplaty-prop-firm')?.[1]
  assert(RussianPayoutPage, 'Russian payout guide remains part of the expiry fixture')
  const payoutGuideMetadata = require(path.join(root, 'app/ru/vyplaty-prop-firm/page.tsx')).metadata
  const payoutGuideReference = renderToStaticMarkup(React.createElement(RussianPayoutPage))
  assert.equal(payoutGuideMetadata.title.absolute, 'Выплаты проп-фирм 2026: FundedNext и BrightFunded', 'payout search title uses the verified one-word brand')
  assert(payoutGuideMetadata.description.includes('FundedNext, BrightFunded и FundingPips'), 'payout search description matches the brand query')
  assert.equal(payoutGuideMetadata.openGraph.title, 'Выплаты проп-фирм 2026: FundedNext и Bright Funded', 'payout sharing title remains unchanged')
  assert(payoutGuideReference.includes('<h1>Выплаты проп-фирм: FundedNext, BrightFunded и вывод прибыли</h1>'), 'payout H1 matches the brand query')
  assert.equal(cryptoSchemas(payoutGuideReference).find(item => item['@type'] === 'Article')?.headline, payoutGuideMetadata.title.absolute, 'payout Article headline matches the search title')
  assert(cryptoSchemas(payoutGuideReference).find(item => item['@type'] === 'ItemList')?.itemListElement?.some(item => item.item.name === 'BrightFunded'), 'payout ItemList uses the official brand')
  assert(payoutGuideReference.includes('Russian Federation') || payoutGuideReference.includes('Российской Федерации'), 'payout guide names the distinct Russian card boundary')
  const payoutArticle = cryptoSchemas(payoutGuideReference).find(item => item['@type'] === 'Article')
  const latestPayoutEvidenceDate = marketEvidence.payoutEvidence.map(item => item.sourceCapturedAt).sort().at(-1)
  const latestPayoutProductDate = getAllChallenges().filter(product => ['fundednext', 'bright-funded', 'fundingpips'].includes(product.firmSlug) && isChallengeFresh(product))
    .map(product => product.sourceCapturedAt).sort().at(-1)
  assert.equal(payoutArticle?.dateModified, [RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/vyplaty-prop-firm'], latestPayoutEvidenceDate, latestPayoutProductDate].filter(Boolean).sort().at(-1), 'payout Article date includes the newest scoped source just like the sitemap')
  assert(!payoutGuideReference.includes('80% против 85%'), 'Russian payout guide does not retain the retired FundingPips split comparison')
  assert(payoutGuideReference.includes('карта (сохранена при оплате)') && payoutGuideReference.includes('Методов: 7'), 'Russian payout guide renders the conditional seventh FundedNext route')
  assert(payoutGuideReference.includes('стандартный вариант; другие опции') && !payoutGuideReference.includes('из 6 опубликованных маршрутов'), 'Russian payout timing and method count do not flatten checkout options or retain the old list')
  assert(payoutGuideReference.includes('data-russian-guide-source-status="recapture-required"'), 'old payout research is visibly dated even when product captures are fresh')
  assert(!cryptoSchemas(payoutGuideReference).some(item => item['@type'] === 'FAQPage'), 'old payout research cannot publish current FAQ schema')
  for (const match of payoutGuideReference.matchAll(/<td data-russian-payout-product="bright-funded:[^"]+">([\s\S]*?)<\/td>/g)) {
    assert(match[1].includes('14 дней также указаны как платное дополнение'), 'each Bright payout row discloses the unresolved 14-day add-on conflict')
  }
  const kycGuideModule = require(path.join(root, 'app/ru/prop-firmy-bez-kyc/page.tsx'))
  const kycGuideReference = renderToStaticMarkup(React.createElement(kycGuideModule.default))
  assert.equal(kycGuideModule.metadata.title.absolute, 'KYC в проп-фирмах 2026: FundedNext и BrightFunded', 'KYC search title uses the verified one-word brand')
  assert(kycGuideModule.metadata.description.includes('FundedNext, BrightFunded и FundingPips'), 'KYC search description matches the brand query')
  assert.equal(kycGuideModule.metadata.openGraph.title, 'KYC в проп-фирмах 2026: FundedNext и Bright Funded', 'KYC sharing title remains unchanged')
  assert(kycGuideReference.includes('<h1>KYC в проп-фирмах: FundedNext, BrightFunded и проверка документов</h1>'), 'KYC H1 matches the brand query')
  assert.equal(cryptoSchemas(kycGuideReference).find(item => item['@type'] === 'Article')?.headline, kycGuideModule.metadata.title.absolute, 'KYC Article headline matches the search title')
  const kycList = cryptoSchemas(kycGuideReference).find(item => item['@type'] === 'ItemList')
  for (const [name, reviewPath] of [['FundedNext', '/ru/obzor-fundednext'], ['BrightFunded', '/ru/obzor-bright-funded']]) {
    assert(kycList?.itemListElement?.some(entry => entry.item.name === name && entry.item.url === `https://tradersfundhub.com${reviewPath}`), `KYC ItemList routes ${name} to the visible Russian review`)
    assert(kycGuideReference.includes(`href="${reviewPath}"`), `KYC guide visibly links to ${name}'s Russian review`)
  }
  const RussianReviewsPage = payoutPages.find(([slug]) => slug === 'otzyvy-prop-firm')?.[1]
  assert(RussianReviewsPage, 'Russian reviews guide remains part of the expiry fixture')
  const reviewsGuideReference = renderToStaticMarkup(React.createElement(RussianReviewsPage))
  assert(!cryptoSchemas(reviewsGuideReference).some(item => item['@type'] === 'FAQPage'), 'old market research cannot publish current reviews FAQ schema')
  const reviewsList = cryptoSchemas(reviewsGuideReference).find(item => item['@type'] === 'ItemList')
  for (const [name, reviewPath] of [['FundedNext', '/ru/obzor-fundednext'], ['BrightFunded', '/ru/obzor-bright-funded']]) {
    assert(reviewsList?.itemListElement?.some(entry => entry.item.name === name && entry.item.url === `https://tradersfundhub.com${reviewPath}`), `reviews ItemList routes ${name} to the visible Russian review`)
    assert(reviewsGuideReference.includes(`href="${reviewPath}"`), `reviews guide visibly links to ${name}'s Russian review`)
  }
  for (const match of reviewsGuideReference.matchAll(/<td data-russian-payout-product="bright-funded:[^"]+">([\s\S]*?)<\/td>/g)) {
    assert(match[1].includes('14 дней также указаны как платное дополнение'), 'each Bright reviews row discloses the unresolved 14-day add-on conflict')
  }
  const originalMarketDate = marketEvidence.capturedAt
  const originalPayoutDates = marketEvidence.payoutEvidence.map(item => item.sourceCapturedAt)
  try {
    marketEvidence.capturedAt = clock.slice(0, 10)
    for (const item of marketEvidence.payoutEvidence) item.sourceCapturedAt = clock.slice(0, 10)
    const freshPayoutGuide = renderToStaticMarkup(React.createElement(RussianPayoutPage))
    assert(cryptoSchemas(freshPayoutGuide).some(item => item['@type'] === 'FAQPage'), 'complete current payout research restores FAQ schema')
    const brightPayout = marketEvidence.payoutEvidence.find(item => item.firmSlug === 'bright-funded')
    brightPayout.sourceCapturedAt = '2026-08-08'
    const staleBrightPayoutGuide = renderToStaticMarkup(React.createElement(RussianPayoutPage))
    assert(!cryptoSchemas(staleBrightPayoutGuide).some(item => item['@type'] === 'FAQPage'), 'stale Bright payout evidence independently withdraws current FAQ schema')
    brightPayout.sourceCapturedAt = clock.slice(0, 10)
    const freshReviewsGuide = renderToStaticMarkup(React.createElement(RussianReviewsPage))
    assert(cryptoSchemas(freshReviewsGuide).some(item => item['@type'] === 'FAQPage'), 'complete current market research restores reviews FAQ schema')
  } finally {
    marketEvidence.capturedAt = originalMarketDate
    marketEvidence.payoutEvidence.forEach((item, index) => { item.sourceCapturedAt = originalPayoutDates[index] })
  }
  const FundedReviewModule = require(path.join(root, 'app/ru/obzor-fundednext/page.tsx'))
  const renderFundedReview = () => renderToStaticMarkup(React.createElement(FundedReviewModule.default))
  const fundedReviewRow = (html, slug) => html.match(new RegExp(`<tr\\b[^>]*data-russian-fundednext-product="${slug}"[^>]*>[\\s\\S]*?<\\/tr>`))?.[0]
  const fundedReference = renderFundedReview()
  assert(fundedReference.includes(fundedNextAccessEvidence.sourceCapturedAt), 'FundedNext review shows the scoped access recheck date')
  assert(fundedReference.includes('выплата на карту'), 'FundedNext review discloses the card payout boundary')
  assert(fundedReference.includes('data-fundednext-russian-products="4"'))
  assert(fundedReviewRow(fundedReference, 'stellar-instant').includes('Нет дневного лимита'), 'a named fresh Instant source supports the explicit absence')
  assert(fundedReviewRow(fundedReference, 'stellar-1-step').includes('5 раб. дн.'), 'one-step timing retains the source business-day unit')
  assert(!fundedReviewRow(fundedReference, 'stellar-1-step').includes('еженедельно'), 'five business days are not flattened to a calendar-week label')
  assert(!cryptoSchemas(fundedReference).some(item => item['@type'] === 'FAQPage'), 'stale market-access evidence withholds the FundedNext review FAQ schema')
  assert.doesNotMatch(FundedReviewModule.metadata.description, /22 цены|4 модели/)
  assert.equal(FundedReviewModule.metadata.openGraph.description, 'Отзывы о FundedNext и обзор на русском: 4 модели Stellar, 22 цены, просадка, выплаты, Free Trial и проверка ограничений по стране.', 'sharing copy is preserved pending approval')
  const FundingPipsReviewModule = require(path.join(root, 'app/ru/obzor-fundingpips/page.tsx'))
  const fundingPipsReviewReference = renderToStaticMarkup(React.createElement(FundingPipsReviewModule.default))
  assert(fundingPipsReviewReference.includes('<h1>FundingPips: обзор 2026 — цены, правила и выплаты</h1>'), 'FundingPips review H1 does not promise a fixed product or price count')
  const fundingPipsSummaryAffiliate = 'href="/go/fundingpips?from=ru-fundingpips-review-summary"'
  const fundingPipsCountryAnchor = 'id="country-check" data-russian-partner-country-access="unconfirmed"'
  assert(fundingPipsReviewReference.indexOf(fundingPipsCountryAnchor) >= 0
    && fundingPipsReviewReference.indexOf(fundingPipsCountryAnchor) < fundingPipsReviewReference.indexOf(fundingPipsSummaryAffiliate),
  'the sourced country warning appears before the first FundingPips affiliate action')
  assert.equal((fundingPipsReviewReference.match(/id="country-check"/g) ?? []).length, 1, 'moving the warning preserves one country-check anchor')
  assert(fundingPipsReviewReference.slice(0, fundingPipsReviewReference.indexOf(fundingPipsSummaryAffiliate)).includes(`href="${fundingPipsAccessEvidence.sourceUrl}"`), 'the first affiliate action follows a direct first-party country source')
  assert(!cryptoSchemas(fundingPipsReviewReference).some(item => item['@type'] === 'FAQPage'), 'stale FundingPips payout evidence withholds review FAQ schema')
  assert(fundingPipsReviewReference.includes('Часть источников этих ответов старше 30 дней.'), 'dated FAQ answers remain visibly qualified')
  const fundingPipsPayoutEvidence = marketEvidence.payoutEvidence.find(item => item.firmSlug === 'fundingpips')
  assert(fundingPipsPayoutEvidence, 'FundingPips FAQ cites its own payout evidence rather than the broad market snapshot')
  const originalFundingPipsPayoutCapture = fundingPipsPayoutEvidence.sourceCapturedAt
  const originalFundingPipsAccessCapture = fundingPipsAccessEvidence.sourceCapturedAt
  const fundingPipsReviewClock = clock
  try {
    clock = '2026-10-01T12:00:00Z'
    fundingPipsPayoutEvidence.sourceCapturedAt = '2026-09-30'
    const freshFundingPipsReview = renderToStaticMarkup(React.createElement(FundingPipsReviewModule.default))
    assert(cryptoSchemas(freshFundingPipsReview).some(item => item['@type'] === 'FAQPage'), 'FAQ schema returns only when product and supporting research dates are current')
    assert(freshFundingPipsReview.includes('data-russian-fundingpips-country-source-status="dated"'), 'review shows the independently dated country source')
    for (const invalidDate of ['2026-08-08', '2026-02-30', '2030-01-01']) {
      fundingPipsAccessEvidence.sourceCapturedAt = invalidDate
      const staleReview = renderToStaticMarkup(React.createElement(FundingPipsReviewModule.default))
      assert(staleReview.includes('data-russian-fundingpips-country-source-status="recapture-required"'), 'country warning becomes historical when its own evidence is old or invalid')
      assert(staleReview.indexOf('data-russian-fundingpips-country-source-status="recapture-required"') < staleReview.indexOf(fundingPipsSummaryAffiliate), 'the historical warning still precedes the first affiliate action')
      assert(!cryptoSchemas(staleReview).some(item => item['@type'] === 'FAQPage'), 'old country source independently withholds review FAQ schema')
      assert(staleReview.includes('старый список не подтверждает доступ сегодня') && staleReview.includes('страновой источник требует повторной проверки'), 'country warning and visible answer do not imply current access')
      assert(!staleReview.includes('<h3>Не подходит резиденту ОАЭ</h3>'), 'expired country evidence cannot retain a current fit verdict')
    }
  } finally {
    fundingPipsPayoutEvidence.sourceCapturedAt = originalFundingPipsPayoutCapture
    fundingPipsAccessEvidence.sourceCapturedAt = originalFundingPipsAccessCapture
    clock = fundingPipsReviewClock
  }
  assert(fundingPipsReviewReference.includes('80%') && fundingPipsReviewReference.includes('10% и 8%'), 'Russian FundingPips review reflects the current Flex split and target')
  assert(fundingPipsReviewReference.includes('2026-09-30') && fundingPipsReviewReference.includes('Tradin'), 'Russian FundingPips review reflects the current reward-method source')
  assert(!fundingPipsReviewReference.includes('85%') && !fundingPipsReviewReference.includes('10% и 6%'), 'Russian FundingPips review does not retain retired Flex terms')
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
  const forexProductFixtures = structuredClone(originalGetChallenges())
  const forexClock = clock
  try {
    clock = '2026-10-01T12:00:00Z'
    firmsModule.getAllChallenges = () => forexProductFixtures
    assert(cryptoSchemas(renderToStaticMarkup(React.createElement(ForexPage))).some(item => item['@type'] === 'FAQPage'), 'fully current scoped forex sources support the FAQ')
    const oneForexProduct = forexProductFixtures.find(product => product.firmSlug === 'bright-funded' && product.assetClass === 'cfd')
    oneForexProduct.sourceCapturedAt = '2030-01-01'
    assert(!cryptoSchemas(renderToStaticMarkup(React.createElement(ForexPage))).some(item => item['@type'] === 'FAQPage'), 'one future-dated product blocks a current forex FAQ even when other product captures are fresh')
  } finally {
    firmsModule.getAllChallenges = originalGetChallenges
    clock = forexClock
  }
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
    for (const product of secondaryProducts) product.sourceCapturedAt = product === twoStepFixture ? '2026-09-01' : '2026-09-08'
    secondaryHtml = renderSecondary()
    assert(secondaryHtml.includes('<strong>2026-09-01</strong>'), 'Oldest record, not newest, labels the source range')
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
  const forexTermsDate = brightEvidence.sources.countryTerms.sourceCapturedAt
  const forexFixtureClock = clock
  try {
    clock = '2026-10-01T12:00:00Z'
    brightEvidence.sources.countryTerms.sourceCapturedAt = '2026-08-08'
    const oldTermsHtml = renderToStaticMarkup(React.createElement(ForexPage))
    assert(oldTermsHtml.includes('data-russian-guide-source-status="recapture-required"'), 'old Bright Terms independently trigger a forex source notice')
    assert(!cryptoSchemas(oldTermsHtml).some(item => item['@type'] === 'FAQPage'), 'old Bright Terms remove current forex FAQ structured data')
    assert.equal((oldTermsHtml.match(/data-russian-forex-product=/g) ?? []).length, 7, 'a Terms-only expiry does not erase fresh product price rows')
  } finally {
    brightEvidence.sources.countryTerms.sourceCapturedAt = forexTermsDate
    clock = forexFixtureClock
  }
  const homeTermsDate = brightEvidence.sources.countryTerms.sourceCapturedAt
  const homeFixtureClock = clock
  try {
    clock = '2026-10-01T12:00:00Z'
    const RussianHome = require(path.join(root, 'app/ru/page.tsx')).default
    const currentHome = renderToStaticMarkup(React.createElement(RussianHome))
    assert(currentHome.includes('data-russian-home-bright-country-conflict="help-six-terms-five"'), 'homepage partner warning shows the Bright first-party conflict')
    assert(currentHome.includes('data-russian-partner-country-warning="bright-funded" data-russian-partner-country-source-status="dated"'), 'both current country sources keep the homepage warning dated')
    brightEvidence.sources.countryTerms.sourceCapturedAt = '2026-08-08'
    const oldTermsHome = renderToStaticMarkup(React.createElement(RussianHome))
    assert(oldTermsHome.includes('data-russian-partner-country-warning="bright-funded" data-russian-partner-country-source-status="recapture-required"'), 'old Bright Terms independently stale the homepage warning')
    assert(oldTermsHome.includes('не подтверждает доступ сегодня'), 'old Bright Terms cannot imply current access on the homepage')
    assert(oldTermsHome.includes('/go/bright-funded?from=ru-home-hero-bright-funded'), 'country expiry preserves the existing Bright affiliate route')
  } finally {
    brightEvidence.sources.countryTerms.sourceCapturedAt = homeTermsDate
    clock = homeFixtureClock
  }
  const { russianDiasporaEvidence } = require(path.join(root, 'lib/russianDiasporaEvidence.ts'))
  const RussianDiasporaPage = require(path.join(root, 'app/ru/dlya-russkoyazychnykh-treyderov/page.tsx')).default
  const diasporaClock = clock
  const diasporaCaptureDate = russianDiasporaEvidence.capturedAt
  try {
    for (const [day, current] of [[30, true], [31, false]]) {
      clock = `${offset(diasporaCaptureDate, day)}T12:00:00Z`
      const html = renderToStaticMarkup(React.createElement(RussianDiasporaPage))
      assert(html.includes(`data-russian-diaspora-country-source-status="${current ? 'dated' : 'recapture-required'}"`), 'country matrix switches exactly at its own day-30 boundary')
      assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), current, 'dated country answers do not remain current FAQ structured data after day 30')
      if (!current) assert(html.includes(`На ${diasporaCaptureDate}: не названа в общем списке`) && html.includes('не описывает текущий доступ'), 'expired matrix labels and explanation become historical')
    }
    russianDiasporaEvidence.capturedAt = '2030-01-01'
    clock = '2026-10-01T12:00:00Z'
    const futureHtml = renderToStaticMarkup(React.createElement(RussianDiasporaPage))
    assert(futureHtml.includes('data-russian-diaspora-country-source-status="recapture-required"') && !cryptoSchemas(futureHtml).some(item => item['@type'] === 'FAQPage'), 'a future-dated matrix cannot publish current eligibility answers')
  } finally {
    russianDiasporaEvidence.capturedAt = diasporaCaptureDate
    clock = diasporaClock
  }
  const localFaqOperators = {
    'obzor-proplive': 'PropLive',
    'obzor-eratrade': 'Era Trade',
    'obzor-kascapital': 'KasCapital',
  }
  const localReviewAffiliateLabels = {
    'obzor-proplive': 'партнёрская страница',
    'obzor-eratrade': 'партнёрская программа',
    'obzor-kascapital': 'проверка партнёрских условий',
  }
  const localFaqSlugs = ['rossiyskie-prop-kompanii', ...Object.keys(localFaqOperators)]
  const localFaqClock = clock
  const broadMarketCapture = marketEvidence.capturedAt
  try {
    clock = '2026-10-01T12:00:00Z'
    marketEvidence.capturedAt = '2026-10-01'
    for (const slug of localFaqSlugs) {
      const Page = require(path.join(root, 'app/ru', slug, 'page.tsx')).default
      const html = renderToStaticMarkup(React.createElement(Page))
      assert(html.includes('data-russian-local-faq-status="dated"') && cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), `${slug}: FAQ schema recovers only with a fresh broad snapshot and scoped checks`)
    }
    const eraSignal = marketEvidence.localFirmSignals.find(item => item.operator === 'Era Trade')
    const eraAffiliate = marketEvidence.affiliatePrograms.find(item => item.operator === 'Era Trade')
    assert(eraSignal && eraAffiliate)
    const eraSignalDate = eraSignal.sourceCapturedAt
    const eraAffiliateDate = eraAffiliate.sourceCapturedAt
    try {
      for (const source of [eraSignal, eraAffiliate]) {
        source.sourceCapturedAt = '2026-08-08'
        const EraPage = require(path.join(root, 'app/ru/obzor-eratrade/page.tsx')).default
        const html = renderToStaticMarkup(React.createElement(EraPage))
        assert(html.includes('data-russian-local-faq-status="recapture-required"') && !cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'each scoped Era source independently expires its FAQ schema')
        assert(html.includes('Как минимум один источник требует повторной проверки') && !html.includes('Общий снимок рынка от 2026-10-01 требует повторной проверки'), 'scoped expiry cannot mislabel a fresh broad snapshot')
        source.sourceCapturedAt = '2026-10-01'
      }
    } finally {
      eraSignal.sourceCapturedAt = eraSignalDate
      eraAffiliate.sourceCapturedAt = eraAffiliateDate
    }
  } finally {
    marketEvidence.capturedAt = broadMarketCapture
    clock = localFaqClock
  }
  const cryptoSourceDates = [...cryptoEvidence.ranked.map(evidence => evidence.sourceCapturedAt), cryptoEvidence.payoutAlternative.sourceCapturedAt,
    ...cryptoEvidence.ranked.flatMap(evidence => originalByFirm(evidence.firmSlug).filter(product => evidence.productSlugs.includes(product.productSlug)).map(product => product.sourceCapturedAt))]
  const boundaries = [...products.map(product => product.sourceCapturedAt), ...instantSourceDates, ...mt5SourceDates, ...cTraderSourceDates, ...forexSourceDates, ...cryptoSourceDates, ...brightSourceDates, ...fundedReviewDates, ...marketEvidence.kycEvidence.map(source => source.sourceCapturedAt), marketEvidence.capturedAt, russianDiasporaEvidence.capturedAt, ...teamTradersEvidence.sources.map(source => source.capturedAt)]
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
        const pageModule = require(path.join(root, 'app/ru', slug, 'page.tsx'))
        const Page = pageModule.default
        if (date === dates[0]) {
          const searchTitle = typeof pageModule.metadata?.title === 'string' ? pageModule.metadata.title : pageModule.metadata?.title?.absolute ?? ''
          const searchDescription = pageModule.metadata?.description ?? ''
          assert(!`${searchTitle} ${searchDescription}`.includes('Bright Funded'), `${slug || 'ru home'}: search title and description use the official one-word BrightFunded brand`)
          if (['otzyvy-prop-firm', 'prop-firmy-bez-chelendzha'].includes(slug)) {
            for (const snippet of [searchDescription, pageModule.metadata?.openGraph?.description, pageModule.metadata?.twitter?.description]) {
              assert(typeof snippet === 'string' && snippet.includes('датами источников'), `${slug}: search and sharing snippets describe dated evidence`)
              assert(!snippet.includes('по свежим данным') && !snippet.includes('свежие phase-0'), `${slug}: static snippets cannot promise fresh products after source expiry`)
            }
          }
        }
        const html = renderToStaticMarkup(React.createElement(Page))
        assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'one H1 survives expiry')
        for (const match of html.matchAll(/<(h[1-6]|th)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
          const label = match[2].replace(/<[^>]+>/g, ' ')
          assert(!label.includes('Bright Funded'), `${slug || 'ru home'}: headings and table labels use the one-word BrightFunded brand`)
        }
        for (const match of html.matchAll(/\baria-label="([^"]+)"/g)) {
          assert(!match[1].includes('Bright Funded'), `${slug || 'ru home'}: accessible labels use the one-word BrightFunded brand`)
        }
        for (const link of html.matchAll(/<a\b[^>]*href="\/ru\/obzor-bright-funded"[^>]*>([\s\S]*?)<\/a>/g)) {
          const label = link[1].replace(/<[^>]+>/g, ' ')
          assert.doesNotMatch(label, /\bBright\b/u, `${slug || 'ru home'}: branded links to the BrightFunded review use its official one-word name`)
        }
        for (const link of html.matchAll(/<a\b[^>]*href="\/ru\/fundednext-vs-bright-funded"[^>]*>([\s\S]*?)<\/a>/g)) {
          const label = link[1].replace(/<[^>]+>/g, ' ')
          assert.doesNotMatch(label, /\bBright\b/u, `${slug || 'ru home'}: branded links to the comparison use BrightFunded`)
        }
        if (localFaqSlugs.includes(slug)) {
          const operators = localFaqOperators[slug] ? [localFaqOperators[slug]] : marketEvidence.localFirmSignals.map(item => item.operator)
          const sourceDates = [marketEvidence.capturedAt,
            ...marketEvidence.localFirmSignals.filter(item => operators.includes(item.operator)).map(item => item.sourceCapturedAt),
            ...marketEvidence.affiliatePrograms.filter(item => operators.includes(item.operator)).map(item => item.sourceCapturedAt),
          ]
          const current = sourceDates.every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))
          assert(html.includes(`data-russian-local-faq-status="${current ? 'dated' : 'recapture-required'}"`), `${slug}: visible FAQ source status follows broad and scoped dates`)
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), current, `${slug}: FAQ schema cannot outlive its supporting sources`)
          if (!current) assert(html.includes(`Источники ответов включают общий снимок рынка от ${marketEvidence.capturedAt}`) && html.includes('Как минимум один источник требует повторной проверки'), `${slug}: dated answers are visibly qualified`)
          if (localFaqOperators[slug]) {
            const operator = localFaqOperators[slug]
            const localSignal = marketEvidence.localFirmSignals.find(item => item.operator === operator)
            const affiliateSignal = marketEvidence.affiliatePrograms.find(item => item.operator === operator)
            assert(localSignal && affiliateSignal, `${slug}: scoped evidence exists`)
            assert(html.includes(`общий снимок рынка — ${marketEvidence.capturedAt}`), `${slug}: broad snapshot keeps its historical date`)
            assert(html.includes(`заявления ${operator} на главной — ${localSignal.sourceCapturedAt}`), `${slug}: operator claims show their own capture date`)
            assert(html.includes(`${localReviewAffiliateLabels[slug]} — ${affiliateSignal.sourceCapturedAt}`), `${slug}: affiliate check shows its own capture date`)
            assert(html.includes(`data-russian-guide-source-status="${current ? 'dated' : 'recapture-required'}"`), `${slug}: source warning follows all three capture dates`)
            assert(html.includes(`<strong>${localSignal.sourceCapturedAt}</strong><span>проверка заявлений на главной</span>`), `${slug}: hero date belongs to the operator claims`)
            assert.equal(cryptoSchemas(html).find(item => item['@type'] === 'Article')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES[`/ru/${slug}`], `${slug}: Article and sitemap use the same editorial date`)
          }
        }
        const brightPreclickDisclosures = {
          'fundednext-vs-bright-funded': 'fundednext-bright-comparison',
          'chto-takoe-prop-firma': 'prop-definition',
          'dlya-russkoyazychnykh-treyderov': 'diaspora-hero',
          'forex-prop-firmy': 'forex-shortlist',
          'prop-firmy-s-ctrader': 'ctrader-hero',
          'vyplaty-prop-firm': 'payout-ranking',
        }
        if (brightPreclickDisclosures[slug]) {
          const firstBrightAction = html.match(/href="\/go\/bright-funded\?from=ru-[^"]+"/)?.index ?? -1
          if (firstBrightAction >= 0) {
            const disclosure = html.indexOf(`data-russian-affiliate-disclosure="${brightPreclickDisclosures[slug]}"`)
            assert(disclosure >= 0 && disclosure < firstBrightAction, `${slug}: commission disclosure precedes the first Bright affiliate action`)
            const countryMarker = {
              'fundednext-vs-bright-funded': 'comparison-not-access',
              'dlya-russkoyazychnykh-treyderov': 'diaspora-not-access',
              'vyplaty-prop-firm': 'payout-not-access',
            }[slug]
            if (countryMarker) {
              const warning = html.indexOf(`data-russian-country-boundary="${countryMarker}"`)
              assert(warning >= 0 && warning < firstBrightAction, `${slug}: country warning precedes the first Bright affiliate action`)
            }
          }
        }
        if (slug === 'prop-firmy-s-ctrader') {
          const shortlistDisclosure = html.indexOf('data-russian-affiliate-disclosure="ctrader-shortlist"')
          const shortlistBright = html.indexOf('href="/go/bright-funded?from=ru-ctrader-shortlist-bright-funded"')
          assert(shortlistDisclosure >= 0 && shortlistBright > shortlistDisclosure, 'cTrader shortlist repeats the commission disclosure before its own Bright action')
        }
        for (const match of html.matchAll(/<a\b[^>]*href="(\/go\/bright-funded(?:\?[^"#]*)?)"[^>]*>([\s\S]*?)<\/a>/g)) {
          const anchor = match[0]
          const label = match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          const outbound = new URL(match[1].replace(/&amp;/g, '&'), 'https://tradersfundhub.com')
          assert(outbound.searchParams.get('from')?.startsWith('ru-'), `${slug || 'ru home'}: Bright affiliate click retains a Russian placement`)
          assert(anchor.includes('rel="sponsored nofollow noopener"'), `${slug || 'ru home'}: Bright affiliate click stays disclosed`)
          assert(!label.includes('Bright Funded'), `${slug || 'ru home'}: Bright affiliate label uses the first-party BrightFunded spelling`)
        }
        assert(!html.includes(brightFirm.affiliateUrl), `${slug || 'ru home'}: never expose a second Bright affiliate destination outside /go/`)
        if (slug === 'rossiyskie-prop-kompanii') {
          assert(html.includes('Модель описана; издательская программа не подтверждена.'), 'Trade System partnership description remains qualified for publishers')
          assert(html.includes('Общий снимок рынка: 2026-08-27; заявления на официальных страницах шести компаний перепроверены: 2026-10-01'), 'fresh local checks do not redate the broad Russian market snapshot')
          assert(html.includes(`data-russian-teamtraders-local-source="${teamTradersEvidence.capturedAt}"`), 'directory dates the rechecked TeamTraders card without relabelling the whole market snapshot')
          assert(html.includes('Отдельная проп-оферта сейчас недоступна'), 'directory exposes the TeamTraders contract gap before readers leave the card')
          assert.equal(cryptoSchemas(html).find(item => item['@type'] === 'Article')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/rossiyskie-prop-kompanii'])
          assert(html.includes('Сравнить FundedNext и BrightFunded') && !html.includes('Сравнить 7 глобальных продуктов'), 'local-firm handoff never promises seven fresh partner products')
        }
        if (slug === 'dlya-russkoyazychnykh-treyderov') {
          assert.equal(cryptoSchemas(html).find(item => item['@type'] === 'Article')?.dateModified, russianRouteDateModified('/ru/dlya-russkoyazychnykh-treyderov', russianDiasporaEvidence.capturedAt), 'diaspora Article reflects the newer checked matrix date')
          assert(html.includes('Число доступных строк зависит от свежести источников.') && !html.includes('Сравнить 7 продуктов'), 'diaspora handoff does not preserve a stale comparison count')
          const currentMatrix = isChallengeFresh({ sourceCapturedAt: russianDiasporaEvidence.capturedAt })
          assert(html.includes(`data-russian-diaspora-country-source-status="${currentMatrix ? 'dated' : 'recapture-required'}"`), 'country matrix status follows its own capture date')
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), currentMatrix, 'diaspora FAQ schema expires with its country evidence')
          const firstBrightAction = html.indexOf('href="/go/bright-funded?from=ru-diaspora-hero-bright-funded"')
          const brightWarning = html.indexOf(`data-russian-diaspora-bright-country-status="${currentMatrix ? 'dated' : 'recapture-required'}"`)
          assert(brightWarning >= 0 && brightWarning < firstBrightAction, 'diaspora Bright country-source warning precedes the first Bright affiliate action')
          const heroDisclosure = html.slice(html.indexOf('data-russian-diaspora-hero-disclosure="primary-affiliates"'), brightWarning)
          assert(heroDisclosure.includes('FundedNext и BrightFunded') && !heroDisclosure.includes('Bright Funded'), 'diaspora hero disclosure uses the first-party BrightFunded name')
          const warningText = html.slice(brightWarning, firstBrightAction)
          const brightSources = russianDiasporaEvidence.firms.find(firm => firm.slug === 'bright-funded')?.sources ?? []
          for (const source of brightSources) {
            assert(warningText.includes(`href="${source.url}"`), 'diaspora pre-click country warning links both first-party Bright sources')
          }
          assert(warningText.includes('Пакистан'), 'diaspora pre-click warning explains the Bright Help/Terms list discrepancy')
          if (!currentMatrix) assert(warningText.includes('требует повторной проверки') && warningText.includes('не подтверждает доступ сегодня'), 'expired Bright country warning cannot imply current access')
        }
        const countFreeComparisonLabels = {
          'promokody-prop-firm': 'Таблица программ',
          'obzor-proplive': 'сравнение программ FundedNext и BrightFunded',
          'obzor-eratrade': 'сравнение FundedNext и BrightFunded',
        }
        if (countFreeComparisonLabels[slug]) {
          const comparisonLinks = [...html.matchAll(/<a\b[^>]*href="\/ru\/fundednext-vs-bright-funded"[^>]*>([^<]+)<\/a>/g)].map(match => match[1])
          assert(comparisonLinks.includes(countFreeComparisonLabels[slug]), 'Russian comparison handoff remains descriptive without a fixed product count')
          assert(!comparisonLinks.some(label => /\b7 продуктов\b/u.test(label)), 'expired comparison products cannot leave a seven-product promise in the handoff')
        }
        if (slug === 'chto-takoe-prop-firma') {
          const count = getAllChallenges().filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug) && isChallengeFresh(product)).length
          assert(html.includes(`data-russian-prop-definition-products="${count}"`))
          assert(html.includes(`${count} актуальных продуктов FundedNext и Bright Funded`), 'table caption follows the fresh product count')
          assert(!html.includes('undefined') && !html.includes('Семь актуальных продуктов'), 'expired products cannot leave an undefined phase range or a seven-product caption')
          if (count === 0) assert(html.includes('Нет программ с актуальной проверкой за 30 дней.'), 'empty definition table explains the source expiry')
        }
        if (slug === 'otzyvy-prop-firm') {
          assert(!html.includes('Продуктовая проверка: 7 программ') && !html.includes('Начните с 3 моделей Bright Funded'), 'reviews guide cannot promise fixed program counts after expiry')
          if (html.includes('data-russian-reviews-product-evidence="0"')) assert(html.includes('Нет программ с актуальной проверкой за 30 дней.'), 'empty reviews table explains the source expiry')
        }
        if (slug === 'obzor-fundingpips') {
          assert(html.includes('<h1>FundingPips: обзор 2026 — цены, правила и выплаты</h1>'), 'FundingPips review headline remains count-free across source expiry')
          assert(!html.includes('сравнение 4 продуктов FundedNext с 5 моделями FundingPips'), 'FundingPips comparison handoff does not promise expired products')
          if (html.includes('data-russian-product-count="0"')) assert(!cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), 'expired product prices cannot retain FundingPips FAQ schema')
        }
        if (['obzor-fundednext', 'obzor-bright-funded'].includes(slug)) {
          const regions = [...html.matchAll(/<div\b[^>]*class="ru-table-wrap"[^>]*>/g)].map(match => match[0])
          assert.equal(regions.length, slug === 'obzor-fundednext' ? 4 : 3, 'all partner review tables remain available')
          for (const region of regions) assert(region.includes('tabindex="0"') && region.includes('role="region"') && /aria-label="[^"]+таблицу можно прокрутить"/.test(region), 'each Russian partner table has named keyboard-scroll access, including expired states')
          const labels = regions.map(region => region.match(/aria-label="([^"]+)"/)[1])
          assert.equal(new Set(labels).size, regions.length, 'table regions have distinct meaningful labels')
        }
        if (slug === 'obzor-bright-funded') {
          const brightPageMetadata = require(path.join(root, 'app/ru/obzor-bright-funded/page.tsx')).metadata
          assert(brightPageMetadata.description.startsWith('BrightFunded: обзор на русском'), 'Bright search description uses the first-party unspaced brand spelling')
          assert(brightPageMetadata.openGraph.description.includes('3 программы, 18 цен'), 'separately approved social sharing copy remains unchanged')
          assert(html.includes('/ <a href="/ru/luchshie-prop-firmy">Рейтинг</a> / BrightFunded</div>'), 'Bright visible breadcrumb uses the same official brand spelling as its H1')
          assert.equal(cryptoSchemas(html).find(item => item['@type'] === 'BreadcrumbList')?.itemListElement.at(-1)?.name, 'Обзор BrightFunded', 'Bright breadcrumb schema matches the visible review name')
          assert(html.includes('Проверить BrightFunded') && html.includes('Проверить страну и планы BrightFunded'), 'both Bright review affiliate actions use the same first-party brand spelling')
          assert(cryptoSchemas(html).find(item => item['@type'] === 'Article')?.dateModified >= RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/obzor-bright-funded'], 'Bright review schema includes the October 1 editorial update')
          const captured = originalByFirm('bright-funded')
          const fresh = captured.filter(product => isChallengeFresh(product))
          const tierCount = fresh.reduce((count, product) => count + product.accountSizes.filter(tier => tier.priceEur != null && tier.priceEur > 0).length, 0)
          assert(html.includes(`data-russian-bright-price-count="${tierCount}"`))
          assert(html.includes('data-russian-bright-offer-handoff="qualified-status"') && html.includes('href="/ru/promokody-prop-firm#bright-offer-status"'), 'Bright review leads price readers directly to the qualified offer-status section')
          const valid = fresh.length === captured.length && Object.values(brightEvidence.sources).every(source => isChallengeFresh(source))
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), valid)
          if (valid) {
            const faq = cryptoSchemas(html).find(item => item['@type'] === 'FAQPage')
            assert(faq.mainEntity.some(item => item.name === 'Можно ли зарегистрироваться, проживая в России?'
              && item.acceptedAnswer.text.includes(`проверенном ${brightEvidence.sources.countries.sourceCapturedAt}`)), 'Bright FAQ schema uses the same dated restriction answer as the visible page')
          }
          if (valid && isChallengeFresh({ sourceCapturedAt: brightFirm.trustpilotCapturedAt })) {
            const faq = cryptoSchemas(html).find(item => item['@type'] === 'FAQPage')
            assert(faq?.mainEntity.some(item => item.name === 'Почему у Bright Funded нет средней оценки Trustpilot?'), 'fresh suppressed rating remains a qualified Russian FAQ, not a fabricated score')
          }
          const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
          assert(visible.includes('на официальном сайте — BrightFunded'), 'the Russian review names the exact first-party BrightFunded spelling')
          const countryCurrent = [brightEvidence.sources.countries, brightEvidence.sources.countryTerms].every(source => isChallengeFresh(source))
          const accessSection = html.slice(html.indexOf('<h2 id="access">'), html.indexOf('<h2 id="plans">'))
          assert(accessSection.includes(`data-russian-bright-country-source-status="${countryCurrent ? 'dated' : 'recapture-required'}"`), 'Bright lower access section follows both country source ages')
          assert(countryCurrent
            ? accessSection.includes('Россия не названа в опубликованном списке')
            : accessSection.includes('Прежний список не подтверждает доступ из России сегодня.') && !accessSection.includes('Россия не названа ни там, ни там'), 'Bright lower access copy switches at the country-source expiry boundary')
          const russiaAnswer = html.match(/<summary>Можно ли зарегистрироваться, проживая в России\?<\/summary><p>(.*?)<\/p>/)?.[1]
          assert(russiaAnswer && !visible.includes('20 апреля 2026 года'), 'Russia FAQ retains a visible answer without the outdated article revision')
          assert(countryCurrent
            ? russiaAnswer.includes(`списке шести стран, проверенном ${brightEvidence.sources.countries.sourceCapturedAt}`)
            : russiaAnswer.includes('Страновые источники требуют повторной проверки') && russiaAnswer.includes('не является разрешением сегодня'), 'Russia FAQ uses the dated list only while both country sources are fresh')
          const platformsSection = html.match(/<section data-russian-bright-platforms="dated-source">([\s\S]*?)<\/section>/)?.[1]
          assert(platformsSection?.includes(`href="${brightEvidence.sources.platforms.sourceUrl}"`) && platformsSection.includes(brightEvidence.sources.platforms.sourceCapturedAt), 'Bright platform choices cite their own dated first-party source')
          assert(platformsSection.includes('DXTrade, cTrader и MT5') && platformsSection.includes('США либо ОАЭ') && platformsSection.includes('связях с США'), 'Bright platform restrictions remain visible before purchase')
          assert.doesNotMatch(visible, /\breward\b|\bsuppression\b|\bcountry-check\b|\bpayout\b|\bfee\b|\bchallenge\b|\bEUR-priced\b|\bOvernight\b|\bweekend\b|\boff-ramp\b|\bpayment ownership\b|\bcomputeTrueCost\b|B2B30|захвачен/iu, 'Bright review uses reader-facing Russian and no expired promotion')
          assert(!html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0].includes('18 цен'))
          assert(html.includes('14-дневный режим перечислен среди платных дополнений'), 'payout-cycle conflict stays explicit')
          for (const source of Object.values(brightEvidence.sources)) assert(html.includes(`href="${source.sourceUrl}"`))
        }
        if (slug === 'fundednext-vs-bright-funded') {
          const countryCurrent = [brightEvidence.sources.countries, brightEvidence.sources.countryTerms].every(source => isChallengeFresh(source))
          const notice = html.match(/<div class="ru-notice" data-russian-primary-comparison-country-conflict="help-six-terms-five"[^>]*>([\s\S]*?)<\/div>/)?.[1]
          const answer = html.match(/<summary>Можно ли зарегистрироваться резиденту России\?<\/summary><p>(.*?)<\/p>/)?.[1]
          assert(html.indexOf('data-russian-primary-comparison-country-conflict="help-six-terms-five"') < html.indexOf('href="/go/bright-funded?from=ru-fn-vs-bright-bright-funded"'), 'Bright country warning remains before the first comparison CTA at every source-age boundary')
          assert(html.includes(`data-russian-primary-comparison-country-status="${countryCurrent ? 'dated' : 'recapture-required'}"`), 'comparison Bright country notice follows both source ages at day boundaries')
          assert(countryCurrent
            ? notice?.includes('Россия не названа ни в одном из этих списков') && answer?.includes(brightEvidence.sources.countryTerms.sourceCapturedAt)
            : notice?.includes('прежнее отсутствие России в них не подтверждает доступ сегодня') && answer?.includes('прежнее отсутствие России в списках не является разрешением сегодня'), 'comparison country notice and visible FAQ both become historical at source expiry')
        }
        if (slug === 'promokody-prop-firm') {
          assert(cryptoSchemas(html).find(item => item['@type'] === 'Article')?.dateModified >= RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/promokody-prop-firm'], 'Russian offers schema includes the October 1 editorial update')
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
          for (const source of teamTradersEvidence.sources.filter(item => item.id === 'home' || item.id === 'faq')) assert(html.includes(`href="${source.url}"`), 'live primary sources remain linked')
          for (const source of teamTradersEvidence.sources.filter(item => item.id === 'offer' || item.id === 'legacy-docs')) assert(!html.includes(`href="${source.url}"`), '404 sources are no longer clickable')
          assert(html.includes(`href="${teamTradersEvidence.availabilityCheck.currentLegalUrl}"`), 'live training offer remains identifiable')
          assert(html.includes('data-russian-teamtraders-legal="prop-offer-unavailable"'))
          assert(html.includes('data-russian-teamtraders-legal-availability="prop-offer-unavailable"'))
          const decision = html.split('data-russian-teamtraders-decision="rules-before-reviews"')[1].split('</section>')[0]
          assert(decision.indexOf('Сначала запросите применимую оферту') < decision.indexOf('Затем проверьте техническую совместимость'), 'applicable contract request precedes account registration, even free')
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
        if (slug === 'prop-firmy-bez-kyc') {
          const partnerSlugs = ['fundednext', 'bright-funded', 'fundingpips']
          const partnerProducts = products.filter(product => partnerSlugs.includes(product.firmSlug))
          const expectedProducts = partnerProducts.filter(product => isChallengeFresh(product))
          const expectedPrices = expectedProducts.reduce((count, product) => count + product.accountSizes.filter(tier =>
            (tier.priceUsd != null && tier.priceUsd > 0) || (tier.priceEur != null && tier.priceEur > 0)).length, 0)
          const schemas = cryptoSchemas(html)
          const allKycCurrent = marketEvidence.kycEvidence.filter(source => partnerSlugs.includes(source.firmSlug))
            .every(source => isChallengeFresh({ sourceCapturedAt: source.sourceCapturedAt }))
          const fullyCurrent = isChallengeFresh({ sourceCapturedAt: marketEvidence.capturedAt })
            && partnerProducts.length > 0 && partnerProducts.every(product => isChallengeFresh(product)) && allKycCurrent
          assert.equal(schemas.some(item => item['@type'] === 'FAQPage'), fullyCurrent, 'KYC FAQ schema expires with country, KYC and product evidence')
          assert.equal(schemas.find(item => item['@type'] === 'Article')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/prop-firmy-bez-kyc'])
          assert(html.includes(`<strong>${expectedProducts.length}</strong><span>свежих глобальных продуктов</span>`), 'KYC product count comes from fresh rows')
          assert(html.includes(`<strong>${expectedPrices}</strong><span>опубликованных цен</span>`), 'KYC price count comes from fresh tiers')
          assert(html.includes(`${marketEvidence.localFirmSignals.find(item => item.operator === 'TeamTraders').claims.minimumTradingSessions} торговых дней`), 'local TeamTraders history uses captured trading days, not an invented 15-session claim')
          for (const source of marketEvidence.kycEvidence.filter(source => partnerSlugs.includes(source.firmSlug))) {
            const row = html.match(new RegExp(`<tr[^>]*data-russian-kyc-evidence="${source.firmSlug}"[^>]*>[\\s\\S]*?<\\/tr>`))?.[0]
            assert(row?.includes(`data-russian-kyc-source-status="${isChallengeFresh({ sourceCapturedAt: source.sourceCapturedAt }) ? 'dated' : 'recapture-required'}"`), 'each KYC row exposes its own evidence age')
            assert(row.includes(source.sourceCapturedAt), 'each KYC row displays its own capture date')
          }
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
          assert.equal(cryptoSchemas(html).find(item => item['@type'] === 'CollectionPage')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru'], 'homepage schema reflects the dated access-copy correction')
          assert.match(html, /<a\b[^>]*href="\/ru\/obzor-bright-funded"[^>]*>Читать обзор BrightFunded<\/a>/, 'homepage links to the Bright review with the first-party brand spelling')
          const homeDisclosure = html.indexOf('data-russian-affiliate-disclosure="home-primary-partners"')
          const fundedNextAffiliate = html.indexOf('href="/go/fundednext?from=ru-home-hero-fundednext"')
          const brightAffiliate = html.indexOf('href="/go/bright-funded?from=ru-home-hero-bright-funded"')
          assert(homeDisclosure >= 0 && fundedNextAffiliate > homeDisclosure && brightAffiliate > homeDisclosure, 'commission disclosure precedes both Russian homepage affiliate actions')
          for (const [firmSlug, capturedAt] of [
            ['fundednext', fundedNextAccessEvidence.sourceCapturedAt],
            ['bright-funded', brightEvidence.sources.countries.sourceCapturedAt],
          ]) {
            const countryFresh = isChallengeFresh({ sourceCapturedAt: capturedAt })
              && (firmSlug !== 'bright-funded' || isChallengeFresh({ sourceCapturedAt: brightEvidence.sources.countryTerms.sourceCapturedAt }))
            const card = html.match(new RegExp(`<article[^>]*data-russian-home-hero-partner="${firmSlug}"[^>]*>[\\s\\S]*?<\\/article>`))?.[0]
            assert(card?.includes(`data-russian-partner-country-source-status="${countryFresh ? 'dated' : 'recapture-required'}"`), 'each homepage partner uses its own country-source age')
            assert(card.includes(capturedAt), 'the homepage country warning shows its own source date')
            if (firmSlug === 'bright-funded') {
              assert(card.includes('<h2>BrightFunded</h2>') && card.includes('Проверить условия BrightFunded'), 'Russian homepage uses the first-party BrightFunded brand in the prominent partner heading and CTA')
              assert(card.includes('data-russian-home-bright-country-conflict="help-six-terms-five"'), 'Bright homepage card displays the country-list disagreement before the affiliate action')
              assert(card.includes(`href="${brightEvidence.sources.countries.sourceUrl}"`) && card.includes(`href="${brightEvidence.sources.countryTerms.sourceUrl}"`), 'Bright homepage card links both first-party country sources')
              assert(card.includes(brightEvidence.sources.countryTerms.sourceCapturedAt), 'Bright homepage card shows the independently captured Terms date')
            }
            if (!countryFresh) assert(card.includes('не подтверждает доступ сегодня'), 'old country evidence cannot imply current access')
          }
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
          const accessCapturedAt = fundedNextAccessEvidence?.sourceCapturedAt ?? marketEvidence.capturedAt
          const needsCheck = !freshProducts.length || [...mt5SourceDates, accessCapturedAt].some(sourceCapturedAt => !isChallengeFresh({ sourceCapturedAt }))
          assert.equal(html.includes('data-russian-guide-source-status="recapture-required"'), needsCheck)
          assert.equal(schema.some(item => item['@type'] === 'FAQPage'), !needsCheck)
          for (const capturedAt of mt5SourceDates) assert(visible.includes(capturedAt), 'each independent MT5 source date stays visible')
          assert(visible.includes(`Доступ по стране: ${accessCapturedAt}`), 'MT5 guide shows the scoped country-access check without redating platform rules')
          assert.equal((html.match(/data-russian-fundednext-mt5-product=/g) ?? []).length, freshProducts.length, 'expired product rows do not survive')
          assert.equal((html.match(/id="(?:answer|login|products|free-trial|ea-rules|continuity|platforms|checkout|country|verdict|sources|faq)"/g) ?? []).length, 12, 'existing MT5 article anchors survive')
        }
        if (slug === 'luchshie-prop-firmy') {
          const freshInstantProducts = getAllChallenges().filter(product => product.phases === 0 && isChallengeFresh(product))
          const instantStatus = freshInstantProducts.length > 0 ? 'source-checked' : 'recapture-required'
          assert(html.includes(`data-russian-ranking-instant-status="${instantStatus}"`) && html.includes(`data-russian-ranking-instant-card="${instantStatus}"`), 'ranking phase-0 claims follow current product capture age')
          const instantFaq = html.match(/<summary>Есть ли проп-фирмы без челленджа\?<\/summary><p>(.*?)<\/p>/)?.[1]
          assert(instantFaq, 'ranking keeps the instant-funding FAQ answer')
          assert.equal(instantFaq.includes('FundedNext Stellar Instant'), freshInstantProducts.some(product => product.firmSlug === 'fundednext' && product.productSlug === 'stellar-instant'), 'ranking FAQ keeps the full brand only while Stellar Instant is source-checked')
          assert.equal(instantFaq.includes('FundingPips Zero'), freshInstantProducts.some(product => product.firmSlug === 'fundingpips' && product.productSlug === 'zero'), 'ranking FAQ names FundingPips Zero only while its capture is fresh')
          if (freshInstantProducts.length === 0) assert(instantFaq.includes('нет программ без челленджа со свежей проверкой'), 'expired phase-0 products are not presented as current FAQ examples')
          const faqSlugs = ['fundednext', 'bright-funded', 'fundingpips']
          const faqProducts = products.filter(product => faqSlugs.includes(product.firmSlug))
          const faqKyc = marketEvidence.kycEvidence.filter(item => faqSlugs.includes(item.firmSlug))
          const faqPayout = marketEvidence.payoutEvidence.filter(item => faqSlugs.includes(item.firmSlug))
          const faqCurrent = faqSlugs.every(firmSlug => faqProducts.some(product => product.firmSlug === firmSlug)
            && faqKyc.some(item => item.firmSlug === firmSlug)
            && faqPayout.some(item => item.firmSlug === firmSlug))
            && faqProducts.every(product => isChallengeFresh(product))
            && [marketEvidence.capturedAt, brightEvidence.sources.countries.sourceCapturedAt, brightEvidence.sources.countryTerms.sourceCapturedAt,
              ...faqKyc.map(item => item.sourceCapturedAt), ...faqPayout.map(item => item.sourceCapturedAt)]
              .every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), faqCurrent, 'ranking FAQ schema follows product, access, KYC and payout source age')
          assert.equal(html.includes('data-russian-ranking-faq-status="source-checked"'), faqCurrent)
          const brightCountryCurrent = [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]
            .every(source => isChallengeFresh({ sourceCapturedAt: source.sourceCapturedAt }))
          const rankingRussiaAnswer = html.match(/<summary>Какая проп-фирма работает с резидентами России\?<\/summary><p>(.*?)<\/p>/)?.[1]
          assert(brightCountryCurrent
            ? rankingRussiaAnswer?.includes('справка и условия BrightFunded расходятся по Пакистану')
            : rankingRussiaAnswer?.includes('страновые источники BrightFunded требуют повторной проверки') && rankingRussiaAnswer.includes('не подтверждает доступ сегодня'), 'ranking Russia FAQ follows both Bright country-source ages')
          const brightCard = html.match(/<article[^>]*data-russian-ranking-primary-partner="bright-funded"[^>]*>[\s\S]*?<\/article>/)?.[0]
          assert(brightCard?.includes('data-russian-ranking-bright-country-conflict="help-six-terms-five"'), 'Bright ranking partner shows the country-list disagreement before its affiliate action')
          assert(brightCard.includes('<h3>BrightFunded</h3>') && brightCard.includes('Проверить BrightFunded'), 'Russian ranking partner heading and CTA use the first-party brand spelling')
          assert(brightCard.includes(`data-russian-ranking-bright-country-status="${brightCountryCurrent ? 'dated' : 'recapture-required'}"`), 'Bright ranking country warning checks both source ages')
          assert(brightCard.includes(`href="${brightEvidence.sources.countries.sourceUrl}"`) && brightCard.includes(`href="${brightEvidence.sources.countryTerms.sourceUrl}"`), 'Bright ranking card links both first-party country sources')
          assert(brightCard.includes(brightEvidence.sources.countries.sourceCapturedAt) && brightCard.includes(brightEvidence.sources.countryTerms.sourceCapturedAt), 'Bright ranking card shows both independently captured dates')
          if (!brightCountryCurrent && brightCard.includes('<details>')) assert(brightCard.includes('старые списки не подтверждают доступ к покупке или выплате сегодня.'), 'visible Bright partner details become historical when country sources expire')
          assert(html.includes('Проверить программы BrightFunded') && !html.includes('Проверить 3 программы BrightFunded'), 'ranking handoff does not promise three current Bright programmes after expiry')
          assert.match(html, /<a\b[^>]*href="\/ru\/obzor-bright-funded"[^>]*>Обзор BrightFunded<\/a>/, 'ranking partner card names the Bright review')
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
          const rankingList = cryptoSchemas(html).find(item => item['@type'] === 'ItemList')
          assert.equal(rankingList?.numberOfItems, expectedFirms.length, 'Russian ranking schema matches the visible current directory')
          for (const [firmName, schemaName, firmSlug, reviewPath] of [
            ['FTMO', 'FTMO', 'ftmo', '/ru/obzor-ftmo'],
            ['FundedNext', 'FundedNext', 'fundednext', '/ru/obzor-fundednext'],
            ['FundingPips', 'FundingPips', 'fundingpips', '/ru/obzor-fundingpips'],
            ['Bright Funded', 'BrightFunded', 'bright-funded', '/ru/obzor-bright-funded'],
          ]) {
            if (!expectedFirms.some(firm => firm.name === firmName)) continue
            assert(rankingList.itemListElement.some(entry => entry.item.name === schemaName && entry.item.url === `https://tradersfundhub.com${reviewPath}`), `${firmSlug}: ranking schema points to the same Russian review as the visible table`)
            const row = html.match(new RegExp(`<tr[^>]*data-ranked-firm="${firmSlug}"[^>]*>[\\s\\S]*?<\\/tr>`))?.[0]
            assert(row?.includes(`href="${reviewPath}"`), `${firmSlug}: visible ranking row retains its Russian review link`)
          }
          if (expectedFirms.some(firm => firm.name === 'TradeDay')) {
            assert(rankingList.itemListElement.some(entry => entry.item.name === 'TradeDay' && entry.item.url === 'https://tradersfundhub.com/blog/tradeday-review'), 'firms without a Russian review keep their English schema destination')
          }
          const Finder = require(path.join(root, 'components/RussianChallengeFinder.tsx')).default
          const brightFinderCards = [...html.matchAll(/<article\b[^>]*data-finder-product="bright-funded:[^"]+"[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0])
          for (const card of brightFinderCards) {
            const warning = card.indexOf('data-russian-country-boundary="ranking-finder-bright-not-access"')
            const outbound = card.indexOf('href="/go/bright-funded?from=ru-challenge-finder-')
            assert(warning >= 0 && outbound > warning, 'every Bright finder card places its country warning before the affiliate action')
            assert(card.includes(`data-russian-finder-bright-country-status="${brightCountryCurrent ? 'dated' : 'recapture-required'}"`), 'Bright finder country warning follows both source ages')
            for (const source of [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]) {
              assert(card.includes(`href="${source.sourceUrl}"`) && card.includes(source.sourceCapturedAt), 'Bright finder card shows both first-party source links and dates')
            }
            if (!brightCountryCurrent) assert(card.includes('Страновые источники требуют повторной проверки'), 'expired Bright country evidence cannot imply current access in the finder')
          }
          if (expectedFirms.some(firm => firm.name === 'Bright Funded')) {
            assert.match(html, /<a\b[^>]*href="\/ru\/obzor-bright-funded"[^>]*>BrightFunded<\/a>/, 'fresh ranking table uses the official Bright brand spelling')
            const brightRow = getRussianFinderRows().find(row => row.firm.slug === 'bright-funded')
            assert(brightRow, 'current Bright firm has a comparison-finder row')
            const finderHtml = renderToStaticMarkup(React.createElement(Finder, { initialRows: [brightRow], brightCountrySources: brightFinderCountrySources() }))
            assert(finderHtml.includes('<span>BrightFunded</span>') && finderHtml.includes('Проверить условия у BrightFunded'), 'Bright finder card and outbound handoff use the same brand spelling')
            assert(!finderHtml.includes('Проверить условия у Bright Funded'), 'Bright finder never reverts to the spaced name at checkout handoff')
          }
          for (const row of getRussianFinderRows().filter(row => row.product.phases === 0)) {
            // Isolate copy rendering at the server's default size. This synthetic size
            // is test-only; real tier availability is covered by finder projection tests.
            const fixture = { ...row, product: { ...row.product, tiers: [{ ...row.product.tiers[0], sizeUsd: 50000 }] } }
            const card = renderToStaticMarkup(React.createElement(Finder, { initialRows: [fixture], brightCountrySources: brightFinderCountrySources() }))
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
          const allBright = getAllChallenges().filter(product => product.firmSlug === 'bright-funded')
          const brightFresh = allBright.length > 0 && allBright.every(product => isChallengeFresh(product))
          const brightEvaluationOnly = brightFresh && allBright.every(product => product.phases != null && product.phases > 0)
          const expectedBrightStatus = brightEvaluationOnly ? 'challenge-alternative-only' : brightFresh && allBright.some(product => product.phases === 0) ? 'phase-zero-listed' : 'recapture-required'
          assert(html.includes(`data-russian-instant-bright="${expectedBrightStatus}"`), 'Bright alternative follows the complete product catalogue freshness and phases')
          const instantCatalog = getAllChallenges().filter(product => product.phases === 0)
          const currentInstant = instantCatalog.filter(product => isChallengeFresh(product))
          const instantCatalogFresh = instantCatalog.length > 0 && currentInstant.length === instantCatalog.length
          const fundedNextRulesFresh = [instantEvidence.capturedAt, instantEvidence.news.sourceCapturedAt]
            .every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))
          const currentFundedNext = currentInstant.some(product => product.firmSlug === 'fundednext' && product.productSlug === 'stellar-instant')
          const currentFundingPips = currentInstant.some(product => product.firmSlug === 'fundingpips' && product.productSlug === 'zero')
          assert.equal(html.includes('data-russian-instant-partner-source-status="recapture-required"'), !currentFundedNext || !currentFundingPips || !fundedNextRulesFresh, 'partner comparison warns when a price or rule source expires')
          assert.equal(html.includes('data-russian-instant-fundednext-status="recapture-required"'), !currentFundedNext || !fundedNextRulesFresh, 'FundedNext detail does not retain old rules')
          assert.equal(html.includes('data-russian-instant-fundingpips-status="recapture-required"'), !currentFundingPips, 'FundingPips detail does not retain old prices')
          const riskExampleSlugs = ['maven', 'fundednext', 'fundingpips', 'fxify', 'tradeify', 'lucid-trading', 'alpha-capital']
          const riskExamplesCurrent = riskExampleSlugs.every(firmSlug => currentInstant.some(product => product.firmSlug === firmSlug))
            && instantCatalog.filter(product => riskExampleSlugs.includes(product.firmSlug)).every(product => isChallengeFresh(product))
          assert.equal(html.includes('data-russian-instant-risk-status="recapture-required"'), !riskExamplesCurrent, 'fixed risk-price examples expire with every named product')
          assert.equal(cryptoSchemas(html).some(item => item['@type'] === 'FAQPage'), brightFresh && instantCatalogFresh && fundedNextRulesFresh, 'instant FAQ schema expires with product and independent rule evidence')
          assert.equal(cryptoSchemas(html).find(item => item['@type'] === 'Article')?.dateModified, RUSSIAN_ROUTE_EDITORIAL_DATES['/ru/prop-firmy-bez-chelendzha'], 'editorial date does not drift with product capture')
          if (!currentInstant.length) {
            assert(html.includes('data-russian-instant-empty="recapture-required"'), 'fully expired phase-0 catalogue shows an explanation instead of an empty table')
            assert(!visible.includes('$59.99') && !visible.includes('$60') && !visible.includes('4 цены и плавающий лимит'), 'expired instant prices disappear from visible guide copy')
          }
          if (!brightFresh) {
            assert(visible.includes('не подтверждает текущую линейку, число программ или цены'), 'expired Bright evidence becomes an explicit recapture notice')
            assert(!visible.includes('3 текущие программы') && !visible.includes('3 свежие программы') && !visible.includes('1-Step, 2-Step Bright и 2-Step Classic'), 'expired Bright evidence cannot leave fixed current-lineup claims')
          }
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
          const needsCheck = [...forexSourceDates, ...scoped.map(product => product.sourceCapturedAt), fundedNextAccessEvidence.sourceCapturedAt, brightEvidence.sources.countries.sourceCapturedAt, brightEvidence.sources.countryTerms.sourceCapturedAt]
            .some(sourceCapturedAt => !isChallengeFresh({ sourceCapturedAt }))
          assert.equal(html.includes('data-russian-guide-source-status="recapture-required"'), needsCheck)
          assert.equal(schema.some(item => item['@type'] === 'FAQPage'), !needsCheck)
          const brightCountryCurrent = [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]
            .every(source => isChallengeFresh({ sourceCapturedAt: source.sourceCapturedAt }))
          const brightCard = html.match(/<article class="ru-card" data-russian-forex-featured-partner="bright-funded">([\s\S]*?)<\/article>/)?.[1]
          assert(brightCard?.includes(`data-russian-forex-bright-country-status="${brightCountryCurrent ? 'dated' : 'recapture-required'}"`), 'forex Bright shortlist follows both country source ages before checkout')
          for (const source of [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]) assert(brightCard.includes(`href="${source.sourceUrl}"`) && brightCard.includes(source.sourceCapturedAt), 'forex Bright shortlist links both dated first-party country sources')
          assert(brightCard.indexOf('data-russian-forex-bright-country-status=') < brightCard.indexOf('href="/go/bright-funded?from=ru-forex-shortlist-bright-funded"'), 'Bright country conflict precedes the first forex affiliate action')
          const forexCountryNotice = html.match(/<div class="ru-notice" data-russian-forex-country-conflict="help-six-terms-five"[^>]*>([\s\S]*?)<\/div>/)?.[1]
          const forexRussiaAnswer = html.match(/<summary>Русская версия означает, что можно зарегистрироваться из России\?<\/summary><p>(.*?)<\/p>/)?.[1]
          assert(html.includes(`data-russian-forex-country-status="${brightCountryCurrent ? 'dated' : 'recapture-required'}"`), 'full forex country notice follows both Bright source ages')
          assert(brightCountryCurrent
            ? forexCountryNotice?.includes('Россия не названа ни там, ни там') && forexRussiaAnswer?.includes(brightEvidence.sources.countryTerms.sourceCapturedAt)
            : forexCountryNotice?.includes('прежнее отсутствие России в них не подтверждает доступ сегодня') && forexRussiaAnswer?.includes('не является разрешением сегодня') && brightCard.includes('не подтверждает доступ сегодня'), 'forex country notice, visible FAQ and pre-click card become historical at source expiry')
          assert(html.includes(`href="${brightEvidence.sources.countryTerms.sourceUrl}"`) && visible.includes(brightEvidence.sources.countryTerms.sourceCapturedAt), 'forex guide cites and dates the separate Bright Terms')
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
          for (const url of fundedNextAccessEvidence.sourceUrls) assert(html.includes(`href="${url}"`), 'forex country warning links each conflicting FundedNext source')
          assert(html.includes(`href="${brightEvidence.sources.countries.sourceUrl}"`) && visible.includes(`Bright Funded: справка ${brightEvidence.sources.countries.sourceCapturedAt}, условия ${brightEvidence.sources.countryTerms.sourceCapturedAt}`), 'forex country warning cites both dated Bright Funded restriction sources')
          assert(visible.includes(`Общий снимок рынка от ${marketEvidence.capturedAt} не обновлён`), 'scoped country checks do not refresh broad Russian-market research')
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
          assert(visible.includes('карта, сохранённая в аккаунте') && visible.includes(instantEvidence.withdrawal.sourceCapturedAt), 'Instant card route stays conditional and independently dated')
          assert(visible.includes(`ограничений от ${fundedNextAccessEvidence.sourceCapturedAt}`) && visible.includes('Общий снимок рынка от 2026-08-27 остаётся старым'), 'new access check does not relabel the broad market or imply Instant eligibility')
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
  const instantPage = require(path.join(root, 'app/ru/prop-firmy-bez-chelendzha/page.tsx')).default
  const baselineAllChallenges = firmsModule.getAllChallenges
  const brightLineupFixture = baselineAllChallenges()
  const brightFixture = brightLineupFixture.find(product => product.firmSlug === 'bright-funded')
  assert(brightFixture, 'Bright Funded fixture exists for phase and expiry checks')
  const originalBrightPhases = brightFixture.phases
  const originalBrightCapture = brightFixture.sourceCapturedAt
  const savedClock = clock
  try {
    clock = '2026-10-01T12:00:00Z'
    firmsModule.getAllChallenges = () => brightLineupFixture
    brightFixture.phases = 0
    const phaseZeroHtml = renderToStaticMarkup(React.createElement(instantPage))
    assert(phaseZeroHtml.includes('data-russian-instant-bright="phase-zero-listed"'), 'a new verified Bright phase-0 product changes the guide branch')
    assert(phaseZeroHtml.includes(`data-russian-instant-product="bright-funded:${brightFixture.productSlug}"`), 'a verified Bright phase-0 product appears in the comparison')
    brightFixture.phases = originalBrightPhases
    brightFixture.sourceCapturedAt = '2026-08-08'
    const partialExpiryHtml = renderToStaticMarkup(React.createElement(instantPage))
    assert(partialExpiryHtml.includes('data-russian-instant-bright="recapture-required"'), 'one expired Bright product invalidates the full-lineup claim')
    assert(!partialExpiryHtml.includes('Снимок от 2026-08-08: оценочных программ'), 'a partially expired catalogue does not retain current programme counts')
  } finally {
    brightFixture.phases = originalBrightPhases
    brightFixture.sourceCapturedAt = originalBrightCapture
    firmsModule.getAllChallenges = baselineAllChallenges
    clock = savedClock
  }
  assert.deepEqual(errors, [])
  console.log(`Russian expiry rendering passed: ${pages.length} pages plus the English homepage × ${dates.length} dates, covering source day-30/day-31 boundaries.`)
} finally {
  globalThis.Date = RealDate
  hooks.deregister()
}
