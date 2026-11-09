/**
 * Evidence-only country pages (lib/countryPages.ts): discovery, 30-day gate,
 * verdict + ≥5 differing-field gate, robots/sitemap/hreflang, RU path/order/CTA,
 * and proof that UK / US / India are never emitted by the template.
 *
 * Every country fixture is written to a temp dir at test time and deleted;
 * TFH_COUNTRY_CONTENT_ROOT points the module (and app/sitemap.ts) at it.
 * Run: npm run test:country-pages
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const require = createRequire(import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'test:server-only', shortCircuit: true }
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:') ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local?.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
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

/** Fingerprint a repo tree — the test must leave content/ byte-identical. */
function fingerprint(dir) {
  const out = []
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else out.push(`${path.relative(root, full)}:${crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')}`)
    }
  }
  walk(path.join(root, dir))
  return out.sort()
}
const contentBefore = [...fingerprint('content/data'), ...fingerprint('content/verdicts')]
const tempRoots = []

const DAY = 86_400_000
const now = new Date()
const isoDaysAgo = days => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - days * DAY).toISOString().slice(0, 10)
const FRESH = isoDaysAgo(2)
const EDGE = isoDaysAgo(30)
const STALE = isoDaysAgo(31)

function verdictMd(slug, lang) {
  const words = Array.from({ length: 140 }, (_, index) => `fixture${index}`).join(' ')
  return `---\nslug: ${slug}\nlang: ${lang}\ncheckedAt: '${FRESH}'\nauthor: Fixture Writer\nsources:\n  - title: Fixture source\n    url: 'https://example.com/policy'\n---\n${words}\n`
}

/** Temp content root: { 'content/data/x.json': object | string, ... }. */
function makeRoot(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'country-pages-'))
  tempRoots.push(dir)
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), typeof body === 'string' ? body : JSON.stringify(body, null, 2))
  }
  return dir
}

let passed = 0
const check = (label, fn) => { fn(); passed += 1; console.log(`ok - ${label}`) }

try {
  const cp = require(path.join(root, 'lib/countryPages.ts'))
  const { getAllFirms, getChallengesByFirm, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
  const { firmSlug } = require(path.join(root, 'lib/firmSlug.ts'))

  // Real firms whose UK-mapped products are all current right now: reused as fixture rows
  // only (temp dir), so the diff gate runs on live product data without inventing products.
  const uk = JSON.parse(fs.readFileSync(path.join(root, 'content/data/uk-access-evidence.json'), 'utf8'))
  const firmSlugs = new Set(getAllFirms().map(firm => firmSlug(firm.name)))
  const currentRows = uk.firms.filter(row => {
    if (!firmSlugs.has(row.firmSlug)) return false
    const bySlug = new Map(getChallengesByFirm(row.firmSlug).map(product => [product.productSlug, product]))
    return row.productSlugs.every(slug => bySlug.get(slug) && isChallengeFresh(bySlug.get(slug), now) && bySlug.get(slug).soldToNewBuyers !== false)
  })
  assert.ok(currentRows.length >= 3, `need ≥3 current UK-mapped firms for fixtures (have ${currentRows.length})`)
  const rows = (captured, take = currentRows.length) => currentRows.slice(0, take).map(row => ({
    ...row,
    sourceCapturedAt: captured,
    evidenceLabel: 'Fixture country policy',
    evidenceSummary: `Fixture summary for ${row.firmSlug}.`,
    decisionNote: 'Fixture decision note.',
  }))
  const evidence = (firms, extra = {}) => ({ methodology: 'Fixture methodology.', firms, ...extra })
  const meta = { countryCode: 'NG', name: { en: 'Nigeria', ru: 'Нигерия' }, ruSlug: 'nigerii' }

  // ── 1. No evidence file → no page, no route, no sitemap entry ─────────────
  check('live repo: discovery skips uk/us (own hubs), india (other schema) and firm-level *-access-evidence files; Tracker evidence without verdicts stays noindex and out of the sitemap', () => {
    delete process.env.TFH_COUNTRY_CONTENT_ROOT
    const slugs = cp.listCountryDefinitions().map(country => country.slug)
    for (const own of ['uk', 'us', 'india']) assert.ok(!slugs.includes(own), `${own} must not be emitted by the template`)
    for (const slug of slugs) {
      assert.ok(fs.existsSync(path.join(root, `content/data/${slug}-access-evidence.json`)), `${slug} is discovered only from content/data/${slug}-access-evidence.json`)
    }
    assert.equal(cp.allCountryPaths().length, slugs.length * 2, 'one EN + one RU path per discovered country')
    assert.equal(cp.countryEnSegments().length, slugs.length)
    assert.equal(cp.countryRuSegments().length, slugs.length)
    if (!fs.existsSync(path.join(root, 'content/verdicts/country'))) {
      // No writer verdicts committed: every live country model must be noindex and absent from the sitemap.
      assert.deepEqual(cp.indexableCountryPaths(now), [], 'no country path is indexable without a writer verdict')
      for (const model of cp.getCountryPageModels(now)) assert.equal(model.indexable, false, `${model.path} must be noindex without a verdict`)
    }
  })
  check('empty fixture root: no definitions, no models, metadata noindex', () => {
    const empty = makeRoot({ 'content/data/.keep': '' })
    assert.deepEqual(cp.listCountryDefinitions(empty), [])
    assert.deepEqual(cp.getCountryPageModels(now, empty), [])
    assert.equal(cp.buildCountryPageModel('nigeria', 'en', now, empty), null)
    assert.deepEqual(cp.indexableCountryPaths(now, empty), [])
    assert.equal(cp.countryRoutePair('/best-prop-firms-in-nigeria', now, empty), undefined)
  })

  // ── 2. Stale evidence (>30 days) → not indexable ──────────────────────────
  check('evidence older than 30 days lists no firm and stays noindex (even with verdict)', () => {
    const dir = makeRoot({
      'content/data/nigeria-access-evidence.json': evidence(rows(STALE), meta),
      'content/verdicts/country/nigeria.md': verdictMd('nigeria', 'en'),
      'content/verdicts/country/nigeria.ru.md': verdictMd('nigeria', 'ru'),
    })
    for (const lang of ['en', 'ru']) {
      const model = cp.buildCountryPageModel('nigeria', lang, now, dir)
      assert.ok(model, `${lang} page exists (noindex) while the file exists`)
      assert.equal(model.ranked.length, 0)
      assert.equal(model.excludedCount, currentRows.length)
      assert.equal(model.indexable, false)
      assert.ok(model.reasons.some(reason => reason.includes('≤30 days')))
    }
    assert.deepEqual(cp.indexableCountryPaths(now, dir), [])
    assert.equal(cp.isCountryEvidenceFresh(EDGE, now), true, 'day 30 is still fresh (UK rule)')
    assert.equal(cp.isCountryEvidenceFresh(STALE, now), false, 'day 31 is stale')
    assert.equal(cp.isCountryEvidenceFresh(isoDaysAgo(-1), now), false, 'future capture is not fresh')
  })

  // ── 3. Fresh evidence + verdict + ≥5 differing fields → indexable ────────
  const goodRoot = makeRoot({
    'content/data/nigeria-access-evidence.json': evidence(rows(FRESH), { ...meta, unknownExtra: { ignored: true } }),
    'content/verdicts/country/nigeria.md': verdictMd('nigeria', 'en'),
    'content/verdicts/country/nigeria.ru.md': verdictMd('nigeria', 'ru'),
  })
  check('fresh evidence + EN/RU verdicts + ≥5 differing fields → both indexable, hreflang pair', () => {
    const en = cp.buildCountryPageModel('nigeria', 'en', now, goodRoot)
    const ru = cp.buildCountryPageModel('nigeria', 'ru', now, goodRoot)
    assert.equal(en.path, '/best-prop-firms-in-nigeria')
    assert.equal(ru.path, '/ru/luchshie-prop-firmy-v-nigerii')
    assert.equal(en.country.countryCode, 'NG')
    assert.ok(en.differingFieldCount >= cp.COUNTRY_MIN_DIFF_FIELDS, `diff fields ${en.differingFieldCount}`)
    assert.equal(en.indexable, true, en.reasons.join('; '))
    assert.equal(ru.indexable, true, ru.reasons.join('; '))
    assert.deepEqual(cp.indexableCountryPaths(now, goodRoot).sort(), [en.path, ru.path].sort())
    assert.deepEqual(cp.countryRoutePair(en.path, now, goodRoot), { en: en.path, ru: ru.path })
    assert.deepEqual(cp.countryRoutePair(ru.path, now, goodRoot), { en: en.path, ru: ru.path })
    // EN order = editorial score desc (UK pattern)
    const scores = en.ranked.map(row => row.firm.score)
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
    // RU order: Russia-available first (active pin first), CTA only for available, FundedNext last among the rest
    const openFlags = ru.ranked.map(row => row.russiaStatus === 'available')
    assert.deepEqual(openFlags, [...openFlags].sort((a, b) => Number(b) - Number(a)), 'available firms lead the RU list')
    for (const row of ru.ranked) assert.equal(row.showRuSignupCta, row.russiaStatus === 'available', `${row.slug} CTA follows russiaStatus`)
    for (const row of en.ranked) assert.equal(row.showRuSignupCta, false)
    const bright = ru.ranked.findIndex(row => row.slug === 'bright-funded')
    if (bright >= 0 && ru.ranked[bright].russiaStatus === 'available') assert.equal(bright, 0, 'BrightFunded pin leads')
    const rest = ru.ranked.filter(row => row.russiaStatus !== 'available')
    const fn = rest.findIndex(row => row.slug === 'fundednext')
    if (fn >= 0) assert.equal(fn, rest.length - 1, 'FundedNext last among non-available')
  })
  check('explicit accessStatus qualifies; restricted / unknown statuses never do; partial product mapping excludes the firm', () => {
    const [a, b, c] = rows(FRESH)
    const dir = makeRoot({
      'content/data/nigeria-access-evidence.json': evidence([
        { ...a, accessStatus: 'explicit' },
        { ...b, accessStatus: 'restricted' },
        { ...c, productSlugs: [...c.productSlugs, 'no-such-product'] },
      ], meta),
    })
    const model = cp.buildCountryPageModel('nigeria', 'en', now, dir)
    assert.deepEqual(model.ranked.map(row => row.slug), [a.firmSlug])
    assert.equal(model.excludedCount, 2)
  })

  // ── Product-line rows: several rows per firmSlug → one card, row-scoped products ─
  {
    const multi = currentRows.find(row => row.productSlugs.length >= 2)
    assert.ok(multi, 'need a current firm with ≥2 mapped products')
    const others = rows(FRESH).filter(row => row.firmSlug !== multi.firmSlug)
    const [first, ...rest] = multi.productSlugs
    const cfdRow = { ...rows(FRESH).find(row => row.firmSlug === multi.firmSlug), productSlugs: [first], assetClass: 'cfd', sourceUrl: 'https://example.com/cfd-policy', evidenceLabel: 'Fixture CFD policy' }
    const futRow = { ...cfdRow, productSlugs: rest, assetClass: 'futures', platformConstraint: 'Fixture-Trader only', sourceUrl: 'https://example.com/futures-policy', evidenceLabel: 'Fixture futures policy' }
    const staleRow = { ...cfdRow, sourceCapturedAt: STALE, sourceUrl: 'https://example.com/stale-policy', evidenceLabel: 'Fixture stale policy' }
    const dir = makeRoot({
      'content/data/nigeria-access-evidence.json': evidence([cfdRow, ...others, futRow, staleRow], meta),
      'content/verdicts/country/nigeria.md': verdictMd('nigeria', 'en'),
      'content/verdicts/country/nigeria.ru.md': verdictMd('nigeria', 'ru'),
    })
    for (const lang of ['en', 'ru']) {
      const model = cp.buildCountryPageModel('nigeria', lang, now, dir)
      const cards = model.ranked.filter(row => row.slug === multi.firmSlug)
      assert.equal(cards.length, 1, `${lang}: one card for ${multi.firmSlug}`)
      const card = cards[0]
      assert.equal(card.groups.length, 2, 'stale row dropped, both fresh rows kept (not last-row-wins)')
      assert.deepEqual(card.groups.map(group => group.products.map(product => product.productSlug)), [[first], rest], 'products stay scoped to their own row')
      assert.deepEqual(card.groups.map(group => group.evidence.sourceUrl), ['https://example.com/cfd-policy', 'https://example.com/futures-policy'])
      assert.equal(card.groups[1].evidence.platformConstraint, 'Fixture-Trader only')
      assert.equal(card.products.length, multi.productSlugs.length)
      assert.equal(model.firmCount, new Set(model.ranked.map(row => row.slug)).size)
      assert.equal(model.firmCount, others.length + 1, 'unique firmSlugs, not raw rows')
      assert.equal(model.excludedCount, 1, 'only the stale row is excluded')
      assert.ok(model.h1.includes(`${model.firmCount} `), 'h1 count = unique firms')
    }
    process.env.TFH_COUNTRY_CONTENT_ROOT = dir
    const CountryPage = require(path.join(root, 'components/CountryPage.tsx')).default
    const enModel = cp.buildCountryPageModel('nigeria', 'en')
    const enHtml = renderToStaticMarkup(createElement(CountryPage, { model: enModel }))
    const ruHtml = renderToStaticMarkup(createElement(CountryPage, { model: cp.buildCountryPageModel('nigeria', 'ru') }))
    delete process.env.TFH_COUNTRY_CONTENT_ROOT
    for (const html of [enHtml, ruHtml]) {
      assert.ok(html.includes('Fixture-Trader only'), 'platformConstraint rendered')
      assert.ok(html.includes('https://example.com/cfd-policy') && html.includes('https://example.com/futures-policy'), 'both row sources rendered')
      assert.ok(!html.includes('https://example.com/stale-policy'), 'stale row source not rendered')
    }
    assert.ok(enHtml.includes('Fixture futures policy (Futures · Platform: Fixture-Trader only)'), 'EN evidence link carries the row scope')
    assert.ok(enHtml.includes(`${enModel.firmCount} <!-- -->firms`) || enHtml.includes(`${enModel.firmCount} firms`), 'visible firm count = unique firms')
    assert.equal((ruHtml.match(/data-country-platform-constraint="true"/g) ?? []).length, 1)
    passed += 1
    console.log('ok - two rows for one firmSlug → one card, row-scoped products/sources, platformConstraint surfaced, unique firm count')
  }

  // ── 4. Fresh evidence but missing verdict / <5 diffs / missing name → noindex ─
  check('fresh evidence without verdict → noindex; RU verdict alone does not lift EN; no hreflang', () => {
    const dir = makeRoot({
      'content/data/nigeria-access-evidence.json': evidence(rows(FRESH), meta),
      'content/verdicts/country/nigeria.ru.md': verdictMd('nigeria', 'ru'),
    })
    const en = cp.buildCountryPageModel('nigeria', 'en', now, dir)
    const ru = cp.buildCountryPageModel('nigeria', 'ru', now, dir)
    assert.equal(en.indexable, false)
    assert.ok(en.reasons.some(reason => reason.includes('missing writer verdict')))
    assert.equal(ru.indexable, true, ru.reasons.join('; '))
    assert.equal(cp.countryRoutePair(en.path, now, dir), undefined, 'hreflang only when both sides indexable')
    assert.deepEqual(cp.indexableCountryPaths(now, dir), [ru.path])
  })
  check('fresh evidence + verdict but one firm (<5 differing fields) → noindex', () => {
    const dir = makeRoot({
      'content/data/nigeria-access-evidence.json': evidence(rows(FRESH, 1), meta),
      'content/verdicts/country/nigeria.md': verdictMd('nigeria', 'en'),
    })
    const en = cp.buildCountryPageModel('nigeria', 'en', now, dir)
    assert.equal(en.ranked.length, 1)
    assert.ok(en.differingFieldCount < cp.COUNTRY_MIN_DIFF_FIELDS)
    assert.equal(en.indexable, false)
  })
  check('no name metadata → raw slug shown, never a derived name, stays noindex; no RU page without name.ru', () => {
    const dir = makeRoot({
      'content/data/nigeria-access-evidence.json': evidence(rows(FRESH), { ruSlug: 'nigerii' }),
      'content/verdicts/country/nigeria.md': verdictMd('nigeria', 'en'),
    })
    const en = cp.buildCountryPageModel('nigeria', 'en', now, dir)
    assert.equal(en.country.displayName, 'nigeria')
    assert.equal(en.country.names.en, null)
    assert.equal(en.indexable, false)
    assert.ok(en.reasons.some(reason => reason.includes('name.en')))
    assert.equal(cp.buildCountryPageModel('nigeria', 'ru', now, dir), null)
    assert.equal(en.twinPath, null)
  })

  // ── RU path: ruInfix ──────────────────────────────────────────────────────
  check('ruInfix "na" → /ru/luchshie-prop-firmy-na-<ruSlug>; omitted → v-', () => {
    const dir = makeRoot({
      'content/data/philippines-access-evidence.json': evidence(rows(FRESH), { countryCode: 'PH', name: { en: 'Philippines', ru: 'Филиппины' }, ruSlug: 'filippinakh', ruInfix: 'na' }),
      'content/data/nigeria-access-evidence.json': evidence(rows(FRESH), meta),
    })
    const byslug = Object.fromEntries(cp.listCountryDefinitions(dir).map(country => [country.slug, country]))
    assert.equal(byslug.philippines.ruPath, '/ru/luchshie-prop-firmy-na-filippinakh')
    assert.equal(byslug.philippines.enPath, '/best-prop-firms-in-philippines')
    assert.equal(byslug.nigeria.ruPath, '/ru/luchshie-prop-firmy-v-nigerii')
    assert.equal(cp.countryRuSegment('oae'), 'luchshie-prop-firmy-v-oae')
    assert.deepEqual(cp.countryRuSegments(dir).sort(), ['luchshie-prop-firmy-na-filippinakh', 'luchshie-prop-firmy-v-nigerii'])
  })

  // ── Discovery paths + validation ─────────────────────────────────────────
  check('country-access/<slug>.json extra path works; same slug twice fails; invalid file fails loudly; non-country shape skipped', () => {
    const extra = makeRoot({ 'content/data/country-access/pakistan.json': evidence(rows(FRESH), { name: { en: 'Pakistan', ru: 'Пакистан' } }) })
    assert.deepEqual(cp.listCountryDefinitions(extra).map(country => country.file), ['content/data/country-access/pakistan.json'])
    const dup = makeRoot({
      'content/data/pakistan-access-evidence.json': evidence(rows(FRESH)),
      'content/data/country-access/pakistan.json': evidence(rows(FRESH)),
    })
    assert.throws(() => cp.listCountryDefinitions(dup), /exists twice/)
    const bad = makeRoot({ 'content/data/nigeria-access-evidence.json': { methodology: 'x', firms: [{ firmSlug: 'ftmo' }] } })
    assert.throws(() => cp.listCountryDefinitions(bad), /Invalid country evidence/)
    const badCode = makeRoot({ 'content/data/uae-access-evidence.json': evidence(rows(FRESH), { countryCode: 'UAE' }) })
    assert.throws(() => cp.listCountryDefinitions(badCode), /alpha-2/)
    const firmLevel = makeRoot({ 'content/data/russian-fundingpips-access-evidence.json': { firmSlug: 'fundingpips', sourceUrl: 'https://example.com' } })
    assert.deepEqual(cp.listCountryDefinitions(firmLevel), [])
  })

  // ── 5. UK / US / India never emitted by the template ─────────────────────
  check('uk/us/india fixture files are skipped (static hubs keep winning)', () => {
    const dir = makeRoot({
      'content/data/uk-access-evidence.json': evidence(rows(FRESH)),
      'content/data/us-access-evidence.json': evidence(rows(FRESH)),
      'content/data/india-access-evidence.json': evidence(rows(FRESH)),
      'content/data/country-access/uk.json': evidence(rows(FRESH)),
    })
    assert.deepEqual(cp.listCountryDefinitions(dir), [])
    for (const slug of ['uk', 'us', 'india']) assert.ok(fs.existsSync(path.join(root, `app/best-prop-firms-in-${slug}`)), `${slug} static hub still exists`)
  })

  // ── Sitemap + robots through the real app modules ────────────────────────
  delete process.env.TFH_COUNTRY_CONTENT_ROOT
  const sitemap = require(path.join(root, 'app/sitemap.ts')).default
  const entries = list => new Map(list.map(entry => [new URL(entry.url).pathname, entry]))
  const baseline = entries(sitemap())
  check('live sitemap: no template country URL; UK/US/India hubs present', () => {
    for (const p of baseline.keys()) {
      assert.ok(!p.startsWith('/ru/luchshie-prop-firmy-v-') && !p.startsWith('/ru/luchshie-prop-firmy-na-'), p)
      if (p.startsWith('/best-prop-firms-in-')) assert.match(p, /^\/best-prop-firms-in-(uk|us|india)(\/|$)/)
    }
    for (const hub of ['/best-prop-firms-in-uk', '/best-prop-firms-in-us', '/best-prop-firms-in-india']) assert.ok(baseline.has(hub), hub)
  })
  const stripTemplate = map => new Map([...map].filter(([p]) => !p.includes('nigeria') && !p.includes('nigerii') && !p.includes('pakistan')))
  check('indexable fixture enters the sitemap with hreflang; every other URL (incl. UK/US/India) unchanged', () => {
    process.env.TFH_COUNTRY_CONTENT_ROOT = goodRoot
    const withCountry = entries(sitemap())
    delete process.env.TFH_COUNTRY_CONTENT_ROOT
    const en = withCountry.get('/best-prop-firms-in-nigeria')
    const ru = withCountry.get('/ru/luchshie-prop-firmy-v-nigerii')
    assert.ok(en && ru, 'both indexable paths listed')
    assert.equal(en.alternates.languages.ru, 'https://tradersfundhub.com/ru/luchshie-prop-firmy-v-nigerii')
    assert.equal(ru.alternates.languages.en, 'https://tradersfundhub.com/best-prop-firms-in-nigeria')
    assert.deepEqual(JSON.parse(JSON.stringify([...stripTemplate(withCountry)])), JSON.parse(JSON.stringify([...baseline])))
  })
  check('noindex fixture (no verdict) stays out of the sitemap', () => {
    const dir = makeRoot({ 'content/data/nigeria-access-evidence.json': evidence(rows(FRESH), meta) })
    process.env.TFH_COUNTRY_CONTENT_ROOT = dir
    const map = entries(sitemap())
    delete process.env.TFH_COUNTRY_CONTENT_ROOT
    assert.ok(!map.has('/best-prop-firms-in-nigeria'))
    assert.ok(!map.has('/ru/luchshie-prop-firmy-v-nigerii'))
    assert.equal(map.size, baseline.size)
  })

  const { countryMetadata } = require(path.join(root, 'lib/countryRoute.tsx'))
  const slugPage = require(path.join(root, 'app/[slug]/(index)/page.tsx'))
  const ruPage = require(path.join(root, 'app/ru/(fallback)/[...missing]/page.tsx'))
  await (async () => {
    // robots + params with a noindex fixture
    const noVerdict = makeRoot({ 'content/data/nigeria-access-evidence.json': evidence(rows(FRESH), meta) })
    process.env.TFH_COUNTRY_CONTENT_ROOT = noVerdict
    const md = countryMetadata('nigeria', 'en')
    assert.deepEqual(md.robots, { index: false, follow: true })
    assert.equal(md.alternates.languages, undefined)
    const meta2 = await slugPage.generateMetadata({ params: Promise.resolve({ slug: 'best-prop-firms-in-nigeria' }) })
    assert.deepEqual(meta2.robots, { index: false, follow: true })
    const ruMeta = await ruPage.generateMetadata({ params: Promise.resolve({ missing: ['luchshie-prop-firmy-v-nigerii'] }) })
    assert.deepEqual(ruMeta.robots, { index: false, follow: true })
    assert.deepEqual(await ruPage.generateMetadata({ params: Promise.resolve({ missing: ['luchshie-prop-firmy-v-nigerii', 'extra'] }) }), {}, 'nested path is not a country page')
    assert.deepEqual(await ruPage.generateMetadata({ params: Promise.resolve({ missing: ['luchshie-prop-firmy-na-nigerii'] }) }), {}, 'wrong infix is not a country page')
    const params = (await slugPage.generateStaticParams()).map(item => item.slug)
    assert.ok(params.includes('best-prop-firms-in-nigeria'))
    for (const hub of ['best-prop-firms-in-uk', 'best-prop-firms-in-us', 'best-prop-firms-in-india']) assert.ok(!params.includes(hub), `${hub} not in [slug] params`)

    process.env.TFH_COUNTRY_CONTENT_ROOT = goodRoot
    const good = countryMetadata('nigeria', 'en')
    assert.equal(good.robots, undefined, 'indexable page has no robots override')
    assert.deepEqual(good.alternates.languages, { en: '/best-prop-firms-in-nigeria', ru: '/ru/luchshie-prop-firmy-v-nigerii', 'x-default': '/best-prop-firms-in-nigeria' })

    // Rendered HTML: disclaimer, evidence links, no banned RU wording, CTA gating.
    const CountryPage = require(path.join(root, 'components/CountryPage.tsx')).default
    const enHtml = renderToStaticMarkup(createElement(CountryPage, { model: cp.buildCountryPageModel('nigeria', 'en') }))
    const ruModel = cp.buildCountryPageModel('nigeria', 'ru')
    const ruHtml = renderToStaticMarkup(createElement(CountryPage, { model: ruModel }))
    assert.ok(enHtml.includes('data-country-indexable="true"'))
    assert.ok(enHtml.includes('data-country-disclaimer="policy-not-checkout"'))
    assert.ok(!/FCA|HMRC|Self Assessment/.test(enHtml), 'no UK-specific FAQ copy on a generic country page')
    for (const row of currentRows) assert.ok(enHtml.includes(row.sourceUrl.replace(/&/g, '&amp;')), `${row.firmSlug} evidence link`)
    assert.ok(!/подтвержд/i.test(ruHtml), 'RU page never uses the «подтвержд» stem')
    assert.ok(!/(открыты|закрыты) для РФ/i.test(ruHtml), 'no «открыты/закрыты для РФ»')
    const ctaCount = (ruHtml.match(/href="\/go\//g) ?? []).length
    assert.equal(ctaCount, ruModel.ranked.filter(row => row.russiaStatus === 'available').length, 'RU sign-up CTA only for Russia-available firms')
    delete process.env.TFH_COUNTRY_CONTENT_ROOT
    passed += 1
    console.log('ok - metadata robots/hreflang, route params, rendered EN/RU HTML')
  })()

  check('content/data and content/verdicts are byte-identical after the run', () => {
    assert.deepEqual([...fingerprint('content/data'), ...fingerprint('content/verdicts')], contentBefore)
  })
  console.log(`\n${passed} checks passed`)
} finally {
  delete process.env.TFH_COUNTRY_CONTENT_ROOT
  for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true })
  hooks.deregister()
}
