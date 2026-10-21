/** Exercise the actual pilot pages, identities, FAQ parity and expiry behavior. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:') ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local?.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})
const RealDate = Date
let now = '2026-10-06T12:00:00Z'
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [now])) }
  static now() { return new RealDate(now).getTime() }
}
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
try {
  const { aiReferral, createAiReferralTracker } = require(path.join(root, 'lib/aiReferral.ts'))
  for (const [host, source] of [['chatgpt.com', 'chatgpt'], ['chat.openai.com', 'chatgpt'], ['www.perplexity.ai', 'perplexity'], ['claude.ai', 'claude'], ['gemini.google.com', 'gemini'], ['copilot.microsoft.com', 'copilot']]) {
    assert.deepEqual(aiReferral(`https://${host}/private/prompt?email=person@example.com`, '?email=other@example.com'), { ai_source: source, ai_source_signal: 'referrer' })
  }
  for (const referrer of ['https://google.com/search?q=private', 'https://bing.com/chat', 'https://chatgpt.com.attacker.example/', 'https://chatgpt.com@attacker.example/', 'https://attacker.example/?next=https://chatgpt.com', 'javascript:chatgpt.com', '', 'not a URL']) {
    assert.deepEqual(aiReferral(referrer, ''), {}, 'ordinary search and spoofed hosts are not labelled AI')
  }
  for (const label of ['__proto__', 'constructor', 'toString', 'chatgpt.com.evil', 'person@example.com']) assert.deepEqual(aiReferral('', `?utm_source=${label}`), {})
  assert.deepEqual(aiReferral('', '?utm_source=CHATGPT.COM'), { ai_source: 'chatgpt', ai_source_signal: 'utm_source' })
  const remember = createAiReferralTracker()
  const landing = remember('https://chatgpt.com/?secret=hidden', '?utm_source=google')
  assert.equal(landing.ai_source, 'chatgpt', 'known referrer wins over a self-reported label')
  assert.deepEqual(remember('https://chatgpt.com/', '?utm_source=google'), landing, 'repeated calls on the landing page retain the initial signal')
  assert.deepEqual(remember('', '?size=100000'), landing, 'internal navigation keeps the category')
  assert.deepEqual(remember('', '?utm_source=perplexity'), { ai_source: 'perplexity', ai_source_signal: 'utm_source' })
  assert.deepEqual(remember('', '?utm_source=newsletter'), {}, 'a new non-AI campaign clears attribution')
  assert.deepEqual(createAiReferralTracker()('', ''), {}, 'separate journeys inherit nothing')

  const emitted = []
  const clientModule = { exports: {} }
  const mockWindow = { location: { pathname: '/blog/ftmo-review', search: '' }, queueMicrotask: callback => callback(), dispatchEvent: () => {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'lib/clientAnalytics.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module: clientModule, exports: clientModule.exports, window: mockWindow, document: { referrer: 'https://chatgpt.com/prompt?secret=hidden' },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
    require: name => name === '@vercel/analytics' ? { track: (event, properties) => emitted.push({ event, properties }) }
      : name === './analyticsTaxonomy' ? require(path.join(root, 'lib/analyticsTaxonomy.ts'))
      : name === './aiReferral' ? { createAiReferralTracker } : assert.fail(`Unexpected import ${name}`),
  })
  clientModule.exports.trackSiteEvent('newsletter_pending')
  mockWindow.location.pathname = '/compare/ftmo-vs-fundednext'
  clientModule.exports.trackSiteEvent('official_site_click')
  assert(emitted.every(event => event.properties.ai_source === 'chatgpt'), 'client events retain the same journey category')
  assert(!JSON.stringify(emitted).includes('secret'), 'raw referrer paths, queries and prompts are never emitted')

  const { extractArticleFaq, articlePlainText } = require(path.join(root, 'lib/articleContent.ts'))
  const { getPostBySlug, getPageBySlug } = require(path.join(root, 'lib/mdx.ts'))
  const { getChallengesByFirm, getAllFirms } = require(path.join(root, 'lib/firms.ts'))
  const { authorSchema } = require(path.join(root, 'lib/schema.ts'))
  const { challengeSourceDestination, challengeSourceLink } = require(path.join(root, 'lib/challengeSources.ts'))
  const { outboundSlug } = require(path.join(root, 'lib/outboundDestinations.ts'))
  const { getOverlay } = require(path.join(root, 'lib/comparisons.ts'))
  const { goClickEventName } = require(path.join(root, 'lib/analyticsTaxonomy.ts'))
  const { decoratePostOutboundLinks } = require(path.join(root, 'lib/postOutboundLinks.ts'))
  const { capturedEntryFees } = require(path.join(root, 'components/ReviewProductSummary.tsx'))
  const Blog = require(path.join(root, 'app/blog/[slug]/page.tsx')).default
  const Compare = require(path.join(root, 'app/compare/[matchup]/page.tsx')).default
  const Page = require(path.join(root, 'app/[slug]/page.tsx')).default
  const pilot = JSON.parse(fs.readFileSync(path.join(root, 'content/data/geo-pilot.json'), 'utf8'))
  // Freeze the clock relative to the pilot pages' own captures. A literal date falls
  // behind every recapture, and future-dated captures fail closed by design.
  const pilotCaptureDates = [...pilot.pages, ...pilot.additionalPages].filter(page => page.productCards > 0).flatMap(page => {
    const firm = getAllFirms().find(item => item.reviewUrl === page.path)
    return getChallengesByFirm(outboundSlug(firm.name)).map(product => product.sourceCapturedAt)
  }).sort()
  const latestPilotCapture = new RealDate(`${pilotCaptureDates.at(-1)}T12:00:00Z`)
  now = latestPilotCapture.toISOString()
  assert.equal(pilot.promptSet.length, 20)
  assert.equal(new Set(pilot.promptSet.map(prompt => prompt.id)).size, 20)
  assert(pilot.promptSet.every(prompt => pilot.pages.some(page => page.path === prompt.path)))
  assert.equal(pilot.observations.length, 0, 'no citation results are fabricated')
  assert.deepEqual(extractArticleFaq('<h2>Not FAQ</h2><h3>Ignore?</h3><p>Ignore.</p><h2>FAQ</h2><!-- <h3>Fake?</h3><p>Fake</p> --><h3>Cost &amp; fee?</h3><p>Read <a href="/cost">the model</a>.</p><p>Second paragraph.</p><h3>Empty?</h3><h2>Other</h2><p>Excluded.</p>'), [{ q: 'Cost & fee?', a: 'Read the model. Second paragraph.' }])
  assert(!authorSchema('Unregistered Writer').url, 'unregistered authors do not get invented profiles')

  const reviewPages = [...pilot.pages, ...pilot.additionalPages].filter(page => page.productCards > 0)
  const sourceRoute = require(path.join(root, 'app/go/[firm]/route.ts'))
  const sourceLogs = []
  const realInfo = console.info
  for (const page of reviewPages) {
    const slug = page.path.split('/').at(-1)
    const firm = getAllFirms().find(item => item.reviewUrl === page.path)
    const firmSlug = outboundSlug(firm.name)
    const html = renderToStaticMarkup(await Blog({ params: Promise.resolve({ slug }) }))
    const body = getPostBySlug(slug).content
    const ld = schemas(html)
    const faq = ld.find(node => node['@type'] === 'FAQPage')
    assert.deepEqual(faq.mainEntity.map(question => ({ q: question.name, a: question.acceptedAnswer.text })), extractArticleFaq(body), 'FAQ schema mirrors visible authored answers')
    assert(faq.mainEntity.length >= 5 && faq.mainEntity.length <= 7, `${slug}: editorial FAQ stays within 5–7 questions`)
    const review = ld.find(node => node['@type'] === 'Review')
    assert.equal(review.mainEntityOfPage, `https://tradersfundhub.com/blog/${slug}`)
    assert(review.author.url && html.includes(new URL(review.author.url).pathname), 'schema identity points to the visible author profile')
    assert.equal(review.author['@id'], review.author.url + '#person')
    assert.deepEqual(review.citation.map(citation => citation.url).sort(), [...new Set(getChallengesByFirm(firmSlug).map(product => product.sourceUrl))].sort(), 'structured citations use actual captured first-party URLs')
    const productBlock = html.match(/<aside class="review-product-summary"[\s\S]*?<\/aside>/)?.[0]
    assert(productBlock, `${slug}: product summary renders`)
    for (const product of getChallengesByFirm(firmSlug)) {
      assert(productBlock.includes(`data-review-product="${product.productSlug}"`))
      assert(productBlock.includes(product.sourceCapturedAt))
      if (product.profitSplitPct != null) assert(productBlock.includes(`${product.profitSplitPct}%`))
      for (const fee of capturedEntryFees(product)) assert(articlePlainText(productBlock).includes(fee.text))
      assert(productBlock.includes(challengeSourceLink(product).replaceAll('&', '&amp;')), 'each card routes to its own captured source')
      assert.equal(challengeSourceDestination(firm, product.productSlug, getChallengesByFirm(firmSlug)), product.sourceUrl)
      try {
        console.info = line => sourceLogs.push(JSON.parse(line))
        const response = await sourceRoute.GET(new Request(`https://tradersfundhub.com${challengeSourceLink(product)}&url=https://attacker.example/`), { params: Promise.resolve({ firm: firmSlug }) })
        assert.equal(response.status, 302)
        assert.equal(response.headers.get('location'), product.sourceUrl, 'source redirect ignores injected destinations and affiliate URLs')
        assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
        assert.equal(response.headers.get('cache-control'), 'no-store')
      } finally { console.info = realInfo }
    }
    if (firmSlug === 'ftmo') assert(productBlock.includes('80%') && productBlock.includes('90%') && productBlock.includes('eod trailing') && productBlock.includes('static'))
    if (firmSlug === 'fundednext') assert(productBlock.includes('70%') && productBlock.includes('80%') && !productBlock.includes('95%'))
    if (firmSlug === 'topstep') assert(productBlock.includes('/month') && productBlock.includes('$149.00 activation') && productBlock.includes('Unverified'))
    if (firmSlug === 'fundingpips') assert(productBlock.includes('Other tier fees unverified'), 'unresolved 2.5K fees are not treated as the cheapest tier')
    if (firmSlug === 'e8-markets') {
      assert(productBlock.includes('Open watch:') && productBlock.includes('e8-pro-current-page-vs-help-prices'))
      // Data-driven: the E8 One default conflict was resolved on 2026-10-19, so only
      // products still under an open source-conflict/price watch must be withheld.
      const watch = JSON.parse(fs.readFileSync(path.join(root, 'content/data/challenge-watch.json'), 'utf8'))
      const unsettled = new Set(watch.filter(entry => entry.firmSlug === 'e8-markets' && entry.status === 'watch' && ['source-conflict', 'price-watch'].includes(entry.kind)).flatMap(entry => entry.productSlugs))
      assert(unsettled.has('e8-pro'), 'fixture still exercises an open E8 watch')
      const offerNames = review.itemReviewed.offers.map(offer => offer.name)
      for (const product of getChallengesByFirm(firmSlug).filter(item => unsettled.has(item.productSlug))) {
        assert(!offerNames.some(name => name.startsWith(`${product.productName} — `)), `unsettled ${product.productName} does not emit a checkout price offer`)
      }
      assert(offerNames.includes('E8 Signature Forex — $25,000 account'), 'settled products still emit offers')
      assert(productBlock.includes('rating is unavailable'), 'suppressed Trustpilot aggregate is rendered as a finding')
    }
    if (firmSlug === 'fxify') {
      assert(productBlock.includes('<details') && productBlock.includes(`See ${getChallengesByFirm(firmSlug).length - 2} more captured products`), 'long product menus render in a native disclosure')
      const instantLiteCard = productBlock.match(/data-review-product="instant-funding-lite">([\s\S]*?)<\/dl>/)?.[1]
      assert(instantLiteCard.includes('Minimum trading days</dt><dd>5'), 'instant account minimum days are not replaced by no evaluation')
      assert(instantLiteCard.includes('Base funded profit split</dt><dd>Unverified'), 'unverified split remains unknown')
      assert(!body.includes('maximum-loss type is unstated') && !body.includes('drawdown type is not stated') && body.includes('Two Phase Pro publishes an 8% static'), 'prose and captured drawdown agree')
    }
    if (firmSlug === 'alpha-capital') {
      const products = getChallengesByFirm(firmSlug)
      assert.equal(products.length, 10, 'Pro target and payout choices are separate captured configurations')
      assert.equal(products.flatMap(product => product.accountSizes).length, 60)
      const bySlug = slug => products.find(product => product.productSlug === slug)
      assert.equal(bySlug('alpha-pro-6').accountSizes[0].priceUsd, 30)
      assert.equal(bySlug('alpha-pro-6-on-demand').accountSizes[0].priceUsd, 27)
      assert.equal(bySlug('alpha-pro-6').consistencyRulePct, null, 'bi-weekly does not inherit the on-demand best-day rule')
      assert.notEqual(bySlug('alpha-pro-6').consistencyRuleApplies, false, 'unknown bi-weekly consistency is not permission')
      assert.equal(bySlug('alpha-pro-6-on-demand').consistencyRulePct, 40)
      assert.equal(bySlug('alpha-direct').accountSizes[0].priceUsd, 30)
      const directCard = productBlock.match(/data-review-product="alpha-direct">([\s\S]*?)<\/dl>/)?.[1]
      assert(directCard.includes('$0.00 activation fee') && !directCard.includes('after passing'), 'instant-account activation does not imply an evaluation phase')
      assert.equal(bySlug('alpha-three').sourceCapturedAt, '2026-09-14', 'availability observations do not refresh a partial product capture')
      assert(productBlock.includes('See 8 more captured products') && productBlock.includes('alpha-three-purchase-availability-conflict'))
      assert.equal(review.itemReviewed.offers.length, 5, 'only four settled Pro configurations and Direct emit offers')
      assert(review.itemReviewed.offers.every(offer => !/One|Swing|Three|Pro \(6%/.test(offer.name)), 'source-conflict configurations are not promoted as settled offers')
      assert(body.includes('stops moving') && !body.includes('$101,520'), 'review explains the balance-based trailing lock rather than an endless equity floor')
      assert(!body.includes('consistency rule applies to every evaluation'), 'qualified payout consistency is not advertised as an evaluation rule')
      const archive = JSON.parse(fs.readFileSync(path.join(root, 'content/data/challenges/_captures/alpha-capital-2026-10-06.json'), 'utf8'))
      assert.equal(archive.reviewStatus, 'ready')
      assert.deepEqual(archive.releaseBlockers, [])
      assert(fs.existsSync(path.join(root, 'content/data/challenges/_captures/alpha-capital-2026-09-14.json')), 'prior capture provenance remains available')
    }
  }
  assert(sourceLogs.every(event => event.event === 'source_click' && event.source_product && !event.ip && !event.referrer && !event.url), 'source clicks are research events without personal URL data')
  const fixtureFirm = getAllFirms().find(firm => firm.name === 'FundedNext')
  const fixtureProduct = getChallengesByFirm('fundednext')[0]
  for (const sourceUrl of ['https://fundednext.com.attacker.example/', 'https://attackerfundednext.com/', 'https://person:secret@fundednext.com/rules', 'http://fundednext.com/rules', 'https://fundednext.com:8443/rules', '/relative']) {
    assert.equal(challengeSourceDestination(fixtureFirm, fixtureProduct.productSlug, [{ ...fixtureProduct, sourceUrl }]), null)
  }
  assert.equal(challengeSourceDestination(fixtureFirm, fixtureProduct.productSlug, [{ ...fixtureProduct, sourceUrl: 'https://help.fundednext.com/rules' }]), 'https://help.fundednext.com/rules')
  for (const [firm, source] of [['fundednext', 'not-a-product'], ['ftmo', fixtureProduct.productSlug], ['fundednext', 'https://attacker.example'], ['fundednext', ''], ['unregistered', fixtureProduct.productSlug]]) {
    const response = await sourceRoute.GET(new Request(`https://tradersfundhub.com/go/${firm}?source=${encodeURIComponent(source)}`), { params: Promise.resolve({ firm }) })
    assert.equal(response.status, 404, 'invalid and cross-firm sources never become affiliate redirects')
    assert.equal(response.headers.get('location'), null)
  }
  const relationships = { fundednext: 'affiliate', ftmo: 'official' }
  assert.equal(goClickEventName('fundednext', relationships, true), 'source_click')
  assert.equal(goClickEventName('fundednext', relationships), 'affiliate_click')
  assert.equal(goClickEventName('ftmo', relationships), 'official_site_click')
  assert.equal(goClickEventName('unknown', relationships, true), null)
  const decoratedSource = decoratePostOutboundLinks('<a href="/go/fundednext?source=stellar-2-step">Source</a>', relationships, 'fundednext-review')
  assert(decoratedSource.includes('rel="nofollow noopener"') && !decoratedSource.includes('sponsored'))
  const ctaResponse = await sourceRoute.GET(new Request('https://tradersfundhub.com/go/fundednext?from=review-cta'), { params: Promise.resolve({ firm: 'fundednext' }) })
  assert.equal(new URL(ctaResponse.headers.get('location')).searchParams.get('utm_medium'), 'affiliate', 'existing purchase CTA attribution remains intact')
  const instant = getChallengesByFirm('fundednext').find(product => product.phases === 0)
  assert(capturedEntryFees({ ...instant, accountSizes: instant.accountSizes.map(tier => ({ ...tier, priceUsd: null })) }).length === 0, 'missing prices do not become zero or borrowed fees')
  const euro = getChallengesByFirm('ftmo')[0]
  assert(capturedEntryFees(euro).every(fee => fee.currency === 'EUR'), 'EUR fee never gets silently converted to USD')

  const costHtml = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: 'true-cost-of-prop-firm-challenges' }) }))
  const costLd = schemas(costHtml)
  assert.equal(costLd.find(node => node['@type'] === 'Article').author['@type'], 'Organization')
  assert(costHtml.includes('By Traders Fund Hub') && costHtml.includes('aria-label="On this page"'))
  assert.deepEqual(costLd.find(node => node['@type'] === 'FAQPage').mainEntity.map(question => ({ q: question.name, a: question.acceptedAnswer.text })), extractArticleFaq(getPageBySlug('true-cost-of-prop-firm-challenges').content, 'Common cost questions'))
  const compareHtml = renderToStaticMarkup(await Compare({ params: Promise.resolve({ matchup: 'ftmo-vs-fundednext' }) }))
  const compareFaq = schemas(compareHtml).find(node => node['@type'] === 'FAQPage')
  if (getOverlay('ftmo-vs-fundednext')) {
    assert(compareHtml.includes('5-business-day'))
    assert.equal(compareFaq.mainEntity.length, 7)
  } else {
    // The 2026-10-01 editorial overlay predates the 2026-10-19 recaptures, so its
    // hand-written FAQ must not be published as current structured evidence.
    assert.equal(compareFaq, undefined, 'stale overlay FAQ is not promoted as structured evidence')
  }
  for (const href of ['/blog/ftmo-review', '/blog/fundednext-review', '/true-cost-of-prop-firm-challenges', '/methodology']) assert(compareHtml.includes(`href="${href}"`))

  now = new RealDate(latestPilotCapture.getTime() + 31 * 86_400_000).toISOString()
  for (const slug of reviewPages.map(page => page.path.split('/').at(-1))) {
    const html = renderToStaticMarkup(await Blog({ params: Promise.resolve({ slug }) }))
    assert(html.includes('data-review-source-status="recapture-required"'))
    assert(!schemas(html).some(node => node['@type'] === 'FAQPage'), 'expired product FAQ is not promoted as current structured evidence')
    const productBlock = html.match(/<aside class="review-product-summary"[\s\S]*?<\/aside>/)?.[0]
    assert(productBlock.includes('Source recheck required') && !productBlock.includes('Lowest captured list fee'), 'expired summaries withhold financial terms in a warm process')
  }
  console.log('GEO passed: 9 actual pages, FAQ parity, first-party source routing, Alpha target/schedule corrections, unsettled offer suppression, expanded product menus, expiry, 20 fixed prompts and bounded attribution.')
} finally {
  globalThis.Date = RealDate
  hooks.deregister()
}
