/**
 * /compare pair allowlist (lib/compareAllowlist.ts).
 *
 * Firms added to firms.json after main 805b715 must not get auto-generated
 * /compare/<a>-vs-<b> pages. This test pins the frozen pair set, checks that
 * the pair helpers only emit allowlisted pairs, and, given a running server
 * URL, that the sitemap and every sitemap page link only to allowlisted pairs
 * and that non-allowlisted pairs 404.
 *
 *   node scripts/test-compare-allowlist.mjs [http://127.0.0.1:PORT]
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
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
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

// Frozen from main 805b715: 19 firms, 171 canonical pairs. Changing the allowlist
// is a deliberate editorial decision; update these two constants in the same commit.
const FROZEN_PAIR_COUNT = 171
const FROZEN_PAIR_SHA256 = 'f535d5183ea3716690348c9b0cf2d4d0f31c14465d7b36c733653ec002efa675'

let passed = 0
function check(name, fn) { fn(); passed += 1; console.log(`ok - ${name}`) }

const { COMPARE_PAIRS: allowlist } = require(path.join(root, 'lib/compareAllowlist.ts'))
const allowed = new Set(allowlist)
const { getAllCanonicalPairs, getCurrentCanonicalPairs, getUnlistedComparePairs, isComparePairAllowed, canonicalMatchupSlug, firmSlug } = require(path.join(root, 'lib/comparisons.ts'))
const { getAllFirms } = require(path.join(root, 'lib/firms.ts'))
const { isSourceHoldFirm } = require(path.join(root, 'lib/reviewStatus.ts'))
const { POST_FREEZE_FIRMS, FROZEN_COUNT_LANDINGS, isPostFreezeFirm } = require(path.join(root, 'lib/postFreezeFirms.ts'))
const { buildLandingPayload, getLandingBySlug } = require(path.join(root, 'lib/landings.ts'))

check('allowlist is the frozen 805b715 pair set', () => {
  assert.equal(allowlist.length, FROZEN_PAIR_COUNT)
  assert.equal(allowed.size, allowlist.length, 'duplicate pairs')
  const digest = crypto.createHash('sha256').update([...allowlist].sort().join('\n') + '\n').digest('hex')
  assert.equal(digest, FROZEN_PAIR_SHA256)
  for (const pair of allowlist) {
    const [a, b] = pair.split('-vs-')
    assert.equal(pair, canonicalMatchupSlug(a, b), `${pair} is not canonical`)
  }
})

const firmSlugs = getAllFirms().map(firm => firmSlug(firm.name))
const pairs = getAllCanonicalPairs()
check('getAllCanonicalPairs emits only allowlisted pairs, each once', () => {
  const seen = new Set()
  for (const pair of pairs) {
    assert.ok(allowed.has(pair.matchup), `${pair.matchup} is not allowlisted`)
    assert.ok(!seen.has(pair.matchup), `${pair.matchup} emitted twice`)
    seen.add(pair.matchup)
  }
  for (const pair of getCurrentCanonicalPairs()) assert.ok(allowed.has(pair.matchup))
})

check('every allowlisted pair whose firms exist is emitted (existing pair count unchanged)', () => {
  const present = new Set(firmSlugs)
  const expected = allowlist.filter(pair => pair.split('-vs-').every(slug => present.has(slug)))
  assert.deepEqual(pairs.map(pair => pair.matchup).sort(), [...expected].sort())
  assert.equal(pairs.length, FROZEN_PAIR_COUNT, 'an 805b715 firm is missing from firms.json')
})

check('post-freeze firms are never in the allowlist', () => {
  for (const slug of POST_FREEZE_FIRMS) {
    assert.ok(!allowlist.some(pair => pair.split('-vs-').includes(slug)), `${slug} is allowlisted`)
  }
})

const frozenLandings = {}
check('frozen-count landings exclude post-freeze firms from ranking and counts', () => {
  for (const slug of FROZEN_COUNT_LANDINGS) {
    const landing = getLandingBySlug(slug)
    assert.ok(landing, `${slug} landing missing`)
    const { ranked, count, allFirms } = buildLandingPayload(landing)
    assert.ok(!ranked.some(item => isPostFreezeFirm(firmSlug(item.firm.name))), `${slug} ranks a post-freeze firm`)
    assert.ok(!allFirms.some(firm => isPostFreezeFirm(firmSlug(firm.name))), `${slug} counts a post-freeze firm`)
    assert.ok(landing.metaTitle.includes(String(count)), `${slug} title count ${landing.metaTitle} != ranked ${count}`)
    assert.ok(landing.h1.includes(String(count)), `${slug} H1 count ${landing.h1} != ranked ${count}`)
    frozenLandings[slug] = { count, h1: landing.h1, title: landing.metaTitle }
  }
})
console.log(JSON.stringify(frozenLandings))

const newFirms = firmSlugs.filter(slug => !allowlist.some(pair => pair.split('-vs-').includes(slug)))
check('firms outside the allowlist get no pairs', () => {
  for (const slug of [...newFirms, 'hash-hedge', 'brand-new-firm']) {
    assert.ok(!pairs.some(pair => pair.matchup.split('-vs-').includes(slug)), `${slug} has a /compare pair`)
    assert.equal(isComparePairAllowed('ftmo', slug), false)
  }
  assert.equal(isComparePairAllowed('ftmo', 'fundednext'), true)
  assert.equal(isComparePairAllowed('fundednext', 'ftmo'), true)
  assert.equal(isComparePairAllowed('ftmo', 'ftmo'), false)
  assert.deepEqual(getUnlistedComparePairs(firmSlugs.filter(slug => !newFirms.includes(slug))), [])
  assert.equal(getUnlistedComparePairs([...firmSlugs, 'brand-new-firm']).filter(pair => pair.includes('brand-new-firm')).length, firmSlugs.length)
})
console.log(`firms=${firmSlugs.length} pairs=${pairs.length} non-allowlisted firms=${newFirms.join(',') || '-'}`)

const base = process.argv[2]?.replace(/\/$/, '')
if (base) {
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
  const compareUrls = urls.filter(url => /\/compare\/[^/]+-vs-[^/]+$/.test(url))
  check('sitemap /compare URLs are exactly the allowlisted pairs', () => {
    const expected = pairs.filter(pair => pair.matchup.split('-vs-').every(slug => !isSourceHoldFirm(slug))).map(pair => pair.matchup)
    assert.deepEqual(compareUrls.map(url => url.split('/compare/')[1]).sort(), expected.sort())
    assert.ok(!urls.some(url => url.includes('-vs-hash-hedge') || url.includes('hash-hedge-vs-')), 'hash-hedge pair in sitemap')
  })
  console.log(`sitemap urls=${urls.length} compare pair urls=${compareUrls.length}`)

  const probes = ['ftmo-vs-hash-hedge', 'brand-new-firm-vs-ftmo',
    ...newFirms.flatMap(slug => firmSlugs.filter(other => other !== slug).map(other => canonicalMatchupSlug(slug, other)))]
  const statuses = []
  for (const matchup of probes) {
    const res = await fetch(`${base}/compare/${matchup}`, { redirect: 'manual' })
    statuses.push([matchup, res.status])
  }
  check('non-allowlisted /compare pairs 404', () => {
    for (const [matchup, status] of statuses) assert.equal(status, 404, `/compare/${matchup} returned ${status}`)
  })
  const hub = await (await fetch(`${base}/compare`)).text()
  const hubTitle = /<title>([^<]*)<\/title>/.exec(hub)?.[1] ?? ''
  const currentCount = getCurrentCanonicalPairs().length
  check(`/compare title counts only allowlisted current pairs (${currentCount} Matchups)`, () => {
    assert.ok(currentCount <= FROZEN_PAIR_COUNT)
    assert.ok(hubTitle.includes(`: ${currentCount} Matchups`), `title: ${hubTitle}`)
    if (currentCount === FROZEN_PAIR_COUNT) assert.ok(hubTitle.includes('171 Matchups'))
  })
  console.log(`/compare title: ${hubTitle}`)

  for (const slug of FROZEN_COUNT_LANDINGS) {
    const html = await (await fetch(`${base}/${slug}`)).text()
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ''
    const h1 = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '').replace(/<[^>]+>/g, '')
    check(`/${slug} title and H1 use the pre-freeze firm count`, () => {
      assert.ok(title.startsWith(frozenLandings[slug].title.replace(/&/g, '&amp;')), `title: ${title}`)
      assert.ok(h1.includes(String(frozenLandings[slug].count)), `h1: ${h1}`)
    })
  }

  const reverse = await fetch(`${base}/compare/fundednext-vs-ftmo`, { redirect: 'manual' })
  check('reverse-order allowlisted pair still redirects to canonical', () => {
    assert.ok([301, 307, 308].includes(reverse.status), `reverse pair returned ${reverse.status}`)
    assert.match(reverse.headers.get('location') || '', /\/compare\/ftmo-vs-fundednext$/)
  })

  const bad = []
  const pages = [...new Set(urls.map(url => new URL(url).pathname)), '/prop-firms']
  for (let i = 0; i < pages.length; i += 8) {
    await Promise.all(pages.slice(i, i + 8).map(async page => {
      const res = await fetch(`${base}${page}`)
      if (!res.ok) return
      const html = await res.text()
      for (const match of html.matchAll(/\/compare\/([a-z0-9-]+-vs-[a-z0-9-]+)/g)) {
        if (!allowed.has(match[1]) && !allowed.has(canonicalMatchupSlug(...match[1].split('-vs-')))) bad.push(`${page} -> /compare/${match[1]}`)
      }
    }))
  }
  check(`no page in the sitemap (${pages.length}) links to a non-allowlisted /compare pair`, () => {
    assert.deepEqual([...new Set(bad)], [])
  })
}

console.log(`\n${passed} passed`)
