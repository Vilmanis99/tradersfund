/**
 * No page may publish internal firm/challenge data in its HTML or RSC flight payload.
 * test-client-bundle-no-firm-internals scans JS bundles only; props that a server page
 * passes to a client component are serialised into the page itself, so a whole Firm or
 * Challenge record given to a client component (805b715: /prop-firms -> FirmTable)
 * published Tracker notes, capture/evidence records, previous/regional codes and box paths.
 *
 * usage: node scripts/test-no-firm-internals-html.mjs <base-url>   (against `next start`)
 *
 * For every sitemap URL (plus /prop-firms with directory query states) fetches the HTML and
 * the RSC payload (`RSC: 1`) and fails on:
 *  - a JSON key ("key":) that lib/firms.ts declares (every interface and nested type
 *    literal, read with the TypeScript parser) or that content/data/firms.json and
 *    content/data/challenges/*.json carry, unless lib/publicFirm.ts lists it in
 *    CLIENT_PAYLOAD_FIRM_KEYS (fields client components legitimately receive);
 *  - the value of an internal field (notes, *Note, *Evidence, capture files, previous,
 *    regional and partner-support codes, code validity/status) from those data files;
 *  - box markers 'box IP', 'Latvia (non-US)', 'Box egress', '/home/box' anywhere, and the paths
 *    '/workspace/', '_captures/' in the payload unless printed as visible text on some page;
 *  - RENDERED-TEXT LEAKS: the visible text (scripts/styles stripped) or the JSON-LD that search engines
 *    read containing a box path ('/workspace'), a capture path ('_captures/'), a data field name
 *    (russiaStatus, pricingModel), Node runtime output (MODULE_TYPELESS, '(node:<pid>)', node:internal,
 *    ExperimentalWarning/DeprecationWarning) or a generation log ('[generated N table…').
 *    Each hit prints the page, the rule and a text snippet. These are editorial fixes in the page's
 *    copy or data, so the page owner fixes them; the test does not allowlist them.
 * Watch-entry evidence references (ruleEvidenceRefs, sourceConflictEvidenceRefs) are forbidden keys too:
 * the change feeds receive booleans (lib/challengeWatch.ts challengeChangeCardEntry).
 * Besides the sitemap it checks noindex pages not in the sitemap (RU rules redirects targets) and the
 * EN/RU 404 pages, which render site chrome.
 * Names that double as React/CSS props (flex, scope, value, note, summary, currency) are only value-checked.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = (process.argv[2] || process.env.BASE_URL || (process.env.TFH_PREVIEW_PORT ? `http://127.0.0.1:${process.env.TFH_PREVIEW_PORT}` : '')).replace(/\/$/, '')
assert(base, 'usage: node scripts/test-no-firm-internals-html.mjs <base-url>')

const { CLIENT_PAYLOAD_FIRM_KEYS, PUBLIC_FIRM_FIELDS } = await import(pathToFileURL(path.join(root, 'lib/publicFirm.ts')).href)

/* ── Field names: lib/firms.ts types + the data files ── */
const typeKeys = new Set()
const source = ts.createSourceFile('firms.ts', fs.readFileSync(path.join(root, 'lib/firms.ts'), 'utf8'), ts.ScriptTarget.ES2022, true)
;(function visit(node) {
  if (ts.isPropertySignature(node) && node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) typeKeys.add(node.name.text)
  ts.forEachChild(node, visit)
})(source)
assert(typeKeys.has('notes') && typeKeys.has('discountCodeEvidence') && typeKeys.size > 100, `lib/firms.ts parse looks wrong (${typeKeys.size} keys)`)

const firms = JSON.parse(fs.readFileSync(path.join(root, 'content/data/firms.json'), 'utf8'))
const challengeDir = path.join(root, 'content/data/challenges')
const challenges = fs.readdirSync(challengeDir).filter(file => file.endsWith('.json'))
  .flatMap(file => JSON.parse(fs.readFileSync(path.join(challengeDir, file), 'utf8')))
const dataKeys = new Set()
const internalValues = new Map()
const INTERNAL_VALUE_KEY = /^(notes?|captureFile|freshReadFile|conflictId|previousDiscountCode|regionalDiscountCode|affiliateSupportCode)$|(Notes?|Evidence|Validity|Status)$/
const isInternalValueKey = key => INTERNAL_VALUE_KEY.test(key) && !CLIENT_PAYLOAD_FIRM_KEYS.has(key) && key !== 'russiaStatus'
;(function walk(value, key, owner) {
  if (Array.isArray(value)) return value.forEach(item => walk(item, key, owner))
  if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) {
      if (!/^\d/.test(childKey)) dataKeys.add(childKey)
      walk(child, isInternalValueKey(childKey) ? childKey : key, owner)
    }
    return
  }
  if (typeof value !== 'string' || !key || !isInternalValueKey(key) || /^https?:\/\//.test(value)) return
  const code = /Code$/.test(key)
  if (code ? value.length >= 5 : value.length >= 24) internalValues.set(code ? value : value.slice(0, 60), `${key} value`)
})([...firms, ...challenges], null)

/*
 * Field names that are also ordinary React/CSS/HTML prop names or generic view-model
 * labels ("flex" style, <th scope>, counter `value`, offer `note`, signal `summary`,
 * price `currency`) cannot be told apart by name alone; their internal VALUES are still
 * checked below.
 */
const AMBIGUOUS_NAMES = new Set(['flex', 'scope', 'value', 'note', 'summary', 'currency'])
/** Watch-entry evidence references (internal evidence file names); the change feed gets booleans instead. */
const WATCH_INTERNAL_KEYS = ['ruleEvidenceRefs', 'sourceConflictEvidenceRefs']
const forbiddenKeys = [...new Set([...typeKeys, ...dataKeys, ...WATCH_INTERNAL_KEYS])].filter(key => !CLIENT_PAYLOAD_FIRM_KEYS.has(key) && !AMBIGUOUS_NAMES.has(key)).sort()
for (const key of ['notes', 'discountCodeEvidence', 'previousDiscountCode', 'captureFile', 'quote', 'corporateNote', ...WATCH_INTERNAL_KEYS]) {
  assert(forbiddenKeys.includes(key), `${key} must be forbidden in client payloads`)
}
for (const key of PUBLIC_FIRM_FIELDS) assert(!forbiddenKeys.includes(key))
const keyPattern = new RegExp(`"(${forbiddenKeys.map(key => key.replace(/[$]/g, '\\$')).join('|')})":`, 'g')
/** Never allowed anywhere, visible or not. */
const HARD_MARKERS = ['box IP', 'Latvia (non-US)', 'Box egress', '/home/box']
/** Internal paths: a payload leak unless the page prints them as visible text (then an editorial warning). */
const PATH_MARKERS = ['/workspace/', '_captures/']

/** HTML/RSC text with JSON-in-JS and HTML escaping undone, so keys and values match literally. */
function decode(text) {
  let out = text
  for (let i = 0; i < 3 && out.includes('\\"'); i++) out = out.replace(/\\\\/g, '\\').replace(/\\"/g, '"')
  return out.replace(/\\u0026/g, '&').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

/* ── Pages ── */
async function get(url, headers = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers, redirect: 'manual' })
      return { status: response.status, type: response.headers.get('content-type') || '', text: await response.text() }
    } catch (error) {
      if (attempt === 2) throw error
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}
const sitemap = await get(`${base}/sitemap.xml`)
assert.equal(sitemap.status, 200, 'sitemap.xml')
const paths = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname)
assert(paths.length > 100, `sitemap has only ${paths.length} URLs`)
const DIRECTORY_STATES = ['?news=allowed&ea=allowed', '?phase=2-step&size=100000&sort=profitSplitPct', '?selected=ftmo,fundednext&sort=trustpilotScore&direction=asc']
/** Rendered pages outside the sitemap: noindex RU rules pages and the EN/RU 404 pages (expected status). */
const EXTRA_PAGES = [
  ['/ru/ftmo-pravila', 200], ['/ru/bright-funded-pravila', 200], ['/ru/crypto-fund-trader-pravila', 200], ['/ru/fundednext-pravila', 200],
  ['/render-leak-guard-missing-page', 404], ['/ru/render-leak-guard-missing-page', 404],
].filter(([target]) => !paths.includes(target))
const expectedStatus = new Map(EXTRA_PAGES)
const targets = [...paths, ...DIRECTORY_STATES.map(query => `/prop-firms${query}`), ...EXTRA_PAGES.map(([target]) => target)]

/*
 * Rendered-text leak rules. Applied to the visible text and to JSON-LD (FAQ/Article schema is
 * published copy too), never to the raw payload, where field names are covered above.
 */
const RENDERED_TEXT_RULES = [
  ['box path /workspace', /\/workspace\b/],
  ['capture path _captures/', /_captures\//],
  ['field name russiaStatus', /\brussiaStatus\b/],
  ['field name pricingModel', /\bpricingModel\b/],
  ['Node warning MODULE_TYPELESS', /MODULE_TYPELESS/],
  ['Node process output', /\(node:\d+\)|\bnode:internal\b|\b(?:Experimental|Deprecation)Warning\b/],
  ['generation log', /\[generated \d+ table/i],
]

/** Visible text of an HTML page: no scripts, tags or entities. */
function visibleText(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
}

/** JSON-LD blocks (decoded), which search engines read as page copy. */
function jsonLdText(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => decode(match[1])).join('\n')
}

const pages = []
const failures = []
const renderedLeaks = []
let index = 0
async function worker() {
  while (index < targets.length) {
    const target = targets[index++]
    const html = await get(`${base}${target}`)
    const rsc = await get(`${base}${target}`, { RSC: '1' })
    const want = expectedStatus.get(target) || 200
    if (html.status !== want) { failures.push(`${target}: HTML ${html.status}, expected ${want}`); continue }
    // A 404 page's RSC request may answer 200 (the RU catch-all renders notFound() inside the tree).
    if (![want, 200].includes(rsc.status) || !/text\/x-component/.test(rsc.type)) { failures.push(`${target}: RSC ${rsc.status} ${rsc.type}`); continue }
    pages.push({ target, html: html.text, rsc: rsc.text, visible: visibleText(html.text), jsonLd: jsonLdText(html.text) })
  }
}
await Promise.all(Array.from({ length: 6 }, worker))

/*
 * A value or path that some sitemap page prints as visible text is published editorial copy
 * (e.g. a change-signal sentence citing a capture file); it is reported as a warning, since
 * removing it is a content edit, not a payload fix. Everything else is a payload leak.
 */
const published = pages.map(page => page.visible).join('\n')
const warnings = new Map()
const sizes = {}
for (const page of pages) {
  for (const [where, text] of [['visible text', page.visible], ['JSON-LD', page.jsonLd]]) {
    for (const [label, pattern] of RENDERED_TEXT_RULES) {
      const matches = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))]
      if (!matches.length) continue
      const snippets = [...new Set(matches.map(match => text.slice(Math.max(0, match.index - 70), match.index + match[0].length + 70).replace(/\s+/g, ' ').trim()))]
      const count = matches.length > 1 ? ` (${matches.length} hits)` : ''
      for (const snippet of snippets.slice(0, 3)) renderedLeaks.push({ target: page.target, line: `${page.target} ${where}: ${label}${count} … ${snippet} …` })
    }
  }
  if (page.target === '/prop-firms') sizes['/prop-firms'] = { html: Buffer.byteLength(page.html), rsc: Buffer.byteLength(page.rsc) }
  for (const [kind, raw] of [['HTML', page.html], ['RSC', page.rsc]]) {
    const text = decode(raw)
    const keys = [...new Set([...text.matchAll(keyPattern)].map(match => match[1]))]
    if (keys.length) failures.push(`${page.target} ${kind}: internal field name(s) ${keys.slice(0, 12).join(', ')}${keys.length > 12 ? ` (+${keys.length - 12})` : ''}`)
    const hard = HARD_MARKERS.filter(marker => text.includes(marker))
    if (hard.length) failures.push(`${page.target} ${kind}: box marker(s) ${hard.map(marker => `'${marker}'`).join(', ')}`)
    const leaked = []
    for (const [needle, label] of [...PATH_MARKERS.map(marker => [marker, `path '${marker}'`]), ...internalValues]) {
      if (!text.includes(needle)) continue
      if (page.visible.includes(needle) || published.includes(needle)) {
        const where = warnings.get(label) || new Set()
        warnings.set(label, where.add(page.target))
      } else leaked.push(label)
    }
    if (leaked.length) failures.push(`${page.target} ${kind}: internal value(s) not printed on any page: ${[...new Set(leaked)].slice(0, 8).join(', ')} (${leaked.length} hits)`)
  }
}

console.log(`forbidden field names: ${forbiddenKeys.length} (from lib/firms.ts: ${typeKeys.size}, data files: ${dataKeys.size}); client-allowed: ${CLIENT_PAYLOAD_FIRM_KEYS.size}; internal values: ${internalValues.size}`)
console.log(`checked ${pages.length}/${targets.length} URLs (${paths.length} sitemap + ${DIRECTORY_STATES.length} directory states + ${EXTRA_PAGES.length} non-sitemap), HTML + RSC payload each; rendered-text rules: ${RENDERED_TEXT_RULES.length}`)
if (warnings.size) {
  console.log(`\nwarning: internal values/paths printed as visible page text (editorial copy, not a payload leak):`)
  for (const [label, where] of warnings) console.log(`  - ${label}: ${where.size} page(s), e.g. ${[...where].slice(0, 3).join(', ')}`)
  if (process.env.STRICT_VISIBLE === '1') failures.push(`${warnings.size} visible internal value(s) (STRICT_VISIBLE=1)`)
}
if (renderedLeaks.length) {
  const leakPages = [...new Set(renderedLeaks.map(leak => leak.target))].sort()
  console.error(`\nrendered-text leaks on ${leakPages.length} page(s) (fix the page copy or data; see RENDERED_TEXT_RULES):`)
  for (const leak of renderedLeaks.sort((a, b) => a.line.localeCompare(b.line))) console.error(`  - ${leak.line}`)
  failures.push(`${renderedLeaks.length} rendered-text leak snippet(s) on ${leakPages.length} page(s): ${leakPages.slice(0, 10).join(', ')}${leakPages.length > 10 ? ` (+${leakPages.length - 10})` : ''}`)
}
if (sizes['/prop-firms']) console.log(`/prop-firms: HTML ${sizes['/prop-firms'].html} bytes, RSC ${sizes['/prop-firms'].rsc} bytes`)
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n${failures.sort().map(line => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log('no firm internals in any page HTML or RSC payload, and no internal text rendered on any page')
