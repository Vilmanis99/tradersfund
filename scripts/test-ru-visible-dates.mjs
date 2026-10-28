/**
 * Fails if visible text on a /ru/ page contains an ISO date (YYYY-MM-DD).
 * Russian readers see dates as DD.MM.YYYY. ISO stays correct inside JSON-LD/scripts,
 * attributes (datetime, href, content), meta tags, <head> and comments, so those are stripped first.
 *
 * Also checks FAQPage JSON-LD on every /ru/ page that emits it: each Question name and
 * acceptedAnswer.text must contain no ISO date and must equal the visible FAQ question and the
 * answer that follows it (after decoding entities and normalising tags and whitespace), so the
 * schema mirrors the visible FAQ word for word. Date-typed JSON-LD fields keep ISO.
 *
 * Usage: node scripts/test-ru-visible-dates.mjs [http://127.0.0.1:PORT] [--verbose]
 * Pages: every /ru/ URL in /sitemap.xml, plus every static route under app/ru/ (so noindex pages and
 * rules pages are covered even when they are not in the sitemap), the RU rules-template twins and
 * RU_RULES_HANDWRITTEN. A route from app/ru/ or the rules lists that does not answer 200 fails.
 */
import { localPreviewUrl } from './local-preview-url.mjs'
import { readdirSync, existsSync } from 'node:fs'
import { RU_RULES_TEMPLATE_SLUGS, RU_RULES_HANDWRITTEN } from '../lib/localizedRoutes.ts'

const args = process.argv.slice(2)
const BASE = new URL(localPreviewUrl(args.find(value => !value.startsWith('--'))))
const VERBOSE = args.includes('--verbose')
const ISO_DATE = /(?<![\d-])\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?![\d-])/g

/**
 * Known ISO dates in other agents' hand-written page copy (not produced by a shared component).
 * Each entry is reported, not failed, until its owner rewrites the sentence. Keep this list short:
 * a hit that is not listed here fails the test.
 */
const KNOWN_HANDWRITTEN = [
]

/** Visible body text: drop <head>, scripts (incl. JSON-LD), styles, templates, comments and every tag with its attributes. */
export function visibleText(html) {
  const body = /<body[\s>][\s\S]*<\/body>/i.exec(html)?.[0] ?? html.replace(/<head[\s>][\s\S]*?<\/head>/i, '')
  return body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&#x2d;|&#45;/gi, '-')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

export function isoDateHits(text) {
  const hits = []
  for (const match of text.matchAll(ISO_DATE)) {
    const start = Math.max(0, match.index - 60)
    hits.push({ date: match[0], context: text.slice(start, match.index + match[0].length + 40).trim() })
  }
  return hits
}

/** Decode the entities React emits in text nodes. */
function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Text for FAQ comparison: tags become spaces, entities decoded, whitespace collapsed. */
export function faqNormalize(text) {
  return decodeEntities(String(text).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/** Visible body text for FAQ comparison (same stripping as visibleText, full entity decoding). */
export function faqVisibleText(html) {
  const body = /<body[\s>][\s\S]*<\/body>/i.exec(html)?.[0] ?? html.replace(/<head[\s>][\s\S]*?<\/head>/i, '')
  return faqNormalize(body.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' '))
}

/** Every FAQPage Question in the page's JSON-LD blocks. */
export function faqSchemaQuestions(html) {
  const questions = []
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data
    try { data = JSON.parse(match[1]) } catch { continue }
    for (const node of [data].flat().flatMap(item => item?.['@graph'] ?? [item])) {
      if (node?.['@type'] !== 'FAQPage') continue
      for (const question of [node.mainEntity].flat()) {
        questions.push({ name: String(question?.name ?? ''), text: String(question?.acceptedAnswer?.text ?? '') })
      }
    }
  }
  return questions
}

/** Problems for one schema question against the visible text: ISO dates, missing question, answer not matching. */
export function faqSchemaProblems(question, visible) {
  const problems = []
  if (isoDateHits(question.name).length) problems.push('ISO date in schema question name')
  if (isoDateHits(question.text).length) problems.push('ISO date in schema answer text')
  const name = faqNormalize(question.name)
  const answer = faqNormalize(question.text)
  if (!name || !answer) {
    problems.push('empty schema question or answer')
    return problems
  }
  let at = visible.indexOf(name)
  let matched = false
  while (at >= 0 && !matched) {
    matched = visible.slice(at + name.length).trimStart().startsWith(answer)
    at = visible.indexOf(name, at + 1)
  }
  if (!matched) problems.push(visible.includes(name) ? 'schema answer differs from the visible answer' : 'schema question not visible on the page')
  return problems
}

// Unit checks for the extractor, so a broken stripper cannot pass silently.
{
  const sample = '<html><head><title>2026-01-01</title><meta content="2026-01-02"></head><body>' +
    '<script type="application/ld+json">{"dateModified":"2026-01-03"}</script><!-- 2026-01-04 -->' +
    '<time datetime="2026-01-05">05.01.2026</time><a href="/x?d=2026-01-06">ok</a><p>Проверено: 2026-01-07</p>' +
    '<p>диапазон 2026-2027, id 12026-01-08x</p></body></html>'
  const got = isoDateHits(visibleText(sample)).map(hit => hit.date)
  if (got.length !== 1 || got[0] !== '2026-01-07') {
    console.error(`self-test failed: expected only 2026-01-07, got ${JSON.stringify(got)}`)
    process.exit(1)
  }
}

// Unit checks for the FAQ schema comparison.
{
  const html = '<html><head><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[' +
    '{"@type":"Question","name":"Когда проверено?","acceptedAnswer":{"@type":"Answer","text":"Проверено 20.10.2026 & ok."}},' +
    '{"@type":"Question","name":"Старый формат?","acceptedAnswer":{"@type":"Answer","text":"Проверено 2026-10-20."}},' +
    '{"@type":"Question","name":"Другой текст?","acceptedAnswer":{"@type":"Answer","text":"Да."}}]}</script></head><body>' +
    '<details><summary>Когда проверено?</summary><p>Проверено <b>20.10.2026</b> &amp; ok.</p></details>' +
    '<details><summary>Старый формат?</summary><p>Проверено 20.10.2026.</p></details>' +
    '<details><summary>Другой текст?</summary><p>Нет.</p></details></body></html>'
  const visible = faqVisibleText(html)
  const got = faqSchemaQuestions(html).map(question => faqSchemaProblems(question, visible).length)
  if (JSON.stringify(got) !== JSON.stringify([0, 2, 1])) {
    console.error(`FAQ self-test failed: expected [0,2,1] problem counts, got ${JSON.stringify(got)}`)
    process.exit(1)
  }
}

async function get(path) {
  const response = await fetch(new URL(path, BASE), { redirect: 'manual', signal: AbortSignal.timeout(20_000) })
  return { status: response.status, text: await response.text() }
}

const sitemap = await get('/sitemap.xml')
if (sitemap.status !== 200) {
  console.error(`sitemap.xml returned ${sitemap.status}`)
  process.exit(1)
}
const paths = new Set(
  [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => new URL(match[1]).pathname)
    .filter(path => path === '/ru' || path.startsWith('/ru/')),
)
for (const slug of RU_RULES_TEMPLATE_SLUGS) paths.add(`/ru/${slug}-pravila`)
/** Static RU routes from the filesystem: app/ru/page.tsx and app/ru/<segment>/page.tsx (no dynamic or group segments). */
export function staticRuRoutes(root = new URL('../app/ru/', import.meta.url)) {
  const routes = existsSync(new URL('page.tsx', root)) ? ['/ru'] : []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || /^[[(]/.test(entry.name)) continue
    if (existsSync(new URL(`${entry.name}/page.tsx`, root))) routes.push(`/ru/${entry.name}`)
  }
  return routes
}
const required = new Set([
  ...staticRuRoutes(),
  ...RU_RULES_TEMPLATE_SLUGS.map(slug => `/ru/${slug}-pravila`),
  ...Object.values(RU_RULES_HANDWRITTEN),
])
for (const path of required) paths.add(path)
let checkedPages = 0

let failures = 0
let known = 0
let pagesWithHits = 0
let faqPages = 0
let faqQuestions = 0
let faqFailures = 0
const seenKnown = new Set()
for (const path of [...paths].sort()) {
  const page = await get(path)
  if (page.status !== 200) {
    if (required.has(path)) {
      failures += 1
      console.log(`✗ ${path} returned ${page.status} (route exists in app/ru or the rules lists)`)
    } else if (VERBOSE) console.log(`skip ${path} (${page.status})`)
    continue
  }
  checkedPages += 1
  const questions = faqSchemaQuestions(page.text)
  if (questions.length) {
    faqPages += 1
    const faqVisible = faqVisibleText(page.text)
    for (const question of questions) {
      faqQuestions += 1
      for (const problem of faqSchemaProblems(question, faqVisible)) {
        faqFailures += 1
        console.log(`✗ ${path} FAQPage: ${problem}: «${faqNormalize(question.name).slice(0, 80)}»`)
      }
    }
  }
  const hits = isoDateHits(visibleText(page.text))
  if (!hits.length) continue
  pagesWithHits += 1
  for (const hit of hits) {
    const entry = KNOWN_HANDWRITTEN.find(item => item.path === path && item.date === hit.date && hit.context.includes(item.contains))
    if (entry) {
      known += 1
      seenKnown.add(entry)
      console.log(`known ${path} ${hit.date} (owner: ${entry.owner}, ${entry.file}): …${hit.context}…`)
    } else {
      failures += 1
      console.log(`✗ ${path} ${hit.date}: …${hit.context}…`)
    }
  }
}
for (const entry of KNOWN_HANDWRITTEN) {
  if (!seenKnown.has(entry)) console.log(`note: known entry no longer rendered, remove it: ${entry.path} ${entry.date} (${entry.file})`)
}
console.log(`${checkedPages}/${paths.size} RU pages checked (${required.size} from app/ru and the rules lists); ${failures} unexpected ISO date(s) in visible text; ${known} known hand-written hit(s); ${pagesWithHits} page(s) with any hit`)
console.log(`FAQPage schema: ${faqPages} RU page(s), ${faqQuestions} question(s); ${faqFailures} problem(s) (ISO date or schema ≠ visible FAQ)`)
if (!faqQuestions) console.log('✗ no FAQPage schema found on any RU page; the extractor or the pages changed')
process.exit(failures || faqFailures || !faqQuestions ? 1 : 0)
