/**
 * Server guard for rules pages: a noindex page never appears in the sitemap
 * (as <loc> or as an hreflang alternate) and emits no hreflang of its own;
 * every rules URL in the sitemap is indexable; EN reviews link a rules page
 * only when it is indexable.
 * Verdict gate (EA decision 26.10.2026): a rules page indexes only when the data
 * gate passes AND its writer verdict file exists at
 * content/verdicts/rules/<firm>.md (EN) or content/verdicts/rules/<firm>.ru.md (RU).
 * A verdict on a data-incomplete firm renders but stays noindex.
 * Usage: npx next start -p 3472 & node scripts/test-rules-index-guard.mjs http://127.0.0.1:3472
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getRulesPageModels } from '../lib/rulesPages.ts'

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? 'http://127.0.0.1:3000'
const SITE = 'https://tradersfundhub.com'

async function get(path) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' })
  return { status: response.status, html: await response.text() }
}
const isNoindex = html => /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)
const hreflangs = html => [...html.matchAll(/<link[^>]+rel="alternate"[^>]+hrefLang="[^"]+"[^>]*>/gi)].map(match => match[0])

const sitemap = (await get('/sitemap.xml')).html
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(SITE, '') || '/'))
const alternates = new Set([...sitemap.matchAll(/hreflang="[^"]+" href="([^"]+)"/g)].map(match => match[1].replace(SITE, '') || '/'))

const models = getRulesPageModels()
const verdictPath = (slug, lang) => path.join('content', 'verdicts', 'rules', `${slug}${lang === 'ru' ? '.ru' : ''}.md`)
const hasVerdictFile = (slug, lang) => fs.existsSync(path.join(process.cwd(), verdictPath(slug, lang)))
for (const model of models) {
  assert.equal(model.en.indexable, model.dataEligible && hasVerdictFile(model.slug, 'en'),
    `${model.en.path}: indexable must equal data gate (${model.dataEligible}) AND ${verdictPath(model.slug, 'en')} exists`)
  if (model.ru?.template && model.ru.indexable) {
    assert.ok(model.dataEligible && hasVerdictFile(model.slug, 'ru'), `${model.ru.path}: indexable without data gate or ${verdictPath(model.slug, 'ru')}`)
  }
  if (model.ru?.template && !hasVerdictFile(model.slug, 'ru')) assert.equal(model.ru.indexable, false, `${model.ru.path}: no RU verdict file but indexable`)
}
const pages = models.flatMap(model => [
  { path: model.en.path, indexable: model.en.indexable },
  ...(model.ru?.template ? [{ path: model.ru.path, indexable: model.ru.indexable }] : []),
])
let noindexCount = 0
for (const page of pages) {
  const { status, html } = await get(page.path)
  assert.equal(status, 200, `${page.path} should render (got ${status})`)
  const noindex = isNoindex(html)
  assert.equal(noindex, !page.indexable, `${page.path}: robots noindex=${noindex} but model indexable=${page.indexable}`)
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}${page.path}"`), `${page.path}: self canonical`)
  if (noindex) {
    noindexCount++
    assert.ok(!locs.has(page.path), `${page.path} is noindex but listed in sitemap`)
    assert.ok(!alternates.has(page.path), `${page.path} is noindex but used as a sitemap hreflang alternate`)
    assert.equal(hreflangs(html).length, 0, `${page.path} is noindex but emits hreflang`)
  } else {
    assert.ok(page.path.startsWith('/ru/') || locs.has(page.path), `${page.path} is indexable but missing from sitemap`)
  }
}
// Verdict files on disk render on their page; on a data-incomplete firm the page stays noindex.
const verdictStatus = []
for (const model of models) {
  for (const lang of ['en', 'ru']) {
    if (!hasVerdictFile(model.slug, lang)) continue
    const page = lang === 'en' ? model.en : model.ru
    if (!page || (lang === 'ru' && !model.ru.template)) continue
    const { html } = await get(page.path)
    assert.ok(html.includes(`data-rules-verdict="${verdictPath(model.slug, lang)}"`), `${page.path}: ${verdictPath(model.slug, lang)} must render`)
    if (!model.dataEligible) {
      assert.ok(isNoindex(html), `${page.path}: verdict present but data incomplete, must stay noindex`)
      assert.ok(!page.reasons.some(reason => /verdict file/.test(reason)), `${page.path}: reasons must be data gaps, not the verdict`)
    }
    verdictStatus.push(`${verdictPath(model.slug, lang)} -> ${page.indexable ? 'index' : 'noindex (data incomplete)'}`)
  }
}
// The W44 EN Writer imports must be picked up from the in-repo location.
for (const slug of ['bright-funded', 'ftmo', 'fundednext']) {
  assert.ok(hasVerdictFile(slug, 'en'), `expected ${verdictPath(slug, 'en')}`)
}

// Any rules-shaped URL in the sitemap must be a known indexable page.
const indexable = new Set(pages.filter(page => page.indexable).map(page => page.path))
for (const url of [...locs, ...alternates]) {
  if (/^\/prop-firms\/[^/]+\/rules$/.test(url) || (/^\/ru\/[a-z0-9-]+-pravila$/.test(url) && pages.some(page => page.path === url))) {
    assert.ok(indexable.has(url), `sitemap lists non-indexable rules URL ${url}`)
  }
}
// Reviews link the rules page only when it is indexable.
for (const model of models) {
  if (!model.firm.reviewUrl) continue
  const { status, html } = await get(model.firm.reviewUrl)
  if (status !== 200) continue
  const linked = html.includes(`href="${model.en.path}"`)
  assert.equal(linked, model.en.indexable, `${model.firm.reviewUrl}: rules link present=${linked}, indexable=${model.en.indexable}`)
}
console.log(`PASS rules index guard: ${pages.length} rules pages (${noindexCount} noindex) consistent with sitemap, hreflang, review links and the verdict gate`)
for (const line of verdictStatus) console.log(`  verdict ${line}`)
